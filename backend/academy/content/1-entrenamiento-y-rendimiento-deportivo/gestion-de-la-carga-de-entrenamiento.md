# Gestión de la Carga de Entrenamiento

## Instrucciones para Claude Code

**Convención de parseo:** el símbolo ✓ al final de una opción marca la respuesta correcta — el seed la parsea y la guarda en `respuestas_correctas`. No modificar esta convención.

**Convención de placeholders:** usar `[PLACEHOLDER: ...]` únicamente en dos casos:
1. Campos de media no producida todavía (`video_url`, `audio_url`).
2. Cifras o datos que requieren verificación contra la fuente primaria antes de publicar. No inventar cifras nuevas fuera de la lista de evidencia.

**Instrucción general — "extiende la base de texto":** cada lección tipo `texto` de este documento es una base de 150-300 palabras, no la lección final. Al extenderla:
- Desarrollar cada punto a 600-900 palabras totales por lección.
- Mantener cada cifra, porcentaje y atribución autor-año EXACTAMENTE como aparece en este documento o en la lista de fuentes al final.
- El marco MEV/MAV/MRV (Módulo 2) es una herramienta de programación práctica (popularizada por la comunidad de Renaissance Periodization), NO un hallazgo directo de un estudio específico — dejar claro que los rangos numéricos (ej. "10-20 sets") se apoyan en la evidencia de dosis-respuesta citada, pero el marco MEV/MAV/MRV en sí es una heurística de aplicación, no un término que aparezca literalmente en los meta-análisis citados.
- Distinguir siempre entre evidencia citada y ejemplo ilustrativo propio.

**Instrucción general — "extiende las preguntas del quiz basado en...":** cada lección tipo `quiz` de este documento trae 2-3 preguntas base. Al extenderla a 5 preguntas:
- Añadir al menos 1 pregunta de comprensión aplicada usando un hallazgo cuantitativo específico de la lista de fuentes (tamaño de muestra, % de ganancia por set, rango de sets comparado).
- No construir preguntas sobre datos que no estén respaldados en la lista de fuentes.

**Instrucción general — lecciones tipo `video` y `audio`:** el campo de descripción de apoyo es el guion base, no el guion final. Mantener el mismo nivel de rigor que la lección de texto correspondiente.

---

## Módulo 1: Fundamentos de volumen e intensidad

### Lección 1 — Qué son volumen e intensidad en entrenamiento (tipo: texto)

Cuando hablamos de gestionar la carga de entrenamiento, casi todo se reduce a manipular dos variables centrales: el volumen y la intensidad. Entender qué significa cada una, y por qué no son intercambiables, es la base sobre la que se construye todo lo demás en este curso.

El **volumen** se refiere al número total de series y repeticiones realizadas — la cantidad de trabajo. En la práctica moderna, la unidad más útil para cuantificarlo es el número de series semanales por grupo muscular, porque es la métrica sobre la que la evidencia de dosis-respuesta se ha construido. La **intensidad** se refiere a la carga relativa: normalmente el porcentaje de una repetición máxima (%1RM) o la proximidad al fallo muscular, que hoy se expresa comúnmente con RIR (repeticiones en reserva) o RPE (percepción de esfuerzo).

El punto clave —y la razón por la que este módulo abre el curso— es que ninguna de las dos variables funciona de forma aislada. Levantar más pesado (subir intensidad) y hacer más series (subir volumen) son **dos palancas distintas**, no dos formas de decir lo mismo. La evidencia de dosis-respuesta se construye siempre analizando cómo cambia el resultado —hipertrofia o fuerza— al variar el volumen semanal, mientras se ajusta por intensidad y otras variables. Es decir: para poder afirmar que "más volumen produce más ganancia", los investigadores tienen que mantener controlada la intensidad, porque de otro modo no sabríamos cuál de las dos palancas produjo el efecto.

**La evidencia central.** El estudio de referencia para este principio es el meta-análisis de Schoenfeld, Ogborn y Krieger (2017, *Journal of Sports Sciences*). Reuniendo **15 estudios** que aportaron **34 grupos de tratamiento**, los autores encontraron una relación de **dosis-respuesta graduada**: cada set semanal adicional se asoció con un aumento del **0.37%** en la ganancia porcentual de hipertrofia. Dicho de otra forma, dentro del rango estudiado, más volumen semanal generalmente produjo más ganancia de masa muscular.

Es importante leer esa cifra con precisión. El 0.37% es un incremento **marginal por set** en la ganancia porcentual de hipertrofia, no un porcentaje de músculo ganado en términos absolutos. Es la pendiente de la relación: el músculo extra que, en promedio, se asocia con añadir una serie más a la semana. Ese matiz importa porque una relación de este tipo —una pendiente positiva— es exactamente lo que nos permite hablar de "dosis": hay una respuesta que escala con la dosis.

**Por qué esto no es toda la historia.** Sería tentador concluir que la receta es simplemente "hacer tantas series como sea posible". Pero como se verá en el Módulo 2, esa relación **no es lineal indefinidamente**. La pendiente positiva del 0.37% describe bien lo que pasa en el rango estudiado, no una promesa de que cada serie adicional rinda lo mismo para siempre. El propio Schoenfeld et al. (2017) observaron que volúmenes por encima de cierto umbral tuvieron un efecto mayor que volúmenes bajos —lo veremos con detalle más adelante—, y meta-análisis posteriores han caracterizado retornos decrecientes. Por ahora basta con fijar la idea fundacional: existe una relación real y medible entre cuánto volumen hace un atleta y cuánto se adapta.

**Cómo pensar la intensidad junto al volumen.** Un ejemplo ilustrativo propio, no un hallazgo de estudio: imagina dos sesiones que "cansan lo mismo". Una consiste en pocas series muy pesadas cerca del fallo; la otra, en más series con carga moderada y algo de RIR. Ambas pueden acumular fatiga parecida, pero distribuyen el estímulo de forma distinta. El volumen te dice cuánto trabajo total acumulaste; la intensidad, qué tan exigente fue cada repetición. Gestionar la carga es, en el fondo, decidir con intención cómo combinas esas dos palancas semana a semana — que es justamente el hilo conductor de los módulos siguientes.

**Serie efectiva.** Un concepto que conecta ambas variables es el de "serie efectiva": la idea de que una serie contribuye realmente al estímulo hipertrófico cuando se lleva a suficiente proximidad al fallo (bajo RIR). Esto vincula el conteo de volumen (cuántas series) con la intensidad de esfuerzo (qué tan cerca del fallo). [PLACEHOLDER: precisar el umbral operativo de RIR que define "serie efectiva" — verificar contra literatura de RIR/RPE antes de publicar]

