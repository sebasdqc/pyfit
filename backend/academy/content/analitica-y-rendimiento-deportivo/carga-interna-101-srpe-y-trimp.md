# Carga Interna 101: sRPE y TRIMP

## Instrucciones para Claude Code

**Convención de parseo:** el símbolo ✓ al final de una opción marca la respuesta correcta — el seed la parsea y la guarda en `respuestas_correctas`. No modificar esta convención.

**Convención de placeholders:** usar `[PLACEHOLDER: ...]` únicamente en dos casos:
1. Campos de media no producida todavía (`video_url`, `audio_url`).
2. Cifras o datos que requieren verificación contra la fuente primaria antes de publicar. No inventar cifras nuevas fuera de la lista de evidencia.

**Instrucción general — "extiende la base de texto":** cada lección tipo `texto` de este documento es una base de 150-300 palabras, no la lección final. Al extenderla:
- Desarrollar cada punto a 600-900 palabras totales por lección.
- Mantener cada cifra, correlación (r) y atribución autor-año EXACTAMENTE como aparece en este documento o en la lista de fuentes al final.
- El Módulo 4 presenta un hallazgo importante: sRPE y TRIMP NO siempre correlacionan bien entre sí — la correlación depende del tipo de deporte/sesión (alta en sesiones continuas tipo ballet, baja/no significativa en sesiones técnicas tipo kata). NO simplificar esto a "sRPE y TRIMP miden lo mismo, usa cualquiera" — es metodológicamente incorrecto.
- Distinguir siempre entre evidencia citada y ejemplo ilustrativo propio.

**Instrucción general — "extiende las preguntas del quiz basado en...":** cada lección tipo `quiz` de este documento trae 2-3 preguntas base. Al extenderla a 5 preguntas:
- Añadir al menos 1 pregunta de comprensión aplicada usando un hallazgo cuantitativo específico de la lista de fuentes (número de estudios de validación, coeficientes de correlación, contexto deportivo).
- No construir preguntas sobre datos que no estén respaldados en la lista de fuentes.

**Instrucción general — lecciones tipo `video` y `audio`:** el campo de descripción de apoyo es el guion base, no el guion final. Mantener el mismo nivel de rigor que la lección de texto correspondiente.

---

## Módulo 1: Qué es la carga interna y por qué medirla

### Lección 1 — Carga interna vs. carga externa (tipo: texto)

Toda planificación del entrenamiento parte de una distinción que parece obvia pero que en la práctica se ignora constantemente: no es lo mismo lo que le pedimos al atleta que haga que lo que ese trabajo le cuesta por dentro. La **carga externa** describe el trabajo físico realizado y es todo aquello que podemos medir con un cronómetro, una cinta métrica, un GPS o el disco de una barra: distancia recorrida, velocidad, número de series, repeticiones y peso levantado. Es objetiva, se prescribe desde afuera y es idéntica para cualquiera que ejecute la misma sesión.

La **carga interna**, en cambio, describe la respuesta fisiológica y perceptual del atleta ante ese trabajo. Es lo que ocurre dentro del organismo cuando se enfrenta a la carga externa: cuánto se acelera el corazón, cuánta fatiga se acumula, cuán duro se siente el esfuerzo. Y aquí aparece la idea central del curso: dos atletas pueden completar exactamente la misma carga externa y experimentar cargas internas muy distintas según su estado de forma, su fatiga acumulada o sus condiciones individuales de ese día. El mismo estímulo externo no produce el mismo estímulo interno.

Para ilustrarlo con un ejemplo propio (no un hallazgo de estudio, sino una situación didáctica): imaginemos a dos corredores que completan idénticamente diez repeticiones de 400 metros a un ritmo pautado, con el mismo descanso. La carga externa es la misma para ambos hasta el último metro. Pero el primero durmió ocho horas, viene de una semana de descarga y está fresco; el segundo durmió cinco horas, arrastra fatiga de tres sesiones intensas y llega estresado por motivos ajenos al entrenamiento. Al terminar, el primero reporta un esfuerzo moderado y su corazón vuelve rápido a la calma; el segundo termina al borde del agotamiento, con una frecuencia cardíaca más alta durante toda la serie y una percepción de esfuerzo mucho mayor. Misma carga externa, cargas internas radicalmente distintas. Ese desajuste es precisamente lo que un entrenador necesita ver, porque prescribir a ciegas por la carga externa lo llevaría a tratar a ambos como si hubieran hecho lo mismo, cuando fisiológicamente no fue así.

De ahí que monitorear la carga interna no sea un lujo académico sino una necesidad operativa. Contar con una herramienta válida y confiable para monitorear la carga interna es fundamental para asegurar la adaptación óptima al entrenamiento antes de una competencia y para reducir el riesgo de sobreentrenamiento (Haddad et al., 2017, Frontiers in Neuroscience). La lógica es directa: la adaptación no se produce por el trabajo que se ordena, sino por el estímulo que el cuerpo efectivamente recibe y por cómo se recupera de él. Si dos semanas idénticas en el papel producen respuestas internas muy diferentes, planificar solo con la carga externa nos deja ciegos ante la sobrecarga que se está gestando en un atleta y ante el sub-estímulo en otro. El resultado son dos errores costosos y opuestos: por un lado, empujar hacia el sobreentrenamiento y la lesión a quien ya está saturado; por otro, no estimular lo suficiente a quien podría asimilar más y por tanto progresar mejor.

La buena noticia es que la carga interna sí se puede medir, y no hace falta un laboratorio para hacerlo. Este curso cubre las dos herramientas más usadas en el terreno, cada una con una filosofía distinta de cómo "preguntarle al cuerpo": el método **sRPE**, que captura la percepción subjetiva del esfuerzo del propio atleta, y el **TRIMP**, que se basa en la frecuencia cardíaca como marcador objetivo de la respuesta interna. Ninguna de las dos mide directamente la carga externa; ambas intentan reconstruir cuánto costó realmente la sesión desde adentro.

A lo largo de los módulos siguientes veremos cómo funciona cada método, cómo se calcula, qué evidencia lo respalda y, sobre todo, un matiz que a menudo se pasa por alto: estas dos herramientas no siempre coinciden entre sí, y la decisión de cuál usar depende del tipo de deporte. Entender la diferencia entre carga externa e interna es el primer paso; el segundo es entender que ni siquiera todas las medidas de carga interna cuentan la misma historia.

### Lección 2 — Por qué la carga interna cuenta la historia real (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: el objetivo del video es que el espectador vea, no solo lea, la diferencia entre carga externa e interna. Abrir con una toma dividida: dos atletas ejecutan en paralelo exactamente la misma sesión (misma distancia, mismas series, mismo peso). En pantalla, un rótulo fijo que dice "CARGA EXTERNA: IDÉNTICA" mientras ambos entrenan, para anclar visualmente que lo prescrito es igual para los dos.

