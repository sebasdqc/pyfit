# Zyfit — Guía Técnica de la Base de Datos de Ejercicios

**Director de Investigación en Ciencias del Deporte**
**Versión 1.0 — Mayo 2026**

---

## Qué es este sistema y por qué existe

Esta base de datos no es un catálogo de ejercicios. Es el cerebro técnico del motor adaptativo de Zyfit. Cada variable que contiene existe porque el algoritmo la necesita para tomar una decisión: qué ejercicio prescribir, cuál descartar, cómo sustituirlo, cuánto tiempo ocupa en la sesión, y si es seguro para el usuario frente a él.

El principio de diseño central es **seguridad antes que rendimiento**. Las contraindicaciones son el filtro que se aplica primero. Nada llega al usuario si no pasa ese filtro.

---

## Archivos generados

| Archivo | Contenido | Ejecutar en orden |
|---|---|---|
| `zyfit_exercise_schema.sql` | Tablas, índices, vista central, seeds de catálogos | 1° |
| `zyfit_seed_exercises_01_bisagra_sentadilla.sql` | 28 ejercicios de bisagra y sentadilla | 2° |
| `zyfit_seed_exercises_02_empuje.sql` | 26 ejercicios de empuje horizontal y vertical | 3° |
| `zyfit_seed_exercises_03_jalon.sql` | 26 ejercicios de jalón horizontal y vertical | 4° |
| `zyfit_seed_exercises_04_core.sql` | 28 ejercicios de core | 5° |
| `zyfit_seed_exercises_05_aislamiento.sql` | 34 ejercicios de aislamiento y locomoción | 6° |

**Total: 142 ejercicios**

> El orden de ejecución es obligatorio. Los batches de ejercicios referencian los catálogos que se crean en el schema. Si los batches se ejecutan antes que el schema, fallarán todas las inserciones por violación de claves foráneas.

---

## Arquitectura: las 8 tablas

### Tabla central: `exercises`

Es el núcleo del sistema. Cada fila es un ejercicio con todas sus variables propias.

| Campo | Tipo | Qué significa |
|---|---|---|
| `name` | VARCHAR | Nombre único del ejercicio |
| `movement_pattern` | VARCHAR | Patrón de movimiento — ver catálogo abajo |
| `is_bilateral` | BOOLEAN | TRUE = bilateral, FALSE = unilateral |
| `is_compound` | BOOLEAN | TRUE = multiarticular, FALSE = aislamiento |
| `technical_level` | 1–5 | Complejidad técnica de ejecución |
| `error_risk` | 1–5 | Qué tan fácil es ejecutarlo mal con consecuencias |
| `space_required` | ENUM | `minimo` / `medio` / `amplio` |
| `systemic_fatigue` | 1–5 | Costo energético y de recuperación |
| `set_duration_seconds` | INT | Duración promedio de un set en segundos |
| `rest_seconds_default` | INT | Descanso recomendado entre sets |
| `description` | TEXT | Descripción técnica del ejercicio |
| `coaching_cues` | TEXT[] | Array de puntos de coaching clave |

**La suma `set_duration_seconds + rest_seconds_default` es el tiempo total por set.** El algoritmo usa este valor para calcular si un ejercicio cabe en el tiempo disponible del usuario.

---

### Escala de `technical_level` (1–5)

| Nivel | Descripción |
|---|---|
| 1 | Cualquier principiante puede aprender en menos de 5 minutos |
| 2 | Requiere instrucción básica; errores comunes pero de bajo riesgo |
| 3 | Requiere práctica y retroalimentación; errores de riesgo moderado |
| 4 | Requiere coaching activo; errores pueden causar lesión |
| 5 | Técnica de alto nivel; requiere supervisión (ej. clean, turkish get-up) |

---

### Escala de `error_risk` (1–5)

Independiente del nivel técnico. Mide el riesgo de la ejecución incorrecta, no la dificultad de aprenderlo.

| Nivel | Descripción |
|---|---|
| 1 | Casi imposible hacerlo de forma peligrosa |
| 2 | Errores comunes con consecuencias leves |
| 3 | Errores intermedios con consecuencias moderadas |
| 4 | Margen de error reducido; consecuencias directas |
| 5 | Mínimo margen de error; consecuencias inmediatas (ej. peso muerto convencional, good morning) |

---

### Escala de `systemic_fatigue` (1–5)

