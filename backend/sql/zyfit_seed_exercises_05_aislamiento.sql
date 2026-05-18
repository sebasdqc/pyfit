-- ============================================================
-- ZYFIT — Exercise Seed Data: Batch 05
-- Patterns: Aislamiento + Locomoción
-- Total exercises: 34
-- ============================================================

-- ============================================================
-- AISLAMIENTO — BÍCEPS
-- ============================================================

INSERT INTO exercises (nombre, patron_movimiento, bilateral, es_compuesto, dificultad, musculos_primarios, musculos_secundarios, equipamiento, contraindicaciones, activo, gif_url, imagen_url, technical_level, error_risk, space_required, systemic_fatigue, set_duration_seconds, rest_seconds_default, description, coaching_cues) VALUES

-- 1
('Curl de bíceps con barra',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 2, 30, 75,
 'El ejercicio de aislamiento de bíceps más cargable. La barra permite mayor carga que las mancuernas pero fija la supinación del antebrazo durante todo el recorrido. La barra EZ reduce el estrés en muñeca y codo vs la barra recta.',
 '["Codos fijos a los costados durante todo el movimiento", "No usar el impulso del torso para subir — si ocurre, la carga es excesiva", "Supinación completa en el punto de máxima contracción", "Excéntrico controlado — 2–3 segundos bajando", "La barra EZ es preferible a la recta para reducir estrés en muñeca"]'::jsonb),

-- 2
('Curl de bíceps con mancuernas (alternado)',
 'aislamiento', FALSE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 2, 30, 75,
 'Curl unilateral alternado con mancuernas. Permite supinación completa durante el recorrido (ventaja vs barra). Corrige desequilibrios de fuerza entre brazos. El movimiento alternado permite mayor volumen total.',
 '["Supinar la muñeca al subir — el meñique se aleja del cuerpo", "Codo fijo al costado durante todo el recorrido", "Excéntrico controlado: bajar despacio", "No balancear el torso — si ocurre, reducir la carga"]'::jsonb),

-- 3
('Curl martillo (hammer curl)',
 'aislamiento', FALSE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 2, 30, 75,
 'Curl con agarre neutro (pulgar arriba). Activa más el braquial y el braquiorradial que el bíceps braquial. El braquial es el músculo más grueso del brazo — su desarrollo aporta más a la circunferencia que el bíceps en muchos casos.',
 '["Agarre neutro durante todo el recorrido — sin supinación", "Misma mecánica de codo que el curl estándar", "El braquial trabaja mejor en este agarre que el bíceps"]'::jsonb),

-- 4
('Curl en polea baja',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 2, 30, 75,
 'Curl con cable. La tensión constante del cable es superior a la mancuerna en el punto de mínima tensión (inicio del recorrido). Ideal para el trabajo de alta repetición con tensión continua.',
 '["La resistencia del cable es constante en todo el ROM — diferente a la mancuerna", "Misma mecánica de codo fijo que en los curls con mancuerna", "Se puede realizar bilateral o unilateral"]'::jsonb),

-- 5
('Curl concentrado',
 'aislamiento', FALSE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 1, 30, 60,
 'Curl unilateral con el codo apoyado en el muslo. Elimina el movimiento del codo y el balanceo. Aísla el bíceps con mayor eficacia que los curls de pie. Demanda de core y estabilización mínima.',
 '["El codo no debe moverse del muslo en ningún momento", "Supinación completa en la contracción máxima", "La posición elimina la posibilidad de hacer trampa con el torso"]'::jsonb),

-- 6
('Curl en banco inclinado (incline curl)',
 'aislamiento', FALSE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 2, 30, 75,
 'Curl con mancuernas en banco inclinado 45–60°. La inclinación estira el bíceps en la posición inicial más allá de lo posible de pie, generando mayor tensión en el rango elongado. Superior para hipertrofia según evidencia reciente sobre entrenamiento en rango elongado.',
 '["Banco a 45–60° de inclinación", "Los brazos cuelgan perpendiculares al suelo en el inicio — el punto de máxima elongación", "El ROM desde elongación completa aumenta el estímulo hipertrófico", "Usar cargas menores que en el curl estándar por la posición de desventaja mecánica"]'::jsonb),

-- ============================================================
-- AISLAMIENTO — TRÍCEPS
-- ============================================================

('Extensión de tríceps en polea (pushdown)',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 2, 30, 75,
 'El ejercicio de aislamiento de tríceps más accesible. Extensión de codo desde polea alta. La posición vertical del torso y los codos fijos permiten un aislamiento efectivo. Múltiples variantes de accesorio cambian el énfasis entre las tres cabezas.',
 '["Codos fijos a los costados — no deben moverse durante el movimiento", "Extensión completa en el punto más bajo — contracción máxima del tríceps", "No inclinar el torso hacia adelante para ganar fuerza", "Accesorio de cuerda: mayor activación de cabeza lateral y medial en la supinación final"]'::jsonb),

-- 8
('Extensión de tríceps unilateral en polea',
 'aislamiento', FALSE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 2, 30, 75,
 'Versión unilateral del pushdown. Corrige desequilibrios entre brazos. Permite mayor ROM y rotación del antebrazo.',
 '["Misma mecánica que el pushdown bilateral", "Mayor ROM al final cuando el brazo cruza ligeramente el cuerpo", "El torso puede inclinarse ligeramente hacia adelante para mayor estabilidad"]'::jsonb),

-- 9
('Press francés con barra EZ',
 'aislamiento', TRUE, FALSE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 3, 'minimo', 2, 35, 90,
 'Extensión de codo desde posición supina con barra EZ. La barra desciende hacia la frente o el área occipital. Trabaja la cabeza larga del tríceps en posición elongada. Alta eficacia para hipertrofia pero mayor riesgo de codo si el excéntrico no es controlado.',
 '["Codos apuntan al techo y permanecen fijos durante todo el recorrido", "La barra baja hacia la frente o ligeramente detrás — no al pecho", "La barra EZ reduce el estrés en muñeca vs barra recta", "Excéntrico muy controlado — el tendón del tríceps está bajo máxima tensión en elongación", "No usar cargas excesivas — la articulación del codo es vulnerable en este ejercicio"]'::jsonb),

