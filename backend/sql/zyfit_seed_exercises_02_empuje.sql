-- ============================================================
-- ZYFIT — Exercise Seed Data: Batch 02
-- Patterns: Empuje Horizontal + Empuje Vertical
-- Total exercises: 26
-- ============================================================

-- ============================================================
-- EMPUJE HORIZONTAL
-- ============================================================

INSERT INTO exercises (nombre, patron_movimiento, bilateral, es_compuesto, dificultad, musculos_primarios, musculos_secundarios, equipamiento, contraindicaciones, activo, technical_level, error_risk, space_required, systemic_fatigue, set_duration_seconds, rest_seconds_default, description, coaching_cues) VALUES

-- 1
('Press de banca plano con barra',
 'empuje_horizontal', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 3, 3, 'minimo', 4, 40, 150,
 'El empuje horizontal con barra por excelencia. Desarrolla pectoral mayor, deltoides anterior y tríceps. Requiere banco plano y spotter o pines de seguridad para trabajo con carga máxima.',
 '["Agarre a poco más del ancho de hombros", "Escápulas retraídas y deprimidas contra el banco — arco lumbar natural, no forzado", "Pies planos en el suelo o en el banco según movilidad", "Barra baja al tercio inferior del pectoral — no al cuello", "Codos a 45–75° del torso, nunca a 90°", "Empuja la barra hacia atrás y arriba en arco, no vertical puro"]'::jsonb),

-- 2
('Press de banca plano con mancuernas',
 'empuje_horizontal', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 3, 2, 'minimo', 4, 40, 120,
 'Versión con mancuernas del press de banca. Mayor rango de movimiento en el descenso, demanda adicional de estabilización y corrección de desequilibrios. Sin riesgo de quedar atrapado bajo la barra.',
 '["Mancuernas a la altura del pecho en el inicio", "Descenso controlado hasta sentir stretch pectoral — no forzar", "Codos a 45–60° del torso", "Al subir, ligera convergencia de mancuernas en el punto más alto (no chocarlas)", "Posición de escápulas idéntica a la versión con barra"]'::jsonb),

-- 3
('Press de banca inclinado con barra',
 'empuje_horizontal', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 3, 3, 'minimo', 4, 40, 150,
 'Banco inclinado 30–45°. Desplaza el énfasis hacia la porción clavicular del pectoral y el deltoides anterior. Ángulos mayores a 45° transfieren trabajo progresivamente al hombro.',
 '["Banco a 30–45°, no más — mayor ángulo = menos pecho, más hombro", "Barra baja a la parte superior del pectoral", "Misma mecánica de escápulas que el press plano", "Codos ligeramente más cerrados que en press plano"]'::jsonb),

-- 4
('Press de banca inclinado con mancuernas',
 'empuje_horizontal', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 3, 2, 'minimo', 3, 40, 120,
 'Inclinado con mancuernas. Combina el énfasis en pectoral clavicular con mayor ROM y demanda de estabilización. La variante más utilizada para hipertrofia de pectoral superior.',
 '["Mismo ángulo de banco que la versión con barra", "Mayor control requerido por la independencia de cada mancuerna", "Descenso controlado es la clave del ROM ampliado"]'::jsonb),

-- 5
('Press de banca declinado con barra',
 'empuje_horizontal', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 3, 3, 'minimo', 3, 40, 120,
 'Banco declinado 15–30°. Énfasis en porción esternal inferior del pectoral. Menor participación del deltoides anterior que el press plano. La posición cefálica baja puede generar presión intracraneal.',
 '["Banco a –15° a –30° máximo", "Los pies deben estar asegurados", "Barra baja al tercio inferior del pectoral", "Evitar en personas con hipertensión no controlada o glaucoma"]'::jsonb),

-- 6
('Flexión de brazos (push-up) estándar',
 'empuje_horizontal', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 1, 2, 'minimo', 2, 30, 60,
 'El empuje horizontal fundamental sin equipo. Excelente relación dosis-riesgo. Desarrolla pectoral, tríceps y deltoides anterior con alta demanda de core como estabilizador. Infinitas variantes de progresión.',
 '["Manos ligeramente más anchas que los hombros", "Cuerpo rígido de cabeza a talones — no hundir las caderas", "Codos a 45° del torso, nunca en T", "Pecho toca o roza el suelo en el punto más bajo", "Escápulas se protraen al subir — no bloquear"]'::jsonb),

-- 7
('Flexión de brazos con rodillas (push-up modificado)',
 'empuje_horizontal', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 1, 1, 'minimo', 1, 25, 45,
 'Versión de rodillas del push-up. Reduce la carga corporal aproximadamente un 50%. El punto de entrada para personas que aún no pueden hacer push-ups estándar. Misma mecánica de codos y torso.',
 '["Rodillas en el suelo, caderas en extensión — no doblar en V", "Misma alineación de codos que el push-up estándar", "Pecho toca el suelo en el punto más bajo"]'::jsonb),

