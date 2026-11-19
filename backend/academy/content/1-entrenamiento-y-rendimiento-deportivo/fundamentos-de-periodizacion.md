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

video_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m1-l2-historia.mp4
subtitulos_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m1-l2-historia.vtt

¿Por qué seguimos usando un modelo de entrenamiento que nació hace más de medio siglo?

No es una pregunta para desacreditarlo. Es el punto de partida honesto de la ciencia del entrenamiento.

El modelo tradicional de periodización se construyó sobre la ciencia deportiva soviética. En 2010, Issurin lo situaba unas cinco décadas atrás.

Desde entonces, el deporte de alto rendimiento cambió radicalmente. El modelo, durante mucho tiempo, casi no cambió.

Ese desfase generó contradicciones. La principal, según Issurin: intentar desarrollar demasiadas capacidades al mismo tiempo.

De esas contradicciones nacieron modelos alternativos: la periodización en bloques, la ondulada y la polarizada.

Ojo: eso no significa que el modelo clásico sea malo. En fuerza, por ejemplo, Harries y sus colegas no encontraron diferencias significativas entre la periodización lineal y la ondulada.

El mensaje es otro: el modelo tradicional no es la única opción, y la elección depende del contexto.

En este curso vas a ver el modelo clásico, las alternativas y, sobre todo, qué dice la evidencia de cada una.

No elijas un modelo por tradición ni por moda. Elígelo por lo que muestran los estudios.

### Lección 3 — Fundamentos y propósito (tipo: audio)

audio_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m1-l3-fundamentos-proposito.mp3
subtitulos_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m1-l3-fundamentos-proposito.vtt

Hola. Este es el episodio de Fundamentos de Periodización, módulo uno. Hoy quiero contarte, sin tecnicismos, la diferencia entre entrenar sin plan y entrenar periodizado.

Para eso te voy a presentar a dos personas. Son un ejemplo ilustrativo, no un caso de estudio.

La primera entrena siempre igual. El mismo peso, las mismas repeticiones, el mismo circuito, semana tras semana. Al principio progresa, y mucho. Pero después de un tiempo, el progreso se detiene. Se estanca. Se aburre. Y empieza a preguntarse si vale la pena seguir.

Ese estancamiento no es mala suerte. Es lo que pasa cuando el cuerpo ya se adaptó a un estímulo que no cambia. Lo que antes era un desafío, ahora es rutina.

La segunda persona varía su carga, pero con intención. Tiene semanas de más volumen, es decir, más trabajo total. Tiene semanas de más intensidad, con esfuerzos más exigentes. Y tiene semanas de descarga, para recuperarse. No cambia al azar: sigue un plan. Por eso sigue progresando, y por eso sostiene el hábito en el tiempo.

Fíjate en algo. La diferencia entre las dos no es cuánto se esfuerzan. Las dos ponen ganas. La diferencia es que una organiza su carga y la otra no.

Ese es el corazón de periodizar: manipular el volumen y la intensidad a lo largo del tiempo, con un propósito. No dejarlos fijos, y tampoco dejarlos al azar.

Y quiero aclararlo en voz alta: periodizar no significa complicar el entrenamiento. Significa darle estructura. Variar por variar no es periodizar; es desorden con otro nombre.

Entonces, ¿para qué sirve periodizar? Una revisión sistemática con meta-análisis de Grgic y sus colegas, de 2017, resume cuatro propósitos concretos. Te los dejo como el para llevar de este episodio.

Uno: mejorar la adherencia. Un plan que varía de forma organizada es más fácil de sostener que repetir siempre lo mismo.

Dos: permitir una progresión constante. Al gestionar cómo sube la carga, el estímulo sigue siendo suficiente para mejorar, sin pasarse.

Tres: evitar las mesetas de rendimiento. Cambiar las variables de forma planificada renueva el estímulo antes de que el progreso se detenga.

Y cuatro: reducir la ocurrencia y la severidad de las lesiones. Modular la carga, y programar descargas, busca que la fatiga no supere tu capacidad de recuperarte.

Recuerda: las dos personas de hoy son inventadas. Pero los cuatro propósitos no son una opinión. Vienen de una revisión sistemática.

En los próximos módulos vas a conocer los modelos concretos con los que se logran: el lineal, el ondulado y el polarizado. Nos escuchamos ahí.

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