-- 10
('Fondos en banco (triceps dips)',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 2, 'minimo', 2, 30, 75,
 'Extensión de codo con peso corporal apoyado en banco, pies en el suelo o elevados. Cuando el torso se mantiene vertical y los codos van atrás, el tríceps es el músculo principal. Accesible y sin equipo especializado.',
 '["Torso vertical — no inclinarse hacia adelante", "Codos van directamente hacia atrás, no hacia afuera", "Descenso hasta 90° de flexión de codo como mínimo", "Elevar los pies para aumentar la carga"]'::jsonb),

-- 11
('Extensión de tríceps sobre la cabeza (overhead)',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 2, 30, 75,
 'Extensión de codo con mancuerna o cable desde posición overhead. La cabeza larga del tríceps (la más grande) trabaja en mayor rango de estiramiento que en el pushdown. Superior para la cabeza larga según la evidencia sobre entrenamiento en rango elongado.',
 '["Codos apuntan al techo durante todo el movimiento — no deben abrirse", "El rango elongado es el punto de mayor activación de la cabeza larga", "Con cable: la tensión es constante, lo que es superiora la mancuerna en este ejercicio", "Usar cargas moderadas — la posición de elongación tiene mayor riesgo de desgarro"]'::jsonb),

-- 12
('Kickback de tríceps con mancuerna',
 'aislamiento', FALSE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 1, 25, 60,
 'Extensión de codo desde posición de bisagra con el brazo paralelo al suelo. La cabeza lateral del tríceps trabaja principalmente en el rango acortado. Útil para completar el volumen de tríceps pero inferior para la cabeza larga vs el overhead.',
 '["El torso está en bisagra, el brazo paralelo al suelo antes de extender", "Solo el antebrazo se mueve — el húmero permanece fijo", "Extensión completa en el punto más alto", "Usar cargas ligeras — la palanca en esta posición es reducida"]'::jsonb),

-- ============================================================
-- AISLAMIENTO — HOMBRO POSTERIOR Y MANGUITO
-- ============================================================

('Pájaro (reverse fly) con mancuernas',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'minimo', 1, 30, 60,
 'Apertura lateral en posición de bisagra para el deltoides posterior. El músculo más olvidado del hombro y uno de los más importantes para la salud articular y la postura. La posición de bisagra elimina la participación del deltoides lateral.',
 '["Bisagra de cadera a 45–60° — si el torso está muy erguido, trabaja el trapecio, no el deltoides posterior", "Codos ligeramente flexionados y fijos", "El movimiento es una apertura lateral, no una elevación hacia atrás", "Usar cargas bajas — el deltoides posterior es pequeño y se fatiga rápidamente"]'::jsonb),

-- 14
('Pájaro en polea (reverse cable fly)',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 1, 'minimo', 1, 30, 60,
 'Versión con cable del reverse fly. La tensión constante del cable es superior a la mancuerna para el deltoides posterior. Las poleas cruzadas o la polea alta permiten mayor libertad de movimiento.',
 '["Misma mecánica que la versión con mancuerna", "Con cables cruzados: un brazo con la polea del lado contrario", "La tensión constante es el principal beneficio vs mancuerna"]'::jsonb),

-- 15
('Rotación externa con banda (90°)',
 'aislamiento', FALSE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 1, 25, 45,
 'Rotación externa del hombro con banda de resistencia, codo a 90°. Activa el infraespinoso y el redondo menor. Fundamental para la salud del manguito rotador y la prevención de lesiones de hombro. Recomendado como ejercicio de calentamiento y complemento en todos los programas con alto volumen de press.',
 '["Codo a 90° y pegado al costado durante todo el movimiento", "Solo rota el antebrazo — el codo no se mueve", "Rango completo pero sin forzar la rotación externa más allá del límite cómodo", "Usar resistencia mínima — el objetivo es activación, no fatiga"]'::jsonb),

-- ============================================================
-- AISLAMIENTO — PIERNA
-- ============================================================

('Extensión de cuádriceps en máquina',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 2, 'minimo', 2, 30, 75,
 'Extensión de rodilla en máquina. Aislamiento completo del cuádriceps. Alta tensión en el tendón patelar especialmente en los últimos grados de extensión. La evidencia reciente favorece el trabajo en rango elongado (rodilla más flexionada al inicio).',
 '["Ajustar el rodillo sobre el tobillo, no sobre el pie", "Extensión completa en el punto más alto — contracción máxima", "El trabajo en rango elongado (partir de 90° o más) genera mayor estímulo hipertrófico según evidencia reciente", "Evitar cargas máximas en personas con antecedentes de dolor patelar"]'::jsonb),

-- 17
('Curl de isquiotibiales tumbado en máquina',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 2, 30, 75,
 'Flexión de rodilla en máquina en decúbito prono. Aislamiento del bíceps femoral e isquiotibiales. Complemento fundamental al cuádriceps para el balance muscular de rodilla.',
 '["La cadera permanece pegada al banco durante todo el movimiento", "Flexión completa — talones hacia los glúteos", "Excéntrico controlado — los isquiotibiales son especialmente vulnerables a las lesiones excéntricas", "Ajustar el rodillo sobre el tobillo"]'::jsonb),

