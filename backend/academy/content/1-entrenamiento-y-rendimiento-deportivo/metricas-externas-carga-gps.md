# Métricas Externas de Carga: GPS y Análisis de Movimiento

## Instrucciones para Claude Code

Convención de parseo: el símbolo ✓ al final de una opción marca la respuesta correcta. No modificar esta convención.

Convención de contenido: este curso NO usa negritas, asteriscos, numerales ni ningún otro marcado tipo markdown dentro del cuerpo de lecciones, enunciados u opciones, porque el visor web (`academy-web`) renderiza `Lesson.contenido` como texto plano — solo respeta párrafos separados por línea en blanco. Mantener este criterio en cualquier edición futura del archivo.

Placeholders de `video_url`/`audio_url`: producción pendiente, formato `[PLACEHOLDER: descripción de lo que falta]`.

---

## Módulo 1: Qué mide bien el GPS y qué mide mal

### Lección 1 — La brecha de precisión entre métricas de GPS (tipo: texto)

Un cuerpo técnico celebra que la distancia total de un jugador subió esta semana, y reporta con la misma confianza que su carrera de alta velocidad bajó un 15 por ciento. Ambas cifras salen del mismo dispositivo GPS, pero no merecen el mismo nivel de confianza, y entender por qué es el punto de partida de este curso.

La validez del GPS varía mucho según qué métrica se mida. Para la distancia total y la velocidad pico, la evidencia muestra buena precisión y fiabilidad, con coeficientes de variación generalmente menores al 5 o 6 por ciento, dependiendo del dispositivo y la frecuencia de muestreo. Esto significa que, si se repite la misma medición varias veces, el resultado es consistente y el margen de error es pequeño.

Para métricas de mayor intensidad, como la carrera de alta velocidad, la carrera a muy alta velocidad, y sobre todo los cambios de dirección, la precisión cae de forma marcada. Distintos estudios han reportado coeficientes de variación de entre el 11 y el 32 por ciento para este tipo de métricas, un rango de error considerablemente mayor. Dispositivos de mayor frecuencia de muestreo, de 18 a 20 hercios, mejoran esto frente a los de 1 a 10 hercios de generaciones anteriores, pero la brecha de precisión entre métricas básicas y métricas de alta intensidad persiste incluso con la mejor tecnología disponible hoy.

La consecuencia práctica es directa: la cifra de carrera de alta velocidad que bajó un 15 por ciento en el caso del cuerpo técnico merece bastante más escepticismo que la distancia total, dado el margen de error típico de esa métrica específica. Esto no significa descartar el dato, significa calibrar cuánta confianza depositar en él antes de tomar una decisión basada solamente en ese número.

Vale la pena notar algo contraintuitivo que se repite en este curso: la métrica más atractiva para un cuerpo técnico, la de sprints y alta velocidad, suele ser precisamente la menos precisa del panel de datos disponible. Esto no vuelve inútil al GPS, pero sí exige tratar cada tipo de métrica según su nivel de error de medición real, no según qué tan llamativa resulte al mostrarla en una pantalla.

### Lección 2 — Precisión en línea recta frente a cambios de dirección (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — comparación visual de precisión de GPS en trayectos lineales vs. cambios de dirección]

El video compara la precisión del GPS en dos escenarios: un trayecto en línea recta, donde el dispositivo mide con buena consistencia la distancia y la velocidad alcanzada, y un escenario con cambios de dirección frecuentes en espacio reducido, donde el margen de error crece de forma notable por las limitaciones del algoritmo para seguir cambios bruscos de trayectoria.

Se muestra también cómo los dispositivos de mayor frecuencia de muestreo reducen parte de este problema respecto a generaciones anteriores del mismo tipo de tecnología, aunque sin eliminarlo del todo. El cierre conecta con la lección de texto: la jerarquía de precisión entre tipos de métrica se mantiene incluso cuando mejora la tecnología, solo cambia la magnitud del error.