En resumen: volumen e intensidad son las dos variables que gestionaremos durante todo el curso, están medidas de forma independiente en la investigación por buena razón, y la relación dosis-respuesta del volumen (Schoenfeld et al., 2017) es el punto de partida del que arranca todo lo demás.

### Lección 2 — Cómo se ven volumen e intensidad en un programa real (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: este video traduce los conceptos de la Lección 1 a algo tangible en pantalla. Se abre mostrando una tabla simple de un programa de entrenamiento con tres columnas visibles: series, repeticiones y %1RM. La narración señala cada columna y explica que representan dos palancas conceptualmente distintas — la cantidad de trabajo (series y repeticiones, es decir el volumen) frente a la exigencia relativa de cada repetición (%1RM y proximidad al fallo, es decir la intensidad).

El núcleo del video es demostrar visualmente que "más pesado" y "más series" **no son intercambiables**. Para ello se muestran dos versiones de la misma sesión sobre la tabla: en la primera se sube el %1RM manteniendo constantes las series; en la segunda se añaden series manteniendo constante el %1RM. La narración deja claro que ambos cambios modifican la carga total, pero por caminos distintos, y que confundirlos es el error conceptual más común al programar.

En este punto se ancla el hallazgo cuantitativo de Schoenfeld, Ogborn y Krieger (2017, *Journal of Sports Sciences*): sobre pantalla aparece la cifra de que cada set semanal adicional se asoció con un aumento del 0.37% en la ganancia porcentual de hipertrofia, dentro de un meta-análisis de 15 estudios y 34 grupos de tratamiento. La animación resalta que este dato proviene específicamente de variar el volumen semanal mientras se controla la intensidad — por eso podemos atribuirle el efecto al volumen y no a otra variable.

El cierre conecta con el resto del curso: mantener el mismo rigor que la lección de texto significa recordar al espectador que esa pendiente del 0.37% describe una relación dentro del rango estudiado, no una regla lineal sin límite, y que en el Módulo 2 veremos por qué. Se evita cualquier cifra que no esté respaldada en la lista de fuentes; los ejemplos de tabla se presentan explícitamente como ilustraciones de aplicación, no como datos extraídos de un estudio.

### Lección 3 — Por qué esto no es solo levantar más pesado (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: episodio en tono conversacional, pensado para escuchar en movimiento, cuyo objetivo es desmontar un mito muy arraigado — la idea de que "progresar" en el gimnasio significa exclusivamente subir el peso de la barra. El presentador arranca con la escena cotidiana del atleta que mide todo su progreso por cuánto carga en el press de banca, y que se frustra cuando ese número deja de subir cada semana.

A partir de ahí, el episodio introduce la idea central de la Lección 1: la intensidad (cuánto peso) es solo una de las dos palancas. La otra, el volumen —cuántas series semanales por grupo muscular—, es igual de importante y muchas veces subestimada. El presentador explica en lenguaje llano que la investigación ha medido específicamente el efecto de aumentar el volumen semanal, y aquí cita el hallazgo de Schoenfeld, Ogborn y Krieger (2017): en su meta-análisis de 15 estudios (34 grupos de tratamiento), cada set semanal adicional se asoció con un aumento del 0.37% en la ganancia porcentual de hipertrofia. La conversación aterriza esa cifra: no es magia ni marketing, es una relación de dosis-respuesta medida.

Para mantener el mismo rigor que la lección de texto, el presentador es explícito en dos aclaraciones. Primero, que ese 0.37% es un incremento marginal por serie dentro del rango estudiado, no una promesa de que puedas seguir sumando series eternamente con el mismo rendimiento — un adelanto honesto de los retornos decrecientes del Módulo 2. Segundo, que las anécdotas que usa (el atleta frustrado, el compañero que solo piensa en peso) son ejemplos ilustrativos para hacer el punto, no datos de estudios. El episodio cierra invitando a dejar de ver el volumen como un detalle secundario y a empezar a gestionarlo con la misma intención con la que se elige el peso.

### Lección 4 — Evaluación inicial (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
El volumen de entrenamiento se refiere principalmente a...
- [a] El peso levantado en una sola repetición
- [b] El número total de series/repeticiones realizadas ✓
- [c] La velocidad de ejecución del movimiento
- [d] El tiempo de descanso entre series

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
Según Schoenfeld, Ogborn y Krieger (2017), ¿qué relación se encontró entre volumen semanal e hipertrofia?
- [a] No existe ninguna relación
- [b] Una relación de dosis-respuesta graduada: más volumen, más ganancia (con matices) ✓
- [c] Más volumen siempre reduce la hipertrofia
- [d] Solo la intensidad importa, no el volumen

#### Pregunta 3 (tipo: verdadero_falso, puntos: 1)
El meta-análisis de Schoenfeld et al. (2017) encontró un aumento aproximado de 0.37% en ganancia de hipertrofia por cada set semanal adicional.
- [V] Verdadero ✓
- [F] Falso

#### Pregunta 4 (tipo: opcion_unica, puntos: 1)
El meta-análisis de Schoenfeld, Ogborn y Krieger (2017) que estableció la relación dosis-respuesta del volumen se construyó a partir de...
- [a] Un único estudio con pocos participantes
- [b] 15 estudios que aportaron 34 grupos de tratamiento ✓
- [c] Solo estudios en atletas de élite
- [d] Encuestas a entrenadores, sin datos de entrenamiento

#### Pregunta 5 (tipo: opcion_multiple, puntos: 2)
¿Cuáles de las siguientes afirmaciones sobre volumen e intensidad son correctas según lo visto en el Módulo 1?
- [a] Volumen e intensidad son dos palancas distintas, no intercambiables ✓
- [b] La intensidad se puede expresar como %1RM o proximidad al fallo (RIR/RPE) ✓
- [c] La relación dosis-respuesta del volumen se mide controlando la intensidad ✓
- [d] Subir peso es la única forma válida de progresar

---

## Módulo 2: El marco MEV/MAV/MRV

### Lección 1 — Qué son MEV, MAV y MRV (tipo: texto)

Antes de entrar en las definiciones, una advertencia que atraviesa todo este módulo: **el marco MEV/MAV/MRV es una heurística de programación práctica, no un hallazgo publicado en un meta-análisis.** Los tres términos fueron popularizados por la comunidad de Renaissance Periodization como una forma útil de organizar decisiones de volumen. Ninguno aparece literalmente en los estudios que citaremos. Lo que sí está respaldado por la evidencia es la **lógica** detrás del marco: que existe un umbral por debajo del cual el estímulo es insuficiente, y un techo por encima del cual añadir volumen deja de rendir. El marco simplemente le pone nombre a esas zonas.

