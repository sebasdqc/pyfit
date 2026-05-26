-- ============================================================
-- ZYFIT — Exercise Seed Data: Batch 07A
-- Categorías: Piernas / Glúteos · Espalda / Jalón · Empuje / Pecho / Hombros
-- Total: 38 ejercicios
-- ============================================================

INSERT INTO exercises (
  nombre, patron_movimiento, bilateral, es_compuesto, dificultad,
  musculos_primarios, musculos_secundarios, equipamiento, contraindicaciones,
  activo, gif_url, imagen_url,
  technical_level, error_risk, space_required, systemic_fatigue,
  set_duration_seconds, rest_seconds_default, description, coaching_cues
) VALUES

-- ============================================================
-- PIERNAS / GLÚTEOS (17)
-- ============================================================

-- 1
('Extensión de cuádriceps en máquina',
 'aislamiento', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 2, 'minimo', 2,
 30, 75,
 'Extensión de rodilla en máquina. Aislamiento completo del cuádriceps sin participación de cadena posterior. La evidencia reciente favorece el trabajo en rango elongado — partir de 90° o más de flexión de rodilla genera mayor estímulo hipertrófico que el rango acortado. Complemento esencial al trabajo de sentadilla y bisagra para asegurar volumen directo en cuádriceps.',
 '["Ajustar el rodillo sobre el tobillo, no sobre el empeine", "Extensión completa en el punto más alto — contracción máxima del cuádriceps", "Partir de máxima flexión de rodilla posible para trabajar en rango elongado", "El excéntrico es controlado: 3 segundos bajando", "No usar impulso al final del recorrido para llegar a la extensión completa"]'::jsonb),

-- 2
('Curl de isquiotibiales tumbado en máquina',
 'aislamiento', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 2,
 30, 75,
 'Flexión de rodilla en máquina en decúbito prono. Aislamiento de los isquiotibiales. Complemento fundamental al cuádriceps para el balance muscular de la rodilla. Los isquiotibiales son especialmente vulnerables a lesiones por desequilibrio de fuerza — este ejercicio es el seguro más básico que puede agregar un programa.',
 '["La cadera permanece pegada al banco durante todo el movimiento — no levantarla", "Flexión completa en el punto más alto: talones hacia los glúteos", "Excéntrico muy controlado — los isquiotibiales se lesionan principalmente en la fase excéntrica", "Ajustar el rodillo sobre el tobillo, no sobre el talón", "No usar cargas que impidan llegar a la extensión completa en el inicio"]'::jsonb),

-- 3
('Curl de isquiotibiales sentado en máquina',
 'aislamiento', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 2,
 30, 75,
 'Flexión de rodilla en máquina en posición sentada. La cadera flexionada coloca los isquiotibiales en mayor elongación que la versión tumbada, generando mayor estímulo en la porción proximal según el principio de entrenamiento en rango elongado. Combinar ambas versiones en el programa es superior a usar solo una.',
 '["La posición sentada alarga los isquiotibiales en la cadera — esa es su ventaja sobre la versión tumbada", "Misma mecánica de control y tempo que la versión tumbada", "No redondear la espalda para ayudar al movimiento", "El punto de inicio (piernas extendidas) es el de mayor tensión en esta variante — no saltarlo", "Combinar con la versión tumbada para cobertura completa de los isquiotibiales"]'::jsonb),

-- 4
('Zancada lateral (lateral lunge)',
 'sentadilla', FALSE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'medio', 3,
 35, 90,
 'Zancada en el plano frontal con un paso lateral. El único patrón de sentadilla que trabaja los aductores y el glúteo medio en cadena cinética cerrada de forma directa. Complementa cualquier programa que tenga únicamente sentadillas y zancadas sagitales. Excelente para equilibrio en todos los planos de movimiento.',
 '["Paso lateral amplio: el pie aterriza a más de un ancho de cadera", "La rodilla de la pierna que trabaja sigue la dirección del pie — no colapsa hacia adentro", "El pie de la pierna extendida permanece plano en el suelo durante todo el movimiento", "El torso inclinado ligeramente hacia adelante es normal — no es error", "Empujar con el talón del pie de trabajo para volver al centro"]'::jsonb),

-- 5
('Sentadilla Cossack',
 'sentadilla', FALSE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 2, 'medio', 3,
 35, 90,
 'Sentadilla lateral con máxima flexión en una pierna y extensión completa en la otra con pie plano en el suelo. Combina movilidad de cadera, tobillo y columna con fuerza unilateral en un rango de movimiento extremo. Diagnóstico de limitaciones de movilidad y ejercicio de fuerza funcional simultáneamente. Superior a la zancada lateral en demanda de rango de movimiento.',
 '["El pie de la pierna extendida permanece plano en el suelo — si no puede, trabajar primero la movilidad", "La rodilla de la pierna flexionada sigue el pie hacia afuera", "El torso se mantiene lo más erecto posible durante todo el movimiento", "Comenzar con rango parcial y aumentar progresivamente según la movilidad disponible", "Con peso corporal primero — agregar carga solo cuando el rango completo esté disponible"]'::jsonb),

-- 6
('Abducción de cadera con banda (de pie)',
 'aislamiento', FALSE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 25, 45,
 'Abducción de cadera de pie con banda de resistencia. Activa el glúteo medio en cadena cinética cerrada. A diferencia de la máquina, requiere estabilización sobre la pierna de apoyo, añadiendo demanda de equilibrio y glúteo medio contralateral. Ideal como calentamiento específico antes de sentadillas, zancadas y patrones de bisagra.',
 '["La banda va sobre las rodillas o los tobillos — más distal es más difícil", "El torso permanece completamente vertical — no inclinarse hacia la pierna de apoyo", "El movimiento sale de la cadera, no de la rodilla ni del tobillo", "Apoyo en una pared o mano en algo estable hasta ganar equilibrio", "Series de 15–20 repeticiones como activación — no como ejercicio principal de fuerza"]'::jsonb),

-- 7
('Abducción de cadera en máquina',
 'aislamiento', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 30, 60,
 'Apertura lateral de piernas en máquina. Aislamiento del glúteo medio y menor sin demanda de equilibrio. El glúteo medio es el estabilizador principal de la pelvis durante la marcha, carrera y ejercicios unilaterales. Su desarrollo previene el colapso de rodilla en sentadillas y zancadas. Útil como activación o trabajo de aislamiento de cierre.',
 '["No usar impulso del torso — el movimiento es solo de la cadera", "El rango de movimiento no debe superar el punto donde la pelvis empieza a inclinarse", "Pausa de 1 segundo en el punto de máxima abducción", "Útil al inicio de la sesión como activación de glúteo o al final como volumen adicional", "Combinar con abducción de pie con banda para trabajar en cadena cerrada y abierta"]'::jsonb),