-- 18
('Curl de isquiotibiales sentado en máquina',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 2, 30, 75,
 'Flexión de rodilla en máquina sentado. La posición sentada coloca los isquiotibiales en mayor rango de elongación en la cadera vs la versión tumbada. Superior para la cabeza proximal de los isquiotibiales según evidencia reciente sobre entrenamiento en rango elongado.',
 '["La posición sentada elongada la cadera: mayor trabajo en rango elongado para los isquiotibiales", "Misma mecánica de control que la versión tumbada", "Superposición de beneficios: combinar ambas versiones en el programa"]'::jsonb),

-- 19
('Nordic curl (curl nórdico)',
 'aislamiento', TRUE, FALSE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 4, 3, 'minimo', 3, 40, 120,
 'Flexión excéntrica de rodilla desde posición de rodillas con los tobillos fijos. El ejercicio con mayor evidencia para la prevención de lesiones de isquiotibiales. La demanda excéntrica en el recorrido es extrema — el riesgo de agujetas severas en personas no adaptadas es muy alto.',
 '["Los pies deben estar firmemente anclados — compañero, máquina o banda", "El cuerpo baja de forma controlada como una sola pieza", "Comenzar con un rango de movimiento pequeño y aumentar progresivamente", "Las manos se usan para aterrizar suavemente y volver a la posición inicial", "No intentar la versión completa sin semanas de adaptación excéntrica previa"]'::jsonb),

-- 20
('Abducción de cadera en máquina',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 1, 30, 60,
 'Apertura lateral de piernas en máquina. Aislamiento del glúteo medio y menor. El glúteo medio es el estabilizador principal de la pelvis en la marcha y la carrera. Su desarrollo previene el colapso de rodilla en los ejercicios de sentadilla.',
 '["No usar impulso del torso — movimiento controlado", "El rango de movimiento no debe exceder el que permite mantener la pelvis estable", "Útil como activación antes de ejercicios de pierna o como aislamiento de cierre"]'::jsonb),

-- 21
('Abducción de cadera con banda (de pie)',
 'aislamiento', FALSE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 1, 25, 60,
 'Abducción de cadera de pie con banda de resistencia. Activa el glúteo medio en cadena cinética cerrada. Útil como calentamiento y activación antes de sentadillas o como ejercicio funcional de glúteo medio.',
 '["La banda va sobre las rodillas o los tobillos — más distal = más demanda", "Mantener el equilibrio sobre la pierna de apoyo", "El torso no debe inclinarse lateralmente como compensación"]'::jsonb),

-- 22
('Elevación de talones de pie (calf raise)',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 1, 30, 60,
 'Plantar-flexión bilateral de pie. Activa el gastrocnemio principalmente. Para maximizar el rango, el talón debe bajar por debajo del nivel del suelo en el inicio (escalón o step). La pantorrilla requiere alta repetición para hipertrofia por su composición predominante de fibras lentas.',
 '["Rango completo: talón abajo en el inicio, elevación máxima al final", "Pausa de 1–2 segundos en la posición de máxima contracción", "Las pantorrillas requieren más repeticiones que otros músculos — 15–25 reps por set es apropiado", "Usar un step para maximizar el ROM"]'::jsonb),

-- 23
('Elevación de talones sentado (seated calf raise)',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 1, 30, 60,
 'Plantar-flexión en posición sentada. En esta posición el gastrocnemio (biarticular) está en posición de acortamiento por la cadera flexionada, de modo que el sóleo es el músculo principal. Complementa la versión de pie para trabajar ambas cabezas de la pantorrilla.',
 '["El sóleo es el músculo objetivo en esta variante", "Misma pausa en el punto de máxima contracción que la versión de pie", "La carga va sobre las rodillas — usar una mancuerna o la máquina específica"]'::jsonb),

-- 24
('Glute kickback en polea',
 'aislamiento', FALSE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 1, 'minimo', 1, 30, 60,
 'Extensión de cadera desde posición cuadrúpeda o de pie con cable. Aislamiento del glúteo mayor en extensión de cadera. Complemento de los ejercicios compuestos de bisagra y sentadilla cuando se busca volumen adicional de glúteo.',
 '["La extensión de cadera es el movimiento — no la extensión de rodilla", "Mantener la columna neutra durante todo el movimiento", "Contraer el glúteo en el punto de máxima extensión — pausa de 1 segundo", "No hiperextender la columna lumbar como compensación"]'::jsonb),

-- ============================================================
-- AISLAMIENTO — ESPALDA SUPERIOR / TRAPECIO
-- ============================================================

('Encogimientos de hombros (shrugs) con mancuernas',
 'aislamiento', TRUE, FALSE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 2, 30, 75,
 'Elevación bilateral de escápulas con mancuernas. Aislamiento del trapecio superior. Útil para el desarrollo del grosor de la base del cuello y el trapecio, pero debe equilibrarse con ejercicios del trapecio inferior y medio para no generar desequilibrios posturales.',
 '["Movimiento vertical puro — no circular", "Pausa de 1 segundo en el punto más alto", "Los codos no deben flexionarse", "No forzar la rotación del cuello como compensación"]'::jsonb),

-- 26
('Remo al pecho en máquina (chest-supported row)',
 'aislamiento', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 1, 1, 'minimo', 2, 35, 75,
 'Remo con pecho apoyado en banco inclinado en máquina. El soporte elimina completamente la demanda de estabilización lumbar. Ideal para alto volumen de jalón horizontal sin fatiga espinal.',
 '["El pecho permanece en contacto con el banco durante todo el movimiento", "Retracción escapular completa en el punto de contracción", "Agarre neutro o prono según preferencia y objetivo"]'::jsonb),

-- ============================================================
-- LOCOMOCIÓN / POTENCIA
-- ============================================================

('Salto squat (jump squat)',
 'locomocion', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 3, 'medio', 4, 25, 90,
 'Sentadilla con salto explosivo al final de la fase concéntrica. Desarrolla potencia de piernas. La demanda articular en el aterrizaje requiere técnica correcta. Sin carga o con carga ligera al aprender.',
 '["La sentadilla previa al salto debe ser controlada — no profunda", "El aterrizaje amortigua en la punta del pie y luego el talón: no caer rígido", "Las rodillas deben absorber el impacto — no colapsar hacia adentro", "Brazos hacia arriba durante el salto para maximizar la elevación"]'::jsonb),

