-- ============================================================
-- ZYFIT — Exercise Seed Data: Batch 01
-- Patterns: Bisagra + Sentadilla
-- Total exercises: 28
-- ============================================================

-- ============================================================
-- BISAGRA (Hip Hinge)
-- ============================================================

INSERT INTO exercises (nombre, patron_movimiento, bilateral, es_compuesto, dificultad, musculos_primarios, musculos_secundarios, equipamiento, contraindicaciones, activo, gif_url, imagen_url, technical_level, error_risk, space_required, systemic_fatigue, set_duration_seconds, rest_seconds_default, description, coaching_cues) VALUES

-- 1
('Peso muerto convencional',
 'bisagra', TRUE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 4, 5, 'medio', 5, 40, 180,
 'Levantamiento desde el suelo con barra. El rey de los ejercicios de cadena posterior. Requiere dominio de bisagra de cadera, bracing de core y posición de columna neutra bajo carga máxima.',
 '["Barra sobre mediopié", "Espinillas verticales al inicio", "Empujar el suelo, no jalar la barra", "Hombros ligeramente delante de la barra al inicio", "Bloqueo simultáneo de cadera y rodilla", "Columna neutra en todo momento — no flexionar lumbar"]'::jsonb),

-- 2
('Peso muerto rumano (RDL)',
 'bisagra', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 4, 'medio', 4, 35, 150,
 'Variante del peso muerto que enfatiza los isquiotibiales. La barra no toca el suelo — el movimiento es controlado desde la cadera hacia abajo hasta sentir tensión en isquiotibiales, luego extensión de cadera.',
 '["Empuje de cadera hacia atrás, no inclinación de torso", "Barra pegada al cuerpo durante todo el recorrido", "Rodillas ligeramente flexionadas, fijas", "Parar cuando la espalda empiece a redondear — no forzar ROM", "Aprieta glúteos al subir, no hiperextiendas lumbar"]'::jsonb),

-- 3
('Peso muerto sumo',
 'bisagra', TRUE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 4, 4, 'medio', 5, 40, 180,
 'Variante con stance amplio y agarre dentro de las piernas. Menor demanda de movilidad de cadera en flexión y menor recorrido de barra. Mayor activación de aductores y glúteo.',
 '["Pies a 45° hacia afuera", "Rodillas alineadas con punta del pie durante todo el movimiento", "Torso más vertical que en convencional", "Empuje el suelo hacia afuera con los pies", "Mismo bracing de core que en convencional"]'::jsonb),

-- 4
('Hip thrust con barra',
 'bisagra', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 3, 'medio', 4, 35, 120,
 'Extensión de cadera desde posición de escápulas apoyadas en banco. El ejercicio con mayor evidencia de activación de glúteo mayor. Punto de máxima contracción en extensión completa de cadera.',
 '["Escápulas en el borde del banco, no el cuello", "Pies planos, tibias verticales en el punto más alto", "Pelvis en posición neutra arriba — no hiperextender lumbar", "Aprieta glúteos fuerte en el punto más alto, 1 segundo", "Barbilla al pecho durante todo el movimiento"]'::jsonb),

-- 5
('Hip thrust con peso corporal',
 'bisagra', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'medio', 2, 30, 60,
 'Versión sin carga del hip thrust. Ideal para principiantes, calentamiento o sesiones de alta repetición. Misma mecánica que la versión con barra.',
 '["Misma mecánica que hip thrust con barra", "Foco en la contracción glútea en el punto más alto", "Progresión: aumentar repeticiones, luego velocidad, luego carga"]'::jsonb),

-- 6
('Hip thrust unilateral (single-leg)',
 'bisagra', FALSE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 3, 'medio', 3, 35, 90,
 'Versión unilateral del hip thrust. Corrige desequilibrios laterales, aumenta demanda de estabilización y es una progresión natural antes de agregar carga externa.',
 '["Pie de apoyo plano y centrado", "Evitar rotación de pelvis — mantenerla horizontal", "Pierna libre flexionada a 90° o extendida según comodidad", "Mismo tempo que bilateral"]'::jsonb),

-- 7
('Good morning con barra',
 'bisagra', TRUE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 4, 5, 'medio', 4, 35, 150,
 'Bisagra de cadera con barra en posición de sentadilla. Alta demanda técnica — el momento de fuerza sobre la columna es máximo en el punto más bajo. Excelente para fortalecer cadena posterior pero con margen de error reducido.',
 '["Barra en posición baja sobre trapecios", "Rodillas ligeramente flexionadas, fijas", "Bisagra de cadera — no flexión lumbar", "No bajar más de donde la columna pueda mantenerse neutra", "Usar cargas conservadoras siempre"]'::jsonb),