-- 8
('Flexión de brazos inclinada (push-up elevado)',
 'empuje_horizontal', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 1, 1, 'minimo', 1, 25, 45,
 'Push-up con manos elevadas en banco, escalón o pared. Reduce el porcentaje del peso corporal que se maneja. Ideal como regresión del push-up estándar más eficiente que la versión de rodillas porque mantiene la alineación corporal completa.',
 '["Cuanto más alto el apoyo, más fácil el ejercicio", "Misma alineación corporal que el push-up estándar", "Progresión: bajar la altura del apoyo progresivamente"]'::jsonb),

-- 9
('Flexión de brazos declinada (push-up pies elevados)',
 'empuje_horizontal', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 2, 2, 'minimo', 2, 30, 60,
 'Push-up con pies en banco o cajón. Desplaza énfasis hacia pectoral clavicular y deltoides anterior. Transición entre push-up estándar y press militar.',
 '["Cuanto más altos los pies, más énfasis en pectoral superior y hombro", "Mantener el cuerpo rígido — la tendencia es que las caderas suban", "Misma mecánica de codos"]'::jsonb),

-- 10
('Fondos en paralelas (dips) — énfasis pecho',
 'empuje_horizontal', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 3, 3, 'medio', 4, 35, 120,
 'Empuje en paralelas con inclinación de torso hacia adelante para enfatizar el pectoral inferior. El ángulo del torso determina el músculo dominante: más inclinado = más pecho, más vertical = más tríceps.',
 '["Inclinación de torso 15–30° hacia adelante", "Descenso hasta 90° de flexión de codo como mínimo", "Codos no deben abrirse excesivamente — 45–60° del torso", "Subir de forma controlada sin hiperextender codos", "El hombro debe mantenerse en posición segura — no descender más allá del paralelo"]'::jsonb),

-- 11
('Aperturas con mancuernas en banco plano (fly)',
 'empuje_horizontal', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 2, 3, 'minimo', 2, 35, 90,
 'Aislamiento de pectoral en el plano horizontal. Alta tensión en el pectoral en el punto de máximo estiramiento. ROM amplio con brazo en ligera flexión fija. Técnicamente es un ejercicio de aislamiento a pesar del uso de mancuernas.',
 '["Codos en ligera flexión fija durante todo el movimiento — no es un press", "Descenso hasta sentir estiramiento del pectoral — no forzar el hombro", "El movimiento es un abrazo amplio, no una apertura de alas", "Usar cargas moderadas — el tendón del bíceps y la cápsula glenohumeral están en posición vulnerable"]'::jsonb),

-- 12
('Crossover en polea alta (cable fly)',
 'empuje_horizontal', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 2, 2, 'minimo', 2, 35, 75,
 'Aislamiento de pectoral con cable. La tensión constante del cable (vs punto de mínima tensión de las mancuernas en la posición alta) hace que sea superior para hipertrofia. Múltiples variantes de ángulo.',
 '["Inclinación suave del torso hacia adelante", "Ligera flexión de codo fija — no es un press", "Las manos se cruzan levemente en el punto de contracción máxima", "Control total del excéntrico — el cable jala de vuelta"]'::jsonb),

-- 13
('Press en máquina de pecho',
 'empuje_horizontal', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 1, 1, 'minimo', 3, 35, 90,
 'Press horizontal en máquina guiada. Sin demanda de equilibrio ni estabilización. Ideal para principiantes, fatiga avanzada o cuando los estabilizadores ya están agotados tras el press libre. Menor transferencia funcional.',
 '["Ajustar el asiento para que los agarres queden a la altura del pectoral medio", "Escápulas retraídas contra el respaldo durante todo el movimiento", "No bloquear los codos en la extensión completa"]'::jsonb),

-- ============================================================
-- EMPUJE VERTICAL
-- ============================================================

('Press militar con barra (overhead press)',
 'empuje_vertical', TRUE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 4, 4, 'medio', 4, 40, 150,
 'El press vertical bilateral por excelencia. Desarrolla deltoides en sus tres porciones, tríceps y trapecio superior. Alta demanda de movilidad de hombro y estabilización espinal. La barra debe viajar en línea vertical sobre el centro de masa.',
 '["Agarre ligeramente más ancho que los hombros", "Barra en la parte superior del pecho (rack position) al inicio", "Empujar la cabeza hacia adelante al pasar la barra por la frente — bar path vertical", "Glúteos y core contraídos — no arquear la espalda", "Bloqueo completo en la cima: brazos extendidos, barra sobre la cabeza", "No inclinar el torso hacia atrás para compensar falta de movilidad"]'::jsonb),