| Nivel | Ejemplo representativo |
|---|---|
| 1 | Curl de muñeca, rotación externa con banda |
| 2 | Curl de bíceps, elevaciones laterales |
| 3 | Press de banca, remo en máquina |
| 4 | Sentadilla con barra, peso muerto rumano, press militar |
| 5 | Sentadilla trasera, peso muerto convencional, sprint, burpee |

---

### Catálogo de `movement_pattern`

| Valor | Descripción |
|---|---|
| `bisagra` | Dominancia de extensión de cadera — carga cadena posterior |
| `sentadilla` | Dominancia de extensión de rodilla — carga cuádriceps y glúteo |
| `empuje_horizontal` | Empuje en plano horizontal — pecho, tríceps, deltoides anterior |
| `empuje_vertical` | Empuje en plano vertical — deltoides, tríceps |
| `jalon_horizontal` | Jalón en plano horizontal — espalda media, bíceps |
| `jalon_vertical` | Jalón en plano vertical — dorsal, bíceps |
| `core_antiextension` | El core resiste que la columna se arquee |
| `core_antirrotacion` | El core resiste la rotación del torso |
| `core_antiflexion` | El core resiste la flexión lateral |
| `cargada` | Movimientos olímpicos o de potencia explosiva |
| `locomocion` | Desplazamiento, saltos, sprints |
| `aislamiento` | Un solo grupo muscular en un solo plano |

---

### Tablas satélite y sus relaciones

#### `muscle_groups` + `exercise_muscles`

`muscle_groups` es el catálogo cerrado de 42 músculos organizados por grupo anatómico (Pierna, Espalda, Pecho, Hombro, Brazo, Core).

`exercise_muscles` es la tabla puente que conecta cada ejercicio con sus músculos. Cada fila tiene un campo `role`:

| Rol | Significado |
|---|---|
| `primario` | El músculo que genera principalmente el movimiento |
| `secundario` | Contribuye al movimiento pero no es el foco |
| `estabilizador` | Mantiene la posición pero no genera el movimiento |

**Uso en el algoritmo:** balance muscular de la sesión, detección de solapamiento de volumen, construcción de programas equilibrados.

---

#### `equipment_items` + `exercise_equipment`

`equipment_items` es el catálogo cerrado de 30 ítems de equipamiento. Cada ítem tiene:
- `category`: Libre / Cable / Máquina / Accesorio / Ninguno
- `is_gym_only`: si requiere instalaciones de gimnasio (TRUE) o puede estar en casa (FALSE)

`exercise_equipment` conecta ejercicios con equipamiento. El campo `is_required` es crítico:
- `TRUE` = sin este equipo el ejercicio no puede ejecutarse
- `FALSE` = mejora la ejecución pero no es obligatorio

**Uso en el algoritmo:** filtro de elegibilidad. Si el usuario declara que no tiene barra olímpica, todos los ejercicios con `is_required = TRUE` para ese ítem quedan automáticamente excluidos.

---

#### `contraindication_categories` + `exercise_contraindications`

Esta es la tabla más crítica del sistema desde el punto de vista de seguridad.

`contraindication_categories` contiene 30 categorías predefinidas organizadas por zona corporal: Columna, Rodilla, Hombro, Muñeca, Cadera, Tobillo, General.

Cada categoría tiene una severidad fija:

| Severidad | Significado para el algoritmo |
|---|---|
| `grave` | Contraindicación absoluta — el ejercicio nunca debe prescribirse si el usuario tiene esta condición |
| `leve` | Contraindicación relativa — puede prescribirse con modificaciones; la decisión final depende del contexto clínico |

`exercise_contraindications` es la puente. Además de la relación, tiene un campo `notes` TEXT que permite agregar matices clínicos específicos sin alterar el schema. Ejemplo: el peso muerto convencional puede ejecutarse con lumbar crónico estable bajo ciertas condiciones — eso se documenta en `notes`.

**Regla de oro para el algoritmo:** antes de prescribir cualquier ejercicio, filtrar por contraindicaciones graves del perfil del usuario. Las leves se manejan con advertencias y sustituciones sugeridas.

---

#### `exercise_relationships`

Tabla de grafo dirigido. Cada fila conecta un ejercicio origen con un ejercicio destino a través de un tipo de relación.