**Las tres etiquetas.** MEV (Volumen Mínimo Efectivo) es la cantidad mínima de volumen semanal que produce adaptación apreciable. MAV (Volumen Máximo Adaptativo) es la zona donde el atleta obtiene la mejor relación entre estímulo y recuperación — donde "rinde más" el volumen. MRV (Volumen Máximo Recuperable) es el techo: el volumen máximo del que un atleta todavía puede recuperarse; por encima de él, el trabajo adicional acumula fatiga sin traducirse en más adaptación. Estas tres etiquetas describen zonas sobre la curva de dosis-respuesta, y por eso el marco se apoya —aunque no se derive literalmente— en la evidencia que sigue.

**La evidencia que respalda el "mínimo efectivo".** Schoenfeld et al. (2017) encontraron que volúmenes superiores a **9 sets semanales** por grupo muscular tuvieron un efecto mayor sobre la ganancia de masa muscular que volúmenes menores. Este dato es coherente con la idea de un mínimo efectivo: por debajo de cierto umbral, el estímulo es insuficiente para maximizar la respuesta. Conviene ser claro: el estudio no "define el MEV en 9 sets"; simplemente observa que superar ese volumen se asoció con más ganancia, y esa observación es la que da soporte empírico a la idea de un MEV.

**La evidencia de que la relación no es lineal para siempre.** Aquí entra el meta-análisis más reciente y amplio del curso: Pelland, Remmert, Robinson, Hinson y Zourdos (2024), con **67 estudios y 2,058 participantes**. Sus resultados matizan la historia de forma importante. Por un lado, confirman que el efecto del volumen sobre hipertrofia y fuerza es consistente: reportan una **probabilidad del 100% de que el efecto sea mayor que cero**. Por otro lado, ambos modelos de mejor ajuste muestran **retornos decrecientes** — es decir, cada set adicional rinde un poco menos que el anterior. Y un hallazgo especialmente relevante para programar: esos retornos decrecientes son **considerablemente más pronunciados para fuerza que para hipertrofia**. En su análisis, el incremento marginal fue de aproximadamente **0.24% de hipertrofia por set adicional**, evaluado en un volumen semanal fraccional promedio de **12.25 sets**.

Nótese cómo dialogan las dos cifras del curso: el 0.37% por set de Schoenfeld et al. (2017) y el 0.24% por set de Pelland et al. (2024) no se contradicen — describen la pendiente de la relación en cuerpos de evidencia distintos y, sobre todo, la de 2024 se estima justamente donde la curva ya empieza a aplanarse (alrededor de 12.25 sets). Esa es la firma de los retornos decrecientes: la pendiente marginal se hace más suave a medida que sube el volumen.

**La evidencia de qué pasa en el rango alto.** Para ubicar dónde empieza a acercarse el MRV es útil el trabajo de Baz-Valle et al. (2022, *Journal of Human Kinetics*), que compararon específicamente **volumen moderado (12-20 sets semanales)** contra **volumen alto (más de 20 sets semanales)**, evaluando si la relación dosis-respuesta se sostiene en ese rango superior. Este contraste es directamente relevante para el concepto de MRV: nos dice hasta qué punto seguir apilando series por encima de 20 semanales sigue valiendo la pena.

**Cómo encaja todo.** La lógica del marco queda así: por debajo del MEV el estímulo no alcanza (coherente con el umbral de >9 sets de Schoenfeld et al.); en el MAV se maximiza el retorno útil; y hacia el MRV los retornos decrecientes (Pelland et al., 2024) y las comparaciones de rango alto (Baz-Valle et al., 2022) explican por qué seguir añadiendo volumen deja de compensar. El marco es una capa de interpretación práctica **superpuesta** a esa curva de evidencia, no una clasificación que exista dentro de los estudios.

[PLACEHOLDER: agregar tabla de referencia con rangos numéricos sugeridos de MEV/MAV/MRV por nivel de entrenamiento — dejar explícito que son rangos de aplicación práctica, no cifras extraídas literalmente de un solo estudio]

### Lección 2 — Visualizando la curva de retornos decrecientes (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: el video construye sobre pantalla, trazo a trazo, la curva de dosis-respuesta del volumen de entrenamiento tal como la caracteriza el meta-análisis de Pelland, Remmert, Robinson, Hinson y Zourdos (2024). El eje horizontal representa el volumen semanal (sets por grupo muscular) y el eje vertical la ganancia (hipertrofia o fuerza). La animación dibuja primero una curva que sube con fuerza en volúmenes bajos y luego se va aplanando — la firma visual de los retornos decrecientes.

Sobre esa curva ya trazada, la narración superpone las tres etiquetas del marco: una zona baja marcada como MEV, una zona intermedia de mejor rendimiento marcada como MAV, y un techo marcado como MRV. En este punto el video es explícito, igual que la lección de texto: estas etiquetas son una **interpretación práctica superpuesta** a la curva, no una clasificación que aparezca en el estudio original. Las tres son heurísticas de aplicación popularizadas por la comunidad de Renaissance Periodization.

Para anclar el rigor cuantitativo, el video muestra sobre la curva los datos concretos de Pelland et al. (2024): 67 estudios, 2,058 participantes, una probabilidad del 100% de que el efecto del volumen sea mayor que cero, y un incremento marginal de aproximadamente 0.24% de hipertrofia por set adicional evaluado en un volumen semanal fraccional promedio de 12.25 sets. Una animación clave resalta que la pendiente de la curva es más suave en fuerza que en hipertrofia, ilustrando que los retornos decrecientes son considerablemente más pronunciados para fuerza. Se muestran dos curvas comparadas para hacer visible esa diferencia.

El cierre conecta con Baz-Valle et al. (2022), señalando en la zona alta de la curva el punto donde su comparación de 12-20 sets frente a más de 20 sets semanales es relevante para ubicar el acercamiento al MRV. El video mantiene el mismo estándar que el texto: ninguna cifra fuera de la lista de fuentes, y una aclaración clara de qué es evidencia medida y qué es etiqueta interpretativa.

### Lección 3 — Por qué "más no siempre es mejor" (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: episodio narrado alrededor de un caso concreto — un atleta ilustrativo (ejemplo propio, no un sujeto de estudio) que ha interiorizado la mitad de la verdad. Aprendió en el Módulo 1 que más volumen se asocia con más ganancia, y concluyó que la solución a cualquier estancamiento es simplemente añadir más y más series. Cada semana suma volumen convencido de que eso le garantiza más resultado. El episodio sigue su historia hasta el punto en que empieza a acumular fatiga, su recuperación se resiente y, paradójicamente, deja de progresar.