-- 15
('Press militar con mancuernas',
 'empuje_vertical', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 3, 3, 'medio', 3, 40, 120,
 'Press vertical con mancuernas. Mayor rango de movimiento, demanda de estabilización y corrección de desequilibrios respecto a la barra. Permite rotación natural de las manos durante el recorrido.',
 '["Mancuernas a la altura de los hombros al inicio, palmas hacia adelante o neutras", "Presionar hacia arriba y ligeramente hacia adentro — convergencia natural", "No forzar la rotación de muñecas si hay incomodidad", "Misma activación de core que con barra"]'::jsonb),

-- 16
('Press Arnold',
 'empuje_vertical', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 3, 3, 'medio', 3, 45, 120,
 'Variante del press con mancuernas con rotación de antebrazo. Comienza con palmas hacia el cuerpo (posición de curl) y rota a palmas hacia afuera durante el press. Activa las tres porciones del deltoides en un solo movimiento.',
 '["Rotación fluida y controlada durante todo el recorrido", "No acelerar la rotación — mantenerla sincronizada con el press", "Mayor rango de movimiento total que el press estándar", "Carga menor que el press estándar por la complejidad del patrón"]'::jsonb),

-- 17
('Press militar en máquina (shoulder press)',
 'empuje_vertical', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 1, 1, 'minimo', 3, 35, 90,
 'Press vertical en máquina guiada. Sin demanda de estabilización. Útil para principiantes o cuando la estabilización del hombro está comprometida temporalmente.',
 '["Ajustar asiento para que los agarres queden a la altura de los hombros", "No bloquear los codos en la extensión", "Escápulas activas contra el respaldo"]'::jsonb),

-- 18
('Elevaciones laterales con mancuernas',
 'empuje_vertical', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 2, 3, 'minimo', 2, 30, 75,
 'Aislamiento del deltoides lateral. El ejercicio más específico para el ancho de hombros. La mecánica correcta implica ligera inclinación del torso, codo ligeramente flexionado y el meñique más alto que el pulgar en el punto más alto.',
 '["Inclinación suave del torso hacia adelante — 10-15°", "Codo ligeramente flexionado y fijo durante todo el movimiento", "Meñique más alto que el pulgar en el punto más alto (rotación interna leve)", "No subir más allá de 90° — aumenta impingement sin mayor activación", "El movimiento sale del codo, no de la muñeca", "Evitar el impulso de caderas — si ocurre, la carga es demasiado alta"]'::jsonb),

-- 19
('Elevaciones frontales con mancuernas',
 'empuje_vertical', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 2, 2, 'minimo', 2, 30, 75,
 'Aislamiento del deltoides anterior. En la mayoría de programas de hipertrofia, el deltoides anterior ya recibe suficiente estímulo de los press horizontales y verticales. Usar con moderación para evitar sobreuso.',
 '["Mancuerna sube a la altura del hombro — no más", "Codo ligeramente flexionado", "Movimiento controlado — especialmente en el excéntrico", "Alternar brazos o bilateral según objetivo"]'::jsonb),

-- 20
('Elevaciones laterales en polea baja',
 'empuje_vertical', FALSE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 2, 2, 'minimo', 2, 30, 75,
 'Aislamiento de deltoides lateral con cable. La tensión del cable en el punto más bajo (donde la mancuerna tiene mínima tensión) hace que sea superior para hipertrofia según evidencia reciente. Versión unilateral.',
 '["Cable a la altura del tobillo o más bajo", "El brazo libre se apoya en la máquina para estabilizar", "Misma mecánica que la versión con mancuerna", "La tensión constante del cable es la ventaja principal"]'::jsonb),

-- 21
('Face pull en polea alta',
 'empuje_vertical', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 2, 2, 'minimo', 2, 30, 75,
 'Ejercicio de rotación externa de hombro y retracción escapular con cable. Técnicamente es un jalón/empuje combinado. Fundamental para la salud del hombro y el balance muscular. Contrapeso al volumen de press.',
 '["Cuerda en agarre neutral, polea a la altura de la cara o ligeramente más alta", "Jalar hacia la cara separando las manos al final del recorrido", "Codos siempre más altos que las muñecas", "Rotación externa completa al final — el objetivo es ese, no la retracción", "Incluir en todo programa con alto volumen de press"]'::jsonb),

-- 22
('Pike push-up',
 'empuje_vertical', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 2, 2, 'minimo', 2, 30, 75,
 'Flexión de brazos en posición de V invertida. El ángulo del cuerpo desplaza el énfasis del pectoral al deltoides. Progresión entre el push-up estándar y el handstand push-up. Sin equipo.',
 '["Caderas altas — cuerpo en V invertida", "Cabeza baja entre los brazos durante el movimiento", "Cuanto más vertical sea el torso, más se asemeja al press militar", "Progresión: elevar los pies para aumentar la verticalidad"]'::jsonb),