### Lección 3 — La métrica más atractiva no siempre es la más precisa (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — episodio conversacional de 4 a 6 minutos]

Este episodio explora una paradoja común en el trabajo diario de un cuerpo técnico: la métrica que más entusiasmo genera al mostrarse en una pantalla, la de sprints y carrera de alta velocidad, suele ser justamente la que tiene mayor margen de error de medición. Se explica por qué ocurre esto, conectando con la brecha de precisión vista en la lección de texto, y se invita a tratar cada cifra del panel de GPS con el nivel de confianza que su tipo de métrica realmente merece.

### Lección 4 — Evaluación: precisión de las métricas de GPS (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
¿Qué tipo de métrica de GPS tiene mayor precisión y fiabilidad documentada?
- [a] Cambios de dirección frecuentes en espacio reducido
- [b] Distancia total y velocidad pico en trayectos relativamente lineales ✓
- [c] Carrera de alta velocidad en circuitos con muchos cambios de dirección
- [d] Todas las métricas de GPS tienen exactamente la misma precisión

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
¿Qué rango de coeficiente de variación se ha reportado para métricas de alta intensidad como la carrera de alta velocidad?
- [a] Menos del 1 por ciento
- [b] Entre el 11 y el 32 por ciento ✓
- [c] Exactamente 0 por ciento, son mediciones perfectas
- [d] Más del 90 por ciento, son datos inutilizables

#### Pregunta 3 (tipo: verdadero_falso, puntos: 1)
Los dispositivos de 18 a 20 hercios de frecuencia de muestreo eliminan por completo la brecha de precisión entre métricas básicas y de alta intensidad.
- [V] Verdadero
- [F] Falso ✓

#### Pregunta 4 (tipo: opcion_unica, puntos: 1)
¿Cómo debería leerse una caída del 15 por ciento en la carrera de alta velocidad de un jugador, según lo visto en este módulo?
- [a] Con la misma confianza absoluta que una caída equivalente en distancia total
- [b] Con más escepticismo que una cifra de distancia total, dado el mayor margen de error de medición típico de esa métrica específica ✓
- [c] Como un dato completamente inútil que debe ignorarse siempre
- [d] Como prueba definitiva de que el jugador bajó su rendimiento físico real

---

## Módulo 2: Umbrales absolutos vs. individualizados: un debate real y no resuelto

### Lección 1 — Por qué el mismo dato puede contar dos historias distintas (tipo: texto)

Dos estudios en rugby profesional llegaron a conclusiones opuestas sobre qué posición cubre más distancia de alta velocidad: uno usando un umbral absoluto de 20 kilómetros por hora para todos los jugadores, el otro usando un umbral individualizado del 51 por ciento de la velocidad máxima de cada jugador. Este módulo explica por qué esa discrepancia no es un error de medición, sino una diferencia metodológica real.

Un umbral absoluto de velocidad aplica el mismo corte a todos los jugadores, sin importar su velocidad máxima individual. Un umbral individualizado ajusta ese corte según el porcentaje de la velocidad máxima de cada jugador. Una revisión de alcance que mapeó la evidencia disponible sobre este tema encontró que ambos métodos pueden producir conclusiones sustancialmente distintas sobre las demandas de una posición o de un jugador. En el ejemplo de rugby citado, un método mostró diferencias marcadas entre posiciones y el otro no mostró diferencia alguna entre los mismos grupos, usando exactamente los mismos datos crudos de partido.

La evidencia sobre esto tiene dos caras. Por un lado, hay alta certeza en que la elección del método, absoluto o individualizado, puede cambiar la conclusión completa de un análisis, no solo el número exacto que resulta. Por otro lado, hay baja certeza, o directamente incertidumbre, sobre cuál de los dos métodos es el correcto de forma universal. La revisión concluye que ambos métodos no deben usarse de forma intercambiable, y que la elección depende del propósito específico del análisis: comparar entre jugadores de fitness muy distinto favorece individualizar el umbral, mientras que comparar contra un estándar de referencia fijo entre temporadas puede favorecer un umbral absoluto.