-- 8
('Swing con kettlebell',
 'bisagra', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 4, 'medio', 4, 30, 90,
 'Bisagra de cadera balística. El KB sube por la fuerza explosiva de la extensión de cadera, no por los brazos. Desarrolla potencia de cadena posterior y capacidad cardiovascular simultáneamente.',
 '["Es una bisagra, no una sentadilla — cadera hacia atrás", "KB entre las piernas, no hacia el suelo", "Extensión explosiva de cadera — glúteos y core", "Los brazos solo guían, no jalan", "Respiración: exhala al extender, inhala al cargar"]'::jsonb),

-- 9
('Peso muerto con mancuernas',
 'bisagra', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 3, 'medio', 3, 35, 120,
 'Versión del peso muerto con mancuernas. Permite aprendizaje de la mecánica con menor carga y riesgo. Las mancuernas pueden estar al frente o a los lados del cuerpo.',
 '["Misma mecánica que convencional", "Mancuernas a los lados del cuerpo — recorrido más natural", "Ideal para aprender el patrón de bisagra"]'::jsonb),

-- 10
('RDL unilateral con mancuerna',
 'bisagra', FALSE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 4, 'medio', 3, 35, 90,
 'Peso muerto rumano en una pierna. Alta demanda de equilibrio y estabilización de cadera. Revela y corrige desequilibrios izquierda-derecha. Mancuerna en mano contralateral al pie de apoyo (versión más demandante) u homolateral.',
 '["Cadera de apoyo ligeramente flexionada y fija", "Pelvis cuadrada durante todo el movimiento — no rotar", "Pierna libre en extensión alineada con el torso", "Mancuerna contralateral: mayor demanda de estabilización antirotacional", "Mirada al suelo, 1.5m adelante"]'::jsonb)
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
-- SENTADILLA (Squat)
-- ============================================================

INSERT INTO exercises (nombre, patron_movimiento, bilateral, es_compuesto, dificultad, musculos_primarios, musculos_secundarios, equipamiento, contraindicaciones, activo, gif_url, imagen_url, technical_level, error_risk, space_required, systemic_fatigue, set_duration_seconds, rest_seconds_default, description, coaching_cues) VALUES

-- 11
('Sentadilla trasera con barra (high bar)',
 'sentadilla', TRUE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 4, 4, 'medio', 5, 40, 180,
 'La sentadilla clásica con barra sobre trapecios superiores. Mayor demanda de movilidad de tobillo y dorsiflexión. Torso más vertical que la variante low bar. El ejercicio de mayor activación de cuádriceps con carga axial.',
 '["Barra sobre trapecios superiores, no el cuello", "Stance a ancho de hombros, pies 15-30° hacia afuera", "Rodillas siguen la dirección de los pies — no colapsen", "Profundidad: al menos paralela (fémur horizontal)", "Bracing de core antes de cada rep — no solo al inicio del set", "Empuja el suelo hacia abajo y hacia afuera"]'::jsonb),

-- 12
('Sentadilla trasera con barra (low bar)',
 'sentadilla', TRUE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 4, 4, 'medio', 5, 40, 180,
 'Barra posicionada sobre la espina de la escápula, 5-8cm más baja que high bar. Mayor inclinación de torso, menor demanda de movilidad de tobillo, mayor participación de cadena posterior. Permite manejar más carga.',
 '["Barra sobre espina de escápula, no en el cuello", "Mayor inclinación de torso que high bar — es normal", "Stance ligeramente más abierto que high bar", "Rodillas no deben colapsar en ningún momento", "Mismo bracing de core"]'::jsonb),

-- 13
('Sentadilla frontal con barra',
 'sentadilla', TRUE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 5, 4, 'medio', 5, 40, 180,
 'Barra sobre deltoides anteriores, codos altos. La variante más técnica de la sentadilla. Torso perfectamente vertical, máxima movilidad de tobillo y muñeca requerida. Desarrolla cuádriceps con mayor profundidad posible.',
 '["Codos altos — paralelos al suelo o más arriba", "Torso vertical durante todo el movimiento", "Si los codos caen, la barra cae — el ejercicio termina", "Agarre de halterofilia o agarre cruzado (mientras se desarrolla movilidad)", "Máxima profundidad cuando la técnica lo permita"]'::jsonb),

-- 14
('Sentadilla goblet con kettlebell',
 'sentadilla', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'medio', 3, 35, 90,
 'KB o mancuerna sostenida al pecho. El contrapeso facilita el equilibrio y permite profundidad natural. El mejor ejercicio para enseñar la mecánica de sentadilla. Alta transferencia al aprendizaje de sentadilla con barra.',
 '["KB pegado al pecho durante todo el movimiento", "Codos apuntan hacia abajo en el punto más bajo", "Los codos empujan las rodillas hacia afuera en la fase de descenso", "Talones en el suelo durante todo el movimiento", "Profundidad: tan profundo como la técnica permita"]'::jsonb),

-- 15
('Sentadilla con peso corporal',
 'sentadilla', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'medio', 2, 25, 60,
 'La sentadilla sin carga externa. El punto de entrada al patrón de sentadilla. Permite trabajar movilidad, profundidad y mecánica sin riesgo. Base para todas las progresiones.',
 '["Talones en el suelo siempre", "Rodillas siguen los pies — no colapsen hacia adentro", "Profundidad progresiva según movilidad", "Torso lo más vertical posible"]'::jsonb),