La narración usa ese caso para explicar el concepto central del módulo: los **retornos decrecientes**. Aquí el presentador introduce con precisión el meta-análisis de Pelland, Remmert, Robinson, Hinson y Zourdos (2024) —67 estudios y 2,058 participantes—, explicando que aunque el efecto del volumen es consistente (probabilidad del 100% de que sea mayor que cero), ambos modelos de mejor ajuste muestran que cada set adicional rinde progresivamente menos. El presentador aterriza el punto con la cifra del estudio: un incremento marginal de aproximadamente 0.24% de hipertrofia por set adicional, evaluado alrededor de 12.25 sets semanales — precisamente donde la curva ya se está aplanando.

Un giro importante del episodio, para mantener el rigor de la lección de texto, es explicar que los retornos decrecientes son considerablemente más pronunciados para fuerza que para hipertrofia (Pelland et al., 2024). Esto significa que el atleta del caso podría estar exprimiendo aún algo de hipertrofia con volúmenes altos, pero muy poco extra en fuerza — un matiz que cambia cómo se debería tomar la decisión. El presentador conecta esto con la lógica del MRV: hay un techo de volumen recuperable, y superarlo no compra más adaptación, solo más fatiga. Cierra recordando que el marco MEV/MAV/MRV es una heurística de aplicación, no un hallazgo de estudio, y que el caso del atleta es un ejemplo ilustrativo para hacer visible el principio.

### Lección 4 — Evaluación del marco MEV/MAV/MRV (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
El marco MEV/MAV/MRV es...
- [a] Un hallazgo directo publicado en un meta-análisis
- [b] Una heurística de programación práctica apoyada en evidencia de dosis-respuesta ✓
- [c] Un protocolo exclusivo para atletas de élite
- [d] Un sistema que reemplaza la necesidad de medir volumen

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
Según Pelland et al. (2024), los retornos decrecientes del volumen de entrenamiento son más pronunciados en...
- [a] Hipertrofia que en fuerza
- [b] Fuerza que en hipertrofia ✓
- [c] Ninguna de las dos variables muestra retornos decrecientes
- [d] Solo se observan en atletas principiantes

#### Pregunta 3 (tipo: verdadero_falso, puntos: 1)
Baz-Valle et al. (2022) compararon específicamente volumen de 12-20 sets semanales contra más de 20 sets semanales.
- [V] Verdadero ✓
- [F] Falso

#### Pregunta 4 (tipo: opcion_unica, puntos: 1)
El meta-análisis de Pelland et al. (2024) que caracterizó los retornos decrecientes del volumen se basó en...
- [a] 15 estudios y 34 grupos de tratamiento
- [b] 67 estudios y 2,058 participantes ✓
- [c] Un solo estudio con 12 participantes
- [d] Datos de encuestas sin entrenamiento supervisado

#### Pregunta 5 (tipo: opcion_unica, puntos: 1)
En el análisis de Pelland et al. (2024), el incremento marginal reportado fue de aproximadamente 0.24% de hipertrofia por set adicional, evaluado en un volumen semanal fraccional promedio de...
- [a] 9 sets
- [b] 12.25 sets ✓
- [c] 20 sets
- [d] 34 sets

---

## Módulo 3: Progresión de carga semana a semana

### Lección 1 — Cómo progresar el volumen dentro de un mesociclo (tipo: texto)

Con las bases puestas —qué son volumen e intensidad (Módulo 1) y cómo ubicar al atleta en el marco MEV/MAV/MRV (Módulo 2)—, este módulo responde a una pregunta muy práctica: ¿cómo se mueve el volumen a lo largo de las semanas de un mesociclo? La respuesta corta es que la carga se progresa **deliberadamente**, no al azar: se empieza cerca del MEV al inicio del mesociclo, se escala hacia el MAV en el grueso del bloque, y solo en semanas específicas se roza el MRV antes de una descarga (deload, cubierto en el Curso 3 de esta escuela).

**Por qué empezar bajo y escalar.** Esta estructura no es arbitraria: se apoya en el mismo principio de dosis-respuesta que hemos venido citando. Schoenfeld et al. (2017) y Pelland et al. (2024) coinciden en que el volumen adicional generalmente produce más adaptación —con retornos decrecientes—. Si esa relación es real, entonces empezar el mesociclo ya cerca del techo sería un error estratégico: no te dejaría a dónde subir. Empezar en volúmenes más bajos, en cambio, **deja margen para escalar** semana a semana, lo que permite ir aumentando el estímulo de forma sostenida en lugar de agotar todo el potencial de progresión en la primera semana.

Piénsalo así: si el volumen es una palanca que produce adaptación, quieres poder tirar de esa palanca **progresivamente** durante todo el bloque. Un atleta que arranca en su MEV tiene varias semanas de aumentos por delante antes de acercarse al MRV. Un atleta que arranca cerca del MRV no tiene esa pista de despegue — se queda sin margen y, además, entra antes en la zona de retornos decrecientes que Pelland et al. (2024) documentaron, donde cada set adicional rinde menos.

**Cómo se ve la progresión.** La forma más común de progresar el volumen es añadir series a los ejercicios clave a medida que avanzan las semanas, manteniendo la intensidad relativa en un rango manejable para que el aumento de volumen sea recuperable. La intensidad y el volumen se coordinan: no se maximizan ambos a la vez, porque eso llevaría al atleta al techo demasiado rápido. La lógica del marco del Módulo 2 sirve de mapa — sabes en qué zona estás y hacia dónde te mueves.

**Un ejemplo ilustrativo de aplicación** (no un hallazgo de estudio): un mesociclo de cuatro semanas podría empezar la Semana 1 en la parte baja del rango de volumen del atleta, cerca de su MEV, para establecer una base recuperable. La Semana 2 y la Semana 3 añaden series progresivamente, moviéndose hacia el MAV, que es donde el volumen rinde mejor. La Semana 4 puede acercarse al MRV —el punto de mayor volumen del bloque— justo antes de la descarga que sigue. Este patrón "de menos a más" es la aplicación directa del principio de dosis-respuesta con margen de progresión, pero conviene subrayar que las semanas concretas y la cantidad exacta de series son un ejemplo de aplicación del principio, no cifras extraídas de ninguno de los estudios citados.