-- 23
('Handstand push-up asistido',
 'empuje_vertical', TRUE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 4, 4, 'medio', 3, 35, 120,
 'Press vertical con peso corporal en posición invertida, asistido por la pared. El pináculo del empuje vertical sin equipo. Alta demanda de fuerza de hombro, equilibrio y coordinación.',
 '["Pies apoyados en la pared — no libre por seguridad en las primeras etapas", "Cabeza toca el suelo en el punto más bajo", "Empujar explosivamente hacia arriba", "Núcleo completamente rígido", "Precaución en personas con historial de lesión de hombro"]'::jsonb),

-- 24
('Press de hombros unilateral con mancuerna',
 'empuje_vertical', FALSE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 2, 2, 'minimo', 2, 35, 90,
 'Press vertical unilateral. Corrige desequilibrios de fuerza entre hombros, aumenta demanda de core antirotacional. Puede realizarse sentado o de pie.',
 '["La mano libre puede apoyarse en la cadera o el banco", "Core activo — resistir la tendencia a inclinarse hacia el lado que trabaja", "De pie: mayor demanda de estabilización total", "Sentado: mayor aislamiento del hombro"]'::jsonb),

-- 25
('Thruster con mancuernas',
 'empuje_vertical', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 3, 3, 'medio', 5, 40, 120,
 'Combinación de sentadilla frontal y press militar en un movimiento continuo. Altísima demanda sistémica y cardiovascular. Muy usado en CrossFit y entrenamientos metabólicos. La extensión de piernas impulsa el press.',
 '["La energía de la sentadilla impulsa el press — no son dos movimientos separados", "Codos altos en la posición de sentadilla (rack position)", "Extensión completa de cadera, rodillas y codos al final", "El core transfiere la fuerza de la parte inferior a la superior"]'::jsonb),

-- 26
('Push press con barra',
 'empuje_vertical', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, 3, 3, 'medio', 4, 35, 150,
 'Press militar con impulso de piernas (dip & drive). Permite manejar más carga que el press estricto. Desarrolla potencia de la cadena de empuje completa. El impulso de piernas es parte técnica del movimiento, no trampa.',
 '["Dip: flexión rápida de rodillas ~10–15°, torso vertical", "Drive: extensión explosiva de piernas que impulsa la barra", "Press: terminar el movimiento con los brazos desde donde la inercia lo deja", "Si las piernas no ayudan es un press estricto — el timing es clave", "No inclinar el torso hacia atrás en el dip"]'::jsonb)

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

-- Press banca plano barra
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca plano con barra' AND eq.name = 'Barra olímpica';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca plano con barra' AND eq.name = 'Banco plano';

-- Press banca plano mancuernas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca plano con mancuernas' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca plano con mancuernas' AND eq.name = 'Banco plano';

-- Press banca inclinado barra
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca inclinado con barra' AND eq.name = 'Barra olímpica';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca inclinado con barra' AND eq.name = 'Banco ajustable';

-- Press banca inclinado mancuernas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca inclinado con mancuernas' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca inclinado con mancuernas' AND eq.name = 'Banco ajustable';

-- Press banca declinado
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca declinado con barra' AND eq.name = 'Barra olímpica';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de banca declinado con barra' AND eq.name = 'Banco ajustable';

-- Push-ups
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Flexión de brazos (push-up) estándar' AND eq.name = 'Ninguno (peso corporal)';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Flexión de brazos con rodillas (push-up modificado)' AND eq.name = 'Ninguno (peso corporal)';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Flexión de brazos inclinada (push-up elevado)' AND eq.name = 'Ninguno (peso corporal)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Flexión de brazos inclinada (push-up elevado)' AND eq.name = 'Banco plano';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Flexión de brazos declinada (push-up pies elevados)' AND eq.name = 'Banco plano';

-- Dips
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Fondos en paralelas (dips) — énfasis pecho' AND eq.name = 'Paralelas (dips)';

-- Fly mancuernas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Aperturas con mancuernas en banco plano (fly)' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Aperturas con mancuernas en banco plano (fly)' AND eq.name = 'Banco plano';

-- Crossover
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Crossover en polea alta (cable fly)' AND eq.name = 'Máquina de cable cruzado';

-- Máquina pecho
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press en máquina de pecho' AND eq.name = 'Máquina de pecho';

-- Press militar barra
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press militar con barra (overhead press)' AND eq.name = 'Barra olímpica';