A medida que avanza la sesión, superponer sobre cada atleta indicadores distintos de su respuesta interna (una frecuencia cardíaca que sube más en uno, una expresión de esfuerzo más marcada en el otro), rotulados como "CARGA INTERNA: DISTINTA". El punto pedagógico es que el mismo estímulo externo produjo respuestas internas diferentes según el estado de forma y la fatiga acumulada de cada uno — presentarlo como ejemplo ilustrativo propio, no como resultado de un estudio.

Cerrar conectando explícitamente con el propósito documentado por Haddad et al. (2017): monitorear la carga interna con una herramienta válida y confiable sirve para optimizar la adaptación al entrenamiento antes de una competencia y para reducir el riesgo de sobreentrenamiento. Frase de cierre para locución: "La carga externa dice lo que le pediste al atleta; la carga interna dice lo que le costó. Y para entrenar bien, necesitas saber lo segundo." Mantener un tono claro y sobrio; el video no persuade con datos duros sino con la imagen de dos respuestas distintas ante un mismo trabajo.

### Lección 3 — El cuerpo no miente, pero hay que saber preguntarle (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: tono conversacional y cercano, como un entrenador hablándole al oído a otro entrenador o a un atleta curioso. La idea rectora que atraviesa todo el episodio es que medir carga interna es, en el fondo, "preguntarle al cuerpo cómo le fue" con la sesión que acaba de hacer.

Desarrollar la metáfora con cuidado: la carga externa la decidimos nosotros desde afuera —cuántas series, cuántos kilómetros, cuánto peso—, pero la carga interna solo la sabe el cuerpo, y hay que preguntársela bien. El episodio plantea que existen dos formas complementarias de hacer esa pregunta. La primera es preguntarle al atleta directamente por su percepción del esfuerzo: cuán duro sintió la sesión (esta es la vía del sRPE). La segunda es leer una señal fisiológica objetiva, la respuesta cardíaca del propio cuerpo durante el esfuerzo (esta es la vía del TRIMP, basado en frecuencia cardíaca).

Enfatizar que "el cuerpo no miente": tanto la percepción del atleta como su respuesta cardíaca son señales reales de lo que ocurrió por dentro. Pero adelantar, sin resolverlo aún, que a veces estas dos formas de preguntar dan respuestas distintas, y que más adelante en el curso veremos por qué eso ocurre y qué significa —sembrar la curiosidad hacia el Módulo 4 sin destriparlo. Anclar el propósito de fondo en Haddad et al. (2017): saber leer la carga interna es lo que permite optimizar la adaptación y reducir el riesgo de sobreentrenamiento. Cerrar con una frase memorable de locución: "El cuerpo siempre responde con la verdad. Nuestro trabajo es aprender a preguntar bien."

### Lección 4 — Evaluación inicial (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
La carga interna se refiere a...
- [a] El trabajo físico externo realizado (distancia, series, peso)
- [b] La respuesta fisiológica y perceptual del atleta ante ese trabajo ✓
- [c] Solo la frecuencia cardíaca máxima
- [d] El tiempo total de entrenamiento

#### Pregunta 2 (tipo: verdadero_falso, puntos: 1)
Dos atletas que completan la misma carga externa siempre experimentan la misma carga interna.
- [V] Verdadero
- [F] Falso ✓

#### Pregunta 3 (tipo: opcion_unica, puntos: 1)
¿Cuál de las siguientes es una medida de carga EXTERNA, no interna?
- [a] La percepción subjetiva del esfuerzo del atleta
- [b] La respuesta de frecuencia cardíaca durante la sesión
- [c] El peso total levantado y la distancia recorrida ✓
- [d] La fatiga fisiológica acumulada

#### Pregunta 4 (tipo: opcion_multiple, puntos: 2)
Según Haddad et al. (2017), ¿para qué es fundamental contar con una herramienta válida y confiable de monitoreo de carga interna? (Selecciona todas las correctas)
- [a] Asegurar la adaptación óptima al entrenamiento antes de una competencia ✓
- [b] Reducir el riesgo de sobreentrenamiento ✓
- [c] Eliminar por completo la necesidad de prescribir carga externa
- [d] Reemplazar el descanso y la recuperación del atleta

#### Pregunta 5 (tipo: opcion_unica, puntos: 1)
Este curso cubre las dos herramientas más usadas para medir carga interna. ¿Cuáles son?
- [a] Distancia recorrida y peso levantado
- [b] El método sRPE (percepción subjetiva) y el TRIMP (basado en frecuencia cardíaca) ✓
- [c] La velocidad máxima y la potencia de salto
- [d] El índice de masa corporal y la edad

---

## Módulo 2: El método sRPE paso a paso

### Lección 1 — Cómo funciona el sRPE de Foster (tipo: texto)

El método **session-RPE (sRPE)**, propuesto por Foster et al. (2001), resuelve un problema práctico con una elegancia notable: cómo cuantificar la carga interna de una sesión completa con un solo dato reportado por el atleta. La clave está en que el sRPE toma en cuenta tanto la **intensidad** como la **duración** de una sesión de entrenamiento, es decir, las dos dimensiones que definen cuánto costó realmente el trabajo. Una sesión muy intensa pero cortísima y una sesión suave pero larguísima pueden acabar representando cargas parecidas, y un buen indicador de carga interna debe capturar ambas caras.

El procedimiento es deliberadamente simple. El atleta responde una pregunta directa: "¿cómo fue tu entrenamiento?", y expresa la intensidad global percibida de la sesión usando una escala CR-10 modificada por Foster et al. (2001) a partir de la escala original de Borg. Esa percepción única resume la sensación de esfuerzo de toda la sesión, no de un momento puntual. Con ese número, la carga de entrenamiento (TL) se calcula multiplicando la duración de la sesión (en minutos) por el valor de RPE reportado, y el resultado se expresa en unidades arbitrarias (AU). Un ejemplo aritmético propio para fijar la mecánica: una sesión de 60 minutos con un RPE reportado de 7 produce una carga de 60 × 7 = 420 AU; si otro día la misma persona entrena 90 minutos pero más suave, con un RPE de 4, la carga es 90 × 4 = 360 AU. Aunque la segunda sesión duró más, su carga interna resultó menor porque la intensidad percibida fue considerablemente más baja. Estas unidades arbitrarias no tienen un significado fisiológico absoluto, pero permiten comparar sesiones entre sí, sumar la carga semanal y observar tendencias a lo largo del tiempo, que es exactamente lo que un entrenador necesita para dosificar.

