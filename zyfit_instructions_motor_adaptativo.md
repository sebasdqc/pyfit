# PyFit — Motor Adaptativo de Generación de Rutinas
## Instrucciones de implementación · Pasos 3 al 7 del pipeline

---

## Contexto de arquitectura (leer antes de escribir código)

Estas instrucciones asumen que:

- El backend es **Django 5 + DRF** con PostgreSQL en DigitalOcean
- El catálogo de ejercicios normalizado ya existe: 142 ejercicios en producción con los modelos satélite (`ExerciseMuscle`, `ExerciseEquipment`, `ExerciseContraindication`, `ContraindicationCategory`, `ExerciseRelationship`) y la vista SQL `v_exercise_full` creada en `backend/sql/zyfit_exercise_schema.sql`
- Los modelos `UserExerciseProfile` y `UserAdaptationProfile` (en `backend/workouts/models.py`) ya existen y se actualizan post-sesión
- El usuario ya completó su checkin del día (`DailyCheckin`, en `backend/checkins/models.py`) con los campos: `estado_animo` (1-5), `calidad_sueno` (decimal horas), `hrv` (int nullable), `estado_fisico` (1-5 nullable), `duracion_disponible` (int minutos), `foco_entrenamiento` (JSONField lista), `dolor_hoy` (text nullable), `location` (FK a `UserLocation`)
- La lógica actual de generación está en `backend/ai_workout/views.py` y usa las funciones `_get_exercise_pool`, `_build_adaptation_context`, `_calcular_estado_mesociclo`, `build_prompt` y `_call_groq`
- La app móvil (React Native / Expo) ya consume la sesión generada con la estructura JSON actual: `{titulo, objetivo_sesion, rpe_target, duracion_total, fases: [{nombre, duracion_minutos, ejercicios}], nota_del_entrenador}`

El objetivo de este pipeline es **reemplazar** la lógica actual de `_get_exercise_pool` y `build_prompt` con un motor determinístico más preciso, manteniendo compatibilidad de output con la app móvil.

---

## Ubicación del código nuevo

Crear un archivo nuevo: `backend/ai_workout/adaptive_engine.py`

Este archivo contendrá la clase `AdaptiveEngineService` con un método por cada paso. Las funciones existentes en `views.py` (`_get_exercise_pool`, `_build_adaptation_context`, `_calcular_estado_mesociclo`) deben quedar como wrappers que deleguen en el servicio nuevo durante la transición.

```python
# backend/ai_workout/adaptive_engine.py
class AdaptiveEngineService:
    def __init__(self, user, checkin, location):
        self.user = user
        self.checkin = checkin
        self.location = location

    def get_exercise_pool(self):         # Paso 3
        ...
    def get_pattern_priorities(self):    # Paso 4
        ...
    def enrich_with_load(self, pool):    # Paso 5
        ...
    def build_llm_package(self, pool, priorities, load_data, ctx):  # Paso 6
        ...
```

---

## PASO 3 — Filtrado del catálogo de ejercicios

### Qué reemplaza

Reemplaza la función `_get_exercise_pool(user, location, dolor_hoy)` en `views.py`. La función actual usa los JSONFields `ex.equipamiento` y `ex.contraindicaciones` del modelo `Exercise`, que son datos legacy sincronizados vía el bloque SYNC del seed. El nuevo filtrado usa las tablas normalizadas.

### Cómo hacer la query en Django

Usar `prefetch_related` en una sola query, luego filtrar en Python. No usar `v_exercise_full` directamente vía SQL raw — Django ORM con prefetch es más seguro y más fácil de mantener:

```python
from workouts.models import Exercise

candidates = (
    Exercise.objects
    .filter(activo=True)
    .prefetch_related(
        'contraindication_links__contraindication',   # → ExerciseContraindication + ContraindicationCategory
        'equipment_links__equipment',                  # → ExerciseEquipment + EquipmentItem
        'muscles__muscle',                             # → ExerciseMuscle + MuscleGroup
    )
)
```

### Los filtros, en este orden exacto

**Filtro 1 — Contraindicaciones graves (seguridad absoluta):**

