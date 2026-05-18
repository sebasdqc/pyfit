-- ============================================================
-- ZYFIT — Exercise Seed Data: Batch 03
-- Patterns: Jalón Horizontal + Jalón Vertical
-- Total exercises: 26
-- ============================================================

-- ============================================================
-- JALÓN HORIZONTAL (Horizontal Pull / Row)
-- ============================================================

INSERT INTO exercises (nombre, patron_movimiento, bilateral, es_compuesto, dificultad, musculos_primarios, musculos_secundarios, equipamiento, contraindicaciones, activo, gif_url, imagen_url, technical_level, error_risk, space_required, systemic_fatigue, set_duration_seconds, rest_seconds_default, description, coaching_cues) VALUES

-- 1
('Remo con barra (bent-over row)',
 'jalon_horizontal', TRUE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 4, 4, 'medio', 4, 40, 150,
 'El remo bilateral con barra es el equivalente del press banca para la espalda. Alta demanda técnica por la necesidad de mantener posición de bisagra bajo carga prolongada. Trabaja dorsal, romboides, trapecio medio y bíceps simultáneamente.',
 '["Bisagra de cadera a 45–70° del suelo — no erguido ni paralelo", "Escápulas retraídas antes de jalar — el movimiento comienza en la escápula, no en el codo", "Barra sube hacia el ombligo o la parte baja del pecho según objetivo", "Codos pegados al cuerpo para mayor activación del dorsal", "Columna neutra durante todo el set — la fatiga tiende a redondear la espalda", "No usar el impulso del torso para ayudar"]'::jsonb),

-- 2
('Remo con mancuerna a una mano',
 'jalon_horizontal', FALSE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 3, 35, 90,
 'Remo unilateral con apoyo en banco. El apoyo elimina la demanda de estabilización lumbar, permitiendo mayor aislamiento del dorsal y mayor rango de movimiento. Excelente para corregir desequilibrios izquierda-derecha.',
 '["Rodilla y mano del mismo lado apoyadas en el banco", "La espalda paralela al suelo o ligeramente inclinada", "Mancuerna sube hacia la cadera — no hacia el hombro", "Codo va atrás y arriba: primero retrae la escápula, luego jala", "Permitir que el hombro del lado que trabaja baje al inicio para maximizar ROM"]'::jsonb),

-- 3
('Remo en máquina sentado',
 'jalon_horizontal', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 3, 35, 90,
 'Remo bilateral en máquina de cable o palanca. Sin demanda de estabilización lumbar. Ideal para principiantes o como ejercicio de alto volumen cuando la fatiga de estabilización ya es alta. Excelente control del patrón de retracción escapular.',
 '["Ajustar el asiento para que los brazos queden paralelos al suelo al inicio", "Retracción escapular completa en el punto de contracción máxima", "No redondear la espalda al extender los brazos — mantener tensión", "Variante de agarre neutro vs prono cambia el énfasis entre dorsal y romboides"]'::jsonb),

-- 4
('Remo en polea baja con barra',
 'jalon_horizontal', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 3, 35, 90,
 'Remo sentado en polea baja con barra recta o EZ. Mayor rango de movimiento que la máquina. Permite variar el agarre y el ángulo de jalón. La versión con agarre ancho enfatiza trapecio medio y romboides.',
 '["Torso ligeramente inclinado hacia adelante en la posición de inicio", "No tirar con el torso — el movimiento es solo del brazo y la escápula", "Agarre estrecho: mayor dorsal. Agarre ancho: mayor romboides y trapecio medio"]'::jsonb),

-- 5
('Remo con barra T (T-bar row)',
 'jalon_horizontal', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 3, 'medio', 4, 40, 150,
 'Remo con barra T-bar, con apoyo pectoral o sin él. Con apoyo: elimina la demanda lumbar, permite más carga y aislamiento. Sin apoyo: similar al remo con barra convencional. Énfasis en grosor de espalda.',
 '["Con apoyo pectoral: torso casi horizontal, foco total en la espalda", "Sin apoyo: mantener bisagra estable durante todo el set", "Los codos suben hacia el techo en el punto de contracción máxima", "Agarre neutro reduce estrés en muñecas vs agarre prono"]'::jsonb),

-- 6
('Remo con kettlebell',
 'jalon_horizontal', FALSE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 3, 35, 90,
 'Remo unilateral con kettlebell. Misma mecánica que el remo con mancuerna pero el centro de masa más bajo del KB puede facilitar el ROM inicial. Útil cuando no hay mancuernas disponibles en el peso adecuado.',
 '["Misma mecánica que el remo con mancuerna", "El agarre del KB puede ser más cómodo para personas con problemas de muñeca", "La posición del KB al inicio está más alejada del cuerpo: controlar más el inicio"]'::jsonb),

