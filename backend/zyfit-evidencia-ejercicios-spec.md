# Spec: Sistema de Evidencia y Objetivo por Ejercicio — Zyfit

## Propósito
Extender la base de datos de ejercicios (220 actuales + nuevos por vacíos identificados) para que cada ejercicio tenga:
1. Una **puntuación de evidencia científica** (1-5).
2. Uno o más **tags de objetivo**: `rendimiento`, `hipertrofia`, `salud_general`.
3. Metadata de justificación breve (para mostrar en UI si se desea, y para trazabilidad del criterio usado).

Esto reemplaza el tratamiento plano actual (donde todos los ejercicios de un patrón pesan igual en el generador) por un sistema donde el generador puede filtrar/ponderar según el objetivo declarado por el usuario en su perfil (rendimiento deportivo, hipertrofia/estética, o salud general/mantenimiento).

---

## 1. Cambios de arquitectura (base de datos)

Agregar los siguientes campos al modelo de ejercicio existente:

```json
{
  "evidence_score": 1-5,          // integer, ver criterio en sección 2
  "evidence_rationale": "string", // 1 línea, justificación del score
  "goal_tags": ["rendimiento" | "hipertrofia" | "salud_general"], // array, no excluyente
  "goal_primary": "rendimiento" | "hipertrofia" | "salud_general", // tag dominante, para default de UI/generador
  "lengthened_bias": boolean,     // true si el ejercicio carga el músculo en posición alargada (relevante para hipertrofia)
  "injury_risk_profile": "bajo" | "moderado" | "alto" // perfil de seguridad relativo dentro de su patrón
}
```

Notas para la implementación:
- `evidence_score` y `goal_tags` deben ser editables manualmente desde el admin (no solo generados por IA), porque el criterio puede necesitar ajuste editorial con el tiempo.
- `goal_tags` es un array porque muchos ejercicios sirven para más de un objetivo (ej. sentadilla trasera es rendimiento + hipertrofia). `goal_primary` es el que el generador usa por defecto cuando no hay preferencia explícita del usuario.
- Mantener retrocompatibilidad: si estos campos están vacíos, el generador debe comportarse como hoy (sin romper rutinas existentes).

---

## 2. Criterio de `evidence_score` (1-5)

Score compuesto de 5 dimensiones (detalle metodológico completo ya está en el informe adjunto `zyfit-evidencia-ejercicios.md` — pasarlo también a Claude Code como contexto):
1. Activación EMG del músculo diana (peso bajo — usar con cautela, no es predictor fuerte por sí solo).
2. Transferencia a rendimiento/fuerza aplicada.
3. Evidencia de hipertrofia (estudios longitudinales).
4. Prevalencia en guías basadas en evidencia (ACSM, NSCA).
5. Perfil de seguridad articular relativo.

Escala:
- **5** — Evidencia fuerte y consistente en ≥4 de 5 dimensiones. Ejemplos: sentadilla trasera, peso muerto convencional, press banca, dominadas, hip thrust.
- **4** — Buena evidencia, con alguna limitación (nicho de aplicación, o evidencia moderada en 1 dimensión). Ejemplos: sentadilla búlgara, remo con mancuerna, elevaciones laterales.
- **3** — Evidencia moderada o de nicho técnico/poblacional. Ejemplos: good morning, sentadilla goblet, Copenhagen adduction.
- **2** — Evidencia limitada, uso complementario, o perfil riesgo/beneficio cuestionado. Ejemplos: sissy squat, Russian twist, frog pump.
- **1** — Evidencia escasa/contradictoria, ejercicio muy de nicho. Ejemplos: Jefferson curl, Z press, dragon flag.

---

## 3. Criterio de `goal_tags`

### `rendimiento`
Aplica cuando el ejercicio cumple ≥2 de:
- Es multiarticular con alta transferencia a fuerza/potencia/velocidad aplicada (sentadilla, peso muerto, press, dominadas, derivados olímpicos).
- Permite sobrecarga progresiva pesada de forma segura (barra libre, carga externa significativa).
- Tiene componente de velocidad/potencia (pliometría, derivados olímpicos, swings, sled push).
- Aparece en guías NSCA de preparación física/deportiva como ejercicio base.