La fortaleza del método no está solo en su sencillez, sino en el respaldo empírico que ha acumulado. Según la revisión de Haddad et al. (2017), 950 estudios han citado el trabajo original de Foster et al., y 36 de ellos han examinado específicamente la validez y confiabilidad del método usando la escala CR-10 modificada. Esa distinción es importante: no basta con que un método sea popular o muy citado; lo que le da solidez es que decenas de estudios lo hayan puesto a prueba directamente. Esos 36 estudios de validación han confirmado validez y buena confiabilidad/consistencia interna en múltiples deportes, en distintas edades —niños, adolescentes y adultos— y en distintos niveles de competencia. En otras palabras, no es una herramienta ajustada a un nicho, sino una que ha demostrado comportarse bien en poblaciones muy diversas, lo cual es precisamente lo que uno quiere de un instrumento que aspira a usarse en el día a día del entrenamiento.

Otra virtud práctica es su autonomía. El método puede usarse como herramienta "independiente" para monitorear carga, sin necesidad de equipamiento adicional: no requiere pulsómetros, GPS ni análisis de sangre, solo la percepción del atleta, la duración de la sesión y una multiplicación. Esto lo hace especialmente accesible para entrenadores y equipos con pocos recursos tecnológicos, y aplicable a modalidades donde la frecuencia cardíaca es difícil de interpretar. Dicho esto, la propia literatura invita a la prudencia: algunos autores recomiendan combinarlo con parámetros fisiológicos como la frecuencia cardíaca. La razón de fondo es que la percepción y la respuesta cardíaca capturan aspectos parcialmente distintos de la carga interna, y en ciertos contextos conviene tener ambas miradas —una idea que este curso desarrollará en profundidad en el Módulo 4, donde veremos que la coincidencia entre sRPE y los métodos basados en frecuencia cardíaca depende del tipo de sesión.

Conviene subrayar, finalmente, una condición de uso que suele descuidarse: la simplicidad de la pregunta no exime de un requisito previo. Para que los valores de sRPE sean confiables, el atleta debe estar familiarizado con la escala CR-10 modificada según los procedimientos estándar; un número mal calibrado por desconocimiento de la escala contamina todo el cálculo posterior. Este punto lo retomaremos como uno de los errores clásicos en el Módulo 5. Por ahora, la conclusión del módulo es clara: el sRPE de Foster et al. (2001) convierte una sola pregunta bien hecha en un dato de carga interna cuantificable, comparable y respaldado por evidencia sólida, siempre que se aplique con rigor.

[PLACEHOLDER: agregar tabla completa de la escala CR-10 modificada por Foster et al. (2001) — verificar valores exactos y anclas verbales antes de publicar]

### Lección 2 — Aplicando el sRPE en una sesión real (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: el video es un tutorial práctico que muestra en pantalla el proceso completo del método sRPE de principio a fin, tal como lo aplicaría un entrenador tras una sesión real.

Estructura sugerida en tres pasos visibles en pantalla. Paso 1: al terminar la sesión, el entrenador formula la pregunta clave al atleta —"¿cómo fue tu entrenamiento?"— y en pantalla aparece la escala CR-10 modificada para que el atleta elija su valor de intensidad percibida. Paso 2: registrar la duración total de la sesión en minutos. Paso 3: mostrar en pantalla el cálculo explícito de la carga de entrenamiento como TL = duración × RPE, expresada en unidades arbitrarias (AU). Acompañar con un ejemplo aritmético propio en pantalla (por ejemplo, 60 min × RPE 7 = 420 AU) para que el cálculo quede claro; presentarlo como ejemplo ilustrativo, no como dato de estudio.

Incluir un rótulo de credibilidad: mencionar que Haddad et al. (2017) reportan 36 estudios de validación con buenos resultados de confiabilidad para este método usando la escala CR-10 modificada, de modo que el espectador entienda que detrás de esta pregunta simple hay respaldo empírico. Cerrar recordando visualmente el requisito previo —el atleta debe estar familiarizado con la escala CR-10 modificada antes de que los datos sean confiables— para que el tutorial no transmita que basta con "preguntar por preguntar". Tono didáctico y ordenado, con foco en que el espectador pueda replicar el proceso al día siguiente en su propio entrenamiento.

### Lección 3 — Una pregunta simple, un dato poderoso (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: tono práctico y motivador, dirigido a desmontar el prejuicio de que "algo tan simple no puede ser riguroso". La tesis del episodio es que la simplicidad del método sRPE —una sola pregunta al atleta— no le resta rigor científico; al contrario, esa sencillez es parte de su fortaleza porque lo hace aplicable en el mundo real, sesión tras sesión, sin equipamiento.

Desarrollar el argumento apoyándose en la evidencia: recordar al oyente que el trabajo original de Foster et al. (2001) ha sido citado por 950 estudios y, más importante aún, que 36 de ellos examinaron directamente su validez y confiabilidad con la escala CR-10 modificada, según la revisión de Haddad et al. (2017). Explicar la diferencia entre "ser muy citado" y "estar validado": lo que da confianza no es la popularidad sino que docenas de estudios lo hayan probado y confirmado su buena confiabilidad y consistencia interna en distintos deportes, edades y niveles de competencia.

Introducir el matiz honesto que evita el triunfalismo: la potencia del método depende de un requisito que el entrenador no puede saltarse —el atleta debe estar familiarizado con la escala CR-10 modificada según los procedimientos estándar antes de que las mediciones sean confiables. Un RPE reportado por alguien que no entiende la escala es un dato pobre, por muy validado que esté el método. Cerrar con una frase de locución que capture la paradoja central: "Una sola pregunta, hecha a alguien que sabe responderla, vale más que un tablero lleno de sensores mal usados." Mantener el episodio breve, concreto y accionable.

### Lección 4 — Evaluación del método sRPE (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
El método sRPE de Foster et al. (2001) calcula la carga de entrenamiento como...
- [a] Frecuencia cardíaca máxima × series
- [b] Duración de la sesión × valor de RPE reportado ✓
- [c] Solo la duración de la sesión
- [d] Solo el valor de RPE, sin duración

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
Según Haddad et al. (2017), ¿cuántos estudios han examinado específicamente la validez y confiabilidad del método sRPE con la escala CR-10 modificada?
- [a] 950
- [b] 36 ✓
- [c] 5
- [d] Ninguno

#### Pregunta 3 (tipo: verdadero_falso, puntos: 1)
El método sRPE se basa en una escala CR-10 modificada por Foster et al. (2001) a partir de la escala original de Borg.
- [V] Verdadero ✓
- [F] Falso

