-- ============================================================
-- ZYFIT — Exercise Seed Data: Batch 04
-- Patterns: Core (Antiextensión + Antirrotación + Antiflexión + Cargada)
-- Total exercises: 28
-- ============================================================

-- ============================================================
-- CORE — ANTIEXTENSIÓN
-- El core resiste que la columna se extienda (arquee).
-- La mayoría de ejercicios "abdominales" clásicos son antiextensión.
-- ============================================================

INSERT INTO exercises (nombre, patron_movimiento, bilateral, es_compuesto, dificultad, musculos_primarios, musculos_secundarios, equipamiento, contraindicaciones, activo, gif_url, imagen_url, technical_level, error_risk, space_required, systemic_fatigue, set_duration_seconds, rest_seconds_default, description, coaching_cues) VALUES

-- 1
('Plancha frontal (plank)',
 'core_antiextension', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 2, 'minimo', 1, 45, 45,
 'El ejercicio de antiextensión por excelencia. El objetivo no es aguantar el tiempo más largo posible sino mantener una posición perfecta. La activación del transverso abdominal, glúteos y cuádriceps simultáneamente es lo que hace efectivo al ejercicio — no la duración.',
 '["Cuerpo rígido de cabeza a talones: sin hundir caderas ni elevarlas", "Glúteos contraídos — si no los activas, la columna lumbar se archiva", "Escápulas activas: empujar el suelo, no hundirse entre los hombros", "Cabeza en posición neutra — no elevar ni hundir", "La calidad siempre supera la duración: termina al perder posición"]'::jsonb),

-- 2
('Plancha frontal sobre manos (push-up position)',
 'core_antiextension', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 2, 'minimo', 1, 40, 45,
 'Plancha en posición de push-up con brazos extendidos. Mayor demanda de estabilización de hombro que la versión sobre codos. Punto de partida para variantes dinámicas como el rollout.',
 '["Misma alineación que la plancha sobre codos", "Brazos completamente extendidos, muñecas bajo los hombros", "La tendencia es elevar las caderas: mantenerlas en línea con el torso", "Base para las variantes dinámicas de antiextensión"]'::jsonb),

-- 3
('Rollout con rueda abdominal',
 'core_antiextension', TRUE, FALSE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 4, 'minimo', 2, 35, 90,
 'Extensión desde posición de rodillas o de pie con rueda. Es el ejercicio de antiextensión con mayor rango de movimiento y demanda de fuerza. La columna lumbar debe mantenerse neutra durante todo el recorrido — la pérdida de posición es la lesión.',
 '["Comenzar desde rodillas hasta dominar el patrón", "La pelvis no debe inclinarse anteriormente en ningún punto", "El rango se aumenta de forma gradual — milímetros por semana", "Activar el transverso antes de iniciar el movimiento", "Versión de pie solo para atletas con control lumbar impecable"]'::jsonb),

-- 4
('Dead bug',
 'core_antiextension', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 1, 40, 60,
 'Extensión alterna de brazo y pierna opuesta en decúbito supino manteniendo la columna lumbar pegada al suelo. Uno de los mejores ejercicios de activación del transverso abdominal con disociación de extremidades. Muy utilizado en rehabilitación y como base de patrones más complejos.',
 '["La zona lumbar debe estar pegada al suelo durante TODO el movimiento", "Si la lumbar se despega, el rango está siendo excedido — reducir", "Exhalar durante la extensión para facilitar el bracing", "El movimiento es lento y controlado — no hay componente explosivo", "Brazo y pierna contrarios se extienden simultáneamente"]'::jsonb),

-- 5
('Hollow body hold',
 'core_antiextension', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 2, 40, 60,
 'Posición de flexión de columna con brazos y piernas extendidos. La columna lumbar plana contra el suelo es el objetivo central, no la altura de brazos y piernas. Base de la gimnasia y muchos patrones de calistenia.',
 '["Columna lumbar plana contra el suelo: la prioridad absoluta", "Reducir el rango (subir más los pies, no extender tanto los brazos) si la lumbar se despega", "Progresión: brazos junto al cuerpo → brazos arriba; piernas altas → piernas bajas", "No es una prueba de resistencia — calidad sobre duración"]'::jsonb),

-- 6
('Crunch',
 'core_antiextension', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 2, 'minimo', 1, 30, 45,
 'Flexión parcial de columna en decúbito supino. Activa el recto abdominal en acortamiento. Técnicamente es un ejercicio de flexión lumbar, no de antiextensión, pero se clasifica aquí por tradición y porque su función en el programa es el trabajo abdominal directo. Bajo riesgo si se ejecuta correctamente.',
 '["El movimiento es una flexión de columna, no una elevación de cabeza", "Solo el torso superior sube — la zona lumbar permanece en contacto con el suelo", "Manos detrás de la cabeza: no jalar del cuello", "El recto abdominal trabaja en su rango de acortamiento: el ROM es corto por diseño", "No reemplaza los ejercicios de antiextensión — es complementario"]'::jsonb),