Ejemplos: peso muerto convencional, sentadilla trasera, power clean, hip thrust con barra, dominadas lastradas, sled push, box jump.

### `hipertrofia`
Aplica cuando el ejercicio cumple ≥2 de:
- Aísla o enfatiza un grupo muscular específico con buen control de tensión mecánica.
- Tiene sesgo de longitud muscular (`lengthened_bias = true`): trabaja el músculo en posición alargada (RDL, curl inclinado, extensión de tríceps overhead, gemelo de pie, press banca con ROM completo).
- Es fácilmente escalable en volumen (múltiples series sin fatiga sistémica alta) — máquinas, poleas, mancuernas.
- Tiene evidencia directa de estudios de hipertrofia (no solo EMG agudo).

Ejemplos: curl de bíceps, extensión de cuádriceps, RDL, hip thrust, aperturas con mancuernas, elevación de talones de pie, remo en máquina con apoyo.

Nota: muchos ejercicios de `rendimiento` también son buenos para `hipertrofia` (ej. sentadilla trasera, press banca) — se tagean con ambos.

### `salud_general`
Aplica cuando el ejercicio cumple ≥2 de:
- Nivel técnico bajo (1-2/5) — accesible sin coaching intensivo.
- Perfil de seguridad articular bajo/moderado (`injury_risk_profile != "alto"`).
- Bajo requerimiento de equipo especializado o de movilidad extrema.
- Tiene valor de mantenimiento funcional, prevención de lesiones, o salud articular/postural (aunque no maximice hipertrofia ni rendimiento).
- Es apto para principiantes absolutos o personas con objetivos de longevidad/mantenimiento, no de rendimiento competitivo ni estética maximalista.

Ejemplos: sentadilla con peso corporal, plancha frontal, bird dog, face pull, movilidad de tobillo, farmer carry, remo invertido, wall slide, ejercicios de movilidad en general.

Nota: `salud_general` no es "categoría inferior" — es el tag correcto para usuarios cuyo objetivo declarado es simplemente entrenar de forma sostenible y saludable, no maximizar una métrica de rendimiento o estética. Ejercicios con `evidence_score` bajo (2) pueden tener `salud_general` como tag principal legítimo si son seguros y sostenibles, aunque no maximicen fuerza/hipertrofia.

### Regla de default cuando el ejercicio no calza claramente en ninguno
Si un ejercicio no cumple criterios claros para ningún tag (raro, pero puede pasar con ejercicios muy de nicho), asignar `salud_general` con `evidence_score` ≤ 2 por defecto, y marcarlo para revisión editorial manual.

---

## 4. Ejemplos de tagging ya resueltos (semilla para consistencia)

| Ejercicio | evidence_score | goal_tags | goal_primary | lengthened_bias | injury_risk_profile |
|---|---|---|---|---|---|
| Peso muerto convencional | 5 | rendimiento, hipertrofia | rendimiento | false | moderado |
| Peso muerto rumano (RDL) | 5 | hipertrofia, rendimiento | hipertrofia | true | bajo |
| Hip thrust con barra | 5 | hipertrofia, rendimiento | hipertrofia | false | bajo |
| Sentadilla trasera (high/low bar) | 5 | rendimiento, hipertrofia | rendimiento | false | moderado |
| Sentadilla búlgara (RFESS) | 4 | hipertrofia, salud_general | hipertrofia | false | bajo |
| Prensa de piernas | 4 | hipertrofia, salud_general | hipertrofia | false | bajo |
| Press banca plano (barra) | 5 | rendimiento, hipertrofia | rendimiento | false | moderado |
| Flexión de brazos | 4 | salud_general, hipertrofia | salud_general | false | bajo |
| Elevaciones laterales | 4 | hipertrofia | hipertrofia | true | bajo |
| Face pull | 4 | salud_general | salud_general | false | bajo |
| Dominadas (pull-up) | 5 | rendimiento, hipertrofia | rendimiento | false | bajo |
| Remo con apoyo en pecho | 4 | hipertrofia, salud_general | hipertrofia | false | bajo |
| Plancha frontal | 4 | salud_general | salud_general | false | bajo |
| Bird dog | 4 | salud_general | salud_general | false | bajo |
| Pallof press | 4 | salud_general | salud_general | false | bajo |
| Nordic curl | 4 | rendimiento, hipertrofia | rendimiento | false | moderado |
| Extensión de tríceps overhead | 3 | hipertrofia | hipertrofia | true | bajo |
| Elevación de talones de pie | 4 | hipertrofia | hipertrofia | true | bajo |
| Curl de bíceps (barra/mancuernas) | 3 | hipertrofia | hipertrofia | false | bajo |
| Sissy squat | 2 | hipertrofia | hipertrofia | true | moderado |
| Russian twist | 2 | salud_general | salud_general | false | moderado |
| Frog pump | 2 | salud_general | salud_general | false | bajo |
| Jefferson curl | 1 | hipertrofia | hipertrofia | true | alto |
| Z press | 2 | rendimiento | rendimiento | false | moderado |
| Sled push | 4 | rendimiento | rendimiento | false | bajo |
| Box jump | 4 | rendimiento | rendimiento | false | moderado |
| Farmer carry | 4 | salud_general, rendimiento | salud_general | false | bajo |
| Wall squat | 1 | salud_general | salud_general | false | bajo |
| Sentadilla con peso corporal | 1 | salud_general | salud_general | false | bajo |
| Remo invertido (Australian pull-up) | 3 | salud_general, hipertrofia | salud_general | false | bajo |