-- 16
('Sentadilla búlgara (RFESS)',
 'sentadilla', FALSE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 3, 'medio', 4, 40, 120,
 'Sentadilla unilateral con pie trasero elevado en banco. Alta demanda de equilibrio, movilidad de cadera y fuerza unilateral. Excelente para corregir desequilibrios. Con mancuernas o barra.',
 '["Pie de trabajo lo suficientemente adelante para que la rodilla no pase la punta del pie en exceso", "Pie trasero sobre el banco: dorso del pie, no la punta", "Descenso vertical — no hacia adelante", "Mantener torso erecto o ligera inclinación hacia adelante", "La rodilla trasera baja sin tocar el suelo"]'::jsonb),

-- 17
('Zancada (lunge) caminando',
 'sentadilla', FALSE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'amplio', 3, 35, 90,
 'Zancada en movimiento hacia adelante alternando piernas. Desarrolla fuerza unilateral, equilibrio dinámico y coordinación. Con o sin carga adicional.',
 '["Paso largo — rodilla trasera baja vertical hacia el suelo", "Rodilla delantera no supera la punta del pie en exceso", "Torso erecto — no inclinarse hacia adelante", "Empuja con el talón del pie delantero para volver", "Pasos controlados — no balancearse"]'::jsonb),

-- 18
('Zancada estática (split squat)',
 'sentadilla', FALSE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'medio', 3, 35, 90,
 'Zancada sin movimiento de pies. Más estable que la zancada caminando, permite más carga. Excelente versión de aprendizaje antes de variantes dinámicas.',
 '["Pie delantero plano, pie trasero en punta", "Descenso vertical — rodilla trasera hacia el suelo", "Mantener torso erecto", "Volver subiendo con fuerza desde el talón delantero"]'::jsonb),

-- 19
('Pistol squat (sentadilla a una pierna)',
 'sentadilla', FALSE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 5, 3, 'medio', 4, 45, 120,
 'Sentadilla completa en una sola pierna con la otra extendida al frente. El pináculo de la sentadilla sin carga. Requiere fuerza, equilibrio, movilidad de tobillo y cadera simultáneamente.',
 '["Pierna libre extendida al frente durante todo el movimiento", "Talón de apoyo en el suelo siempre", "Control excéntrico total — no caer", "Brazos al frente como contrapeso", "Regresión: sentadilla a cajón con una pierna"]'::jsonb),

-- 20
('Sentadilla en máquina Smith',
 'sentadilla', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'medio', 4, 40, 150,
 'Sentadilla con barra guiada en máquina Smith. La guía elimina la demanda de estabilización. Útil para principiantes, rehabilitación o cuando no hay un spotter disponible. Menor transferencia funcional que la sentadilla libre.',
 '["Pies ligeramente adelantados respecto a la barra — a diferencia de la sentadilla libre", "Misma profundidad objetivo que la sentadilla libre", "No depender de la máquina como excusa para no desarrollar estabilización"]'::jsonb),

-- 21
('Prensa de piernas',
 'sentadilla', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 2, 'minimo', 4, 40, 150,
 'Empuje de plataforma en máquina de prensa. Sin demanda de equilibrio ni estabilización espinal. Permite manejar cargas altas con bajo riesgo técnico. Útil para hipertrofia de cuádriceps cuando la sentadilla libre no es viable.',
 '["Pies a ancho de cadera o más amplio", "No bloquear rodillas en la extensión — mantener ligera flexión", "No despegar la espalda baja del respaldo en ningún momento", "ROM completo: bajar hasta ~90° de flexión de rodilla", "Atención: no usar para reemplazar la sentadilla libre si el objetivo es funcionalidad"]'::jsonb),

-- 22
('Step up con mancuernas',
 'sentadilla', FALSE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'medio', 3, 35, 90,
 'Subida a cajón o escalón con una pierna. Unilateral, funcional, bajo riesgo. Excelente para glúteo y cuádriceps sin carga axial. Ideal cuando la sentadilla está contraindicada temporalmente.',
 '["Cajón a altura de rodilla o ligeramente inferior para comenzar", "Empuja desde el talón del pie sobre el cajón", "No usar la pierna de abajo para impulsarte", "Sube y baja de forma controlada", "Mantén el torso erecto durante toda la ejecución"]'::jsonb),

-- 23
('Sentadilla sumo con mancuerna',
 'sentadilla', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'medio', 3, 35, 90,
 'Sentadilla con stance amplio sosteniendo una mancuerna vertical entre las piernas. Similar al goblet squat en cuanto a énfasis en aductores y glúteo. Técnicamente accesible.',
 '["Pies a más del ancho de hombros, puntas 30-45° hacia afuera", "Rodillas siguen los pies durante todo el movimiento", "Mancuerna colgando vertical entre las piernas", "Profundidad: muslos paralelos o más"]'::jsonb),