-- Press militar mancuernas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press militar con mancuernas' AND eq.name = 'Mancuernas';

-- Press Arnold
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press Arnold' AND eq.name = 'Mancuernas';

-- Máquina hombros
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press militar en máquina (shoulder press)' AND eq.name = 'Máquina de hombros';

-- Elevaciones laterales mancuernas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevaciones laterales con mancuernas' AND eq.name = 'Mancuernas';

-- Elevaciones frontales
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevaciones frontales con mancuernas' AND eq.name = 'Mancuernas';

-- Elevaciones laterales polea
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevaciones laterales en polea baja' AND eq.name = 'Polea baja';

-- Face pull
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Face pull en polea alta' AND eq.name = 'Polea alta';

-- Pike push-up
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pike push-up' AND eq.name = 'Ninguno (peso corporal)';

-- Handstand push-up
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Handstand push-up asistido' AND eq.name = 'Ninguno (peso corporal)';

-- Press unilateral
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press de hombros unilateral con mancuerna' AND eq.name = 'Mancuernas';

-- Thruster
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Thruster con mancuernas' AND eq.name = 'Mancuernas';

-- Push press
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Push press con barra' AND eq.name = 'Barra olímpica';


-- ============================================================
-- MUSCLE ASSIGNMENTS
-- ============================================================