-- 7
('Remo invertido (Australian pull-up)',
 'jalon_horizontal', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 3, 35, 75,
 'Remo horizontal con peso corporal bajo una barra fija, TRX o mesa. La inclinación del cuerpo regula la dificultad: más horizontal = más difícil. Progresión directa hacia las dominadas. Excelente ratio dosis/riesgo.',
 '["Cuerpo rígido de cabeza a talones durante todo el movimiento", "El pecho sube hacia la barra, no la barbilla", "Cuanto más horizontal el cuerpo, más difícil", "Progresión: elevar los pies para aumentar la carga", "Retracción escapular completa en el punto más alto"]'::jsonb),

-- 8
('Remo en TRX',
 'jalon_horizontal', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 1, 'minimo', 2, 30, 75,
 'Versión del remo invertido con TRX o correas de suspensión. La inestabilidad del TRX aumenta la demanda de estabilización y permite mayor rango de movimiento. La posición del cuerpo regula la dificultad.',
 '["Cuanto más vertical el cuerpo, más fácil", "Mantener el cuerpo perfectamente rígido", "Las muñecas en posición neutra durante todo el movimiento", "Retracción escapular completa antes de jalar"]'::jsonb),

-- 9
('Remo con banda de resistencia',
 'jalon_horizontal', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 2, 25, 60,
 'Remo sentado o de pie con banda de resistencia. La resistencia variable de la banda (mayor tensión al final del recorrido) es complementaria a la curva de fuerza del movimiento. Ideal para casa, calentamiento o rehabilitación.',
 '["Anclar la banda a una altura media", "Misma mecánica de retracción escapular que con cable", "La resistencia aumenta al acercar las manos: el punto de contracción máxima tiene mayor carga que con peso libre"]'::jsonb),

-- 10
('Face pull en polea alta (retracción)',
 'jalon_horizontal', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 2, 30, 75,
 'Jalón horizontal hacia la cara con cuerda en polea alta. Clasificado aquí como jalón horizontal porque el vector de fuerza es horizontal. Ejercicio de salud del hombro por excelencia: rotación externa + retracción escapular simultáneas.',
 '["Cuerda a la altura de los ojos o ligeramente más alta", "Los codos deben estar más altos que las muñecas durante todo el movimiento", "Separar las manos al final del recorrido: rotación externa completa", "No usar el peso del cuerpo para jalar — movimiento de brazos y escápulas"]'::jsonb),

-- ============================================================
-- JALÓN VERTICAL (Vertical Pull)
-- ============================================================

('Dominadas (pull-up) agarre prono',
 'jalon_vertical', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 2, 'minimo', 4, 35, 120,
 'El jalón vertical con peso corporal por excelencia. Agarre prono (palmas alejadas). Mayor activación de dorsal y menor del bíceps que el agarre supino. Requiere fuerza relativa elevada — uno de los mejores indicadores de nivel de entrenamiento.',
 '["Agarre ligeramente más ancho que los hombros", "Partir de colgado muerto con escápulas activas — nunca relajadas", "El pecho sube hacia la barra, no la barbilla", "Codos bajan hacia las caderas en el descenso", "Evitar el balanceo — movimiento estrictamente vertical", "Retracción y depresión escapular antes de jalar"]'::jsonb),

-- 12
('Dominadas (chin-up) agarre supino',
 'jalon_vertical', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 2, 'minimo', 4, 35, 120,
 'Agarre supino (palmas hacia el cuerpo). Mayor activación de bíceps vs agarre prono. Algunos usuarios encuentran el agarre supino más accesible por la posición más natural del codo. Mismo patrón motor fundamental.',
 '["Agarre a ancho de hombros o más estrecho", "Misma mecánica de escápulas que el pull-up", "El pecho sube hacia la barra", "El bíceps tiene mayor ventaja mecánica en este agarre"]'::jsonb),

-- 13
('Dominadas agarre neutro',
 'jalon_vertical', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 2, 'minimo', 4, 35, 120,
 'Agarre neutro (palmas enfrentadas). El agarre más cómodo para el codo y el hombro. Buena opción cuando hay molestia en muñeca o codo con los otros agarres. Activación equilibrada entre dorsal y bíceps.',
 '["Palmas enfrentadas, agarre a ancho de hombros", "Misma mecánica escapular que pull-up prono", "Menor estrés en el codo que el agarre supino", "La posición neutra de muñeca es la más segura biomecánicamente"]'::jsonb),