-- 28
('Box jump (salto a cajón)',
 'locomocion', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 3, 'medio', 4, 25, 120,
 'Salto desde el suelo a una superficie elevada. Desarrolla potencia y confianza en el salto. La altura del cajón debe permitir un aterrizaje seguro en posición de sentadilla parcial.',
 '["Cajón a altura que permita aterrizar con rodillas flexionadas — no con piernas extendidas", "El aterrizaje es el momento de mayor riesgo: aterrizar suave y controlado", "Bajar del cajón caminando, no saltando — el bajado excéntrico aumenta el riesgo de lesión", "Comenzar con alturas conservadoras"]'::jsonb),

-- 29
('Burpee',
 'locomocion', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'medio', 5, 30, 90,
 'Secuencia de movimientos que combina sentadilla, plancha, push-up y salto. Altísima demanda cardiovascular y sistémica. Trabaja prácticamente todos los grupos musculares en una sola repetición. El ejercicio de mayor costo energético por repetición de los incluidos en la base.',
 '["La velocidad no debe comprometer la técnica — especialmente en el push-up y el aterrizaje", "La versión sin push-up (burpee modificado) reduce la demanda de hombro", "Respiración continua — no contener el aliento", "Escalar la intensidad modificando la velocidad, no eliminando fases del movimiento"]'::jsonb),

-- 30
('Caminata con zancada (walking lunge)',
 'locomocion', FALSE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'amplio', 3, 35, 75,
 'Clasificado también en sentadilla pero incluido aquí como patrón de locomoción. La versión de locomoción añade desplazamiento continuo y coordinación dinámica bilateral al patrón unilateral.',
 '["Paso largo y controlado", "La rodilla trasera baja vertical sin tocar el suelo", "Torso erecto durante todo el recorrido", "Con mancuernas o barra para progresar la carga"]'::jsonb),

-- 31
('Sprint (carrera de alta intensidad)',
 'locomocion', TRUE, TRUE, 'intermedio', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 3, 3, 'amplio', 5, 20, 180,
 'Carrera a máxima o submáxima velocidad. El ejercicio de mayor fatiga sistémica del catálogo. Demanda de cadena posterior (isquiotibiales, glúteos), psoas y pantorrilla es extrema. Alta transferencia atlética. Requiere calentamiento específico.',
 '["Calentamiento de 10–15 minutos antes de sprints máximos", "La aceleración es la fase de mayor riesgo de lesión de isquiotibiales", "Los primeros sprints del bloque deben ser a 80–85% de la velocidad máxima", "Superficies planas y sin obstáculos", "Suspender si aparece dolor en isquiotibiales"]'::jsonb),

-- 32
('Salto a la comba (jump rope)',
 'locomocion', TRUE, TRUE, 'principiante', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 2, 2, 'medio', 4, 60, 60,
 'Salto continuo con cuerda. Desarrolla coordinación, ritmo, resistencia cardiovascular y fuerza de pantorrilla. La variante de doble salto (double under) aumenta exponencialmente la demanda.',
 '["Saltos pequeños — la cuerda no requiere saltar alto", "Aterrizar en la punta del pie — no con el talón plano", "Los codos pegados al cuerpo, la muñeca genera el giro de la cuerda", "Comenzar con sets cortos e ir aumentando la duración"]'::jsonb),

-- 33
('Kettlebell clean',
 'locomocion', FALSE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 4, 4, 'medio', 4, 30, 120,
 'Movimiento de halterofilia adaptado con kettlebell: el KB sube del suelo o del colgado hasta la posición de rack en un solo movimiento. Combina bisagra explosiva con jalón vertical y recepción. Alta demanda técnica y sistémica.',
 '["La potencia viene de la extensión de cadera — igual que el swing", "El KB rueda sobre la mano en el punto de transición — no jalar con el brazo", "La muñeca debe estar en posición neutra en el rack", "Dominar el swing antes de intentar el clean"]'::jsonb),

-- 34
('Turkish get-up',
 'locomocion', FALSE, TRUE, 'avanzado', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, TRUE, '', '', 5, 4, 'amplio', 3, 60, 120,
 'Secuencia de movimientos desde decúbito supino hasta posición de pie con una mancuerna o kettlebell sostenida sobre la cabeza. Desarrolla estabilización de hombro, movilidad de cadera y coordinación de cuerpo completo. El ejercicio más complejo del catálogo.',
 '["El brazo con la carga permanece extendido y vertical durante toda la secuencia", "La mirada sigue el KB en todo momento", "Aprender la secuencia sin carga primero — luego añadir peso progresivamente", "Cada fase del movimiento tiene su propio patrón técnico: estudiarlas individualmente", "No hay apuro — es un movimiento deliberado y controlado"]'::jsonb)

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

-- Curl barra
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de bíceps con barra' AND eq.name = 'Barra EZ';

-- Curl mancuernas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de bíceps con mancuernas (alternado)' AND eq.name = 'Mancuernas';

-- Curl martillo
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl martillo (hammer curl)' AND eq.name = 'Mancuernas';

-- Curl polea
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl en polea baja' AND eq.name = 'Polea baja';

-- Curl concentrado
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl concentrado' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl concentrado' AND eq.name = 'Banco plano';

-- Curl inclinado
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl en banco inclinado (incline curl)' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl en banco inclinado (incline curl)' AND eq.name = 'Banco ajustable';

-- Pushdown
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Extensión de tríceps en polea (pushdown)' AND eq.name = 'Polea alta';

-- Pushdown unilateral
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Extensión de tríceps unilateral en polea' AND eq.name = 'Polea alta';