Antes de elegirla, conviene hacer una comprobación simple: ¿hay una fecha objetivo, una capacidad que se quiere priorizar y margen suficiente para recorrer fases distintas? Si la respuesta es sí, la LP ofrece un lenguaje claro para conectar cada semana con ese objetivo. Si la respuesta es no, no hace falta forzar una curva perfecta solo porque el nombre del modelo suene formal. La utilidad práctica del modelo está en ordenar decisiones, no en cumplir una forma de gráfico. El atleta sigue necesitando técnica, recuperación y ajustes cuando su respuesta real no coincide con el plan.

### Lección 2 — Qué dice la evidencia sobre LP (tipo: video)

video_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m2-l2-evidencia-lp.mp4
subtitulos_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m2-l2-evidencia-lp.vtt

Dos atletas entrenan fuerza durante meses. Uno sigue una periodización lineal; el otro, una ondulada. ¿Cuál gana más fuerza?

Para responder, un solo experimento no alcanza. Hace falta mirar toda la evidencia junta.

Eso hicieron Harries, Lubans y Callister en 2015: un meta-análisis que buscó en tres bases de datos, MEDLINE, SCOPUS y SPORTDiscus... y reunió diecisiete estudios, con quinientos diez participantes en total.

El resultado: no hubo diferencias significativas entre lineal y ondulada, ni en fuerza de tren superior ni de tren inferior.

Si lo dibujamos, las dos barras de ganancia quedan prácticamente iguales. La diferencia entre ellas no alcanza significación estadística.

Ojo con leerlo mal. No significa que la lineal no funcione: las dos producen ganancias.

Significa que, con esta evidencia, no se demostró que una sea superior ni inferior a la otra para la fuerza general.

Entonces, la elección puede apoyarse en otros criterios: la adherencia y la preferencia del atleta, la claridad del plan y la fecha de competencia.

Pero hay un matiz. En el Módulo 3 verás qué cambia cuando se separa a los atletas por su nivel de entrenamiento.

Sin diferencias significativas no es lo mismo que sin efecto.

### Lección 3 — Aplicando LP en la práctica (tipo: audio)

audio_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m2-l3-aplicando-lp.mp3
subtitulos_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m2-l3-aplicando-lp.vtt

Hola. Este es el episodio del módulo dos de Fundamentos de Periodización. Hoy te cuento, mes a mes, cómo se vive un bloque de periodización lineal de doce semanas.

El protagonista es un atleta inventado. Es un ejemplo ilustrativo, no un caso real. Recién empieza a entrenar fuerza y tiene una fecha objetivo dentro de tres meses.

Mes uno: la base. Hace mucho volumen con cargas moderadas. Muchas repeticiones, con pesos que le permiten mantener una buena técnica. Termina las sesiones con la sensación de haber trabajado mucho, pero sin llegar nunca a un esfuerzo extremo. Puede parecer poco emocionante. Pero esta base es la que va a sostener todo lo que viene después.

Mes dos: el volumen baja y la intensidad sube. Nuestro atleta nota que las repeticiones por serie disminuyen y que el peso en la barra aumenta. Los esfuerzos se sienten más exigentes, aunque el trabajo total acumulado es menor.

Esto conecta directamente con la lección que leíste: la periodización lineal se caracteriza por empezar con alto volumen y baja intensidad, y avanzar hacia bajo volumen y alta intensidad. Ojo: eso es la definición del modelo, no el resultado de un estudio.

Mes tres: el pico. Pocas repeticiones, cargas altas y foco en expresar fuerza cerca de su máximo. Llega a su fecha objetivo habiendo recorrido toda la curva del modelo: de mucho trabajo liviano a poco trabajo pesado.

Hasta aquí, la historia suena perfecta. Pero quiero cerrar con honestidad, sin venderte el modelo de más.

El meta-análisis de Harries, Lubans y Callister, de 2015, reunió diecisiete estudios con quinientos diez participantes. Y no encontró diferencias significativas entre la periodización lineal y la ondulada en fuerza.

¿Qué significa eso para nuestro atleta? Que su bloque lineal le funcionó, sí. Pero no porque la lineal sea mágicamente superior. Le funcionó porque siguió una progresión organizada y sostenida durante tres meses. Eso es lo que da resultados.

Entonces, ¿por qué elegirla para un principiante? Porque su simplicidad es una ventaja práctica real. Es fácil de entender, fácil de seguir y conecta cada semana con un objetivo claro. Eso ayuda a la adherencia.

Solo recuerda el matiz: es una ventaja práctica, no una superioridad fisiológica demostrada frente a la ondulada.

En el próximo módulo vas a ver la periodización ondulada, y un hallazgo que cambia el panorama según el nivel del atleta. Nos escuchamos ahí.

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

