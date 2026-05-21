-- ============================================================
-- ZYFIT — Exercise Seed Data: Batch 06
-- Patrones: Bisagra, Sentadilla, Empuje H, Jalón V/H, Core, Aislamiento
-- Total: 25 ejercicios
--
-- NOTA TÉCNICA:
-- 'Peso muerto con barra hexagonal' fue OMITIDO porque 'Barra hexagonal'
-- no existe en el catálogo equipment_items. Agregar primero:
--   INSERT INTO equipment_items (name, category, is_gym_only)
--   VALUES ('Barra hexagonal', 'Libre', FALSE);
-- Luego correr ese ejercicio en un batch separado.
-- ============================================================


-- ============================================================
-- SECCIÓN 1 — INSERT INTO exercises
-- ============================================================

INSERT INTO exercises (
  nombre, patron_movimiento, bilateral, es_compuesto, dificultad,
  musculos_primarios, musculos_secundarios, equipamiento, contraindicaciones,
  activo, gif_url, imagen_url,
  technical_level, error_risk, space_required, systemic_fatigue,
  set_duration_seconds, rest_seconds_default, description, coaching_cues
) VALUES

-- 1
('Peso muerto con liga',
 'bisagra', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'medio', 3,
 35, 120,
 'Peso muerto con banda de resistencia anclada bajo los pies. La tensión variable — mínima al inicio y máxima en el lockout — complementa la curva de fuerza natural del movimiento, aumentando la demanda donde el músculo tiene mayor ventaja mecánica. Ideal para entrenamiento en casa, activación técnica antes del peso muerto con barra, o cuando no hay acceso a carga libre.',
 '["Anclar la banda firmemente bajo la parte media del pie — no bajo los dedos ni los talones", "La mecánica de bisagra es idéntica a la versión con barra: columna neutra, bisagra de cadera", "La banda aumenta la resistencia en la extensión: bloquear fuerte arriba con glúteos contraídos", "Usar una banda de resistencia alta para carga suficiente — las bandas ligeras no generan estímulo real", "Controlar el excéntrico — la banda tiende a jalar el cuerpo hacia abajo más rápido de lo deseable"]'::jsonb),

-- 2
('Peso muerto sumo con mancuerna',
 'bisagra', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'medio', 3,
 35, 120,
 'Peso muerto sumo sosteniendo una mancuerna vertical entre las piernas. El stance amplio y el agarre sobre la mancuerna permiten un torso más vertical que el convencional, reduciendo la demanda de movilidad de cadera en flexión. Mayor activación de aductores y glúteo comparado con el peso muerto convencional. Excelente opción cuando no hay barra disponible o como progresión técnica antes del sumo con barra.',
 '["Pies más anchos que los hombros, puntas a 30-45° hacia afuera", "Las rodillas siguen la dirección de las puntas de los pies durante todo el recorrido — no colapsen", "Torso más vertical que en el peso muerto convencional — esta es la ventaja de la variante", "La mancuerna cuelga vertical entre las piernas: agarre por el extremo superior del disco", "Empujar el suelo hacia afuera con los pies — no jalar la mancuerna hacia arriba"]'::jsonb),

-- 3
('Hip thrust con mancuerna',
 'bisagra', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'medio', 3,
 35, 120,
 'Hip thrust con una o dos mancuernas sobre las caderas. Permite mayor control de la carga y progresión gradual antes de pasar a la barra olímpica. Las mancuernas son más cómodas en el punto de contacto con las caderas para usuarios que se inician en el patrón. Misma mecánica de extensión de cadera que el hip thrust con barra, con menor demanda de estabilización del extremo de la carga.',
 '["Escápulas en el borde del banco — no el cuello ni la zona media de la espalda", "Mancuerna(s) sobre el pliegue de la cadera: usar una toalla doblada para mayor comodidad", "Tibias verticales en el punto más alto — pies planos en el suelo, rodillas a 90°", "Pelvis en posición neutra en la cima — no hiperextender la columna lumbar", "Contraer el glúteo fuerte en el punto más alto y mantener 1 segundo antes de descender"]'::jsonb),

-- 4
('Puente glúteo con peso corporal',
 'bisagra', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 25, 45,
 'Extensión de cadera desde posición supina con escápulas y pies en el suelo. El puente glúteo difiere del hip thrust en que no requiere banco, reduciendo el rango de movimiento pero eliminando toda barrera de equipamiento. Ejercicio de entrada al patrón de extensión de cadera, fundamental como activación pre-entrenamiento de glúteo y para usuarios con dolor lumbar que necesitan fortalecer la cadena posterior con carga mínima.',
 '["Pies planos en el suelo a ancho de cadera, rodillas a 90°, talones bajo las rodillas", "Empujar el suelo con los talones — no con toda la planta del pie ni con las puntas", "Contraer el glúteo conscientemente al subir — si sientes más los isquiotibiales, aleja los pies", "La zona lumbar no debe arquearse en exceso en el punto más alto — pelvis neutra", "Progresión: añadir pausa en el punto más alto, luego carga sobre el abdomen"]'::jsonb),

-- 5
('Puente glúteo unilateral con peso corporal',
 'bisagra', FALSE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 2,
 25, 60,
 'Versión unilateral del puente glúteo. La pierna libre se extiende o se mantiene en el aire, aumentando la carga sobre el glúteo de apoyo sin añadir peso externo. Revela desequilibrios izquierda-derecha y es la progresión natural del puente bilateral antes de pasar al hip thrust unilateral con carga.',
 '["Pierna de apoyo: pie plano en el suelo, rodilla a 90°", "La pierna libre se extiende paralela al suelo o se flexiona a 90° — mantenerla completamente fija", "La pelvis debe mantenerse horizontal durante todo el movimiento — no rotar hacia el lado libre", "Contraer el glúteo del lado de apoyo máxima y conscientemente en cada repetición", "Si la pelvis rota o cae hacia un lado, retroceder al puente bilateral hasta mayor fuerza"]'::jsonb),