-- Press francés
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press francés con barra EZ' AND eq.name = 'Barra EZ';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press francés con barra EZ' AND eq.name = 'Banco plano';

-- Fondos en banco
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Fondos en banco (triceps dips)' AND eq.name = 'Banco plano';

-- Extensión overhead
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Extensión de tríceps sobre la cabeza (overhead)' AND eq.name = 'Mancuernas';

-- Kickback
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Kickback de tríceps con mancuerna' AND eq.name = 'Mancuernas';

-- Pájaro mancuernas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pájaro (reverse fly) con mancuernas' AND eq.name = 'Mancuernas';

-- Pájaro polea
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pájaro en polea (reverse cable fly)' AND eq.name = 'Máquina de cable cruzado';

-- Rotación externa
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Rotación externa con banda (90°)' AND eq.name = 'Banda de resistencia';

-- Extensión cuádriceps
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Extensión de cuádriceps en máquina' AND eq.name = 'Máquina de extensión de piernas';

-- Curl isquios tumbado
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de isquiotibiales tumbado en máquina' AND eq.name = 'Máquina de curl de piernas';

-- Curl isquios sentado
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de isquiotibiales sentado en máquina' AND eq.name = 'Máquina de curl de piernas';

-- Nordic curl
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Nordic curl (curl nórdico)' AND eq.name = 'Ninguno (peso corporal)';

-- Abducción máquina
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Abducción de cadera en máquina' AND eq.name = 'Máquina de aducción/abducción';

-- Abducción banda
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Abducción de cadera con banda (de pie)' AND eq.name = 'Banda de resistencia';

-- Calf raise
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevación de talones de pie (calf raise)' AND eq.name = 'Ninguno (peso corporal)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevación de talones de pie (calf raise)' AND eq.name = 'Step / Escalón';

-- Seated calf raise
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevación de talones sentado (seated calf raise)' AND eq.name = 'Mancuernas';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevación de talones sentado (seated calf raise)' AND eq.name = 'Banco plano';

-- Glute kickback
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Glute kickback en polea' AND eq.name = 'Polea baja';

-- Shrugs
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Encogimientos de hombros (shrugs) con mancuernas' AND eq.name = 'Mancuernas';

-- Chest-supported row
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo al pecho en máquina (chest-supported row)' AND eq.name = 'Banco ajustable';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo al pecho en máquina (chest-supported row)' AND eq.name = 'Mancuernas';

-- Salto squat
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Salto squat (jump squat)' AND eq.name = 'Ninguno (peso corporal)';

-- Box jump
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Box jump (salto a cajón)' AND eq.name = 'Caja pliométrica';

-- Burpee
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Burpee' AND eq.name = 'Ninguno (peso corporal)';

-- Walking lunge
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Caminata con zancada (walking lunge)' AND eq.name = 'Ninguno (peso corporal)';
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Caminata con zancada (walking lunge)' AND eq.name = 'Mancuernas';

-- Sprint
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sprint (carrera de alta intensidad)' AND eq.name = 'Ninguno (peso corporal)';

-- Comba
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Salto a la comba (jump rope)' AND eq.name = 'Banda de resistencia';

-- KB clean
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Kettlebell clean' AND eq.name = 'Kettlebell';

-- Turkish get-up
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Turkish get-up' AND eq.name = 'Kettlebell';


-- ============================================================
-- MUSCLE ASSIGNMENTS
-- ============================================================

-- Curl barra
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de bíceps con barra' AND m.name IN ('Bíceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de bíceps con barra' AND m.name IN ('Braquial','Braquiorradial','Flexores del antebrazo');

-- Curl mancuernas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de bíceps con mancuernas (alternado)' AND m.name IN ('Bíceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de bíceps con mancuernas (alternado)' AND m.name IN ('Braquial','Braquiorradial');

-- Curl martillo
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl martillo (hammer curl)' AND m.name IN ('Braquial','Braquiorradial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl martillo (hammer curl)' AND m.name IN ('Bíceps braquial');

-- Curl polea
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl en polea baja' AND m.name IN ('Bíceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl en polea baja' AND m.name IN ('Braquial','Braquiorradial');

-- Curl concentrado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl concentrado' AND m.name IN ('Bíceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl concentrado' AND m.name IN ('Braquial');

-- Curl inclinado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl en banco inclinado (incline curl)' AND m.name IN ('Bíceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl en banco inclinado (incline curl)' AND m.name IN ('Braquial','Braquiorradial');

-- Pushdown
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Extensión de tríceps en polea (pushdown)' AND m.name IN ('Tríceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Extensión de tríceps en polea (pushdown)' AND m.name IN ('Extensores del antebrazo');

-- Pushdown unilateral
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Extensión de tríceps unilateral en polea' AND m.name IN ('Tríceps braquial');

-- Press francés
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press francés con barra EZ' AND m.name IN ('Tríceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press francés con barra EZ' AND m.name IN ('Extensores del antebrazo');

-- Fondos en banco
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Fondos en banco (triceps dips)' AND m.name IN ('Tríceps braquial');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Fondos en banco (triceps dips)' AND m.name IN ('Deltoides anterior','Pectoral mayor (porción esternal)');

-- Extensión overhead
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Extensión de tríceps sobre la cabeza (overhead)' AND m.name IN ('Tríceps braquial');

-- Kickback
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Kickback de tríceps con mancuerna' AND m.name IN ('Tríceps braquial');

-- Pájaro mancuernas
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pájaro (reverse fly) con mancuernas' AND m.name IN ('Deltoides posterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pájaro (reverse fly) con mancuernas' AND m.name IN ('Infraespinoso','Redondo menor','Trapecio inferior','Romboides');

-- Pájaro polea
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pájaro en polea (reverse cable fly)' AND m.name IN ('Deltoides posterior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pájaro en polea (reverse cable fly)' AND m.name IN ('Infraespinoso','Redondo menor','Trapecio inferior','Romboides');