-- 8
('Hack squat en máquina',
 'sentadilla', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'minimo', 4,
 40, 150,
 'Sentadilla en máquina inclinada con espalda apoyada. Énfasis en cuádriceps, especialmente el vasto lateral. La inclinación de la máquina reduce significativamente la demanda de movilidad de tobillo y el estrés lumbar comparado con la sentadilla libre. Permite cargas elevadas con menor riesgo técnico. Excelente alternativa cuando la sentadilla libre está temporalmente contraindicada.',
 '["Espalda plana contra el respaldo durante todo el movimiento — no despegar", "Pies a ancho de cadera o ligeramente más amplio, puntas levemente hacia afuera", "No bloquear las rodillas en la extensión completa — mantener ligera flexión", "Descenso hasta que los muslos estén paralelos al suelo o más profundo", "La posición de los pies cambia el énfasis: más altos = más glúteo, más bajos = más cuádriceps"]'::jsonb),

-- 9
('Prensa unilateral (single leg press)',
 'sentadilla', FALSE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'minimo', 3,
 35, 90,
 'Prensa de piernas con una sola pierna. Detecta y corrige desequilibrios de fuerza entre piernas que la versión bilateral puede enmascarar. Progresión entre la prensa bilateral y los ejercicios unilaterales con carga libre. Sin demanda de equilibrio ni estabilización espinal.',
 '["La pierna libre puede descansar sobre el borde de la máquina o cruzada sobre la rodilla de trabajo", "La espalda no debe despegarse del respaldo en ningún punto del recorrido", "ROM idéntico al de la prensa bilateral: no recortar el descenso", "No bloquear la rodilla en la extensión", "La diferencia de carga entre piernas revela el desequilibrio real — no normalizar artificialmente"]'::jsonb),

-- 10
('Good morning con barra',
 'bisagra', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 4, 5, 'medio', 4,
 35, 150,
 'Bisagra de cadera con barra sobre los trapecios. Alta demanda sobre isquiotibiales, erector espinal y glúteos a través de un momento de palanca máximo sobre la columna lumbar en el punto más bajo. El error_risk más alto del catálogo en su categoría — el margen de error es mínimo y las consecuencias directas. Requiere dominio previo del peso muerto y la bisagra sin carga.',
 '["Barra sobre los trapecios en posición de sentadilla trasera, nunca sobre el cuello", "Bisagra de cadera pura: las rodillas permanecen ligeramente flexionadas y completamente fijas", "La columna lumbar nunca redondea — si ocurre, el rango excede la capacidad actual", "Bajar solo hasta donde la columna mantenga posición neutra perfecta", "Usar cargas muy conservadoras: el momento sobre L4-L5 es multiplicado por la palanca del torso"]'::jsonb),

-- 11
('Reverse Nordic curl',
 'aislamiento', TRUE, FALSE, 'avanzado',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 4, 3, 'minimo', 3,
 40, 120,
 'Extensión excéntrica de cuádriceps desde posición de rodillas con los pies fijos. El análogo del Nordic curl para el cuádriceps — trabaja el recto femoral en su porción proximal a través de un rango de estiramiento que ninguna máquina puede reproducir. Alta evidencia emergente en prevención de lesiones del tendón patelar y recto femoral.',
 '["Los pies deben estar firmemente anclados — compañero, máquina o banda", "El cuerpo cae hacia atrás como una sola pieza rígida: cadera extendida durante todo el movimiento", "Las manos frenan el descenso al llegar al suelo — volver a la posición inicial con ayuda", "Comenzar con un rango de 15-20° desde vertical e ir aumentando gradualmente", "El dolor de rodilla durante el ejercicio es señal de detener — no confundir con el ardor muscular del cuádriceps"]'::jsonb),

-- 12
('B-stance RDL (RDL en media postura)',
 'bisagra', FALSE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'medio', 3,
 35, 90,
 'Peso muerto rumano con un pie principal de trabajo y el otro como apoyo de equilibrio (punta del pie rozando el suelo). Aproximadamente el 80% de la carga recae en la pierna principal. Transición progresiva entre el RDL bilateral y el RDL unilateral completo. Menor demanda de equilibrio que el unilateral pero mucho mayor estímulo unilateral que el bilateral.',
 '["El pie de apoyo solo roza el suelo levemente — no cargar peso sobre él", "La mecánica de bisagra es idéntica al RDL bilateral en la pierna principal", "La pelvis debe permanecer cuadrada — no rotar hacia ningún lado", "Con mancuernas: sostener la carga en ambas manos o solo en la mano ipsilateral", "Si la pelvis rota al descender, reducir el rango hasta ganar más control"]'::jsonb),

-- 13
('Elevación de talones sentado (sóleo)',
 'aislamiento', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 30, 60,
 'Plantar-flexión en posición sentada. La cadera flexionada pone el gastrocnemio (biarticular) en posición de acortamiento, de modo que el sóleo es el músculo principal. El sóleo tiene mayor proporción de fibras lentas que el gastrocnemio y requiere rangos de repetición más altos. Combinar con la versión de pie para trabajo completo de pantorrilla.',
 '["La carga va sobre las rodillas — mancuerna, barra o máquina específica", "ROM completo: talón abajo en el inicio, elevación máxima al final", "Pausa de 2 segundos en el punto de máxima contracción — el sóleo responde bien al tiempo bajo tensión", "Series de 15–25 repeticiones son apropiadas por la composición de fibras del sóleo", "El pie en punta hacia afuera enfatiza el gastrocnemio medial — en punta recta se aísla más el sóleo"]'::jsonb),

-- 14
('Sentadilla Zercher',
 'sentadilla', TRUE, TRUE, 'avanzado',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 4, 3, 'medio', 4,
 40, 150,
 'Sentadilla con la barra sostenida en el pliegue de los codos, frente al pecho. La posición de la barra obliga a un torso muy vertical y genera alta demanda de core anterior. Permite mayor profundidad que la sentadilla frontal con menor estrés en muñecas. Ejercicio inusual con alta demanda de adaptación al discomfort del punto de contacto de la barra.',
 '["La barra descansa en el pliegue de los codos — los brazos deben cruzarse para sostenerla", "El torso se mantiene muy erecto: la posición de la barra lo fuerza naturalmente", "Las rodillas se abren hacia afuera durante todo el descenso", "Usar almohadillas en la barra hasta que los brazos se adapten al contacto", "No intentar sin haber dominado la sentadilla frontal y el goblet squat"]'::jsonb),

-- 15
('Sentadilla con pausa (pause squat)',
 'sentadilla', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'medio', 4,
 45, 150,
 'Sentadilla con pausa de 2–3 segundos en el punto más bajo. Elimina el rebote del tendón y obliga a generar fuerza concéntrica pura desde la posición más desfavorable. Herramienta técnica excepcional para desarrollar fuerza en el punto más bajo y mejorar la posición en el fondo de la sentadilla. Usar con carga significativamente menor que la sentadilla estándar.',
 '["La pausa debe ser completa: 2–3 segundos sin rebote ni tensión acumulada, solo posición", "Durante la pausa, mantener toda la tensión del bracing — no relajar nada", "Usar entre 20–40% menos carga que la sentadilla estándar al inicio", "La posición en el fondo es el diagnóstico: si colapsa durante la pausa, la posición no está consolidada", "Respira completamente antes del descenso — no en el punto más bajo"]'::jsonb),