-- 24
('Box squat',
 'sentadilla', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 2, 'medio', 4, 45, 150,
 'Sentadilla hasta cajón. El cajón sirve como objetivo de profundidad y como punto de pausa que elimina el rebote y aumenta la demanda de fuerza concéntrica pura. Excelente para desarrollar profundidad consistente.',
 '["Cajón a altura de sentadilla paralela o ligeramente por encima", "Sentarse en el cajón con control — no caer", "Pausa completa sentado: 1-2 segundos", "Extensión de cadera primero al subir", "No usar el cajón como excusa para relajar la espalda"]'::jsonb),

-- 25
('Sissy squat',
 'sentadilla', TRUE, FALSE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 4, 'minimo', 3, 35, 90,
 'Aislamiento de cuádriceps con inclinación de torso hacia atrás y elevación de talones. Alta tensión en el tendón patelar. Contraindicado en cualquier patología de rodilla. Excelente para hipertrofia de cuádriceps distales.',
 '["Talones elevados durante todo el movimiento", "Rodillas avanzan lo máximo posible sobre los pies", "Torso recto — no doblar la cadera", "Control total en el excéntrico", "Nunca forzar el ROM más allá de la tolerancia del tendón patelar"]'::jsonb),

-- 26
('Sentadilla con banda de resistencia',
 'sentadilla', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'medio', 2, 25, 60,
 'Sentadilla con banda colocada sobre las rodillas para activación de glúteo medio y corrección del colapso de rodilla. Usada en calentamiento, rehabilitación o como herramienta de retroalimentación táctil.',
 '["Banda sobre rodillas — presión suave hacia afuera para activar glúteo medio", "No dejar que las rodillas colapsen hacia adentro contra la resistencia de la banda", "Ideal como calentamiento antes de sentadillas con carga"]'::jsonb),

-- 27
('Wall squat (sentadilla en pared)',
 'sentadilla', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 2, 60, 60,
 'Sentadilla isométrica contra una pared. Sin carga axial, sin demanda de equilibrio. Útil en rehabilitación de rodilla, activación muscular y desarrollo de resistencia de cuádriceps.',
 '["Espalda plana contra la pared en todo momento", "Rodillas a 90° — muslos paralelos al suelo", "Pies a ancho de cadera", "Mantener la posición sin bajar la cadera"]'::jsonb),

-- 28
('Hack squat en máquina',
 'sentadilla', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 4, 40, 150,
 'Sentadilla en máquina inclinada. Énfasis en cuádriceps, especialmente vasto lateral. La inclinación de la máquina reduce la demanda de movilidad y el estrés lumbar comparado con la sentadilla libre.',
 '["Espalda plana contra el respaldo en todo momento", "Pies a ancho de cadera o ligeramente más amplio", "No bloquear las rodillas en la extensión", "ROM completo: muslos paralelos o más profundo"]'::jsonb)
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

-- Helper: get IDs by name
-- Peso muerto convencional (id will be looked up via subquery)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE
FROM exercises e, equipment_items eq
WHERE e.nombre = 'Peso muerto convencional' AND eq.name = 'Barra olímpica';

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE
FROM exercises e, equipment_items eq
WHERE e.nombre = 'Peso muerto convencional' AND eq.name = 'Banco ajustable';

-- RDL
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Peso muerto rumano (RDL)' AND eq.name = 'Barra olímpica';

-- Peso muerto sumo
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Peso muerto sumo' AND eq.name = 'Barra olímpica';

-- Hip thrust con barra
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hip thrust con barra' AND eq.name = 'Barra olímpica';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hip thrust con barra' AND eq.name = 'Banco plano';

-- Hip thrust peso corporal
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hip thrust con peso corporal' AND eq.name = 'Banco plano';

-- Hip thrust unilateral
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hip thrust unilateral (single-leg)' AND eq.name = 'Banco plano';

-- Good morning
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Good morning con barra' AND eq.name = 'Barra olímpica';

-- Swing KB
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Swing con kettlebell' AND eq.name = 'Kettlebell';

-- PM mancuernas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Peso muerto con mancuernas' AND eq.name = 'Mancuernas';

-- RDL unilateral
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'RDL unilateral con mancuerna' AND eq.name = 'Mancuernas';

-- Sentadilla trasera high bar
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla trasera con barra (high bar)' AND eq.name = 'Barra olímpica';

-- Sentadilla trasera low bar
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla trasera con barra (low bar)' AND eq.name = 'Barra olímpica';

-- Sentadilla frontal
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla frontal con barra' AND eq.name = 'Barra olímpica';

-- Goblet squat
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla goblet con kettlebell' AND eq.name = 'Kettlebell';

-- BW squat — ninguno
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla con peso corporal' AND eq.name = 'Ninguno (peso corporal)';

