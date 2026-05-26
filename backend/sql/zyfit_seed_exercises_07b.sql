-- ============================================================
-- ZYFIT — Exercise Seed Data: Batch 07B
-- Categorías: Bíceps / Tríceps · Core / Abdomen · Cardio / HIIT · Movilidad
-- Total: 30 ejercicios
-- ============================================================

INSERT INTO exercises (
  nombre, patron_movimiento, bilateral, es_compuesto, dificultad,
  musculos_primarios, musculos_secundarios, equipamiento, contraindicaciones,
  activo, gif_url, imagen_url,
  technical_level, error_risk, space_required, systemic_fatigue,
  set_duration_seconds, rest_seconds_default, description, coaching_cues
) VALUES

-- ============================================================
-- BÍCEPS / TRÍCEPS (9)
-- ============================================================

-- 1
('Press francés con barra EZ (skull crusher)',
 'aislamiento', TRUE, FALSE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'minimo', 2,
 35, 90,
 'Extensión de codo desde posición supina con barra EZ descendiendo hacia la frente o el área occipital. El ejercicio de tríceps con mayor rango de movimiento y mayor activación de la cabeza larga (la más grande del tríceps). La barra EZ reduce el estrés sobre las muñecas respecto a la barra recta. Alta eficacia para hipertrofia de tríceps pero con mayor riesgo de codo si el excéntrico no es controlado.',
 '["Los codos apuntan al techo y permanecen fijos durante todo el recorrido — no se abren", "La barra baja hacia la frente o ligeramente detrás — no al pecho", "La barra EZ reduce el estrés en muñeca: preferirla siempre sobre la barra recta", "Excéntrico extremadamente controlado — el tendón del tríceps está bajo máxima tensión en elongación", "No usar cargas excesivas: la articulación del codo es muy vulnerable en este ejercicio"]'::jsonb),

-- 2
('Curl en banco inclinado (incline curl)',
 'aislamiento', FALSE, FALSE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'minimo', 2,
 30, 75,
 'Curl de bíceps con mancuernas en banco inclinado a 45–60°. La inclinación estira el bíceps en la posición inicial más allá de lo posible en bipedestación, generando mayor tensión en el rango elongado. Superior para hipertrofia de bíceps según la evidencia reciente sobre entrenamiento en rango elongado. Usar cargas menores que en el curl estándar.',
 '["Banco a 45–60° de inclinación", "Los brazos cuelgan perpendiculares al suelo en el inicio — máxima elongación del bíceps", "No acelerar el excéntrico — la posición de estiramiento es donde ocurre el mayor estímulo", "Usar cargas entre 20–30% menores que en el curl estándar por la desventaja mecánica", "Supinación completa de la muñeca en el punto de máxima contracción"]'::jsonb),

-- 3
('Curl de bíceps agarre prono (reverse curl)',
 'aislamiento', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 25, 60,
 'Curl con agarre prono (palmas hacia abajo). El agarre cambia radicalmente el énfasis: el braquiorradial es el motor principal, con menor participación del bíceps braquial. Los extensores del antebrazo trabajan activamente para mantener la muñeca en posición neutra. Complemento esencial para el desarrollo equilibrado del brazo y la salud del codo.',
 '["Las muñecas permanecen en posición neutra durante todo el movimiento — no dejar caer", "Los codos fijos a los costados — misma mecánica que el curl estándar", "Usar cargas menores que en el curl supino: el braquiorradial es más débil que el bíceps", "La barra EZ reduce significativamente el estrés en la muñeca vs la barra recta", "El movimiento es idéntico al curl normal — solo el agarre cambia"]'::jsonb),

-- 4
('Curl en polea baja',
 'aislamiento', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 2,
 30, 75,
 'Curl de bíceps con cable desde polea baja. La tensión constante del cable en todo el rango de movimiento es superior a la mancuerna, donde la tensión es mínima al inicio del recorrido. Esta propiedad hace al curl en polea complementario y no sustituto del curl con mancuerna.',
 '["La resistencia del cable es constante en todo el ROM — diferente a la mancuerna", "Codos fijos a los costados durante todo el movimiento", "Puede realizarse bilateral o unilateral según el accesorio disponible", "La tensión inicial del cable (posición de máximo estiramiento) es el punto diferencial clave", "Combinar con el curl en banco inclinado para máxima cobertura del rango de movimiento del bíceps"]'::jsonb),

-- 5
('Extensión de tríceps unilateral en polea',
 'aislamiento', FALSE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 2,
 30, 75,
 'Extensión de codo unilateral con cable desde polea alta. Permite mayor rango de movimiento que la versión bilateral y corrige desequilibrios entre brazos. El brazo libre puede apoyarse en el cuerpo para mayor estabilidad. La rotación natural del antebrazo al final del recorrido aumenta la activación de la cabeza lateral del tríceps.',
 '["El codo permanece fijo al costado durante todo el movimiento", "La extensión completa en el punto más bajo es la contracción máxima — no acortarla", "El torso puede inclinarse ligeramente hacia adelante para mayor rango", "Comparar la carga entre ambos brazos para detectar desequilibrios", "La mano libre apoya en la máquina o en la cadera para mayor estabilidad"]'::jsonb),

-- 6
('Curl Zottman',
 'aislamiento', FALSE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 1, 'minimo', 1,
 30, 75,
 'Curl que comienza con agarre supino (palmas arriba) en el ascenso y rota a agarre prono (palmas abajo) en el descenso. El ascenso trabaja el bíceps; el descenso trabaja el braquiorradial en la fase excéntrica. Un solo ejercicio que entrena ambos flexores del codo en sus posiciones óptimas respectivas. Eficiencia máxima para el trabajo de brazo.',
 '["Subir con agarre supino: el bíceps trabaja en su mejor posición", "En el punto más alto rotar la muñeca a agarre prono antes de descender", "Bajar lentamente con agarre prono: el braquiorradial trabaja el excéntrico", "Al inicio volver a supinar para la siguiente repetición", "El movimiento de rotación debe ser fluido, no brusco — proteger las muñecas"]'::jsonb),

-- 7
('Curl predicador (preacher curl)',
 'aislamiento', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'minimo', 1,
 30, 75,
 'Curl de bíceps con los brazos apoyados en el banco predicador o Scott. El apoyo elimina el balanceo y el impulso del torso, aislando el bíceps especialmente en su porción corta. La posición de los brazos en el banco predispone a mayor tensión en el punto de estiramiento. El banco predicador es uno de los pocos apoyos que mantiene los codos delante del torso durante el ejercicio.',
 '["Los brazos apoyados firmemente sobre el banco durante todo el movimiento", "No hiperextender el codo en el punto más bajo — mantener ligera flexión", "La porción corta del bíceps es el músculo objetivo en esta posición", "No usar impulso del cuerpo — el banco lo impide pero el intento de hacerlo crea tensión en el codo", "Combinar con el curl en banco inclinado para cubrir porción larga y corta del bíceps"]'::jsonb),