#### Pregunta 4 (tipo: opcion_unica, puntos: 1)
Un atleta entrena 50 minutos y reporta un RPE de 8 en la escala CR-10 modificada. Según el método sRPE, ¿cuál es la carga de entrenamiento (TL) de esa sesión?
- [a] 58 AU
- [b] 400 AU ✓
- [c] 8 AU
- [d] 50 AU

#### Pregunta 5 (tipo: opcion_unica, puntos: 1)
Según Haddad et al. (2017), la validez y buena confiabilidad del método sRPE se ha confirmado en...
- [a] Un único deporte de resistencia y solo en adultos élite
- [b] Múltiples deportes, distintas edades (niños, adolescentes, adultos) y niveles de competencia ✓
- [c] Solo en deportes técnicos de precisión
- [d] Solo en laboratorio, nunca en campo

---

## Módulo 3: Cálculo e interpretación del TRIMP

### Lección 1 — Dos formas de calcular TRIMP (tipo: texto)

**TRIMP (Training Impulse)** es un método basado en frecuencia cardíaca para cuantificar carga de entrenamiento. Mientras el sRPE le pregunta al atleta cómo percibió el esfuerzo, el TRIMP toma un camino distinto: parte de una señal fisiológica objetiva —la respuesta cardíaca durante el ejercicio— para estimar cuánta carga interna acumuló la sesión. La lógica común a todas sus variantes es que combinar la intensidad (leída a través de la frecuencia cardíaca) con la duración de la sesión permite obtener una cifra que representa el impulso total de entrenamiento. Existen dos versiones principales, con orígenes y grados de validación distintos, y entender esa diferencia es el objetivo central del módulo.

El **Banister TRIMP** (Banister, 1991) es el método fundacional y el más elaborado desde el punto de vista fisiológico. Pondera la frecuencia cardíaca de reserva (HR reserve) según la relación entre frecuencia cardíaca y respuesta de lactato observada en ejercicio incremental, y multiplica ese valor ponderado por la duración de la sesión. La clave conceptual es que el factor de ponderación no es arbitrario: se deriva de curvas de lactato reales, de modo que los minutos pasados a intensidades altas —donde la respuesta de lactato se dispara— pesan mucho más que los minutos a intensidades bajas. Esto refleja el hecho fisiológico de que no todos los minutos de ejercicio cuestan lo mismo por dentro. Banister no diseñó este índice como un fin en sí mismo, sino como una pieza de un modelo mayor: usó el TRIMP para modelar el rendimiento deportivo mediante la relación Rendimiento = Aptitud − Fatiga, en la que la carga de entrenamiento alimenta simultáneamente una componente de aptitud (que mejora el rendimiento a mediano plazo) y una componente de fatiga (que lo deprime a corto plazo). Esa dualidad es la que explica por qué una misma carga puede beneficiar o perjudicar según el momento en que se aplique.

El **Edwards TRIMP** (Edwards, 1993) representa una alternativa deliberadamente más sencilla, pensada para ser calculable con un pulsómetro comercial y sin necesidad de pruebas de lactato. Es un método de zonas de frecuencia cardíaca sumadas —"summated HR zones"—: se divide el rango de frecuencia cardíaca en zonas, se registra cuántos minutos pasó el atleta en cada zona, se multiplica ese tiempo por un coeficiente de ponderación asignado a la zona y se suman todos los productos. Aquí aparece una consideración metodológica importante que el curso subraya: las ponderaciones usadas por Edwards no están validadas mediante una relación directa con una respuesta fisiológica conocida, a diferencia del método de Banister, que sí deriva su factor de ponderación de curvas de lactato observadas. Dicho de otro modo, los coeficientes de Edwards son razonables y prácticos, pero su fundamento no está anclado en una medida fisiológica del mismo modo que los de Banister. Este es un matiz que un entrenador debe conocer para saber qué está midiendo realmente, aunque no lo invalide para el uso cotidiano.

Ahora bien, ¿importa esta diferencia de origen a la hora de usar uno u otro método en la práctica? La evidencia sugiere que, para el propósito de medir carga interna vía frecuencia cardíaca, ambos convergen notablemente. A pesar de esta diferencia de origen, un estudio de validez convergente en atletas de taekwondo encontró relaciones de muy grandes a casi perfectas entre el TRIMP de Banister y el TL de Edwards, con valores de r individuales entre 0.80 y 0.99 y, en los datos agrupados (n=284), una correlación de r=0.89. Una correlación de esa magnitud indica que, en ese contexto, los dos métodos ordenan y cuantifican las sesiones de manera casi equivalente, lo que sugiere que ambos métodos son, en la práctica, intercambiables al medir el mismo constructo mediante frecuencia cardíaca.

La lección práctica del módulo es doble y hay que sostener ambas partes sin colapsarlas. Por un lado, si un entrenador dispone de datos de frecuencia cardíaca, puede usar el método de Edwards por su simplicidad y esperar resultados muy alineados con el de Banister, al menos en contextos como el descrito. Por otro lado, la fuerte correlación empírica no borra la diferencia conceptual de fondo: solo Banister ancla su ponderación en la respuesta de lactato, mientras que Edwards no. Conviene además guardar esta idea con un matiz que se volverá central en el Módulo 4: toda esta discusión ocurre "dentro de la familia" de la frecuencia cardíaca. Que dos métodos basados en frecuencia cardíaca correlacionen fuertemente entre sí no implica que la frecuencia cardíaca, como señal, capture toda la carga interna en cualquier deporte —esa es una pregunta distinta, y su respuesta, como veremos, depende del tipo de sesión.

[PLACEHOLDER: agregar fórmula matemática completa de Banister TRIMP con el factor de ponderación exponencial — verificar contra Banister (1991) antes de publicar]

### Lección 2 — Comparando Banister y Edwards en pantalla (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: el video presenta ambos métodos de TRIMP lado a lado, en formato comparativo, para que el espectador vea de un vistazo en qué se parecen y en qué se diferencian.

Panel izquierdo (Banister TRIMP, Banister, 1991): mostrar que pondera la frecuencia cardíaca de reserva según la relación entre frecuencia cardíaca y respuesta de lactato observada en ejercicio incremental, multiplicada por la duración. Rotular visualmente que su factor de ponderación deriva de curvas de lactato observadas —es decir, está validado contra una respuesta fisiológica conocida. Panel derecho (Edwards TRIMP, Edwards, 1993): mostrar el método de zonas de frecuencia cardíaca sumadas ("summated HR zones"), más simple, y rotular con claridad la consideración metodológica clave: sus ponderaciones no están validadas mediante una relación directa con una respuesta fisiológica conocida, a diferencia de las de Banister.