-- 14
('Dominadas asistidas (con banda)',
 'jalon_vertical', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 1, 'minimo', 3, 35, 90,
 'Dominadas con banda de resistencia para reducir el peso efectivo. La banda asiste más en el punto más bajo (donde es más difícil) y menos en el punto más alto. Permite practicar el patrón completo antes de la versión sin asistencia.',
 '["La banda va en los pies o las rodillas — en los pies es más estable", "No confiar en la banda para todo el movimiento — aplicar la misma técnica que sin asistencia", "Reducir progresivamente el grosor de la banda", "El objetivo es eliminar la banda, no depender de ella indefinidamente"]'::jsonb),

-- 15
('Jalón al pecho en polea alta (lat pulldown)',
 'jalon_vertical', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 2, 'minimo', 3, 35, 90,
 'Jalón vertical en polea alta. Patrón idéntico a las dominadas pero con carga regulable. Ideal para aprender el patrón, trabajar en rangos de repetición altos o cuando el peso corporal supera la fuerza disponible. El agarre más ancho no aumenta la activación del dorsal — agarre a ancho de hombros es suficiente.',
 '["Agarre ligeramente más ancho que los hombros", "Torso ligeramente inclinado hacia atrás — no más de 15–20°", "El codo baja hacia la cadera, no hacia atrás", "La barra baja al pecho superior, nunca detrás del cuello", "Retracción y depresión escapular antes de jalar", "El movimiento empieza con la escápula, no con el codo"]'::jsonb),

-- 16
('Jalón al pecho con agarre neutro (polea)',
 'jalon_vertical', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 3, 35, 90,
 'Jalón vertical con accesorio de agarre neutro o en V. Menor estrés en el codo y el hombro que el agarre prono. Excelente para personas con molestia en estos segmentos que aún quieren trabajar el patrón vertical.',
 '["Misma mecánica que el jalón prono", "El agarre neutro posiciona mejor el húmero para la depresión escapular", "Buen punto de entrada para personas nuevas en el patrón de jalón vertical"]'::jsonb),

-- 17
('Jalón detrás del cuello',
 'jalon_vertical', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 4, 'minimo', 3, 35, 90,
 'Variante en la que la barra baja detrás del cuello. Ampliamente desaconsejado en la literatura actual: coloca la columna cervical en flexión forzada bajo carga y el hombro en posición de máximo impingement. El riesgo supera ampliamente el beneficio vs el jalón al pecho.',
 '["ADVERTENCIA: esta variante está contraindicada para la mayoría de usuarios", "Si se incluye, solo con técnica impecable, carga ligera y movilidad cervical completa", "El jalón al pecho produce activación equivalente sin el riesgo cervical"]'::jsonb),

-- 18
('Pullover con mancuerna',
 'jalon_vertical', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 3, 'minimo', 2, 35, 90,
 'Extensión de hombro desde posición overhead en banco. Trabajo del dorsal en rango elongado. Técnicamente es una transición entre jalón vertical y ejercicio de aislamiento. Tensión máxima en el punto más largo del dorsal.',
 '["Banco transversal o longitudinal según preferencia", "Codos ligeramente flexionados y fijos — no es un press", "El rango de movimiento va de overhead hasta la cadera", "Controlar el excéntrico — la posición elongada tiene mayor riesgo de desgarro", "Usar cargas moderadas siempre"]'::jsonb),

-- 19
('Pullover en polea',
 'jalon_vertical', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 2, 35, 75,
 'Extensión de hombro con cable desde polea alta en posición de pie o arrodillado. Tensión constante del cable en todo el ROM a diferencia de la mancuerna. Superior para hipertrofia del dorsal en rango elongado.',
 '["De pie o arrodillado frente a la polea alta", "Brazos extendidos durante todo el movimiento — no flexionar el codo", "El movimiento es una extensión de hombro pura", "El cable mantiene tensión incluso en el punto más bajo donde la mancuerna no la tiene"]'::jsonb),

-- 20
('Superman (extensión posterior en suelo)',
 'jalon_vertical', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 1, 25, 45,
 'Extensión de cadera y columna en decúbito prono. Sin carga externa. Activa erector espinal, glúteos e isquiotibiales. Clasificado en jalón vertical por la activación del dorsal en la elevación de los brazos. Útil en calentamiento y para personas sin acceso a equipo.',
 '["Posición boca abajo, brazos extendidos al frente", "Levantar brazos y piernas simultáneamente", "Contraer glúteos y mantener la posición 2–3 segundos", "No forzar la extensión cervical — mantener la cabeza alineada con la columna"]'::jsonb),