-- Rotación externa
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rotación externa con banda (90°)' AND m.name IN ('Infraespinoso','Redondo menor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rotación externa con banda (90°)' AND m.name IN ('Deltoides posterior');

-- Extensión cuádriceps
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

-- Nordic curl
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Nordic curl (curl nórdico)' AND m.name IN ('Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Nordic curl (curl nórdico)' AND m.name IN ('Glúteo mayor','Pantorrilla (gastrocnemio)');

-- Abducción máquina
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Abducción de cadera en máquina' AND m.name IN ('Glúteo medio','Glúteo menor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Abducción de cadera en máquina' AND m.name IN ('Tensor de la fascia lata','Abductores');

-- Abducción banda
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Abducción de cadera con banda (de pie)' AND m.name IN ('Glúteo medio','Glúteo menor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Abducción de cadera con banda (de pie)' AND m.name IN ('Tensor de la fascia lata');

-- Calf raise
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevación de talones de pie (calf raise)' AND m.name IN ('Pantorrilla (gastrocnemio)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevación de talones de pie (calf raise)' AND m.name IN ('Sóleo');

-- Seated calf raise
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevación de talones sentado (seated calf raise)' AND m.name IN ('Sóleo');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevación de talones sentado (seated calf raise)' AND m.name IN ('Pantorrilla (gastrocnemio)');

-- Glute kickback
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Glute kickback en polea' AND m.name IN ('Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Glute kickback en polea' AND m.name IN ('Isquiotibiales','Glúteo medio');

-- Shrugs
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Encogimientos de hombros (shrugs) con mancuernas' AND m.name IN ('Trapecio superior');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Encogimientos de hombros (shrugs) con mancuernas' AND m.name IN ('Romboides','Flexores del antebrazo');

-- Chest-supported row
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo al pecho en máquina (chest-supported row)' AND m.name IN ('Dorsal ancho','Trapecio medio','Romboides');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo al pecho en máquina (chest-supported row)' AND m.name IN ('Bíceps braquial','Deltoides posterior','Trapecio inferior');

-- Jump squat
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Salto squat (jump squat)' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Salto squat (jump squat)' AND m.name IN ('Isquiotibiales','Pantorrilla (gastrocnemio)','Glúteo medio');

-- Box jump
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Box jump (salto a cajón)' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Box jump (salto a cajón)' AND m.name IN ('Isquiotibiales','Pantorrilla (gastrocnemio)','Erector espinal');

-- Burpee
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Burpee' AND m.name IN ('Cuádriceps','Glúteo mayor','Pectoral mayor (porción esternal)');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Burpee' AND m.name IN ('Tríceps braquial','Deltoides anterior','Isquiotibiales','Transverso abdominal','Pantorrilla (gastrocnemio)');

-- Walking lunge
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Caminata con zancada (walking lunge)' AND m.name IN ('Cuádriceps','Glúteo mayor');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Caminata con zancada (walking lunge)' AND m.name IN ('Isquiotibiales','Glúteo medio','Pantorrilla (gastrocnemio)');

-- Sprint
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sprint (carrera de alta intensidad)' AND m.name IN ('Isquiotibiales','Glúteo mayor','Psoas ilíaco');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sprint (carrera de alta intensidad)' AND m.name IN ('Cuádriceps','Pantorrilla (gastrocnemio)','Sóleo','Glúteo medio');

-- Comba
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Salto a la comba (jump rope)' AND m.name IN ('Pantorrilla (gastrocnemio)','Sóleo');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Salto a la comba (jump rope)' AND m.name IN ('Cuádriceps','Glúteo mayor','Flexores del antebrazo');

-- KB clean
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Kettlebell clean' AND m.name IN ('Glúteo mayor','Isquiotibiales');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Kettlebell clean' AND m.name IN ('Trapecio superior','Dorsal ancho','Cuádriceps','Erector espinal');

-- Turkish get-up
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Turkish get-up' AND m.name IN ('Glúteo mayor','Transverso abdominal');
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Turkish get-up' AND m.name IN ('Deltoides anterior','Cuádriceps','Oblicuo externo','Oblicuo interno','Psoas ilíaco','Infraespinoso');


-- ============================================================
-- CONTRAINDICATION ASSIGNMENTS
-- ============================================================

-- Curls de bíceps — muñeca y codo
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Curl de bíceps con barra' AND c.name = 'Dolor de muñeca agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La barra fija la posición de la muñeca — la barra EZ reduce el estrés vs la barra recta.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Curl de bíceps con barra' AND c.name = 'Tendinitis de muñeca';

INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Curl en banco inclinado (incline curl)' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición elongada del bíceps en el banco inclinado implica mayor tensión sobre el tendón de la cabeza larga, que cruza el hombro.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Curl en banco inclinado (incline curl)' AND c.name = 'Manguito rotador lesionado';

-- Press francés — codo
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición elongada del tríceps con carga genera alta tensión en el tendón del tríceps. Contraindicado en fase aguda.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press francés con barra EZ' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La extensión de muñeca bajo carga puede agravar el síndrome del túnel carpiano.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press francés con barra EZ' AND c.name = 'Síndrome del túnel carpiano';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Press francés con barra EZ' AND c.name = 'Dolor de muñeca agudo';

-- Extensión overhead — hombro
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La posición overhead requiere movilidad completa del hombro. Contraindicado en cualquier patología activa.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Extensión de tríceps sobre la cabeza (overhead)' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Extensión de tríceps sobre la cabeza (overhead)' AND c.name = 'Síndrome de impingement';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Extensión de tríceps sobre la cabeza (overhead)' AND c.name = 'Manguito rotador lesionado';

-- Pájaro mancuernas — hombro
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Pájaro (reverse fly) con mancuernas' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Cargas muy ligeras pueden ser toleradas en fase crónica para el manguito — evaluar individualmente.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Pájaro (reverse fly) con mancuernas' AND c.name = 'Manguito rotador lesionado';