-- 7
('Elevación de piernas colgado',
 'core_antiextension', TRUE, FALSE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 3, 'minimo', 2, 30, 75,
 'Elevación de piernas desde barra fija. La demanda de antiextensión es máxima porque la columna lumbar debe mantenerse neutra mientras las caderas flexionan con carga. Excelente para el recto abdominal y el psoas ilíaco.',
 '["La columna lumbar no debe arquearse ni en la bajada ni en la subida", "Piernas completamente extendidas: mayor demanda. Rodillas flexionadas: menor demanda", "Control total en el excéntrico — bajar de forma controlada", "Evitar el balanceo: genera impulso que elimina el trabajo abdominal", "La posición de colgado activa también el agarre y los hombros"]'::jsonb),

-- 8
('Ab wheel rollout desde rodillas',
 'core_antiextension', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 3, 'minimo', 2, 30, 75,
 'Versión de rodillas del rollout. El punto de entrada al patrón antes de intentar la versión de pie. El rango de movimiento es regulable y permite progresión gradual.',
 '["Comenzar con un rango corto e ir aumentando gradualmente", "La columna lumbar no debe archivarse en ningún punto del recorrido", "Activar el transverso antes de extender", "Si sientes tensión en la zona lumbar, el rango es excesivo para el nivel actual"]'::jsonb),

-- 9
('Plancha con deslizamiento (slider plank)',
 'core_antiextension', TRUE, FALSE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 3, 'minimo', 2, 35, 90,
 'Plancha dinámica con extensión alternada de brazos sobre superficie deslizante. Añade un componente dinámico de antiextensión a la plancha estática. Mayor demanda que la plancha estándar.',
 '["Mantener la pelvis completamente estable durante el movimiento del brazo", "El rango del deslizamiento se aumenta progresivamente", "La tendencia es rotar la pelvis — es antirotación también"]'::jsonb),

-- ============================================================
-- CORE — ANTIRROTACIÓN
-- El core resiste la rotación del torso.
-- La mayoría de actividades funcionales requiere este tipo de estabilidad.
-- ============================================================

('Pallof press',
 'core_antirrotacion', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 1, 'minimo', 1, 35, 75,
 'Press horizontal con cable o banda desde posición perpendicular. El cuerpo resiste la rotación que genera la tensión lateral del cable. Uno de los ejercicios de antirrotación más eficientes y seguros. Excelente para todos los niveles.',
 '["De pie o arrodillado perpendicular a la polea", "El cable sale del pecho y vuelve al pecho en línea recta", "La pelvis y los hombros deben mantenerse perfectamente cuadrados", "Cuanto más lejos de la polea, mayor la demanda de antirrotación", "Versión isométrica: sostener la posición extendida"]'::jsonb),

-- 11
('Plancha lateral',
 'core_antirrotacion', FALSE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 1, 40, 60,
 'Plancha lateral sobre codo o mano. El cuerpo resiste la flexión lateral y la rotación. Activa el cuadrado lumbar, oblicuos y glúteo medio simultáneamente. Fundamental para la estabilidad lateral de la columna.',
 '["El cuerpo forma una línea recta de la cabeza a los talones", "La cadera no debe hundirse ni elevarse", "El hombro de apoyo debe mantenerse activo — no hundirse", "Mirada al frente o ligeramente hacia arriba", "Progresión: añadir elevación de pierna o movimiento de cadera"]'::jsonb),

-- 12
('Plancha lateral con elevación de cadera',
 'core_antirrotacion', FALSE, FALSE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 2, 'minimo', 1, 35, 75,
 'Variante dinámica de la plancha lateral con movimiento de cadera hacia el suelo y de vuelta a posición neutra. Añade rango de movimiento y mayor activación de cuadrado lumbar y oblicuos.',
 '["Bajar la cadera solo hasta casi tocar el suelo — no tocar", "Subir de vuelta con control, no con impulso", "La posición de los pies y el hombro no debe cambiar durante el movimiento"]'::jsonb),

-- 13
('Bird dog',
 'core_antirrotacion', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 1, 35, 45,
 'Extensión alterna de brazo y pierna opuesta desde posición cuadrúpeda. Activa el transverso abdominal y los multífidos simultáneamente. Uno de los ejercicios más recomendados en rehabilitación de columna lumbar (McGill, 2010).',
 '["La posición de la columna no debe cambiar durante el movimiento de las extremidades", "La cadera del lado de la pierna que se extiende no debe rotar ni elevarse", "El movimiento es lento y controlado — no hay componente explosivo", "Mantener la posición extendida 2–3 segundos antes de volver", "Mirada al suelo — cuello en posición neutra"]'::jsonb),