-- 16
('Jefferson curl',
 'bisagra', TRUE, FALSE, 'avanzado',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 4, 4, 'minimo', 2,
 40, 120,
 'Flexión de columna cargada desde bipedestación, vértebra a vértebra, con pesas en las manos. Ejercicio de fuerza en rango elongado para toda la cadena posterior de la columna. Contraintuitivo desde la perspectiva clásica de "espalda neutra", pero con respaldo emergente para movilidad activa de columna en personas sin patología activa. Exclusivo para usuarios avanzados con columna sana.',
 '["Comenzar desde la cabeza y descender vértebra a vértebra — el movimiento es lento y deliberado", "Los pies sobre una superficie elevada permiten que la carga baje más allá de los pies", "La carga es extremadamente ligera — 5–10kg es suficiente y muchas veces demasiado al inicio", "El retorno es el reverso del descenso: reconstruir la columna vértebra a vértebra", "SOLO para usuarios avanzados sin ninguna patología de columna activa o historial de hernia"]'::jsonb),

-- 17
('Pull-through en polea baja',
 'bisagra', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'medio', 3,
 35, 90,
 'Extensión de cadera de pie jalando una cuerda desde la polea baja entre las piernas. Patrón de bisagra con resistencia horizontal en lugar de vertical (como el peso muerto). La tensión constante del cable y la ausencia de carga axial lo hacen ideal para aprender la bisagra de cadera, trabajo de glúteos en alto volumen, o cuando el eje espinal necesita descanso.',
 '["De pie frente a la polea, agarre de la cuerda entre las piernas", "La bisagra de cadera es el movimiento: caderas hacia atrás, torso inclinado", "Extensión de cadera completa en el punto de pie — contraer glúteos fuerte", "Los brazos solo guían la cuerda — la fuerza viene de la extensión de cadera", "La resistencia viene de atrás y abajo: diferente al peso muerto, similar al swing de KB"]'::jsonb),

-- ============================================================
-- ESPALDA / JALÓN (13)
-- ============================================================

-- 18
('Dominada agarre neutro',
 'jalon_vertical', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 2, 'minimo', 4,
 35, 120,
 'Dominada con palmas enfrentadas. El agarre más cómodo biomecánicamente para el codo y el hombro. Activación equilibrada entre dorsal ancho y bíceps. La mejor opción para usuarios con molestias de codo o muñeca con agarres prono o supino. Requiere barra con agarres paralelos o asas específicas.',
 '["Palmas enfrentadas, agarre a ancho de hombros", "Misma mecánica escapular que la dominada prona: retraer y deprimir antes de jalar", "El pecho sube hacia la barra — no la barbilla", "Este agarre reduce el estrés en el codo más que el prono o el supino", "Si no hay barra de agarre neutro, usar asas de dominadas paralelas en una barra estándar"]'::jsonb),

-- 19
('Jalón agarre neutro en polea',
 'jalon_vertical', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 3,
 35, 90,
 'Jalón al pecho con accesorio de agarre neutro o en V. Menor estrés en el codo y el hombro que el agarre prono. Excelente punto de entrada para el patrón de jalón vertical en usuarios con molestias articulares o como variante para cambiar el estímulo sin cambiar el patrón.',
 '["Accesorio en V o paralelo, agarre a ancho de hombros", "Torso ligeramente inclinado hacia atrás — no más de 15°", "El jalón comienza con la escápula: deprimir el hombro antes de flexionar el codo", "El accesorio baja hacia el esternón en el punto de contracción máxima", "El agarre neutro posiciona mejor el húmero para la depresión escapular que el agarre prono"]'::jsonb),

-- 20
('Straight arm pulldown (jalón con brazos extendidos)',
 'jalon_vertical', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 1, 'minimo', 2,
 30, 75,
 'Extensión de hombro con los brazos extendidos jalando la polea desde arriba hacia las caderas. El bíceps no participa en ninguna medida porque el codo no se flexiona — esto lo convierte en el aislamiento más puro del dorsal ancho disponible. Excelente para aprender a activar el dorsal antes de las dominadas y jalones compuestos.',
 '["Los codos permanecen completamente extendidos durante todo el movimiento — no flexionar", "El movimiento es una extensión de hombro pura: los brazos bajan del overhead a las caderas en arco", "Ligera inclinación del torso hacia adelante en la posición de inicio", "La contracción del dorsal se siente al llevar los brazos hacia las caderas — es la señal correcta", "Usar antes de dominadas o jalones para pre-activar el dorsal"]'::jsonb),

-- 21
('Remo en máquina sentado',
 'jalon_horizontal', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 3,
 35, 90,
 'Remo bilateral en máquina de cable o palanca con apoyo pectoral o sin él. Sin demanda de estabilización lumbar. Ideal para principiantes que aprenden el patrón de retracción escapular, para trabajo de alto volumen cuando la fatiga de estabilización ya es alta, o como ejercicio accesible para usuarios con limitaciones de columna.',
 '["Ajustar el asiento para que los brazos queden paralelos al suelo al inicio", "Retracción escapular completa en el punto de contracción máxima — escápulas juntas", "No redondear la espalda al extender los brazos: mantener tensión durante el excéntrico", "El agarre neutro (palmas enfrentadas) activa más el dorsal; el prono más romboides y trapecio", "La máquina elimina la demanda lumbar: más carga por menos fatiga espinal que el remo libre"]'::jsonb),

-- 22
('Dominadas asistidas con banda',
 'jalon_vertical', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 1, 'minimo', 3,
 35, 90,
 'Dominadas con banda de resistencia anclada a la barra y apoyada en los pies o rodillas para reducir el peso efectivo. La banda asiste más en el punto más bajo (donde es más difícil) y menos en el punto más alto. Permite practicar el patrón completo de dominada antes de dominar la versión sin asistencia. La progresión más efectiva hacia las dominadas libres.',
 '["La banda va en los pies: más estable y controlable que en las rodillas", "Aplicar la misma técnica que en la dominada sin asistencia: no depender de la banda para toda la fuerza", "Reducir progresivamente el grosor (resistencia) de la banda cada 2–3 semanas", "El objetivo es eliminar la banda — no depender de ella indefinidamente", "Combinar con remo invertido para construir la base de fuerza de jalón horizontal necesaria"]'::jsonb),

-- 23
('Rack pull (peso muerto parcial)',
 'bisagra', TRUE, TRUE, 'avanzado',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 4, 'medio', 4,
 40, 180,
 'Peso muerto desde pines de rack con la barra a la altura de las rodillas o ligeramente por debajo. Permite manejar cargas muy superiores al peso muerto convencional al eliminar el rango inicial (el más difícil). Desarrolla la fuerza de bloqueo y el agarre. Herramienta específica para puntos débiles en el peso muerto — no un sustituto del convencional.',
 '["La altura de los pines determina el rango: más bajos = más difícil y más parecido al convencional", "La mecánica de la fase de bloqueo es idéntica al peso muerto: extensión simultánea de cadera y rodillas", "Las cargas pueden ser 20–40% mayores que en el convencional — usar cinturón", "No redondear la espalda aunque la carga lo invite — la posición de la barra no excusa la técnica", "El agarre puede ser el factor limitante: usar straps para no limitar el estímulo de espalda"]'::jsonb),