-- 21
('Remo al mentón con barra',
 'jalon_vertical', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 4, 'minimo', 3, 35, 90,
 'Jalón vertical desde abajo hacia el mentón con barra o mancuernas. Trabaja trapecio superior y deltoides lateral. Sin embargo, la mecánica de rotación interna forzada del hombro en el punto más alto lo hace potencialmente lesivo. Reemplazable por face pull y elevaciones laterales con menor riesgo.',
 '["Si se ejecuta: agarre estrecho reduce el impingement vs agarre ancho", "No subir más allá del pecho — el ROM superior es el más riesgoso", "Los codos deben ir hacia arriba y afuera, no hacia atrás", "Alternativa más segura: face pull + elevaciones laterales"]'::jsonb),

-- 22
('Jalón en polea con un brazo',
 'jalon_vertical', FALSE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 2, 35, 75,
 'Jalón vertical unilateral con cable. Permite mayor rango de movimiento y corrige desequilibrios. El torso puede inclinarse ligeramente hacia el lado contrario para aumentar el estiramiento inicial del dorsal.',
 '["Agarre prono o neutro según comodidad", "Inclinar el torso ligeramente hacia el lado contrario para elongar el dorsal en el inicio", "El codo baja hacia la cadera del mismo lado", "Movimiento estrictamente controlado — evitar el swing"]'::jsonb),

-- 23
('Dominadas lastradas',
 'jalon_vertical', TRUE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 4, 2, 'minimo', 5, 40, 180,
 'Dominadas con carga adicional (cinturón de lastre, chaleco, mancuerna entre los pies). Progresión para cuando las dominadas con peso corporal son demasiado fáciles. Alta demanda de fuerza relativa.',
 '["Dominar mínimo 10 pull-ups con peso corporal antes de añadir carga", "La técnica no debe degradarse con la carga adicional", "Carga pequeña y progresiva", "El cinturón de lastre es más seguro que sostener una mancuerna con los pies"]'::jsonb),

-- 24
('Jalón con banda de resistencia',
 'jalon_vertical', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 2, 25, 60,
 'Jalón vertical con banda anclada arriba. La resistencia variable de la banda es menor en el punto más difícil (inicio). Útil como introducción al patrón o para trabajo de activación.',
 '["Anclar la banda en un punto elevado", "Misma mecánica de escápulas que el lat pulldown", "Útil como warm-up del patrón antes de jalones con carga mayor"]'::jsonb),

-- 25
('Remo pendlay',
 'jalon_horizontal', TRUE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 4, 4, 'medio', 4, 40, 150,
 'Variante del remo con barra donde esta descansa completamente en el suelo entre cada repetición. Elimina el impulso y fuerza una acción explosiva concéntrica pura. Mayor demanda de potencia y técnica que el remo convencional.',
 '["La barra descansa en el suelo completamente entre cada repetición", "Tirón explosivo desde el suelo — no hay impulso de la posición anterior", "Misma posición de bisagra que el remo convencional", "El torso puede estar más horizontal que en el remo convencional"]'::jsonb),

-- 26
('Remo con mancuernas bilateral inclinado',
 'jalon_horizontal', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 3, 'minimo', 3, 35, 120,
 'Remo bilateral con mancuernas en banco inclinado 45°. El banco soporta el torso, eliminando la demanda de estabilización lumbar. Permite focalizar completamente en la retracción escapular y el jalón horizontal puro.',
 '["Pecho contra el banco durante todo el movimiento", "Mancuernas cuelgan perpendiculares al suelo en el inicio", "Jalar hacia las caderas con codos cerca del cuerpo para mayor dorsal", "Jalar hacia los costados con codos abiertos para mayor romboides"]'::jsonb)

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

-- Remo con barra
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo con barra (bent-over row)' AND eq.name = 'Barra olímpica';

-- Remo mancuerna
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo con mancuerna a una mano' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo con mancuerna a una mano' AND eq.name = 'Banco plano';

-- Remo máquina
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo en máquina sentado' AND eq.name = 'Máquina de remo sentado';

-- Remo polea baja
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo en polea baja con barra' AND eq.name = 'Polea baja';

-- T-bar row
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo con barra T (T-bar row)' AND eq.name = 'Barra olímpica';

-- Remo KB
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo con kettlebell' AND eq.name = 'Kettlebell';

-- Remo invertido
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo invertido (Australian pull-up)' AND eq.name = 'Barra fija (dominadas)';

-- Remo TRX
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo en TRX' AND eq.name = 'TRX / Suspensión';

-- Remo banda
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo con banda de resistencia' AND eq.name = 'Banda de resistencia';

-- Face pull (jalón horizontal)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Face pull en polea alta (retracción)' AND eq.name = 'Polea alta';