-- 8
('Curl de muñeca (wrist curl)',
 'aislamiento', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 25, 45,
 'Flexión de muñeca con barra o mancuernas con los antebrazos apoyados en un banco. Aislamiento de los flexores del antebrazo. Útil para fuerza de agarre, prevención de epicondilitis medial y desarrollo completo del antebrazo. Generalmente subestimado a pesar de su impacto en el rendimiento de todos los ejercicios que requieren agarre.',
 '["Los antebrazos completamente apoyados en el banco — solo la mano cuelga", "ROM completo: desde extensión máxima hasta flexión máxima de la muñeca", "Usar cargas ligeras — los flexores del antebrazo se fatigan rápidamente", "La versión con agarre prono (extensión de muñeca) trabaja los extensores del antebrazo", "Series de 15–20 repeticiones con cargas moderadas son más efectivas que cargas máximas"]'::jsonb),

-- 9
('Farmer carry con mancuernas',
 'locomocion', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'amplio', 3,
 40, 90,
 'Caminata con carga pesada en ambas manos. La demanda simultánea de agarre, trapecio superior, core y estabilización de toda la columna lo convierte en uno de los ejercicios más eficientes del catálogo. Simple pero extremadamente efectivo para fuerza funcional. Desarrolla la capacidad de mantener postura bajo carga sostenida — habilidad que todos los demás ejercicios requieren pero pocos entrenan directamente.',
 '["Cargar pesos iguales en ambas manos para comenzar", "Hombros hacia atrás y abajo — no permitir que la carga redondee los hombros", "Pasos cortos y controlados — la zancada larga reduce la estabilidad", "Respiración continua y controlada durante todo el recorrido", "La columna no debe inclinarse lateralmente — si ocurre, la carga es excesiva"]'::jsonb),

-- ============================================================
-- CORE / ABDOMEN (13)
-- ============================================================

-- 10
('Rueda abdominal (ab wheel rollout)',
 'core_antiextension', TRUE, FALSE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 4, 'minimo', 2,
 35, 90,
 'Extensión desde posición de rodillas con rueda abdominal. El ejercicio de antiextensión con mayor rango de movimiento del catálogo. La columna lumbar debe mantenerse en posición neutra durante todo el recorrido — la pérdida de posición es el mecanismo de lesión. Requiere semanas de adaptación progresiva. Comenzar siempre desde rodillas.',
 '["Comenzar desde rodillas hasta dominar completamente el patrón", "Activar el transverso abdominal antes de iniciar cada repetición", "La pelvis no debe inclinarse anteriormente en ningún punto del recorrido", "Aumentar el rango de centímetros en centímetros — no en saltos grandes", "La versión de pie solo para atletas con control lumbar absolutamente impecable"]'::jsonb),

-- 11
('Pallof press en polea',
 'core_antirrotacion', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 1, 'minimo', 1,
 35, 75,
 'Press horizontal con cable desde posición perpendicular a la polea. El cuerpo resiste la rotación que genera la tensión lateral del cable. El ejercicio de antirrotación más efectivo y seguro del catálogo. La demanda aumenta simplemente alejándose más de la polea sin cambiar el peso. Excelente para todos los niveles y transferencia directa a todos los deportes.',
 '["De pie o arrodillado perpendicular a la polea — ambas posiciones son válidas", "El cable sale del pecho y vuelve al pecho en línea completamente recta", "La pelvis y los hombros deben mantenerse perfectamente cuadrados durante todo el movimiento", "Cuanto más lejos de la polea, mayor la demanda de antirrotación", "Versión isométrica: sostener la posición extendida 2–3 segundos por repetición"]'::jsonb),

-- 12
('Dragon flag',
 'core_antiextension', TRUE, FALSE, 'avanzado',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 5, 4, 'minimo', 3,
 35, 120,
 'Extensión excéntrica del cuerpo completo desde posición supina en banco, manteniendo el cuerpo rígido como una sola palanca. Solo el torso superior está en contacto con el banco. Popularizado por Bruce Lee. El ejercicio de antiextensión más avanzado del catálogo. Requiere dominio previo de hollow body, L-sit y plancha avanzada antes de intentarlo.',
 '["Solo el torso superior toca el banco — todo lo demás permanece en el aire", "El cuerpo baja como una sola unidad rígida: no doblar en la cadera bajo ninguna circunstancia", "La fase excéntrica (bajar) es el foco antes de dominar la concéntrica (subir)", "Regresión: tuck dragon flag con rodillas flexionadas", "No intentar sin dominar completamente hollow body y plancha avanzada"]'::jsonb),

-- 13
('L-sit en paralelas',
 'core_antiextension', TRUE, FALSE, 'avanzado',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 4, 3, 'minimo', 3,
 30, 90,
 'Posición isométrica con caderas a 90° y piernas extendidas apoyado en paralelas. Alta demanda simultánea de psoas, recto abdominal y cuádriceps mientras los tríceps y serrato anterior sostienen el cuerpo. Un hito de calistenia que requiere semanas de trabajo preparatorio. La progresión es de tuck L-sit (rodillas flexionadas) hacia piernas completamente extendidas.',
 '["Comenzar con tuck L-sit (rodillas al pecho) antes de intentar piernas extendidas", "Empujar activamente hacia abajo con las manos — no solo colgar", "Las escápulas deprimidas: hombros lejos de las orejas durante toda la posición", "Las piernas extendidas al frente, paralelas al suelo en la posición completa", "Progresar: suelo → paralelas → anillas — cada soporte aumenta la demanda de estabilización"]'::jsonb),

-- 14
('Plancha de Copenhague',
 'core_antirrotacion', FALSE, FALSE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 2, 'minimo', 2,
 35, 90,
 'Plancha lateral con el pie o tobillo superior apoyado en un banco y la pierna inferior libre en el aire. Activa los aductores de la cadera superior y los estabilizadores laterales del tronco simultáneamente. Uno de los pocos ejercicios que entrena la aducción de cadera en carga. Alta evidencia en prevención de lesiones de aductores en deportes de cancha.',
 '["El pie o tobillo superior sobre el banco — posición distal (tobillo) aumenta la demanda", "La pierna inferior puede estar libre en el aire o levemente apoyada como regresión", "El cuerpo forma una línea recta: las caderas no deben hundirse", "El hombro de apoyo activo: empujar hacia el suelo, no hundirse", "Comenzar con series cortas de 10–15 segundos: la demanda de aductores sorprende"]'::jsonb),