Para cada ejercicio, revisar sus `ExerciseContraindication` donde `contraindication.severity == 'grave'`. Si el nombre de alguna de esas categorías coincide con las zonas de lesión activa del usuario (`user.injuries.filter(activa=True)`) o con palabras clave extraídas de `checkin.dolor_hoy`, excluir el ejercicio. Este filtro no tiene excepciones.

El diccionario de keywords para parsear `dolor_hoy` ya existe en la función actual (`DOLOR_KEYWORDS`). Mantenerlo.

**Filtro 2 — Contraindicaciones leves (advertencia):**

Los ejercicios con contraindicaciones `severity == 'leve'` que coincidan con las mismas zonas no se excluyen. Se etiquetan con `requires_warning = True` y se añade el texto `ExerciseContraindication.notes` al objeto. El LLM recibe esta advertencia y debe mencionarla en el output.

**Filtro 3 — Equipamiento:**

El campo relevante es `ExerciseEquipment.is_required`. Si `is_required = True` para un equipo y ese equipo (`EquipmentItem.name`) no está en `location.implementos`, excluir el ejercicio. El equipamiento con `is_required = False` es opcional — ignorar en el filtro pero incluir en el contexto del ejercicio.

Nota: `location.implementos` es una lista de strings (nombres de implementos) en el modelo `UserLocation`. El matching es por nombre exacto (case-insensitive). Si `location.implementos` es vacío, solo pasan ejercicios sin equipamiento requerido (peso corporal).

**Filtro 4 — Nivel técnico:**

`Exercise.technical_level` es un entero 1-5. El nivel del usuario viene de `perfil.nivel` que tiene tres valores: `'principiante'` → nivel 2, `'intermedio'` → nivel 3, `'avanzado'` → nivel 5. La regla: incluir ejercicios donde `technical_level <= nivel_usuario + 1`. Esto da un margen aspiracional sin saltar niveles peligrosos.

```python
NIVEL_MAP = {'principiante': 2, 'intermedio': 3, 'avanzado': 5}
nivel_usuario = NIVEL_MAP.get(perfil.nivel, 3)
# Incluir si technical_level is None (dato no cargado) o <= nivel_usuario + 1
```

**Filtro 5 — Estado físico del día:**

El campo correcto para este filtro es `checkin.estado_fisico` (1-5), no `checkin.estado_animo`. Si `estado_fisico` es `None` (no registrado), usar `checkin.estado_animo` como proxy.

- Estado físico 1 o 2 → excluir ejercicios con `systemic_fatigue > 3`
- Estado físico 3 → excluir ejercicios con `systemic_fatigue == 5`
- Estado físico 4 o 5 → sin restricción adicional

**Filtro 6 — Espacio disponible:**

`Exercise.space_required` tiene tres valores: `'minimo'`, `'medio'`, `'amplio'`. El contexto de espacio se infiere del `location.tipo`:

- `tipo == 'casa'` o `tipo == 'hotel'` → excluir `space_required == 'amplio'`
- `tipo == 'exterior'` → excluir `space_required == 'amplio'` a menos que el usuario haya marcado espacio exterior amplio (no hay campo para esto todavía — aplicar por defecto para exterior)
- `tipo == 'gimnasio'` → sin restricción de espacio

**Filtro 7 — Activo:**

El filtro `.filter(activo=True)` ya está en la query inicial. Aplicarlo explícitamente como salvaguarda.

### Output del Paso 3

Una lista de objetos, cada uno con los campos necesarios del modelo `Exercise` más los datos denormalizados de las relaciones. Estructura mínima:

```python
{
    'id': ex.id,
    'nombre': ex.nombre,
    'patron_movimiento': ex.patron_movimiento,
    'es_compuesto': ex.es_compuesto,
    'technical_level': ex.technical_level,
    'systemic_fatigue': ex.systemic_fatigue,
    'set_duration_seconds': ex.set_duration_seconds,
    'rest_seconds_default': ex.rest_seconds_default,
    'total_set_seconds': (ex.set_duration_seconds or 45) + (ex.rest_seconds_default or 90),
    'musculos_primarios': [m.muscle.name for m in ex.muscles.all() if m.role == 'primario'],
    'musculos_secundarios': [m.muscle.name for m in ex.muscles.all() if m.role == 'secundario'],
    'coaching_cues': ex.coaching_cues,
    'description': ex.description,
    'requires_warning': False,   # seteado por Filtro 2
    'warning_text': None,        # texto de ExerciseContraindication.notes si aplica
}
```