-- 6
('Frog pump',
 'bisagra', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 25, 45,
 'Extensión de cadera en posición supina con las plantas de los pies juntas y rodillas abiertas. La rotación externa de cadera en esta posición genera una activación específica del glúteo mayor en su componente de extensión y rotación externa simultáneamente. El ROM es reducido pero la contracción pico es intensa. Útil como activación pre-entrenamiento o como ejercicio de alto volumen al final de la sesión.',
 '["Plantas de los pies juntas, rodillas abiertas hacia los lados — posición de rana", "El movimiento es corto: extender la cadera hacia arriba y volver de forma controlada", "Contraer el glúteo activamente en el punto más alto — la contracción, no el rango, es el objetivo", "Puede añadirse una mancuerna o disco sobre el abdomen para aumentar la resistencia", "Series de 20-30 repeticiones con contracción pico en cada rep — ideal como activación"]'::jsonb),

-- 7
('Good morning con disco',
 'bisagra', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 4, 'medio', 3,
 35, 120,
 'Bisagra de cadera con un disco olímpico sostenido detrás de la cabeza o sobre el pecho. Alternativa al good morning con barra cuando no se dispone de rack. El disco limita la carga máxima, reduciendo el riesgo comparado con la versión con barra. Alta demanda de cadena posterior — isquiotibiales, glúteos y erector espinal — con momento de palanca elevado sobre la columna lumbar en el punto más bajo.',
 '["Disco detrás del cuello sobre los trapecios, o al pecho si hay limitación de movilidad cervical", "Bisagra de cadera pura: las rodillas ligeramente flexionadas y fijas — no es una sentadilla", "La columna lumbar permanece neutra en todo el recorrido — no redondear bajo ninguna circunstancia", "Bajar solo hasta donde la columna pueda mantenerse perfectamente recta — respetar el ROM individual", "Usar cargas conservadoras: el momento de palanca sobre L4-L5 es elevado incluso con pesos bajos"]'::jsonb),

-- 8
('Hip thrust con banda',
 'bisagra', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'medio', 2,
 30, 75,
 'Hip thrust con banda de resistencia sobre las caderas en lugar de barra. La tensión variable de la banda — mayor en la extensión completa — complementa la curva de fuerza del glúteo, que también genera más fuerza en ese rango. Opción accesible para entrenamiento en casa con alta especificidad de activación glútea. Especialmente útil para trabajo de activación entre sets de ejercicios compuestos.',
 '["Anclar la banda firmemente bajo los pies o alrededor de un poste/mueble estable", "Escápulas en el borde del banco — misma posición que en el hip thrust con barra", "La tensión máxima de la banda ocurre en la extensión completa: mantener esa posición 1 segundo", "Tibias verticales en el punto más alto, pies planos en el suelo", "Ideal para series de 15-25 repeticiones: la banda permite volumen alto sin fatiga espinal"]'::jsonb),

-- ============================================================
-- SENTADILLA
-- ============================================================

-- 9
('Sentadilla búlgara con peso corporal',
 'sentadilla', FALSE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'medio', 2,
 30, 60,
 'Versión sin carga de la sentadilla búlgara (RFESS). El pie trasero elevado en un banco mientras el peso corporal es la única resistencia. Permite aprender la mecánica del ejercicio — posición del pie delantero, inclinación del torso, control de la rodilla, movilidad de cadera — antes de agregar carga externa. Ejercicio de diagnóstico útil para detectar asimetrías de movilidad que pasarían desapercibidas en movimientos bilaterales.',
 '["Pie delantero lo suficientemente adelante para que la tibia sea vertical en el punto más bajo", "Pie trasero sobre el banco: dorso del pie apoyado — no la punta, no la espinilla", "El descenso es vertical — la rodilla trasera baja directamente hacia el suelo", "Mantener el torso erecto o con ligera inclinación según la movilidad de cadera disponible", "Si hay inestabilidad, apoyar una mano en una pared lateralmente hasta dominar el equilibrio"]'::jsonb),

-- 10
('Sentadilla búlgara contralateral con mancuernas',
 'sentadilla', FALSE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'medio', 3,
 40, 120,
 'Variante de la sentadilla búlgara donde la carga está en la mano contralateral a la pierna de trabajo. La asimetría de la carga genera una demanda de antirrotación y estabilización lateral del torso que no existe en la versión con carga bilateral. Desarrolla fuerza unilateral de pierna con alta transferencia funcional. Recurso frecuente en preparación física deportiva.',
 '["La mancuerna va en la mano opuesta a la pierna delantera que trabaja — este es el punto central", "El torso no debe rotar ni inclinarse lateralmente hacia la carga en ningún momento", "Core activo durante todo el movimiento: resistir la rotación es el desafío adicional de esta variante", "Misma mecánica de pie delantero y pie trasero que la búlgara estándar", "Comenzar con carga ligera: la estabilización del torso falla antes que la fuerza de pierna"]'::jsonb),