**El vínculo con los retornos decrecientes.** Hay una razón adicional para reservar el volumen más alto para el final del bloque. Como los retornos decrecientes son considerablemente más pronunciados para fuerza que para hipertrofia (Pelland et al., 2024), un atleta que busca sobre todo fuerza gana relativamente poco al operar de forma sostenida en volúmenes muy altos; tiene más sentido pasar la mayor parte del bloque en el MAV y solo puntualmente empujar hacia el MRV. Un atleta orientado a hipertrofia puede tolerar mejor volúmenes altos porque su curva se aplana más despacio. En ambos casos, la progresión ordenada semana a semana permite recoger el beneficio del volumen sin pagar de más en fatiga.

[PLACEHOLDER: agregar ejemplo de progresión de 4 semanas con series por sesión — dejar explícito que es un ejemplo ilustrativo de aplicación del principio, no un hallazgo de estudio]

En síntesis: progresar el volumen dentro de un mesociclo es moverse con intención desde el MEV hacia el MAV y, puntualmente, hacia el MRV — una estrategia que se justifica directamente por la evidencia de dosis-respuesta con retornos decrecientes vista en los módulos anteriores.

### Lección 2 — Un mesociclo progresando en pantalla (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: el video muestra en pantalla un calendario de cuatro semanas y anima, semana a semana, cómo sube el volumen de entrenamiento. La Semana 1 aparece con un volumen bajo, cercano al MEV; las Semanas 2 y 3 van añadiendo series de forma visible, moviéndose hacia el MAV; la Semana 4 muestra el pico de volumen del bloque, acercándose al MRV, justo antes de indicar en pantalla que le seguiría una descarga (deload, cubierto en el Curso 3 de esta escuela).

El recurso visual central es una conexión en vivo entre ese calendario y la **curva de dosis-respuesta del Módulo 2**. A medida que cada semana sube su volumen, un marcador se desplaza sobre la curva de Pelland et al. (2024), mostrando cómo el atleta recorre la pendiente desde la zona baja hacia la zona donde los retornos empiezan a decrecer. Esto hace tangible por qué se empieza bajo y se escala: el marcador tiene "pista" para avanzar en lugar de arrancar ya en la parte plana de la curva.

La narración mantiene el rigor de la lección de texto anclando el porqué en la evidencia: Schoenfeld et al. (2017) y Pelland et al. (2024) coinciden en que el volumen adicional generalmente produce más adaptación con retornos decrecientes, y de ahí se deduce la conveniencia de dejar margen para escalar. El video es explícito en que el calendario de cuatro semanas con series concretas es un **ejemplo ilustrativo de aplicación** del principio, no una prescripción extraída de un estudio, y en que las etiquetas MEV/MAV/MRV son heurísticas superpuestas a la curva. No se introduce ninguna cifra fuera de la lista de fuentes.

### Lección 3 — Progresar sin perder el control (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: episodio en tono práctico centrado en una distinción que marca la diferencia entre atletas que progresan de forma sostenible y los que no: **progresar con intención frente a progresar de forma reactiva**. El presentador describe primero la versión improvisada — el atleta que cada sesión decide sobre la marcha si añade series o peso según cómo se siente ese día, sin un plan de bloque. Suena flexible, pero en la práctica lleva a saltos erráticos: semanas de muy poco y semanas de demasiado, sin una trayectoria clara.

Frente a eso, el episodio propone la progresión intencional descrita en la lección de texto: empezar el mesociclo cerca del MEV y escalar deliberadamente, semana a semana, hacia el MAV, reservando el acercamiento al MRV para semanas específicas antes de una descarga. El presentador explica por qué este orden tiene respaldo en la evidencia: dado que el volumen adicional generalmente produce más adaptación con retornos decrecientes (Schoenfeld et al., 2017; Pelland et al., 2024), tiene sentido dejar margen para escalar en lugar de gastar todo el potencial de progresión de golpe.

Para conservar el rigor de la lección de texto, el presentador insiste en dos ideas. Primera: "con intención" no significa rígido — significa tener un plan de trayectoria del volumen que luego se ajusta según señales (lo que abre el Módulo 4), no reaccionar sin mapa. Segunda: los ejemplos concretos que menciona sobre cómo repartir las series a lo largo de las semanas son ilustraciones de aplicación del principio, no cifras de estudios. El episodio cierra con la imagen de la progresión como una pista de despegue: cuanto mejor la planifiques desde el MEV, más recorrido útil tendrás antes de tocar el techo.

### Lección 4 — Evaluación de progresión de carga (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
Una progresión de carga bien diseñada dentro de un mesociclo debería...
- [a] Empezar cerca del MRV y bajar
- [b] Empezar cerca del MEV y escalar progresivamente hacia el MAV/MRV ✓
- [c] Mantener siempre el mismo volumen
- [d] Ignorar el volumen y solo variar la intensidad

#### Pregunta 2 (tipo: verdadero_falso, puntos: 1)
Dado que el volumen adicional generalmente produce más adaptación (con retornos decrecientes), tiene sentido dejar margen para escalar en vez de empezar cerca del techo.
- [V] Verdadero ✓
- [F] Falso

#### Pregunta 3 (tipo: opcion_unica, puntos: 1)
¿Por qué conviene reservar el volumen más alto del mesociclo para las semanas finales, antes de una descarga?
- [a] Porque empezar cerca del techo no deja margen para escalar y adelanta la zona de retornos decrecientes ✓
- [b] Porque el volumen no tiene ningún efecto sobre la adaptación
- [c] Porque la intensidad debe bajarse cada semana
- [d] Porque el atleta debe entrenar siempre al MRV desde el día uno

#### Pregunta 4 (tipo: verdadero_falso, puntos: 1)
Dado que los retornos decrecientes son considerablemente más pronunciados para fuerza que para hipertrofia (Pelland et al., 2024), un atleta orientado a fuerza gana relativamente poco al operar de forma sostenida en volúmenes muy altos.
- [V] Verdadero ✓
- [F] Falso

#### Pregunta 5 (tipo: opcion_unica, puntos: 1)
Progresar la carga "con intención" en lugar de "de forma reactiva" significa...
- [a] Decidir cada día al azar si subir series o peso, sin un plan de bloque
- [b] Tener un plan de trayectoria del volumen que luego se ajusta según señales del atleta ✓
- [c] Mantener el volumen fijo e ignorar la respuesta del atleta
- [d] Maximizar volumen e intensidad a la vez desde la primera semana

---

## Módulo 4: Señales para escalar o retroceder carga

### Lección 1 — Qué mirar antes de subir o bajar volumen (tipo: texto)