Tras contrastar el origen, mostrar en pantalla el hallazgo de convergencia práctica: en el estudio de validez convergente en atletas de taekwondo, la correlación entre ambos métodos fue de muy grande a casi perfecta (r individuales entre 0.80 y 0.99), con una correlación agrupada de r=0.89 (n=284). Representarlo con un gráfico de dispersión donde los puntos caen casi sobre la línea, para transmitir visualmente lo fuerte de la relación. Cierre para locución: "Nacieron de ideas distintas —uno anclado en el lactato, el otro en zonas prácticas—, pero en la cancha terminan diciendo casi lo mismo. Saber ambas cosas es lo que distingue a un entrenador que entiende su herramienta." Tono técnico pero accesible.

### Lección 3 — Por qué el origen del método importa (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: caso narrado, tono reflexivo, dirigido a un entrenador que quiere entender qué está midiendo realmente y no solo aplicar una fórmula. El eje del episodio es una aparente paradoja: aunque Banister TRIMP y Edwards TRIMP correlacionen fuertemente en la práctica, es importante que el estudiante sepa que no tienen el mismo respaldo de validación fisiológica.

Narrar el contraste de orígenes: el método de Banister (1991) deriva su factor de ponderación de curvas de lactato observadas en ejercicio incremental, es decir, está anclado en una respuesta fisiológica conocida; el de Edwards (1993), en cambio, suma zonas de frecuencia cardíaca con ponderaciones que no están validadas mediante una relación directa con una respuesta fisiológica conocida. Esa es la diferencia de fondo que el episodio quiere que el oyente retenga.

Introducir entonces la tensión con la evidencia: en el estudio de validez convergente en atletas de taekwondo, ambos métodos correlacionaron de muy grande a casi perfecta, con r=0.89 en los datos agrupados (n=284). ¿Cómo se reconcilia esto? El episodio debe explicar que una cosa es la utilidad práctica (los dos métodos ordenan las sesiones casi igual y por eso pueden usarse de forma intercambiable en muchos contextos) y otra distinta es el fundamento científico (solo uno de ellos deriva su ponderación de una medida fisiológica). Un entrenador experimentado usa el método simple cuando le conviene, pero nunca olvida sobre qué está construido. Cerrar con una frase memorable: "Que dos herramientas te den la misma respuesta no significa que estén hechas del mismo material. Y el material importa cuando la respuesta empieza a fallar." Sembrar así la transición hacia el Módulo 4.

### Lección 4 — Evaluación de cálculo e interpretación de TRIMP (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
El TRIMP de Banister (1991) pondera la frecuencia cardíaca según...
- [a] La edad del atleta
- [b] La relación entre frecuencia cardíaca y respuesta de lactato en ejercicio incremental ✓
- [c] El tipo de calzado deportivo
- [d] La hora del día

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
Según el estudio de validez convergente en taekwondo, la correlación agrupada (pooled) entre Banister TRIMP y Edwards TL fue de...
- [a] r = 0.10
- [b] r = 0.89 ✓
- [c] r = 0.30
- [d] No se encontró correlación

#### Pregunta 3 (tipo: verdadero_falso, puntos: 1)
Las ponderaciones del método Edwards TRIMP están validadas mediante una relación directa con una respuesta fisiológica conocida, igual que el método de Banister.
- [V] Verdadero
- [F] Falso ✓

#### Pregunta 4 (tipo: opcion_unica, puntos: 1)
En el estudio de validez convergente en atletas de taekwondo, ¿en qué rango se ubicaron los valores de r individuales entre Banister TRIMP y Edwards TL?
- [a] Entre 0.20 y 0.40
- [b] Entre 0.80 y 0.99 ✓
- [c] Entre -0.10 y 0.10
- [d] Todos exactamente en 0.50

#### Pregunta 5 (tipo: opcion_unica, puntos: 1)
¿Para qué usó Banister (1991) el TRIMP dentro de su trabajo original?
- [a] Para medir únicamente la composición corporal del atleta
- [b] Para modelar el rendimiento deportivo mediante la relación Rendimiento = Aptitud − Fatiga ✓
- [c] Para reemplazar por completo cualquier medida de percepción del esfuerzo
- [d] Para calcular la frecuencia cardíaca máxima teórica por edad

---

## Módulo 4: De la percepción del esfuerzo a la decisión de entrenamiento

### Lección 1 — Cuando sRPE y TRIMP no están de acuerdo (tipo: texto)

Este es el punto metodológicamente más importante del curso, y conviene enunciarlo sin ambigüedad desde el principio: sRPE y TRIMP (basado en frecuencia cardíaca) **no siempre correlacionan entre sí**, y esa discrepancia depende del tipo de sesión. Es un error frecuente —y grave— asumir que ambos son medidas equivalentes de la carga interna que puedan usarse de forma intercambiable en cualquier deporte. La evidencia muestra que la relación entre ellos puede ser muy fuerte en unos contextos y prácticamente nula en otros. Entender por qué es lo que separa a un entrenador que aplica fórmulas de uno que comprende lo que sus datos significan.

Empecemos por el caso en que sí coinciden. En un estudio con bailarines de ballet profesionales, se encontraron relaciones positivas y significativas entre sRPE y ambos métodos de TRIMP: Edwards TRIMP con r=0.81, p<0.001, y Banister TRIMP con r=0.79, p<0.001, a través de todas las sesiones. Estas son correlaciones altas y estadísticamente robustas. La interpretación es coherente con la naturaleza del ballet profesional como actividad predominantemente continua y de alta demanda cardiovascular: cuando el esfuerzo se traduce sostenidamente en trabajo del sistema cardiorrespiratorio, la percepción del atleta (sRPE) y su respuesta cardíaca (TRIMP) tienden a moverse juntas. En un escenario así, ambas familias de métodos cuentan esencialmente la misma historia, y elegir una u otra tiene poca consecuencia práctica.

Ahora el caso que rompe el supuesto. En un estudio con atletas de kata de karate (Bok, Jukić y Foster, 2021), al agrupar todos los tipos de sesión, NO se encontraron correlaciones significativas entre sRPE y Edwards TL (r=0.53, p=0.18) ni entre sRPE y Banister TRIMP (r=0.13, p=0.77). La diferencia con el caso del ballet es rotunda: aquí la percepción del esfuerzo y la respuesta cardíaca dejan de moverse juntas. Aún más revelador es el detalle de qué método logró distinguir entre sesiones y cuál no: los métodos basados en frecuencia cardíaca no fueron capaces de discriminar entre distintas sesiones de entrenamiento de kata, mientras que el sRPE sí mostró diferencias significativas entre sesiones (p<0.001). Es decir, no se trata solo de que ambos discreparan, sino de que uno de ellos —el sRPE— captaba diferencias reales de carga entre sesiones que el otro —el TRIMP cardíaco— era incapaz de detectar. En ese contexto, el método basado en frecuencia cardíaca no estaba simplemente dando otra respuesta: estaba fallando en ver algo que sí ocurría.