-- 11
('Lunge contralateral con mancuerna',
 'sentadilla', FALSE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'amplio', 3,
 35, 90,
 'Zancada estática o caminando con la mancuerna en la mano contralateral a la pierna delantera. La asimetría de carga activa oblicuos y cuadrado lumbar como estabilizadores antirrotacionales mientras la pierna trabaja el patrón de sentadilla unilateral. Mayor transferencia funcional que la zancada bilateral simétrica por la demanda simultánea de estabilización del torso.',
 '["La mancuerna va en la mano opuesta al pie delantero que trabaja — la asimetría es el estímulo", "El torso no rota hacia la mancuerna: activar el oblicuo del lado libre para resistir", "Descenso vertical: la rodilla trasera baja directamente hacia el suelo sin tocar", "Empujar desde el talón del pie delantero para volver a la posición inicial", "Progresar de la versión estática a la caminando solo cuando la técnica esté consolidada"]'::jsonb),

-- 12
('Step up con peso corporal',
 'sentadilla', FALSE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'medio', 2,
 25, 60,
 'Subida a cajón con peso corporal. Versión de entrada al patrón de step up antes de agregar carga. Permite aprender la mecánica correcta de empuje desde el talón, control del descenso excéntrico y estabilización de cadera en carga unilateral. La cadencia lenta en el excéntrico aumenta la demanda sin necesidad de peso adicional.',
 '["El pie completo sobre el cajón — el talón no puede quedar colgando", "Empujar desde el talón del pie sobre el cajón — no desde la pierna que está abajo", "No usar impulso de la pierna de abajo para subir: si lo haces, el cajón es muy alto o la pierna muy débil", "El descenso es controlado: bajar lentamente hasta que el pie toque el suelo", "La altura del cajón determina la demanda: comenzar a altura de rodilla o menos"]'::jsonb),

-- ============================================================
-- EMPUJE HORIZONTAL
-- ============================================================

-- 13
('Press de banca inclinado en máquina Smith',
 'empuje_horizontal', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'minimo', 3,
 40, 120,
 'Press inclinado en máquina Smith con banco a 30-45°. El camino guiado elimina la demanda de estabilización, permitiendo mayor aislamiento del pectoral clavicular y deltoides anterior. Útil para usuarios que aprenden el patrón de press inclinado, como trabajo de alta repetición tras el press libre, o cuando los estabilizadores están fatigados al final de la sesión.',
 '["Banco a 30-45°: más ángulo desplaza el trabajo del pectoral hacia el deltoides anterior", "Ajustar la posición del banco para que la barra baje al pectoral clavicular en el punto más bajo", "Escápulas retraídas y deprimidas contra el banco durante todo el movimiento — activas, no relajadas", "No bloquear los codos en la extensión completa — mantener ligera flexión en el punto más alto", "La guía de la Smith permite enfocar la contracción en el pectoral sin preocuparse por el equilibrio"]'::jsonb),

-- 14
('Press de banca declinado en máquina Smith',
 'empuje_horizontal', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'minimo', 3,
 40, 120,
 'Press declinado en máquina Smith con banco a -15° a -20°. Énfasis en la porción esternal inferior del pectoral con menor participación del deltoides anterior que el press plano. La posición declinada aumenta la presión intracraneal — contraindicado en hipertensión no controlada. La guía de la Smith elimina la necesidad de spotter en posición cefálica baja.',
 '["Banco a -15° a -20°: no inclinar más — a mayor declinación, mayor presión en la cabeza", "Los pies deben estar asegurados firmemente antes de comenzar la serie", "Escápulas activas contra el banco durante todo el movimiento", "La barra baja al tercio inferior del pectoral — no al abdomen", "Detener inmediatamente si aparece presión cefálica, mareos o incomodidad en la vista"]'::jsonb),

-- 15
('Pec deck (mariposa en máquina)',
 'empuje_horizontal', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 2, 'minimo', 2,
 30, 75,
 'Aislamiento del pectoral en máquina de mariposa. La máquina guía el arco de adducción horizontal del hombro, eliminando la demanda de estabilización que existe en las aperturas con mancuernas. Permite mayor tensión en el punto de contracción máxima (posición cerrada) que el fly con mancuernas, donde la tensión es mínima en ese punto. Ideal para alta repetición y trabajo de finalización de pectoral.',
 '["Ajustar el asiento para que los brazos queden paralelos al suelo en el inicio", "El arco termina cuando los antebrazos o codos se encuentran al frente — no forzar más allá", "No dejar que la máquina abra los brazos más allá del estiramiento cómodo — controlar el excéntrico", "El movimiento viene de la contracción del pectoral — no empujar con los brazos ni el torso", "Una pausa de 1 segundo en el punto de máxima contracción aumenta el tiempo bajo tensión"]'::jsonb),

-- 16
('Push up con déficit',
 'empuje_horizontal', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'minimo', 2,
 30, 75,
 'Flexión de brazos con las manos elevadas en paralelas, discos o superficies estables. La elevación permite que el torso descienda por debajo del nivel de las manos, aumentando el rango de movimiento en el descenso y generando mayor estiramiento del pectoral. Superior a la push-up estándar para hipertrofia de pectoral según el principio de entrenamiento en rango elongado (mayor tensión en posición de máximo estiramiento).',
 '["Las manos sobre superficies estables: paralelas, discos, o bloques — nunca superficies inestables", "Bajar hasta que el pecho esté por debajo del nivel de las manos — ese es el punto diferencial", "Codos a 45° del torso durante todo el movimiento — nunca en T", "El rango adicional en el descenso es la razón de ser del ejercicio: no acortarlo", "Mismo bracing de core que en la push-up estándar: cuerpo rígido de cabeza a talones"]'::jsonb),