Esto cambia la conversación con el atleta. En vez de preguntar qué modelo es “el mejor” en abstracto, el entrenador puede preguntar qué adaptación busca, cuánta experiencia de entrenamiento tiene la persona y qué tan bien tolera cambios frecuentes de estímulo. Una variación diaria puede ser útil para un atleta entrenado que persigue fuerza máxima, pero también puede añadir complejidad innecesaria a alguien que todavía está aprendiendo patrones básicos. La evidencia orienta esa decisión; no sustituye la observación de adherencia, técnica y recuperación durante el bloque.

### Lección 2 — Qué dice la evidencia sobre UP (tipo: video)

video_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m3-l2-evidencia-up.mp4
subtitulos_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m3-l2-evidencia-up.vtt

La periodización ondulada cambia la carga con más frecuencia que la lineal. Pero puede ondular a dos ritmos distintos.

En la ondulada diaria, o DUP, cada día de la semana tiene un estímulo distinto: fuerza, hipertrofia o resistencia muscular.

En la ondulada semanal, o WUP, los días de una misma semana se parecen. Lo que cambia es el énfasis de una semana a la siguiente.

Las dos ondulan. Lo que cambia es la frecuencia.

¿Funciona mejor que la lineal? En el módulo anterior viste que, con poblaciones mezcladas, Harries y sus colegas no encontraron diferencias significativas en fuerza.

El meta-análisis de Moesgaard y sus colegas, de 2022, agregó un matiz. Analizó programas con volumen equiparado: los grupos hacían la misma cantidad de trabajo total.

Su hallazgo: cuando el objetivo es fuerza máxima, los atletas entrenados se benefician más de la ondulación que los no entrenados.

En hipertrofia, en cambio, no aparecen diferencias claras entre lineal y ondulada.

Por eso, la conclusión no es que la ondulada sea mejor. Tiene respaldo en una condición concreta: atleta entrenado y objetivo de fuerza máxima.

No elijas el modelo en abstracto. Elígelo según el atleta y el objetivo.

### Lección 3 — Aplicando UP en la práctica (tipo: audio)

audio_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m3-l3-aplicando-up.mp3
subtitulos_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m3-l3-aplicando-up.vtt

Hola. Este es el episodio del módulo tres de Fundamentos de Periodización. Hoy vamos a poner a dos atletas frente al mismo programa, y ver por qué no deberían esperar lo mismo de él.

Te los presento. Los dos son personajes ilustrativos, no casos reales.

La primera es una atleta entrenada. Tiene años de trabajo de fuerza encima y quiere llevar su fuerza máxima un paso más allá.

El segundo es un principiante. Lleva apenas unas semanas entrenando.

Los dos van a seguir exactamente el mismo programa de ondulación diaria, o DUP. Mismos días, misma alternancia: un día de fuerza, otro de hipertrofia y otro de resistencia muscular, cada semana.

La expectativa ingenua sería esta: si hacen lo mismo, deberían ganar lo mismo. Pero la evidencia dice algo más interesante.

El meta-análisis de Moesgaard y sus colegas, de 2022, analizó programas con volumen equiparado. Es decir, comparó modelos igualando la cantidad total de trabajo, para que las diferencias no se expliquen porque un grupo entrenó más.

Y encontró esto: cuando el objetivo es la fuerza máxima, los individuos entrenados se benefician más de la ondulación, diaria o semanal, que los no entrenados.

Volvamos a nuestros dos atletas. La atleta entrenada es justamente el perfil que, según la evidencia, mejor aprovecha la ondulación para la fuerza máxima. El principiante no debería esperar esa misma ventaja por el solo hecho de ondular.

Ahora, cuidado. Esto no significa que el principiante no progrese. Progresa, y mucho, casi con cualquier programa organizado. Lo que la evidencia asocia sobre todo a los entrenados es el beneficio adicional de elegir la ondulación en lugar de un esquema lineal, cuando se busca fuerza máxima.

Hay un dato más. Grgic y sus colegas, en 2017, compararon la periodización lineal con la ondulada diaria en hipertrofia, y no encontraron diferencias significativas. Así que, si nuestro principiante buscara sobre todo ganar músculo, la elección del modelo importaría todavía menos.

Y no mezclemos los hallazgos. Moesgaard habla del efecto del nivel de entrenamiento sobre la fuerza máxima. Grgic habla de hipertrofia. Son preguntas distintas, con respuestas distintas.

La moraleja de hoy es práctica: el mismo programa no rinde igual en manos distintas. Por eso, el nivel de entrenamiento no es un detalle. Es una variable de diseño.