La interpretación práctica de este contraste es el corazón del módulo. En deportes con componente técnico/cognitivo alto (como el kata), la frecuencia cardíaca puede no capturar toda la carga real que percibe el atleta: el esfuerzo mental, la exigencia técnica, la concentración y la precisión imponen una carga interna genuina que no siempre eleva la frecuencia cardíaca en proporción a lo demandante que resulta la tarea. El esfuerzo técnico y cognitivo no siempre se refleja en la respuesta cardíaca de la misma forma que en el ejercicio continuo tipo ballet o de resistencia. Por eso, en esos contextos, el sRPE puede ser más útil que el TRIMP para monitorear la carga interna, porque la percepción del atleta integra dimensiones del esfuerzo que la señal cardíaca por sí sola no recoge. Es fundamental subrayar, para evitar el malentendido más común, que esto no descalifica al TRIMP: en deportes continuos como el ballet demostró correlaciones altas (r=0.81 y r=0.79). Lo que la evidencia establece es que la validez de cada método depende del tipo de sesión, no que uno sea universalmente superior.

De aquí se desprende la regla que ningún atajo debería borrar. Decir "sRPE y TRIMP miden lo mismo, usa cualquiera" es metodológicamente incorrecto, porque ignora que en un caso (ballet) correlacionaron fuertemente y en otro (kata) no correlacionaron de forma significativa. La lección no es elegir un ganador permanente, sino aprender a leer el deporte: cuando la demanda es predominantemente cardiovascular y continua, la percepción y la frecuencia cardíaca convergen y ambos métodos sirven; cuando la demanda es marcadamente técnica o cognitiva, la frecuencia cardíaca puede quedarse corta y conviene apoyarse en el sRPE, que sí discriminó entre sesiones (p<0.001) donde el TRIMP no pudo. Esta sensibilidad al contexto es lo que convierte la medición de carga interna en una decisión informada y no en un ritual mecánico.

[PLACEHOLDER: agregar tabla resumen comparando ambos estudios (ballet vs. kata) con sus coeficientes de correlación exactos — verificar cifras contra las fuentes antes de publicar]

### Lección 2 — Dos deportes, dos historias distintas (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: el video contrapone visualmente dos estudios para hacer palpable el hallazgo central del curso —que la relación entre sRPE y TRIMP depende del tipo de deporte. Estructurarlo en dos columnas en pantalla, "BALLET" a la izquierda y "KATA" a la derecha, con los coeficientes de correlación de cada estudio mostrados lado a lado.

Columna ballet: mostrar que en bailarines de ballet profesionales las relaciones entre sRPE y ambos métodos de TRIMP fueron positivas y significativas —Edwards TRIMP r=0.81, p<0.001; Banister TRIMP r=0.79, p<0.001, a través de todas las sesiones. Representar visualmente correlaciones altas (puntos alineados). Columna kata: mostrar que en el estudio de Bok, Jukić y Foster (2021), al agrupar todas las sesiones, NO hubo correlaciones significativas —sRPE vs. Edwards TL r=0.53, p=0.18; sRPE vs. Banister TRIMP r=0.13, p=0.77. Representar visualmente una nube dispersa sin patrón. Añadir un rótulo destacado con el matiz decisivo: en kata, los métodos basados en frecuencia cardíaca no discriminaron entre sesiones, mientras que el sRPE sí mostró diferencias significativas (p<0.001).

Explicar en la locución por qué el contexto del deporte determina qué método de carga interna es más confiable: en actividad continua y cardiovascular (ballet), percepción y frecuencia cardíaca coinciden; en actividad técnica/cognitiva (kata), la frecuencia cardíaca puede no capturar toda la carga percibida. Advertencia explícita en pantalla, para que nadie salga con la idea equivocada: NO significa que un método sea siempre mejor —significa que la validez depende del tipo de sesión. Cierre: "Dos deportes, dos historias. Mismo par de herramientas, resultados opuestos. El contexto no es un detalle: es la decisión."

### Lección 3 — Eligiendo la herramienta correcta según el deporte (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: conversación práctica orientada a la toma de decisiones, dirigida a entrenadores que deben elegir cómo monitorear la carga interna en su disciplina concreta. El mensaje operativo: la elección entre sRPE y TRIMP no es universal, sino que se ajusta al perfil del deporte.

Plantear dos escenarios contrastantes apoyados en la evidencia del módulo. Escenario 1, deporte técnico o de precisión (artes marciales como el kata, y por extensión disciplinas con alta demanda cognitiva): el entrenador debería confiar más en el sRPE, porque en el estudio de kata de Bok, Jukić y Foster (2021) los métodos basados en frecuencia cardíaca no discriminaron entre sesiones (sRPE vs. Edwards TL r=0.53, p=0.18; sRPE vs. Banister TRIMP r=0.13, p=0.77), mientras que el sRPE sí mostró diferencias significativas entre sesiones (p<0.001). La percepción del atleta capta la carga técnica y cognitiva que la frecuencia cardíaca puede pasar por alto. Escenario 2, deporte de resistencia continua (como el ballet profesional): el entrenador puede confiar más en ambos métodos de forma prácticamente indistinta, porque ahí sRPE correlacionó fuertemente con ambos TRIMP (Edwards r=0.81, p<0.001; Banister r=0.79, p<0.001).

Ser explícito en evitar el error de simplificación: no decir que un método sea mejor que otro en abstracto, ni que "miden lo mismo, usa cualquiera". Insistir en que la buena práctica es preguntarse primero qué tipo de demanda predomina en el deporte y dejar que esa respuesta guíe la elección de herramienta. Distinguir con claridad la evidencia citada (los coeficientes de ambos estudios) del consejo aplicado que el entrenador construye a partir de ella. Cierre para locución: "No preguntes solo cuál es la mejor herramienta. Pregunta primero qué deporte tienes delante —y deja que el deporte te diga qué medir."

### Lección 4 — Evaluación de decisiones con carga interna (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
En el estudio de bailarines de ballet, la correlación entre sRPE y Edwards TRIMP a través de todas las sesiones fue...
- [a] No significativa
- [b] Positiva y significativa (r=0.81, p<0.001) ✓
- [c] Negativa
- [d] No se midió

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
En el estudio de Bok, Jukić y Foster (2021) con atletas de kata, al agrupar todas las sesiones, ¿qué se encontró?
- [a] Correlación fuerte y significativa entre sRPE y ambos TRIMP
- [b] Sin correlación significativa entre sRPE y los métodos basados en frecuencia cardíaca ✓
- [c] Los métodos de frecuencia cardíaca fueron más sensibles que el sRPE
- [d] No se pudo calcular ningún coeficiente