Esto tiene una consecuencia práctica directa. Comparar el dato de alta velocidad de un jugador con el de otro jugador de fitness muy distinto, usando el mismo umbral absoluto para ambos, puede llevar a conclusiones engañosas sobre quién corre más rápido en el partido. Un jugador con una velocidad máxima naturalmente más baja necesitará un esfuerzo relativo mucho mayor para superar un umbral absoluto fijo que un jugador más veloz, aunque ambos estén corriendo cerca de su límite personal.

Es importante no llevar esta idea al extremo opuesto. Los umbrales absolutos siguen siendo útiles y defendibles cuando el objetivo es comparar contra una referencia externa fija, como estándares publicados de la competición, o cuando no se dispone de datos confiables de velocidad máxima individual. No son el método equivocado en general, son el método equivocado específicamente para comparaciones entre individuos de fitness muy distinto.

### Lección 2 — El mismo jugador, dos umbrales, dos historias (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — ejemplo numérico de un jugador con umbral absoluto vs. individualizado]

El video muestra un ejemplo numérico simple: el mismo jugador, con los mismos datos de partido, puede aparecer con mucha o poca carrera de alta velocidad según qué umbral se use para definir "alta velocidad". Se representa visualmente cómo un jugador de velocidad máxima más baja queda sistemáticamente por debajo de un umbral absoluto, incluso cuando está corriendo cerca de su propio límite personal.

El cierre conecta con la idea central del módulo: la elección de umbral no es un detalle técnico menor, puede cambiar por completo la conclusión de un análisis de rendimiento.

### Lección 3 — Comparar peras con manzanas usando el mismo umbral (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — episodio conversacional de 4 a 6 minutos]

Este episodio explica, con ejemplos cotidianos, por qué comparar el dato de alta velocidad de un jugador con el de otro jugador de fitness muy distinto, usando el mismo umbral absoluto para ambos, puede llevar a conclusiones engañosas sobre quién corre más rápido en el partido. El episodio no propone abandonar los umbrales absolutos, sino usarlos donde tienen sentido y reservar los umbrales individualizados para comparaciones entre jugadores con capacidades físicas muy distintas.

### Lección 4 — Evaluación: umbrales absolutos vs. individualizados (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
¿Por qué dos estudios en rugby llegaron a conclusiones opuestas sobre qué posición cubre más distancia de alta velocidad?
- [a] Porque uno de los dos estudios usó datos falsos
- [b] Porque usaron métodos distintos de definir alta velocidad, umbral absoluto vs. individualizado, y esa elección metodológica puede cambiar la conclusión sustancialmente ✓
- [c] Porque el rugby no permite ningún tipo de análisis de GPS
- [d] Porque las posiciones de rugby no tienen ninguna diferencia real de demanda física

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
¿Cuándo es más defendible usar un umbral absoluto de velocidad en lugar de uno individualizado?
- [a] Nunca, los umbrales absolutos siempre son el método equivocado
- [b] Cuando se compara contra una referencia externa fija o no se dispone de datos confiables de velocidad máxima individual ✓
- [c] Solo cuando todos los jugadores tienen exactamente la misma velocidad máxima
- [d] Solo en deportes individuales, nunca en deportes de equipo

#### Pregunta 3 (tipo: verdadero_falso, puntos: 1)
La revisión de alcance citada en este módulo concluye que existe un único método, absoluto o individualizado, que es correcto en todos los contextos.
- [V] Verdadero
- [F] Falso ✓

#### Pregunta 4 (tipo: opcion_unica, puntos: 1)
Un jugador con velocidad máxima naturalmente más baja que sus compañeros, evaluado con un umbral absoluto fijo para todos, probablemente...
- [a] Aparecerá con más carrera de alta velocidad que jugadores más veloces
- [b] Quedará sistemáticamente por debajo del umbral aunque esté corriendo cerca de su propio límite personal ✓
- [c] Tendrá exactamente el mismo resultado que con un umbral individualizado
- [d] No podrá ser medido en absoluto por el dispositivo GPS