Los módulos anteriores diseñaron el plan: dónde empezar (MEV), hacia dónde ir (MAV/MRV) y cómo escalar semana a semana. Pero un plan sobre papel no es la realidad del atleta. Este módulo trata de la última pieza de la gestión de carga: **leer las señales reales de respuesta** para decidir si el atleta escala como estaba previsto o si conviene retroceder. La regla central es que escalar o retroceder la carga **no debería depender solo del calendario del mesociclo** — debe responder a cómo está respondiendo el atleta de verdad.

**Qué señales mirar.** Hay tres familias de señales especialmente informativas. Primera, la **calidad de ejecución técnica**: cuando la técnica de un atleta se degrada bajo la carga prescrita —el patrón de movimiento se rompe, aparecen compensaciones—, es una señal de que la carga puede estar superando su capacidad actual de recuperación. Segunda, la **percepción de esfuerzo (RPE) en relación a la carga prescrita**: si una carga que normalmente se siente como un RPE moderado empieza a sentirse mucho más dura, algo en la recuperación no está siguiendo el ritmo del volumen. Tercera, la **capacidad de recuperación entre sesiones**: si el atleta llega a cada sesión arrastrando fatiga de la anterior, el volumen acumulado puede estar acercándose o superando el MRV.

**El vínculo con el Curso 1 (Recuperación y HRV).** Estas señales no viven aisladas: conectan directamente con lo visto en el Curso 1 de esta escuela (Recuperación y HRV). Una tendencia de HRV en descenso sostenido, junto con dificultad creciente para completar el volumen prescrito con buena técnica, son **señales combinadas** de que puede ser momento de retroceder antes de forzar el MRV. La palabra clave es "combinadas": una sola lectura baja de HRV un día concreto no significa gran cosa —hay ruido diario—, pero una tendencia descendente acompañada de peor técnica y RPE elevado apunta consistentemente en la misma dirección.

**Por qué esto encaja con el marco.** Todo lo anterior es coherente con la lógica del marco MEV/MAV/MRV y con los retornos decrecientes de Pelland et al. (2024). Si el atleta ya está en la parte plana de la curva —donde cada set adicional rinde poco— y además muestra señales de fatiga acumulada, insistir en escalar el volumen compra sobre todo fatiga, no adaptación. Retroceder en ese punto no es "perder progreso": es evitar sobrepasar el MRV y proteger la capacidad de seguir progresando en las semanas siguientes.

**Cómo tomar la decisión.** Un ejemplo ilustrativo propio (no un hallazgo de estudio): imagina que el plan marca subir series esta semana, pero el atleta llega con HRV en descenso sostenido, la técnica se le rompe en las últimas series y reporta un RPE claramente por encima de lo esperado para esa carga. El plan decía "escalar"; las señales dicen "el atleta no está recuperando". En ese conflicto, las señales ganan — porque el objetivo del marco nunca fue seguir el calendario a ciegas, sino aplicar el volumen que el atleta puede convertir en adaptación. A la inversa: si el atleta completa el volumen prescrito con buena técnica, RPE acorde y HRV estable, esas son señales de que hay margen para escalar como estaba previsto.

[PLACEHOLDER: agregar checklist accionable de 5 señales concretas de "escalar" vs. "retroceder" — verificar que cada señal esté conectada a un principio ya cubierto en el curso, no inventar criterios nuevos sin respaldo]

En resumen: la carga se ajusta leyendo señales reales —técnica, RPE relativo, recuperación entre sesiones y tendencia de HRV (Curso 1)— y no solo mirando el calendario. Estas señales le dan al marco MEV/MAV/MRV su carácter adaptativo: sin ellas, sería solo un plan estático; con ellas, se convierte en una gestión de carga que responde al atleta real.

### Lección 2 — Reconociendo las señales en la práctica (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: el video muestra en pantalla ejemplos visuales de **buena frente a mala calidad técnica bajo fatiga**, para entrenar el ojo del espectador a reconocer una de las señales clave de la lección de texto. Se ven repeticiones limpias, con patrón de movimiento estable, contrastadas con repeticiones donde la técnica se degrada bajo carga — aparecen compensaciones, el patrón se rompe. La narración explica que esa degradación técnica bajo la carga prescrita es una señal de que el atleta puede estar superando su capacidad actual de recuperación.

A partir de esa señal visual, el video conecta las tres familias de señales de la lección de texto: calidad de ejecución técnica, percepción de esfuerzo (RPE) en relación a la carga prescrita, y capacidad de recuperación entre sesiones. La narración muestra cómo estas señales se leen en conjunto, no aisladas, y cómo se combinan con una tendencia de HRV en descenso sostenido (conectando con el Curso 1 de esta escuela, Recuperación y HRV) para informar la decisión de escalar o retroceder volumen.

El video mantiene el rigor de la lección de texto: enfatiza que una sola lectura aislada —un mal día de técnica o una lectura baja de HRV puntual— no basta para decidir, y que lo informativo es la tendencia combinada. También aclara que las decisiones no deben basarse únicamente en el calendario del mesociclo, sino en la respuesta real del atleta, y ubica todo esto dentro del marco MEV/MAV/MRV con retornos decrecientes (Pelland et al., 2024): si el atleta ya está en la parte plana de la curva y muestra fatiga acumulada, insistir en escalar compra fatiga, no adaptación. Los casos mostrados se presentan como ejemplos ilustrativos, no como datos de un estudio.

### Lección 3 — Aprender a escuchar la carga (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: episodio narrado en torno a un entrenador ajustando el plan de un atleta **en tiempo real** según señales de fatiga (caso ilustrativo, no un sujeto de estudio). El relato sigue una semana en la que el mesociclo marca escalar el volumen, pero el entrenador nota una acumulación de señales: la técnica del atleta se degrada en las últimas series, el RPE reportado está por encima de lo esperado para la carga prescrita, y —conectando con el Curso 1 de esta escuela, Recuperación y HRV— su HRV lleva varios días en descenso sostenido.

El episodio usa este caso para transmitir la idea central del módulo: escuchar la carga significa leer señales reales, no obedecer el calendario a ciegas. El presentador explica cómo el entrenador pondera esas señales combinadas y decide retroceder en lugar de forzar el acercamiento al MRV. Conecta la decisión con el marco MEV/MAV/MRV: si el atleta ya está en la parte plana de la curva de dosis-respuesta —donde los retornos decrecen (Pelland et al., 2024)— y además muestra fatiga acumulada, insistir en más volumen aportaría sobre todo fatiga, no adaptación.