-- Pull-up prono
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dominadas (pull-up) agarre prono' AND eq.name = 'Barra fija (dominadas)';

-- Chin-up supino
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dominadas (chin-up) agarre supino' AND eq.name = 'Barra fija (dominadas)';

-- Dominadas neutro
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dominadas agarre neutro' AND eq.name = 'Barra fija (dominadas)';

-- Dominadas asistidas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dominadas asistidas (con banda)' AND eq.name = 'Barra fija (dominadas)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dominadas asistidas (con banda)' AND eq.name = 'Banda de resistencia';

-- Lat pulldown prono
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Jalón al pecho en polea alta (lat pulldown)' AND eq.name = 'Polea alta';

-- Lat pulldown neutro
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Jalón al pecho con agarre neutro (polea)' AND eq.name = 'Polea alta';

-- Jalón detrás del cuello
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Jalón detrás del cuello' AND eq.name = 'Polea alta';

-- Pullover mancuerna
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pullover con mancuerna' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pullover con mancuerna' AND eq.name = 'Banco plano';

-- Pullover polea
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pullover en polea' AND eq.name = 'Polea alta';

-- Superman
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Superman (extensión posterior en suelo)' AND eq.name = 'Ninguno (peso corporal)';

-- Remo al mentón
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo al mentón con barra' AND eq.name = 'Barra olímpica';

-- Jalón unilateral
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Jalón en polea con un brazo' AND eq.name = 'Polea alta';

-- Dominadas lastradas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dominadas lastradas' AND eq.name = 'Barra fija (dominadas)';

-- Jalón banda
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Jalón con banda de resistencia' AND eq.name = 'Banda de resistencia';

-- Remo pendlay
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo pendlay' AND eq.name = 'Barra olímpica';

-- Remo mancuernas bilateral
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo con mancuernas bilateral inclinado' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo con mancuernas bilateral inclinado' AND eq.name = 'Banco ajustable';


-- ============================================================
-- MUSCLE ASSIGNMENTS
-- ============================================================