-- Press banca plano barra
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca plano con barra'
AND m.name IN ('Pectoral mayor (porción esternal)','Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca plano con barra'
AND m.name IN ('Tríceps braquial','Deltoides anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca plano con barra'
AND m.name IN ('Serrato anterior','Pectoral menor','Romboides');

-- Press banca plano mancuernas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca plano con mancuernas'
AND m.name IN ('Pectoral mayor (porción esternal)','Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca plano con mancuernas'
AND m.name IN ('Tríceps braquial','Deltoides anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca plano con mancuernas'
AND m.name IN ('Serrato anterior','Bíceps braquial');

-- Press inclinado barra
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca inclinado con barra'
AND m.name IN ('Pectoral mayor (porción clavicular)','Deltoides anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca inclinado con barra'
AND m.name IN ('Tríceps braquial','Pectoral mayor (porción esternal)');

-- Press inclinado mancuernas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca inclinado con mancuernas'
AND m.name IN ('Pectoral mayor (porción clavicular)','Deltoides anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca inclinado con mancuernas'
AND m.name IN ('Tríceps braquial','Pectoral mayor (porción esternal)');

-- Press declinado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca declinado con barra'
AND m.name IN ('Pectoral mayor (porción esternal)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de banca declinado con barra'
AND m.name IN ('Tríceps braquial','Pectoral mayor (porción clavicular)');

-- Push-up estándar
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Flexión de brazos (push-up) estándar'
AND m.name IN ('Pectoral mayor (porción esternal)','Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Flexión de brazos (push-up) estándar'
AND m.name IN ('Tríceps braquial','Deltoides anterior','Serrato anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Flexión de brazos (push-up) estándar'
AND m.name IN ('Transverso abdominal','Recto abdominal','Erector espinal');

-- Push-up modificado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Flexión de brazos con rodillas (push-up modificado)'
AND m.name IN ('Pectoral mayor (porción esternal)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Flexión de brazos con rodillas (push-up modificado)'
AND m.name IN ('Tríceps braquial','Deltoides anterior');

-- Push-up elevado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Flexión de brazos inclinada (push-up elevado)'
AND m.name IN ('Pectoral mayor (porción esternal)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Flexión de brazos inclinada (push-up elevado)'
AND m.name IN ('Tríceps braquial','Deltoides anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Flexión de brazos inclinada (push-up elevado)'
AND m.name IN ('Transverso abdominal','Erector espinal');

-- Push-up declinado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Flexión de brazos declinada (push-up pies elevados)'
AND m.name IN ('Pectoral mayor (porción clavicular)','Deltoides anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Flexión de brazos declinada (push-up pies elevados)'
AND m.name IN ('Tríceps braquial','Pectoral mayor (porción esternal)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Flexión de brazos declinada (push-up pies elevados)'
AND m.name IN ('Transverso abdominal','Erector espinal');

-- Dips pecho
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Fondos en paralelas (dips) — énfasis pecho'
AND m.name IN ('Pectoral mayor (porción esternal)','Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Fondos en paralelas (dips) — énfasis pecho'
AND m.name IN ('Tríceps braquial','Deltoides anterior','Pectoral menor');

-- Fly mancuernas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Aperturas con mancuernas en banco plano (fly)'
AND m.name IN ('Pectoral mayor (porción esternal)','Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Aperturas con mancuernas en banco plano (fly)'
AND m.name IN ('Deltoides anterior','Bíceps braquial');

-- Crossover
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Crossover en polea alta (cable fly)'
AND m.name IN ('Pectoral mayor (porción esternal)','Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Crossover en polea alta (cable fly)'
AND m.name IN ('Deltoides anterior','Bíceps braquial');

-- Máquina pecho
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press en máquina de pecho'
AND m.name IN ('Pectoral mayor (porción esternal)','Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press en máquina de pecho'
AND m.name IN ('Tríceps braquial','Deltoides anterior');

-- Press militar barra
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press militar con barra (overhead press)'
AND m.name IN ('Deltoides anterior','Deltoides lateral');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press militar con barra (overhead press)'
AND m.name IN ('Tríceps braquial','Trapecio superior','Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press militar con barra (overhead press)'
AND m.name IN ('Serrato anterior','Transverso abdominal','Erector espinal');

-- Press militar mancuernas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press militar con mancuernas'
AND m.name IN ('Deltoides anterior','Deltoides lateral');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press militar con mancuernas'
AND m.name IN ('Tríceps braquial','Trapecio superior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press militar con mancuernas'
AND m.name IN ('Serrato anterior','Transverso abdominal');

-- Press Arnold
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press Arnold'
AND m.name IN ('Deltoides anterior','Deltoides lateral','Deltoides posterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press Arnold'
AND m.name IN ('Tríceps braquial','Trapecio superior');

-- Máquina hombros
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press militar en máquina (shoulder press)'
AND m.name IN ('Deltoides anterior','Deltoides lateral');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press militar en máquina (shoulder press)'
AND m.name IN ('Tríceps braquial');

-- Elevaciones laterales mancuernas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevaciones laterales con mancuernas'
AND m.name IN ('Deltoides lateral');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevaciones laterales con mancuernas'
AND m.name IN ('Trapecio superior','Supraespinoso');

-- Elevaciones frontales
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevaciones frontales con mancuernas'
AND m.name IN ('Deltoides anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevaciones frontales con mancuernas'
AND m.name IN ('Pectoral mayor (porción clavicular)','Trapecio superior');

-- Elevaciones laterales polea
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevaciones laterales en polea baja'
AND m.name IN ('Deltoides lateral');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevaciones laterales en polea baja'
AND m.name IN ('Trapecio superior','Supraespinoso');

-- Face pull
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Face pull en polea alta'
AND m.name IN ('Deltoides posterior','Infraespinoso','Redondo menor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Face pull en polea alta'
AND m.name IN ('Trapecio medio','Romboides','Trapecio inferior');

-- Pike push-up
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pike push-up'
AND m.name IN ('Deltoides anterior','Deltoides lateral');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pike push-up'
AND m.name IN ('Tríceps braquial','Pectoral mayor (porción clavicular)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pike push-up'
AND m.name IN ('Transverso abdominal','Erector espinal');

-- Handstand push-up
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Handstand push-up asistido'
AND m.name IN ('Deltoides anterior','Deltoides lateral');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Handstand push-up asistido'
AND m.name IN ('Tríceps braquial','Trapecio superior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Handstand push-up asistido'
AND m.name IN ('Transverso abdominal','Erector espinal','Serrato anterior');

-- Press unilateral
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de hombros unilateral con mancuerna'
AND m.name IN ('Deltoides anterior','Deltoides lateral');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de hombros unilateral con mancuerna'
AND m.name IN ('Tríceps braquial','Trapecio superior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press de hombros unilateral con mancuerna'
AND m.name IN ('Oblicuo externo','Transverso abdominal');

-- Thruster
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Thruster con mancuernas'
AND m.name IN ('Cuádriceps','Glúteo mayor','Deltoides anterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Thruster con mancuernas'
AND m.name IN ('Tríceps braquial','Isquiotibiales','Trapecio superior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Thruster con mancuernas'
AND m.name IN ('Transverso abdominal','Erector espinal');

-- Push press
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push press con barra'
AND m.name IN ('Deltoides anterior','Deltoides lateral','Cuádriceps');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push press con barra'
AND m.name IN ('Tríceps braquial','Glúteo mayor','Trapecio superior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push press con barra'
AND m.name IN ('Transverso abdominal','Erector espinal');


-- ============================================================
-- CONTRAINDICATION ASSIGNMENTS
-- ============================================================

-- Press banca plano barra
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El press plano genera alta tensión en la cápsula glenohumeral anterior. Contraindicado en fase aguda.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca plano con barra' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca plano con barra' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición de abducción con carga puede reproducir la luxación. Contraindicado.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca plano con barra' AND c.name = 'Inestabilidad glenohumeral';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Dolor de muñeca agudo impide agarre seguro de la barra.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca plano con barra' AND c.name = 'Dolor de muñeca agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La extensión de muñeca bajo carga comprime el canal carpiano.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca plano con barra' AND c.name = 'Síndrome del túnel carpiano';

-- Press banca plano mancuernas (menos restricciones que barra por la libertad de rotación)
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca plano con mancuernas' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca plano con mancuernas' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Aunque las mancuernas permiten rotación libre, la posición de abducción sigue siendo riesgo en inestabilidad glenohumeral.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca plano con mancuernas' AND c.name = 'Inestabilidad glenohumeral';

-- Dips
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Fondos en paralelas (dips) — énfasis pecho' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Fondos en paralelas (dips) — énfasis pecho' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El descenso profundo en dips coloca el hombro en posición de máxima vulnerabilidad capsular.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Fondos en paralelas (dips) — énfasis pecho' AND c.name = 'Inestabilidad glenohumeral';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Alta carga sobre el manguito en posición deprimida. Evitar descenso profundo o sustituir.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Fondos en paralelas (dips) — énfasis pecho' AND c.name = 'Síndrome de impingement';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Fondos en paralelas (dips) — énfasis pecho' AND c.name = 'Cirugía de hombro reciente';

-- Fly mancuernas
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Alta tensión en punto de máximo estiramiento con brazo en abducción — posición de máxima vulnerabilidad capsular.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Aperturas con mancuernas en banco plano (fly)' AND c.name = 'Inestabilidad glenohumeral';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Aperturas con mancuernas en banco plano (fly)' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Aperturas con mancuernas en banco plano (fly)' AND c.name = 'Dolor de hombro agudo';

-- Press militar barra
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press militar con barra (overhead press)' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press militar con barra (overhead press)' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La elevación completa del brazo bajo carga es el movimiento de mayor impingement subacromial.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press militar con barra (overhead press)' AND c.name = 'Síndrome de impingement';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press militar con barra (overhead press)' AND c.name = 'Cirugía de hombro reciente';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La extensión de muñeca bajo carga en agarre de barra puede agravar síntomas.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press militar con barra (overhead press)' AND c.name = 'Síndrome del túnel carpiano';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición overhead con carga axial cervical y lumbar es incompatible con estenosis espinal activa.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press militar con barra (overhead press)' AND c.name = 'Estenosis espinal';

-- Press militar mancuernas
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press militar con mancuernas' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press militar con mancuernas' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Misma precaución overhead que con barra, aunque las mancuernas permiten ajuste de rotación.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press militar con mancuernas' AND c.name = 'Síndrome de impingement';

-- Elevaciones laterales mancuernas
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Elevaciones laterales con mancuernas' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El arco de abducción de 60–90° es el arco de máximo impingement subacromial.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Elevaciones laterales con mancuernas' AND c.name = 'Síndrome de impingement';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El supraespinoso es el músculo más activo en la abducción — contraindicado con desgarro.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Elevaciones laterales con mancuernas' AND c.name = 'Manguito rotador lesionado';

-- Handstand push-up
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Handstand push-up asistido' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Handstand push-up asistido' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Handstand push-up asistido' AND c.name = 'Cirugía de hombro reciente';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición invertida aumenta la presión intracraneal y está contraindicada en hipertensión no controlada.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Handstand push-up asistido' AND c.name = 'Hipertensión no controlada';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El mareo puede desestabilizar la posición invertida con riesgo de caída.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Handstand push-up asistido' AND c.name = 'Mareo/vértigo';

-- Press banca declinado
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición declinada eleva la presión intracraneal. Contraindicado.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado con barra' AND c.name = 'Hipertensión no controlada';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado con barra' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press de banca declinado con barra' AND c.name = 'Manguito rotador lesionado';

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

-- Push press
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push press con barra' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push press con barra' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El dip rápido puede comprimir la espalda baja si hay pérdida de posición neutra.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Push press con barra' AND c.name = 'Dolor lumbar agudo';


-- ============================================================
-- EXERCISE RELATIONSHIPS
-- ============================================================

-- Press banca plano barra → relaciones
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Sin carga fija ni riesgo de quedar atrapado. Mismo patrón motor con mayor libertad de rotación.'
FROM exercises s, exercises t WHERE s.nombre = 'Press de banca plano con barra' AND t.nombre = 'Press de banca plano con mancuernas';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'equipment_alternative', 'Sin banco ni barra. Misma cadena muscular con peso corporal.'
FROM exercises s, exercises t WHERE s.nombre = 'Press de banca plano con barra' AND t.nombre = 'Flexión de brazos (push-up) estándar';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Mayor énfasis en pectoral clavicular. Mismo patrón, distinto ángulo.'
FROM exercises s, exercises t WHERE s.nombre = 'Press de banca plano con barra' AND t.nombre = 'Press de banca inclinado con barra';

-- Push-up estándar → progresiones
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Manos elevadas reducen el porcentaje de peso corporal manteniendo alineación completa.'
FROM exercises s, exercises t WHERE s.nombre = 'Flexión de brazos (push-up) estándar' AND t.nombre = 'Flexión de brazos inclinada (push-up elevado)';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Pies elevados desplazan carga hacia pectoral superior y hombro. Transición al press vertical.'
FROM exercises s, exercises t WHERE s.nombre = 'Flexión de brazos (push-up) estándar' AND t.nombre = 'Flexión de brazos declinada (push-up pies elevados)';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Mayor carga, ROM ampliado, demanda de estabilización por la independencia de las mancuernas.'
FROM exercises s, exercises t WHERE s.nombre = 'Flexión de brazos (push-up) estándar' AND t.nombre = 'Press de banca plano con mancuernas';

-- Push-up modificado
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Patrón idéntico con carga corporal completa.'
FROM exercises s, exercises t WHERE s.nombre = 'Flexión de brazos con rodillas (push-up modificado)' AND t.nombre = 'Flexión de brazos (push-up) estándar';

-- Push-up elevado
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Carga corporal completa. Progresión directa.'
FROM exercises s, exercises t WHERE s.nombre = 'Flexión de brazos inclinada (push-up elevado)' AND t.nombre = 'Flexión de brazos (push-up) estándar';

-- Push-up declinado → pike push-up
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Mayor verticalidad del torso, mayor énfasis en deltoides. Transición al press vertical.'
FROM exercises s, exercises t WHERE s.nombre = 'Flexión de brazos declinada (push-up pies elevados)' AND t.nombre = 'Pike push-up';

-- Pike push-up → handstand push-up
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Torso completamente vertical, peso corporal completo sobre los hombros. Máxima progresión del empuje vertical sin equipo.'
FROM exercises s, exercises t WHERE s.nombre = 'Pike push-up' AND t.nombre = 'Handstand push-up asistido';

-- Dips → alternativas
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'equipment_alternative', 'Sin paralelas, el push-up declinado ofrece énfasis similar en pectoral inferior.'
FROM exercises s, exercises t WHERE s.nombre = 'Fondos en paralelas (dips) — énfasis pecho' AND t.nombre = 'Flexión de brazos declinada (push-up pies elevados)';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Empuje horizontal desde banco es la regresión directa de los dips en paralelas.'
FROM exercises s, exercises t WHERE s.nombre = 'Fondos en paralelas (dips) — énfasis pecho' AND t.nombre = 'Flexión de brazos (push-up) estándar';

-- Press militar barra → relaciones
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Las mancuernas permiten rotación natural de muñeca y menor exigencia de movilidad de hombro.'
FROM exercises s, exercises t WHERE s.nombre = 'Press militar con barra (overhead press)' AND t.nombre = 'Press militar con mancuernas';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Añade componente de potencia con impulso de piernas. Mayor carga posible.'
FROM exercises s, exercises t WHERE s.nombre = 'Press militar con barra (overhead press)' AND t.nombre = 'Push press con barra';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'equipment_alternative', 'Sin equipo, el pike push-up es la aproximación más cercana al press vertical.'
FROM exercises s, exercises t WHERE s.nombre = 'Press militar con barra (overhead press)' AND t.nombre = 'Pike push-up';

-- Press militar mancuernas → Arnold
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Mayor ROM y activación de las tres porciones del deltoides. Técnicamente más complejo.'
FROM exercises s, exercises t WHERE s.nombre = 'Press militar con mancuernas' AND t.nombre = 'Press Arnold';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'unilateral_version', 'Corrige desequilibrios entre hombros. Mayor demanda de core antirotacional.'
FROM exercises s, exercises t WHERE s.nombre = 'Press militar con mancuernas' AND t.nombre = 'Press de hombros unilateral con mancuerna';

-- Elevaciones laterales mancuernas → polea
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'La tensión constante del cable en el punto de menor tensión de las mancuernas la hace superior para hipertrofia según evidencia reciente (Patroklos et al., 2023).'
FROM exercises s, exercises t WHERE s.nombre = 'Elevaciones laterales con mancuernas' AND t.nombre = 'Elevaciones laterales en polea baja';

-- Thruster
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Separa los dos patrones del thruster. Dominar ambos individualmente antes de combinarlos.'
FROM exercises s, exercises t WHERE s.nombre = 'Thruster con mancuernas' AND t.nombre = 'Press militar con mancuernas';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Añade componente de potencia con barra y mayor carga posible.'
FROM exercises s, exercises t WHERE s.nombre = 'Thruster con mancuernas' AND t.nombre = 'Push press con barra';