Para mantener el rigor de la lección de texto, el presentador aclara dos puntos. Primero: retroceder no es fracasar ni "perder progreso" — es proteger la capacidad de seguir progresando, evitando sobrepasar el MRV. Segundo: una señal aislada no decide; lo que guía al entrenador es la convergencia de varias señales (técnica, RPE relativo, tendencia de HRV). El episodio cierra recordando que este es el paso que convierte el marco MEV/MAV/MRV en algo verdaderamente adaptativo, y que el caso narrado es un ejemplo ilustrativo de cómo aplicar los principios, no un resultado extraído de la evidencia citada.

### Lección 4 — Evaluación de señales de ajuste (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
¿Cuál de estas NO es una señal razonable para considerar retroceder el volumen de entrenamiento?
- [a] Caída sostenida de HRV
- [b] Dificultad creciente para mantener buena técnica bajo la carga prescrita
- [c] Haber completado exactamente el número de semanas planeadas, sin importar cómo responde el atleta ✓
- [d] Percepción de esfuerzo (RPE) más alta de lo esperado para la misma carga

#### Pregunta 2 (tipo: verdadero_falso, puntos: 1)
Las decisiones de escalar o retroceder carga deben basarse únicamente en el calendario del mesociclo, sin considerar señales individuales del atleta.
- [V] Verdadero
- [F] Falso ✓

#### Pregunta 3 (tipo: opcion_multiple, puntos: 2)
Según el Módulo 4, ¿cuáles de las siguientes son señales reales de respuesta que conviene leer antes de escalar o retroceder la carga?
- [a] La calidad de ejecución técnica bajo la carga prescrita ✓
- [b] La percepción de esfuerzo (RPE) en relación a la carga prescrita ✓
- [c] La capacidad de recuperación entre sesiones ✓
- [d] La marca del calendario, ignorando cómo responde el atleta

#### Pregunta 4 (tipo: verdadero_falso, puntos: 1)
Una tendencia de HRV en descenso sostenido, junto con dificultad creciente para completar el volumen prescrito con buena técnica, son señales combinadas de que puede ser momento de retroceder antes de forzar el MRV.
- [V] Verdadero ✓
- [F] Falso

#### Pregunta 5 (tipo: opcion_unica, puntos: 1)
Si un atleta ya está en la parte plana de la curva de dosis-respuesta (donde los retornos decrecen, según Pelland et al., 2024) y además muestra fatiga acumulada, insistir en escalar el volumen produce principalmente...
- [a] Más adaptación garantizada, sin costo
- [b] Sobre todo fatiga, no adaptación adicional ✓
- [c] Una mejora inmediata de la técnica
- [d] Un aumento seguro de la fuerza máxima

---

## Módulo 5: Casos prácticos de ajuste de carga

### Lección 1 — Integrando todo lo visto en el curso (tipo: texto)

Este módulo cierra el curso conectando los cuatro anteriores en un flujo de decisión único. La gestión de carga, vista de una sola pieza, tiene cuatro pasos encadenados: definir volumen e intensidad de base (Módulo 1), ubicar al atleta dentro del marco MEV/MAV/MRV (Módulo 2), diseñar la progresión semanal desde el MEV hacia el MAV/MRV (Módulo 3), y ajustar según señales reales de respuesta —técnica, RPE relativo, recuperación entre sesiones y tendencia de HRV— (Módulo 4). Ninguno de los pasos funciona solo; juntos forman una gestión de carga coherente y adaptativa.

**El hilo de evidencia que une todo.** Vale la pena recordar por qué el flujo tiene esta forma. Existe una relación de dosis-respuesta real entre volumen y adaptación: Schoenfeld et al. (2017) la establecieron en un meta-análisis de 15 estudios (34 grupos de tratamiento), con un aumento del 0.37% en la ganancia porcentual de hipertrofia por set semanal adicional. Pero esa relación tiene retornos decrecientes: Pelland et al. (2024), con 67 estudios y 2,058 participantes, confirmaron el efecto (probabilidad del 100% de que sea mayor que cero) y mostraron que rinde progresivamente menos —de forma considerablemente más pronunciada para fuerza que para hipertrofia—, con un incremento marginal de aproximadamente 0.24% por set evaluado alrededor de 12.25 sets semanales. Y en el rango alto, Baz-Valle et al. (2022) compararon 12-20 sets frente a más de 20 sets semanales para ubicar dónde deja de compensar seguir subiendo. Esa evidencia justifica cada paso del flujo: por qué hay un mínimo efectivo, por qué se escala progresivamente, y por qué existe un techo (MRV) que conviene no sobrepasar.

**Recordatorio de marco.** El MEV/MAV/MRV que usamos para navegar todo esto es una heurística de programación práctica, no un hallazgo literal de los meta-análisis. Le pone nombre a las zonas de una curva que sí está respaldada por la evidencia, y esa distinción se mantiene hasta el final del curso.

**Los casos prácticos.** Para cerrar, el objetivo es aplicar el flujo completo a atletas concretos. A continuación se desarrollarán casos ilustrativos —construidos como ejemplos de aplicación propios, no como hallazgos de estudios— que recorren los cuatro pasos de principio a fin:

- **Atleta principiante.** Se define volumen/intensidad de base, se ubica cerca de un MEV conservador (coherente con el umbral de >9 sets de Schoenfeld et al., 2017 como referencia de "mínimo efectivo"), se diseña una progresión suave desde ese punto, y se leen señales sencillas para decidir cuándo subir. El foco está en construir base recuperable sin acercarse al MRV.

- **Atleta intermedio.** Ya tolera más volumen, así que la ubicación en el marco sube y la progresión desde el MEV hacia el MAV tiene más recorrido. Aquí los retornos decrecientes (Pelland et al., 2024) empiezan a importar: se busca pasar la mayor parte del bloque en el MAV, donde el volumen rinde mejor, y solo puntualmente rozar el MRV antes de una descarga. Las señales del Módulo 4 guían los ajustes.

- **Atleta en bloque de acercamiento a competencia.** El caso más delicado: la lectura de señales (técnica, RPE relativo, tendencia de HRV del Curso 1) pesa más que el calendario, porque acumular fatiga cerca de la competencia es especialmente costoso. Se prioriza mantener el volumen recuperable y retroceder ante señales combinadas de fatiga, aceptando que en fuerza los retornos decrecientes son más pronunciados y no hay mucho que ganar apilando volumen en esta fase.

[PLACEHOLDER: desarrollar 2-3 casos prácticos completos (atleta principiante, atleta intermedio, atleta en bloque de acercamiento a competencia) aplicando el marco completo — construir como ejemplos ilustrativos propios, no como hallazgos de estudios]