---

## PASO 4 — Balance muscular y prioridad de patrones

### Qué hace este paso

Analiza las últimas 5 sesiones del usuario para determinar qué patrones de movimiento deben priorizarse o evitarse hoy. También considera el `foco_entrenamiento` declarado por el usuario en el checkin.

### Consultas necesarias

```python
from workouts.models import Session, SessionExercise, UserExerciseProfile
from datetime import date, timedelta

# Últimas 5 sesiones con sus ejercicios
ultimas_sesiones = (
    Session.objects
    .filter(user=user)
    .prefetch_related('exercises')
    .order_by('-fecha')[:5]
)
```

Para cada sesión, extraer los patrones trabajados. Como `SessionExercise` solo guarda el `nombre` del ejercicio (no el `patron_movimiento`), hacer un join con `Exercise` por nombre o usar `UserExerciseProfile` que sí tiene `patron_movimiento`:

```python
# Alternativa eficiente: usar UserExerciseProfile que ya tiene patron_movimiento
ejercicios_recientes = (
    UserExerciseProfile.objects
    .filter(user=user, ultima_vez__gte=date.today() - timedelta(days=14))
    .values('patron_movimiento', 'ultima_vez')
    .order_by('-ultima_vez')
)
```

### Lógica de prioridad por patrón

Para cada `patron_movimiento` en `PATRON_CHOICES`, calcular los días desde la última vez que fue ejecutado usando `UserExerciseProfile.ultima_vez` agrupado por `patron_movimiento`:

- Ejecutado hace 0 o 1 día → **prioridad baja** (evitar si hay alternativas)
- Ejecutado hace 2 días → **prioridad media** (incluir si el estado físico lo permite)
- Ejecutado hace 3+ días o nunca → **prioridad alta** (incluir)

Excepción para patrones de core (`core_antiextension`, `core_antirrotacion`, `core_antiflexion`): el descanso mínimo es 1 día, no 2. Un patrón de core ejecutado ayer ya puede repetirse hoy.

### Integración con `foco_entrenamiento`

`checkin.foco_entrenamiento` es una lista que puede incluir valores como `['fuerza', 'hipertrofia', 'piernas', 'espalda']`. Si el usuario declaró un foco muscular específico (ej. `'piernas'`), elevar la prioridad de los patrones `sentadilla` y `bisagra` independientemente del historial reciente. La tabla de mapeo:

```python
FOCO_A_PATRONES = {
    'piernas':    ['sentadilla', 'bisagra'],
    'espalda':    ['jalon_horizontal', 'jalon_vertical'],
    'pecho':      ['empuje_horizontal'],
    'hombros':    ['empuje_vertical'],
    'core':       ['core_antiextension', 'core_antirrotacion', 'core_antiflexion'],
    'brazos':     ['aislamiento'],
    'completo':   [],  # sin prioridad específica — el sistema decide
    'movilidad':  [],  # sin prioridad de patrón — el LLM ajusta el enfoque
    'resistencia':[], 
    'fuerza':     [],  # no es muscular específico — afecta RPE y sets, no selección de patrón
    'hipertrofia':[],
}
```

### Balance empuje / jalón

Si en la semana actual el volumen acumulado de `empuje_horizontal` + `empuje_vertical` supera el de `jalon_horizontal` + `jalon_vertical` en más de un 40%, elevar la prioridad de los patrones de jalón. Este desbalance es un factor de riesgo de hombro documentado (ratio empuje:jalón recomendado ≤ 1:1).

### Output del Paso 4

```python
{
    'patrones_priorizados': ['bisagra', 'sentadilla', 'core_antiextension'],  # ordenados de mayor a menor prioridad
    'patrones_evitar': ['empuje_horizontal', 'empuje_vertical'],
    'razon_evitar': {'empuje_horizontal': 'ejecutado hace 1 día', ...},
}
```

---

## PASO 5 — Cálculo de progresión de carga

### Gap a resolver antes de implementar

