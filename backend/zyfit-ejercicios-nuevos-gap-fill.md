# Ejercicios Nuevos — Gap Fill (listos para importar)

Complemento del spec `zyfit-evidencia-ejercicios-spec.md`. Estos ~30 ejercicios cubren los vacíos identificados en el catálogo (derivados olímpicos, cadena posterior de rodilla, aductores, antebrazo, cuello, tibial anterior, pliometría, movilidad). Cada fila ya trae los campos nuevos (`evidence_score`, `goal_tags`, `goal_primary`, `lengthened_bias`, `injury_risk_profile`) poblados según los criterios del spec, para que Claude Code pueda importarlos directamente sin pasar por el proceso de backfill que sí aplica a los 220 existentes.

**Nota:** los scores/tags aquí son una primera pasada razonada, no infalible — igual conviene una revisión editorial rápida antes de producción, sobre todo en los de `injury_risk_profile: alto` (derivados olímpicos), que deberían quedar restringidos a usuarios de nivel avanzado en el generador.

---

## Bisagra / cadena posterior

| Ejercicio | Tipo | Dificultad | Nivel técnico | Músculos primarios | Equipo | evidence_score | goal_tags | goal_primary | lengthened_bias | injury_risk_profile |
|---|---|---|---|---|---|---|---|---|---|---|
| Glute-ham raise (GHR) | Compuesto | avanzado | 4/5 | Isquiotibiales, Glúteo mayor, Erector espinal | Banco GHD | 4 | rendimiento, hipertrofia | hipertrofia | true | moderado |
| Back extension 45° (Roman chair) | Compuesto | principiante | 2/5 | Erector espinal, Glúteo mayor, Isquiotibiales | Banco romano | 3 | salud_general, hipertrofia | salud_general | false | bajo |
| Reverse hyperextension | Compuesto | principiante | 2/5 | Glúteo mayor, Isquiotibiales, Erector espinal | Máquina/banco | 3 | salud_general, hipertrofia | salud_general | false | bajo |
| Peso muerto con trap bar (hex bar) | Compuesto | intermedio | 3/5 | Cuádriceps, Glúteo mayor, Isquiotibiales, Erector espinal | Trap bar | 4 | rendimiento, hipertrofia | rendimiento | false | bajo |

## Sentadilla

| Ejercicio | Tipo | Dificultad | Nivel técnico | Músculos primarios | Equipo | evidence_score | goal_tags | goal_primary | lengthened_bias | injury_risk_profile |
|---|---|---|---|---|---|---|---|---|---|---|
| Sentadilla con talón elevado (heel-elevated) | Compuesto | principiante | 2/5 | Cuádriceps | Barra/mancuernas + cuña | 3 | hipertrofia | hipertrofia | false | bajo |
| Sentadilla overhead | Compuesto | avanzado | 5/5 | Cuádriceps, Glúteo mayor, Core, Deltoides | Barra olímpica | 2 | rendimiento | rendimiento | false | alto |

## Empuje horizontal / vertical

| Ejercicio | Tipo | Dificultad | Nivel técnico | Músculos primarios | Equipo | evidence_score | goal_tags | goal_primary | lengthened_bias | injury_risk_profile |
|---|---|---|---|---|---|---|---|---|---|---|
| Press con mancuernas en suelo (floor press) | Compuesto | principiante | 2/5 | Pectoral, Tríceps | Mancuernas | 3 | hipertrofia, salud_general | salud_general | false | bajo |
| Press con banda (chest press banda) | Compuesto | principiante | 1/5 | Pectoral | Banda | 2 | salud_general | salud_general | false | bajo |
| Elevación lateral en polea (cable lateral raise) | Aislamiento | principiante | 1/5 | Deltoides lateral | Polea | 4 | hipertrofia | hipertrofia | true | bajo |
| Push jerk | Compuesto | avanzado | 5/5 | Deltoides, Tríceps, Cuádriceps | Barra | 3 | rendimiento | rendimiento | false | alto |

## Jalón horizontal

| Ejercicio | Tipo | Dificultad | Nivel técnico | Músculos primarios | Equipo | evidence_score | goal_tags | goal_primary | lengthened_bias | injury_risk_profile |
|---|---|---|---|---|---|---|---|---|---|---|
| Remo con landmine | Compuesto | intermedio | 3/5 | Dorsal ancho, Trapecio medio, Romboides | Landmine | 3 | hipertrofia, salud_general | hipertrofia | false | bajo |

## Core

| Ejercicio | Tipo | Dificultad | Nivel técnico | Músculos primarios | Equipo | evidence_score | goal_tags | goal_primary | lengthened_bias | injury_risk_profile |
|---|---|---|---|---|---|---|---|---|---|---|
| Ab wheel de pie (standing rollout) | Compuesto | avanzado | 5/5 | Recto abdominal, Transverso abdominal | Rueda | 3 | rendimiento, hipertrofia | hipertrofia | false | moderado |
| Copenhagen adduction (progresión con carga) | Compuesto | intermedio | 3/5 | Aductores, Oblicuo externo, Oblicuo interno | Banco | 3 | rendimiento, salud_general | salud_general | true | moderado |