En el próximo módulo dejamos la fuerza y pasamos a la resistencia, con el modelo polarizado. Nos escuchamos ahí.

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

En programación, esa limitación obliga a no copiar porcentajes de otra persona sin revisar el contexto. Un corredor recreativo, una temporada larga o una fase cuyo objetivo principal no sea el VO2peak no son la misma situación que la analizada en el meta-análisis. La distribución polarizada puede seguir ser una alternativa posible, pero el curso no afirma que sea superior en esos casos. La decisión responsable es conservar la especificidad del deporte, la carga total tolerable y el objetivo de la fase, en lugar de convertir una condición de investigación en una regla universal.

### Lección 2 — Qué dice la evidencia sobre POL (tipo: video)

video_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m4-l2-evidencia-pol.mp4
subtitulos_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m4-l2-evidencia-pol.vtt

El modelo polarizado nace de la investigación en deportes de resistencia. Y su firma es cómo reparte la intensidad.

Stöggl y Sperlich describieron, en 2015, lo que suelen hacer los atletas de resistencia bien entrenados y de élite.

Entre un setenta y cinco y un ochenta por ciento del volumen va en baja intensidad.

Entre un cero y un cinco por ciento, en la zona intermedia: el umbral.

Y entre un quince y un veinte por ciento, en alta intensidad.

Mucho fácil, algo de muy duro y casi nada de intensidad media.

¿Es mejor que otros modelos? El meta-análisis de Silva Oliveira, Boppre y Fonseca, de 2024, siguió los lineamientos PRISMA y evaluó la certeza con el sistema GRADE.

El polarizado mejoró más el VO dos pico: una diferencia de medias estandarizada de cero coma veinticuatro, con once estudios, doscientos ochenta y cuatro participantes y certeza alta.

Pero con dos condiciones: solo en intervenciones de menos de doce semanas, y solo en atletas altamente entrenados.

Y en otras medidas, como el time trial, el tiempo hasta el agotamiento o la velocidad en el segundo umbral, no hubo superioridad clara.

Es una ventaja real, pero pequeña y acotada. No es que el polarizado sea mejor en general.

En el Módulo 5 verás cómo encajarlo en un macrociclo, cuidando justamente la duración de cada fase.

### Lección 3 — Aplicando POL en la práctica (tipo: audio)

audio_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m4-l3-aplicando-pol.mp3
subtitulos_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m4-l3-aplicando-pol.vtt

Hola. Este es el episodio del módulo cuatro de Fundamentos de Periodización. Hoy te cuento la historia de una atleta de resistencia, y de por qué el momento importa tanto como el modelo.

La atleta es un personaje ilustrativo. Pero las condiciones que vas a escuchar no son inventadas: vienen de un meta-análisis de 2024.

Ella está altamente entrenada. Y tiene por delante un bloque corto, de menos de doce semanas, antes de una competencia importante.

Decide usar una distribución polarizada. La mayor parte de su volumen, entre un setenta y cinco y un ochenta por ciento, la hace en baja intensidad: rodajes largos, a ritmo de conversación. Entre un quince y un veinte por ciento lo hace en alta intensidad: intervalos cortos y muy exigentes. Y en la zona intermedia, el umbral, pasa muy poco tiempo, entre un cero y un cinco por ciento.

Esa distribución es la que Stöggl y Sperlich describieron en 2015 para atletas de resistencia bien entrenados y de élite.

Lo interesante es que nuestra atleta reúne justo las dos condiciones en las que Silva Oliveira, Boppre y Fonseca encontraron una ventaja del modelo polarizado: atletas altamente entrenados, e intervenciones de menos de doce semanas.

En esas condiciones, el polarizado mejoró más el VO dos pico que otros modelos. La diferencia de medias estandarizada fue de cero coma veinticuatro, con once estudios, doscientos ochenta y cuatro participantes y certeza alta de la evidencia. Es un efecto pequeño, pero real.

Ahora cambiemos las condiciones, una por una.

¿Qué pasa si estira el mismo esquema a un bloque de seis meses? La ventaja apareció solo en intervenciones cortas. En un bloque largo, la evidencia ya no la respalda.

¿Y si en lugar de ella fuera un corredor recreativo, poco entrenado? Tampoco se cumpliría la condición del nivel.

Y hay un tercer límite. Aunque su VO dos pico mejore, en otras medidas de rendimiento, como el time trial, el tiempo hasta el agotamiento o la velocidad en el segundo umbral, el polarizado no mostró una superioridad clara.