-- Extensión cuádriceps — rodilla
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Alta tensión en el tendón patelar en los últimos grados de extensión. Contraindicación relativa en dolor anterior de rodilla — evaluar rango libre de dolor.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Extensión de cuádriceps en máquina' AND c.name = 'Dolor anterior de rodilla';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Extensión de cuádriceps en máquina' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Extensión de cuádriceps en máquina' AND c.name = 'Meniscopatía aguda';

-- Nordic curl — isquiotibiales / rodilla
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La demanda excéntrica extrema sobre los isquiotibiales está contraindicada sin progresión previa adecuada.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Nordic curl (curl nórdico)' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La compresión de rodilla en flexión completa puede agravar el menisco.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Nordic curl (curl nórdico)' AND c.name = 'Meniscopatía aguda';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'Sin adaptación excéntrica previa, el riesgo de desgarro de isquiotibiales es muy alto incluso en personas sanas.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Nordic curl (curl nórdico)' AND c.name = 'Artrosis de rodilla';

-- Salto squat y box jump — rodilla y tobillo
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Salto squat (jump squat)' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Salto squat (jump squat)' AND c.name = 'Meniscopatía aguda';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El impacto del aterrizaje es incompatible con articulaciones degeneradas.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Salto squat (jump squat)' AND c.name = 'Artrosis de rodilla';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Salto squat (jump squat)' AND c.name = 'Esguince de tobillo agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El aterrizaje unilateral o con inestabilidad puede luxar una prótesis de cadera.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Salto squat (jump squat)' AND c.name = 'Prótesis de cadera';

INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Box jump (salto a cajón)' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Box jump (salto a cajón)' AND c.name = 'Meniscopatía aguda';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Box jump (salto a cajón)' AND c.name = 'Esguince de tobillo agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Box jump (salto a cajón)' AND c.name = 'Prótesis de cadera';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Box jump (salto a cajón)' AND c.name = 'Osteoporosis severa';

-- Burpee
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Burpee' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Burpee' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Burpee' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Burpee' AND c.name = 'Hipertensión no controlada';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Burpee' AND c.name = 'Síndrome del túnel carpiano';

-- Sprint
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La demanda excéntrica de isquiotibiales en la fase de aceleración es la causa más común de rotura muscular en deportes de velocidad.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sprint (carrera de alta intensidad)' AND c.name = 'Rotura de ligamento (LCA/LCP)';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sprint (carrera de alta intensidad)' AND c.name = 'Esguince de tobillo agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sprint (carrera de alta intensidad)' AND c.name = 'Inestabilidad crónica de tobillo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Sprint (carrera de alta intensidad)' AND c.name = 'Prótesis de cadera';

-- KB clean
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Kettlebell clean' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Kettlebell clean' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'La transición al rack requiere movilidad completa de muñeca y ausencia de dolor.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Kettlebell clean' AND c.name = 'Dolor de muñeca agudo';

-- Turkish get-up
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Turkish get-up' AND c.name = 'Dolor de hombro agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Turkish get-up' AND c.name = 'Manguito rotador lesionado';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, NULL FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Turkish get-up' AND c.name = 'Dolor lumbar agudo';
INSERT INTO exercise_contraindications (exercise_id, contraindication_id, notes)
SELECT e.id, c.id, 'El mareo puede desestabilizar la posición overhead con riesgo de caída.'
FROM exercises e, contraindication_categories c
WHERE e.nombre = 'Turkish get-up' AND c.name = 'Mareo/vértigo';


-- ============================================================
-- EXERCISE RELATIONSHIPS
-- ============================================================

-- Curls de bíceps
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Permite supinación completa y mayor ROM. El agarre libre de la mancuerna es más natural para la articulación del codo.'
FROM exercises s, exercises t WHERE s.nombre = 'Curl de bíceps con barra' AND t.nombre = 'Curl de bíceps con mancuernas (alternado)';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Mayor énfasis en braquial y braquiorradial. Útil para complementar el curl estándar.'
FROM exercises s, exercises t WHERE s.nombre = 'Curl de bíceps con barra' AND t.nombre = 'Curl martillo (hammer curl)';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Tensión constante del cable superior en el rango inicial. Complementario al curl con mancuerna.'
FROM exercises s, exercises t WHERE s.nombre = 'Curl de bíceps con mancuernas (alternado)' AND t.nombre = 'Curl en polea baja';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Mayor tensión en el rango elongado. Según evidencia reciente, superior para hipertrofia de bíceps.'
FROM exercises s, exercises t WHERE s.nombre = 'Curl de bíceps con mancuernas (alternado)' AND t.nombre = 'Curl en banco inclinado (incline curl)';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Mayor aislamiento por la eliminación del balanceo. Útil al final del entrenamiento.'
FROM exercises s, exercises t WHERE s.nombre = 'Curl de bíceps con mancuernas (alternado)' AND t.nombre = 'Curl concentrado';

-- Tríceps
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'unilateral_version', 'Corrige desequilibrios entre brazos y permite mayor ROM.'
FROM exercises s, exercises t WHERE s.nombre = 'Extensión de tríceps en polea (pushdown)' AND t.nombre = 'Extensión de tríceps unilateral en polea';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Mayor activación de la cabeza larga del tríceps en rango elongado. Según evidencia reciente, superior para hipertrofia de la cabeza larga.'
FROM exercises s, exercises t WHERE s.nombre = 'Extensión de tríceps en polea (pushdown)' AND t.nombre = 'Extensión de tríceps sobre la cabeza (overhead)';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Mayor ROM y carga posible. Mayor demanda técnica y riesgo de codo.'
FROM exercises s, exercises t WHERE s.nombre = 'Extensión de tríceps en polea (pushdown)' AND t.nombre = 'Press francés con barra EZ';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'equipment_alternative', 'Sin equipo de cable. Misma función de extensión de codo con peso corporal.'
FROM exercises s, exercises t WHERE s.nombre = 'Extensión de tríceps en polea (pushdown)' AND t.nombre = 'Fondos en banco (triceps dips)';