## Aislamiento (grupos faltantes)

| Ejercicio | Tipo | Dificultad | Nivel técnico | Músculos primarios | Equipo | evidence_score | goal_tags | goal_primary | lengthened_bias | injury_risk_profile |
|---|---|---|---|---|---|---|---|---|---|---|
| Máquina de aductores (hip adduction machine) | Aislamiento | principiante | 1/5 | Aductores | Máquina | 3 | hipertrofia, salud_general | hipertrofia | false | bajo |
| Tibialis raise (tib raise) | Aislamiento | principiante | 1/5 | Tibial anterior | Peso corporal/tib bar | 3 | salud_general | salud_general | false | bajo |
| Wrist extension (extensión de muñeca) | Aislamiento | principiante | 1/5 | Extensores del antebrazo | Mancuerna | 2 | salud_general | salud_general | false | bajo |
| Grip/farmer hold específico | Aislamiento | principiante | 1/5 | Flexores del antebrazo, Agarre | Mancuernas | 3 | salud_general, rendimiento | salud_general | false | bajo |
| Flexo-extensión de cuello (neck flexion/extension) | Aislamiento | principiante | 2/5 | Flexores cervicales, Extensores cervicales | Arnés/banda | 3 | salud_general | salud_general | false | bajo |
| JM press / close-grip press | Compuesto | intermedio | 3/5 | Tríceps braquial | Barra | 3 | hipertrofia | hipertrofia | false | moderado |

## Locomoción / Cargada / Pliometría

| Ejercicio | Tipo | Dificultad | Nivel técnico | Músculos primarios | Equipo | evidence_score | goal_tags | goal_primary | lengthened_bias | injury_risk_profile |
|---|---|---|---|---|---|---|---|---|---|---|
| Power clean | Compuesto | avanzado | 5/5 | Glúteo mayor, Isquiotibiales, Trapecio, Cuádriceps | Barra olímpica | 4 | rendimiento | rendimiento | false | alto |
| Hang power clean | Compuesto | avanzado | 5/5 | Glúteo mayor, Isquiotibiales, Trapecio | Barra olímpica | 4 | rendimiento | rendimiento | false | alto |
| Power snatch | Compuesto | avanzado | 5/5 | Glúteo mayor, Isquiotibiales, Deltoides, Trapecio | Barra olímpica | 4 | rendimiento | rendimiento | false | alto |
| High pull (jalón alto explosivo) | Compuesto | intermedio | 4/5 | Trapecio, Deltoides, Glúteo mayor | Barra | 3 | rendimiento | rendimiento | false | moderado |
| Depth jump (salto de profundidad) | Compuesto | avanzado | 4/5 | Cuádriceps, Glúteo mayor, Gastrocnemio | Cajón | 4 | rendimiento | rendimiento | false | moderado |
| Broad jump (salto horizontal) | Compuesto | intermedio | 3/5 | Glúteo mayor, Isquiotibiales, Cuádriceps | Peso corporal | 4 | rendimiento | rendimiento | false | bajo |
| Medicine ball slam/throw | Compuesto | principiante | 2/5 | Core, Dorsal ancho, Deltoides | Balón medicinal | 3 | rendimiento, salud_general | rendimiento | false | bajo |
| Pogo hops / bounding | Compuesto | intermedio | 3/5 | Gastrocnemio, Sóleo | Peso corporal | 3 | rendimiento | rendimiento | false | bajo |

## Movilidad

| Ejercicio | Tipo | Dificultad | Nivel técnico | Músculos primarios | Equipo | evidence_score | goal_tags | goal_primary | lengthened_bias | injury_risk_profile |
|---|---|---|---|---|---|---|---|---|---|---|
| World's greatest stretch | Aislamiento | principiante | 1/5 | Cadera, Torácica, Isquiotibiales | Peso corporal | 3 | salud_general | salud_general | false | bajo |
| Cat-camel (gato-camello) | Aislamiento | principiante | 1/5 | Erector espinal, Columna | Peso corporal | 2 | salud_general | salud_general | false | bajo |
| Rotación torácica cuadrupedia | Aislamiento | principiante | 1/5 | Columna torácica | Peso corporal | 2 | salud_general | salud_general | false | bajo |

---

## Instrucción para Claude Code

1. Importar estas ~30 filas al catálogo con los campos ya poblados tal cual (no requieren backfill automático como los 220 existentes).
2. Los ejercicios con `injury_risk_profile: alto` (power clean, hang power clean, power snatch, push jerk, sentadilla overhead) deben quedar filtrados por defecto para usuarios de nivel `principiante` e `intermedio` en el generador — solo disponibles para `avanzado`, salvo que el usuario tenga historial de entrenamiento olímpico marcado en su perfil.
3. Verificar que no haya duplicados de nombre con el catálogo de 220 (algunos, como "Copenhagen adduction", ya existían como ejercicio de core en la base original — en ese caso, no crear un duplicado; en su lugar, actualizar el ejercicio existente para incluir la variante con carga progresiva y los nuevos campos de evidencia).