-- 15
('Suitcase carry (carga unilateral caminando)',
 'core_antirrotacion', FALSE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'amplio', 3,
 40, 90,
 'Caminata con carga en una sola mano. La carga unilateral genera una demanda de antiflexión lateral y antirrotación que el farmer carry bilateral no puede replicar. El torso debe mantenerse perfectamente vertical sin inclinarse hacia el lado cargado. Funcional y transferible a actividades cotidianas.',
 '["La columna no debe inclinarse hacia ningún lado — este es el único criterio técnico", "No elevar el hombro del lado cargado como compensación", "Mirada al frente, pasos controlados y de ritmo constante", "Si el torso se inclina, la carga es excesiva para el nivel actual", "Rotar entre el lado derecho e izquierdo en sets alternos"]'::jsonb),

-- 16
('V-up (tijera abdominal)',
 'core_antiextension', TRUE, FALSE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'minimo', 2,
 30, 75,
 'Elevación simultánea de piernas y torso desde posición supina hasta tocar los pies con las manos. Combina la demanda del crunch con la de la elevación de piernas en un movimiento dinámico. Alta activación del recto abdominal y del psoas en sus rangos de mayor tensión. El control del descenso determina la efectividad — no el ascenso.',
 '["El ascenso es simultáneo de piernas y torso — no secuencial", "Las piernas y los brazos se extienden completamente en el punto más bajo", "El control del excéntrico (descenso) es donde ocurre el mayor trabajo", "Si no se puede llegar a los pies, el objetivo es el punto más alto posible con técnica correcta", "La zona lumbar no debe golpear el suelo entre repeticiones — descenso siempre controlado"]'::jsonb),

-- 17
('Bicycle crunch',
 'core_antirrotacion', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 2, 'minimo', 1,
 30, 60,
 'Crunch con rotación alternando codo hacia la rodilla contraria. Activa los oblicuos de forma dinámica con una componente de rotación de columna que el crunch estándar no proporciona. La cadencia lenta y controlada maximiza el estímulo; la cadencia rápida convierte el ejercicio en coordinación más que en trabajo abdominal.',
 '["La rotación viene del torso, no de los codos jalando la cabeza", "La pierna extendida permanece suspendida — no baja al suelo entre repeticiones", "Cadencia lenta: 2 segundos en cada lado para máximo estímulo de oblicuos", "No jalar del cuello con las manos — las yemas apenas contactan la cabeza", "Exhalar en la rotación para facilitar la contracción de los oblicuos"]'::jsonb),

-- 18
('Toes to bar (pies a la barra)',
 'core_antiextension', TRUE, FALSE, 'avanzado',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 4, 2, 'minimo', 3,
 30, 90,
 'Elevación de pies hasta la barra desde colgado. La versión más avanzada de la elevación de piernas colgado. Requiere fuerza de agarre, estabilización de hombro y flexión de cadera extrema con control de columna. La demanda de coordinación y control es alta — el balanceo es el error más común y elimina la efectividad del ejercicio.',
 '["Partir de una posición de colgado completamente estático — sin balanceo previo", "La elevación comienza activando el core y los dorsales, no por impulso", "Los pies llegan a la barra con control — no como un kick", "El descenso es controlado: no caer de vuelta al colgado", "Regresión: rodillas al pecho (knees to elbows) antes de piernas extendidas"]'::jsonb),

-- 19
('Hollow body rock',
 'core_antiextension', TRUE, FALSE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 2, 'minimo', 2,
 35, 75,
 'Posición hollow body con movimiento de balanceo continuo hacia adelante y atrás. La tensión abdominal debe mantenerse constante durante todo el movimiento — si se pierde, el ejercicio pierde su propósito. Base del trabajo de anillas y gimnasia. La progresión directa del hollow body estático hacia el trabajo dinámico.',
 '["Establecer la posición hollow perfecta antes de comenzar el balanceo", "La columna lumbar no debe despegarse del suelo en ningún punto del ciclo", "El balanceo es suave y continuo — no un rebote brusco que genere impulso", "Las manos y pies se mantienen en la misma posición durante todo el balanceo", "Si la posición se pierde durante el movimiento: detener, reestablecer y continuar"]'::jsonb),

-- 20
('Chop y lift en polea',
 'core_antirrotacion', TRUE, FALSE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 2, 'medio', 2,
 35, 90,
 'Movimiento diagonal con cable desde polea alta (chop) o baja (lift) en posición de pie o arrodillado. El torso controla y genera la rotación de forma activa. A diferencia de los ejercicios de antirrotación, aquí el torso rota — la demanda es de rotación controlada, no de resistir la rotación. Alta transferencia funcional y deportiva.',
 '["La fuerza viene de la rotación controlada de caderas y torso — los brazos guían", "Los pies permanecen firmes durante todo el movimiento", "Chop: de polea alta hacia abajo y al lado opuesto. Lift: de polea baja hacia arriba y al lado opuesto", "El movimiento no debe ser brusco — la desaceleración controlada es la demanda principal", "Variante arrodillado: mayor demanda de core al eliminar la base de los pies"]'::jsonb),

-- 21
('Elevaciones de piernas acostado',
 'core_antiextension', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 2, 'minimo', 1,
 30, 60,
 'Elevación bilateral de piernas extendidas desde posición supina. La zona lumbar debe permanecer en contacto con el suelo durante todo el recorrido — cuando se despega, el ejercicio se convierte en extensión lumbar. Versión más accesible que la elevación de piernas colgado al eliminar la demanda de agarre y estabilización de hombro.',
 '["La zona lumbar SIEMPRE pegada al suelo — el único criterio de ejecución correcta", "Si la lumbar se despega: aumentar el ángulo de inicio de las piernas (más altas, menos recorrido)", "Las piernas bajan de forma controlada — no dejar caer ni rebotar en el punto más bajo", "Exhalar en el descenso de piernas para facilitar el bracing abdominal", "Progresión: rodillas flexionadas → piernas extendidas desde ángulo alto → recorrido completo"]'::jsonb),