---

## Módulo 3: Qué hacer en la práctica: confiar en la métrica correcta para la pregunta correcta

### Lección 1 — Calibrar la confianza según la pregunta que se hace (tipo: texto)

Un preparador físico quiere usar el panel de GPS para responder dos preguntas distintas en la misma semana: si un jugador entrenó más volumen que la semana pasada, y si ese jugador es más rápido que su compañero de posición. Ambas preguntas requieren un nivel de confianza distinto en los datos disponibles, y confundir eso es una fuente común de decisiones mal fundamentadas.

Para preguntas de volumen y tendencia individual en el tiempo, como si un jugador entrenó más o menos que la semana pasada, la distancia total, la métrica más fiable de todo el panel, suele bastar y merece bastante confianza. Es la métrica con menor margen de error, y comparar la tendencia del mismo jugador contra su propio historial reduce aún más el riesgo de una lectura equivocada.

Para preguntas de comparación entre individuos con fitness distinto, como quién es más rápido o quién cubre más alta velocidad relativa, un umbral individualizado es más defendible que uno absoluto, por las razones vistas en el módulo anterior. Ignorar esto y comparar directamente cifras absolutas entre jugadores de capacidades físicas distintas puede llevar a conclusiones injustas sobre quién rinde más.

Para decisiones que dependan de cambios de dirección o sprints muy cortos en espacio reducido, la incertidumbre de medición vista en el módulo 1 debe pesar en la decisión. No conviene tratar esas cifras con la misma certeza que la distancia total, precisamente porque su margen de error documentado es mayor.

Este marco de decisión es razonable porque se deriva directamente de los hallazgos de los dos módulos anteriores, pero conviene ser honesto en que no es un protocolo único validado como sistema completo, sino un criterio de buena práctica para calibrar cuánto confiar en cada tipo de dato según la pregunta específica que se está respondiendo.

### Lección 2 — Un panel de GPS anotado por nivel de confianza (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — panel de GPS anotado con niveles de confianza por métrica]

El video muestra un panel de datos de GPS típico, anotado métrica por métrica, marcando cuáles merecen alta confianza para decisiones diarias, como la distancia total, y cuáles deben leerse con más cautela, como los cambios de dirección o la carrera de muy alta velocidad. El objetivo es dar una guía visual rápida que un cuerpo técnico pueda aplicar directamente sobre su propio panel de datos.

### Lección 3 — No es confiar o no confiar, es calibrar cuánto (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — episodio conversacional de 4 a 6 minutos]

Este episodio cierra la idea central del módulo: el mismo panel de datos de GPS puede usarse con niveles de confianza distintos según la pregunta que se le esté haciendo. No se trata de confiar o no confiar en el GPS como herramienta general, sino de calibrar cuánto confiar en cada métrica específica según lo que se necesita responder ese día.

### Lección 4 — Evaluación: calibrar la confianza en la práctica (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 2)
¿Qué combinación de decisiones es más consistente con la evidencia de este curso?
- [a] Confiar igual en todas las métricas de GPS para cualquier tipo de pregunta
- [b] Usar la distancia total con alta confianza para tendencia individual, usar umbrales individualizados al comparar entre jugadores de fitness distinto, y tratar las métricas de alta velocidad y cambios de dirección con más cautela dado su margen de error documentado ✓
- [c] Descartar por completo el uso de GPS en la toma de decisiones
- [d] Usar solo umbrales absolutos para todas las comparaciones, sin excepción

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
¿Qué métrica es más apropiada para responder si un jugador entrenó más volumen que la semana pasada?
- [a] La distancia total, comparada contra el propio historial del jugador ✓
- [b] Los cambios de dirección en espacio reducido
- [c] La carrera de muy alta velocidad exclusivamente
- [d] Ninguna métrica de GPS sirve para responder esa pregunta