-- 17
('Push up con liga',
 'empuje_horizontal', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'minimo', 2,
 30, 75,
 'Flexión de brazos con banda de resistencia cruzada sobre la espalda. La banda aumenta la resistencia en el punto de extensión máxima, donde la push-up estándar tiene la menor carga. Permite sobrecarga progresiva del patrón de push-up sin equipamiento de pesas. La resistencia variable complementa la curva de fuerza del empuje horizontal y hace la variante superior a la estándar para desarrollo de fuerza máxima.',
 '["La banda cruza en diagonal sobre la espalda; las palmas la sujetan contra el suelo en cada lado", "No colocar la banda sobre las muñecas — puede generar lesión en la articulación al cambiar el eje de carga", "La resistencia aumenta al subir: el punto más alto es el más difícil — prepararse para ello", "Comenzar con bandas ligeras: la carga adicional puede sorprender incluso a usuarios fuertes", "Si la banda se desplaza durante el movimiento, reducir la resistencia o ajustar el cruce"]'::jsonb),

-- 18
('Push up lastrado',
 'empuje_horizontal', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'minimo', 3,
 30, 90,
 'Flexión de brazos con un disco o chaleco de peso sobre la espalda. Permite sobrecargar progresivamente el patrón cuando las versiones sin carga ya no son suficientes. Superior a aumentar repeticiones indefinidamente para el desarrollo de fuerza máxima en el patrón de empuje horizontal con peso corporal. El disco requiere la asistencia de un compañero para posicionarlo con seguridad.',
 '["El disco se coloca en la zona media de la espalda — entre las escápulas — por un compañero antes de la serie", "La espalda permanece perfectamente plana: si el disco se desliza, la técnica está fallando", "Bracing de core especialmente crítico con carga adicional: activar antes de comenzar cada rep", "Comenzar con 5-10kg e ir aumentando progresivamente — el peso sobre la espalda se siente mucho mayor", "Alternativa superior: chaleco lastrado para distribución uniforme y mayor seguridad"]'::jsonb),

-- ============================================================
-- JALÓN VERTICAL
-- ============================================================

-- 19
('Pullover con liga',
 'jalon_vertical', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 1, 'minimo', 2,
 30, 75,
 'Extensión de hombro desde posición overhead con banda de resistencia anclada arriba. La tensión variable — mayor al inicio en posición overhead y menor al final — difiere del pullover con mancuerna o polea pero cumple la misma función de activar el dorsal en rango elongado. Útil para calentamiento de espalda, aprendizaje del patrón de extensión de hombro, o cuando no hay acceso a poleas ni mancuernas.',
 '["Anclar la banda en un punto elevado estable: barra de dominadas, argolla en techo o poste", "Los brazos permanecen extendidos durante todo el movimiento — no flexionar el codo", "El movimiento es una extensión de hombro pura: los brazos bajan del overhead a la cadera en arco", "La tensión máxima de la banda ocurre en la posición overhead: controlar ese punto de inicio", "Puede realizarse de pie o arrodillado según el punto de anclaje disponible"]'::jsonb),

-- ============================================================
-- JALÓN HORIZONTAL
-- ============================================================

-- 20
('Seal row',
 'jalon_horizontal', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 3,
 35, 90,
 'Remo bilateral en decúbito prono sobre un banco elevado. El pecho y abdomen apoyados sobre el banco eliminan completamente la demanda de estabilización lumbar, permitiendo aislamiento total de la musculatura de la espalda. No hay posibilidad de hacer trampa con el torso: el movimiento es estrictamente retracción escapular y jalón de codo. Permite mayor carga o volumen que el remo libre sin acumulación de fatiga espinal.',
 '["El banco debe estar lo suficientemente elevado para que las mancuernas no toquen el suelo al inicio", "Pecho y abdomen completamente apoyados en el banco — no hay bisagra de cadera en ningún momento", "Retraer las escápulas antes de jalar: el movimiento comienza en la escápula, no en el codo", "Las mancuernas cuelgan perpendiculares al suelo en el inicio — posición de máximo estiramiento", "El cuello está en posición neutra: mirar al suelo, no elevar la cabeza para ver hacia adelante"]'::jsonb),

-- 21
('Remo en máquina Smith',
 'jalon_horizontal', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'minimo', 3,
 35, 90,
 'Remo en bisagra con la barra de la máquina Smith. La guía de la Smith estabiliza el camino de la barra, permitiendo mayor concentración en la retracción escapular y el jalón. Útil cuando se aprende el patrón de remo o como ejercicio de volumen sin la demanda técnica del remo libre. La fricción de los rieles reduce la carga efectiva respecto a la barra libre.',
 '["Posición de bisagra igual que en el remo convencional: 45-70° respecto al suelo, columna neutra", "Retraer las escápulas antes de jalar: la espalda inicia el movimiento, los brazos terminan", "La barra sube hacia el ombligo o parte baja del pecho según el ancho de agarre", "No usar el impulso del torso para completar la repetición — la guía de la Smith no previene este error", "La fricción de los rieles reduce la carga real: subir el peso respecto al remo libre equivalente"]'::jsonb),

-- ============================================================
-- CORE
-- ============================================================