La lección de diseño es esta: el modelo polarizado no es una plantilla para copiar y pegar en cualquier atleta y en cualquier fase. Es una herramienta con un rango de uso bien definido: bloques cortos, atletas muy entrenados y un objetivo concreto, el VO dos pico.

Dentro de ese rango, tiene respaldo de alta certeza. Fuera de él, usarlo es usarlo sin respaldo.

En el próximo y último módulo, la duración de cada fase va a ser una decisión explícita del macrociclo. Nos escuchamos ahí.

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

video_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m5-l2-macrociclo.mp4
subtitulos_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m5-l2-macrociclo.vtt

Una temporada de entrenamiento se puede leer en tres escalas.

El macrociclo es la temporada completa, típicamente un año.

Se divide en mesociclos: bloques de varias semanas, enfocados en pocas capacidades.

Y cada mesociclo se divide en microciclos, que suelen ser una semana.

Ahora, ¿qué modelo conviene en cada fase? Este calendario es un ejemplo ilustrativo. Las decisiones, en cambio, se apoyan en la evidencia.

En la base, al inicio, un enfoque más lineal. Como Harries y sus colegas no hallaron diferencias significativas entre lineal y ondulada en fuerza, su simplicidad es una ventaja práctica.

En las fases intermedias, con un atleta ya entrenado que busca fuerza máxima, entra la ondulación. Según Moesgaard y sus colegas, es en ese perfil donde más aporta.

Y antes de una competencia clave en deportes de resistencia, una fase polarizada corta, de menos de doce semanas, como en el meta-análisis de 2024.

El hilo es el mismo en todo el calendario: cada modelo se elige según el nivel del atleta y la duración de la fase.

Ese es el resumen del curso: no hay un modelo ganador. Hay un modelo adecuado para cada momento.

### Lección 3 — Errores comunes al diseñar un macrociclo (tipo: audio)

audio_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m5-l3-errores-macrociclo.mp3
subtitulos_url: https://zyfit-academy-media.sfo3.cdn.digitaloceanspaces.com/academy/fundamentos-de-periodizacion/m5-l3-errores-macrociclo.vtt

Hola. Este es el último episodio de Fundamentos de Periodización. Hoy voy a ser directo: estos son los tres errores más comunes al armar un macrociclo, y la evidencia que los desmiente.

Error número uno: copiar un modelo sin mirar el nivel del atleta.

Es muy tentador. Tomas el plan de un atleta de élite y se lo das, tal cual, a alguien que recién empieza. El problema es que el nivel de entrenamiento cambia el efecto de los modelos.

Acuérdate del meta-análisis de Moesgaard y sus colegas, de 2022. En programas con volumen equiparado, los individuos entrenados se benefician más de la ondulación que los no entrenados cuando el objetivo es la fuerza máxima.

Si copias una ondulación agresiva, pensada para un atleta entrenado, y se la das a un principiante, estás esperando un beneficio que la evidencia asocia sobre todo a los entrenados.

Error número dos: escribir el macrociclo en piedra.

Un plan que no deja espacio para ajustarse ignora que cada atleta responde distinto. Algunas semanas la persona va a responder mejor de lo esperado, y otras, peor. El diseño tiene que permitir modificar la carga según esa respuesta.

Esto conecta con uno de los propósitos de periodizar que señalaron Grgic y sus colegas en 2017: reducir la ocurrencia y la severidad de las lesiones. Un plan que no se ajusta corre el riesgo de acumular fatiga por encima de la capacidad de recuperación.

Error número tres: ignorar la duración real de la intervención.

Este es especialmente importante después del módulo cuatro. La ventaja del modelo polarizado para el VO dos pico, que encontraron Silva Oliveira, Boppre y Fonseca en 2024, apareció solo en intervenciones de menos de doce semanas.

Entonces, diseñar una fase polarizada de seis meses, porque el polarizado es bueno, es ignorar que la evidencia respalda ese beneficio en bloques cortos, no en largos. La duración no es un detalle logístico. Es una condición del efecto.

Ahora fíjate en algo. Los tres errores tienen la misma raíz: aplicar un modelo sin mirar el nivel del atleta y la duración de la fase. Y esas son, justamente, las dos variables que la evidencia de este curso señaló como decisivas.

Así que, si te llevas una sola idea del curso, que sea esta: no hay un modelo ganador. Hay decisiones de diseño. Y se toman mirando al atleta, al objetivo y al tiempo disponible.

Gracias por acompañarme en Fundamentos de Periodización. Nos vemos en el próximo curso.

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