**`SessionExercise` actualmente no tiene campo `peso_usado`** (el peso real levantado en esa sesión). Sin este dato, la progresión de carga debe basarse en el RPE reportado, no en kilos absolutos. La recomendación es:

1. Implementar este paso con lógica RPE-based usando `UserExerciseProfile.rpe_promedio_real`
2. En paralelo, agregar `peso_usado` (DecimalField nullable) a `SessionExercise` en una migración futura para habilitar progresión por carga absoluta

### Lógica de progresión RPE-based

Para cada ejercicio en la lista filtrada del Paso 3, consultar su `UserExerciseProfile`:

```python
try:
    uep = UserExerciseProfile.objects.get(user=user, exercise_nombre=ex['nombre'])
except UserExerciseProfile.DoesNotExist:
    uep = None
```

**Si tiene historial (`uep` existe y `veces_realizado >= 2`):**

- `rpe_promedio_real` < 7 en las últimas sesiones → sugerir `progresion = 'incrementar'` (+2.5% o +1 serie)
- `rpe_promedio_real` entre 7 y 8.5 → `progresion = 'mantener'`
- `rpe_promedio_real` > 8.5 → `progresion = 'reducir'` (-5% de carga o -1 serie)
- `ultima_vez` hace más de 7 días → `progresion = 'consolidar'` (flag de precaución por desacondicionamiento)

**Si no tiene historial (`uep` es None):**

Marcar `primera_vez = True`. El LLM debe indicarle al usuario que comience con un peso que le permita completar las reps con RPE 6-7.

### Detección de deload

El modelo `UserAdaptationProfile` ya tiene la lógica de deload en `_calcular_estado_mesociclo`. **No duplicar** esa lógica. El Paso 5 debe leer el resultado de `_calcular_estado_mesociclo` (que ya se calcula en el flujo actual) y si `necesita_deload = True`:

- Reducir todas las cargas / series recomendadas un 30-40%
- Marcar la sesión completa como `deload_session = True`
- El LLM comunica esto en lenguaje positivo (el sistema detectó que el cuerpo necesita recuperación activa)

### Estimación de volumen disponible

Con `checkin.duracion_disponible` y los `total_set_seconds` de cada ejercicio candidato, calcular cuántos sets caben en la sesión:

```python
tiempo_efectivo = (checkin.duracion_disponible - 15) * 60  # 10 min calentamiento + 5 min cierre, en segundos
total_sets_posibles = sum(
    (tiempo_efectivo // ex['total_set_seconds'])
    for ex in pool_filtrado
    if ex['total_set_seconds'] and ex['total_set_seconds'] > 0
)
# En la práctica, calcular sets por ejercicio y dividir equitativamente entre los ejercicios seleccionados
```

El resultado (`max_sets_sesion`) es una directiva que se pasa al LLM. El LLM no puede superarla.

### Output del Paso 5

La misma lista del Paso 3, con estos campos adicionales:

```python
{
    ...campos del Paso 3...,
    'progresion': 'mantener' | 'incrementar' | 'reducir' | 'consolidar' | None,
    'primera_vez': True | False,
    'rpe_referencia': float | None,   # rpe_promedio_real del UserExerciseProfile
    'veces_realizado': int,
}
# Más metadatos de sesión:
session_meta = {
    'deload_session': bool,
    'max_sets_sesion': int,
    'rpe_target': int,   # calculado por calcular_rpe_target (ya existe)
}
```

---

## PASO 6 — Construcción del paquete para el LLM

### Qué reemplaza

Reemplaza la función `build_prompt(ctx)` en `views.py`. La función actual pasa todo el contexto al LLM en un bloque de texto libre. El nuevo enfoque estructura el contexto en secciones con datos más precisos del catálogo normalizado.

### Límite de ejercicios al LLM

**No enviar más de 50 ejercicios al LLM.** Si la lista filtrada tiene más, ordenarlos por relevancia y enviar los 50 más pertinentes. Criterio de ordenamiento:

1. Ejercicios en patrones priorizados del Paso 4 → primero
2. Dentro de un mismo patrón: `es_compuesto = True` antes que aislamiento
3. Ejercicios con historial del usuario (`veces_realizado > 0`) antes que nuevos
4. En caso de empate: menor `systemic_fatigue` primero (si el estado físico es bajo)