La idea con la que debería quedarse el estudiante es que gestionar la carga no es aplicar una fórmula fija, sino recorrer con criterio este flujo de cuatro pasos, apoyándose en la evidencia de dosis-respuesta y ajustando siempre al atleta que tiene delante.

### Lección 2 — Caso práctico completo, paso a paso (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: el video recorre en pantalla un caso completo de principio a fin, integrando los cuatro módulos del curso en una sola narrativa visual (caso ilustrativo, no un sujeto de estudio). Arranca definiendo el volumen y la intensidad de base del atleta (Módulo 1), y luego lo ubica sobre la curva de dosis-respuesta identificando su MEV inicial (Módulo 2), recordando en pantalla que MEV/MAV/MRV son etiquetas heurísticas superpuestas a la curva y no términos de los estudios.

A continuación, el video muestra la progresión semanal: cómo el volumen escala desde ese MEV inicial hacia el MAV a lo largo del mesociclo (Módulo 3), con el marcador desplazándose por la curva. La justificación aparece en pantalla anclada a la evidencia: el volumen adicional generalmente produce más adaptación con retornos decrecientes (Schoenfeld et al., 2017; Pelland et al., 2024), por lo que empezar bajo deja margen para escalar.

El clímax del caso es la **decisión de ajuste** (Módulo 4). El video muestra al atleta llegando a una semana con señales de fatiga —técnica que se degrada, RPE por encima de lo esperado, HRV en descenso sostenido (conectando con el Curso 1, Recuperación y HRV)— y recorre en pantalla el razonamiento para decidir si retroceder o mantener carga en lugar de forzar el acercamiento al MRV. La conclusión visual refuerza que las señales pesan más que el calendario. El video mantiene el rigor del curso: todas las cifras que aparezcan provienen de la lista de fuentes, y el caso se etiqueta explícitamente como ejemplo ilustrativo de aplicación del marco completo.

### Lección 3 — Resumen conversacional del curso (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: episodio de cierre en tono conversacional que sintetiza los principios centrales del curso sin repetir literalmente el contenido de texto — el objetivo es dejar una síntesis aplicada, la versión "para llevar" de todo lo aprendido. El presentador reconstruye el hilo completo: gestionar la carga es manipular con intención dos palancas, volumen e intensidad (Módulo 1), sabiendo que existe una relación de dosis-respuesta real —Schoenfeld et al. (2017) la midieron en un aumento del 0.37% de hipertrofia por set semanal adicional— pero con retornos decrecientes, que Pelland et al. (2024) caracterizaron sobre 67 estudios y 2,058 participantes, más pronunciados para fuerza que para hipertrofia.

De ahí el presentador salta al marco MEV/MAV/MRV como el mapa práctico para navegar esa curva, recordando —fiel al rigor del curso— que es una heurística de aplicación, no un hallazgo de meta-análisis. Explica la progresión semana a semana como el arte de empezar cerca del MEV y escalar dejando margen (Módulo 3), y remata con la pieza que lo hace adaptativo: leer señales reales —técnica, RPE relativo, recuperación entre sesiones y tendencia de HRV— para decidir escalar o retroceder, en lugar de obedecer el calendario a ciegas (Módulo 4).

El cierre entrega la síntesis aplicada: no memorices un número mágico de series; aprende a ubicar al atleta en la curva, progresa con un plan y ajústalo escuchando cómo responde. El presentador subraya que ese criterio —y no una receta fija— es lo que el estudiante debería llevarse, y que cualquier ejemplo mencionado es ilustrativo, mientras que las cifras citadas provienen de la evidencia listada al final del curso.

### Lección 4 — Evaluación final del curso (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
El objetivo de este curso es que el estudiante pueda...
- [a] Memorizar cifras exactas de series por grupo muscular
- [b] Ubicar a un atleta dentro del marco MEV/MAV/MRV y ajustar la carga según evidencia y señales reales ✓
- [c] Ignorar el volumen y programar solo por intensidad
- [d] Aplicar siempre el mismo volumen sin importar el atleta

#### Pregunta 2 (tipo: verdadero_falso, puntos: 1)
Según la evidencia revisada en este curso, más volumen de entrenamiento siempre produce mejores resultados sin límite.
- [V] Verdadero
- [F] Falso ✓

#### Pregunta 3 (tipo: opcion_unica, puntos: 1)
¿Cuál es el orden correcto del flujo de gestión de carga integrado en el Módulo 5?
- [a] Ajustar por señales → progresión semanal → ubicar en MEV/MAV/MRV → definir volumen/intensidad de base
- [b] Definir volumen/intensidad de base → ubicar en MEV/MAV/MRV → diseñar progresión semanal → ajustar según señales reales ✓
- [c] Diseñar progresión semanal → definir volumen/intensidad de base → ajustar por señales → ubicar en MEV/MAV/MRV
- [d] Ubicar en MEV/MAV/MRV → ajustar por señales → definir volumen/intensidad de base → progresión semanal

#### Pregunta 4 (tipo: opcion_unica, puntos: 1)
Comparando los dos meta-análisis del curso, la pendiente marginal de hipertrofia por set adicional fue de 0.37% en Schoenfeld et al. (2017) y de aproximadamente 0.24% en Pelland et al. (2024). La mejor lectura de esta diferencia es que...
- [a] Los estudios se contradicen y uno de los dos está equivocado
- [b] Describen la pendiente en cuerpos de evidencia distintos, y la de 2024 se estima donde la curva ya se aplana (retornos decrecientes) ✓
- [c] El volumen no tiene ningún efecto sobre la hipertrofia
- [d] La cifra de 0.24% prueba que más volumen siempre es mejor

#### Pregunta 5 (tipo: verdadero_falso, puntos: 1)
El marco MEV/MAV/MRV es una heurística de programación práctica superpuesta a la curva de dosis-respuesta, y no una clasificación que aparezca literalmente en los meta-análisis citados.
- [V] Verdadero ✓
- [F] Falso

---

## Fuentes de evidencia de este curso

1. Schoenfeld, B.J., Ogborn, D., Krieger, J.W. (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis. *J Sports Sci*, 35(11):1073-1082.
2. Pelland, J., Remmert, J., Robinson, Z., Hinson, S., Zourdos, M. (2024). The Resistance Training Dose-Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gain. SportRxiv preprint. — https://sportrxiv.org/index.php/server/preprint/view/460
3. Baz-Valle, E., Balsalobre-Fernández, C., Alix-Fages, C., Santos-Concejero, J. (2022). A Systematic Review of The Effects of Different Resistance Training Volumes on Muscle Hypertrophy. *J Hum Kinet*, 81:199-210. — https://pmc.ncbi.nlm.nih.gov/articles/PMC8884877/