-- 22
('GHD sit-up',
 'core_antiextension', TRUE, FALSE, 'avanzado',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 4, 4, 'minimo', 3,
 35, 120,
 'Crunch completo en banco GHD (Glute Ham Developer) con extensión de cadera en el punto más bajo. El mayor rango de movimiento posible en un ejercicio abdominal — desde extensión completa de cadera hasta flexión completa de columna. Alta demanda de psoas y recto abdominal en sus rangos extremos. El potencial de agujetas severas en personas no adaptadas es muy alto.',
 '["Solo con banco GHD disponible y ajustado correctamente al cuerpo del usuario", "Comenzar con rango parcial: no llegar a la extensión completa en las primeras semanas", "El descenso es controlado — caer libremente puede causar distensión de psoas o espalda", "Las agujetas de psoas tras la primera sesión pueden ser incapacitantes — advertir al usuario", "No intentar sin supervisión de alguien que conozca el equipo y la técnica"]'::jsonb),

-- ============================================================
-- CARDIO / HIIT (9)
-- ============================================================

-- 23
('Salto a la comba (jump rope)',
 'locomocion', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 2, 'medio', 4,
 60, 60,
 'Salto continuo con cuerda de saltar. Desarrolla coordinación, ritmo, resistencia cardiovascular y fuerza de pantorrilla simultáneamente. Uno de los ejercicios cardiovasculares más eficientes en relación espacio/equipamiento/impacto. La variante de doble salto (double under) aumenta exponencialmente la demanda. Compatible con todos los niveles ajustando la velocidad.',
 '["Saltos pequeños — la cuerda no requiere saltar alto: solo pasar la cuerda debajo de los pies", "Aterrizar en la punta del pie — nunca con el talón plano, especialmente a velocidad", "Los codos pegados al cuerpo, la muñeca genera el giro de la cuerda — no los brazos", "Comenzar con sets cortos de 30–60 segundos y descansos amplios", "El doblete (double under) requiere mayor altura de salto y velocidad de giro — practicar separado"]'::jsonb),

-- 24
('Sprint en pista o treadmill',
 'locomocion', TRUE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 3, 3, 'amplio', 5,
 20, 180,
 'Carrera a máxima o submáxima velocidad en distancias cortas (20–100m). El ejercicio de mayor fatiga sistémica y demanda de cadena posterior del catálogo. La fase de aceleración es la de mayor riesgo de lesión de isquiotibiales. Requiere calentamiento específico obligatorio. Alta transferencia atlética y metabólica.',
 '["Calentamiento de 10–15 minutos con movilidad y aceleración progresiva antes de sprints máximos", "Los primeros sprints al 75–80% de velocidad máxima — nunca máximo desde el inicio", "La aceleración es la fase de mayor riesgo de isquiotibiales: ser conservador", "Suspender inmediatamente si aparece dolor posterior en el muslo", "Los sprints de distancias cortas (20–40m) son más seguros para iniciarse que los de 100m"]'::jsonb),

-- 25
('Clean con kettlebell',
 'cargada', FALSE, TRUE, 'intermedio',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 4, 4, 'medio', 4,
 30, 120,
 'Movimiento de halterofilia adaptado con kettlebell: el KB sube del colgado hasta la posición de rack en un solo movimiento balístico. Combina bisagra explosiva de cadera, jalón vertical y recepción en posición de rack. Alta demanda técnica, sistémica y de coordinación. El swing con KB debe estar dominado antes de intentar el clean.',
 '["La potencia viene de la extensión explosiva de cadera — igual que el swing", "El KB rueda sobre la mano en el punto de transición al rack — no jala con el brazo", "La muñeca debe estar en posición neutra en el rack — no doblarse hacia atrás", "El codo toca la cadera en el rack — el KB no debe colgar adelante", "Dominar el swing antes de intentar el clean: el inicio del movimiento es idéntico"]'::jsonb),

-- 26
('Battle ropes (cuerdas de batalla)',
 'locomocion', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 1, 'medio', 4,
 30, 60,
 'Ondulaciones alternadas o simultáneas de cuerdas pesadas ancladas a un punto fijo. Alta demanda de potencia de tren superior y resistencia cardiovascular con bajo impacto articular en miembros inferiores. Múltiples variantes — alternadas, simultáneas, en círculos, en oleadas — permiten variar el estímulo sin cambiar el equipamiento.',
 '["La posición base: rodillas ligeramente flexionadas, cadera hacia atrás, torso inclinado", "El movimiento viene de los hombros y los brazos — no de la muñeca ni del codo", "Ondas alternadas: alta coordinación y mayor tiempo bajo tensión por brazo", "Ondas simultáneas: mayor potencia bilateral pero menor coordinación requerida", "Cuanto más cerca del punto de anclaje, mayor la resistencia de las cuerdas"]'::jsonb),

-- 27
('Sled push (empuje de trineo)',
 'locomocion', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 1, 'amplio', 4,
 30, 120,
 'Empuje de trineo cargado en posición de sprint. El ejercicio de potencia de piernas sin componente excéntrico — no genera DOMS. Esto lo hace único: permite trabajar alto volumen de piernas el día siguiente a una sesión de sentadillas sin comprometer la recuperación. Alta demanda de glúteos, cuádriceps y pantorrilla en cadena cinética cerrada.',
 '["Inclinación del torso hacia adelante: cuanto más horizontal, más demanda de cadena posterior", "Los brazos empujan con codos extendidos — los hombros no son la articulación motor", "Pasos cortos y rápidos — no zancadas largas que reduzcan la velocidad", "La carga determina el objetivo: ligero = velocidad/potencia, pesado = fuerza", "Es el complemento perfecto al día después de sentadillas: mismos músculos, sin DOMS adicional"]'::jsonb),

-- 28
('Bear crawl',
 'locomocion', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 1, 'amplio', 3,
 30, 75,
 'Desplazamiento cuadrúpedo con rodillas ligeramente elevadas del suelo. Activa el core en antiextensión y antirrotación simultáneamente mientras las extremidades se mueven en patrón contralateral. Ejercicio funcional de cuerpo completo sin equipamiento. La estabilidad de la columna bajo movimiento de las cuatro extremidades es la demanda principal.',
 '["Las rodillas a 5–10cm del suelo durante todo el movimiento — nunca apoyan", "El movimiento es contralateral: brazo derecho avanza con pierna izquierda y viceversa", "La columna lumbar permanece neutra — no arquear ni redondear", "Las caderas no deben oscilar lateralmente — mantenerse estables", "Variante hacia atrás (bear crawl inverso) aumenta la demanda de isquiotibiales"]'::jsonb),