### Estructura del prompt

El nuevo prompt mantiene la misma identidad del entrenador de élite, pero reorganiza la información. Las secciones son:

**Sección 1 — Perfil del usuario hoy:**
Igual que el prompt actual. Incluir todos los campos de `perfil` + datos del checkin. Nada cambia aquí.

**Sección 2 — Contexto de adaptación:**
Usar la salida de `_build_adaptation_context(user)` existente. No duplicar.

**Sección 3 — Estado del mesociclo y directivas de la sesión:**
Incluir la salida de `_calcular_estado_mesociclo(user)` + los datos de `session_meta` del Paso 5:
- `max_sets_sesion`: el LLM no puede superarlo
- `deload_session`: si es True, advertencia explícita
- `patrones_priorizados` y `patrones_evitar` del Paso 4
- `rpe_target` calculado

**Sección 4 — Banco de ejercicios enriquecido:**
Cada ejercicio en la lista (máximo 50) se presenta con más información que el formato actual (que solo mostraba el nombre). Formato sugerido por ejercicio:

```
[PATRÓN: empuje_horizontal] Press de banca con barra
  Músculos: Pectoral mayor (primario), Tríceps, Deltoides anterior (secundario)
  Equipamiento requerido: Barra, Banco
  Nivel técnico: 2/5 | Fatiga sistémica: 3/5 | Tiempo por set: ~2min 15s
  Historial: 8 veces realizado | RPE promedio real: 7.2 | Progresión: mantener
  Cues: Retracción escapular antes de descender; codos a 45°; control excéntrico 3 segundos
  ⚠️ Advertencia: [texto si requires_warning = True]
```

**Sección 5 — Instrucciones al LLM:**
Las restricciones explícitas del LLM. Las instrucciones actuales se mantienen + estas nuevas:

- "No puedes inventar ejercicios. Elige EXCLUSIVAMENTE de la lista proporcionada en la Sección 4."
- "No puedes exceder `{max_sets_sesion}` sets en el bloque principal."
- "Para los ejercicios marcados como `progresion: incrementar`, sugiere al usuario que puede añadir peso o una repetición respecto a su sesión anterior."
- "Para los marcados como `primera_vez`, indica explícitamente en las notas que comience con peso exploratorio (RPE 6-7) para que el sistema aprenda su carga base."
- "Si `deload_session = True`, el tono del entrenador debe comunicar recuperación activa inteligente, no limitación."

### Output del Paso 6

Un string (el prompt completo) listo para pasar a `_call_groq`. El prompt mantiene el mismo JSON schema de output que la app móvil ya procesa.

---

## PASO 7 — Output del LLM y compatibilidad con la app móvil

### Estructura JSON: extensión backward-compatible

**La app móvil ya consume el formato actual y no debe romperse.** En lugar de cambiar el schema radicalmente, extender el JSON existente con campos nuevos opcionales. La app los ignorará si no los procesa todavía.

El JSON que el LLM debe producir es el formato actual más los campos nuevos:

```json
{
  "titulo": "nombre descriptivo y motivador de la sesión",
  "objetivo_sesion": "qué adaptación fisiológica específica se busca hoy",
  "rpe_target": 7,
  "duracion_total": 60,
  "fases": [
    {
      "nombre": "Calentamiento",
      "duracion_minutos": 10,
      "ejercicios": [
        {
          "nombre": "nombre del ejercicio",
          "series": 2,
          "repeticiones": "30 segundos",
          "descanso_segundos": 15,
          "rpe_sugerido": 4,
          "notas": "cue técnico biomecánico específico"
        }
      ]
    },
    {
      "nombre": "Bloque principal",
      "duracion_minutos": 40,
      "ejercicios": []
    },
    {
      "nombre": "Vuelta a la calma",
      "duracion_minutos": 10,
      "ejercicios": []
    }
  ],
  "nota_del_entrenador": "máximo 2 oraciones explicando por qué esta sesión HOY",
  "decisions_log": [
    {
      "icon": "🔬",
      "text": "Se priorizó bisagra porque el último entrenamiento de cadena posterior fue hace 4 días (Schoenfeld, 2016)"
    },
    {
      "icon": "⚡",
      "text": "RPE objetivo reducido a 6 por HRV bajo (68 → umbral <70 ms)"
    }
  ]
}
```