-- 14
('Chop y lift en polea',
 'core_antirrotacion', TRUE, FALSE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 2, 'medio', 2, 35, 90,
 'Movimiento diagonal de jalón desde arriba o empuje desde abajo con cable, de pie o arrodillado. El torso resiste y controla la rotación. Excelente para actividad funcional y transferencia a deportes.',
 '["La potencia viene de la rotación controlada de caderas y torso", "Los brazos guían pero no generan la fuerza principal", "Mantener los pies firmes en el suelo durante todo el movimiento", "Variante chop: de arriba hacia abajo. Lift: de abajo hacia arriba"]'::jsonb),

-- 15
('Remo unilateral con resistencia al suelo',
 'core_antirrotacion', FALSE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 2, 35, 75,
 'Remo con cable o banda desde posición de pie o semiarrodillada. El cuerpo resiste la rotación que genera el jalón unilateral. Integra el patrón de jalón horizontal con la estabilización antirrotacional.',
 '["Los hombros no deben rotar durante el jalón", "La cadera del lado que no trabaja mantiene la posición", "Expira durante el jalón para facilitar el bracing"]'::jsonb),

-- ============================================================
-- CORE — ANTIFLEXIÓN LATERAL (Lateral Flexion Resistance)
-- El core resiste la flexión lateral del torso.
-- ============================================================

('Farmer carry bilateral',
 'core_antirrotacion', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'amplio', 3, 40, 90,
 'Caminata con carga pesada en ambas manos. La demanda de antiflexión lateral, antirrotación y estabilización lumbar es enorme. Simple pero brutalmente efectivo. Desarrolla fuerza de agarre, trapecio y estabilización de columna simultáneamente.',
 '["Cargar pesos iguales en ambas manos para comenzar", "Hombros hacia atrás y abajo — no encorvarse", "Pasos cortos y controlados — no balancearse", "Respiración continua y controlada — no contener el aliento", "La columna no debe inclinarse lateralmente en ningún momento"]'::jsonb),

-- 17
('Suitcase carry (carga unilateral)',
 'core_antirrotacion', FALSE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'amplio', 3, 40, 90,
 'Caminata con carga en una sola mano. La carga unilateral genera una demanda de antiflexión lateral y antirrotación mayor que el farmer carry bilateral. El torso debe mantenerse perfectamente vertical sin inclinarse hacia el lado cargado.',
 '["La columna no debe inclinarse hacia ningún lado — este es el objetivo", "No elevar el hombro del lado cargado como compensación", "Mirada al frente, pasos controlados", "Si el torso se inclina, la carga es demasiado pesada"]'::jsonb),

-- 18
('Press unilateral de pie (Pallof overhead)',
 'core_antirrotacion', FALSE, FALSE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 2, 'minimo', 2, 35, 75,
 'Press vertical unilateral de pie con cable o banda. Combina la estabilización antirrotacional con la demanda de empuje vertical. La asimetría de la carga activa el core en antiflexión lateral y antirrotación simultáneamente.',
 '["El torso no debe inclinarse hacia el lado que trabaja", "Core contraído antes de comenzar el press", "La cadera no debe rotar como compensación"]'::jsonb),

-- ============================================================
-- CORE — CARGADA (Loaded / Flexión activa)
-- El core produce movimiento con carga, no solo lo resiste.
-- ============================================================

('Russian twist',
 'core_antirrotacion', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 1, 35, 60,
 'Rotación del torso desde posición de V-sit con o sin carga. Activa los oblicuos en rotación. La posición de pies elevados aumenta la demanda de psoas y recto abdominal como estabilizadores. Técnicamente es un ejercicio de rotación activa.',
 '["La rotación viene del torso, no de los brazos", "Los pies pueden apoyarse en el suelo para comenzar", "No redondear la espalda — mantener la columna en extensión durante la rotación", "El rango de rotación aumenta con la práctica"]'::jsonb),

-- 20
('Giro ruso con peso (medicine ball)',
 'core_antirrotacion', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 2, 35, 60,
 'Russian twist con pelota medicinal o disco. La carga aumenta la demanda de los oblicuos. Mantener el control del objeto durante la rotación requiere coordinación adicional.',
 '["La pelota se mueve con el torso, no independientemente", "Mantener los codos ligeramente flexionados", "Misma mecánica que el Russian twist sin carga"]'::jsonb),

-- 21
('Crunch en polea (cable crunch)',
 'core_antiextension', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 2, 30, 75,
 'Flexión de columna con carga desde polea alta, arrodillado. Permite progresar en carga de forma controlada para el recto abdominal. Superior al crunch convencional para hipertrofia abdominal porque permite añadir resistencia progresiva.',
 '["La carga se ancla en los hombros/cabeza, no en los brazos", "El movimiento es flexión de columna, no flexión de cadera", "Arrodillado frente a la polea, manos junto a la cara", "El objetivo es acercar el esternón al pubis, no bajar la cabeza"]'::jsonb),