| `relationship_type` | Significado |
|---|---|
| `easier` | El destino es una versión más fácil del origen |
| `harder` | El destino es una versión más difícil del origen |
| `unilateral_version` | El destino es la versión unilateral del origen |
| `equipment_alternative` | El destino cumple la misma función sin el equipo del origen |
| `variant` | Misma función, ejecución diferente |

**Uso en el algoritmo:**
- Si el usuario no tiene el equipo requerido → buscar `equipment_alternative`
- Si el usuario no puede hacer el ejercicio por nivel técnico → bajar por `easier`
- Si el ejercicio está contraindicado → buscar `equipment_alternative` o `variant` sin esa contraindicación
- Para progresión automática → subir por `harder` cuando se alcanza el criterio de avance

La ausencia de una relación no es un error — significa que esa relación no existe. El algoritmo debe manejar NULL gracefully.

---

## La vista central: `v_exercise_full`

Esta es la interfaz que el algoritmo debe usar. **No consultar las tablas crudas directamente en el motor adaptativo.**

La vista agrega en una sola fila por ejercicio:
- Todos sus músculos por rol (como arrays)
- Todo su equipamiento requerido (como array)
- Todas sus contraindicaciones separadas por severidad (como arrays)
- El tiempo total por set calculado

```sql
-- Ejemplo: todos los ejercicios viables para un usuario sin barra y con dolor lumbar crónico
SELECT *
FROM v_exercise_full
WHERE 'Barra olímpica' != ALL(required_equipment)
  AND 'Dolor lumbar agudo' != ALL(contraindications_grave)
  AND 'Hernia discal lumbar activa' != ALL(contraindications_grave);
```

---

## Cómo el algoritmo construye una sesión

El flujo lógico recomendado es:

```
1. FILTRO DE SEGURIDAD
   Excluir todos los ejercicios con contraindicaciones graves del perfil del usuario.

2. FILTRO DE ELEGIBILIDAD
   Excluir ejercicios que requieran equipamiento que el usuario no tiene.

3. FILTRO DE TIEMPO
   Excluir ejercicios cuyo total_set_seconds × sets_previstos supere el tiempo disponible.

4. FILTRO DE NIVEL TÉCNICO
   Excluir ejercicios con technical_level superior al nivel del usuario.

5. SELECCIÓN POR PATRÓN
   Seleccionar ejercicios que cubran los patrones de movimiento objetivo de la sesión.

6. BALANCE DE FATIGA SISTÉMICA
   Asegurarse de que la suma de systemic_fatigue × sets no supere el umbral de la sesión.

7. BALANCE MUSCULAR
   Verificar que los músculos primarios no se repitan excesivamente dentro de la sesión.

8. SUSTITUCIÓN AUTOMÁTICA (si hay conflictos)
   Si un ejercicio preferido está contraindicado o no hay equipo:
   → Buscar equipment_alternative o variant en exercise_relationships
   → Si no hay alternativa viable, omitir el patrón y compensar en la siguiente sesión.
```

---

## Reglas científicas que guían el diseño

Estas decisiones de contenido tienen respaldo en la literatura y deben mantenerse al actualizar o agregar ejercicios:

**1. Severidad de contraindicaciones es fija, no configurable por el usuario.**
La evidencia clínica define si una contraindicación es grave o leve. El usuario no puede anular una contraindicación grave desde la app — como máximo puede declarar que tiene clearance médico.

**2. El rango elongado produce mayor hipertrofia.**
Ejercicios como el curl inclinado, el curl de isquiotibiales sentado, la extensión overhead de tríceps y la elevación lateral en polea baja están marcados como `harder` o `variant` respecto a sus equivalentes en rango acortado precisamente por este principio (McMahon et al., 2014; Pedrosa et al., 2022).

**3. El jalón detrás del cuello está incluido pero fuertemente restringido.**
Está en la base de datos porque los usuarios lo pedirán. Su set de contraindicaciones refleja el consenso actual: columna cervical en flexión forzada bajo carga + posición de máximo impingement subacromial. El algoritmo solo debe prescribirlo en usuarios sin ninguna de esas contradicaciones y con nivel técnico ≥ 3.

**4. El face pull es un ejercicio de salud, no de estética.**
Está clasificado en `empuje_vertical` (batch 02) por su función de rotación externa de hombro. El algoritmo debe prescribirlo automáticamente cuando el volumen semanal de press horizontal + press vertical supera cierto umbral, independientemente del objetivo del usuario.