-- 29
('Inchworm',
 'locomocion', TRUE, TRUE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 1, 'amplio', 2,
 30, 60,
 'Flexión de tronco desde bipedestación, caminata de manos hacia posición de plancha, y retorno caminando con los pies hasta los manos. Combina movilidad de isquiotibiales, fuerza de core en antiextensión y activación de hombros en un solo movimiento fluido. Ideal como ejercicio de calentamiento dinámico o como componente de un circuito metabólico.',
 '["En la flexión inicial los pies permanecen fijos — el estiramiento de isquiotibiales es parte del ejercicio", "Las manos caminan hasta la posición de plancha perfecta antes de retornar", "En la posición de plancha: cuerpo completamente rígido, sin hundir caderas", "Los pies caminan hacia las manos con rodillas extendidas para mantener el estiramiento de isquiotibiales", "El ritmo es lento y deliberado: este no es un ejercicio de velocidad"]'::jsonb),

-- ============================================================
-- MOVILIDAD / CALENTAMIENTO (9)
-- ============================================================

-- 30
('Squat to stand',
 'movilidad', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 25, 30,
 'Desde bipedestación, doblar el torso y agarrar los dedos del pie, bajar en cuclillas manteniendo el agarre, y volver a extensión. Moviliza tobillo, cadera y columna torácica en un movimiento integrado. El diagnóstico más rápido de limitaciones de movilidad para la sentadilla. Ejercicio de calentamiento previo a cualquier patrón de sentadilla o bisagra.',
 '["Agarrar los dedos del pie con las manos antes de descender", "Descender manteniendo el agarre y los talones en el suelo", "En cuclillas: los codos empujan las rodillas hacia afuera para abrir la cadera", "Subir extendiendo caderas primero, luego columna, hasta bipedestación completa", "Si los talones se elevan al bajar: trabajar primero la movilidad de tobillo por separado"]'::jsonb),

-- 31
('Leg swing (balanceo de pierna)',
 'movilidad', FALSE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 20, 20,
 'Balanceo dinámico de la pierna hacia adelante-atrás (plano sagital) y hacia los lados (plano frontal) con apoyo en una mano. Movilización dinámica de la articulación de cadera en sus dos planos principales de movimiento. El ejercicio de activación de cadera más simple y efectivo previo a cualquier patrón de pierna.',
 '["Una mano apoyada en la pared o en algo estable para mantener el equilibrio", "El balanceo es relajado — no forzado: la pierna oscila por su peso e inercia", "Aumentar gradualmente el rango en cada repetición a medida que el tejido se calienta", "Sagital (adelante-atrás): 10–15 balanceos por pierna. Frontal (lado a lado): 10–15 balanceos", "El torso permanece erecto — no compensar inclinándose hacia el lado del balanceo"]'::jsonb),

-- 32
('Couch stretch (estiramiento de psoas en pared)',
 'movilidad', FALSE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 60, 30,
 'El estiramiento de psoas más efectivo del catálogo. Rodilla trasera apoyada en la pared o suelo con la espinilla vertical, pie delantero en el suelo con rodilla a 90°. La posición de extensión de cadera con rodilla flexionada pone el psoas en su mayor elongación posible. Indispensable para usuarios sedentarios con cadera anterior acortada.',
 '["La espinilla trasera debe estar vertical contra la pared o el suelo", "Mantener la pelvis en posición neutra — no arquear la espalda para sentir más", "El torso erecto aumenta el estiramiento del psoas — inclinarse hacia adelante lo reduce", "Sostener la posición 2–3 minutos por lado para cambio real de longitud muscular", "Sensación correcta: tensión en el frente del muslo/cadera del lado trasero — no en la rodilla"]'::jsonb),

-- 33
('Hip 90-90 con transición activa',
 'movilidad', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 2, 1, 'minimo', 1,
 30, 30,
 'Posición sentada con ambas caderas a 90° (una en rotación interna, otra en externa) con transición activa entre lados. Trabaja la rotación interna de cadera — la movilidad más perdida en usuarios sedentarios y la que más limita la profundidad de la sentadilla. El diagnóstico más claro de asimetría de rotación de cadera.',
 '["Sentado con ambas piernas dobladas a 90° — una pierna al frente, otra al lado", "La transición activa: rotar ambas caderas simultáneamente hacia el otro lado sin usar las manos", "Si no puede rotar sin las manos: usar las manos para asistir al inicio", "El objetivo es que la transición sea activa y fluida, no pasiva y forzada", "Sostener cada posición 3–5 segundos antes de transitar al otro lado"]'::jsonb),

-- 34
('Extensión torácica sobre foam roller',
 'movilidad', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 45, 30,
 'Extensión pasiva de columna torácica con foam roller perpendicular a la columna, colocado entre las escápulas. Contrapeso directo a la postura cifótica de escritorio. Aumenta la extensión torácica que limita el press militar, las dominadas y la sentadilla frontal. Cinco minutos de trabajo produce cambios inmediatos en la movilidad torácica.',
 '["El foam roller perpendicular a la columna, ubicado en la zona torácica (entre escápulas)", "Los brazos cruzados sobre el pecho o manos detrás de la cabeza", "Dejarse caer lentamente sobre el roller y mantener la posición 30–60 segundos por segmento", "Mover el roller un segmento más arriba o abajo entre series", "Nunca en la zona lumbar: el foam roller en lumbar puede comprimir los discos"]'::jsonb),

-- 35
('Movilización de tobillo con banda',
 'movilidad', FALSE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 30, 20,
 'Dorsiflexión activa de tobillo asistida por tracción de banda anclada al talón. La banda genera una tracción posterior del astrágalo que abre el espacio articular y permite mayor dorsiflexión. La limitación de dorsiflexión de tobillo es la causa número uno de talones que se elevan en la sentadilla y de la incapacidad para alcanzar profundidad.',
 '["La banda anclada a un punto fijo al frente, pasada sobre el empeine o tobillo", "Pararse con el pie en la banda y avanzar la rodilla sobre el pie manteniendo el talón en el suelo", "Movimiento activo: ir y volver. No solo mantener la posición", "El pie apuntando recto hacia adelante — no hacia afuera para compensar", "10–15 repeticiones lentas por lado, priorizando el rango máximo en cada una"]'::jsonb),