*(Tabla no exhaustiva — cubre los 220 + los nuevos ejercicios de gap-fill en el informe de evidencia adjunto. Claude Code debe usar este patrón para clasificar el resto siguiendo las reglas de la sección 3.)*

---

## 5. Cambios necesarios en el generador / prompts

1. **Perfil de usuario:** agregar campo `objetivo_principal` (rendimiento / hipertrofia / salud_general) si no existe ya explícitamente como tal (puede que ya exista con otro nombre — revisar Zyfit Score v2 y el sistema de perfiles).
2. **Filtro/ponderación en `generate_session`:** al seleccionar ejercicios por patrón de movimiento, priorizar los que coincidan con `goal_primary` del usuario, y usar `evidence_score` como segundo criterio de desempate/ranking dentro de esa selección — no como filtro excluyente (un ejercicio de score 2 sigue siendo válido si es el único disponible para cierto equipo/nivel).
3. **Prompt del chat coach:** cuando el usuario pregunte "¿por qué me recomendaste este ejercicio?", el prompt debe poder citar `evidence_rationale` y `goal_tags` de forma natural, no como texto plantilla pegado.
4. **Reglas de exclusión por seguridad:** si `injury_risk_profile = "alto"` y el perfil del usuario tiene flags de lesión/limitación articular relevante, excluir el ejercicio del pool antes de aplicar el resto de la lógica.
5. **Backfill:** correr un proceso (idealmente semi-automático con revisión humana, no solo LLM sin supervisión) que aplique esta clasificación a los 220 ejercicios existentes usando las reglas de la sección 3 y la tabla semilla de la sección 4 como referencia de calibración.
6. **Nuevos ejercicios de gap-fill:** el informe de evidencia adjunto (`zyfit-evidencia-ejercicios.md`) lista ~30 ejercicios sugeridos para llenar vacíos (derivados olímpicos, GHR, back extension, aductores, tibial anterior, antebrazo, cuello, pliometría). Deben entrar a la base ya con estos campos poblados desde el inicio, no como deuda técnica pendiente.

---

## 6. Qué NO hacer

- No usar `evidence_score` como único criterio de selección del generador (riesgo: rutinas repetitivas, solo los mismos 20 ejercicios de score 5 en todo el catálogo). Debe combinarse con variedad, equipo disponible, nivel técnico del usuario y patrón de movimiento requerido por la sesión.
- No tratar `salud_general` como "tier inferior" en la UI o en el copy del chat coach — es un objetivo legítimo, no un descarte de los otros dos.
- No sobre-automatizar el backfill sin revisión: los scores de evidencia tienen zonas grises (ver caveats del informe de evidencia) y conviene una pasada de revisión manual antes de producción, especialmente en los ejercicios con score 1-2 que quedarán poco recomendados por el generador.