Los campos nuevos son `decisions_log`. El campo `evidencia` del modelo `Session` (JSONField) almacena datos similares — usar `decisions_log` del LLM para poblar `session.decisiones` (que ya existe como JSONField).

### Validación post-LLM en Django

Después de parsear el JSON, validar:

1. Que todos los nombres de ejercicio en el `"Bloque principal"` existan en `Exercise.objects` (buscar por `nombre__iexact`). Si alguno no existe, loggear el error y **no** eliminarlo del array (el LLM puede crear calentamientos y cierres free-form; solo los del bloque principal deben estar en el catálogo).

2. Que el total de series del bloque principal no supere `session_meta['max_sets_sesion']`. Si lo supera, loggear advertencia pero no bloquear la sesión.

3. Que exista la clave `"fases"` con al menos un elemento. Si falta, devolver error 502 como ya hace el código actual.

### Manejo de errores y fallback

Si el LLM falla o devuelve JSON malformado, el sistema actual ya devuelve 502. **No cambiar este comportamiento.** No implementar fallback de sesión sin LLM — la app ya muestra un mensaje de error y el usuario puede reintentar.

### Guardado en DB

Al guardar la sesión en `Session`:
- `respuesta_ia` → el objeto JSON completo del LLM
- `decisiones` → `sesion_generada.get('decisions_log')` (el nuevo campo)
- El resto de campos (`rpe_target`, `duracion_planificada`, `volumen_relativo`) igual que el código actual

---

## Logging de llamadas al LLM

Agregar logging estructurado en `_call_groq`:

```python
import time

def _call_groq(prompt: str, max_tokens: int, user_id: int = None) -> dict:
    t0 = time.monotonic()
    # ... llamada a Groq ...
    elapsed = time.monotonic() - t0
    tokens_approx = len(prompt.split()) * 1.3  # estimación burda
    logger.info(
        'groq_call user=%s tokens_in_approx=%d tokens_out=%d elapsed=%.2fs valid=%s',
        user_id, tokens_approx, max_tokens, elapsed, True
    )
```

---

## Resumen de cambios al modelo `SessionExercise` (migración futura)

Para habilitar progresión de carga por peso absoluto (Paso 5 versión 2.0), agregar a `SessionExercise`:

```python
peso_usado = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)  # kg
reps_completadas = models.IntegerField(null=True, blank=True)
```

Esto permite que, al finalizar una sesión, el usuario registre el peso real levantado, y el motor lo use en la próxima sesión del mismo ejercicio. **No implementar ahora** — requiere cambio en la app móvil (pantalla de ejecución).

---

## Orden de implementación recomendado

1. Crear `backend/ai_workout/adaptive_engine.py` con la clase `AdaptiveEngineService` y el método `get_exercise_pool` (Paso 3) usando tablas normalizadas
2. Agregar tests unitarios para los 7 filtros con fixtures mínimos
3. Conectar `AdaptiveEngineService.get_exercise_pool` en `generate_session` como reemplazo de `_get_exercise_pool`
4. Implementar `get_pattern_priorities` (Paso 4) y conectarlo al prompt
5. Implementar `enrich_with_load` (Paso 5) — versión RPE-based
6. Extender `build_prompt` con las secciones 3 y 4 estructuradas y el campo `decisions_log` en el schema JSON
7. Agregar el logging en `_call_groq`
8. Registrar los modelos satélite en `backend/workouts/admin.py` (pendiente del checkpoint anterior)

---

## Consideraciones de rendimiento

- Los Pasos 3, 4 y 5 son queries a DB. Con `prefetch_related` correctamente configurado, los 3 pasos deben ejecutarse en menos de 200ms en total.
- El LLM (Groq, llama-3.3-70b-versatile) toma entre 2 y 5 segundos. El pipeline completo debe estar bajo los 6 segundos.
- El objetivo final de < 4 segundos requiere que el prompt sea eficiente (≤ 50 ejercicios, contexto conciso).

---

*Adaptado para la arquitectura Django + React Native de PyFit · Mayo 2026*