-- 36
('Hip flexor march (marcha de flexores)',
 'movilidad', FALSE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 25, 20,
 'Elevación alternada de rodillas hacia el pecho desde bipedestación, con apoyo en pared y pelvis en posición neutra. Activación dinámica del psoas en cadena cinética cerrada. A diferencia del estiramiento estático de psoas, este ejercicio lo activa y fortalece. Calentamiento específico antes de sentadillas, zancadas y cualquier ejercicio con alta demanda de flexión de cadera.',
 '["Una mano apoyada en la pared para equilibrio — el objetivo es la técnica, no el balance", "La pelvis permanece completamente neutra: no inclinarse hacia adelante ni hacia atrás", "La rodilla sube hasta la altura de la cadera o más: máxima flexión de cadera posible", "El pie de apoyo permanece plano en el suelo — no elevarse en punta", "El movimiento es lento y deliberado: 2 segundos por repetición, no una marcha rápida"]'::jsonb),

-- 37
('Pigeon pose (postura de paloma)',
 'movilidad', FALSE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 90, 20,
 'Estiramiento profundo de los rotadores externos de cadera en posición de medio arrodillado. La pierna delantera con la rodilla flexionada y el tobillo al frente crea la posición de apertura de cadera. Muy reconocible para usuarios con experiencia en yoga. El estiramiento de glúteo medio, piriforme y otros rotadores externos es difícil de replicar con otros ejercicios.',
 '["La tibia delantera aproximadamente paralela al frente del mat", "La cadera trasera perpendicular al suelo — no permitir que rote hacia afuera", "Inclinarse hacia adelante sobre la pierna delantera para mayor intensidad del estiramiento", "Sostener 1–3 minutos por lado para cambio real de longitud tisular", "Si hay dolor en la rodilla delantera: elevar la cadera con un bloque hasta que desaparezca el dolor"]'::jsonb),

-- 38
('Wall slide (deslizamiento en pared)',
 'movilidad', TRUE, FALSE, 'principiante',
 '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
 TRUE, '', '',
 1, 1, 'minimo', 1,
 25, 30,
 'Elevación de brazos contra la pared manteniendo el contacto de codos, muñecas y espalda lumbar. Trabaja la movilidad de hombro en elevación, activa el serrato anterior y el trapecio inferior, y corrige la postura de hombros adelantados. El movimiento más simple para detectar y corregir la limitación de flexión de hombro que impide el press overhead limpio.',
 '["De pie o sentado contra la pared, espalda lumbar en contacto constante", "Los codos y las muñecas deben mantener contacto con la pared durante todo el ascenso", "Si algún punto pierde contacto: ese es el límite de movilidad actual — no forzar", "El ascenso es lento: 3–4 segundos subiendo, 3–4 segundos bajando", "Hacer antes del press militar o de cualquier ejercicio overhead para pre-activar los estabilizadores"]'::jsonb)

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

-- Press francés
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press francés con barra EZ (skull crusher)' AND eq.name = 'Barra EZ'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press francés con barra EZ (skull crusher)' AND eq.name = 'Banco plano'
ON CONFLICT DO NOTHING;

-- Curl inclinado
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl en banco inclinado (incline curl)' AND eq.name = 'Mancuernas'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl en banco inclinado (incline curl)' AND eq.name = 'Banco ajustable'
ON CONFLICT DO NOTHING;

-- Curl prono
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de bíceps agarre prono (reverse curl)' AND eq.name = 'Barra EZ'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de bíceps agarre prono (reverse curl)' AND eq.name = 'Mancuernas'
ON CONFLICT DO NOTHING;

-- Curl en polea
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl en polea baja' AND eq.name = 'Polea baja'
ON CONFLICT DO NOTHING;

-- Extensión unilateral tríceps
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Extensión de tríceps unilateral en polea' AND eq.name = 'Polea alta'
ON CONFLICT DO NOTHING;

-- Curl Zottman
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl Zottman' AND eq.name = 'Mancuernas'
ON CONFLICT DO NOTHING;

-- Curl predicador
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl predicador (preacher curl)' AND eq.name = 'Barra EZ'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl predicador (preacher curl)' AND eq.name = 'Mancuernas'
ON CONFLICT DO NOTHING;

-- Curl de muñeca
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de muñeca (wrist curl)' AND eq.name = 'Barra EZ'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Curl de muñeca (wrist curl)' AND eq.name = 'Mancuernas'
ON CONFLICT DO NOTHING;

-- Farmer carry
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Farmer carry con mancuernas' AND eq.name = 'Mancuernas'
ON CONFLICT DO NOTHING;

-- Ab wheel rollout
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Rueda abdominal (ab wheel rollout)' AND eq.name = 'Rueda de abdominales'
ON CONFLICT DO NOTHING;

-- Pallof press
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pallof press en polea' AND eq.name = 'Polea ajustable'
ON CONFLICT DO NOTHING;

-- Dragon flag
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Dragon flag' AND eq.name = 'Banco plano'
ON CONFLICT DO NOTHING;

-- L-sit en paralelas
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'L-sit en paralelas' AND eq.name = 'Paralelas (dips)'
ON CONFLICT DO NOTHING;

-- Plancha de Copenhague
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Plancha de Copenhague' AND eq.name = 'Banco plano'
ON CONFLICT DO NOTHING;

-- Suitcase carry
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Suitcase carry (carga unilateral caminando)' AND eq.name = 'Mancuernas'
ON CONFLICT DO NOTHING;

-- V-up
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'V-up (tijera abdominal)' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'V-up (tijera abdominal)' AND eq.name = 'Colchoneta'
ON CONFLICT DO NOTHING;

-- Bicycle crunch
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Bicycle crunch' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Bicycle crunch' AND eq.name = 'Colchoneta'
ON CONFLICT DO NOTHING;

-- Toes to bar
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Toes to bar (pies a la barra)' AND eq.name = 'Barra fija (dominadas)'
ON CONFLICT DO NOTHING;

-- Hollow body rock
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hollow body rock' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hollow body rock' AND eq.name = 'Colchoneta'
ON CONFLICT DO NOTHING;

-- Chop y lift
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Chop y lift en polea' AND eq.name = 'Polea ajustable'
ON CONFLICT DO NOTHING;

-- Elevaciones de piernas acostado
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevaciones de piernas acostado' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Elevaciones de piernas acostado' AND eq.name = 'Colchoneta'
ON CONFLICT DO NOTHING;

-- GHD sit-up
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'GHD sit-up' AND eq.name = 'Banco ajustable'
ON CONFLICT DO NOTHING;

-- Comba
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Salto a la comba (jump rope)' AND eq.name = 'Banda de resistencia'
ON CONFLICT DO NOTHING;

-- Sprint
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sprint en pista o treadmill' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;