-- 24
('Déficit deadlift (peso muerto desde déficit)',
 'bisagra', TRUE, TRUE, 'avanzado',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 4, 5, 'medio', 5,
 40, 180,
 'Peso muerto con el levantador de pie sobre una plataforma elevada de 5–10cm. Aumenta el rango de movimiento en el inicio, trabajando los músculos en mayor elongación. Desarrolla fuerza fuera del suelo — el punto más difícil del peso muerto convencional. Usar con carga significativamente menor que el convencional y solo cuando la técnica en el convencional sea impecable.',
 '["La plataforma eleva los pies, no la barra — la barra sigue en el suelo", "El ángulo de la tibia en el inicio es más cerrado que en el convencional: la rodilla avanza más", "La columna debe ser más vertical en el inicio que en el convencional", "Usar entre 20–30% menos carga que el peso muerto convencional", "Solo para usuarios que ya manejan el convencional con técnica sólida y sin dolor"]'::jsonb),

-- 25
('Meadows row',
 'jalon_horizontal', FALSE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'medio', 3,
 35, 90,
 'Remo unilateral con la barra en posición landmine (extremo en una esquina). El ángulo del jalón y la posición del cuerpo permiten un rango de movimiento mayor que el remo con mancuerna y una carga superior al remo en cable. Popularizado por el culturista John Meadows. Permite trabajar el dorsal en un ángulo que los remos convencionales no cubren.',
 '["Pararse perpendicularmente a la barra con el pie exterior adelantado", "Agarre al final de la barra con la mano exterior del cuerpo", "El codo sube alto hacia el techo en la contracción máxima — más alto que en el remo estándar", "El torso puede rotar ligeramente en el excéntrico para aumentar el rango de estiramiento del dorsal", "La rodilla exterior puede apoyarse en el muslo para dar apoyo sin usar un banco"]'::jsonb),

-- 26
('Seal row',
 'jalon_horizontal', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 3,
 35, 90,
 'Remo en decúbito prono sobre banco elevado con pecho y abdomen completamente apoyados. Elimina absolutamente la demanda de estabilización lumbar. No hay posibilidad de usar el torso para ayudar al movimiento — el estímulo va íntegramente a la espalda. Permite mayor carga o volumen que el remo libre sin acumular fatiga espinal.',
 '["El banco debe estar elevado suficiente para que las mancuernas no toquen el suelo en el inicio", "Pecho y abdomen completamente apoyados en todo momento — no levantarlos", "Las escápulas se retraen antes de jalar: el movimiento comienza en la espalda, no en los codos", "Las mancuernas cuelgan perpendiculares al suelo en la posición de inicio", "Cuello en posición neutra: mirar hacia el suelo, no hacia adelante"]'::jsonb),

-- 27
('Dominadas lastradas',
 'jalon_vertical', TRUE, TRUE, 'avanzado',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 4, 2, 'minimo', 5,
 40, 180,
 'Dominadas con carga adicional mediante cinturón de lastre, chaleco de peso, o mancuerna entre los pies. Progresión para cuando las dominadas con peso corporal son insuficientes como estímulo. La única forma de continuar la progresión de carga en el patrón de dominada. Alta demanda de fuerza relativa y de agarre.',
 '["Dominar mínimo 10 dominadas estrictas con peso corporal antes de añadir carga", "El cinturón de lastre es el método más seguro — la mancuerna entre los pies es menos estable", "Comenzar con 5kg adicionales y progresar de forma conservadora", "La técnica no debe degradarse con la carga: si la técnica cae, la carga es excesiva", "El agarre puede ser el factor limitante — usar straps con mucha carga para no limitar el trabajo de espalda"]'::jsonb),

-- 28
('Remo en máquina Smith',
 'jalon_horizontal', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'minimo', 3,
 35, 90,
 'Remo en bisagra con la barra de la máquina Smith. La guía estabiliza el recorrido de la barra permitiendo mayor concentración en la retracción escapular. La fricción de los rieles reduce la carga efectiva respecto al remo libre. Útil para principiantes, como ejercicio de alto volumen, o cuando la columna necesita el soporte del patrón guiado.',
 '["Posición de bisagra igual que en el remo con barra libre: 45–70° respecto al suelo", "La escápula inicia el movimiento — los brazos terminan", "La barra sube hacia el ombligo o la parte baja del pecho según el agarre", "La fricción de los rieles reduce la carga real: ajustar el peso en consecuencia", "No usar el impulso del torso aunque la guía de la Smith lo facilite"]'::jsonb),

-- 29
('Snatch grip deadlift',
 'bisagra', TRUE, TRUE, 'avanzado',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 4, 5, 'medio', 5,
 40, 180,
 'Peso muerto convencional con un agarre muy amplio, como en el snatch olímpico. El agarre ancho baja la cadera en la posición de inicio, aumenta el recorrido total y genera mayor demanda de dorsales como estabilizadores. Ejercicio de powerlifting y halterofilia para desarrollar fuerza fuera del suelo con mayor ROM.',
 '["El agarre se ubica en el borde del área con muescas de la barra o según la medida del cuerpo", "La cadera baja más que en el convencional por el agarre amplio — posición más parecida a una sentadilla", "Mayor activación del dorsal como estabilizador de la barra", "La carga es considerablemente menor que en el convencional por la desventaja mecánica del agarre", "Solo para usuarios que dominan el peso muerto convencional y tienen movilidad de hombro completa"]'::jsonb),

-- ============================================================
-- EMPUJE / PECHO / HOMBROS (8)
-- ============================================================

-- 30
('Press de banca declinado con barra',
 'empuje_horizontal', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'minimo', 3,
 40, 120,
 'Press de banca con banco declinado a -15° a -20°. Énfasis en la porción esternal inferior del pectoral con menor participación del deltoides anterior que el press plano. La posición cefálica baja puede aumentar la presión intracraneal — contraindicado en hipertensión no controlada. Los pies deben estar asegurados antes de iniciar.',
 '["Banco a -15° a -20° máximo — mayor declinación incrementa la presión intracraneal", "Los pies asegurados firmemente antes de comenzar cualquier serie", "Barra baja al tercio inferior del pectoral, no al abdomen", "Escápulas retraídas y deprimidas contra el banco durante todo el movimiento", "Detener inmediatamente si aparece presión en la cabeza, mareo o visión borrosa"]'::jsonb),

-- 31
('Press de banca declinado con mancuernas',
 'empuje_horizontal', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'minimo', 3,
 40, 120,
 'Press declinado con mancuernas. Mayor rango de movimiento y demanda de estabilización que con barra. Las mancuernas permiten rotación natural de las muñecas y corrección de desequilibrios entre lados. Requiere colocar las mancuernas antes de adoptar la posición declinada o la asistencia de un compañero.',
 '["Mismas precauciones de posición declinada que con barra", "Las mancuernas se colocan sobre los muslos antes de recostarse — un compañero puede asistir", "El agarre puede rotar naturalmente durante el movimiento — es una ventaja sobre la barra", "Convergencia de mancuernas en el punto más alto sin chocarse", "Descenso controlado hasta sentir el estiramiento del pectoral inferior"]'::jsonb),