-- 22
('Abdominal en máquina',
 'core_antiextension', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 1, 30, 60,
 'Flexión de columna en máquina guiada. El camino más accesible para cargar el recto abdominal con progresión. Sin demanda de coordinación ni técnica. Útil en programas de hipertrofia para complementar los ejercicios de antiextensión.',
 '["El movimiento es flexión de columna — el torso sube, no la cabeza", "Rango completo: desde extensión hasta flexión máxima", "Control en el excéntrico — no dejar que la máquina extienda sin resistencia"]'::jsonb),

-- 23
('L-sit',
 'core_antiextension', TRUE, FALSE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 4, 3, 'minimo', 3, 30, 90,
 'Posición isométrica con caderas a 90° y piernas extendidas en paralelas, barras o suelo. Alta demanda de psoas, recto abdominal y cuádriceps simultáneamente. Un hito de calistenia que requiere semanas de trabajo preparatorio.',
 '["Comenzar con rodillas flexionadas (tuck L-sit) antes de intentar piernas extendidas", "Empujar hacia abajo con las manos activamente — no solo colgar", "Las escápulas deben estar deprimidas — hombros lejos de las orejas", "La progresión es: apoyo en suelo → paralelas → anillas"]'::jsonb),

-- 24
('Hollow body rock',
 'core_antiextension', TRUE, FALSE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 2, 'minimo', 2, 35, 75,
 'Posición hollow body con movimiento de balanceo hacia adelante y atrás. La tensión abdominal debe mantenerse constante durante todo el movimiento. Base del trabajo de anillas y gimnasia.',
 '["Establecer la posición hollow perfecta antes de comenzar el balanceo", "La columna lumbar no debe despegarse del suelo en ningún punto del ciclo", "El movimiento es suave y continuo — no un rebote brusco"]'::jsonb),

-- 25
('Plancha con alcance (plank reach)',
 'core_antirrotacion', TRUE, FALSE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 3, 'minimo', 2, 35, 90,
 'Plancha dinámica con extensión alternada de un brazo al frente. Combina antiextensión con antirrotación. El desafío es mantener la pelvis y el torso completamente estáticos mientras un brazo se extiende.',
 '["La pelvis no debe rotar cuando el brazo se extiende — este es el objetivo", "El alcance es controlado: llevar la mano al frente y volver", "Cuanto más se separan los pies, más fácil la estabilidad lateral"]'::jsonb),

-- 26
('Plancha con movimiento de cadera (hip shift plank)',
 'core_antirrotacion', TRUE, FALSE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 2, 'minimo', 2, 35, 90,
 'Plancha sobre manos con rotación de caderas hacia los lados. Los oblicuos trabajan en movimiento. Mayor demanda dinámica que la plancha estática.',
 '["Las caderas van de lado a lado en un rango controlado", "Los hombros permanecen fijos — solo se mueven las caderas", "No es un ejercicio de velocidad — el control es lo que importa"]'::jsonb),

-- 27
('Mountain climber',
 'core_antiextension', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 3, 30, 60,
 'Plancha dinámica con alternancia de rodillas al pecho. Combina la antiextensión de la plancha con un componente cardiovascular y de coordinación. A mayor velocidad, mayor demanda cardiovascular. A menor velocidad, mayor demanda de control.',
 '["La posición de los hombros no debe cambiar durante el movimiento de las piernas", "Las caderas no suben al llevar la rodilla al pecho", "Velocidad según objetivo: lento para control, rápido para cardio", "La espalda no debe arquearse en ningún momento"]'::jsonb),

-- 28
('Dragon flag (progresión)',
 'core_antiextension', TRUE, FALSE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 5, 4, 'minimo', 3, 35, 120,
 'Extensión excéntrica del cuerpo completo desde posición supina en banco, manteniendo el cuerpo rígido. Uno de los ejercicios de antiextensión más avanzados. Popularizado por Bruce Lee. Requiere dominio previo de hollow body, L-sit y plancha avanzada.',
 '["Solo el torso superior en contacto con el banco — todo lo demás en el aire", "El cuerpo baja como una unidad rígida — no doblar en la cadera", "La fase excéntrica (bajar) es el foco principal antes de dominar la concéntrica", "Regresión: tuck dragon flag con rodillas flexionadas", "No intentar sin dominar completamente el hollow body"]'::jsonb)

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
    coaching_cues        = EXCLUDED.coaching_cues,
    activo               = EXCLUDED.activo;