-- 22
('Elevaciones de piernas acostado',
 'core_antiextension', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 2, 'minimo', 1,
 30, 60,
 'Elevación bilateral de piernas extendidas desde posición supina. La zona lumbar debe permanecer en contacto con el suelo durante todo el recorrido: cuando se despega, el recto abdominal deja de trabajar y la carga se transfiere al psoas y al erector espinal. Versión más accesible que la elevación de piernas colgado al eliminar la demanda de agarre y hombro.',
 '["La zona lumbar SIEMPRE pegada al suelo — este es el único criterio de ejecución correcta", "Si la lumbar se despega, aumentar el ángulo de inicio: piernas más altas, menos recorrido", "Las piernas bajan de forma controlada: no dejar caer ni rebotar en el punto más bajo", "Exhalar durante el descenso de las piernas para facilitar el bracing abdominal activo", "Progresión: piernas flexionadas a 90° → piernas extendidas desde alto → recorrido completo"]'::jsonb),

-- 23
('Plancha de Copenhague',
 'core_antirrotacion', FALSE, FALSE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 2, 'minimo', 2,
 35, 90,
 'Plancha lateral con el pie o tobillo superior apoyado en un banco y la pierna inferior libre en el aire. Activa los aductores de la cadera superior y los estabilizadores laterales del tronco de forma simultánea. Uno de los pocos ejercicios que entrena la aducción de cadera en cadena cinética cerrada. Alta evidencia en prevención de lesiones de aductores en deportes de cancha y contacto.',
 '["El pie o el tobillo superior sobre el banco — posición distal (tobillo) aumenta la palanca y la dificultad", "La pierna inferior puede estar libre en el aire o con el pie levemente apoyado como regresión", "El cuerpo forma una línea recta de la cabeza a los talones — las caderas no deben hundirse", "El hombro de apoyo activo: empujar hacia el suelo, no hundirse entre el hombro y la oreja", "Comenzar con series cortas de 10-15 segundos: la demanda de aductores puede sorprender inicialmente"]'::jsonb),

-- ============================================================
-- AISLAMIENTO
-- ============================================================

-- 24
('Curl de bíceps agarre prono (reverse curl)',
 'aislamiento', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 25, 60,
 'Curl con agarre prono (palmas hacia abajo). El agarre cambia radicalmente el énfasis muscular: el braquiorradial es el motor principal, con menor participación del bíceps braquial. Los extensores del antebrazo trabajan activamente para mantener la muñeca en posición neutra. Complemento esencial para el desarrollo equilibrado del brazo, la fuerza de agarre y la salud del codo.',
 '["Las muñecas permanecen en posición neutra o levemente extendidas — no dejar caer bajo ninguna circunstancia", "Los codos fijos a los costados durante todo el movimiento — misma mecánica que el curl estándar", "Usar cargas menores que en el curl supino: el braquiorradial es más débil que el bíceps braquial", "La barra EZ reduce significativamente el estrés en la muñeca comparado con la barra recta", "El movimiento es idéntico al curl normal: solo el agarre cambia — no modificar la mecánica de codo"]'::jsonb),

-- 25
('Curl de piernas con liga',
 'aislamiento', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 25, 60,
 'Flexión de rodilla con banda de resistencia, en decúbito prono o de pie. Aislamiento de los isquiotibiales sin necesidad de máquina. La tensión variable de la banda es mayor en el punto de máxima flexión, a diferencia de la máquina donde la carga es constante en todo el ROM. Útil para entrenamiento en casa, trabajo de alta repetición o suplemento de volumen de isquiotibiales al final de una sesión.',
 '["Anclar la banda frente a ti a nivel del suelo — debe quedar tensa al inicio del movimiento", "En decúbito prono: la cadera permanece pegada al suelo y fija durante todo el recorrido", "De pie: el muslo permanece fijo y vertical — solo el talón se mueve hacia el glúteo", "El control excéntrico es crítico: los isquiotibiales son especialmente vulnerables en la fase de bajada", "Usar una resistencia que permita al menos 12-15 repeticiones con técnica impecable"]'::jsonb)

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

-- Peso muerto con liga
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Peso muerto con liga' AND eq.name = 'Banda de resistencia';

-- Peso muerto sumo con mancuerna
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Peso muerto sumo con mancuerna' AND eq.name = 'Mancuernas';

-- Hip thrust con mancuerna
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hip thrust con mancuerna' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hip thrust con mancuerna' AND eq.name = 'Banco plano';

-- Puente glúteo con peso corporal
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Puente glúteo con peso corporal' AND eq.name = 'Ninguno (peso corporal)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Puente glúteo con peso corporal' AND eq.name = 'Colchoneta';

-- Puente glúteo unilateral con peso corporal
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Puente glúteo unilateral con peso corporal' AND eq.name = 'Ninguno (peso corporal)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Puente glúteo unilateral con peso corporal' AND eq.name = 'Colchoneta';

-- Frog pump
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Frog pump' AND eq.name = 'Ninguno (peso corporal)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Frog pump' AND eq.name = 'Colchoneta';

-- Good morning con disco
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Good morning con disco' AND eq.name = 'Disco olímpico';

-- Hip thrust con banda
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hip thrust con banda' AND eq.name = 'Banda de resistencia';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hip thrust con banda' AND eq.name = 'Banco plano';

-- Sentadilla búlgara con peso corporal
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla búlgara con peso corporal' AND eq.name = 'Banco plano';

-- Sentadilla búlgara contralateral con mancuernas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla búlgara contralateral con mancuernas' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla búlgara contralateral con mancuernas' AND eq.name = 'Banco plano';

-- Lunge contralateral con mancuerna
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Lunge contralateral con mancuerna' AND eq.name = 'Mancuernas';

-- Step up con peso corporal
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Step up con peso corporal' AND eq.name = 'Caja pliométrica';