-- Deltoides posterior
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'Tensión constante del cable superior a la mancuerna. La elección depende del equipamiento disponible.'
FROM exercises s, exercises t WHERE s.nombre = 'Pájaro (reverse fly) con mancuernas' AND t.nombre = 'Pájaro en polea (reverse cable fly)';

-- Isquiotibiales: máquinas y nordic
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'La posición sentada elongada la cadera: mayor trabajo proximal de isquiotibiales. Combinar ambas.'
FROM exercises s, exercises t WHERE s.nombre = 'Curl de isquiotibiales tumbado en máquina' AND t.nombre = 'Curl de isquiotibiales sentado en máquina';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Mayor demanda excéntrica. El ejercicio con mayor evidencia de prevención de lesiones de isquiotibiales.'
FROM exercises s, exercises t WHERE s.nombre = 'Curl de isquiotibiales tumbado en máquina' AND t.nombre = 'Nordic curl (curl nórdico)';

-- Pantorrilla
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'variant', 'La posición sentada aísla el sóleo. Combinar con la versión de pie para trabajo completo de pantorrilla.'
FROM exercises s, exercises t WHERE s.nombre = 'Elevación de talones de pie (calf raise)' AND t.nombre = 'Elevación de talones sentado (seated calf raise)';

-- Locomoción
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'Mayor demanda de coordinación, altura y confianza. Progresión natural del jump squat.'
FROM exercises s, exercises t WHERE s.nombre = 'Salto squat (jump squat)' AND t.nombre = 'Box jump (salto a cajón)';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'La sentadilla sin salto enseña la mecánica base. Debe dominarse antes de añadir el componente de potencia.'
FROM exercises s, exercises t WHERE s.nombre = 'Salto squat (jump squat)' AND t.nombre = 'Sentadilla con peso corporal';

-- KB clean → turkish get-up
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'El swing domina la bisagra que es la base del clean. Dominar swing → clean → turkish get-up.'
FROM exercises s, exercises t WHERE s.nombre = 'Kettlebell clean' AND t.nombre = 'Swing con kettlebell';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'harder', 'El TGU integra el clean con estabilización overhead y movilidad total. El ejercicio más complejo del sistema.'
FROM exercises s, exercises t WHERE s.nombre = 'Kettlebell clean' AND t.nombre = 'Turkish get-up';

-- Burpee como combinación
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'El push-up es el componente de empuje del burpee. Dominar antes de integrar.'
FROM exercises s, exercises t WHERE s.nombre = 'Burpee' AND t.nombre = 'Flexión de brazos (push-up) estándar';
INSERT INTO exercise_relationships (source_exercise_id, target_exercise_id, relationship_type, notes)
SELECT s.id, t.id, 'easier', 'El salto squat es el componente de potencia del burpee. Dominar antes de integrar.'
FROM exercises s, exercises t WHERE s.nombre = 'Burpee' AND t.nombre = 'Salto squat (jump squat)';

-- ============================================================
-- SYNC: Populate denormalized JSONFields from normalized tables
-- Run after all satellite INSERTs are complete.
-- ============================================================

-- Sync equipamiento (required equipment names)
UPDATE exercises e
SET equipamiento = COALESCE((
    SELECT jsonb_agg(ei.name ORDER BY ei.name)
    FROM exercise_equipment ee
    JOIN equipment_items ei ON ee.equipment_id = ei.id
    WHERE ee.exercise_id = e.id AND ee.is_required = TRUE
), '[]'::jsonb)
WHERE EXISTS (SELECT 1 FROM exercise_equipment WHERE exercise_id = e.id);

-- Sync contraindicaciones (body zones mapped to Django zone strings)
UPDATE exercises e
SET contraindicaciones = COALESCE((
    SELECT jsonb_agg(DISTINCT
        CASE cc.body_zone
            WHEN 'Columna'  THEN 'lumbar'
            WHEN 'Rodilla'  THEN 'rodilla'
            WHEN 'Hombro'   THEN 'hombro'
            WHEN 'Muñeca'   THEN 'muñeca'
            WHEN 'Cadera'   THEN 'cadera'
            WHEN 'Tobillo'  THEN 'tobillo'
            ELSE lower(cc.body_zone)
        END
    )
    FROM exercise_contraindications ec
    JOIN contraindication_categories cc ON ec.contraindication_id = cc.id
    WHERE ec.exercise_id = e.id
), '[]'::jsonb)
WHERE EXISTS (SELECT 1 FROM exercise_contraindications WHERE exercise_id = e.id);

-- Sync musculos_primarios
UPDATE exercises e
SET musculos_primarios = COALESCE((
    SELECT jsonb_agg(mg.name ORDER BY mg.name)
    FROM exercise_muscles em
    JOIN muscle_groups mg ON em.muscle_id = mg.id
    WHERE em.exercise_id = e.id AND em.role = 'primario'
), '[]'::jsonb)
WHERE EXISTS (SELECT 1 FROM exercise_muscles WHERE exercise_id = e.id AND role = 'primario');

-- Sync musculos_secundarios
UPDATE exercises e
SET musculos_secundarios = COALESCE((
    SELECT jsonb_agg(mg.name ORDER BY mg.name)
    FROM exercise_muscles em
    JOIN muscle_groups mg ON em.muscle_id = mg.id
    WHERE em.exercise_id = e.id AND em.role = 'secundario'
), '[]'::jsonb)
WHERE EXISTS (SELECT 1 FROM exercise_muscles WHERE exercise_id = e.id AND role = 'secundario');