-- ============================================================
-- EQUIPMENT ASSIGNMENTS
-- ============================================================

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Plancha frontal (plank)' AND eq.name = 'Ninguno (peso corporal)';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Plancha frontal sobre manos (push-up position)' AND eq.name = 'Ninguno (peso corporal)';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Rollout con rueda abdominal' AND eq.name = 'Rueda de abdominales';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dead bug' AND eq.name = 'Ninguno (peso corporal)';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hollow body hold' AND eq.name = 'Ninguno (peso corporal)';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Crunch' AND eq.name = 'Ninguno (peso corporal)';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevación de piernas colgado' AND eq.name = 'Barra fija (dominadas)';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Ab wheel rollout desde rodillas' AND eq.name = 'Rueda de abdominales';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Plancha con deslizamiento (slider plank)' AND eq.name = 'Ninguno (peso corporal)';

-- Pallof press
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pallof press' AND eq.name = 'Polea ajustable';

-- Plancha lateral
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Plancha lateral' AND eq.name = 'Ninguno (peso corporal)';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Plancha lateral con elevación de cadera' AND eq.name = 'Ninguno (peso corporal)';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Bird dog' AND eq.name = 'Ninguno (peso corporal)';

-- Chop y lift
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Chop y lift en polea' AND eq.name = 'Polea ajustable';

-- Remo unilateral antirrotacional
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo unilateral con resistencia al suelo' AND eq.name = 'Polea baja';

-- Farmer carry
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Farmer carry bilateral' AND eq.name = 'Mancuernas';

-- Suitcase carry
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Suitcase carry (carga unilateral)' AND eq.name = 'Mancuernas';

-- Press unilateral de pie
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press unilateral de pie (Pallof overhead)' AND eq.name = 'Polea ajustable';

-- Russian twist
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Russian twist' AND eq.name = 'Ninguno (peso corporal)';

-- Russian twist con peso
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Giro ruso con peso (medicine ball)' AND eq.name = 'Disco olímpico';

-- Cable crunch
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Crunch en polea (cable crunch)' AND eq.name = 'Polea alta';

-- Abdominal máquina
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Abdominal en máquina' AND eq.name = 'Máquina de cable cruzado';

-- L-sit
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'L-sit' AND eq.name = 'Paralelas (dips)';

-- Hollow body rock
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hollow body rock' AND eq.name = 'Ninguno (peso corporal)';

-- Plancha con alcance
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Plancha con alcance (plank reach)' AND eq.name = 'Ninguno (peso corporal)';

-- Plancha con movimiento de cadera
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Plancha con movimiento de cadera (hip shift plank)' AND eq.name = 'Ninguno (peso corporal)';

-- Mountain climber
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Mountain climber' AND eq.name = 'Ninguno (peso corporal)';

-- Dragon flag
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dragon flag (progresión)' AND eq.name = 'Banco plano';


-- ============================================================
-- MUSCLE ASSIGNMENTS
-- ============================================================

