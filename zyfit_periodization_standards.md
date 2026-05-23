# Zyfit — Estándares de Periodización Adaptativa

**Para:** Claude Code  
**De:** Dirección de Investigación en Ciencias del Deporte  
**Versión:** 2.0 — Mayo 2026  
**Scope:** Reemplaza completamente la Sección 6 y Sección 7 de `zyfit_training_standards.md`

---

## Cómo leer este documento

- **HARD RULE** → Validación de base de datos, constraint, o error 400. No negociable.
- **SOFT RULE** → Lógica de negocio o sugerencia al usuario. Sobrescribible con confirmación explícita.

La periodización en Zyfit usa **un único sistema con una estructura base común** cuyos parámetros se ramifican según el campo `goal` del usuario en `user_profiles`. El motor nunca elige un modelo de periodización distinto por objetivo — elige distintos valores dentro del mismo modelo.

---

## Índice

1. [Arquitectura del sistema](#1-arquitectura-del-sistema)
2. [Objetivos y sus perfiles de periodización](#2-objetivos-y-sus-perfiles-de-periodización)
3. [Estructura de ciclos por objetivo](#3-estructura-de-ciclos-por-objetivo)
4. [Parámetros por bloque y objetivo](#4-parámetros-por-bloque-y-objetivo)
5. [Periodización ondulante diaria (DUP) por objetivo](#5-periodización-ondulante-diaria-dup-por-objetivo)
6. [Semanas de descarga por objetivo](#6-semanas-de-descarga-por-objetivo)
7. [Triggers de deload adaptativos](#7-triggers-de-deload-adaptativos)
8. [Transiciones entre objetivos](#8-transiciones-entre-objetivos)
9. [Cambios de schema requeridos](#9-cambios-de-schema-requeridos)

---

## 1. Arquitectura del sistema

El sistema tiene tres capas de organización temporal. Los valores concretos de cada capa dependen del `goal` del usuario.

```
MACROCICLO
  → Duración variable según goal (6–16 semanas)
  → Dividido en BLOQUES de 3–5 semanas según goal
      → Cada bloque dividido en MESOCICLOS de 3–4 semanas + 1 deload
          → Cada mesociclo organizado en MICROCICLOS (sesiones/semana)
              → Cada microciclo aplica DUP si la frecuencia lo permite
```

### Variables que determinan la periodización de un usuario

```
HARD RULE: El motor SIEMPRE lee estas variables de user_profiles antes
           de generar cualquier ciclo. Sin ellas no puede calcular
           parámetros de periodización.

  goal                → determina el modelo de bloques y los rangos
  level               → determina duración de macrociclo y frecuencia de deload
  days_per_week       → determina si DUP es aplicable
  available_time_min  → condiciona el volumen real ejecutable
```

---

## 2. Objetivos y sus perfiles de periodización

Cinco valores válidos para `user_profiles.goal`. Cada uno tiene un perfil distinto de cómo el sistema organiza el tiempo y qué palancas usa para generar progresión.

| Goal | Palanca principal de progresión | Palanca secundaria | Intensidad dominante | Ciclo base |
|---|---|---|---|---|
| `hipertrofia` | Volumen acumulado | Rango elongado / variedad de estímulo | Moderada (RPE 7–8) | 8 semanas |
| `fuerza` | Intensidad de carga | Especificidad de patrón | Alta (RPE 8–9) | 12 semanas |
| `potencia` | Velocidad de ejecución | Transferencia específica | Moderada-alta (RPE 7–8 a vel. máx.) | 10 semanas |
| `salud` | Adherencia y consistencia | Variedad y disfrute | Baja-moderada (RPE 5–7) | 6 semanas |
| `perdida_grasa` | Densidad de trabajo (vol × tiempo) | Preservación de masa muscular | Moderada (RPE 6–8) | 8 semanas |

```
HARD RULE: El campo goal en user_profiles acepta SOLO los cinco valores
           de la tabla anterior. Cualquier otro valor es error de
           validación.

SOFT RULE: El usuario puede cambiar su goal en cualquier momento.
           Al hacerlo, el sistema evalúa si está en la primera mitad
           del ciclo actual (semana <= macrociclo_duracion / 2).
           → Si sí: reiniciar el ciclo con el nuevo goal.
           → Si no: completar el bloque actual y comenzar el nuevo
             goal en el siguiente bloque.
           Ver sección 8 para el protocolo completo de transición.
```

---

## 3. Estructura de ciclos por objetivo

### 3.1 Duración del macrociclo y número de bloques

| Goal | Duración macrociclo | Número de bloques | Semanas por bloque | Semanas trabajo + deload |
|---|---|---|---|---|
| `hipertrofia` | 8 semanas | 2 bloques | 4 semanas | 3 trabajo + 1 deload |
| `fuerza` | 12 semanas | 3 bloques | 4 semanas | 3 trabajo + 1 deload |
| `potencia` | 10 semanas | 2 bloques + peak | 4–3–3 semanas | 3 trabajo + 1 deload / 3 trabajo + 0 deload |
| `salud` | 6 semanas | 1 bloque continuo | 6 semanas | 5 trabajo + 1 deload |
| `perdida_grasa` | 8 semanas | 2 bloques | 4 semanas | 3 trabajo + 1 deload |

### 3.2 Nombres de bloques por objetivo

Los nombres de bloque son los valores válidos para `training_cycles.block_type`. El motor los usa para determinar parámetros — no son etiquetas decorativas.

**`hipertrofia`:**
```
Bloque 1: acumulacion_hiper    → Alto volumen, rango medio-alto de reps
Bloque 2: intensificacion_hiper → Volumen mantenido, ligero aumento de carga
```

**`fuerza`:**
```
Bloque 1: acumulacion_fuerza   → Base de volumen con carga moderada
Bloque 2: intensificacion_fuerza → Reduce volumen, aumenta intensidad
Bloque 3: realizacion_fuerza   → Bajo volumen, máxima intensidad, pico
```

**`potencia`:**
```
Bloque 1: fuerza_base          → Base de fuerza que alimenta la potencia
Bloque 2: potencia_especifica  → Velocidad de ejecución como estímulo principal
Bloque 3 (peak, 3 sem): pico_potencia → Transferencia máxima, sin deload al final
```

**`salud`:**
```
Bloque único: salud_general    → Sin subdivisión. Variedad como estímulo dominante.
```

**`perdida_grasa`:**
```
Bloque 1: densidad_alta        → Alta densidad de trabajo, descansos cortos
Bloque 2: preservacion_muscular → Sube intensidad, baja volumen, protege masa
```

```
HARD RULE: training_cycles.block_type acepta SOLO los valores listados
           arriba. El sistema debe validar que el block_type sea
           compatible con el goal del usuario al crear el ciclo.
```

---

## 4. Parámetros por bloque y objetivo

Esta es la tabla central que el motor consulta para asignar parámetros a cada sesión. Todos los valores son los que el generador debe usar como punto de partida antes de aplicar DUP y ajustes individuales.

### 4.1 `hipertrofia`

| Bloque | Reps objetivo | RPE objetivo | RIR objetivo | Volumen | Descanso estándar | Énfasis |
|---|---|---|---|---|---|---|
| `acumulacion_hiper` | 8–15 RM | RPE 7–8 | 2–3 RIR | MAV | 90–120 seg | Rango elongado, variedad de estímulo |
| `intensificacion_hiper` | 6–10 RM | RPE 8–9 | 1–2 RIR | MAV | 120–150 seg | Carga progresiva, menos variedad |
| `deload` | 10–15 RM | RPE 5–6 | 4–5 RIR | MEV | Estándar | Sin cambios de carga |

**Notas de implementación para hipertrofia:**
```
SOFT RULE: En acumulacion_hiper, priorizar ejercicios donde el músculo
           trabaja en rango elongado (ver campo ejercicio en exercise_relationships
           con notas sobre rango elongado). El estímulo en rango elongado
           produce mayor hipertrofia que el rango acortado al mismo volumen.
           (Pedrosa et al., 2022)

SOFT RULE: El bloque de intensificacion_hiper no baja a < 6 RM.
           La hipertrofia tiene un techo claro por debajo de 5 reps.
           Si el usuario quiere < 5 RM, el goal correcto es fuerza.
```

### 4.2 `fuerza`

| Bloque | Reps objetivo | RPE objetivo | RIR objetivo | Volumen | Descanso estándar | Énfasis |
|---|---|---|---|---|---|---|
| `acumulacion_fuerza` | 5–8 RM | RPE 7–8 | 2–3 RIR | MAV | 150–180 seg | Técnica, base de volumen |
| `intensificacion_fuerza` | 3–6 RM | RPE 8–9 | 1–2 RIR | MAV − 20% | 180–240 seg | Carga progresiva específica |
| `realizacion_fuerza` | 1–4 RM | RPE 8–10 | 1–2 RIR | MAV − 30% | 240–300 seg | Máxima expresión, pico |
| `deload` | 5–8 RM | RPE 5–6 | 4–5 RIR | MEV | Estándar | Misma carga, menos series |

**Notas de implementación para fuerza:**
```
HARD RULE: En realizacion_fuerza, los ejercicios de systemic_fatigue >= 4
           NUNCA pueden superar el 50% del volumen de la sesión.
           El SNC no puede recuperarse de múltiples ejercicios de alta
           intensidad en la misma sesión.

SOFT RULE: En realizacion_fuerza, reducir la variedad de ejercicios al
           mínimo. Solo los patrones de movimiento específicos del objetivo
           del usuario (ej. si entrena para powerlifting: sentadilla,
           press banca, peso muerto). Eliminar aislamiento.
```

### 4.3 `potencia`

| Bloque | Reps objetivo | RPE objetivo | RIR objetivo | Volumen | Descanso estándar | Énfasis |
|---|---|---|---|---|---|---|
| `fuerza_base` | 4–6 RM | RPE 7–8 | 2–3 RIR | MAV | 180–240 seg | Fuerza como base de potencia |
| `potencia_especifica` | 3–5 RM a vel. máx. | RPE 6–7 | 3–4 RIR | MAV − 20% | 180–300 seg | Velocidad de ejecución como estímulo |
| `pico_potencia` | 1–3 a vel. máx. | RPE 6–7 | 4–5 RIR | MEV | 240–300 seg | Transferencia máxima, frescura |
| `deload` | 5–6 RM normal | RPE 5 | 5+ RIR | MEV − 20% | Estándar | Solo al final del bloque 1 |

**Notas de implementación para potencia:**
```
HARD RULE: En potencia_especifica y pico_potencia, el tempo concéntrico
           es SIEMPRE X (máxima velocidad). No prescribir tempo lento
           en ningún ejercicio de potencia.

HARD RULE: En potencia_especifica y pico_potencia, el descanso NUNCA
           puede reducirse por debajo de 180 seg. La potencia requiere
           recuperación completa entre series — trabajar fatigado
           entrena resistencia, no potencia.

SOFT RULE: En fuerza_base, los ejercicios de aislamiento son opcionales
           y se colocan al final. La potencia se construye sobre patrones
           multiarticulares. El aislamiento no transfiere.

SOFT RULE: El bloque pico_potencia no tiene deload al final porque la
           semana post-macrociclo sirve como recuperación antes del
           nuevo ciclo. Si el usuario continúa, insertar 1 semana de
           deload antes de comenzar el siguiente macrociclo.
```

### 4.4 `salud`

| Bloque | Reps objetivo | RPE objetivo | RIR objetivo | Volumen | Descanso estándar | Énfasis |
|---|---|---|---|---|---|---|
| `salud_general` | 10–15 RM | RPE 5–7 | 3–5 RIR | MEV a MAV | 60–90 seg | Variedad, adherencia, disfrute |
| `deload` | 12–15 RM | RPE 4–5 | 5+ RIR | MEV − 30% | Estándar | Muy ligero |

**Notas de implementación para salud:**
```
SOFT RULE: El objetivo salud prioriza la variedad de ejercicios sobre
           la especificidad. El sistema debe rotar los ejercicios con
           mayor frecuencia que en otros objetivos: máximo 3 semanas
           consecutivas con el mismo ejercicio principal antes de
           ofrecer una variante o alternativa.

SOFT RULE: La intensidad en salud_general nunca supera RPE 7 de forma
           sistemática. Las sesiones deben terminar con el usuario
           sintiéndose bien, no agotado. La adherencia a largo plazo
           es el objetivo real.

HARD RULE: En el objetivo salud, los ejercicios con error_risk >= 4
           (peso muerto convencional, sentadilla con barra pesada,
           press militar máximo, etc.) requieren que el usuario tenga
           nivel 'intermedio' o 'avanzado' para ser prescritos.
           Para nivel 'principiante' con goal salud: error_risk máximo 3.

SOFT RULE: El sistema debe incorporar al menos 1 ejercicio de movilidad
           o activación de bajo impacto en cada sesión de salud
           (bird dog, dead bug, rotación externa, plancha). Estos no
           cuentan para el volumen pero sí para la duración de sesión.

SOFT RULE: Los ciclos de salud son de 6 semanas por diseño. Ciclos más
           cortos aumentan la percepción de progreso y la motivación.
           Al completar un ciclo, el sistema muestra un resumen de
           progreso antes de comenzar el siguiente.
```

### 4.5 `perdida_grasa`

| Bloque | Reps objetivo | RPE objetivo | RIR objetivo | Volumen | Descanso estándar | Énfasis |
|---|---|---|---|---|---|---|
| `densidad_alta` | 10–15 RM | RPE 7–8 | 2–3 RIR | MAV | 45–75 seg | Alta densidad, déficit calórico compatible |
| `preservacion_muscular` | 6–10 RM | RPE 7–8 | 2–3 RIR | MAV − 20% | 90–120 seg | Mantener estímulo de fuerza para preservar masa |
| `deload` | 12–15 RM | RPE 5–6 | 4–5 RIR | MEV | Estándar | Recuperación sin perder masa |

**Notas de implementación para pérdida de grasa:**
```
SOFT RULE: En densidad_alta, el descanso corto (45–75 seg) es el
           mecanismo principal de densidad energética, no el volumen
           extremo. El volumen sigue siendo MAV, pero la misma cantidad
           de trabajo en menos tiempo genera mayor gasto calórico.

HARD RULE: El bloque preservacion_muscular NUNCA reduce la carga.
           La pérdida de masa muscular en déficit calórico es proporcional
           a la caída de intensidad. El sistema debe mantener la carga
           de los ejercicios compuestos aunque el volumen baje.

SOFT RULE: En perdida_grasa, el orden de ejercicios dentro de la sesión
           prioriza los compuestos multiarticulares (bisagra, sentadilla,
           empuje, jalón) antes que el aislamiento. Maximizar el gasto
           calórico por unidad de tiempo.

SOFT RULE: Si el usuario tiene déficit calórico declarado > 500 kcal/día,
           el sistema debe reducir el volumen al MAV − 10% como protección
           de masa muscular. El rendimiento en déficit severo es menor.
```

---

## 5. Periodización ondulante diaria (DUP) por objetivo

DUP varía el estímulo entre sesiones de la misma semana. No todos los objetivos lo aplican igual.

### 5.1 Aplicabilidad de DUP por objetivo y frecuencia

```
HARD RULE: DUP solo es aplicable cuando days_per_week >= 3 Y el mismo
           músculo recibe >= 2 sesiones por semana. Con 2 días/semana
           o frecuencia por músculo = 1x, no se aplica DUP — cada
           sesión tiene un foco único.
```

| Goal | DUP aplicable | Condición |
|---|---|---|
| `hipertrofia` | Sí | Con >= 3 días y >= 2x por músculo |
| `fuerza` | Sí | Con >= 4 días y >= 3x por patrón |
| `potencia` | Parcialmente | Solo entre fuerza_base y potencia_especifica en la misma semana |
| `salud` | No recomendado | La variedad de ejercicios cumple la función de DUP |
| `perdida_grasa` | Sí | Con >= 3 días |

### 5.2 Focos de sesión por objetivo

**`hipertrofia` (3+ días):**

| Sesión | Foco | Reps | RPE | Tipo de ejercicios |
|---|---|---|---|---|
| A | Hipertrofia — rango elongado | 10–15 RM | RPE 7–8 | Ejercicios con máximo estiramiento |
| B | Hipertrofia — carga progresiva | 6–10 RM | RPE 8–9 | Compuestos con carga alta |
| C (si existe) | Hipertrofia — volumen acumulado | 12–20 RM | RPE 7–8 | Aislamiento + compuestos ligeros |

**`fuerza` (4+ días):**

| Sesión | Foco | Reps | RPE | Tipo de ejercicios |
|---|---|---|---|---|
| A | Fuerza máxima | 2–4 RM | RPE 8–9 | Patrón principal únicamente |
| B | Hipertrofia de apoyo | 6–10 RM | RPE 7–8 | Accesorios del patrón principal |
| C | Fuerza técnica | 4–6 RM | RPE 7 | Patrón principal + variantes |
| D | Volumen acumulado | 8–12 RM | RPE 7–8 | Accesorios y puntos débiles |

**`potencia` (3–4 días):**

| Sesión | Foco | Reps | RPE | Tipo de ejercicios |
|---|---|---|---|---|
| A | Fuerza base | 3–5 RM | RPE 8 | Compuestos pesados |
| B | Potencia explosiva | 2–4 a vel. máx. | RPE 6–7 | Cargadas, saltos, sprints |
| C (si existe) | Fuerza accesoria | 5–8 RM | RPE 7–8 | Accesorios del patrón de potencia |

**`salud` (2–4 días):**

```
SOFT RULE: En salud, no hay focos de sesión fijos. Cada sesión es
           Full Body con variación de ejercicios. El sistema rota los
           ejercicios según exercise_relationships (variant, easier,
           harder) para mantener variedad sin cambiar el patrón base.
```

**`perdida_grasa` (3–4 días):**

| Sesión | Foco | Reps | RPE | Tipo de ejercicios |
|---|---|---|---|---|
| A | Densidad — tren inferior | 10–15 RM | RPE 7–8 | Bisagra + sentadilla, descanso corto |
| B | Densidad — tren superior | 10–15 RM | RPE 7–8 | Empuje + jalón, descanso corto |
| C (si existe) | Preservación de fuerza | 5–8 RM | RPE 7–8 | Compuestos principales, descanso normal |

---

## 6. Semanas de descarga por objetivo

La estructura del deload es la misma para todos los objetivos. Los parámetros varían.

### 6.1 Frecuencia de deload por objetivo

| Goal | Deload programático cada | Nota |
|---|---|---|
| `hipertrofia` | 4 semanas (final de cada bloque) | Invariable |
| `fuerza` | 4 semanas (final de cada bloque) | Invariable |
| `potencia` | Al final del bloque 1 únicamente | El bloque pico no tiene deload |
| `salud` | 6 semanas (final del único bloque) | Puede ser más ligero que otros |
| `perdida_grasa` | 4 semanas (final de cada bloque) | Invariable |

### 6.2 Parámetros de deload por objetivo

> **HARD RULE universal:** La carga NO baja en ningún deload de ningún objetivo. Solo baja el volumen. Esta regla es invariante sin excepción.

| Goal | Volumen deload | RPE objetivo | RIR objetivo | Reps | Notas especiales |
|---|---|---|---|---|---|
| `hipertrofia` | MEV (50–60% MAV) | RPE 5–6 | 4–5 RIR | 10–15 RM | Priorizar ejercicios con rango elongado |
| `fuerza` | MEV (50% MAV) | RPE 5–6 | 4–5 RIR | 5–8 RM | Mantener los patrones principales, eliminar accesorios |
| `potencia` | MEV − 20% | RPE 4–5 | 5+ RIR | 4–6 a vel. sub-máx. | Solo al final del bloque 1. Velocidad reducida intencional |
| `salud` | MEV − 30% | RPE 4–5 | 5+ RIR | 12–15 RM | Muy ligero — puede ser solo movilidad y activación |
| `perdida_grasa` | MEV (50% MAV) | RPE 5–6 | 4–5 RIR | 10–12 RM | No reducir la carga de compuestos — preservar masa |

---

## 7. Triggers de deload adaptativos

Independientes del deload programático. Cualquier trigger puede activar un deload anticipado en cualquier objetivo.

### 7.1 Triggers universales (todos los objetivos)

```
Activar deload anticipado si se cumple CUALQUIERA de las siguientes:

  TRIGGER_RPE_ELEVADO:
    RPE promedio de la última semana >= RPE_prescrito + 1.5
    en al menos 3 ejercicios compuestos distintos.
    → Registrar en deload_triggers con trigger_type = 'rpe_elevated'

  TRIGGER_DOMS:
    DOMS reportado >= 3/10 en > 50% de grupos musculares
    al inicio de sesión durante 3 días consecutivos.
    → Registrar con trigger_type = 'doms_persistent'

  TRIGGER_CAIDA_CARGA:
    Carga ejecutada < carga_prescrita * 0.90 sin causa reportada
    en >= 2 ejercicios principales en la misma semana.
    → Registrar con trigger_type = 'load_drop'

  TRIGGER_SUEÑO:
    sleep_quality <= 4/10 durante >= 4 días consecutivos.
    → Registrar con trigger_type = 'sleep_deficit'
```

### 7.2 Triggers específicos por objetivo

```
GOAL = fuerza | potencia:
  TRIGGER_PLATEAU_FUERZA:
    Sin progresión de carga en el patrón principal durante >= 2 semanas
    dentro de realizacion_fuerza o pico_potencia con RPE >= 9.
    → Acción: deload inmediato + reinicio del bloque anterior.
    → Registrar con trigger_type = 'strength_plateau_peak'

GOAL = salud:
  TRIGGER_ADHERENCIA:
    El usuario completa < 60% de las sesiones programadas en 2 semanas
    consecutivas sin causa reportada.
    → Acción: NO deload. Reducir days_per_week en 1 y simplificar
      la sesión. El problema es adherencia, no fatiga.
    → Registrar con trigger_type = 'adherence_drop'

GOAL = perdida_grasa:
  TRIGGER_DEFICIT_SEVERO:
    Si el usuario declara déficit calórico > 700 kcal/día Y
    RPE promedio >= prescrito + 1 en ejercicios compuestos.
    → Acción: deload anticipado + reducir volumen al MEV − 10%
      en el bloque siguiente.
    → Registrar con trigger_type = 'caloric_deficit_fatigue'
```

### 7.3 Protocolo post-deload por objetivo

```
UNIVERSAL (todos los objetivos):
  La semana post-deload comienza con volumen en MAV (no MRV).
  La carga de la primera sesión = carga de la última semana
  del bloque anterior + step de progresión estándar.

ESPECÍFICO por goal:

  hipertrofia:
    Reiniciar el siguiente bloque con al menos 2 ejercicios
    diferentes a los del bloque anterior por patrón de movimiento
    (usar exercise_relationships.variant). La variedad post-deload
    maximiza el estímulo en un músculo que vuelve a ser sensible.

  fuerza:
    Comenzar el nuevo bloque con el mismo ejercicio principal.
    No cambiar la selección de movimientos — la especificidad
    es la palanca de progresión en fuerza.

  potencia:
    Al terminar el macrociclo completo: insertar 1 semana de
    transición activa (solo fuerza_base a RPE 6) antes de
    reiniciar el nuevo macrociclo.

  salud:
    Mostrar al usuario un resumen de progreso del ciclo
    completado antes de iniciar el siguiente. La motivación
    basada en evidencia de progreso es el principal retensor
    en usuarios con goal salud.

  perdida_grasa:
    En el bloque preservacion_muscular post-deload:
    incrementar los descansos al estándar de la categoría
    (no al corto de densidad_alta) para maximizar la calidad
    del estímulo de fuerza sobre los músculos.
```

---

## 8. Transiciones entre objetivos

Cuando el usuario cambia su `goal`, el sistema no reinicia el ciclo abruptamente. Hay un protocolo de transición que protege la adaptación acumulada.

### 8.1 Reglas de transición

```
HARD RULE: El sistema lee training_cycles.week_number para determinar
           en qué punto del ciclo actual está el usuario al cambiar goal.

Caso A — Cambio en primera mitad del bloque actual
  (week_number dentro del bloque actual <= semanas_bloque / 2):
  → Completar la semana actual y reiniciar con el nuevo goal
    desde el primer bloque. La adaptación acumulada es insuficiente
    para justificar continuar el bloque anterior.

Caso B — Cambio en segunda mitad del bloque actual
  (week_number dentro del bloque actual > semanas_bloque / 2):
  → Completar el bloque actual hasta su deload programado.
  → Después del deload, iniciar el primer bloque del nuevo goal.
  → El deload del bloque anterior sirve como deload de transición.
```

### 8.2 Matriz de compatibilidad de transiciones

Indica si el cambio entre dos objetivos requiere un período de transición especial o si es directo.

| Desde \ Hacia | `hipertrofia` | `fuerza` | `potencia` | `salud` | `perdida_grasa` |
|---|---|---|---|---|---|
| `hipertrofia` | — | Directa | Directa | Directa | Directa |
| `fuerza` | Directa | — | Directa | 1 sem transición ligera | Directa |
| `potencia` | Directa | Directa | — | 1 sem transición ligera | Directa |
| `salud` | Directa | 2 sem fuerza_base primero | 2 sem fuerza_base primero | — | Directa |
| `perdida_grasa` | Directa | 1 sem transición | Directa | Directa | — |

```
SOFT RULE: Las transiciones marcadas como "1–2 sem transición" o
           "fuerza_base primero" insertan un mini-bloque de adaptación
           antes del primer bloque del nuevo goal:
             → 1 sem transición: RPE 6–7, reps medias (8–10), MAV − 30%
             → 2 sem fuerza_base: parámetros de fuerza_base (sección 4.3)
           El sistema notifica al usuario que hay un período de adaptación
           antes de comenzar el nuevo objetivo completo.
```

---

## 9. Cambios de schema requeridos

### 9.1 Modificaciones a `training_cycles`

```sql
-- Reemplazar el CHECK actual de block_type con el nuevo catálogo completo
ALTER TABLE training_cycles DROP CONSTRAINT IF EXISTS training_cycles_block_type_check;

ALTER TABLE training_cycles ADD CONSTRAINT training_cycles_block_type_check
    CHECK (block_type IN (
        -- Hipertrofia
        'acumulacion_hiper',
        'intensificacion_hiper',
        -- Fuerza
        'acumulacion_fuerza',
        'intensificacion_fuerza',
        'realizacion_fuerza',
        -- Potencia
        'fuerza_base',
        'potencia_especifica',
        'pico_potencia',
        -- Salud
        'salud_general',
        -- Pérdida de grasa
        'densidad_alta',
        'preservacion_muscular',
        -- Universal
        'transicion',
        'deload'
    ));

-- Campo para registrar el goal al que pertenece este ciclo
ALTER TABLE training_cycles ADD COLUMN IF NOT EXISTS
    goal VARCHAR(20) CHECK (goal IN (
        'hipertrofia', 'fuerza', 'potencia', 'salud', 'perdida_grasa'
    ));

-- Validación de compatibilidad goal-block_type
-- Implementar como trigger o en capa de negocio:
-- Un ciclo con goal='salud' NO puede tener block_type='realizacion_fuerza'
```

### 9.2 Modificaciones a `user_profiles`

```sql
-- El campo goal ya existe según zyfit_training_standards.md
-- Verificar que el CHECK incluya los cinco valores correctos:
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_goal_check;

ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_goal_check
    CHECK (goal IN (
        'hipertrofia', 'fuerza', 'potencia', 'salud', 'perdida_grasa'
    ));

-- Campo de seguimiento de cambios de objetivo
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
    goal_changed_at TIMESTAMPTZ;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
    previous_goal VARCHAR(20) CHECK (previous_goal IN (
        'hipertrofia', 'fuerza', 'potencia', 'salud', 'perdida_grasa'
    ));
```

### 9.3 Nuevos triggers de deload

```sql
-- Ampliar el CHECK de deload_triggers para incluir los nuevos tipos
ALTER TABLE deload_triggers DROP CONSTRAINT IF EXISTS deload_triggers_trigger_type_check;

ALTER TABLE deload_triggers ADD CONSTRAINT deload_triggers_trigger_type_check
    CHECK (trigger_type IN (
        'programmatic_week4',       -- Deload programático universal
        'rpe_elevated',             -- RPE por encima del prescrito
        'doms_persistent',          -- DOMS sostenido
        'load_drop',                -- Caída de carga sin causa
        'sleep_deficit',            -- Déficit de sueño
        'strength_plateau_peak',    -- Plateau en bloque de realización (fuerza/potencia)
        'adherence_drop',           -- Caída de adherencia (salud)
        'caloric_deficit_fatigue'   -- Fatiga por déficit calórico severo (pérdida de grasa)
    ));
```

### 9.4 Vista de consulta rápida para el motor

```sql
-- Vista que el motor consultará para obtener los parámetros
-- de la sesión actual de un usuario
CREATE OR REPLACE VIEW v_user_current_session_params AS
SELECT
    up.user_id,
    up.goal,
    up.level,
    up.days_per_week,
    up.available_time_minutes,
    tc.block_type,
    tc.week_number,
    tc.is_deload,
    tc.next_session_is_deload,
    -- El motor usará block_type + goal para indexar la tabla de parámetros
    -- de la sección 4 de este documento
    CASE
        WHEN tc.is_deload = TRUE THEN 'deload'
        ELSE tc.block_type
    END AS effective_block_type
FROM user_profiles up
JOIN training_cycles tc
    ON up.user_id = tc.user_id
    AND tc.is_active = TRUE;
```

---

## Resumen de invariantes del sistema

Estas reglas aplican a todos los objetivos sin excepción. Son las últimas que el motor verifica antes de servir una sesión.

```
1. La carga NUNCA baja en un deload. Solo baja el volumen.

2. El RIR mínimo es 1 en ejercicios con error_risk >= 4,
   independientemente del objetivo o del bloque.

3. El volumen NUNCA supera el MRV del músculo en ningún objetivo.

4. En potencia_especifica y pico_potencia, el descanso NUNCA
   baja de 180 segundos.

5. En ejercicios de cargadas (clean, snatch, thruster, push press,
   kettlebell clean), el tempo concéntrico es siempre X.
   Sin excepción. Sin importar el objetivo.

6. El motor SIEMPRE lee training_cycles antes de generar una sesión.
   No infiere el bloque desde la fecha ni desde el historial de logs.

7. Los triggers de deload se registran SIEMPRE en deload_triggers,
   incluso si el usuario rechaza el deload sugerido.
   action_taken = 'ignored_by_user' en ese caso.
```

---

## Referencias científicas

- Pedrosa, G.F. et al. (2022). Partial Range of Motion Training Elicits Favorable Improvements in Muscular Adaptations When Carried out at Long Muscle Lengths. *European Journal of Sport Science.*
- Schoenfeld, B.J. et al. (2016). Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy. *Journal of Strength and Conditioning Research.*
- Haff, G.G. & Triplett, N.T. (2016). *Essentials of Strength Training and Conditioning*, 4th edition. NSCA.
- Williams, T.D. et al. (2017). Comparison of Periodization Models in Trained Powerlifters. *Journal of Strength and Conditioning Research.*
- Colquhoun, R.J. et al. (2018). Training Volume, Not Frequency, Indicative of Maximal Strength Adaptations to Resistance Training. *Journal of Strength and Conditioning Research.*
- Helms, E.R. et al. (2014). Recommendations for Natural Bodybuilding Contest Preparation. *Journal of Sports Medicine and Physical Fitness.*
- Israetel, M. et al. (2019). *Scientific Principles of Strength Training.* Renaissance Periodization.
- Vitale, K.C. et al. (2019). Sleep Hygiene for Optimizing Recovery in Athletes. *International Journal of Sports Medicine.*

---

*Zyfit · Dirección de Investigación en Ciencias del Deporte · Versión 2.0 · Mayo 2026*  
*Este documento reemplaza la Sección 6 y Sección 7 de `zyfit_training_standards.md`*
