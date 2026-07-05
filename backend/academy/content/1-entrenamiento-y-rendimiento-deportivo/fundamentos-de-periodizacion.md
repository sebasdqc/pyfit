# Fundamentos de Periodización

## Instrucciones para Claude Code

**Convención de parseo:** el símbolo ✓ al final de una opción marca la respuesta correcta — el seed la parsea y la guarda en `respuestas_correctas`. No modificar esta convención.

**Convención de placeholders:** usar `[PLACEHOLDER: ...]` únicamente en dos casos:
1. Campos de media no producida todavía (`video_url`, `audio_url`) — el placeholder debe describir qué falta, no un texto genérico.
2. Cifras o datos que requieren verificación contra la fuente primaria antes de publicar (esto no debería pasar si se respeta la lista de evidencia de este documento, pero si Claude Code agrega un dato nuevo no presente aquí, debe marcarlo como placeholder en vez de inventarlo).

**Instrucción general — "extiende la base de texto":** cada lección tipo `texto` de este documento es una base de 150-300 palabras, no la lección final. Al extenderla:
- Desarrollar cada punto a 600-900 palabras totales por lección.
- Mantener cada cifra, tamaño de efecto (Cohen's d, SMD) y atribución autor-año EXACTAMENTE como aparece en este documento o en la lista de fuentes al final. No inventar cifras nuevas.
- Si el punto necesita un ejemplo aplicado (ej. una tabla de progresión), se puede construir el ejemplo siempre que no se presente como un hallazgo de un estudio — dejar claro qué es evidencia citada vs. qué es ejemplo ilustrativo propio.
- No mezclar hallazgos de un estudio con los de otro sin distinguir cuál dice qué.

**Instrucción general — "extiende las preguntas del quiz basado en...":** cada lección tipo `quiz` de este documento trae 2-3 preguntas base. Al extenderla a 5 preguntas:
- Añadir al menos 1 pregunta de comprensión aplicada (no solo definición) usando un hallazgo cuantitativo específico de la lista de fuentes (ej. tamaño de muestra, si el resultado fue significativo o no, diferencia entre subgrupos como entrenados vs. no entrenados).
- No construir preguntas sobre datos que no estén respaldados en la lista de fuentes de este documento.
- Mantener el mismo formato de opciones y la marca ✓ en la respuesta correcta.

**Instrucción general — lecciones tipo `video` y `audio`:** el campo de descripción de apoyo es el guion base, no el guion final. Extender manteniendo el mismo nivel de rigor que la lección de texto correspondiente del mismo módulo — no simplificar al punto de perder precisión (ej. no decir "la ciencia dice que..." sin especificar qué estudio).

---

## Módulo 1: Introducción a la periodización deportiva

### Lección 1 — Qué es periodizar (tipo: texto)

La periodización es la división estructurada de un plan de entrenamiento en ciclos con el objetivo de manipular variables como el volumen y la intensidad a lo largo del tiempo. No es una técnica más entre varias — es el marco organizativo sobre el que se apoya casi todo programa de entrenamiento serio. Cuando alguien habla de "un plan de temporada", de "una fase de acumulación" o de "una semana de descarga", está usando, aunque no lo nombre, el vocabulario de la periodización.

**El punto de partida: manipular carga con intención.** La carga de entrenamiento no es una sola variable. Se compone, entre otras cosas, del volumen (cuánto trabajo total se hace: series, repeticiones, distancia, tiempo) y de la intensidad (qué tan exigente es cada esfuerzo: porcentaje del máximo, velocidad, ritmo cardíaco). Periodizar significa decidir de antemano cómo van a subir, bajar o alternarse esas variables en distintos tramos del plan, en lugar de dejar que fluctúen al azar sesión a sesión. La diferencia entre "variar el entrenamiento" y "periodizar" es precisamente la intención y la estructura: no se cambia por cambiar, se cambia porque hay un objetivo fisiológico o práctico detrás de cada cambio.

**Los cuatro propósitos concretos.** Según Grgic et al. (2017), la periodización busca cuatro cosas concretas: mejorar la adherencia al programa de entrenamiento, permitir una progresión constante, ayudar a evitar mesetas (plateaus) de rendimiento, y reducir la ocurrencia y severidad de lesiones. Vale la pena detenerse en que son cuatro objetivos distintos, cada uno con su propia justificación:

- **Adherencia.** Un plan que varía de forma organizada suele ser más sostenible psicológicamente que repetir siempre lo mismo. La estructura ayuda a que la persona no abandone.
- **Progresión constante.** Al gestionar cómo sube la carga, se busca que el estímulo siga siendo suficiente para seguir mejorando, sin excederse.
- **Evitar mesetas.** Cuando el cuerpo se adapta a un estímulo repetido, el progreso se detiene. Cambiar las variables de forma planificada busca renovar el estímulo antes de que la meseta aparezca.
- **Reducir lesiones.** Modular la carga (y programar descargas) busca que la fatiga acumulada no supere la capacidad de recuperación, que es donde aparece buena parte del riesgo de lesión.

Esto es importante: periodizar no es solo "variar el entrenamiento" por variar — cada objetivo tiene una justificación fisiológica y práctica distinta. Un error frecuente es reducir la periodización a "hacer cosas diferentes cada semana"; la variación sin propósito no es periodización, es solo desorden con otro nombre.

**La jerarquía de ciclos.** El plan periodizado se organiza en una jerarquía temporal de ciclos anidados, del más largo al más corto:

- **Macrociclo:** el ciclo de mayor duración, que típicamente abarca un año de entrenamiento (un ciclo anual). Es el marco general de la temporada.
- **Mesociclo:** un bloque de varias semanas dentro del macrociclo, habitualmente enfocado en desarrollar una o pocas capacidades (por ejemplo, un bloque de construcción de base o un bloque orientado a fuerza máxima).
- **Microciclo:** la unidad más corta, que suele corresponder a una semana de entrenamiento y agrupa las sesiones individuales.

La lógica es de encaje: varios microciclos componen un mesociclo, y varios mesociclos componen el macrociclo. Esta estructura permite pensar el entrenamiento en dos escalas al mismo tiempo — la sesión de hoy y hacia dónde apunta la temporada completa. [PLACEHOLDER: confirmar la definición formal exacta de la jerarquía macrociclo/mesociclo/microciclo y sus rangos de duración precisos contra Issurin (2010) antes de publicar.]

**Por qué importa entenderlo desde el principio.** Los módulos siguientes de este curso presentan modelos concretos de periodización — lineal, ondulado y polarizado — y cierran con el diseño de un macrociclo completo. Todos ellos son respuestas distintas a la misma pregunta: ¿cómo manipulo el volumen y la intensidad a lo largo del tiempo para lograr los cuatro propósitos que señala Grgic et al. (2017)? Con ese mapa en mente, cada modelo deja de parecer una receta aislada y se vuelve una decisión de diseño con ventajas y limitaciones que la evidencia ayuda a ponderar.

### Lección 2 — Historia y evidencia científica (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — grabar video de línea de tiempo (~5 décadas de historia de la periodización) con animación de la evolución del modelo clásico a los modelos alternativos; guion base a continuación]

Descripción de apoyo: el modelo tradicional de periodización se estableció hace aproximadamente cinco décadas, basado en la ciencia deportiva soviética (Issurin, 2010). El objetivo del video es doble: dar contexto histórico y sembrar la pregunta crítica que sostiene el resto del curso.

**Apertura (el gancho).** Abrir con la pregunta directa: "¿Por qué seguimos usando un modelo de entrenamiento diseñado hace medio siglo?". No es una pregunta retórica de descrédito — es el punto de partida honesto de la ciencia del entrenamiento moderna. Issurin (2010) describe precisamente esta tensión: el modelo tradicional se estableció sobre bases de la ciencia deportiva soviética hace aproximadamente cinco décadas, y desde entonces el deporte de alto rendimiento cambió radicalmente, pero el modelo tradicional se mantuvo prácticamente igual durante mucho tiempo.

**Desarrollo (la línea de tiempo).** Mostrar una línea de tiempo simple. En un extremo, el origen del modelo tradicional en la ciencia deportiva soviética. En el otro, el presente, con deportistas que entrenan y compiten con demandas muy distintas a las de hace cincuenta años. El punto que debe quedar visualmente claro es el desfase: el deporte evolucionó, el modelo se quedó quieto. Según Issurin (2010), esa inmovilidad generó contradicciones entre el modelo clásico y las demandas del deporte moderno — en particular, el problema de intentar desarrollar demasiadas capacidades simultáneamente, que se retomará en el Módulo 5. Esas contradicciones son exactamente lo que empujó al desarrollo de modelos alternativos: la periodización en bloques (Issurin, 2010), la ondulada y la polarizada, que se cubrirán en los módulos siguientes.

**Precisión que no se debe perder.** Al narrar, evitar el atajo de "la ciencia dice que el modelo viejo es malo". La evidencia no dice eso. Como se verá en los módulos 2 a 4, en varios desenlaces los modelos no muestran diferencias claras entre sí (por ejemplo, Harries et al., 2015, no hallaron diferencias significativas entre periodización lineal y ondulada en fuerza). El mensaje correcto es más matizado: el modelo tradicional no es "malo", pero tampoco es la única opción, y la elección entre modelos depende del contexto.

**Cierre.** Conectar con que este curso cubre tanto el modelo clásico como las alternativas modernas y, sobre todo, lo que dice la evidencia sobre cada una. Cerrar invitando a no adoptar ningún modelo por tradición ni por moda, sino por lo que muestran los estudios que se revisarán a continuación.

### Lección 3 — Fundamentos y propósito (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — grabar episodio de audio en formato conversacional (~4-6 min); guion base a continuación]

Descripción de apoyo: formato conversacional, tono cercano. La meta del episodio es que quien escucha entienda, sin tecnicismos, la diferencia entre "entrenar sin plan" y "entrenar periodizado", y termine con los cuatro propósitos de periodizar bien fijados.

**El contraste central, en dos personajes.** Contar la diferencia con un ejemplo cotidiano y concreto. Presentar dos personas hipotéticas (dejar claro que es un ejemplo ilustrativo, no un caso de estudio):

- La primera entrena siempre igual: el mismo peso, las mismas repeticiones, el mismo circuito, semana tras semana. Al principio progresa, pero al cabo de un tiempo el progreso se detiene. Se estanca. Se aburre. Duda de si vale la pena seguir. Ese estancamiento no es mala suerte: es lo que ocurre cuando el cuerpo se adapta a un estímulo que ya no cambia.
- La segunda varía su carga con intención: hay semanas de más volumen, semanas de más intensidad, semanas de descarga. No cambia al azar — sigue un plan. Y por eso sigue progresando y sostiene el hábito en el tiempo.

**La idea que hay que transmitir.** La diferencia entre ambas no es cuánto se esfuerzan, sino que una organiza su carga y la otra no. Ese es el corazón de periodizar: manipular volumen e intensidad a lo largo del tiempo con un propósito, no dejarlas fijas ni al azar. Conviene aclarar en voz alta que periodizar no significa complicar el entrenamiento — significa darle estructura.

**Cierre (los cuatro propósitos).** Cerrar reforzando explícitamente los cuatro propósitos de periodizar según Grgic et al. (2017), enumerándolos con claridad para que queden como el "para llevar" del episodio: (1) mejorar la adherencia al entrenamiento, (2) permitir progresión constante, (3) evitar mesetas de rendimiento, y (4) reducir la ocurrencia y severidad de lesiones. Rematar recordando que los personajes del ejemplo son ilustrativos, pero los cuatro propósitos vienen de una revisión sistemática con meta-análisis, no de una opinión — y que los siguientes módulos muestran los modelos concretos con los que se logran.

### Lección 4 — Evaluación inicial (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
¿Qué define un macrociclo?
- [a] Un bloque de 1 semana
- [b] Un ciclo anual de entrenamiento ✓
- [c] Una sesión de alta intensidad
- [d] Un período de descanso

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
Según Grgic et al. (2017), ¿cuál NO es uno de los propósitos centrales de periodizar?
- [a] Mejorar la adherencia al entrenamiento
- [b] Evitar mesetas de rendimiento
- [c] Garantizar hipertrofia superior a cualquier programa no periodizado ✓
- [d] Reducir la ocurrencia y severidad de lesiones

#### Pregunta 3 (tipo: verdadero_falso, puntos: 1)
El modelo tradicional de periodización se originó en la ciencia deportiva soviética hace aproximadamente cinco décadas.
- [V] Verdadero ✓
- [F] Falso

#### Pregunta 4 (tipo: opcion_multiple, puntos: 2)
Según Grgic et al. (2017), ¿cuáles de los siguientes son propósitos centrales de periodizar? (marca todos los que correspondan)
- [a] Mejorar la adherencia al programa de entrenamiento ✓
- [b] Permitir progresión constante y evitar mesetas de rendimiento ✓
- [c] Reducir la ocurrencia y severidad de lesiones ✓
- [d] Eliminar por completo la necesidad de días de descanso

#### Pregunta 5 (tipo: opcion_unica, puntos: 1)
En la jerarquía temporal de ciclos, ¿cuál es el orden correcto de mayor a menor duración?
- [a] Microciclo > mesociclo > macrociclo
- [b] Mesociclo > macrociclo > microciclo
- [c] Macrociclo > mesociclo > microciclo ✓
- [d] Macrociclo > microciclo > mesociclo

---

## Módulo 2: Modelo de periodización lineal

### Lección 1 — Qué es la periodización lineal (tipo: texto)

La periodización lineal (LP) se caracteriza por iniciar con volúmenes altos e intensidades bajas, progresando gradualmente hacia volúmenes bajos e intensidades altas a lo largo del ciclo. Es el modelo más clásico y el más estudiado en la literatura de fuerza, y suele ser el primero que se enseña porque su lógica es intuitiva: se empieza construyendo una base amplia de trabajo y se termina afilando la intensidad hacia el pico de rendimiento.

**La forma de la progresión.** La palabra "lineal" describe la tendencia general del ciclo: la intensidad sube de forma más o menos sostenida mientras el volumen baja, en una relación inversa. En las primeras semanas se acumula mucho trabajo con cargas moderadas; hacia el final se hace poco trabajo con cargas altas. La idea subyacente es que el volumen inicial genera las adaptaciones estructurales y de base, y la intensidad final las convierte en fuerza expresable cerca del máximo. Es un modelo que "converge" hacia una capacidad al terminar el bloque, lo que lo hace atractivo cuando hay una fecha objetivo clara.

**Ejemplo ilustrativo (no es un hallazgo de estudio).** Para hacer tangible la progresión, se puede construir un bloque de 12 semanas en cuatro fases mensuales. Los porcentajes de 1RM que siguen son un ejemplo pedagógico propio para ilustrar la forma del modelo — no provienen de ningún estudio de la lista de fuentes y no deben citarse como evidencia:

- **Semanas 1-3 (hipertrofia/base):** volumen alto, intensidad baja — por ejemplo, series de 10-12 repeticiones alrededor del 65-70% de 1RM.
- **Semanas 4-6 (fuerza-resistencia):** el volumen empieza a bajar y la intensidad a subir — por ejemplo, series de 8 repeticiones alrededor del 72-77% de 1RM.
- **Semanas 7-9 (fuerza):** volumen moderado-bajo, intensidad alta — por ejemplo, series de 4-6 repeticiones alrededor del 80-85% de 1RM.
- **Semanas 10-12 (fuerza máxima/pico):** volumen bajo, intensidad muy alta — por ejemplo, series de 2-3 repeticiones alrededor del 87-92% de 1RM.

Se insiste: estos números son un andamiaje para visualizar el modelo, no un dato de la evidencia.

**Qué dice la evidencia de mayor calidad.** La evidencia de mayor calidad disponible es un meta-análisis de Harries, Lubans y Callister (2015, Journal of Strength and Conditioning Research), que revisó sistemáticamente las bases de datos MEDLINE, SCOPUS y SPORTDiscus y encontró 17 estudios elegibles con 510 participantes en total. El hallazgo central: no se encontraron diferencias significativas entre periodización lineal y ondulada en fuerza de tren superior ni inferior.

Este resultado hay que leerlo con cuidado para no sacar la conclusión equivocada. "No hubo diferencias significativas" **no** significa que la periodización lineal no funcione — significa que, con la evidencia analizada, no se pudo establecer que un modelo sea superior al otro para ganancias de fuerza general. Es un dato metodológicamente importante: la superioridad de un modelo sobre otro para fuerza general no está establecida con la evidencia actual. Ambos modelos producen ganancias; la pregunta de cuál es "mejor" no tiene, a este nivel, una respuesta a favor de ninguno.

**Consecuencia práctica.** Si la LP no es demostrablemente inferior ni superior a la ondulada para fuerza general (Harries et al., 2015), entonces la decisión de usarla puede apoyarse en otros criterios: su claridad conceptual, la facilidad para planificar hacia una fecha de competencia, la preferencia del atleta y su adherencia al esquema. Para un principiante, en particular, la simplicidad de un bloque lineal bien estructurado es una ventaja práctica real, aunque no sea una superioridad fisiológica demostrada. En el Módulo 3 se verá cómo ese panorama se matiza cuando entra en juego el nivel de entrenamiento del atleta.

### Lección 2 — Qué dice la evidencia sobre LP (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — grabar video con gráfico del diseño del meta-análisis (17 estudios, 510 participantes, 3 bases de datos) y visualización de "diferencia no significativa"; guion base a continuación]

Descripción de apoyo: el objetivo del video es que se entienda qué respalda a la LP y, sobre todo, cómo interpretar correctamente un resultado de "sin diferencias significativas".

**Mostrar el diseño del estudio en pantalla.** Presentar visualmente el diseño del meta-análisis de Harries, Lubans y Callister (2015): una revisión sistemática que buscó en tres bases de datos — MEDLINE, SCOPUS y SPORTDiscus — y terminó incluyendo 17 estudios con un total de 510 participantes. Conviene que estas tres cifras (3 bases, 17 estudios, 510 participantes) aparezcan en pantalla, porque transmiten que no se trata de un solo experimento pequeño sino de una síntesis de la literatura disponible.

**Explicar "no hubo diferencias significativas" sin distorsionarlo.** Este es el corazón del video. Harries et al. (2015) no encontraron diferencias significativas entre periodización lineal y ondulada en fuerza de tren superior ni inferior. Hay que dedicar tiempo a aclarar qué significa y qué no significa: no es que la LP "no funcione" — es que no se demostró que sea superior ni inferior a la ondulada para fuerza. Una buena forma visual es mostrar dos barras de ganancia de fuerza prácticamente iguales, con la idea de que la diferencia entre ellas no alcanza significación estadística. Evitar en la narración cualquier frase del tipo "la lineal quedó atrás" o "la ondulada ganó", porque contradiría directamente el hallazgo.

**Cierre.** Cerrar con la idea de que, si la evidencia no consagra a un modelo como superior para fuerza general, la elección entre modelos puede depender más de la adherencia y la preferencia del atleta que de una superioridad fisiológica pura. Anticipar que el Módulo 3 mostrará un matiz importante: cuando se separa por nivel de entrenamiento del atleta, el panorama cambia (Moesgaard et al., 2022).

### Lección 3 — Aplicando LP en la práctica (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — grabar episodio narrado del caso de un atleta principiante en un bloque LP de 12 semanas; guion base a continuación]

Descripción de apoyo: caso narrado, mes a mes, de un atleta principiante siguiendo un bloque LP de 12 semanas. El objetivo es que la progresión de volumen e intensidad "se sienta" a través de la historia, conectando con lo explicado en la lección de texto. Aclarar al oyente que el personaje es ilustrativo.

**Mes 1 — la base.** Presentar al atleta: alguien que recién empieza y quiere ganar fuerza para una fecha objetivo a tres meses. En el primer mes hace mucho volumen con cargas moderadas: muchas repeticiones, pesos que le permiten mantener buena técnica. Narrar la sensación de "hacer mucho trabajo sin llegar nunca al fallo extremo". Explicar que esta base es la que sostiene lo que vendrá después.

**Mes 2 — el volumen baja, la intensidad sube.** El atleta nota que las repeticiones por serie bajan y el peso sube. Empieza a sentir esfuerzos más exigentes pero menos acumulación de trabajo total. Aquí conviene conectar con la lección de texto: la LP se caracteriza por iniciar con alto volumen/baja intensidad y progresar hacia bajo volumen/alta intensidad (definición del modelo, no un dato de estudio).

**Mes 3 — el pico.** Pocas repeticiones, cargas altas, foco en expresar fuerza cerca del máximo. El atleta llega a su fecha objetivo habiendo recorrido toda la curva del modelo.

**El matiz honesto para el cierre.** Cerrar sin sobrevender el modelo. Recordar que, según el meta-análisis de Harries, Lubans y Callister (2015) — 17 estudios, 510 participantes —, no se encontraron diferencias significativas entre periodización lineal y ondulada en fuerza. Es decir: este bloque LP funciona para el principiante del caso, pero no porque la LP sea mágicamente superior, sino porque una progresión organizada y sostenida da resultados. Rematar señalando que para un principiante la simplicidad de la LP es una ventaja práctica (adherencia, claridad), aunque la evidencia no le atribuya superioridad fisiológica frente a la ondulada.

### Lección 4 — Evaluación de periodización lineal (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
La periodización lineal se caracteriza por...
- [a] Alternar volumen e intensidad cada semana
- [b] Iniciar con alto volumen/baja intensidad y progresar a bajo volumen/alta intensidad ✓
- [c] Mantener siempre la misma carga
- [d] Usarse solo en deportes de resistencia

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
Según el meta-análisis de Harries, Lubans y Callister (2015), ¿qué se encontró al comparar LP vs. periodización ondulada en fuerza?
- [a] LP fue claramente superior
- [b] La ondulada fue claramente superior
- [c] No hubo diferencias significativas entre ambos modelos ✓
- [d] El estudio no pudo comparar ambos modelos

#### Pregunta 3 (tipo: verdadero_falso, puntos: 1)
El meta-análisis de Harries et al. (2015) incluyó 17 estudios y 510 participantes en total.
- [V] Verdadero ✓
- [F] Falso

#### Pregunta 4 (tipo: opcion_unica, puntos: 1)
El meta-análisis de Harries, Lubans y Callister (2015) realizó su búsqueda sistemática en tres bases de datos. ¿Cuáles fueron?
- [a] PubMed, Google Scholar y Cochrane
- [b] MEDLINE, SCOPUS y SPORTDiscus ✓
- [c] Web of Science, EMBASE y CINAHL
- [d] MEDLINE, PsycINFO y ERIC

#### Pregunta 5 (tipo: verdadero_falso, puntos: 1)
Que Harries et al. (2015) no hallaran diferencias significativas entre LP y periodización ondulada significa que la periodización lineal no produce ganancias de fuerza.
- [V] Verdadero
- [F] Falso ✓

---

## Módulo 3: Modelo de periodización ondulada

### Lección 1 — Qué es la periodización ondulada (tipo: texto)

La periodización ondulada (UP) organiza las cargas de entrenamiento alternando volumen e intensidad con mayor frecuencia que el modelo lineal — las variaciones ocurren dentro de la misma semana. En lugar de una curva que asciende de forma sostenida a lo largo de meses (como en la LP del módulo anterior), la UP produce un patrón de "olas": días o semanas de alto volumen se intercalan con días o semanas de alta intensidad, en ciclos cortos que se repiten.

**Dos variantes según la frecuencia de ajuste.** Según su frecuencia de ajuste, la periodización ondulada se clasifica en:

- **Ondulada diaria (DUP):** las variaciones de volumen e intensidad ocurren día a día. Un microciclo semanal puede tener, por ejemplo, un día de fuerza (pocas repeticiones, alta carga), otro de hipertrofia (repeticiones moderadas, carga moderada) y otro de resistencia muscular (muchas repeticiones, carga baja).
- **Ondulada semanal (WUP):** las variaciones ocurren de una semana a la siguiente, manteniendo cada semana un carácter más homogéneo pero cambiando el énfasis entre semanas.

**Ejemplo ilustrativo de microciclo DUP (no es un hallazgo de estudio).** Para visualizar cómo "ondula" la carga día a día, se puede construir una semana de ejemplo. Los porcentajes de 1RM son un ejemplo pedagógico propio, no un dato de la lista de fuentes:

- **Lunes (fuerza):** 4-6 reps alrededor del 82-87% de 1RM.
- **Miércoles (hipertrofia):** 8-10 reps alrededor del 70-75% de 1RM.
- **Viernes (resistencia muscular):** 12-15 reps alrededor del 60-65% de 1RM.

Se reitera: estos números ilustran la variación diaria del modelo, no provienen de ningún estudio citado.

**La evidencia matiza el panorama del módulo anterior.** En el Módulo 2 se vio que Harries et al. (2015) no hallaron diferencias significativas entre LP y UP en fuerza. La evidencia más reciente añade un matiz clave. Un meta-análisis de Moesgaard et al. (2022, Sports Medicine) sobre programas con volumen equiparado encontró que, aunque LP y UP no muestran diferencias claras en hipertrofia muscular, sí aparece un hallazgo relevante en fuerza máxima: los individuos entrenados se benefician más de las variaciones diarias o semanales (UP) que los individuos no entrenados, cuando el objetivo es fuerza máxima.

El detalle metodológico importa: Moesgaard et al. (2022) trabajó con programas de **volumen equiparado**, es decir, comparó modelos igualando la cantidad total de trabajo, de modo que las diferencias observadas no se explican simplemente porque un grupo hiciera más volumen que otro. La conclusión práctica es que la superioridad de UP sobre LP **no es universal** — depende del nivel de entrenamiento del atleta. Para fuerza máxima, la UP parece aportar más a quien ya está entrenado que a quien recién empieza.

**Un contrapunto sobre hipertrofia.** Por otro lado, Grgic et al. (2017, PeerJ) comparó específicamente LP vs. DUP en hipertrofia muscular y no encontró diferencias significativas entre ambos modelos. Conviene no mezclar los dos hallazgos: Moesgaard et al. (2022) habla del efecto moderador del nivel de entrenamiento sobre la **fuerza máxima**, mientras que Grgic et al. (2017, PeerJ) apunta específicamente a que, para **hipertrofia**, LP y DUP no se diferencian de forma significativa. Puestos juntos, dibujan un cuadro coherente: para ganar músculo, la elección entre lineal y ondulada parece poco determinante; para maximizar fuerza en un atleta ya entrenado, la ondulación tiene respaldo.

### Lección 2 — Qué dice la evidencia sobre UP (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — grabar video que contraste visualmente DUP (variación día a día) vs. WUP (variación semana a semana) y muestre el efecto moderador del nivel de entrenamiento; guion base a continuación]

Descripción de apoyo: el video tiene dos tareas — diferenciar visualmente las dos variantes de UP y comunicar con precisión el hallazgo moderado de Moesgaard et al. (2022).

**Diferenciar DUP y WUP en pantalla.** Mostrar visualmente la diferencia entre DUP (variación día a día) y WUP (variación semana a semana). Una buena representación es un calendario: en la DUP, cada día de la semana tiene una "altura de carga" distinta (fuerza, hipertrofia, resistencia); en la WUP, los días de una misma semana son parecidos entre sí, y lo que cambia es el bloque de una semana a la siguiente. La idea a fijar: ambas "ondulan", pero a distinta frecuencia.

**Comunicar el hallazgo de Moesgaard et al. (2022) con precisión.** Explicar que este meta-análisis trabajó sobre programas con volumen equiparado y que su hallazgo clave es un efecto moderador: el nivel de entrenamiento del atleta modera el efecto de la UP. En concreto, cuando el objetivo es fuerza máxima, los individuos entrenados se benefician más de las variaciones diarias o semanales (UP) que los individuos no entrenados. Es decir, la UP parece favorecer más a los atletas entrenados que buscan fuerza máxima, no a los principiantes. Para hipertrofia, en cambio, Moesgaard et al. (2022) no reporta diferencias claras entre LP y UP — importante no atribuir a la hipertrofia el efecto que corresponde a la fuerza máxima.

**Evitar la sobregeneralización.** El error que el video debe desactivar es concluir "la ondulada es mejor". No lo es en general: es mejor en una condición específica (atletas entrenados, objetivo fuerza máxima). Reforzar que esto es coherente con el Módulo 2, donde Harries et al. (2015) no hallaron diferencias significativas entre LP y UP en fuerza al analizar poblaciones mezcladas — separar por nivel de entrenamiento es lo que hace emerger la diferencia.

**Cierre.** Cerrar conectando: el mensaje del curso no es "elige ondulada" sino "elige según el atleta y el objetivo".

### Lección 3 — Aplicando UP en la práctica (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — grabar episodio narrado que contraste a un atleta entrenado y a un principiante usando el mismo programa DUP; guion base a continuación]

Descripción de apoyo: caso narrado contrastando a dos atletas (uno entrenado, uno principiante) usando el mismo programa DUP, y por qué la evidencia sugiere que no deberían esperar el mismo tipo de beneficio. Aclarar que los personajes son ilustrativos.

**Presentar a los dos protagonistas.** Uno es un atleta entrenado, con años de trabajo de fuerza a la espalda, que quiere maximizar su fuerza máxima. El otro es un principiante que apenas lleva unas semanas entrenando. Ambos van a seguir exactamente el mismo programa de ondulación diaria (DUP): mismos días, misma alternancia de fuerza, hipertrofia y resistencia muscular durante la semana.

**El giro basado en evidencia.** Narrar la expectativa ingenua ("si hacen lo mismo, deberían ganar lo mismo") y luego introducir el matiz que aporta Moesgaard et al. (2022): en programas con volumen equiparado, cuando el objetivo es fuerza máxima, los individuos entrenados se benefician más de las variaciones diarias o semanales (UP) que los individuos no entrenados. Es decir, el atleta entrenado del caso es precisamente el perfil que la evidencia sugiere que aprovecha mejor la ondulación para fuerza máxima; el principiante no debería esperar el mismo tipo de ventaja por el solo hecho de ondular.

**No prometer de más al principiante.** Dejar claro que esto no significa que el principiante no progrese — progresa, y mucho, casi con cualquier programa organizado. Significa que el beneficio *diferencial* de elegir UP sobre un esquema lineal, para fuerza máxima, es lo que la evidencia asocia sobre todo a los entrenados. Se puede reforzar con el otro hallazgo: para hipertrofia, Grgic et al. (2017, PeerJ) no encontró diferencias significativas entre LP y DUP, así que si el principiante buscara sobre todo ganar músculo, la elección del modelo importa aún menos.

**Cierre.** Cerrar con la moraleja práctica: el mismo programa no rinde igual en manos distintas, y por eso el nivel de entrenamiento es una variable de diseño, no un detalle.

### Lección 4 — Evaluación de periodización ondulada (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
La periodización ondulada diaria (DUP) se diferencia de la lineal en que...
- [a] Nunca varía la intensidad
- [b] Varía volumen e intensidad dentro de la misma semana ✓
- [c] Solo se usa en deportes de equipo
- [d] Elimina por completo los días de baja intensidad

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
Según Moesgaard et al. (2022), ¿en qué población se observó mayor beneficio de UP sobre LP para fuerza máxima?
- [a] Atletas no entrenados
- [b] Atletas entrenados ✓
- [c] No se observó diferencia en ninguna población
- [d] Solo en deportes de resistencia

#### Pregunta 3 (tipo: verdadero_falso, puntos: 1)
Grgic et al. (2017) encontraron diferencias significativas entre LP y DUP en medidas de hipertrofia muscular.
- [V] Verdadero
- [F] Falso ✓

#### Pregunta 4 (tipo: opcion_unica, puntos: 1)
El meta-análisis de Moesgaard et al. (2022) analizó programas con una característica metodológica clave que evita que las diferencias se expliquen por hacer más trabajo total. ¿Cuál era?
- [a] Programas con volumen equiparado ✓
- [b] Programas sin ningún día de descanso
- [c] Programas exclusivamente de tren inferior
- [d] Programas de una sola semana de duración

#### Pregunta 5 (tipo: opcion_multiple, puntos: 2)
Combinando los hallazgos de Moesgaard et al. (2022) y Grgic et al. (2017, PeerJ), ¿cuáles de las siguientes afirmaciones están respaldadas por la evidencia? (marca todas las que correspondan)
- [a] Para fuerza máxima, los atletas entrenados se benefician más de la UP que los no entrenados ✓
- [b] LP y UP no muestran diferencias claras en hipertrofia muscular ✓
- [c] Para hipertrofia, LP y DUP no difieren de forma significativa ✓
- [d] La superioridad de UP sobre LP para fuerza máxima es universal e independiente del nivel del atleta

---

## Módulo 4: Modelo de periodización polarizada

### Lección 1 — Qué es la periodización polarizada (tipo: texto)

El modelo polarizado (POL) es distinto a los dos anteriores porque nace principalmente de la investigación en deportes de resistencia, no de fuerza. Mientras que la lineal y la ondulada se estudiaron sobre todo en el contexto del entrenamiento de fuerza, la periodización polarizada se refiere a cómo se distribuye la **intensidad** del trabajo de resistencia a lo largo del entrenamiento. Se caracteriza por concentrar el entrenamiento en dos zonas de intensidad — mayormente baja intensidad, con una porción específica de alta intensidad, y muy poco tiempo en la zona intermedia (la "zona de umbral"). De ahí el nombre "polarizado": el trabajo se acumula en los dos polos y se evita el centro.

**Las tres zonas y la distribución típica.** Según Stöggl y Sperlich (2015, Frontiers in Physiology), la distribución típica observada en atletas de resistencia bien entrenados y de élite ronda:

- **75-80% del volumen en baja intensidad (LIT, low-intensity training).**
- **0-5% en intensidad media (MIT, middle-intensity training)** — la zona de umbral, deliberadamente escasa.
- **15-20% en alta intensidad (HIT, high-intensity training).**

Es útil retener que la mayor parte del volumen (75-80%) transcurre en baja intensidad, y que la zona intermedia queda casi vacía (0-5%). Esta es la firma del modelo polarizado según Stöggl y Sperlich (2015): mucho fácil, algo de muy duro, casi nada de "medio".

**Ejemplo ilustrativo de sesiones por zona (no es un hallazgo de estudio).** Para aterrizar las tres zonas, se puede describir cómo se ve cada una en la práctica. Estos ejemplos son ilustrativos propios, no datos de la lista de fuentes:

- **LIT:** rodajes largos y cómodos, a ritmo conversacional, donde se puede hablar sin ahogarse.
- **MIT (zona de umbral):** esfuerzos sostenidos "incómodos pero manejables"; en POL esta zona se minimiza.
- **HIT:** intervalos cortos y muy exigentes, cerca del máximo.

**La evidencia de mayor calidad y más reciente.** El estudio de referencia es un meta-análisis de Silva Oliveira, Boppre y Fonseca (2024, Sports Medicine), que siguió lineamientos PRISMA y evaluó la certeza de la evidencia con el sistema GRADE (dos marcas de rigor metodológico que conviene mencionar, porque elevan la confianza en sus conclusiones). Su hallazgo principal:

- POL mostró superioridad para mejorar el VO2peak — **diferencia de medias estandarizada = 0.24; p = 0.040; 11 estudios, n = 284; evidencia de alta certeza**.
- Pero esta superioridad **solo apareció en intervenciones cortas (menos de 12 semanas) y en atletas altamente entrenados**.
- Para otras medidas de rendimiento (time-trial, tiempo hasta el agotamiento, velocidad/potencia en el segundo umbral), POL **no mostró superioridad clara** sobre otros modelos de distribución de intensidad.

**Cómo leer estas cifras.** Una diferencia de medias estandarizada de 0.24 es un tamaño de efecto pequeño, y la significación (p = 0.040) queda justo por debajo del umbral convencional de 0.05. Sumado a que el beneficio se limita a un desenlace concreto (VO2peak), en una duración concreta (menos de 12 semanas) y en un perfil concreto (atletas altamente entrenados), la conclusión honesta es que POL tiene una ventaja **real pero acotada**, no una superioridad general. Es un contraste deliberado con la tentación de vender el modelo polarizado como "el mejor para resistencia": la evidencia de alta certeza lo respalda solo dentro de límites bien definidos. Fuera de esos límites — intervenciones largas, atletas menos entrenados, otras medidas de rendimiento — no hay respaldo de superioridad.

### Lección 2 — Qué dice la evidencia sobre POL (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — grabar video con visualización de las tres zonas de intensidad y la distribución 75-80/0-5/15-20, más los límites del hallazgo del meta-análisis 2024; guion base a continuación]

Descripción de apoyo: el video debe mostrar la estructura del modelo y, con especial cuidado, comunicar que su superioridad es condicionada.

**Mostrar la distribución en pantalla.** Representar visualmente las tres zonas de intensidad y la distribución 75-80/0-5/15-20 (Stöggl & Sperlich, 2015). Una barra apilada o tres columnas funcionan bien: una columna alta para LIT (75-80%), una casi inexistente para MIT (0-5%) y una intermedia para HIT (15-20%). Etiquetar cada zona (LIT, MIT, HIT) y dejar claro que estos porcentajes describen lo observado en atletas de resistencia bien entrenados y de élite, según Stöggl y Sperlich (2015).

**Explicar el hallazgo condicionado del meta-análisis de 2024.** Presentar el meta-análisis de Silva Oliveira, Boppre y Fonseca (2024) señalando primero su rigor: siguió lineamientos PRISMA y evaluó la certeza con GRADE. Luego mostrar el hallazgo con sus tres condiciones bien visibles: POL fue superior para VO2peak (diferencia de medias estandarizada = 0.24; p = 0.040; 11 estudios, n = 284; alta certeza), pero **solo** en intervenciones cortas (menos de 12 semanas) y **solo** en atletas altamente entrenados. Y para otras medidas — time-trial, tiempo hasta el agotamiento, velocidad/potencia en el segundo umbral — no hubo superioridad clara.

**El mensaje que no se debe perder.** La superioridad de POL depende de la duración de la intervención y del nivel del atleta — no es una superioridad universal. Es fundamental no reducir esto a "polarizado es mejor". El video debe dejar la sensación de una ventaja modesta (efecto pequeño de 0.24) y acotada, respaldada por evidencia de alta certeza dentro de sus límites. Cerrar anticipando que en el Módulo 5 se verá cómo integrar este modelo, junto a los otros, dentro de un macrociclo teniendo en cuenta precisamente la duración de las fases.

### Lección 3 — Aplicando POL en la práctica (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — grabar episodio narrado de un atleta de resistencia altamente entrenado en un bloque corto polarizado, contrastado con un bloque más largo; guion base a continuación]

Descripción de apoyo: caso narrado de un atleta de resistencia altamente entrenado en un bloque corto (menos de 12 semanas) usando distribución polarizada, contrastado con qué pasaría en un bloque más largo según la evidencia. Aclarar que el personaje es ilustrativo, pero que las condiciones del beneficio vienen del meta-análisis 2024.

**El caso: el perfil ideal, en el momento ideal.** Presentar a una atleta de resistencia altamente entrenada que encara un bloque corto — menos de 12 semanas — con distribución polarizada: la mayor parte del volumen en baja intensidad (LIT), una porción de alta intensidad (HIT) y casi nada en la zona de umbral (MIT), siguiendo la distribución 75-80/0-5/15-20 descrita por Stöggl y Sperlich (2015). Narrar que este perfil — altamente entrenada — y esta duración — menos de 12 semanas — son exactamente las dos condiciones en las que Silva Oliveira, Boppre y Fonseca (2024) observaron superioridad de POL para mejorar el VO2peak (diferencia de medias estandarizada = 0.24; p = 0.040; 11 estudios, n = 284; alta certeza).

**El contraste: cambiar las condiciones.** Preguntar en voz alta qué pasaría si se estirara el mismo esquema a un bloque más largo, más allá de las 12 semanas. Según el hallazgo, la superioridad de POL apareció solo en intervenciones cortas; en un bloque largo la evidencia ya no respalda esa ventaja. Igualmente, si la atleta no fuera altamente entrenada, tampoco se cumpliría la condición. Y aunque su VO2peak mejorara, para otras medidas — time-trial, tiempo hasta el agotamiento, velocidad/potencia en el segundo umbral — POL no mostró superioridad clara.

**La moraleja aplicada.** Cerrar con una lección de diseño: POL no es una plantilla para copiar y pegar en cualquier atleta y cualquier fase. Es una herramienta con un rango de aplicación bien definido — bloques cortos, atletas muy entrenados, objetivo VO2peak — respaldado por evidencia de alta certeza dentro de ese rango. Usarlo fuera de él es usarlo sin respaldo. Este es el puente natural hacia el Módulo 5, donde la duración de cada fase será una decisión explícita del macrociclo.

### Lección 4 — Evaluación de periodización polarizada (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
La distribución de intensidad polarizada se caracteriza por...
- [a] Concentrarse principalmente en la zona de umbral
- [b] Alto volumen en baja intensidad, bajo volumen en alta intensidad, y muy poco en zona media ✓
- [c] Distribuir el volumen equitativamente entre las tres zonas
- [d] Evitar por completo la intensidad baja

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
Según el meta-análisis de Silva Oliveira, Boppre y Fonseca (2024), ¿en qué condiciones se observó superioridad de POL sobre otros modelos para VO2peak?
- [a] En cualquier duración de intervención y cualquier nivel de atleta
- [b] Solo en intervenciones largas (más de 12 semanas)
- [c] En intervenciones cortas (menos de 12 semanas) y en atletas altamente entrenados ✓
- [d] Nunca se observó superioridad

#### Pregunta 3 (tipo: verdadero_falso, puntos: 1)
Según Stöggl y Sperlich (2015), la distribución típica de atletas de resistencia bien entrenados ronda 75-80% de baja intensidad.
- [V] Verdadero ✓
- [F] Falso

#### Pregunta 4 (tipo: opcion_unica, puntos: 1)
En el meta-análisis de Silva Oliveira, Boppre y Fonseca (2024), la mejora de VO2peak con POL tuvo una diferencia de medias estandarizada de 0.24 (p = 0.040), a partir de 11 estudios y n = 284, con evidencia de alta certeza (GRADE). ¿Cómo se interpreta mejor este resultado?
- [a] Un efecto pequeño pero estadísticamente significativo, respaldado por evidencia de alta certeza dentro de sus condiciones ✓
- [b] Un efecto grande que demuestra la superioridad universal de POL
- [c] Un resultado no significativo y por tanto irrelevante
- [d] Un efecto basado en un único estudio de baja certeza

#### Pregunta 5 (tipo: verdadero_falso, puntos: 1)
Según Silva Oliveira, Boppre y Fonseca (2024), POL mostró superioridad clara sobre otros modelos también en time-trial, tiempo hasta el agotamiento y velocidad/potencia en el segundo umbral.
- [V] Verdadero
- [F] Falso ✓

---

## Módulo 5: Diseño de un macrociclo completo

### Lección 1 — Integrando los modelos en un macrociclo (tipo: texto)

Un macrociclo bien diseñado no tiene por qué usar un solo modelo de forma pura durante toda la temporada. Los módulos anteriores presentaron tres modelos — lineal, ondulado y polarizado — como si fueran opciones excluyentes, pero en la práctica del alto rendimiento suelen combinarse a lo largo del año. Este módulo integra lo aprendido: no se trata de elegir "el mejor modelo", sino de secuenciar el modelo adecuado en el momento adecuado.

**El problema histórico que dio origen a esta idea.** Issurin (2010) ya señalaba que las contradicciones del modelo tradicional llevaron al desarrollo de modelos alternativos. La contradicción central era intentar desarrollar muchas capacidades simultáneamente: cuando un plan pretende mejorar fuerza, resistencia, potencia y técnica todo a la vez y todo el tiempo, ninguna de esas capacidades recibe un estímulo suficientemente concentrado. Esto llevó al desarrollo de la periodización en bloques (Issurin, 2010), que secuencia mesociclos especializados enfocados en pocas capacidades a la vez, en vez de desarrollarlas todas en paralelo. La lógica de bloques es, en el fondo, la misma que ordena todo este módulo: concentrar el estímulo, no dispersarlo.

**Cómo se traduce en la práctica.** En términos concretos, un macrociclo anual puede combinar:

- **Bloques iniciales con enfoque más lineal (construcción de base):** al principio de la temporada, cuando se busca acumular una base amplia de trabajo, un enfoque lineal —alto volumen que progresa hacia mayor intensidad— es una elección clara y sostenible.
- **Bloques intermedios con ondulación:** para atletas ya entrenados que buscan maximizar fuerza. Esto se apoya en el matiz del Módulo 3: según Moesgaard et al. (2022), en programas con volumen equiparado, los individuos entrenados se benefician más de las variaciones diarias o semanales (UP) que los no entrenados cuando el objetivo es fuerza máxima. Por eso la ondulación tiene más sentido en fases intermedias/avanzadas, con un atleta que ya construyó base.
- **Fases con distribución polarizada de intensidad antes de competencias clave (si el deporte es de resistencia):** aquí entra el matiz del Módulo 4. Como Silva Oliveira, Boppre y Fonseca (2024) observaron la superioridad de POL para VO2peak solo en intervenciones cortas (menos de 12 semanas) y en atletas altamente entrenados, una fase polarizada corta y bien ubicada antes de una competencia importante es coherente con la evidencia; estirarla más allá de 12 semanas, no.

**Ejemplo ilustrativo de macrociclo anual (integración práctica, no un hallazgo de estudio).** La secuencia que sigue es una integración práctica de los tres módulos anteriores, construida como ejemplo pedagógico propio — no representa el hallazgo de ningún estudio específico de la lista de fuentes:

- **Meses 1-3 (mesociclo de base, enfoque lineal):** microciclos con alto volumen inicial que progresa hacia mayor intensidad; objetivo, construir base.
- **Meses 4-6 (mesociclo de fuerza, enfoque ondulado):** una vez que el atleta ya está entrenado, introducir ondulación (DUP/WUP) para maximizar fuerza máxima.
- **Meses 7-9 (mesociclo específico):** énfasis en las capacidades propias del deporte; si es de resistencia, empezar a orientar la distribución de intensidad.
- **Meses 10-12 (mesociclo de pico/precompetitivo):** en deportes de resistencia, una fase polarizada corta (menos de 12 semanas) antes de la competencia clave, respetando las condiciones en que la evidencia la respalda.

Cada mesociclo de este ejemplo dura del orden de un trimestre y se subdivide en microciclos semanales; las duraciones concretas son ilustrativas y deben ajustarse al calendario real de competencias.

**La regla que resume el módulo.** Un macrociclo bien diseñado puede combinar distintos modelos según la fase, el nivel del atleta y la duración de la intervención. Estas tres variables — fase, nivel, duración — no son adornos: son exactamente los factores que la evidencia de los módulos anteriores identificó como decisivos (nivel de entrenamiento en Moesgaard et al., 2022; duración de la intervención en Silva Oliveira, Boppre y Fonseca, 2024). Diseñar un macrociclo es, en gran medida, tomar esas tres decisiones con criterio.

### Lección 2 — Cómo se estructura un macrociclo en la práctica (tipo: video)

video_url: [PLACEHOLDER: producción pendiente — grabar video con un calendario anual dividido en macrociclo > mesociclos > microciclos y anotaciones de qué modelo aplicar por fase; guion base a continuación]

Descripción de apoyo: el video debe hacer visible la jerarquía temporal y ligar cada fase a la evidencia correspondiente.

**Mostrar la jerarquía en pantalla.** Presentar un calendario anual dividido en macrociclo > mesociclos > microciclos. La representación ideal es una barra anual (el macrociclo) segmentada en varios bloques de semanas (los mesociclos), y uno de esos bloques ampliado para mostrar sus microciclos semanales. Esto ancla visualmente la jerarquía introducida en el Módulo 1: microciclos dentro de mesociclos dentro del macrociclo.

**Anotar qué modelo tiene sentido en cada fase.** Sobre ese calendario, señalar en qué fases tendría sentido aplicar cada modelo cubierto en los módulos 2-4, justificándolo con la evidencia, no con preferencias:

- Fases de base tempranas → enfoque más lineal (modelo del Módulo 2; recordar que Harries et al., 2015, no hallaron diferencias significativas entre LP y UP en fuerza, así que la simplicidad de la LP es una ventaja práctica al inicio).
- Fases intermedias con atleta ya entrenado y objetivo fuerza máxima → ondulación, apoyándose en que Moesgaard et al. (2022) observó que los entrenados se benefician más de la UP que los no entrenados para fuerza máxima.
- Fases precompetitivas cortas en resistencia → distribución polarizada, recordando que Silva Oliveira, Boppre y Fonseca (2024) hallaron superioridad de POL para VO2peak solo en intervenciones cortas (menos de 12 semanas) y atletas altamente entrenados.

**El hilo conductor.** Dejar explícito que la elección de modelo por fase se decide según lo que dice la evidencia sobre el nivel de entrenamiento y la duración de la intervención. Cerrar mostrando el calendario completo con cada fase etiquetada por su modelo, como síntesis visual de todo el curso.

### Lección 3 — Errores comunes al diseñar un macrociclo (tipo: audio)

audio_url: [PLACEHOLDER: producción pendiente — grabar episodio en tono directo con los errores más comunes al armar un macrociclo; guion base a continuación]

Descripción de apoyo: tono directo, formato "los errores más comunes al armar un macrociclo". Cada error debe conectarse con la evidencia concreta que lo desmiente, no quedarse en la advertencia genérica.

**Error 1 — copiar un modelo sin considerar el nivel del atleta.** Es tentador tomar el plan de un atleta de élite y aplicarlo tal cual a un principiante. El problema es que el nivel de entrenamiento modula el efecto de los modelos. Recordar el hallazgo de Moesgaard et al. (2022): en programas con volumen equiparado, los individuos entrenados se benefician más de la ondulación (UP) que los no entrenados cuando el objetivo es fuerza máxima. Copiar una ondulación agresiva pensada para un atleta entrenado y aplicarla a un principiante es esperar un beneficio que la evidencia asocia sobre todo a los entrenados.

**Error 2 — no dejar espacio para ajustar según la respuesta individual.** Un macrociclo escrito en piedra ignora que cada atleta responde distinto. El diseño debe permitir modificar la carga según cómo esté respondiendo la persona. Conectar esto con el propósito de reducir lesiones que señalaba Grgic et al. (2017): un plan que no se ajusta arriesga acumular fatiga por encima de la capacidad de recuperación.

**Error 3 — ignorar la duración real de la intervención al elegir el modelo.** Este es especialmente relevante a la luz del Módulo 4. La superioridad de POL para VO2peak que hallaron Silva Oliveira, Boppre y Fonseca (2024) apareció solo en intervenciones cortas (menos de 12 semanas). Diseñar una fase polarizada de seis meses "porque el polarizado es bueno" es ignorar que la evidencia respalda el beneficio en bloques cortos, no largos. La duración no es un detalle logístico: es una condición del efecto.

**Cierre.** Rematar con la idea integradora del módulo: los tres errores comparten la misma raíz — aplicar un modelo sin mirar el nivel del atleta y la duración de la fase, que son justamente las dos variables que la evidencia de este curso señaló como decisivas.

### Lección 4 — Evaluación final: diseño de macrociclo (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
Según Issurin (2010), ¿qué problema del modelo tradicional llevó al desarrollo de la periodización en bloques?
- [a] Intentar desarrollar demasiadas capacidades simultáneamente ✓
- [b] Tener sesiones demasiado cortas
- [c] No incluir suficiente descanso
- [d] Usar solo alta intensidad

#### Pregunta 2 (tipo: opcion_unica, puntos: 1)
Un macrociclo bien diseñado...
- [a] Debe usar un único modelo de periodización durante toda la temporada
- [b] Puede combinar distintos modelos según la fase, el nivel del atleta y la duración de la intervención ✓
- [c] No debe considerar el nivel de entrenamiento del atleta
- [d] Es idéntico entre deportes de fuerza y de resistencia

#### Pregunta 3 (tipo: verdadero_falso, puntos: 1)
La duración de la intervención (corta vs. larga) es irrelevante al elegir qué modelo de periodización aplicar.
- [V] Verdadero
- [F] Falso ✓

#### Pregunta 4 (tipo: opcion_unica, puntos: 1)
Un entrenador ubica una fase polarizada de 20 semanas en el macrociclo de un atleta de resistencia altamente entrenado, esperando maximizar su VO2peak. Según Silva Oliveira, Boppre y Fonseca (2024), ¿por qué este diseño no está bien respaldado por la evidencia?
- [a] Porque POL nunca mejora el VO2peak en ninguna condición
- [b] Porque la superioridad de POL para VO2peak solo se observó en intervenciones cortas (menos de 12 semanas) ✓
- [c] Porque POL solo sirve para atletas no entrenados
- [d] Porque POL solo mejora el time-trial, no el VO2peak

#### Pregunta 5 (tipo: opcion_multiple, puntos: 2)
Según la integración de evidencia de este curso, ¿qué variables debe considerar el diseño de un macrociclo al decidir qué modelo aplicar en cada fase? (marca todas las que correspondan)
- [a] El nivel de entrenamiento del atleta (Moesgaard et al., 2022) ✓
- [b] La duración de la intervención de cada fase (Silva Oliveira, Boppre y Fonseca, 2024) ✓
- [c] La fase de la temporada y el objetivo de esa fase ✓
- [d] Aplicar el mismo modelo puro durante los 12 meses sin variación

---

## Fuentes de evidencia de este curso

1. Harries, S.K., Lubans, D.R., Callister, R. (2015). Systematic Review and Meta-Analysis of Linear and Undulating Periodized Resistance Training Programs on Muscular Strength. *J Strength Cond Res*, 29(4):1113-1125. — https://pubmed.ncbi.nlm.nih.gov/25268290/
2. Grgic, J., Mikulic, P., Podnar, H., Pedisic, Z. (2017). Effects of linear and daily undulating periodized resistance training programs on measures of muscle hypertrophy: a systematic review and meta-analysis. *PeerJ*, 5:e3695. — https://pmc.ncbi.nlm.nih.gov/articles/PMC5571788/
3. Moesgaard, L., Beck, M.M., Christiansen, L., Aagaard, P., Lundbye-Jensen, J. (2022). Effects of periodization on strength and muscle hypertrophy in volume-equated resistance training programs: a systematic review and meta-analysis. *Sports Med*, 52:1647-1666. — https://pubmed.ncbi.nlm.nih.gov/35044672/
4. Comparison of linear and undulating periodization resistance training on athletic capacities and health promotion: a systematic review and meta-analysis (2026). *Frontiers in Public Health*. — https://pmc.ncbi.nlm.nih.gov/articles/PMC12999919/
5. Issurin, V.B. (2010). New Horizons for the Methodology and Physiology of Training Periodization. *Sports Med*, 40:189-206. — https://link.springer.com/article/10.2165/11319770-000000000-00000
6. Stöggl, T.L., Sperlich, B. (2015). The training intensity distribution among well-trained and elite endurance athletes. *Front Physiol*, 6:295. — https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2015.00295/full
7. Silva Oliveira, P., Boppre, G., Fonseca, H. (2024). Comparison of Polarized Versus Other Types of Endurance Training Intensity Distribution on Athletes' Endurance Performance: A Systematic Review with Meta-analysis. *Sports Med*, 54(8):2071-2095. — https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428/
8. The Effect of Polarized Training Intensity Distribution on Maximal Oxygen Uptake and Work Economy Among Endurance Athletes: A Systematic Review (2024). *Sports*. — https://pmc.ncbi.nlm.nih.gov/articles/PMC11679080/