-- KB clean
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Clean con kettlebell' AND eq.name = 'Kettlebell'
ON CONFLICT DO NOTHING;

-- Battle ropes
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Battle ropes (cuerdas de batalla)' AND eq.name = 'Banda de resistencia'
ON CONFLICT DO NOTHING;

-- Sled push (sin equipo en el catálogo exacto — usamos el más cercano)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sled push (empuje de trineo)' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;

-- Bear crawl
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Bear crawl' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;

-- Inchworm
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Inchworm' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;

-- Movilidad — todos con peso corporal o colchoneta o banda
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Squat to stand' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Leg swing (balanceo de pierna)' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Couch stretch (estiramiento de psoas en pared)' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Couch stretch (estiramiento de psoas en pared)' AND eq.name = 'Colchoneta'
ON CONFLICT DO NOTHING;

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hip 90-90 con transición activa' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hip 90-90 con transición activa' AND eq.name = 'Colchoneta'
ON CONFLICT DO NOTHING;

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Extensión torácica sobre foam roller' AND eq.name = 'Bosu'
ON CONFLICT DO NOTHING;

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Movilización de tobillo con banda' AND eq.name = 'Banda de resistencia'
ON CONFLICT DO NOTHING;

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hip flexor march (marcha de flexores)' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pigeon pose (postura de paloma)' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Pigeon pose (postura de paloma)' AND eq.name = 'Colchoneta'
ON CONFLICT DO NOTHING;

INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Wall slide (deslizamiento en pared)' AND eq.name = 'Ninguno (peso corporal)'
ON CONFLICT DO NOTHING;


-- ============================================================
-- SECCIÓN 3 — MUSCLE ASSIGNMENTS
-- ============================================================

-- Press francés
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press francés con barra EZ (skull crusher)' AND m.name IN ('Tríceps braquial')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press francés con barra EZ (skull crusher)' AND m.name IN ('Extensores del antebrazo')
ON CONFLICT DO NOTHING;

-- Curl inclinado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl en banco inclinado (incline curl)' AND m.name IN ('Bíceps braquial')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl en banco inclinado (incline curl)' AND m.name IN ('Braquial', 'Braquiorradial')
ON CONFLICT DO NOTHING;

-- Curl prono
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de bíceps agarre prono (reverse curl)' AND m.name IN ('Braquiorradial')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de bíceps agarre prono (reverse curl)' AND m.name IN ('Bíceps braquial', 'Braquial', 'Extensores del antebrazo')
ON CONFLICT DO NOTHING;

-- Curl polea
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl en polea baja' AND m.name IN ('Bíceps braquial')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl en polea baja' AND m.name IN ('Braquial', 'Braquiorradial')
ON CONFLICT DO NOTHING;

-- Extensión unilateral tríceps
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Extensión de tríceps unilateral en polea' AND m.name IN ('Tríceps braquial')
ON CONFLICT DO NOTHING;

-- Curl Zottman
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl Zottman' AND m.name IN ('Bíceps braquial', 'Braquiorradial')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl Zottman' AND m.name IN ('Braquial', 'Extensores del antebrazo')
ON CONFLICT DO NOTHING;

-- Curl predicador
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl predicador (preacher curl)' AND m.name IN ('Bíceps braquial')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl predicador (preacher curl)' AND m.name IN ('Braquial')
ON CONFLICT DO NOTHING;

-- Curl de muñeca
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de muñeca (wrist curl)' AND m.name IN ('Flexores del antebrazo')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Curl de muñeca (wrist curl)' AND m.name IN ('Bíceps braquial')
ON CONFLICT DO NOTHING;

-- Farmer carry
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Farmer carry con mancuernas' AND m.name IN ('Trapecio superior', 'Erector espinal', 'Transverso abdominal')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Farmer carry con mancuernas' AND m.name IN ('Flexores del antebrazo', 'Glúteo mayor', 'Cuádriceps', 'Pantorrilla (gastrocnemio)')
ON CONFLICT DO NOTHING;

-- Ab wheel rollout
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rueda abdominal (ab wheel rollout)' AND m.name IN ('Transverso abdominal', 'Recto abdominal')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rueda abdominal (ab wheel rollout)' AND m.name IN ('Oblicuo externo', 'Oblicuo interno', 'Dorsal ancho', 'Serrato anterior')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rueda abdominal (ab wheel rollout)' AND m.name IN ('Erector espinal', 'Multífidos', 'Glúteo mayor')
ON CONFLICT DO NOTHING;

-- Pallof press
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pallof press en polea' AND m.name IN ('Transverso abdominal', 'Oblicuo externo', 'Oblicuo interno')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pallof press en polea' AND m.name IN ('Glúteo medio', 'Cuadrado lumbar', 'Erector espinal')
ON CONFLICT DO NOTHING;

-- Dragon flag
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dragon flag' AND m.name IN ('Recto abdominal', 'Transverso abdominal')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Dragon flag' AND m.name IN ('Oblicuo externo', 'Oblicuo interno', 'Psoas ilíaco', 'Glúteo mayor', 'Erector espinal')
ON CONFLICT DO NOTHING;

-- L-sit
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'L-sit en paralelas' AND m.name IN ('Recto abdominal', 'Psoas ilíaco')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'L-sit en paralelas' AND m.name IN ('Cuádriceps', 'Transverso abdominal', 'Tríceps braquial', 'Serrato anterior')
ON CONFLICT DO NOTHING;

-- Plancha de Copenhague
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha de Copenhague' AND m.name IN ('Aductores', 'Oblicuo externo', 'Oblicuo interno')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha de Copenhague' AND m.name IN ('Glúteo medio', 'Cuadrado lumbar', 'Transverso abdominal')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Plancha de Copenhague' AND m.name IN ('Erector espinal')
ON CONFLICT DO NOTHING;

-- Suitcase carry
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Suitcase carry (carga unilateral caminando)' AND m.name IN ('Cuadrado lumbar', 'Oblicuo externo', 'Oblicuo interno')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Suitcase carry (carga unilateral caminando)' AND m.name IN ('Trapecio superior', 'Erector espinal', 'Flexores del antebrazo', 'Glúteo medio')
ON CONFLICT DO NOTHING;

-- V-up
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'V-up (tijera abdominal)' AND m.name IN ('Recto abdominal', 'Psoas ilíaco')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'V-up (tijera abdominal)' AND m.name IN ('Transverso abdominal', 'Oblicuo externo', 'Cuádriceps')
ON CONFLICT DO NOTHING;