-- Remo con barra
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con barra (bent-over row)'
AND m.name IN ('Dorsal ancho','Trapecio medio','Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con barra (bent-over row)'
AND m.name IN ('Bíceps braquial','Braquial','Trapecio inferior','Deltoides posterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con barra (bent-over row)'
AND m.name IN ('Erector espinal','Isquiotibiales','Glúteo mayor','Transverso abdominal');

-- Remo mancuerna
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con mancuerna a una mano'
AND m.name IN ('Dorsal ancho','Trapecio medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con mancuerna a una mano'
AND m.name IN ('Bíceps braquial','Romboides','Deltoides posterior','Trapecio inferior');

-- Remo máquina
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en máquina sentado'
AND m.name IN ('Dorsal ancho','Trapecio medio','Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en máquina sentado'
AND m.name IN ('Bíceps braquial','Deltoides posterior','Trapecio inferior');

-- Remo polea baja
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en polea baja con barra'
AND m.name IN ('Dorsal ancho','Trapecio medio','Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en polea baja con barra'
AND m.name IN ('Bíceps braquial','Deltoides posterior');

-- T-bar row
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con barra T (T-bar row)'
AND m.name IN ('Dorsal ancho','Trapecio medio','Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con barra T (T-bar row)'
AND m.name IN ('Bíceps braquial','Braquial','Trapecio inferior','Deltoides posterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con barra T (T-bar row)'
AND m.name IN ('Erector espinal','Transverso abdominal');

-- Remo KB
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con kettlebell'
AND m.name IN ('Dorsal ancho','Trapecio medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con kettlebell'
AND m.name IN ('Bíceps braquial','Romboides','Deltoides posterior');

-- Remo invertido
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo invertido (Australian pull-up)'
AND m.name IN ('Dorsal ancho','Trapecio medio','Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo invertido (Australian pull-up)'
AND m.name IN ('Bíceps braquial','Deltoides posterior','Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo invertido (Australian pull-up)'
AND m.name IN ('Transverso abdominal','Erector espinal','Glúteo mayor');

-- Remo TRX
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en TRX'
AND m.name IN ('Dorsal ancho','Trapecio medio','Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en TRX'
AND m.name IN ('Bíceps braquial','Deltoides posterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo en TRX'
AND m.name IN ('Transverso abdominal','Erector espinal');

-- Remo banda
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con banda de resistencia'
AND m.name IN ('Trapecio medio','Romboides','Dorsal ancho');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con banda de resistencia'
AND m.name IN ('Bíceps braquial','Deltoides posterior');

-- Face pull (jalón horizontal)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Face pull en polea alta (retracción)'
AND m.name IN ('Deltoides posterior','Infraespinoso','Redondo menor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Face pull en polea alta (retracción)'
AND m.name IN ('Trapecio medio','Trapecio inferior','Romboides');

-- Dominadas prono
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas (pull-up) agarre prono'
AND m.name IN ('Dorsal ancho','Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas (pull-up) agarre prono'
AND m.name IN ('Bíceps braquial','Braquial','Romboides','Trapecio medio','Pectoral mayor (porción esternal)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas (pull-up) agarre prono'
AND m.name IN ('Transverso abdominal','Oblicuo externo');

-- Chin-up
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas (chin-up) agarre supino'
AND m.name IN ('Dorsal ancho','Bíceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas (chin-up) agarre supino'
AND m.name IN ('Braquial','Trapecio inferior','Romboides','Trapecio medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas (chin-up) agarre supino'
AND m.name IN ('Transverso abdominal');

-- Dominadas neutro
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas agarre neutro'
AND m.name IN ('Dorsal ancho','Bíceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas agarre neutro'
AND m.name IN ('Braquial','Trapecio inferior','Romboides','Trapecio medio');

-- Dominadas asistidas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas asistidas (con banda)'
AND m.name IN ('Dorsal ancho','Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas asistidas (con banda)'
AND m.name IN ('Bíceps braquial','Romboides','Trapecio medio');

-- Lat pulldown prono
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón al pecho en polea alta (lat pulldown)'
AND m.name IN ('Dorsal ancho','Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón al pecho en polea alta (lat pulldown)'
AND m.name IN ('Bíceps braquial','Braquial','Romboides','Trapecio medio','Pectoral mayor (porción esternal)');

-- Lat pulldown neutro
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón al pecho con agarre neutro (polea)'
AND m.name IN ('Dorsal ancho','Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón al pecho con agarre neutro (polea)'
AND m.name IN ('Bíceps braquial','Braquial','Romboides','Trapecio medio');

-- Jalón detrás del cuello
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón detrás del cuello'
AND m.name IN ('Dorsal ancho','Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón detrás del cuello'
AND m.name IN ('Bíceps braquial','Romboides');

-- Pullover mancuerna
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pullover con mancuerna'
AND m.name IN ('Dorsal ancho');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pullover con mancuerna'
AND m.name IN ('Pectoral mayor (porción esternal)','Tríceps braquial','Serrato anterior');

-- Pullover polea
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pullover en polea'
AND m.name IN ('Dorsal ancho');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pullover en polea'
AND m.name IN ('Pectoral mayor (porción esternal)','Tríceps braquial','Serrato anterior');

-- Superman
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Superman (extensión posterior en suelo)'
AND m.name IN ('Erector espinal','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Superman (extensión posterior en suelo)'
AND m.name IN ('Isquiotibiales','Multífidos','Trapecio inferior','Dorsal ancho');

-- Remo al mentón
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo al mentón con barra'
AND m.name IN ('Trapecio superior','Deltoides lateral');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo al mentón con barra'
AND m.name IN ('Bíceps braquial','Deltoides anterior','Supraespinoso');

-- Jalón unilateral
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón en polea con un brazo'
AND m.name IN ('Dorsal ancho','Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón en polea con un brazo'
AND m.name IN ('Bíceps braquial','Romboides','Trapecio medio');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón en polea con un brazo'
AND m.name IN ('Oblicuo externo','Transverso abdominal');

-- Dominadas lastradas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas lastradas'
AND m.name IN ('Dorsal ancho','Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dominadas lastradas'
AND m.name IN ('Bíceps braquial','Braquial','Romboides','Trapecio medio');

-- Jalón banda
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón con banda de resistencia'
AND m.name IN ('Dorsal ancho','Trapecio inferior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Jalón con banda de resistencia'
AND m.name IN ('Bíceps braquial','Romboides');

-- Remo pendlay
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo pendlay'
AND m.name IN ('Dorsal ancho','Trapecio medio','Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo pendlay'
AND m.name IN ('Bíceps braquial','Braquial','Trapecio inferior','Deltoides posterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo pendlay'
AND m.name IN ('Erector espinal','Isquiotibiales','Transverso abdominal');

-- Remo mancuernas bilateral
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con mancuernas bilateral inclinado'
AND m.name IN ('Dorsal ancho','Trapecio medio','Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con mancuernas bilateral inclinado'
AND m.name IN ('Bíceps braquial','Deltoides posterior','Trapecio inferior');


-- ============================================================
-- CONTRAINDICATION ASSIGNMENTS
-- ============================================================

-- Remo con barra
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición de bisagra sostenida bajo carga es incompatible con dolor lumbar agudo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo con barra (bent-over row)' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión lumbar bajo carga puede agravar la hernia.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo con barra (bent-over row)' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'En fase crónica estable: posible con carga conservadora y técnica impecable. Valorar individualmente.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo con barra (bent-over row)' AND c.name = 'Dolor lumbar crónico';

-- Remo mancuerna (menor riesgo lumbar por el apoyo)
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El apoyo en banco elimina casi toda la demanda lumbar. Tolerable en lumbar crónico estable.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo con mancuerna a una mano' AND c.name = 'Dolor lumbar crónico';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'En fase aguda el apoyo no es suficiente — cualquier carga puede perpetuar el espasmo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo con mancuerna a una mano' AND c.name = 'Dolor lumbar agudo';

-- Remo pendlay
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo pendlay' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo pendlay' AND c.name = 'Hernia discal lumbar activa';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El jalón explosivo desde el suelo requiere columna asintomática — mayor riesgo que el remo convencional por el componente balístico.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo pendlay' AND c.name = 'Dolor lumbar crónico';

-- T-bar row
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo con barra T (T-bar row)' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Con apoyo pectoral: menor riesgo lumbar. Sin apoyo: igual que el remo convencional.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo con barra T (T-bar row)' AND c.name = 'Dolor lumbar crónico';

-- Dominadas (todas las variantes) — hombro
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas (pull-up) agarre prono' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición de colgado con plena elongación del manguito puede agravar la lesión.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas (pull-up) agarre prono' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas (pull-up) agarre prono' AND c.name = 'Cirugía de hombro reciente';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El dolor de codo en posición de carga alta puede agravar el síndrome del túnel carpiano.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas (pull-up) agarre prono' AND c.name = 'Síndrome del túnel carpiano';

INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas (chin-up) agarre supino' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas (chin-up) agarre supino' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas (chin-up) agarre supino' AND c.name = 'Cirugía de hombro reciente';

INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas agarre neutro' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas agarre neutro' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas agarre neutro' AND c.name = 'Cirugía de hombro reciente';

INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas lastradas' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas lastradas' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Dominadas lastradas' AND c.name = 'Cirugía de hombro reciente';

-- Jalón detrás del cuello — contraindicaciones críticas
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La flexión cervical forzada bajo carga es la principal razón por la que este ejercicio está desaconsejado globalmente.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jalón detrás del cuello' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jalón detrás del cuello' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El hombro en abducción + rotación interna máxima es la posición de mayor riesgo de impingement.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jalón detrás del cuello' AND c.name = 'Síndrome de impingement';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jalón detrás del cuello' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jalón detrás del cuello' AND c.name = 'Inestabilidad glenohumeral';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jalón detrás del cuello' AND c.name = 'Estenosis espinal';

-- Remo al mentón
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La rotación interna forzada del hombro en el punto más alto es la causa principal de impingement.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo al mentón con barra' AND c.name = 'Síndrome de impingement';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo al mentón con barra' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo al mentón con barra' AND c.name = 'Dolor de hombro agudo';

-- Pullover mancuerna
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición overhead elongada con carga puede agravar lesiones del manguito.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Pullover con mancuerna' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Pullover con mancuerna' AND c.name = 'Dolor de hombro agudo';

-- Lat pulldown (contraindicaciones de hombro)
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jalón al pecho en polea alta (lat pulldown)' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El rango overhead de inicio puede provocar dolor. Reducir ROM inicial o sustituir por remo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Jalón al pecho en polea alta (lat pulldown)' AND c.name = 'Síndrome de impingement';

-- Remo invertido — sin contraindicaciones de hombro significativas
-- pero sí de muñeca
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El agarre supino de la barra puede estresar la muñeca en personas con dolor agudo.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Remo invertido (Australian pull-up)' AND c.name = 'Dolor de muñeca agudo';


-- ============================================================
-- EXERCISE RELATIONSHIPS
-- ============================================================

-- Remo con barra → relaciones
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'El apoyo en banco elimina la demanda de estabilización lumbar. Mismo patrón de jalón.'
FROM exercises s, exercises t WHERE s.nombre = 'Remo con barra (bent-over row)' AND t.nombre = 'Remo con mancuerna a una mano';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Sin demanda lumbar ni de estabilización. Ideal cuando la fatiga espinal ya es alta.'
FROM exercises s, exercises t WHERE s.nombre = 'Remo con barra (bent-over row)' AND t.nombre = 'Remo en máquina sentado';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Componente balístico y reset completo entre reps. Mayor demanda de potencia y técnica.'
FROM exercises s, exercises t WHERE s.nombre = 'Remo con barra (bent-over row)' AND t.nombre = 'Remo pendlay';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'equipment_alternative', 'Sin barra, el remo TRX trabaja el mismo patrón de jalón horizontal con peso corporal.'
FROM exercises s, exercises t WHERE s.nombre = 'Remo con barra (bent-over row)' AND t.nombre = 'Remo en TRX';

-- Remo invertido → dominadas (progresión clásica)
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'El remo invertido es la regresión directa de las dominadas. Dominar el remo invertido antes de avanzar a dominadas es la progresión con mayor respaldo en evidencia.'
FROM exercises s, exercises t WHERE s.nombre = 'Remo invertido (Australian pull-up)' AND t.nombre = 'Dominadas (pull-up) agarre prono';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Menor demanda técnica y de fuerza relativa. Mismo patrón con mayor inestabilidad del soporte.'
FROM exercises s, exercises t WHERE s.nombre = 'Remo invertido (Australian pull-up)' AND t.nombre = 'Remo en TRX';

-- Remo con banda → remo invertido
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Mayor carga, mayor demanda de estabilización corporal total.'
FROM exercises s, exercises t WHERE s.nombre = 'Remo con banda de resistencia' AND t.nombre = 'Remo invertido (Australian pull-up)';

-- Dominadas asistidas → dominadas prono
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Sin asistencia: la progresión natural cuando la banda ya no es necesaria.'
FROM exercises s, exercises t WHERE s.nombre = 'Dominadas asistidas (con banda)' AND t.nombre = 'Dominadas (pull-up) agarre prono';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'Sin carga relativa alta. El jalón en polea enseña el patrón motor antes de pasar a peso corporal.'
FROM exercises s, exercises t WHERE s.nombre = 'Dominadas asistidas (con banda)' AND t.nombre = 'Jalón al pecho en polea alta (lat pulldown)';

-- Dominadas prono → relaciones
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'La banda asiste en el punto más difícil. Regresión directa cuando el peso corporal supera la fuerza disponible.'
FROM exercises s, exercises t WHERE s.nombre = 'Dominadas (pull-up) agarre prono' AND t.nombre = 'Dominadas asistidas (con banda)';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Carga adicional una vez dominadas >10 reps estrictas.'
FROM exercises s, exercises t WHERE s.nombre = 'Dominadas (pull-up) agarre prono' AND t.nombre = 'Dominadas lastradas';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Mayor activación de bíceps, agarre más natural. Algunos usuarios lo encuentran más accesible.'
FROM exercises s, exercises t WHERE s.nombre = 'Dominadas (pull-up) agarre prono' AND t.nombre = 'Dominadas (chin-up) agarre supino';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Menor estrés articular en codo y hombro. Buena opción con molestias en esas zonas.'
FROM exercises s, exercises t WHERE s.nombre = 'Dominadas (pull-up) agarre prono' AND t.nombre = 'Dominadas agarre neutro';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'unilateral_version', 'Mayor ROM, corrige desequilibrios, mayor demanda de core antirotacional.'
FROM exercises s, exercises t WHERE s.nombre = 'Dominadas (pull-up) agarre prono' AND t.nombre = 'Jalón en polea con un brazo';

-- Lat pulldown → dominadas
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Mismo patrón con peso corporal. El objetivo final del lat pulldown es no necesitarlo.'
FROM exercises s, exercises t WHERE s.nombre = 'Jalón al pecho en polea alta (lat pulldown)' AND t.nombre = 'Dominadas (pull-up) agarre prono';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Menor estrés articular. Buena opción cuando hay molestia de muñeca o codo con agarre prono.'
FROM exercises s, exercises t WHERE s.nombre = 'Jalón al pecho en polea alta (lat pulldown)' AND t.nombre = 'Jalón al pecho con agarre neutro (polea)';

-- Jalón detrás del cuello → jalón al pecho
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'equipment_alternative', 'Alternativa más segura con activación equivalente del dorsal y sin riesgo cervical ni de hombro.'
FROM exercises s, exercises t WHERE s.nombre = 'Jalón detrás del cuello' AND t.nombre = 'Jalón al pecho en polea alta (lat pulldown)';

-- Pullover mancuerna → pullover polea
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Tensión constante del cable superior a la mancuerna para hipertrofia en rango elongado.'
FROM exercises s, exercises t WHERE s.nombre = 'Pullover con mancuerna' AND t.nombre = 'Pullover en polea';

-- Remo al mentón → face pull
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'equipment_alternative', 'Face pull activa trapecio superior y deltoides con rotación externa — misma función sin el riesgo de impingement del remo al mentón.'
FROM exercises s, exercises t WHERE s.nombre = 'Remo al mentón con barra' AND t.nombre = 'Face pull en polea alta (retracción)';