-- Plancha frontal
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha frontal (plank)'
AND m.name IN ('Transverso abdominal','Recto abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha frontal (plank)'
AND m.name IN ('Oblicuo externo','Oblicuo interno','Glúteo mayor','Cuádriceps');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha frontal (plank)'
AND m.name IN ('Serrato anterior','Multífidos','Erector espinal');

-- Plancha sobre manos
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha frontal sobre manos (push-up position)'
AND m.name IN ('Transverso abdominal','Recto abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha frontal sobre manos (push-up position)'
AND m.name IN ('Serrato anterior','Glúteo mayor','Cuádriceps');

-- Rollout
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rollout con rueda abdominal'
AND m.name IN ('Transverso abdominal','Recto abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rollout con rueda abdominal'
AND m.name IN ('Oblicuo externo','Oblicuo interno','Dorsal ancho','Serrato anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rollout con rueda abdominal'
AND m.name IN ('Erector espinal','Multífidos','Glúteo mayor');

-- Dead bug
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dead bug'
AND m.name IN ('Transverso abdominal','Recto abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dead bug'
AND m.name IN ('Psoas ilíaco','Multífidos','Oblicuo interno');

-- Hollow body hold
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hollow body hold'
AND m.name IN ('Recto abdominal','Transverso abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hollow body hold'
AND m.name IN ('Psoas ilíaco','Oblicuo externo','Cuádriceps');

-- Crunch
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Crunch'
AND m.name IN ('Recto abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Crunch'
AND m.name IN ('Oblicuo externo','Oblicuo interno');

-- Elevación de piernas colgado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevación de piernas colgado'
AND m.name IN ('Recto abdominal','Psoas ilíaco');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevación de piernas colgado'
AND m.name IN ('Transverso abdominal','Oblicuo externo','Cuádriceps','Flexores del antebrazo');

-- Ab wheel rodillas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Ab wheel rollout desde rodillas'
AND m.name IN ('Transverso abdominal','Recto abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Ab wheel rollout desde rodillas'
AND m.name IN ('Oblicuo externo','Dorsal ancho','Serrato anterior');

-- Plancha con deslizamiento
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha con deslizamiento (slider plank)'
AND m.name IN ('Transverso abdominal','Recto abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha con deslizamiento (slider plank)'
AND m.name IN ('Oblicuo externo','Oblicuo interno','Serrato anterior');

-- Pallof press
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pallof press'
AND m.name IN ('Transverso abdominal','Oblicuo externo','Oblicuo interno');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pallof press'
AND m.name IN ('Glúteo medio','Cuadrado lumbar','Erector espinal');

-- Plancha lateral
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha lateral'
AND m.name IN ('Oblicuo externo','Oblicuo interno','Cuadrado lumbar');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha lateral'
AND m.name IN ('Glúteo medio','Transverso abdominal','Tensor de la fascia lata');

-- Plancha lateral con elevación
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha lateral con elevación de cadera'
AND m.name IN ('Oblicuo externo','Oblicuo interno','Cuadrado lumbar');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha lateral con elevación de cadera'
AND m.name IN ('Glúteo medio','Transverso abdominal');

-- Bird dog
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Bird dog'
AND m.name IN ('Transverso abdominal','Multífidos');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Bird dog'
AND m.name IN ('Glúteo mayor','Erector espinal','Oblicuo externo');

-- Chop y lift
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Chop y lift en polea'
AND m.name IN ('Oblicuo externo','Oblicuo interno');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Chop y lift en polea'
AND m.name IN ('Transverso abdominal','Glúteo mayor','Dorsal ancho','Pectoral mayor (porción esternal)');

-- Remo unilateral antirrotacional
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo unilateral con resistencia al suelo'
AND m.name IN ('Dorsal ancho','Trapecio medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo unilateral con resistencia al suelo'
AND m.name IN ('Oblicuo externo','Oblicuo interno','Transverso abdominal','Bíceps braquial');

-- Farmer carry
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Farmer carry bilateral'
AND m.name IN ('Trapecio superior','Erector espinal','Transverso abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Farmer carry bilateral'
AND m.name IN ('Flexores del antebrazo','Glúteo mayor','Cuádriceps','Pantorrilla (gastrocnemio)');

-- Suitcase carry
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Suitcase carry (carga unilateral)'
AND m.name IN ('Cuadrado lumbar','Oblicuo externo','Oblicuo interno');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Suitcase carry (carga unilateral)'
AND m.name IN ('Trapecio superior','Erector espinal','Flexores del antebrazo','Glúteo medio');

-- Press unilateral de pie
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press unilateral de pie (Pallof overhead)'
AND m.name IN ('Oblicuo externo','Oblicuo interno','Transverso abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press unilateral de pie (Pallof overhead)'
AND m.name IN ('Deltoides anterior','Tríceps braquial','Glúteo medio');

-- Russian twist
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Russian twist'
AND m.name IN ('Oblicuo externo','Oblicuo interno');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Russian twist'
AND m.name IN ('Recto abdominal','Transverso abdominal','Psoas ilíaco');

-- Giro ruso con peso
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Giro ruso con peso (medicine ball)'
AND m.name IN ('Oblicuo externo','Oblicuo interno');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Giro ruso con peso (medicine ball)'
AND m.name IN ('Recto abdominal','Psoas ilíaco','Transverso abdominal');

-- Cable crunch
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Crunch en polea (cable crunch)'
AND m.name IN ('Recto abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Crunch en polea (cable crunch)'
AND m.name IN ('Oblicuo externo','Oblicuo interno','Transverso abdominal');

-- Abdominal máquina
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Abdominal en máquina'
AND m.name IN ('Recto abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Abdominal en máquina'
AND m.name IN ('Oblicuo externo','Psoas ilíaco');

-- L-sit
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'L-sit'
AND m.name IN ('Recto abdominal','Psoas ilíaco');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'L-sit'
AND m.name IN ('Cuádriceps','Transverso abdominal','Tríceps braquial','Serrato anterior');

-- Hollow body rock
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hollow body rock'
AND m.name IN ('Recto abdominal','Transverso abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hollow body rock'
AND m.name IN ('Psoas ilíaco','Cuádriceps','Oblicuo externo');

-- Plancha con alcance
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha con alcance (plank reach)'
AND m.name IN ('Transverso abdominal','Oblicuo externo');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha con alcance (plank reach)'
AND m.name IN ('Serrato anterior','Glúteo mayor','Recto abdominal');

-- Plancha hip shift
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha con movimiento de cadera (hip shift plank)'
AND m.name IN ('Oblicuo externo','Oblicuo interno');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha con movimiento de cadera (hip shift plank)'
AND m.name IN ('Transverso abdominal','Recto abdominal','Serrato anterior');

-- Mountain climber
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Mountain climber'
AND m.name IN ('Transverso abdominal','Recto abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Mountain climber'
AND m.name IN ('Psoas ilíaco','Cuádriceps','Oblicuo externo','Serrato anterior');

-- Dragon flag
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dragon flag (progresión)'
AND m.name IN ('Recto abdominal','Transverso abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dragon flag (progresión)'
AND m.name IN ('Oblicuo externo','Oblicuo interno','Psoas ilíaco','Glúteo mayor','Erector espinal');


-- ============================================================
-- CONTRAINDICATION ASSIGNMENTS
-- ============================================================

-- Rollout — lumbar
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La extensión completa de columna bajo carga de antiextensión es absolutamente incompatible con cualquier patología lumbar activa.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Rollout con rueda abdominal' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Rollout con rueda abdominal' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'En lumbar crónico estable: comenzar con rango muy corto y progresar con extrema cautela.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Rollout con rueda abdominal' AND c.name = 'Dolor lumbar crónico';

-- Ab wheel rodillas (misma lógica, menor severidad por menor rango)
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Ab wheel rollout desde rodillas' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Desde rodillas el rango es regulable. Tolerable en lumbar crónico con rango muy corto.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Ab wheel rollout desde rodillas' AND c.name = 'Dolor lumbar crónico';

-- Dead bug — contraindicaciones mínimas, es rehabilitador
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El dead bug está indicado en rehabilitación lumbar cuando se ejecuta correctamente. Si la zona lumbar no puede mantenerse pegada al suelo, reducir el rango.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dead bug' AND c.name = 'Dolor lumbar crónico';

-- Bird dog — ídem, es rehabilitador
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Generalmente indicado en rehabilitación lumbar. Solo contraindicado si el movimiento reproduce el dolor.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Bird dog' AND c.name = 'Dolor lumbar crónico';

-- Crunch — lumbar
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión de columna bajo carga puede agravar la hernia discal lumbar. Contraindicado.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Crunch' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Crunch' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión repetida de columna es controvertida en lumbar crónico. Preferir antiextensión isométrica.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Crunch' AND c.name = 'Dolor lumbar crónico';

-- Elevación de piernas colgado
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Elevación de piernas colgado' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Elevación de piernas colgado' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión de cadera con carga puede agravar el impingement femoroacetabular.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Elevación de piernas colgado' AND c.name = 'Impingement femoroacetabular';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Elevación de piernas colgado' AND c.name = 'Síndrome del túnel carpiano';

-- Plancha frontal — contraindicaciones de muñeca y hombro para variante sobre manos
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La versión sobre codos no afecta la muñeca. Si hay dolor lumbar agudo, la plancha está contraindicada por la carga isométrica sostenida.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Plancha frontal (plank)' AND c.name = 'Dolor lumbar agudo';

INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La extensión de muñeca bajo carga sostenida puede agravar el síndrome del túnel carpiano.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Plancha frontal sobre manos (push-up position)' AND c.name = 'Síndrome del túnel carpiano';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Plancha frontal sobre manos (push-up position)' AND c.name = 'Dolor de muñeca agudo';

-- Hollow body hold — lumbar
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Hollow body hold' AND c.name = 'Dolor lumbar agudo';

-- Cable crunch — lumbar
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión de columna con carga está contraindicada en hernia lumbar activa.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Crunch en polea (cable crunch)' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Crunch en polea (cable crunch)' AND c.name = 'Dolor lumbar agudo';

-- Farmer carry — columna y rodilla
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La carga bilateral en bipedestación puede agravar el dolor lumbar agudo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Farmer carry bilateral' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La carga compresiva en la columna puede ser problemática con hernia activa.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Farmer carry bilateral' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Farmer carry bilateral' AND c.name = 'Síndrome del túnel carpiano';

-- Suitcase carry
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Suitcase carry (carga unilateral)' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La carga asimétrica puede producir flexión lateral de columna que agrava la escoliosis.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Suitcase carry (carga unilateral)' AND c.name = 'Escoliosis severa';

-- Dragon flag
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dragon flag (progresión)' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dragon flag (progresión)' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La extensión de columna bajo la carga del peso corporal completo es absolutamente incompatible con cualquier patología lumbar.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dragon flag (progresión)' AND c.name = 'Dolor lumbar crónico';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dragon flag (progresión)' AND c.name = 'Cirugía de columna reciente';

-- L-sit
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión de cadera con carga puede agravar el impingement femoroacetabular.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'L-sit' AND c.name = 'Impingement femoroacetabular';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La carga en muñeca en extensión puede agravar síntomas del túnel carpiano.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'L-sit' AND c.name = 'Síndrome del túnel carpiano';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'L-sit' AND c.name = 'Dolor de muñeca agudo';

-- Russian twist — lumbar
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La rotación de columna bajo carga puede agravar la hernia discal.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Russian twist' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Russian twist' AND c.name = 'Dolor lumbar agudo';

INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Giro ruso con peso (medicine ball)' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Giro ruso con peso (medicine ball)' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La rotación con carga adicional aumenta el estrés de torsión sobre los discos intervertebrales.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Giro ruso con peso (medicine ball)' AND c.name = 'Dolor lumbar crónico';


-- ============================================================
-- EXERCISE RELATIONSHIPS
-- ============================================================

-- Plancha → progresiones
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'La posición sobre manos añade demanda de estabilización de hombro y es la base para variantes dinámicas.'
FROM exercises s, exercises t WHERE s.nombre = 'Plancha frontal (plank)' AND t.nombre = 'Plancha frontal sobre manos (push-up position)';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'El movimiento dinámico del brazo añade antirrotación a la antiextensión base.'
FROM exercises s, exercises t WHERE s.nombre = 'Plancha frontal (plank)' AND t.nombre = 'Plancha con alcance (plank reach)';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Añade componente cardiovascular y coordinación dinámica manteniendo la antiextensión.'
FROM exercises s, exercises t WHERE s.nombre = 'Plancha frontal (plank)' AND t.nombre = 'Mountain climber';

-- Ab wheel rodillas → rollout
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Rango completo desde posición de pie. Máxima demanda de antiextensión con rueda.'
FROM exercises s, exercises t WHERE s.nombre = 'Ab wheel rollout desde rodillas' AND t.nombre = 'Rollout con rueda abdominal';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'La plancha isométrica establece la posición de partida del rollout. Debe dominarse primero.'
FROM exercises s, exercises t WHERE s.nombre = 'Ab wheel rollout desde rodillas' AND t.nombre = 'Plancha frontal sobre manos (push-up position)';

-- Dead bug → hollow body
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Isométrico con mayor demanda de psoas e isquiotibiales. Progresión natural del dead bug.'
FROM exercises s, exercises t WHERE s.nombre = 'Dead bug' AND t.nombre = 'Hollow body hold';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'El bird dog cuadrúpedo es más accesible como activación de transverso antes del dead bug.'
FROM exercises s, exercises t WHERE s.nombre = 'Dead bug' AND t.nombre = 'Bird dog';

-- Hollow body → hollow body rock → L-sit
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Añade movimiento dinámico manteniendo la tensión abdominal constante.'
FROM exercises s, exercises t WHERE s.nombre = 'Hollow body hold' AND t.nombre = 'Hollow body rock';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'El L-sit requiere el mismo patrón de columna que el hollow body más la fuerza de soporte en brazos.'
FROM exercises s, exercises t WHERE s.nombre = 'Hollow body hold' AND t.nombre = 'L-sit';

-- L-sit → dragon flag
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'El dragon flag es la máxima expresión de la antiextensión dinámica. Requiere dominio previo del L-sit y hollow body.'
FROM exercises s, exercises t WHERE s.nombre = 'L-sit' AND t.nombre = 'Dragon flag (progresión)';

-- Crunch → cable crunch
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Añade resistencia progresiva al mismo patrón de flexión de columna. Superior para hipertrofia del recto abdominal.'
FROM exercises s, exercises t WHERE s.nombre = 'Crunch' AND t.nombre = 'Crunch en polea (cable crunch)';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Máquina guiada elimina la coordinación pero permite carga progresiva similar.'
FROM exercises s, exercises t WHERE s.nombre = 'Crunch en polea (cable crunch)' AND t.nombre = 'Abdominal en máquina';

-- Elevación de piernas colgado
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'El dead bug enseña el control lumbar que se requiere en la elevación de piernas.'
FROM exercises s, exercises t WHERE s.nombre = 'Elevación de piernas colgado' AND t.nombre = 'Dead bug';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'La elevación de piernas sentado en banco reduce la demanda de agarre y hombro.'
FROM exercises s, exercises t WHERE s.nombre = 'Elevación de piernas colgado' AND t.nombre = 'Hollow body hold';

-- Pallof press → chop y lift
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'El Pallof press isométrico es la base antes de añadir el componente dinámico diagonal del chop.'
FROM exercises s, exercises t WHERE s.nombre = 'Chop y lift en polea' AND t.nombre = 'Pallof press';

-- Plancha lateral → con elevación
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Añade rango dinámico de cadera a la plancha lateral estática.'
FROM exercises s, exercises t WHERE s.nombre = 'Plancha lateral' AND t.nombre = 'Plancha lateral con elevación de cadera';

-- Farmer carry → suitcase carry
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'La asimetría de la carga exige mayor antirrotación y antiflexión lateral. Mayor demanda de core.'
FROM exercises s, exercises t WHERE s.nombre = 'Farmer carry bilateral' AND t.nombre = 'Suitcase carry (carga unilateral)';

-- Russian twist → con peso
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Añade carga al mismo patrón de rotación activa.'
FROM exercises s, exercises t WHERE s.nombre = 'Russian twist' AND t.nombre = 'Giro ruso con peso (medicine ball)';