-- Búlgara
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla búlgara (RFESS)' AND eq.name = 'Banco plano';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla búlgara (RFESS)' AND eq.name = 'Mancuernas';

-- Zancada caminando
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Zancada (lunge) caminando' AND eq.name = 'Ninguno (peso corporal)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Zancada (lunge) caminando' AND eq.name = 'Mancuernas';

-- Zancada estática
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Zancada estática (split squat)' AND eq.name = 'Ninguno (peso corporal)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Zancada estática (split squat)' AND eq.name = 'Mancuernas';

-- Pistol squat
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pistol squat (sentadilla a una pierna)' AND eq.name = 'Ninguno (peso corporal)';

-- Smith squat
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla en máquina Smith' AND eq.name = 'Máquina Smith';

-- Prensa de piernas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Prensa de piernas' AND eq.name = 'Prensa de piernas';

-- Step up
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Step up con mancuernas' AND eq.name = 'Caja pliométrica';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Step up con mancuernas' AND eq.name = 'Mancuernas';

-- Sentadilla sumo mancuerna
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla sumo con mancuerna' AND eq.name = 'Mancuernas';

-- Box squat
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Box squat' AND eq.name = 'Barra olímpica';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Box squat' AND eq.name = 'Caja pliométrica';

-- Sissy squat
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sissy squat' AND eq.name = 'Ninguno (peso corporal)';

-- Sentadilla con banda
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla con banda de resistencia' AND eq.name = 'Banda de resistencia';

-- Wall squat
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Wall squat (sentadilla en pared)' AND eq.name = 'Ninguno (peso corporal)';

-- Hack squat
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hack squat en máquina' AND eq.name = 'Máquina Smith';


-- ============================================================
-- MUSCLE ASSIGNMENTS
-- ============================================================

-- Peso muerto convencional
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto convencional' AND m.name IN ('Isquiotibiales','Glúteo mayor','Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto convencional' AND m.name IN ('Cuádriceps','Trapecio superior','Romboides','Glúteo medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto convencional' AND m.name IN ('Transverso abdominal','Multífidos','Flexores del antebrazo');

-- RDL
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto rumano (RDL)' AND m.name IN ('Isquiotibiales','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto rumano (RDL)' AND m.name IN ('Erector espinal','Glúteo medio','Aductores');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto rumano (RDL)' AND m.name IN ('Transverso abdominal','Multífidos');

-- Peso muerto sumo
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto sumo' AND m.name IN ('Glúteo mayor','Aductores','Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto sumo' AND m.name IN ('Cuádriceps','Erector espinal','Trapecio medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto sumo' AND m.name IN ('Transverso abdominal','Multífidos');

-- Hip thrust con barra
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust con barra' AND m.name IN ('Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust con barra' AND m.name IN ('Isquiotibiales','Glúteo medio','Cuádriceps');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust con barra' AND m.name IN ('Transverso abdominal','Erector espinal');

-- Hip thrust peso corporal
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust con peso corporal' AND m.name IN ('Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust con peso corporal' AND m.name IN ('Isquiotibiales','Glúteo medio');

-- Hip thrust unilateral
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust unilateral (single-leg)' AND m.name IN ('Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip thrust unilateral (single-leg)' AND m.name IN ('Isquiotibiales','Glúteo medio','Transverso abdominal');

-- Good morning
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Good morning con barra' AND m.name IN ('Isquiotibiales','Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Good morning con barra' AND m.name IN ('Glúteo mayor','Multífidos');

-- Swing KB
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Swing con kettlebell' AND m.name IN ('Glúteo mayor','Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Swing con kettlebell' AND m.name IN ('Erector espinal','Deltoides anterior','Trapecio medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Swing con kettlebell' AND m.name IN ('Transverso abdominal','Cuadrado lumbar');

-- PM mancuernas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto con mancuernas' AND m.name IN ('Isquiotibiales','Glúteo mayor','Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto con mancuernas' AND m.name IN ('Cuádriceps','Trapecio medio');