-- Bicycle crunch
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Bicycle crunch' AND m.name IN ('Oblicuo externo', 'Oblicuo interno')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Bicycle crunch' AND m.name IN ('Recto abdominal', 'Transverso abdominal', 'Psoas ilíaco')
ON CONFLICT DO NOTHING;

-- Toes to bar
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Toes to bar (pies a la barra)' AND m.name IN ('Recto abdominal', 'Psoas ilíaco')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Toes to bar (pies a la barra)' AND m.name IN ('Transverso abdominal', 'Oblicuo externo', 'Cuádriceps', 'Flexores del antebrazo')
ON CONFLICT DO NOTHING;

-- Hollow body rock
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hollow body rock' AND m.name IN ('Recto abdominal', 'Transverso abdominal')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hollow body rock' AND m.name IN ('Psoas ilíaco', 'Cuádriceps', 'Oblicuo externo')
ON CONFLICT DO NOTHING;

-- Chop y lift
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Chop y lift en polea' AND m.name IN ('Oblicuo externo', 'Oblicuo interno')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Chop y lift en polea' AND m.name IN ('Transverso abdominal', 'Glúteo mayor', 'Dorsal ancho', 'Pectoral mayor (porción esternal)')
ON CONFLICT DO NOTHING;

-- Elevaciones de piernas acostado
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevaciones de piernas acostado' AND m.name IN ('Recto abdominal', 'Psoas ilíaco')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Elevaciones de piernas acostado' AND m.name IN ('Transverso abdominal', 'Cuádriceps', 'Oblicuo externo')
ON CONFLICT DO NOTHING;

-- GHD sit-up
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'GHD sit-up' AND m.name IN ('Recto abdominal', 'Psoas ilíaco')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'GHD sit-up' AND m.name IN ('Oblicuo externo', 'Oblicuo interno', 'Isquiotibiales', 'Glúteo mayor')
ON CONFLICT DO NOTHING;

-- Comba
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Salto a la comba (jump rope)' AND m.name IN ('Pantorrilla (gastrocnemio)', 'Sóleo')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Salto a la comba (jump rope)' AND m.name IN ('Cuádriceps', 'Glúteo mayor', 'Flexores del antebrazo')
ON CONFLICT DO NOTHING;

-- Sprint
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sprint en pista o treadmill' AND m.name IN ('Isquiotibiales', 'Glúteo mayor', 'Psoas ilíaco')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sprint en pista o treadmill' AND m.name IN ('Cuádriceps', 'Pantorrilla (gastrocnemio)', 'Sóleo', 'Glúteo medio')
ON CONFLICT DO NOTHING;

-- KB clean
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Clean con kettlebell' AND m.name IN ('Glúteo mayor', 'Isquiotibiales')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Clean con kettlebell' AND m.name IN ('Trapecio superior', 'Dorsal ancho', 'Cuádriceps', 'Erector espinal')
ON CONFLICT DO NOTHING;

-- Battle ropes
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Battle ropes (cuerdas de batalla)' AND m.name IN ('Deltoides anterior', 'Deltoides lateral')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Battle ropes (cuerdas de batalla)' AND m.name IN ('Trapecio superior', 'Bíceps braquial', 'Tríceps braquial', 'Oblicuo externo')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'estabilizador' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Battle ropes (cuerdas de batalla)' AND m.name IN ('Cuádriceps', 'Glúteo mayor', 'Transverso abdominal')
ON CONFLICT DO NOTHING;

-- Sled push
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sled push (empuje de trineo)' AND m.name IN ('Cuádriceps', 'Glúteo mayor')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sled push (empuje de trineo)' AND m.name IN ('Isquiotibiales', 'Pantorrilla (gastrocnemio)', 'Deltoides anterior', 'Tríceps braquial')
ON CONFLICT DO NOTHING;

-- Bear crawl
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Bear crawl' AND m.name IN ('Transverso abdominal', 'Recto abdominal')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Bear crawl' AND m.name IN ('Cuádriceps', 'Glúteo mayor', 'Deltoides anterior', 'Tríceps braquial', 'Oblicuo externo')
ON CONFLICT DO NOTHING;

-- Inchworm
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Inchworm' AND m.name IN ('Isquiotibiales', 'Transverso abdominal')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Inchworm' AND m.name IN ('Recto abdominal', 'Deltoides anterior', 'Serrato anterior', 'Erector espinal')
ON CONFLICT DO NOTHING;

-- Movilidad — músculos simplificados
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Squat to stand' AND m.name IN ('Isquiotibiales', 'Sóleo')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Squat to stand' AND m.name IN ('Glúteo mayor', 'Erector espinal', 'Cuádriceps')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Leg swing (balanceo de pierna)' AND m.name IN ('Cadera (flexores)', 'Isquiotibiales', 'Glúteo mayor')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Leg swing (balanceo de pierna)' AND m.name IN ('Cadera (abductores)', 'Cadera (aductores)')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Couch stretch (estiramiento de psoas en pared)' AND m.name IN ('Cadera (flexores)', 'Cuádriceps')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Couch stretch (estiramiento de psoas en pared)' AND m.name IN ('Glúteo mayor', 'Recto femoral')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip 90-90 con transición activa' AND m.name IN ('Cadera (rotadores externos)', 'Cadera (rotadores internos)', 'Glúteo mayor')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip 90-90 con transición activa' AND m.name IN ('Cadera (aductores)', 'Cadera (abductores)')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Extensión torácica sobre foam roller' AND m.name IN ('Erector espinal', 'Romboides')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Extensión torácica sobre foam roller' AND m.name IN ('Trapecio', 'Deltoides posterior')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Movilización de tobillo con banda' AND m.name IN ('Sóleo', 'Gastrocnemio')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Movilización de tobillo con banda' AND m.name IN ('Tibial anterior', 'Peroneo largo')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip flexor march (marcha de flexores)' AND m.name IN ('Cadera (flexores)', 'Transverso abdominal')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hip flexor march (marcha de flexores)' AND m.name IN ('Glúteo mayor', 'Recto abdominal')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pigeon pose (postura de paloma)' AND m.name IN ('Cadera (rotadores externos)', 'Glúteo mayor', 'Piriforme')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pigeon pose (postura de paloma)' AND m.name IN ('Cadera (flexores)', 'Cadera (aductores)')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Wall slide (deslizamiento en pared)' AND m.name IN ('Trapecio inferior', 'Romboides', 'Manguito rotador')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Wall slide (deslizamiento en pared)' AND m.name IN ('Deltoides posterior', 'Serrato anterior')
ON CONFLICT DO NOTHING;