-- 32
('Push press con barra',
 'empuje_vertical', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'medio', 4,
 35, 150,
 'Press militar con impulso de piernas mediante un dip rápido de rodillas seguido de extensión explosiva. Permite manejar entre 10–20% más carga que el press estricto. El impulso de piernas es parte técnica del movimiento, no trampa. Desarrolla potencia de la cadena de empuje completa y coordinación entre la parte inferior y superior del cuerpo.',
 '["Dip: flexión rápida de rodillas de 10–15°, torso completamente vertical", "Drive: extensión explosiva de piernas que lanza la barra hacia arriba", "Press: los brazos terminan el movimiento desde donde la inercia lo deja", "El timing entre dip y drive es la clave técnica — sin pausa entre ambos", "No inclinar el torso hacia atrás durante el dip: aumenta el riesgo de lesión lumbar"]'::jsonb),

-- 33
('Press Arnold con mancuernas',
 'empuje_vertical', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'medio', 3,
 45, 120,
 'Press con mancuernas que comienza con palmas hacia el cuerpo y rota a palmas hacia afuera durante el press. Popularizado por Arnold Schwarzenegger. La rotación activa las tres porciones del deltoides en un solo movimiento con mayor rango total que el press estándar. Mayor demanda técnica y menor carga posible que el press estándar.',
 '["La rotación es fluida y continua durante el press — no hay un punto de pausa", "Comenzar con palmas hacia el rostro en la posición baja y llegar a palmas hacia afuera en la cima", "La sincronización entre la rotación y el press determina la eficacia", "Usar cargas menores que en el press estándar por la complejidad del patrón", "El rango de movimiento total es mayor: mejor para hipertrofia de deltoides según el principio de rango elongado"]'::jsonb),

-- 34
('Thruster con mancuernas',
 'empuje_vertical', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'medio', 5,
 40, 120,
 'Combinación de sentadilla frontal y press militar en un movimiento continuo sin pausa entre ambos. La extensión de piernas genera el impulso que inicia el press. Altísima demanda sistémica y cardiovascular. La fatiga metabólica es el estímulo principal, no la carga máxima. Muy utilizado en HIIT, CrossFit y programas de acondicionamiento metabólico.',
 '["Las mancuernas en posición de rack: hombros, codos altos, como en la sentadilla frontal", "La energía de la sentadilla impulsa directamente el press — no son dos movimientos separados con pausa", "Extensión completa de cadera, rodillas y codos al final de cada repetición", "El core transfiere la fuerza de la parte inferior a la superior — mantenerlo activo", "Usar cargas ligeras: el objetivo es la densidad de trabajo, no la carga máxima"]'::jsonb),

-- 35
('Landmine press (press con barra en esquina)',
 'empuje_horizontal', FALSE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 2, 'medio', 3,
 35, 90,
 'Press unilateral con el extremo libre de una barra cuyo otro extremo está anclado en una esquina o soporte landmine. El ángulo del movimiento (entre horizontal y vertical) reduce significativamente la demanda de movilidad de hombro comparado con el press military estricto. Opción superior para usuarios con limitaciones de movilidad o molestias de hombro que impiden el press overhead completo.',
 '["Anclar el extremo opuesto de la barra firmemente en una esquina o soporte específico", "Posición de medio arrodillado (una rodilla en el suelo) para mayor estabilidad", "La mano agarra el extremo libre de la barra y presiona en arco hacia arriba y adelante", "El ángulo del movimiento es natural para el hombro — menos impingement que el press vertical", "Versión bilateral (ambas manos en el extremo) es posible pero menos común"]'::jsonb),

-- 36
('Rotación externa con banda',
 'aislamiento', FALSE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 25, 45,
 'Rotación externa del hombro con banda de resistencia, codo a 90° y pegado al costado. Activa el infraespinoso y el redondo menor. El ejercicio de salud del manguito rotador más importante del catálogo. Debe ser parte de todo programa con alto volumen de press — es el contrapeso directo que previene el desequilibrio entre rotadores internos (fuertes) y externos (débiles) que causa la mayoría de lesiones de hombro.',
 '["Codo a 90° y pegado al costado durante todo el movimiento — no debe separarse", "Solo el antebrazo se mueve — el codo es el pivote fijo", "Rango completo hacia afuera sin forzar más allá del límite cómodo", "Usar resistencia mínima — el objetivo es activación y salud, no fuerza máxima", "Incluir en todo programa con alto volumen de press como prevención activa de lesión de hombro"]'::jsonb),

-- 37
('Fondos en paralelas énfasis tríceps',
 'empuje_horizontal', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'medio', 3,
 35, 120,
 'Fondos en paralelas con el torso vertical para maximizar la participación del tríceps. A diferencia de los fondos con torso inclinado (énfasis pecho), mantener el cuerpo erecto desplaza el trabajo hacia el tríceps. El ejercicio de extensión de codo con mayor rango de movimiento y carga posible sin equipo de cable.',
 '["Torso completamente vertical durante todo el movimiento — es la diferencia con los dips de pecho", "Codos viajan directamente hacia atrás, no hacia afuera", "Descenso hasta 90° de flexión de codo como mínimo", "No bajar más allá del paralelo del hombro — el riesgo de lesión capsular aumenta", "Progresar añadiendo carga con cinturón de lastre cuando el peso corporal sea insuficiente"]'::jsonb),

-- 38
('Z press (press sentado en suelo)',
 'empuje_vertical', TRUE, TRUE, 'avanzado',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 4, 3, 'minimo', 3,
 40, 120,
 'Press militar ejecutado sentado en el suelo con las piernas extendidas al frente. Sin respaldo, sin soporte, sin compensación de lordosis lumbar. La posición desnuda cualquier limitación de movilidad de cadera, core y hombro. Herramienta diagnóstica y de entrenamiento que revela y trabaja las limitaciones que el press convencional permite enmascarar.',
 '["Piernas extendidas al frente, columna erguida sin apoyo — no es negociable", "Si el torso colapsa hacia atrás durante el press, la movilidad de cadera o el core es el limitante", "Usar cargas muy reducidas — entre 50–70% del press convencional al inicio", "El torso debe permanecer perfectamente vertical durante todo el movimiento", "Excelente herramienta diagnóstica: las compensaciones que el press convencional oculta aparecen aquí"]'::jsonb)

ON CONFLICT (nombre) DO UPDATE SET
    patron_movimiento    = EXCLUDED.patron_movimiento,
    bilateral            = EXCLUDED.bilateral,
    es_compuesto         = EXCLUDED.es_compuesto,
    dificultad           = EXCLUDED.dificultad,
    technical_level      = EXCLUDED.technical_level,
    error_risk           = EXCLUDED.error_risk,
    space_required       = EXCLUDED.space_required,
    systemic_fatigue     = EXCLUDED.systemic_fatigue,
    set_duration_seconds = EXCLUDED.set_duration_seconds,
    rest_seconds_default = EXCLUDED.rest_seconds_default,
    description          = EXCLUDED.description,
    coaching_cues        = EXCLUDED.coaching_cues;


-- ============================================================
-- SECCIÓN 2 — EQUIPMENT ASSIGNMENTS
-- ============================================================

-- Extensión de cuádriceps en máquina
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Extensión de cuádriceps en máquina' AND eq.name = 'Máquina de extensión de piernas';