-- RDL unilateral
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'RDL unilateral con mancuerna' AND m.name IN ('Isquiotibiales','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'RDL unilateral con mancuerna' AND m.name IN ('Glúteo medio','Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'RDL unilateral con mancuerna' AND m.name IN ('Transverso abdominal','Oblicuo externo');

-- Sentadilla trasera high bar
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla trasera con barra (high bar)' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla trasera con barra (high bar)' AND m.name IN ('Isquiotibiales','Glúteo medio','Aductores','Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla trasera con barra (high bar)' AND m.name IN ('Transverso abdominal','Multífidos','Pantorrilla (gastrocnemio)');

-- Sentadilla trasera low bar
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla trasera con barra (low bar)' AND m.name IN ('Cuádriceps','Glúteo mayor','Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla trasera con barra (low bar)' AND m.name IN ('Glúteo medio','Aductores','Erector espinal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla trasera con barra (low bar)' AND m.name IN ('Transverso abdominal','Multífidos');

-- Sentadilla frontal
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla frontal con barra' AND m.name IN ('Cuádriceps');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla frontal con barra' AND m.name IN ('Glúteo mayor','Glúteo medio','Erector espinal','Transverso abdominal');

-- Goblet squat
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla goblet con kettlebell' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla goblet con kettlebell' AND m.name IN ('Aductores','Glúteo medio','Erector espinal');

-- BW squat
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla con peso corporal' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla con peso corporal' AND m.name IN ('Isquiotibiales','Glúteo medio','Erector espinal');

-- Búlgara
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla búlgara (RFESS)' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla búlgara (RFESS)' AND m.name IN ('Glúteo medio','Isquiotibiales','Psoas ilíaco');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla búlgara (RFESS)' AND m.name IN ('Transverso abdominal','Pantorrilla (gastrocnemio)');

-- Zancada caminando
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Zancada (lunge) caminando' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Zancada (lunge) caminando' AND m.name IN ('Isquiotibiales','Glúteo medio','Pantorrilla (gastrocnemio)');

-- Zancada estática
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Zancada estática (split squat)' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Zancada estática (split squat)' AND m.name IN ('Isquiotibiales','Glúteo medio');

-- Pistol squat
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pistol squat (sentadilla a una pierna)' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pistol squat (sentadilla a una pierna)' AND m.name IN ('Isquiotibiales','Glúteo medio','Pantorrilla (gastrocnemio)','Transverso abdominal');

-- Smith squat
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla en máquina Smith' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla en máquina Smith' AND m.name IN ('Isquiotibiales','Glúteo medio');

-- Prensa de piernas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Prensa de piernas' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Prensa de piernas' AND m.name IN ('Isquiotibiales','Glúteo medio','Aductores');

-- Step up
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Step up con mancuernas' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Step up con mancuernas' AND m.name IN ('Glúteo medio','Isquiotibiales');

-- Sentadilla sumo mancuerna
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla sumo con mancuerna' AND m.name IN ('Cuádriceps','Aductores','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla sumo con mancuerna' AND m.name IN ('Glúteo medio','Isquiotibiales');

-- Box squat
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Box squat' AND m.name IN ('Cuádriceps','Glúteo mayor','Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Box squat' AND m.name IN ('Glúteo medio','Erector espinal');

-- Sissy squat
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sissy squat' AND m.name IN ('Cuádriceps');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sissy squat' AND m.name IN ('Psoas ilíaco','Pantorrilla (gastrocnemio)');

-- Sentadilla con banda
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla con banda de resistencia' AND m.name IN ('Cuádriceps','Glúteo mayor','Glúteo medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla con banda de resistencia' AND m.name IN ('Isquiotibiales','Abductores');

-- Wall squat
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Wall squat (sentadilla en pared)' AND m.name IN ('Cuádriceps');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Wall squat (sentadilla en pared)' AND m.name IN ('Glúteo mayor','Isquiotibiales');

-- Hack squat
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hack squat en máquina' AND m.name IN ('Cuádriceps');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hack squat en máquina' AND m.name IN ('Glúteo mayor','Glúteo medio','Isquiotibiales');


-- ============================================================
-- CONTRAINDICATION ASSIGNMENTS
-- ============================================================

-- Peso muerto convencional
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Carga axial máxima sobre columna. Contraindicación absoluta en fase aguda.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto convencional' AND c.name = 'Dolor lumbar agudo';

INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión lumbar bajo carga máxima puede agravar la hernia.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto convencional' AND c.name = 'Hernia discal lumbar activa';

INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'En fase crónica estable puede realizarse con técnica impecable, carga conservadora y supervisión. Evaluar caso a caso.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto convencional' AND c.name = 'Dolor lumbar crónico';

INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La carga axial sobre una columna osteoporótica severa representa riesgo de fractura vertebral.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto convencional' AND c.name = 'Osteoporosis severa';

-- RDL
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto rumano (RDL)' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto rumano (RDL)' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Mayor tolerancia que el convencional por menor carga posible, pero igual demanda de columna neutra.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto rumano (RDL)' AND c.name = 'Dolor lumbar crónico';

-- Peso muerto sumo
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto sumo' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto sumo' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El stance amplio reduce algo la demanda lumbar vs convencional.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto sumo' AND c.name = 'Dolor lumbar crónico';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El stance amplio con alta carga puede estresar la articulación de cadera.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto sumo' AND c.name = 'Dolor de cadera agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La abducción forzada bajo carga puede generar impingement femoroacetabular.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Peso muerto sumo' AND c.name = 'Impingement femoroacetabular';

-- Hip thrust con barra
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La hiperextensión de cadera al final del movimiento puede comprimir la zona lumbar.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Hip thrust con barra' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Contraindicado en >T2 por posición supina bajo carga. Antes de T2 evaluar.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Hip thrust con barra' AND c.name = 'Embarazo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición de flexión de rodilla a 90° con carga puede agravar el síndrome patelofemoral.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Hip thrust con barra' AND c.name = 'Dolor anterior de rodilla';

-- Good morning
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Good morning con barra' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Good morning con barra' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Good morning con barra' AND c.name = 'Dolor lumbar crónico';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La carga axial sobre escoliosis severa con bisagra profunda es de alto riesgo.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Good morning con barra' AND c.name = 'Escoliosis severa';

-- Swing KB
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Swing con kettlebell' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Swing con kettlebell' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La naturaleza balística y el momento de fuerza en el punto de carga máxima (cadera flexionada) requiere columna asintomática.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Swing con kettlebell' AND c.name = 'Dolor lumbar crónico';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El agarre del KB puede agravar síntomas del túnel carpiano.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Swing con kettlebell' AND c.name = 'Síndrome del túnel carpiano';

-- Sentadilla trasera high bar
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla trasera con barra (high bar)' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Evaluar individualmente. La sentadilla correctamente ejecutada puede ser rehabilitadora en fase crónica.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla trasera con barra (high bar)' AND c.name = 'Dolor lumbar crónico';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión profunda de rodilla bajo carga axial es contraindicación relativa en dolor patelofemoral.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla trasera con barra (high bar)' AND c.name = 'Dolor anterior de rodilla';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla trasera con barra (high bar)' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla trasera con barra (high bar)' AND c.name = 'Meniscopatía aguda';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla trasera con barra (high bar)' AND c.name = 'Cirugía de columna reciente';

-- Sentadilla con peso corporal
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Sin carga axial, bajo riesgo en lumbar. Evaluar si el patrón de movimiento provoca dolor.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla con peso corporal' AND c.name = 'Dolor lumbar crónico';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla con peso corporal' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sentadilla con peso corporal' AND c.name = 'Meniscopatía aguda';

-- Prensa de piernas
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'No hay carga axial — es la alternativa a la sentadilla cuando la columna está comprometida. PERO: en el punto más bajo (cadera flexionada >90°) hay presión intraabdominal elevada.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Prensa de piernas' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Prensa de piernas' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Prensa de piernas' AND c.name = 'Meniscopatía aguda';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'No despegar la espalda del respaldo — si ocurre, reduce el ROM.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Prensa de piernas' AND c.name = 'Dolor lumbar crónico';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Riesgo de luxación de prótesis si la cadera supera 90° de flexión.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Prensa de piernas' AND c.name = 'Prótesis de cadera';

-- Sissy squat
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Alta tensión sobre tendón patelar y articulación patelofemoral. Contraindicado en cualquier patología de rodilla.' FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sissy squat' AND c.name = 'Dolor anterior de rodilla';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sissy squat' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sissy squat' AND c.name = 'Meniscopatía aguda';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sissy squat' AND c.name = 'Artrosis de rodilla';


-- ============================================================
-- EXERCISE RELATIONSHIPS
-- ============================================================

-- Peso muerto convencional
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Elimina la carga axial de barra. Mecánica idéntica con menor demanda técnica y de carga.'
FROM exercises s, exercises t WHERE s.nombre = 'Peso muerto convencional' AND t.nombre = 'Peso muerto con mancuernas';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Misma cadena posterior, menor demanda lumbar, mayor énfasis en isquiotibiales.'
FROM exercises s, exercises t WHERE s.nombre = 'Peso muerto convencional' AND t.nombre = 'Peso muerto rumano (RDL)';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Mayor activación de aductores y glúteo, menor recorrido, misma carga.'
FROM exercises s, exercises t WHERE s.nombre = 'Peso muerto convencional' AND t.nombre = 'Peso muerto sumo';

-- RDL → progresiones
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Elimina la barra y reduce la carga. Misma mecánica de bisagra.'
FROM exercises s, exercises t WHERE s.nombre = 'Peso muerto rumano (RDL)' AND t.nombre = 'Peso muerto con mancuernas';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'unilateral_version', 'Mayor demanda de estabilización, corrige desequilibrios izquierda-derecha.'
FROM exercises s, exercises t WHERE s.nombre = 'Peso muerto rumano (RDL)' AND t.nombre = 'RDL unilateral con mancuerna';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Mayor carga posible, carga axial, mayor demanda técnica.'
FROM exercises s, exercises t WHERE s.nombre = 'Peso muerto rumano (RDL)' AND t.nombre = 'Peso muerto convencional';

-- Hip thrust
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Sin carga externa. Mismo patrón de extensión de cadera.'
FROM exercises s, exercises t WHERE s.nombre = 'Hip thrust con barra' AND t.nombre = 'Hip thrust con peso corporal';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'unilateral_version', 'Corrección de desequilibrios, mayor demanda de estabilización pélvica.'
FROM exercises s, exercises t WHERE s.nombre = 'Hip thrust con barra' AND t.nombre = 'Hip thrust unilateral (single-leg)';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Añade carga externa progresiva al mismo patrón.'
FROM exercises s, exercises t WHERE s.nombre = 'Hip thrust con peso corporal' AND t.nombre = 'Hip thrust con barra';

-- Good morning
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Misma mecánica de bisagra sin carga axial. Ideal para aprender el patrón antes del good morning.'
FROM exercises s, exercises t WHERE s.nombre = 'Good morning con barra' AND t.nombre = 'Peso muerto rumano (RDL)';

-- Swing KB
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'El RDL enseña la bisagra de cadera que es la base del swing. Primero dominar RDL, luego agregar la componente balística.'
FROM exercises s, exercises t WHERE s.nombre = 'Swing con kettlebell' AND t.nombre = 'Peso muerto rumano (RDL)';

-- Sentadilla trasera high bar
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Sin carga axial. El goblet es el mejor ejercicio de aprendizaje antes de la sentadilla con barra.'
FROM exercises s, exercises t WHERE s.nombre = 'Sentadilla trasera con barra (high bar)' AND t.nombre = 'Sentadilla goblet con kettlebell';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Mayor demanda técnica, torso más vertical, máxima activación de cuádriceps.'
FROM exercises s, exercises t WHERE s.nombre = 'Sentadilla trasera con barra (high bar)' AND t.nombre = 'Sentadilla frontal con barra';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Low bar permite mayor carga, menor movilidad requerida, más cadena posterior.'
FROM exercises s, exercises t WHERE s.nombre = 'Sentadilla trasera con barra (high bar)' AND t.nombre = 'Sentadilla trasera con barra (low bar)';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'equipment_alternative', 'Sin barra, misma mecánica bilateral de sentadilla.'
FROM exercises s, exercises t WHERE s.nombre = 'Sentadilla trasera con barra (high bar)' AND t.nombre = 'Sentadilla goblet con kettlebell';

-- Sentadilla goblet
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Sin carga. El punto de entrada al patrón de sentadilla.'
FROM exercises s, exercises t WHERE s.nombre = 'Sentadilla goblet con kettlebell' AND t.nombre = 'Sentadilla con peso corporal';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Agrega carga axial y demanda técnica significativamente mayor.'
FROM exercises s, exercises t WHERE s.nombre = 'Sentadilla goblet con kettlebell' AND t.nombre = 'Sentadilla trasera con barra (high bar)';

-- Sentadilla BW
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Contrapeso facilita profundidad y equilibrio. Siguiente paso tras dominar BW.'
FROM exercises s, exercises t WHERE s.nombre = 'Sentadilla con peso corporal' AND t.nombre = 'Sentadilla goblet con kettlebell';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Máxima expresión unilateral sin carga. Requiere fuerza, equilibrio y movilidad superior.'
FROM exercises s, exercises t WHERE s.nombre = 'Sentadilla con peso corporal' AND t.nombre = 'Pistol squat (sentadilla a una pierna)';

-- Búlgara
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Ambos pies en el suelo. Misma mecánica unilateral con mayor estabilidad.'
FROM exercises s, exercises t WHERE s.nombre = 'Sentadilla búlgara (RFESS)' AND t.nombre = 'Zancada estática (split squat)';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Mayor rango de movimiento, más inestabilidad, mayor demanda de cadera.'
FROM exercises s, exercises t WHERE s.nombre = 'Sentadilla búlgara (RFESS)' AND t.nombre = 'Pistol squat (sentadilla a una pierna)';

-- Zancada estática → caminando
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Agrega demanda de coordinación y equilibrio dinámico al mismo patrón.'
FROM exercises s, exercises t WHERE s.nombre = 'Zancada estática (split squat)' AND t.nombre = 'Zancada (lunge) caminando';

INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Pie trasero elevado aumenta ROM y demanda de cadera anterior.'
FROM exercises s, exercises t WHERE s.nombre = 'Zancada estática (split squat)' AND t.nombre = 'Sentadilla búlgara (RFESS)';

-- Prensa → alternativa a sentadilla con barra
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'equipment_alternative', 'La sentadilla BW cumple función similar sin máquina cuando la sentadilla con barra no es opción.'
FROM exercises s, exercises t WHERE s.nombre = 'Prensa de piernas' AND t.nombre = 'Sentadilla con peso corporal';

-- Box squat
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'El cajón elimina la duda sobre la profundidad y la pausa fuerza consistencia técnica.'
FROM exercises s, exercises t WHERE s.nombre = 'Sentadilla trasera con barra (high bar)' AND t.nombre = 'Box squat';

-- Wall squat
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Agrega movimiento al patrón isométrico.'
FROM exercises s, exercises t WHERE s.nombre = 'Wall squat (sentadilla en pared)' AND t.nombre = 'Sentadilla con peso corporal';

-- Hack squat
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'equipment_alternative', 'Sin máquina hack, la sentadilla goblet cumple función de cuádriceps similar con menor carga.'
FROM exercises s, exercises t WHERE s.nombre = 'Hack squat en máquina' AND t.nombre = 'Sentadilla goblet con kettlebell';