#### Pregunta 3 (tipo: verdadero_falso, puntos: 1)
En deportes con alto componente técnico/cognitivo, la frecuencia cardíaca siempre captura la carga real percibida por el atleta de forma tan precisa como en deportes de resistencia continua.
- [V] Verdadero
- [F] Falso ✓

#### Pregunta 4 (tipo: opcion_unica, puntos: 1)
En el estudio de kata (Bok, Jukić y Foster, 2021), ¿qué método logró mostrar diferencias significativas entre distintas sesiones de entrenamiento?
- [a] El Banister TRIMP, con r=0.13
- [b] El Edwards TL, con p=0.18
- [c] El sRPE, con diferencias significativas entre sesiones (p<0.001) ✓
- [d] Ninguno de los métodos logró discriminar entre sesiones

#### Pregunta 5 (tipo: opcion_unica, puntos: 1)
Un entrenador afirma: "Como sRPE y TRIMP miden lo mismo, usa cualquiera en cualquier deporte." Según la evidencia del curso (ballet vs. kata), esta afirmación es...
- [a] Correcta, porque ambos siempre correlacionan fuertemente
- [b] Incorrecta, porque la correlación entre ambos depende del tipo de sesión (alta en ballet, no significativa en kata) ✓
- [c] Correcta, porque el TRIMP es superior en todos los contextos
- [d] Incorrecta, porque el sRPE nunca debe usarse en ningún deporte

---

## Módulo 5: Errores comunes al medir carga interna

### Lección 1 — Los errores que invalidan la medición (tipo: texto)

Dominar la teoría de la carga interna no basta si en la práctica se cometen errores que contaminan los datos o los interpretan mal. Este módulo reúne los fallos más frecuentes —cada uno de ellos conecta con un principio ya visto en los módulos anteriores— para que el entrenador aprenda a reconocerlos y evitarlos. Conviene leerlos no como una lista de prohibiciones sino como el reverso de las buenas prácticas: cada error señala, por contraste, cómo debería hacerse bien.

- **Asumir que sRPE y TRIMP siempre miden lo mismo y son intercambiables sin importar el deporte.** Este es el error más importante del curso porque contradice directamente el hallazgo del Módulo 4: en ballet profesional sRPE y TRIMP correlacionaron fuertemente (Edwards r=0.81, p<0.001; Banister r=0.79, p<0.001), pero en kata de karate (Bok, Jukić y Foster, 2021), al agrupar todas las sesiones, no se encontraron correlaciones significativas (sRPE vs. Edwards TL r=0.53, p=0.18; sRPE vs. Banister TRIMP r=0.13, p=0.77). Tratarlos como equivalentes universales lleva a confiar en un método que, en deportes técnicos, puede no captar la carga real que el atleta está soportando.

- **No familiarizar al atleta con la escala CR-10 modificada antes de empezar a recolectar datos.** Foster et al. (2001) señalan que el atleta debe estar familiarizado con la escala según procedimientos estándar antes de que las mediciones sean confiables. Un RPE reportado por alguien que no comprende bien la escala produce un número que parece un dato pero no lo es: al multiplicarlo por la duración, el error se propaga a toda la carga calculada. La familiarización previa no es un trámite opcional, es una condición de validez del método.

- **Usar Edwards TRIMP asumiendo el mismo respaldo de validación fisiológica que Banister TRIMP.** Como se explicó en el Módulo 3, las ponderaciones de Edwards (1993) no están validadas mediante una relación directa con una respuesta fisiológica conocida, mientras que Banister (1991) sí deriva su factor de ponderación de curvas de lactato observadas. El error no es usar Edwards —es perfectamente útil y correlaciona muy fuerte con Banister (r=0.89 agrupado en el estudio de taekwondo)— sino olvidar esa diferencia de origen y atribuirle un fundamento fisiológico que no tiene. Saber qué se está midiendo es parte de medir bien.

- **Depender solo de un método basado en frecuencia cardíaca en deportes técnicos/cognitivos.** La evidencia del Módulo 4 muestra que en kata los métodos basados en frecuencia cardíaca no fueron capaces de discriminar entre distintas sesiones, mientras que el sRPE sí mostró diferencias significativas (p<0.001). Apoyarse exclusivamente en el TRIMP cardíaco en ese tipo de deporte equivale a monitorear con un instrumento ciego a buena parte de la carga —la técnica y la cognitiva— que realmente importa.

- **Ignorar el timing recomendado para preguntar el RPE de sesión.** El protocolo estándar de Foster recomienda no preguntar inmediatamente al terminar el ejercicio más intenso de la sesión, para evitar el sesgo de recencia: si se pregunta justo tras el momento más duro, el atleta tiende a reportar la intensidad de ese pico y no la de la sesión en su conjunto, inflando el valor. El sRPE busca una percepción global de toda la sesión, no la foto del instante más exigente; respetar el momento adecuado de la pregunta es lo que preserva ese carácter global.

El hilo conductor de todos estos errores es el mismo: la medición de carga interna es tan buena como el rigor con que se aplica el método y con que se interpreta el resultado a la luz del deporte. Un dato mal recolectado (RPE sin familiarización, timing con sesgo de recencia) o mal interpretado (asumir intercambiabilidad universal, atribuir a Edwards un respaldo que no tiene) puede ser peor que no tener dato, porque genera falsa confianza. El entrenador competente no solo sabe calcular sRPE y TRIMP; sabe cuándo confiar en cada uno, bajo qué condiciones el número es válido y qué preguntas debe hacerse antes de tomar una decisión de entrenamiento a partir de él.

[PLACEHOLDER: verificar y agregar el tiempo exacto recomendado post-sesión para recolectar sRPE según el protocolo original de Foster et al. (2001) antes de publicar]

### Lección 2 — Los errores más comunes, en pantalla (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: formato checklist visual, dinámico y directo, que repasa uno a uno los errores frecuentes al medir carga interna. Cada error aparece en pantalla como un ítem tachado con una "X" roja, seguido de la práctica correcta con un "✓" verde, para que el espectador retenga el contraste.