-- Curl de isquiotibiales tumbado
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de isquiotibiales tumbado en máquina' AND eq.name = 'Máquina de curl de piernas';

-- Curl de isquiotibiales sentado
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de isquiotibiales sentado en máquina' AND eq.name = 'Máquina de curl de piernas';

-- Zancada lateral
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Zancada lateral (lateral lunge)' AND eq.name = 'Ninguno (peso corporal)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Zancada lateral (lateral lunge)' AND eq.name = 'Mancuernas';

-- Sentadilla Cossack
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla Cossack' AND eq.name = 'Ninguno (peso corporal)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla Cossack' AND eq.name = 'Kettlebell';

-- Abducción de cadera con banda
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Abducción de cadera con banda (de pie)' AND eq.name = 'Banda de resistencia';

-- Abducción de cadera en máquina
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Abducción de cadera en máquina' AND eq.name = 'Máquina de aducción/abducción';

-- Hack squat en máquina
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hack squat en máquina' AND eq.name = 'Máquina Smith';

-- Prensa unilateral
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Prensa unilateral (single leg press)' AND eq.name = 'Prensa de piernas';

-- Good morning con barra
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Good morning con barra' AND eq.name = 'Barra olímpica';

-- Reverse Nordic curl
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Reverse Nordic curl' AND eq.name = 'Ninguno (peso corporal)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Reverse Nordic curl' AND eq.name = 'Banda de resistencia';

-- B-stance RDL
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'B-stance RDL (RDL en media postura)' AND eq.name = 'Mancuernas';

-- Elevación de talones sentado (sóleo)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevación de talones sentado (sóleo)' AND eq.name = 'Mancuernas';

-- Sentadilla Zercher
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla Zercher' AND eq.name = 'Barra olímpica';

-- Sentadilla con pausa
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla con pausa (pause squat)' AND eq.name = 'Barra olímpica';

-- Jefferson curl
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Jefferson curl' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Jefferson curl' AND eq.name = 'Barra EZ';

-- Pull-through en polea baja
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pull-through en polea baja' AND eq.name = 'Polea baja';

-- Dominada agarre neutro
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dominada agarre neutro' AND eq.name = 'Barra fija (dominadas)';

-- Jalón agarre neutro
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Jalón agarre neutro en polea' AND eq.name = 'Polea alta';

-- Straight arm pulldown
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Straight arm pulldown (jalón con brazos extendidos)' AND eq.name = 'Polea alta';

-- Remo en máquina sentado
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo en máquina sentado' AND eq.name = 'Máquina de remo sentado';

-- Dominadas asistidas con banda
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dominadas asistidas con banda' AND eq.name = 'Barra fija (dominadas)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dominadas asistidas con banda' AND eq.name = 'Banda de resistencia';

-- Rack pull
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Rack pull (peso muerto parcial)' AND eq.name = 'Barra olímpica';

-- Déficit deadlift
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Déficit deadlift (peso muerto desde déficit)' AND eq.name = 'Barra olímpica';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Déficit deadlift (peso muerto desde déficit)' AND eq.name = 'Step / Escalón';

-- Meadows row
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Meadows row' AND eq.name = 'Barra olímpica';

-- Seal row
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Seal row' AND eq.name = 'Banco ajustable';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Seal row' AND eq.name = 'Mancuernas';

-- Dominadas lastradas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dominadas lastradas' AND eq.name = 'Barra fija (dominadas)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dominadas lastradas' AND eq.name = 'Disco olímpico';

-- Remo en máquina Smith
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo en máquina Smith' AND eq.name = 'Máquina Smith';

-- Snatch grip deadlift
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Snatch grip deadlift' AND eq.name = 'Barra olímpica';

-- Press banca declinado barra
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca declinado con barra' AND eq.name = 'Barra olímpica';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca declinado con barra' AND eq.name = 'Banco ajustable';

-- Press banca declinado mancuernas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca declinado con mancuernas' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca declinado con mancuernas' AND eq.name = 'Banco ajustable';

-- Push press
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Push press con barra' AND eq.name = 'Barra olímpica';

-- Press Arnold
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press Arnold con mancuernas' AND eq.name = 'Mancuernas';

-- Thruster
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Thruster con mancuernas' AND eq.name = 'Mancuernas';

-- Landmine press
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Landmine press (press con barra en esquina)' AND eq.name = 'Barra olímpica';

-- Rotación externa con banda
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Rotación externa con banda' AND eq.name = 'Banda de resistencia';

-- Fondos en paralelas énfasis tríceps
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Fondos en paralelas énfasis tríceps' AND eq.name = 'Paralelas (dips)';

-- Z press
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Z press (press sentado en suelo)' AND eq.name = 'Barra olímpica';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Z press (press sentado en suelo)' AND eq.name = 'Mancuernas';


-- ============================================================
-- SECCIÓN 3 — MUSCLE ASSIGNMENTS
-- ============================================================

-- Extensión de cuádriceps en máquina
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Extensión de cuádriceps en máquina' AND m.name IN ('Cuádriceps');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Extensión de cuádriceps en máquina' AND m.name IN ('Psoas ilíaco');

-- Curl isquios tumbado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de isquiotibiales tumbado en máquina' AND m.name IN ('Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de isquiotibiales tumbado en máquina' AND m.name IN ('Pantorrilla (gastrocnemio)');

-- Curl isquios sentado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de isquiotibiales sentado en máquina' AND m.name IN ('Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de isquiotibiales sentado en máquina' AND m.name IN ('Pantorrilla (gastrocnemio)');

-- Zancada lateral
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Zancada lateral (lateral lunge)' AND m.name IN ('Cuádriceps', 'Aductores', 'Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Zancada lateral (lateral lunge)' AND m.name IN ('Glúteo medio', 'Isquiotibiales');

-- Sentadilla Cossack
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla Cossack' AND m.name IN ('Cuádriceps', 'Aductores', 'Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla Cossack' AND m.name IN ('Glúteo medio', 'Isquiotibiales', 'Sóleo');

-- Abducción banda de pie
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Abducción de cadera con banda (de pie)' AND m.name IN ('Glúteo medio', 'Glúteo menor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Abducción de cadera con banda (de pie)' AND m.name IN ('Tensor de la fascia lata');

-- Abducción máquina
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Abducción de cadera en máquina' AND m.name IN ('Glúteo medio', 'Glúteo menor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Abducción de cadera en máquina' AND m.name IN ('Tensor de la fascia lata', 'Abductores');

-- Hack squat
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hack squat en máquina' AND m.name IN ('Cuádriceps');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hack squat en máquina' AND m.name IN ('Glúteo mayor', 'Glúteo medio', 'Isquiotibiales');

-- Prensa unilateral
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Prensa unilateral (single leg press)' AND m.name IN ('Cuádriceps', 'Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Prensa unilateral (single leg press)' AND m.name IN ('Isquiotibiales', 'Glúteo medio');

-- Good morning con barra
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Good morning con barra' AND m.name IN ('Isquiotibiales', 'Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Good morning con barra' AND m.name IN ('Glúteo mayor', 'Multífidos');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Good morning con barra' AND m.name IN ('Transverso abdominal');