-- Press de banca inclinado en máquina Smith
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca inclinado en máquina Smith' AND eq.name = 'Máquina Smith';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca inclinado en máquina Smith' AND eq.name = 'Banco ajustable';

-- Press de banca declinado en máquina Smith
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca declinado en máquina Smith' AND eq.name = 'Máquina Smith';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca declinado en máquina Smith' AND eq.name = 'Banco ajustable';

-- Pec deck
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pec deck (mariposa en máquina)' AND eq.name = 'Máquina de pecho';

-- Push up con déficit
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Push up con déficit' AND eq.name = 'Paralelas (dips)';

-- Push up con liga
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Push up con liga' AND eq.name = 'Banda de resistencia';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Push up con liga' AND eq.name = 'Ninguno (peso corporal)';

-- Push up lastrado
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Push up lastrado' AND eq.name = 'Disco olímpico';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Push up lastrado' AND eq.name = 'Ninguno (peso corporal)';

-- Pullover con liga
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pullover con liga' AND eq.name = 'Banda de resistencia';

-- Seal row
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Seal row' AND eq.name = 'Banco ajustable';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Seal row' AND eq.name = 'Mancuernas';

-- Remo en máquina Smith
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo en máquina Smith' AND eq.name = 'Máquina Smith';

-- Elevaciones de piernas acostado
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevaciones de piernas acostado' AND eq.name = 'Ninguno (peso corporal)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevaciones de piernas acostado' AND eq.name = 'Colchoneta';

-- Plancha de Copenhague
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Plancha de Copenhague' AND eq.name = 'Banco plano';

-- Curl de bíceps agarre prono (reverse curl)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de bíceps agarre prono (reverse curl)' AND eq.name = 'Barra EZ';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de bíceps agarre prono (reverse curl)' AND eq.name = 'Mancuernas';

-- Curl de piernas con liga
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de piernas con liga' AND eq.name = 'Banda de resistencia';


-- ============================================================
-- SECCIÓN 3 — MUSCLE ASSIGNMENTS
-- ============================================================