Ítems del checklist, cada uno anclado en la evidencia del curso:
- Error central del curso: tratar sRPE y TRIMP como intercambiables sin considerar el tipo de deporte. Mostrar en pantalla el contraste ballet (correlación alta: Edwards r=0.81, Banister r=0.79, p<0.001) vs. kata (sin correlación significativa: r=0.53, p=0.18 y r=0.13, p=0.77, según Bok, Jukić y Foster, 2021). Rótulo: "La validez depende del deporte."
- No familiarizar al atleta con la escala CR-10 modificada antes de recolectar datos (Foster et al., 2001 exige familiarización previa).
- Asumir que Edwards TRIMP tiene el mismo respaldo fisiológico que Banister TRIMP (las ponderaciones de Edwards no están validadas contra una respuesta fisiológica conocida; las de Banister derivan de curvas de lactato).
- Depender solo de frecuencia cardíaca en deportes técnicos/cognitivos (en kata no discriminó entre sesiones; el sRPE sí, p<0.001).
- Ignorar el timing del RPE de sesión (no preguntar justo tras el ejercicio más intenso, para evitar sesgo de recencia).

Locución de cierre: "Medir carga interna no falla por falta de tecnología. Falla por descuidos que se pueden evitar. Revisa esta lista antes de confiar en tus números." Tono ágil, ritmo de checklist, foco en la aplicabilidad inmediata.

### Lección 3 — Lo que un entrenador experimentado no haría (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — guion base a continuación]

Descripción de apoyo: tono directo y de cierre de curso, como las palabras finales de un mentor. El propósito es reforzar la idea rectora de todo el curso: la elección del método de carga interna no es una decisión técnica trivial, sino una que depende del deporte y debe basarse en evidencia, no en costumbre.

Estructurar el episodio en torno a lo que un entrenador experimentado no haría, retomando los errores del módulo pero desde la perspectiva del juicio profesional maduro. No trataría sRPE y TRIMP como equivalentes universales, porque conoce el contraste entre ballet (correlaciones altas y significativas, r=0.81 y r=0.79, p<0.001) y kata (sin correlaciones significativas, r=0.53, p=0.18 y r=0.13, p=0.77, Bok, Jukić y Foster, 2021). No empezaría a recolectar sRPE sin antes familiarizar al atleta con la escala CR-10 modificada, tal como indican Foster et al. (2001). No confundiría el respaldo fisiológico de Banister (1991), anclado en curvas de lactato, con el de Edwards (1993), que no está validado del mismo modo. No se apoyaría solo en la frecuencia cardíaca en un deporte técnico, sabiendo que en kata no discriminó entre sesiones mientras que el sRPE sí lo hizo (p<0.001). Y no preguntaría el RPE en el momento equivocado, arruinando el dato con sesgo de recencia.

El mensaje de fondo es que la diferencia entre un aficionado y un profesional no está en tener más sensores, sino en tomar decisiones informadas: saber qué medir, cuándo, cómo y por qué, según el deporte que se tiene delante. Distinguir siempre lo que dice la evidencia de lo que dicta la costumbre. Cierre memorable para locución: "La costumbre te dice que uses lo de siempre. La evidencia te dice que preguntes qué deporte tienes delante. Un buen entrenador escucha a la segunda."

### Lección 4 — Evaluación final del curso (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
Según Foster et al. (2001), antes de recolectar mediciones confiables de sRPE, el atleta debe...
- [a] Tener un dispositivo de frecuencia cardíaca
- [b] Estar familiarizado con la escala CR-10 modificada ✓
- [c] Haber competido a nivel élite
- [d] No es necesario ningún paso previo

#### Pregunta 2 (tipo: verdadero_falso, puntos: 1)
Elegir entre sRPE y TRIMP como método de carga interna es una decisión trivial que no depende del tipo de deporte.
- [V] Verdadero
- [F] Falso ✓

#### Pregunta 3 (tipo: opcion_unica, puntos: 1)
El protocolo estándar de Foster recomienda no preguntar el RPE de sesión inmediatamente al terminar el ejercicio más intenso de la sesión. ¿Por qué?
- [a] Para ahorrar tiempo al entrenador
- [b] Para evitar el sesgo de recencia y capturar la percepción global de toda la sesión ✓
- [c] Porque la frecuencia cardíaca aún está elevada
- [d] Porque la escala CR-10 no funciona después del ejercicio

#### Pregunta 4 (tipo: opcion_multiple, puntos: 2)
¿Cuáles de los siguientes son errores comunes al medir carga interna, según el curso? (Selecciona todas las correctas)
- [a] Asumir que sRPE y TRIMP siempre miden lo mismo y son intercambiables sin importar el deporte ✓
- [b] Usar Edwards TRIMP asumiendo el mismo respaldo de validación fisiológica que Banister TRIMP ✓
- [c] Familiarizar al atleta con la escala CR-10 modificada antes de recolectar datos
- [d] Depender solo de un método basado en frecuencia cardíaca en deportes técnicos/cognitivos ✓

#### Pregunta 5 (tipo: opcion_unica, puntos: 1)
Un entrenador de kata quiere monitorear la carga interna de sus atletas. Basándose en Bok, Jukić y Foster (2021), ¿qué método debería priorizar y por qué?
- [a] El TRIMP de frecuencia cardíaca, porque discriminó mejor entre sesiones
- [b] El sRPE, porque mostró diferencias significativas entre sesiones (p<0.001) mientras que los métodos de frecuencia cardíaca no discriminaron entre sesiones ✓
- [c] Cualquiera de los dos, porque miden exactamente lo mismo
- [d] Ninguno, porque la carga interna no se puede medir en deportes técnicos

---

## Fuentes de evidencia de este curso

1. Haddad, M., Stylianides, G., Djaoui, L., Dellal, A., Chamari, K. (2017). Session-RPE Method for Training Load Monitoring: Validity, Ecological Usefulness, and Influencing Factors. *Front Neurosci*, 11:612. — https://pmc.ncbi.nlm.nih.gov/articles/PMC5673663/
2. Banister, E.W. (1991). Modeling Elite Athletic Performance. In: MacDougall, J.D., Wenger, H.A., Green, H.J. (eds.) *Physiological Testing of Elite Athletes*. Human Kinetics.
3. Edwards, S. (1993). *The Heart Rate Monitor Book*. Polar Electro Oy.
4. Convergent validity study between Banister's TRIMP and Edwards' TL in young taekwondo athletes. — https://pubmed.ncbi.nlm.nih.gov/21904234/
5. The Validity of the Session Rating of Perceived Exertion Method for Measuring Internal Training Load in Professional Classical Ballet Dancers (2020). *Front Physiol*. — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7240108/
6. Bok, D., Jukić, N., Foster, C. (2021). Validation of session ratings of perceived exertion for quantifying training load in karate kata sessions. *Biol Sport*. — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9536392/