---

## Módulo 4: Capstone: interpreta el panel de GPS de un equipo

### Lección 1 — El caso: el extremo veloz que "bajó el ritmo" (tipo: texto)

Un cuerpo técnico presenta datos de GPS de la última semana mostrando que un extremo veloz cubrió menos carrera de alta velocidad que un defensa central más lento, usando un umbral absoluto de 20 kilómetros por hora para ambos jugadores, y concluye que el extremo bajó el ritmo.

Antes de aceptar esa conclusión, conviene integrar lo visto en los tres módulos anteriores. Primero, la confianza relativa de esa métrica específica: la carrera de alta velocidad tiene un margen de error documentado considerablemente mayor que la distancia total, así que cualquier caída en esa cifra merece revisarse con cautela antes de sacar conclusiones firmes. Segundo, el problema de comparar jugadores de velocidad máxima muy distinta con un umbral absoluto: es probable que el umbral fijo de 20 kilómetros por hora no represente el mismo nivel de esfuerzo relativo para un extremo veloz que para un defensa central más lento, ya que el extremo necesita alcanzar una fracción menor de su propia velocidad máxima para cruzar ese umbral. Tercero, qué pregunta alternativa sería más defendible hacer con los mismos datos: en lugar de comparar cifras absolutas entre jugadores de perfiles físicos distintos, conviene revisar el dato con un umbral individualizado, expresado como porcentaje de la velocidad máxima de cada jugador, antes de concluir nada sobre un cambio real de rendimiento.

La lectura más consistente con la evidencia de los tres módulos es que la conclusión del cuerpo técnico es, como mínimo, prematura. La combinación de una métrica con más margen de error y una elección de umbral que puede no ser comparable entre jugadores de fitness distinto hace que "el extremo bajó el ritmo" sea, en el mejor de los casos, una hipótesis que todavía necesita revisarse con un umbral individualizado antes de tratarse como un hecho.

### Lección 2 — Evaluación integrada del capstone (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 2)
¿Cuál es la lectura más consistente con la evidencia de los tres módulos sobre esta conclusión del cuerpo técnico?
- [a] La conclusión es correcta y no requiere ningún matiz adicional
- [b] Es probable que el umbral absoluto de 20 kilómetros por hora no represente el mismo nivel de esfuerzo relativo para un extremo veloz que para un defensa central más lento, y un umbral individualizado daría una comparación más justa antes de concluir que el extremo bajó el ritmo ✓
- [c] La métrica de alta velocidad es siempre la más precisa disponible, así que la conclusión debe aceptarse sin cuestionamiento
- [d] No se puede sacar ninguna conclusión de ningún dato de GPS

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
¿Qué dos factores, combinados, hacen prematura la conclusión del cuerpo técnico?
- [a] El horario del partido y el clima
- [b] El mayor margen de error de la métrica de alta velocidad y el uso de un umbral absoluto entre jugadores de fitness distinto ✓
- [c] La cantidad de sustitutos disponibles ese partido
- [d] Ningún factor la hace prematura, la conclusión es sólida tal como está

---

## Fuentes de evidencia de este curso

1. Revisión de validez de GPS y LPS para medir distancias recorridas y propiedades mecánicas del sprint en deportes de equipo (2018, PMC).
2. Estudio de validez de GPS en deportes de equipo — coeficientes de variación de distancia total y velocidad pico frente a métricas de alta intensidad.
3. Clemente, F.M., Ramirez-Campillo, R., Beato, M., Moran, J., Kawczynski, A., Makar, P., Sarmento, H. & Afonso, J. (2023). Arbitrary absolute vs. individualized running speed thresholds in team sports: A scoping review with evidence gap map. Biology of Sport.
4. Cahill et al. — estudio en rugby profesional con conclusiones opuestas sobre demandas posicionales según el método de umbral usado.