-- Reverse Nordic curl
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Reverse Nordic curl' AND m.name IN ('Cuádriceps');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Reverse Nordic curl' AND m.name IN ('Psoas ilíaco', 'Glúteo mayor');

-- B-stance RDL
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'B-stance RDL (RDL en media postura)' AND m.name IN ('Isquiotibiales', 'Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'B-stance RDL (RDL en media postura)' AND m.name IN ('Glúteo medio', 'Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'B-stance RDL (RDL en media postura)' AND m.name IN ('Transverso abdominal', 'Oblicuo externo');

-- Elevación de talones sentado (sóleo)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevación de talones sentado (sóleo)' AND m.name IN ('Sóleo');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevación de talones sentado (sóleo)' AND m.name IN ('Pantorrilla (gastrocnemio)');

-- Sentadilla Zercher
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla Zercher' AND m.name IN ('Cuádriceps', 'Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla Zercher' AND m.name IN ('Isquiotibiales', 'Erector espinal', 'Bíceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla Zercher' AND m.name IN ('Transverso abdominal', 'Recto abdominal');

-- Sentadilla con pausa
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla con pausa (pause squat)' AND m.name IN ('Cuádriceps', 'Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla con pausa (pause squat)' AND m.name IN ('Isquiotibiales', 'Glúteo medio', 'Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla con pausa (pause squat)' AND m.name IN ('Transverso abdominal', 'Multífidos');

-- Jefferson curl
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jefferson curl' AND m.name IN ('Erector espinal', 'Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jefferson curl' AND m.name IN ('Glúteo mayor', 'Multífidos');

-- Pull-through
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pull-through en polea baja' AND m.name IN ('Glúteo mayor', 'Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pull-through en polea baja' AND m.name IN ('Erector espinal', 'Glúteo medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pull-through en polea baja' AND m.name IN ('Transverso abdominal');

-- Dominada agarre neutro
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominada agarre neutro' AND m.name IN ('Dorsal ancho', 'Bíceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominada agarre neutro' AND m.name IN ('Braquial', 'Trapecio inferior', 'Romboides', 'Trapecio medio');

-- Jalón agarre neutro
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón agarre neutro en polea' AND m.name IN ('Dorsal ancho', 'Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón agarre neutro en polea' AND m.name IN ('Bíceps braquial', 'Braquial', 'Romboides', 'Trapecio medio');

-- Straight arm pulldown
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Straight arm pulldown (jalón con brazos extendidos)' AND m.name IN ('Dorsal ancho');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Straight arm pulldown (jalón con brazos extendidos)' AND m.name IN ('Pectoral mayor (porción esternal)', 'Trapecio inferior', 'Serrato anterior');

-- Remo en máquina sentado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en máquina sentado' AND m.name IN ('Dorsal ancho', 'Trapecio medio', 'Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en máquina sentado' AND m.name IN ('Bíceps braquial', 'Deltoides posterior', 'Trapecio inferior');

-- Dominadas asistidas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas asistidas con banda' AND m.name IN ('Dorsal ancho', 'Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas asistidas con banda' AND m.name IN ('Bíceps braquial', 'Romboides', 'Trapecio medio');

-- Rack pull
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rack pull (peso muerto parcial)' AND m.name IN ('Erector espinal', 'Glúteo mayor', 'Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rack pull (peso muerto parcial)' AND m.name IN ('Trapecio superior', 'Trapecio medio', 'Flexores del antebrazo');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rack pull (peso muerto parcial)' AND m.name IN ('Transverso abdominal', 'Multífidos');

-- Déficit deadlift
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Déficit deadlift (peso muerto desde déficit)' AND m.name IN ('Isquiotibiales', 'Glúteo mayor', 'Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Déficit deadlift (peso muerto desde déficit)' AND m.name IN ('Cuádriceps', 'Trapecio medio', 'Glúteo medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Déficit deadlift (peso muerto desde déficit)' AND m.name IN ('Transverso abdominal', 'Multífidos');

-- Meadows row
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Meadows row' AND m.name IN ('Dorsal ancho', 'Trapecio medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Meadows row' AND m.name IN ('Bíceps braquial', 'Romboides', 'Deltoides posterior', 'Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Meadows row' AND m.name IN ('Erector espinal', 'Transverso abdominal');

-- Seal row
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Seal row' AND m.name IN ('Dorsal ancho', 'Trapecio medio', 'Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Seal row' AND m.name IN ('Bíceps braquial', 'Deltoides posterior', 'Trapecio inferior');

-- Dominadas lastradas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas lastradas' AND m.name IN ('Dorsal ancho', 'Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas lastradas' AND m.name IN ('Bíceps braquial', 'Braquial', 'Romboides', 'Trapecio medio');

-- Remo en máquina Smith
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en máquina Smith' AND m.name IN ('Dorsal ancho', 'Trapecio medio', 'Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en máquina Smith' AND m.name IN ('Bíceps braquial', 'Deltoides posterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en máquina Smith' AND m.name IN ('Erector espinal', 'Transverso abdominal');

-- Snatch grip deadlift
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Snatch grip deadlift' AND m.name IN ('Isquiotibiales', 'Glúteo mayor', 'Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Snatch grip deadlift' AND m.name IN ('Cuádriceps', 'Dorsal ancho', 'Trapecio superior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Snatch grip deadlift' AND m.name IN ('Transverso abdominal', 'Multífidos');

-- Press declinado barra
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca declinado con barra' AND m.name IN ('Pectoral mayor (porción esternal)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca declinado con barra' AND m.name IN ('Tríceps braquial', 'Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca declinado con barra' AND m.name IN ('Serrato anterior');

-- Press declinado mancuernas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca declinado con mancuernas' AND m.name IN ('Pectoral mayor (porción esternal)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca declinado con mancuernas' AND m.name IN ('Tríceps braquial', 'Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca declinado con mancuernas' AND m.name IN ('Serrato anterior', 'Bíceps braquial');

-- Push press
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push press con barra' AND m.name IN ('Deltoides anterior', 'Deltoides lateral', 'Cuádriceps');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push press con barra' AND m.name IN ('Tríceps braquial', 'Glúteo mayor', 'Trapecio superior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push press con barra' AND m.name IN ('Transverso abdominal', 'Erector espinal');

-- Press Arnold
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press Arnold con mancuernas' AND m.name IN ('Deltoides anterior', 'Deltoides lateral', 'Deltoides posterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press Arnold con mancuernas' AND m.name IN ('Tríceps braquial', 'Trapecio superior');

-- Thruster
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Thruster con mancuernas' AND m.name IN ('Cuádriceps', 'Glúteo mayor', 'Deltoides anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Thruster con mancuernas' AND m.name IN ('Tríceps braquial', 'Isquiotibiales', 'Trapecio superior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Thruster con mancuernas' AND m.name IN ('Transverso abdominal', 'Erector espinal');

-- Landmine press
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Landmine press (press con barra en esquina)' AND m.name IN ('Pectoral mayor (porción clavicular)', 'Deltoides anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Landmine press (press con barra en esquina)' AND m.name IN ('Tríceps braquial', 'Serrato anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Landmine press (press con barra en esquina)' AND m.name IN ('Oblicuo externo', 'Transverso abdominal');

-- Rotación externa con banda
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rotación externa con banda' AND m.name IN ('Infraespinoso', 'Redondo menor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rotación externa con banda' AND m.name IN ('Deltoides posterior');

-- Fondos énfasis tríceps
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Fondos en paralelas énfasis tríceps' AND m.name IN ('Tríceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Fondos en paralelas énfasis tríceps' AND m.name IN ('Deltoides anterior', 'Pectoral mayor (porción esternal)');

-- Z press
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Z press (press sentado en suelo)' AND m.name IN ('Deltoides anterior', 'Deltoides lateral');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Z press (press sentado en suelo)' AND m.name IN ('Tríceps braquial', 'Trapecio superior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Z press (press sentado en suelo)' AND m.name IN ('Transverso abdominal', 'Erector espinal', 'Psoas ilíaco');


-- ============================================================
-- SECCIÓN 4 — CONTRAINDICATION ASSIGNMENTS
-- ============================================================

-- Extensión de cuádriceps
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Alta tensión sobre el tendón patelar en los últimos grados de extensión. Evaluar rango libre de dolor antes de prescribir.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Extensión de cuádriceps en máquina' AND c.name = 'Dolor anterior de rodilla';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Extensión de cuádriceps en máquina' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Extensión de cuádriceps en máquina' AND c.name = 'Meniscopatía aguda';

-- Curl isquios tumbado
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La compresión de la rodilla en flexión completa puede agravar el menisco — limitar ROM a la zona libre de dolor.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Curl de isquiotibiales tumbado en máquina' AND c.name = 'Meniscopatía aguda';

-- Curl isquios sentado
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Curl de isquiotibiales sentado en máquina' AND c.name = 'Meniscopatía aguda';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión de cadera en esta variante puede agravar el impingement femoroacetabular — evaluar individualmente.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Curl de isquiotibiales sentado en máquina' AND c.name = 'Impingement femoroacetabular';

-- Sentadilla Cossack
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión profunda unilateral de rodilla puede agravar el dolor patelofemoral o meniscal.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla Cossack' AND c.name = 'Dolor anterior de rodilla';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla Cossack' AND c.name = 'Meniscopatía aguda';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La rotación forzada de cadera puede reproducir el dolor de impingement femoroacetabular.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla Cossack' AND c.name = 'Impingement femoroacetabular';

-- Hack squat
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión profunda de rodilla bajo carga puede agravar el dolor patelofemoral — limitar ROM si es necesario.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Hack squat en máquina' AND c.name = 'Dolor anterior de rodilla';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Hack squat en máquina' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Hack squat en máquina' AND c.name = 'Meniscopatía aguda';

-- Good morning con barra
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Good morning con barra' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Good morning con barra' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La bisagra profunda con carga axial y alta palanca sobre L4-L5 es incompatible con dolor lumbar crónico activo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Good morning con barra' AND c.name = 'Dolor lumbar crónico';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Good morning con barra' AND c.name = 'Osteoporosis severa';

-- Reverse Nordic curl
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Alta tensión sobre el tendón patelar y el recto femoral proximal. Contraindicado en fase aguda.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Reverse Nordic curl' AND c.name = 'Dolor anterior de rodilla';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Reverse Nordic curl' AND c.name = 'Rotura de ligamento (LCA/LCP)';

-- B-stance RDL
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La bisagra unilateral con carga es incompatible con dolor lumbar agudo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'B-stance RDL (RDL en media postura)' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La carga asimétrica puede agravar la escoliosis si genera compensación lateral.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'B-stance RDL (RDL en media postura)' AND c.name = 'Escoliosis severa';

-- Sentadilla Zercher
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición de la barra en el pliegue del codo genera alta presión local — contraindicado con dolor de codo activo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla Zercher' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla Zercher' AND c.name = 'Rotura de ligamento (LCA/LCP)';

-- Sentadilla con pausa
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La pausa en el punto más bajo aumenta el estrés articular — contraindicada en cualquier patología de rodilla activa.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla con pausa (pause squat)' AND c.name = 'Dolor anterior de rodilla';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla con pausa (pause squat)' AND c.name = 'Dolor lumbar agudo';

-- Jefferson curl
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jefferson curl' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jefferson curl' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jefferson curl' AND c.name = 'Dolor lumbar crónico';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jefferson curl' AND c.name = 'Osteoporosis severa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jefferson curl' AND c.name = 'Cirugía de columna reciente';

-- Rack pull
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Las cargas muy elevadas del rack pull son incompatibles con cualquier patología lumbar activa.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Rack pull (peso muerto parcial)' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Rack pull (peso muerto parcial)' AND c.name = 'Hernia discal lumbar activa';

-- Déficit deadlift
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Déficit deadlift (peso muerto desde déficit)' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Déficit deadlift (peso muerto desde déficit)' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Déficit deadlift (peso muerto desde déficit)' AND c.name = 'Osteoporosis severa';

-- Snatch grip deadlift
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Snatch grip deadlift' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Snatch grip deadlift' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El agarre amplio genera mayor demanda de movilidad de hombro — contraindicado con patología activa.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Snatch grip deadlift' AND c.name = 'Manguito rotador lesionado';

-- Press declinado barra
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición declinada eleva la presión intracraneal. Contraindicación absoluta.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado con barra' AND c.name = 'Hipertensión no controlada';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado con barra' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado con barra' AND c.name = 'Manguito rotador lesionado';

-- Press declinado mancuernas
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado con mancuernas' AND c.name = 'Hipertensión no controlada';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado con mancuernas' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado con mancuernas' AND c.name = 'Manguito rotador lesionado';

-- Push press
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push press con barra' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push press con barra' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El dip rápido puede comprometer la posición lumbar — contraindicado en dolor lumbar agudo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push press con barra' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push press con barra' AND c.name = 'Síndrome de impingement';

-- Press Arnold
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press Arnold con mancuernas' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press Arnold con mancuernas' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La rotación en abducción puede reproducir el arco de impingement subacromial.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press Arnold con mancuernas' AND c.name = 'Síndrome de impingement';

-- Thruster
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Thruster con mancuernas' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Thruster con mancuernas' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Thruster con mancuernas' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Thruster con mancuernas' AND c.name = 'Síndrome de impingement';

-- Fondos énfasis tríceps
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Fondos en paralelas énfasis tríceps' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Fondos en paralelas énfasis tríceps' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El descenso profundo en paralelas coloca el hombro en posición de máxima vulnerabilidad capsular.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Fondos en paralelas énfasis tríceps' AND c.name = 'Inestabilidad glenohumeral';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Fondos en paralelas énfasis tríceps' AND c.name = 'Cirugía de hombro reciente';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El dolor de muñeca en extensión bajo carga completa del cuerpo es una contraindicación relativa.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Fondos en paralelas énfasis tríceps' AND c.name = 'Dolor de muñeca agudo';

-- Z press
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Z press (press sentado en suelo)' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Z press (press sentado en suelo)' AND c.name = 'Síndrome de impingement';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición sentada en suelo con piernas extendidas puede agravar el impingement femoroacetabular.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Z press (press sentado en suelo)' AND c.name = 'Impingement femoroacetabular';