-- Peso muerto con liga
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto con liga'
AND m.name IN ('Isquiotibiales', 'Glúteo mayor', 'Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto con liga'
AND m.name IN ('Cuádriceps', 'Trapecio medio', 'Glúteo medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto con liga'
AND m.name IN ('Transverso abdominal', 'Multífidos');

-- Peso muerto sumo con mancuerna
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto sumo con mancuerna'
AND m.name IN ('Glúteo mayor', 'Aductores', 'Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto sumo con mancuerna'
AND m.name IN ('Cuádriceps', 'Erector espinal', 'Trapecio medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto sumo con mancuerna'
AND m.name IN ('Transverso abdominal');

-- Hip thrust con mancuerna
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust con mancuerna'
AND m.name IN ('Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust con mancuerna'
AND m.name IN ('Isquiotibiales', 'Glúteo medio', 'Cuádriceps');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust con mancuerna'
AND m.name IN ('Transverso abdominal', 'Erector espinal');

-- Puente glúteo con peso corporal
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Puente glúteo con peso corporal'
AND m.name IN ('Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Puente glúteo con peso corporal'
AND m.name IN ('Isquiotibiales', 'Glúteo medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Puente glúteo con peso corporal'
AND m.name IN ('Transverso abdominal');

-- Puente glúteo unilateral con peso corporal
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Puente glúteo unilateral con peso corporal'
AND m.name IN ('Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Puente glúteo unilateral con peso corporal'
AND m.name IN ('Isquiotibiales', 'Glúteo medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Puente glúteo unilateral con peso corporal'
AND m.name IN ('Transverso abdominal', 'Oblicuo externo');

-- Frog pump
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Frog pump'
AND m.name IN ('Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Frog pump'
AND m.name IN ('Glúteo medio', 'Aductores');

-- Good morning con disco
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Good morning con disco'
AND m.name IN ('Isquiotibiales', 'Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Good morning con disco'
AND m.name IN ('Glúteo mayor', 'Multífidos');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Good morning con disco'
AND m.name IN ('Transverso abdominal');

-- Hip thrust con banda
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust con banda'
AND m.name IN ('Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust con banda'
AND m.name IN ('Isquiotibiales', 'Glúteo medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust con banda'
AND m.name IN ('Transverso abdominal', 'Erector espinal');

-- Sentadilla búlgara con peso corporal
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla búlgara con peso corporal'
AND m.name IN ('Cuádriceps', 'Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla búlgara con peso corporal'
AND m.name IN ('Glúteo medio', 'Isquiotibiales', 'Psoas ilíaco');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla búlgara con peso corporal'
AND m.name IN ('Transverso abdominal', 'Pantorrilla (gastrocnemio)');

-- Sentadilla búlgara contralateral con mancuernas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla búlgara contralateral con mancuernas'
AND m.name IN ('Cuádriceps', 'Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla búlgara contralateral con mancuernas'
AND m.name IN ('Glúteo medio', 'Isquiotibiales', 'Oblicuo externo');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla búlgara contralateral con mancuernas'
AND m.name IN ('Transverso abdominal', 'Oblicuo interno');

-- Lunge contralateral con mancuerna
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Lunge contralateral con mancuerna'
AND m.name IN ('Cuádriceps', 'Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Lunge contralateral con mancuerna'
AND m.name IN ('Glúteo medio', 'Isquiotibiales', 'Oblicuo externo');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Lunge contralateral con mancuerna'
AND m.name IN ('Transverso abdominal', 'Cuadrado lumbar');

-- Step up con peso corporal
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Step up con peso corporal'
AND m.name IN ('Cuádriceps', 'Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Step up con peso corporal'
AND m.name IN ('Glúteo medio', 'Isquiotibiales');

-- Press de banca inclinado en máquina Smith
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca inclinado en máquina Smith'
AND m.name IN ('Pectoral mayor (porción clavicular)', 'Deltoides anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca inclinado en máquina Smith'
AND m.name IN ('Tríceps braquial', 'Pectoral mayor (porción esternal)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca inclinado en máquina Smith'
AND m.name IN ('Serrato anterior');

-- Press de banca declinado en máquina Smith
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca declinado en máquina Smith'
AND m.name IN ('Pectoral mayor (porción esternal)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca declinado en máquina Smith'
AND m.name IN ('Tríceps braquial', 'Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca declinado en máquina Smith'
AND m.name IN ('Serrato anterior');

-- Pec deck
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pec deck (mariposa en máquina)'
AND m.name IN ('Pectoral mayor (porción esternal)', 'Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pec deck (mariposa en máquina)'
AND m.name IN ('Deltoides anterior', 'Pectoral menor');

-- Push up con déficit
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push up con déficit'
AND m.name IN ('Pectoral mayor (porción esternal)', 'Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push up con déficit'
AND m.name IN ('Tríceps braquial', 'Deltoides anterior', 'Serrato anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push up con déficit'
AND m.name IN ('Transverso abdominal', 'Recto abdominal', 'Erector espinal');

-- Push up con liga
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push up con liga'
AND m.name IN ('Pectoral mayor (porción esternal)', 'Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push up con liga'
AND m.name IN ('Tríceps braquial', 'Deltoides anterior', 'Serrato anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push up con liga'
AND m.name IN ('Transverso abdominal', 'Erector espinal');

-- Push up lastrado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push up lastrado'
AND m.name IN ('Pectoral mayor (porción esternal)', 'Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push up lastrado'
AND m.name IN ('Tríceps braquial', 'Deltoides anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push up lastrado'
AND m.name IN ('Transverso abdominal', 'Erector espinal', 'Recto abdominal');

-- Pullover con liga
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pullover con liga'
AND m.name IN ('Dorsal ancho');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pullover con liga'
AND m.name IN ('Pectoral mayor (porción esternal)', 'Tríceps braquial', 'Serrato anterior');

-- Seal row
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Seal row'
AND m.name IN ('Dorsal ancho', 'Trapecio medio', 'Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Seal row'
AND m.name IN ('Bíceps braquial', 'Deltoides posterior', 'Trapecio inferior');

-- Remo en máquina Smith
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en máquina Smith'
AND m.name IN ('Dorsal ancho', 'Trapecio medio', 'Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en máquina Smith'
AND m.name IN ('Bíceps braquial', 'Deltoides posterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en máquina Smith'
AND m.name IN ('Erector espinal', 'Transverso abdominal');

-- Elevaciones de piernas acostado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevaciones de piernas acostado'
AND m.name IN ('Recto abdominal', 'Psoas ilíaco');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevaciones de piernas acostado'
AND m.name IN ('Transverso abdominal', 'Cuádriceps', 'Oblicuo externo');

-- Plancha de Copenhague
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha de Copenhague'
AND m.name IN ('Aductores', 'Oblicuo externo', 'Oblicuo interno');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha de Copenhague'
AND m.name IN ('Glúteo medio', 'Cuadrado lumbar', 'Transverso abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha de Copenhague'
AND m.name IN ('Erector espinal');

-- Curl de bíceps agarre prono
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de bíceps agarre prono (reverse curl)'
AND m.name IN ('Braquiorradial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de bíceps agarre prono (reverse curl)'
AND m.name IN ('Bíceps braquial', 'Braquial', 'Extensores del antebrazo');

-- Curl de piernas con liga
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de piernas con liga'
AND m.name IN ('Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de piernas con liga'
AND m.name IN ('Pantorrilla (gastrocnemio)');


-- ============================================================
-- SECCIÓN 4 — CONTRAINDICATION ASSIGNMENTS
-- ============================================================

-- Peso muerto con liga
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La bisagra de cadera bajo carga — aunque sea banda — es incompatible con dolor lumbar agudo activo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto con liga' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión lumbar bajo carga de banda puede agravar la hernia discal activa.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto con liga' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'En fase crónica estable: posible con carga conservadora de banda y técnica impecable. Menor riesgo que la versión con barra.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto con liga' AND c.name = 'Dolor lumbar crónico';

-- Peso muerto sumo con mancuerna
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El stance amplio con flexión profunda de cadera puede reproducir el dolor de impingement femoroacetabular.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto sumo con mancuerna' AND c.name = 'Impingement femoroacetabular';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto sumo con mancuerna' AND c.name = 'Dolor lumbar agudo';

-- Hip thrust con mancuerna
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La hiperextensión de cadera en el punto más alto puede comprimir la columna lumbar en fase aguda.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Hip thrust con mancuerna' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Contraindicado en posición supina con carga >T2. Antes de T2 evaluar individualmente.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Hip thrust con mancuerna' AND c.name = 'Embarazo';

-- Puente glúteo con peso corporal
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Sin carga externa, el riesgo es mínimo pero la posición de extensión de cadera puede provocar espasmo lumbar agudo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Puente glúteo con peso corporal' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Contraindicado en posición supina >T2. En T1 y con supervisión, puede ser tolerable con pelvis neutra.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Puente glúteo con peso corporal' AND c.name = 'Embarazo';

-- Puente glúteo unilateral
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Puente glúteo unilateral con peso corporal' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Contraindicado en posición supina >T2.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Puente glúteo unilateral con peso corporal' AND c.name = 'Embarazo';

-- Frog pump
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Frog pump' AND c.name = 'Dolor de cadera agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La rotación externa forzada de cadera puede reproducir el dolor de impingement femoroacetabular.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Frog pump' AND c.name = 'Impingement femoroacetabular';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Contraindicado en posición supina >T2.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Frog pump' AND c.name = 'Embarazo';

-- Good morning con disco
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Good morning con disco' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Good morning con disco' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La bisagra profunda con carga en palanca larga sobre la columna es incompatible con dolor lumbar crónico activo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Good morning con disco' AND c.name = 'Dolor lumbar crónico';

-- Hip thrust con banda
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La extensión de cadera con carga puede agravar el dolor lumbar agudo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Hip thrust con banda' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Contraindicado en posición supina con carga >T2.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Hip thrust con banda' AND c.name = 'Embarazo';

-- Sentadilla búlgara contralateral con mancuernas
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La carga asimétrica puede agravar la escoliosis si el patrón de compensación es incorrecto.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla búlgara contralateral con mancuernas' AND c.name = 'Escoliosis severa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla búlgara contralateral con mancuernas' AND c.name = 'Rotura de ligamento (LCA/LCP)';

-- Lunge contralateral con mancuerna
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Lunge contralateral con mancuerna' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La carga asimétrica aumenta el estrés de torsión sobre la columna — contraindicado en escoliosis severa.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Lunge contralateral con mancuerna' AND c.name = 'Escoliosis severa';

-- Press de banca inclinado en máquina Smith
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca inclinado en máquina Smith' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca inclinado en máquina Smith' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El ángulo inclinado aumenta la participación del deltoides anterior — mayor demanda sobre el manguito.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca inclinado en máquina Smith' AND c.name = 'Síndrome de impingement';

-- Press de banca declinado en máquina Smith
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado en máquina Smith' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado en máquina Smith' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición declinada eleva la presión intracraneal. Contraindicación absoluta.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado en máquina Smith' AND c.name = 'Hipertensión no controlada';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La presión intracraneal elevada puede ser problemática incluso en hipertensión controlada — evaluar individualmente.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado en máquina Smith' AND c.name = 'Hipertensión controlada';

-- Pec deck
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Pec deck (mariposa en máquina)' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Pec deck (mariposa en máquina)' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El punto de máximo estiramiento en abducción horizontal es la posición de mayor riesgo para la cápsula glenohumeral inestable.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Pec deck (mariposa en máquina)' AND c.name = 'Inestabilidad glenohumeral';

-- Push up con déficit
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El rango ampliado en el descenso aumenta la tensión sobre la cápsula glenohumeral — contraindicado en inestabilidad.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push up con déficit' AND c.name = 'Inestabilidad glenohumeral';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push up con déficit' AND c.name = 'Dolor de muñeca agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La extensión de muñeca bajo carga sostenida puede agravar el síndrome del túnel carpiano.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push up con déficit' AND c.name = 'Síndrome del túnel carpiano';

-- Push up con liga / push up lastrado
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push up con liga' AND c.name = 'Dolor de muñeca agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push up lastrado' AND c.name = 'Dolor de muñeca agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push up lastrado' AND c.name = 'Dolor lumbar agudo';

-- Pullover con liga
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición overhead elongada puede agravar lesiones del manguito o la cápsula glenohumeral.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Pullover con liga' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El estiramiento del dorsal en posición overhead puede reproducir síntomas con manguito lesionado — evaluar con carga mínima primero.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Pullover con liga' AND c.name = 'Manguito rotador lesionado';

-- Seal row
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Seal row' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición de estiramiento máximo colgado puede ser incómoda — evaluar ROM libre de dolor antes de cargar.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Seal row' AND c.name = 'Manguito rotador lesionado';

-- Remo en máquina Smith
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La bisagra sostenida bajo carga es incompatible con dolor lumbar agudo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo en máquina Smith' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo en máquina Smith' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'En lumbar crónico estable: posible con carga conservadora y atención a la posición de la columna.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo en máquina Smith' AND c.name = 'Dolor lumbar crónico';

-- Elevaciones de piernas acostado
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La activación del psoas bajo carga puede aumentar la presión intradiscal — contraindicado en hernia activa.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Elevaciones de piernas acostado' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Elevaciones de piernas acostado' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión de cadera con carga puede reproducir el dolor de impingement — evaluar ROM libre de síntomas.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Elevaciones de piernas acostado' AND c.name = 'Impingement femoroacetabular';

-- Plancha de Copenhague
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Plancha de Copenhague' AND c.name = 'Dolor de cadera agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La carga en aducción puede agravar la artrosis de cadera — usar series muy cortas y sin dolor como criterio.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Plancha de Copenhague' AND c.name = 'Artrosis de cadera';

-- Curl de bíceps agarre prono
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Curl de bíceps agarre prono (reverse curl)' AND c.name = 'Dolor de muñeca agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición de extensión de muñeca bajo carga agrava la tendinitis — usar barra EZ y carga muy reducida o suspender.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Curl de bíceps agarre prono (reverse curl)' AND c.name = 'Tendinitis de muñeca';

-- Curl de piernas con liga
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La compresión de la rodilla en flexión completa puede agravar el menisco — limitar el ROM a la zona libre de dolor.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Curl de piernas con liga' AND c.name = 'Meniscopatía aguda';