**5. Dead bug y bird dog son rehabilitadores, no solo ejercicios.**
Sus notas clínicas los marcan como indicados en lumbar crónico. El algoritmo puede prescribirlos activamente — no solo tolerarlos — cuando detecta esa condición en el perfil.

**6. Nordic curl requiere adaptación excéntrica previa obligatoria.**
`technical_level = 4`, `systemic_fatigue = 3`. Sus notas advierten que el riesgo de agujetas severas o desgarro es alto sin progresión. El algoritmo nunca debe prescribirlo en las primeras semanas de entrenamiento ni sin una progresión de curl de isquiotibiales en máquina previa.

**7. El remo al mentón tiene una sustitución directa.**
La relación `equipment_alternative` hacia el face pull documenta el razonamiento: misma función de trapecio superior + deltoides lateral sin la rotación interna forzada del hombro. Si el usuario tiene cualquier patología de hombro, el algoritmo debe sustituir automáticamente.

---

## Cómo mantener y expandir la base de datos

### Agregar un ejercicio nuevo

Toda inserción debe seguir este orden obligatorio:

```sql
-- 1. Insertar el ejercicio en la tabla central
INSERT INTO exercises (...) VALUES (...);

-- 2. Asignar músculos con sus roles
INSERT INTO exercise_muscles (exercise_id, muscle_id, role) ...

-- 3. Asignar equipamiento requerido y opcional
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required) ...

-- 4. Asignar contraindicaciones con notas clínicas
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes) ...

-- 5. Definir relaciones con otros ejercicios
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes) ...
```

Un ejercicio sin contraindicaciones asignadas no significa que sea seguro para todos — significa que no ha sido revisado. Usar el campo `is_active = FALSE` para marcar ejercicios pendientes de revisión clínica.

### Agregar una contraindicación nueva

Solo se puede agregar al catálogo `contraindication_categories`. La severidad debe definirse con criterio clínico antes de insertar — no se puede cambiar después sin revisar todos los ejercicios que la referencian.

### Agregar equipamiento nuevo

Solo se puede agregar al catálogo `equipment_items`. Al agregar un ítem nuevo, revisar qué ejercicios existentes podrían usar ese equipamiento como alternativa y crear las relaciones correspondientes en `exercise_relationships`.

### Retirar un ejercicio

No eliminar. Usar `is_active = FALSE`. La vista `v_exercise_full` ya filtra por `is_active = TRUE`. Las relaciones existentes con ese ejercicio permanecen como registro histórico pero no aparecen en las consultas de la vista.

---

## Índices disponibles y cuándo usarlos

Los índices creados en el schema optimizan las consultas más frecuentes del algoritmo:

| Índice | Optimiza |
|---|---|
| `idx_exercises_movement_pattern` | Filtro por patrón al construir la sesión |
| `idx_exercises_technical_level` | Filtro por nivel de usuario |
| `idx_exercises_systemic_fatigue` | Balance de carga en sesión |
| `idx_exercise_contraindications_exercise` | El filtro de seguridad — la consulta más crítica |
| `idx_contraindication_severity` | Separación grave/leve en el filtro |
| `idx_exercise_equipment_required` | Filtro de equipamiento disponible |
| `idx_exercise_relationships_source` | Búsqueda de progresiones y alternativas |

---

## Resumen de la base de ejercicios

| Patrón | Ejercicios | Fatiga sistémica predominante |
|---|---|---|
| Bisagra | 10 | Alta (3–5) |
| Sentadilla | 18 | Alta (2–5) |
| Empuje horizontal | 13 | Media-Alta (2–4) |
| Empuje vertical | 13 | Media-Alta (2–4) |
| Jalón horizontal | 12 | Media-Alta (2–4) |
| Jalón vertical | 14 | Media-Alta (3–5) |
| Core antiextensión | 13 | Baja-Media (1–3) |
| Core antirrotación | 11 | Baja (1–2) |
| Aislamiento | 20 | Baja-Media (1–2) |
| Locomoción | 9 | Alta (3–5) |
| **Total** | **142** | |

---

*Documento generado por el Director de Investigación en Ciencias del Deporte de Zyfit.*
*Cada decisión técnica en este sistema tiene justificación científica documentada en los campos `notes` de las tablas correspondientes.*
