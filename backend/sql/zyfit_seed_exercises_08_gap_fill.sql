-- ============================================================
-- ZYFIT — Exercise Seed Data: Batch 08 (Gap Fill — evidencia científica)
-- Fuente: zyfit-evidencia-ejercicios.md + zyfit-ejercicios-nuevos-gap-fill.md
-- Total: 28 ejercicios nuevos (de los ~30 del doc: "Elevación lateral en
-- polea" se resolvio actualizando el ya existente "Elevaciones laterales en
-- polea baja", y "Copenhagen adduction" actualizando "Plancha de Copenhague"
-- — ver SECCIÓN 4 de este archivo, ambos son UPDATE, no INSERT).
-- Categorías: Bisagra/cadena posterior · Sentadilla · Empuje · Jalón
-- horizontal · Core · Aislamiento (aductores/antebrazo/cuello/tibial) ·
-- Cargada/potencia olímpica · Locomoción/pliometría · Movilidad.
-- ============================================================

-- ============================================================
-- SECCIÓN 0 — EQUIPMENT / MUSCLE GROUPS NUEVOS (solo los que faltan)
-- ============================================================

INSERT INTO equipment_items (name, category, is_gym_only) VALUES
('Trap bar (hex bar)', 'Libre',     FALSE),
('Banco GHD',           'Máquina',  TRUE),
('Banco romano',        'Máquina',  TRUE),
('Landmine',            'Accesorio',TRUE),
('Balón medicinal',     'Accesorio',FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO muscle_groups (name, anatomical_group) VALUES
('Flexores cervicales',  'Core'),
('Extensores cervicales','Core')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SECCIÓN 1 — EXERCISES
-- ============================================================

INSERT INTO exercises (
  nombre, patron_movimiento, bilateral, es_compuesto, dificultad,
  musculos_primarios, musculos_secundarios, equipamiento, contraindicaciones,
  activo, gif_url, imagen_url,
  technical_level, error_risk, space_required, systemic_fatigue,
  set_duration_seconds, rest_seconds_default, description, coaching_cues,
  evidence_score, evidence_rationale, goal_tags, goal_primary,
  lengthened_bias, injury_risk_profile
) VALUES

-- Glute-ham raise (GHR)
('Glute-ham raise (GHR)',
 'bisagra',
 TRUE,
 TRUE,
 'avanzado',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 4,
 4,
 'medio',
 4,
 40,
 120,
 'Flexión de rodilla contra resistencia en banco GHD, desde tronco extendido hasta caída controlada. De los ejercicios con mayor activación de isquiotibiales (énfasis en el semitendinoso) y fuerza excéntrica documentados; complementa al RDL para el balance completo de la cadena posterior.',
 '["Caderas ancladas en el soporte, columna neutra durante todo el recorrido", "El descenso es la fase clave: 3-4 segundos controlados, no caer", "Empujar los talones contra la almohadilla durante todo el movimiento", "Progresar el rango antes que la velocidad — la técnica se pierde primero en el tercio final"]'::jsonb,
 4,
 'Score 4/5: buena evidencia con alguna limitación de nicho o poblacional; tag principal hipertrofia (rendimiento + hipertrofia); riesgo articular moderado.',
 '["rendimiento", "hipertrofia"]'::jsonb,
 'hipertrofia',
 TRUE,
 'moderado'),

-- Back extension 45° (Roman chair)
('Back extension 45° (Roman chair)',
 'bisagra',
 TRUE,
 TRUE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 2,
 2,
 'medio',
 2,
 35,
 75,
 'Extensión de cadera y columna desde banco romano a 45°, apoyo en caderas con tronco libre. Punto de entrada accesible a la cadena posterior antes del GHR — activa erectores, glúteo e isquiotibiales con demanda técnica baja.',
 '["Apoyo en las caderas, no en el abdomen — permite el rango completo", "Subir hasta línea recta cuerpo, sin hiperextender la lumbar al final", "Manos cruzadas en el pecho para principiantes, disco al pecho para progresar", "Bajar controlado hasta sentir el estiramiento de isquiotibiales, sin rebotar"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal salud_general (salud_general + hipertrofia); riesgo articular bajo.',
 '["salud_general", "hipertrofia"]'::jsonb,
 'salud_general',
 FALSE,
 'bajo'),

-- Reverse hyperextension
('Reverse hyperextension',
 'bisagra',
 TRUE,
 TRUE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 2,
 2,
 'medio',
 2,
 35,
 75,
 'Extensión de cadera con el tronco fijo y las piernas libres, colgado en máquina o banco. A diferencia del back extension, descomprime la columna en vez de cargarla — valorado en rehabilitación lumbar además de para glúteo/isquiotibiales.',
 '["Tronco apoyado y fijo — el movimiento ocurre solo en la cadera", "Subir las piernas hasta la línea del tronco, sin hiperextender", "El descenso controlado añade tracción suave a la columna, no forzarlo", "Apretar el glúteo en el punto más alto antes de bajar"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal salud_general (salud_general + hipertrofia); riesgo articular bajo.',
 '["salud_general", "hipertrofia"]'::jsonb,
 'salud_general',
 FALSE,
 'bajo'),

-- Peso muerto con trap bar (hex bar)
('Peso muerto con trap bar (hex bar)',
 'bisagra',
 TRUE,
 TRUE,
 'intermedio',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 3,
 3,
 'medio',
 4,
 40,
 150,
 'Peso muerto con barra hexagonal, agarre neutro a los lados del cuerpo. Reduce el momento de fuerza lumbar y de tobillo frente a la barra recta y permite mayor pico de potencia — variante preferida ante limitaciones lumbares sin sacrificar carga.',
 '["El centro de masa queda alineado con el cuerpo — postura más vertical que la barra recta", "Empujar el suelo con las piernas primero, la espalda acompaña sin flexionarse", "Agarres neutros a los costados, hombros relajados durante la tracción", "Bloqueo de cadera y rodilla simultáneo arriba, sin hiperextender lumbar"]'::jsonb,
 4,
 'Score 4/5: buena evidencia con alguna limitación de nicho o poblacional; tag principal rendimiento (rendimiento + hipertrofia); riesgo articular bajo.',
 '["rendimiento", "hipertrofia"]'::jsonb,
 'rendimiento',
 FALSE,
 'bajo'),

-- Sentadilla con talón elevado (heel-elevated)
('Sentadilla con talón elevado (heel-elevated)',
 'sentadilla',
 TRUE,
 TRUE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 2,
 2,
 'medio',
 3,
 40,
 90,
 'Sentadilla con los talones sobre una cuña o disco, que adelanta el centro de masa y permite mayor flexión de rodilla con menor demanda de movilidad de tobillo. Aumenta el énfasis en cuádriceps frente a la sentadilla plana.',
 '["La cuña permite bajar más profundo sin perder los talones del suelo", "Torso más vertical que en la sentadilla tradicional — es la intención del ejercicio", "Útil como regresión para quien no llega a la profundidad por tobillo rígido", "Rodillas siguen la dirección de los pies durante todo el descenso"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal hipertrofia (hipertrofia); riesgo articular bajo.',
 '["hipertrofia"]'::jsonb,
 'hipertrofia',
 FALSE,
 'bajo'),

-- Sentadilla overhead
('Sentadilla overhead',
 'sentadilla',
 TRUE,
 TRUE,
 'avanzado',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 5,
 5,
 'amplio',
 5,
 45,
 180,
 'Sentadilla profunda con la barra fija por encima de la cabeza en extensión completa de brazos. Máxima exigencia de movilidad de hombro/tobillo/cadera y de estabilidad de core simultánea — derivado directo del levantamiento olímpico, de nicho fuera de ese contexto.',
 '["La barra se mantiene sobre la mitad del pie durante todo el recorrido, no por delante", "Requiere movilidad de hombro y tobillo completa antes de cargar peso", "Core rígido (bracing) constante — cualquier pérdida de tensión colapsa la posición", "Progresar SIEMPRE desde barra vacía y con supervisión técnica antes de añadir carga"]'::jsonb,
 2,
 'Score 2/5: evidencia limitada, uso complementario; tag principal rendimiento (rendimiento); riesgo articular alto.',
 '["rendimiento"]'::jsonb,
 'rendimiento',
 FALSE,
 'alto'),

-- Press con mancuernas en suelo (floor press)
('Press con mancuernas en suelo (floor press)',
 'empuje_horizontal',
 TRUE,
 TRUE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 2,
 2,
 'minimo',
 3,
 35,
 90,
 'Press de pecho acostado en el suelo en vez de banco — el rango se acorta al tocar los codos en el piso, lo que quita tensión al hombro en la posición más vulnerable. Buena opción sin banco disponible o con historial de molestia de hombro en el press completo.',
 '["Los codos tocan el suelo suavemente — no rebotar la carga en ese punto", "El ROM reducido protege el hombro: no forzar bajar más de lo que el suelo permite", "Escápulas retraídas contra el suelo durante todo el press", "Buena alternativa en casa o para quien entrena con molestia leve de hombro"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal salud_general (hipertrofia + salud_general); riesgo articular bajo.',
 '["hipertrofia", "salud_general"]'::jsonb,
 'salud_general',
 FALSE,
 'bajo'),

-- Press con banda (chest press banda)
('Press con banda (chest press banda)',
 'empuje_horizontal',
 TRUE,
 TRUE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 1,
 1,
 'minimo',
 2,
 30,
 60,
 'Press de pecho con banda de resistencia anclada detrás del cuerpo. Sin componente excéntrico pesado ni carga axial — accesible para entrenar en casa o como opción de bajo estrés articular, aunque con techo de sobrecarga progresiva limitado.',
 '["Ancla la banda a la altura del pecho para replicar la trayectoria del press", "La tensión de la banda crece en la extensión — controlar el retorno igual de lento", "Buena opción de viaje/casa cuando no hay pesas disponibles", "Combinar con bandas de distinta resistencia para progresar sin equipo de gimnasio"]'::jsonb,
 2,
 'Score 2/5: evidencia limitada, uso complementario; tag principal salud_general (salud_general); riesgo articular bajo.',
 '["salud_general"]'::jsonb,
 'salud_general',
 FALSE,
 'bajo'),

-- Push jerk
('Push jerk',
 'empuje_vertical',
 TRUE,
 TRUE,
 'avanzado',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 5,
 5,
 'amplio',
 5,
 40,
 180,
 'Derivado olímpico: impulso de piernas (dip-drive) que proyecta la barra por encima de la cabeza, recibida con una flexión parcial de piernas. Máxima transferencia a potencia de tren superior, con alta demanda técnica y de movilidad de hombro/tobillo.',
 '["El impulso viene de las piernas (dip-drive), no de los brazos empujando solos", "La recepción con flexión parcial de piernas amortigua la carga — no bloquear rígido", "Requiere dominio previo del push press antes de progresar a esta variante", "Restringido a usuarios avanzados o con historial de halterofilia/CrossFit"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal rendimiento (rendimiento); riesgo articular alto.',
 '["rendimiento"]'::jsonb,
 'rendimiento',
 FALSE,
 'alto'),

-- Remo con landmine
('Remo con landmine',
 'jalon_horizontal',
 FALSE,
 TRUE,
 'intermedio',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 3,
 2,
 'medio',
 3,
 35,
 90,
 'Remo con un extremo de barra anclado al suelo (landmine), agarre neutro con ambas manos o unilateral. El ángulo del landmine reduce el estrés lumbar frente al remo con barra libre, manteniendo alta activación de dorsal y trapecio medio.',
 '["Torso a ~45° estable durante toda la serie — no usar impulso lumbar", "Tirar el codo hacia atrás y arriba, apretando la escápula al final", "El anclaje reduce el momento lumbar frente al remo con barra libre tradicional", "Versión unilateral permite corregir asimetrías entre lados"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal hipertrofia (hipertrofia + salud_general); riesgo articular bajo.',
 '["hipertrofia", "salud_general"]'::jsonb,
 'hipertrofia',
 FALSE,
 'bajo'),

-- Ab wheel de pie (standing rollout)
('Ab wheel de pie (standing rollout)',
 'core_antiextension',
 TRUE,
 TRUE,
 'avanzado',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 5,
 4,
 'medio',
 4,
 35,
 90,
 'Rollout con rueda abdominal iniciado de pie en vez de rodillas — el brazo de palanca completo exige varios órdenes de magnitud más de fuerza antiextensión que la versión de rodillas. Progresión final del patrón, no un punto de entrada (ver Rollout con rueda abdominal / Ab wheel rollout desde rodillas para las versiones de entrada).',
 '["Solo progresar acá tras dominar por completo la versión de rodillas con ROM total", "La columna lumbar neutra es no negociable — la pérdida de posición es el mecanismo de lesión", "El regreso a la posición inicial es la fase más exigente, no perder tensión de core ahí", "Detener el descenso apenas se sienta que la zona lumbar empieza a ceder"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal hipertrofia (rendimiento + hipertrofia); riesgo articular moderado.',
 '["rendimiento", "hipertrofia"]'::jsonb,
 'hipertrofia',
 FALSE,
 'moderado'),

-- Máquina de aductores (hip adduction machine)
('Máquina de aductores (hip adduction machine)',
 'aislamiento',
 TRUE,
 FALSE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 1,
 1,
 'minimo',
 1,
 30,
 60,
 'Aducción de cadera contra resistencia en máquina sentado. Único ejercicio del catálogo con carga progresiva dedicada a aductores — complementa a la Plancha de Copenhague (isométrica) con un estímulo de fuerza dinámica y escalable.',
 '["Rango completo: desde abducción máxima cómoda hasta cierre total", "Movimiento controlado en ambas direcciones, sin usar impulso", "Ajustar el asiento para que el eje de la máquina coincida con la cadera", "Buen complemento de fuerza dinámica junto a la Plancha de Copenhague isométrica"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal hipertrofia (hipertrofia + salud_general); riesgo articular bajo.',
 '["hipertrofia", "salud_general"]'::jsonb,
 'hipertrofia',
 FALSE,
 'bajo'),

-- Tibialis raise (tib raise)
('Tibialis raise (tib raise)',
 'aislamiento',
 TRUE,
 FALSE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 1,
 1,
 'minimo',
 1,
 30,
 45,
 'Dorsiflexión de tobillo contra resistencia, apoyado de espaldas a una pared o con banda. Único ejercicio del catálogo dedicado al tibial anterior — relevante para prevención de shin splints y salud de rodilla en corredores.',
 '["Apoyar los talones y subir solo la punta del pie, sin despegar el talón", "Rango completo y lento — el tibial anterior es un músculo pequeño, fácil de subestimar", "Progresar con banda de resistencia o disco sobre el empeine antes que con peso corporal repetido", "Especialmente útil para corredores como prevención de shin splints"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal salud_general (salud_general); riesgo articular bajo.',
 '["salud_general"]'::jsonb,
 'salud_general',
 FALSE,
 'bajo'),

-- Wrist extension (extensión de muñeca)
('Wrist extension (extensión de muñeca)',
 'aislamiento',
 TRUE,
 FALSE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 1,
 1,
 'minimo',
 1,
 30,
 45,
 'Extensión de muñeca con mancuerna, antebrazo apoyado. Complementa al curl de muñeca (flexores) entrenando los extensores — el catálogo solo tenía trabajo de flexores hasta ahora, dejando un desbalance de agarre sin cubrir.',
 '["Antebrazo apoyado y fijo — el movimiento ocurre solo en la muñeca", "Rango completo de extensión, bajar controlado hasta flexión cómoda", "Carga baja: la muñeca es una articulación pequeña, prioriza reps sobre peso", "Hacerlo en pareja con el curl de muñeca para no desbalancear flexores/extensores"]'::jsonb,
 2,
 'Score 2/5: evidencia limitada, uso complementario; tag principal salud_general (salud_general); riesgo articular bajo.',
 '["salud_general"]'::jsonb,
 'salud_general',
 FALSE,
 'bajo'),

-- Grip/farmer hold específico
('Grip/farmer hold específico',
 'aislamiento',
 TRUE,
 FALSE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 1,
 1,
 'minimo',
 2,
 30,
 60,
 'Sostén isométrico de carga pesada sin desplazamiento, a diferencia del farmer carry (que agrega locomoción). Aísla la resistencia de agarre como cualidad propia — relevante para prevención de lesiones de antebrazo/muñeca y transferencia a levantamientos pesados.',
 '["Sostener sin desplazarse — es la variante estática del farmer carry", "Cronometrar el tiempo de sostén y progresar por tiempo antes que por peso", "El agarre suele fallar antes que el resto del cuerpo: parar sin forzar la caída de la carga", "Complementa al farmer carry, no lo reemplaza"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal salud_general (salud_general + rendimiento); riesgo articular bajo.',
 '["salud_general", "rendimiento"]'::jsonb,
 'salud_general',
 FALSE,
 'bajo'),

-- Flexo-extensión de cuello (neck flexion/extension)
('Flexo-extensión de cuello (neck flexion/extension)',
 'aislamiento',
 TRUE,
 FALSE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 2,
 2,
 'minimo',
 1,
 30,
 45,
 'Flexión y extensión de cuello contra resistencia manual, banda o arnés. Ausente por completo del catálogo hasta ahora — evidencia emergente respalda el entrenamiento de cuello para reducir eventos de aceleración de cabeza en deportes de contacto.',
 '["Movimiento lento y controlado en ambas direcciones — el cuello no tolera cargas rápidas", "Empezar solo con resistencia manual propia antes de sumar banda o arnés", "Relevante especialmente en deportes de contacto o con riesgo de impacto de cabeza", "Detener ante cualquier mareo, hormigueo o dolor irradiado — no es normal"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal salud_general (salud_general); riesgo articular bajo.',
 '["salud_general"]'::jsonb,
 'salud_general',
 FALSE,
 'bajo'),

-- JM press / close-grip press
('JM press / close-grip press',
 'aislamiento',
 TRUE,
 TRUE,
 'intermedio',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 3,
 3,
 'minimo',
 3,
 35,
 90,
 'Híbrido entre press cerrado y extensión de tríceps: la barra desciende hacia el cuello con los codos semi-fijos. Permite cargas más pesadas que la extensión de tríceps aislada, con mayor demanda técnica de estabilidad de codo.',
 '["Agarre cerrado, codos apuntando ligeramente hacia adentro sin abrirse", "La barra desciende hacia la base del cuello, no hacia el pecho como un press normal", "Mayor riesgo de codo que un press cerrado tradicional: progresar la carga con cautela", "Buen puente entre el aislamiento de tríceps y el press de banca cerrado"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal hipertrofia (hipertrofia); riesgo articular moderado.',
 '["hipertrofia"]'::jsonb,
 'hipertrofia',
 FALSE,
 'moderado'),

-- Power clean
('Power clean',
 'cargada',
 TRUE,
 TRUE,
 'avanzado',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 5,
 5,
 'amplio',
 5,
 45,
 180,
 'Derivado olímpico: la barra viaja del suelo a los hombros en un tirón explosivo, recibida en cuarto de sentadilla. Máximo respaldo NSCA para desarrollo de potencia y tasa de producción de fuerza (RFD) — requiere coaching técnico dedicado antes de cargar peso relevante.',
 '["Requiere progresión técnica dedicada — no improvisar desde el peso muerto convencional", "El tirón es explosivo con extensión triple (tobillo-rodilla-cadera), no un peso muerto rápido", "Recibir en cuarto de sentadilla, codos altos, sin colapsar la postura", "Restringido por defecto a usuarios avanzados o con historial de halterofilia/CrossFit"]'::jsonb,
 4,
 'Score 4/5: buena evidencia con alguna limitación de nicho o poblacional; tag principal rendimiento (rendimiento); riesgo articular alto.',
 '["rendimiento"]'::jsonb,
 'rendimiento',
 FALSE,
 'alto'),

-- Hang power clean
('Hang power clean',
 'cargada',
 TRUE,
 TRUE,
 'avanzado',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 5,
 5,
 'amplio',
 5,
 45,
 180,
 'Variante del power clean iniciada desde la altura de la rodilla en vez del suelo, quitando la fase de tirón inicial. Suele usarse como progresión técnica hacia el power clean completo, con foco en la extensión triple explosiva.',
 '["Inicio a la altura de la rodilla, no desde el suelo — quita la fase de tirón inicial", "Extensión triple explosiva (tobillo-rodilla-cadera) es el motor del movimiento", "Suele enseñarse ANTES que el power clean completo por su menor complejidad técnica", "Restringido por defecto a usuarios avanzados o con historial de halterofilia/CrossFit"]'::jsonb,
 4,
 'Score 4/5: buena evidencia con alguna limitación de nicho o poblacional; tag principal rendimiento (rendimiento); riesgo articular alto.',
 '["rendimiento"]'::jsonb,
 'rendimiento',
 FALSE,
 'alto'),

-- Power snatch
('Power snatch',
 'cargada',
 TRUE,
 TRUE,
 'avanzado',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 5,
 5,
 'amplio',
 5,
 45,
 180,
 'Derivado olímpico: la barra viaja del suelo directamente por encima de la cabeza en un único tirón, recibida en cuarto de sentadilla con brazos extendidos. El más técnicamente exigente del catálogo — máxima demanda de movilidad de hombro/cadera y coordinación.',
 '["El movimiento técnicamente más exigente del catálogo — requiere coaching dedicado", "Agarre amplio (snatch grip), la barra viaja pegada al cuerpo todo el recorrido", "Recepción con brazos extendidos por encima de la cabeza, no en los hombros", "Restringido por defecto a usuarios avanzados o con historial de halterofilia/CrossFit"]'::jsonb,
 4,
 'Score 4/5: buena evidencia con alguna limitación de nicho o poblacional; tag principal rendimiento (rendimiento); riesgo articular alto.',
 '["rendimiento"]'::jsonb,
 'rendimiento',
 FALSE,
 'alto'),

-- High pull (jalón alto explosivo)
('High pull (jalón alto explosivo)',
 'cargada',
 TRUE,
 TRUE,
 'intermedio',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 4,
 3,
 'amplio',
 4,
 40,
 120,
 'Tirón explosivo de la barra desde el suelo hasta la altura del pecho, sin recepción overhead — quita la fase técnica más compleja de los derivados olímpicos completos manteniendo el estímulo de potencia. Buen puente hacia power clean/snatch.',
 '["Extensión triple explosiva igual que en los derivados completos, sin fase de recepción", "Codos altos y hacia afuera al final del tirón, la barra sube pegada al cuerpo", "Buen puente de entrenamiento antes de progresar a power clean o power snatch completos", "Menor demanda técnica que los derivados completos, pero igual requiere supervisión inicial"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal rendimiento (rendimiento); riesgo articular moderado.',
 '["rendimiento"]'::jsonb,
 'rendimiento',
 FALSE,
 'moderado'),

-- Depth jump (salto de profundidad)
('Depth jump (salto de profundidad)',
 'locomocion',
 TRUE,
 TRUE,
 'avanzado',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 4,
 4,
 'amplio',
 5,
 30,
 120,
 'Caída desde un cajón seguida de un salto vertical inmediato, minimizando el tiempo de contacto en el suelo. Pliométrico validado para potencia y capacidad reactiva — alta demanda de tejido tendinoso, requiere base de fuerza previa antes de introducirlo.',
 '["Minimizar el tiempo de contacto en el suelo — la clave es la reactividad, no la altura del cajón", "Requiere base de fuerza de tren inferior previa antes de introducirlo en el programa", "Aterrizar y despegar con las rodillas alineadas, sin colapso hacia adentro", "Volumen bajo por sesión: la demanda tendinosa es alta, no es un ejercicio de muchas repeticiones"]'::jsonb,
 4,
 'Score 4/5: buena evidencia con alguna limitación de nicho o poblacional; tag principal rendimiento (rendimiento); riesgo articular moderado.',
 '["rendimiento"]'::jsonb,
 'rendimiento',
 FALSE,
 'moderado'),

-- Broad jump (salto horizontal)
('Broad jump (salto horizontal)',
 'locomocion',
 TRUE,
 TRUE,
 'intermedio',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 3,
 2,
 'amplio',
 4,
 30,
 90,
 'Salto horizontal máximo desde parado, con recepción estable en dos pies. Pliométrico básico de bajo requerimiento de equipo, con buena transferencia a potencia de cadena posterior y aceleración.',
 '["Balanceo de brazos coordinado con la extensión de cadera al despegar", "Recepción estable y controlada — no es solo la distancia, sino aterrizar sin colapsar", "Dejar recuperación completa entre saltos si el objetivo es potencia, no acondicionamiento", "Sin equipo especializado — accesible en cualquier espacio con largo suficiente"]'::jsonb,
 4,
 'Score 4/5: buena evidencia con alguna limitación de nicho o poblacional; tag principal rendimiento (rendimiento); riesgo articular bajo.',
 '["rendimiento"]'::jsonb,
 'rendimiento',
 FALSE,
 'bajo'),

-- Medicine ball slam/throw
('Medicine ball slam/throw',
 'locomocion',
 TRUE,
 TRUE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 2,
 2,
 'medio',
 3,
 30,
 60,
 'Lanzamiento o golpe explosivo de balón medicinal contra el suelo o una pared, con extensión de todo el cuerpo. Accesible y de bajo riesgo técnico, entrena potencia de core y tren superior con componente de velocidad.',
 '["El movimiento viene de la extensión de todo el cuerpo, no solo de los brazos", "Soltar la tensión de forma explosiva en el punto de contacto, no frenar el balón", "Buen ejercicio de entrada a la potencia — bajo riesgo técnico frente a los derivados olímpicos", "Usar un balón que rebote poco o no rebote para evitar golpes al recibirlo de vuelta"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal rendimiento (rendimiento + salud_general); riesgo articular bajo.',
 '["rendimiento", "salud_general"]'::jsonb,
 'rendimiento',
 FALSE,
 'bajo'),

-- Pogo hops / bounding
('Pogo hops / bounding',
 'locomocion',
 TRUE,
 TRUE,
 'intermedio',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 3,
 2,
 'amplio',
 3,
 25,
 60,
 'Saltos rítmicos de bajo tiempo de contacto (pogo) o zancadas amplias explosivas (bounding), usando principalmente el resorte del tobillo. Desarrolla rigidez elástica de pantorrilla/tendón de Aquiles, relevante para economía de carrera y sprint.',
 '["El resorte viene del tobillo, no de flexionar mucho la rodilla en cada contacto", "Contactos rápidos y rítmicos en pogo hops — minimizar el tiempo en el suelo", "En bounding, priorizar la distancia por zancada sobre la velocidad al inicio", "Relevante para corredores: mejora la rigidez elástica usada en la economía de carrera"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal rendimiento (rendimiento); riesgo articular bajo.',
 '["rendimiento"]'::jsonb,
 'rendimiento',
 FALSE,
 'bajo'),

-- World's greatest stretch
('World''s greatest stretch',
 'movilidad',
 TRUE,
 FALSE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 1,
 1,
 'medio',
 1,
 40,
 15,
 'Secuencia de estocada con rotación torácica y estiramiento de isquiotibiales en un solo fluido. Cubre cadera, torácica e isquiotibiales en un solo movimiento — de los estiramientos dinámicos con mayor evidencia como preparación antes de sentadilla/bisagra.',
 '["Estocada larga, mano interior al suelo, rotación torácica hacia el lado de la pierna adelantada", "El estiramiento dinámico en calentamiento mejora salto y sprint — no reemplaza al estático prolongado post-entreno", "Fluir entre las posiciones sin pausas rígidas — es una secuencia, no 3 estiramientos separados", "Ideal antes de sesiones de sentadilla o bisagra por la cadera/isquios que activa"]'::jsonb,
 3,
 'Score 3/5: evidencia moderada o de nicho técnico; tag principal salud_general (salud_general); riesgo articular bajo.',
 '["salud_general"]'::jsonb,
 'salud_general',
 FALSE,
 'bajo'),

-- Cat-camel (gato-camello)
('Cat-camel (gato-camello)',
 'movilidad',
 TRUE,
 FALSE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 1,
 1,
 'minimo',
 1,
 40,
 15,
 'Flexión y extensión alternada de columna en cuadrupedia, segmento por segmento. Estiramiento dinámico clásico de movilidad espinal — bajo riesgo, apto como parte de cualquier calentamiento.',
 '["Movimiento segmento por segmento de la columna, no un solo bloque rígido", "Sincronizar con la respiración: exhalar al redondear, inhalar al extender", "Rango cómodo, sin forzar el final del recorrido en ninguna dirección", "Apto para cualquier calentamiento — sin restricciones de nivel"]'::jsonb,
 2,
 'Score 2/5: evidencia limitada, uso complementario; tag principal salud_general (salud_general); riesgo articular bajo.',
 '["salud_general"]'::jsonb,
 'salud_general',
 FALSE,
 'bajo'),

-- Rotación torácica cuadrupedia
('Rotación torácica cuadrupedia',
 'movilidad',
 FALSE,
 FALSE,
 'principiante',
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb,
 TRUE,
 '',
 '',
 1,
 1,
 'minimo',
 1,
 35,
 15,
 'En cuadrupedia, una mano detrás de la cabeza rota el torso llevando el codo hacia el techo, con la cadera fija. Aísla la rotación torácica del resto de la columna — relevante para deportes con rotación (golf, remo, lanzamientos) y para liberar el press/jalón.',
 '["La cadera permanece fija y cuadrada — la rotación es solo torácica", "Seguir el codo con la mirada para maximizar el rango de rotación", "Movimiento lento y controlado, sin usar impulso para llegar más lejos", "Útil antes de sesiones de press/jalón o para deportes con componente rotacional"]'::jsonb,
 2,
 'Score 2/5: evidencia limitada, uso complementario; tag principal salud_general (salud_general); riesgo articular bajo.',
 '["salud_general"]'::jsonb,
 'salud_general',
 FALSE,
 'bajo')


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
    evidence_score       = EXCLUDED.evidence_score,
    evidence_rationale   = EXCLUDED.evidence_rationale,
    goal_tags            = EXCLUDED.goal_tags,
    goal_primary         = EXCLUDED.goal_primary,
    lengthened_bias      = EXCLUDED.lengthened_bias,
    injury_risk_profile  = EXCLUDED.injury_risk_profile;


-- ============================================================
-- SECCIÓN 2 — EQUIPMENT ASSIGNMENTS
-- ============================================================


-- Glute-ham raise (GHR)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Glute-ham raise (GHR)' AND eq.name = 'Banco GHD'
ON CONFLICT DO NOTHING;

-- Back extension 45° (Roman chair)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Back extension 45° (Roman chair)' AND eq.name = 'Banco romano'
ON CONFLICT DO NOTHING;

-- Reverse hyperextension
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Reverse hyperextension' AND eq.name = 'Máquina/banco reverse hyper'
ON CONFLICT DO NOTHING;

-- Peso muerto con trap bar (hex bar)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Peso muerto con trap bar (hex bar)' AND eq.name = 'Trap bar (hex bar)'
ON CONFLICT DO NOTHING;

-- Sentadilla con talón elevado (heel-elevated)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla con talón elevado (heel-elevated)' AND eq.name = 'Barra olímpica'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla con talón elevado (heel-elevated)' AND eq.name = 'Mancuernas'
ON CONFLICT DO NOTHING;

-- Sentadilla overhead
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Sentadilla overhead' AND eq.name = 'Barra olímpica'
ON CONFLICT DO NOTHING;

-- Press con mancuernas en suelo (floor press)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press con mancuernas en suelo (floor press)' AND eq.name = 'Mancuernas'
ON CONFLICT DO NOTHING;

-- Press con banda (chest press banda)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Press con banda (chest press banda)' AND eq.name = 'Banda de resistencia'
ON CONFLICT DO NOTHING;

-- Push jerk
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Push jerk' AND eq.name = 'Barra olímpica'
ON CONFLICT DO NOTHING;

-- Remo con landmine
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo con landmine' AND eq.name = 'Landmine'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Remo con landmine' AND eq.name = 'Barra olímpica'
ON CONFLICT DO NOTHING;

-- Ab wheel de pie (standing rollout)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Ab wheel de pie (standing rollout)' AND eq.name = 'Rueda de abdominales'
ON CONFLICT DO NOTHING;

-- Máquina de aductores (hip adduction machine)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Máquina de aductores (hip adduction machine)' AND eq.name = 'Máquina de aducción/abducción'
ON CONFLICT DO NOTHING;

-- Tibialis raise (tib raise)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Tibialis raise (tib raise)' AND eq.name = 'Banda de resistencia'
ON CONFLICT DO NOTHING;

-- Wrist extension (extensión de muñeca)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Wrist extension (extensión de muñeca)' AND eq.name = 'Mancuernas'
ON CONFLICT DO NOTHING;

-- Grip/farmer hold específico
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Grip/farmer hold específico' AND eq.name = 'Mancuernas'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Grip/farmer hold específico' AND eq.name = 'Kettlebell'
ON CONFLICT DO NOTHING;

-- Flexo-extensión de cuello (neck flexion/extension)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Flexo-extensión de cuello (neck flexion/extension)' AND eq.name = 'Banda de resistencia'
ON CONFLICT DO NOTHING;

-- JM press / close-grip press
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'JM press / close-grip press' AND eq.name = 'Barra olímpica'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'JM press / close-grip press' AND eq.name = 'Barra EZ'
ON CONFLICT DO NOTHING;

-- Power clean
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Power clean' AND eq.name = 'Barra olímpica'
ON CONFLICT DO NOTHING;
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, FALSE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Power clean' AND eq.name = 'Disco olímpico'
ON CONFLICT DO NOTHING;

-- Hang power clean
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Hang power clean' AND eq.name = 'Barra olímpica'
ON CONFLICT DO NOTHING;

-- Power snatch
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Power snatch' AND eq.name = 'Barra olímpica'
ON CONFLICT DO NOTHING;

-- High pull (jalón alto explosivo)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'High pull (jalón alto explosivo)' AND eq.name = 'Barra olímpica'
ON CONFLICT DO NOTHING;

-- Depth jump (salto de profundidad)
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Depth jump (salto de profundidad)' AND eq.name = 'Caja pliométrica'
ON CONFLICT DO NOTHING;

-- Medicine ball slam/throw
INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required)
SELECT e.id, eq.id, TRUE FROM exercises e, equipment_items eq
WHERE e.nombre = 'Medicine ball slam/throw' AND eq.name = 'Balón medicinal'
ON CONFLICT DO NOTHING;


-- ============================================================
-- SECCIÓN 3 — MUSCLE ASSIGNMENTS
-- ============================================================


-- Glute-ham raise (GHR)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Glute-ham raise (GHR)' AND m.name IN ('Isquiotibiales', 'Glúteo mayor', 'Erector espinal')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Glute-ham raise (GHR)' AND m.name IN ('Multífidos')
ON CONFLICT DO NOTHING;

-- Back extension 45° (Roman chair)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Back extension 45° (Roman chair)' AND m.name IN ('Erector espinal', 'Glúteo mayor')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Back extension 45° (Roman chair)' AND m.name IN ('Isquiotibiales')
ON CONFLICT DO NOTHING;

-- Reverse hyperextension
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Reverse hyperextension' AND m.name IN ('Glúteo mayor', 'Isquiotibiales')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Reverse hyperextension' AND m.name IN ('Erector espinal')
ON CONFLICT DO NOTHING;

-- Peso muerto con trap bar (hex bar)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto con trap bar (hex bar)' AND m.name IN ('Cuádriceps', 'Glúteo mayor', 'Isquiotibiales')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Peso muerto con trap bar (hex bar)' AND m.name IN ('Erector espinal', 'Trapecio superior')
ON CONFLICT DO NOTHING;

-- Sentadilla con talón elevado (heel-elevated)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla con talón elevado (heel-elevated)' AND m.name IN ('Cuádriceps')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla con talón elevado (heel-elevated)' AND m.name IN ('Glúteo mayor')
ON CONFLICT DO NOTHING;

-- Sentadilla overhead
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla overhead' AND m.name IN ('Cuádriceps', 'Glúteo mayor')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Sentadilla overhead' AND m.name IN ('Core', 'Deltoides')
ON CONFLICT DO NOTHING;

-- Press con mancuernas en suelo (floor press)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press con mancuernas en suelo (floor press)' AND m.name IN ('Pectoral mayor (porción esternal)')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press con mancuernas en suelo (floor press)' AND m.name IN ('Tríceps braquial')
ON CONFLICT DO NOTHING;

-- Press con banda (chest press banda)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Press con banda (chest press banda)' AND m.name IN ('Pectoral mayor (porción esternal)')
ON CONFLICT DO NOTHING;

-- Push jerk
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push jerk' AND m.name IN ('Deltoides')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Push jerk' AND m.name IN ('Tríceps braquial', 'Cuádriceps')
ON CONFLICT DO NOTHING;

-- Remo con landmine
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con landmine' AND m.name IN ('Dorsal ancho', 'Trapecio medio')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Remo con landmine' AND m.name IN ('Romboides')
ON CONFLICT DO NOTHING;

-- Ab wheel de pie (standing rollout)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Ab wheel de pie (standing rollout)' AND m.name IN ('Recto abdominal', 'Transverso abdominal')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Ab wheel de pie (standing rollout)' AND m.name IN ('Oblicuo externo')
ON CONFLICT DO NOTHING;

-- Máquina de aductores (hip adduction machine)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Máquina de aductores (hip adduction machine)' AND m.name IN ('Aductores')
ON CONFLICT DO NOTHING;

-- Tibialis raise (tib raise)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Tibialis raise (tib raise)' AND m.name IN ('Tibial anterior')
ON CONFLICT DO NOTHING;

-- Wrist extension (extensión de muñeca)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Wrist extension (extensión de muñeca)' AND m.name IN ('Extensores del antebrazo')
ON CONFLICT DO NOTHING;

-- Grip/farmer hold específico
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Grip/farmer hold específico' AND m.name IN ('Flexores del antebrazo')
ON CONFLICT DO NOTHING;

-- Flexo-extensión de cuello (neck flexion/extension)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Flexo-extensión de cuello (neck flexion/extension)' AND m.name IN ('Flexores cervicales', 'Extensores cervicales')
ON CONFLICT DO NOTHING;

-- JM press / close-grip press
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'JM press / close-grip press' AND m.name IN ('Tríceps braquial')
ON CONFLICT DO NOTHING;

-- Power clean
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Power clean' AND m.name IN ('Glúteo mayor', 'Isquiotibiales', 'Trapecio superior')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Power clean' AND m.name IN ('Cuádriceps')
ON CONFLICT DO NOTHING;

-- Hang power clean
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Hang power clean' AND m.name IN ('Glúteo mayor', 'Isquiotibiales', 'Trapecio superior')
ON CONFLICT DO NOTHING;

-- Power snatch
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Power snatch' AND m.name IN ('Glúteo mayor', 'Isquiotibiales', 'Deltoides')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Power snatch' AND m.name IN ('Trapecio superior')
ON CONFLICT DO NOTHING;

-- High pull (jalón alto explosivo)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'High pull (jalón alto explosivo)' AND m.name IN ('Trapecio superior', 'Deltoides')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'High pull (jalón alto explosivo)' AND m.name IN ('Glúteo mayor')
ON CONFLICT DO NOTHING;

-- Depth jump (salto de profundidad)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Depth jump (salto de profundidad)' AND m.name IN ('Cuádriceps', 'Glúteo mayor')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Depth jump (salto de profundidad)' AND m.name IN ('Pantorrilla (gastrocnemio)')
ON CONFLICT DO NOTHING;

-- Broad jump (salto horizontal)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Broad jump (salto horizontal)' AND m.name IN ('Glúteo mayor', 'Isquiotibiales')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Broad jump (salto horizontal)' AND m.name IN ('Cuádriceps')
ON CONFLICT DO NOTHING;

-- Medicine ball slam/throw
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Medicine ball slam/throw' AND m.name IN ('Core', 'Dorsal ancho')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Medicine ball slam/throw' AND m.name IN ('Deltoides')
ON CONFLICT DO NOTHING;

-- Pogo hops / bounding
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Pogo hops / bounding' AND m.name IN ('Pantorrilla (gastrocnemio)', 'Sóleo')
ON CONFLICT DO NOTHING;

-- World's greatest stretch
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'World''s greatest stretch' AND m.name IN ('Cadera', 'Isquiotibiales')
ON CONFLICT DO NOTHING;
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'secundario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'World''s greatest stretch' AND m.name IN ('Columna torácica')
ON CONFLICT DO NOTHING;

-- Cat-camel (gato-camello)
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Cat-camel (gato-camello)' AND m.name IN ('Erector espinal', 'Columna')
ON CONFLICT DO NOTHING;

-- Rotación torácica cuadrupedia
INSERT INTO exercise_muscles (exercise_id, muscle_id, role)
SELECT e.id, m.id, 'primario' FROM exercises e, muscle_groups m
WHERE e.nombre = 'Rotación torácica cuadrupedia' AND m.name IN ('Columna torácica')
ON CONFLICT DO NOTHING;



-- ============================================================
-- SECCIÓN 4 — DUPLICADOS RESUELTOS (UPDATE, no INSERT)
-- Ver zyfit-ejercicios-nuevos-gap-fill.md instrucción final + confirmación
-- del usuario en la sesión de planificación.
-- ============================================================

-- "Elevación lateral en polea (cable lateral raise)" del doc == ya existía
-- como "Elevaciones laterales en polea baja". Se actualiza el existente en
-- vez de insertar un duplicado.
UPDATE exercises SET
    evidence_score      = 4,
    evidence_rationale  = 'Score 4/5: mayor activación de deltoides lateral que cualquier press (~66% MVC, Boeckh-Behrens); tensión sostenida en polea baja favorece hipertrofia. Tag principal hipertrofia.',
    goal_tags           = '["hipertrofia"]'::jsonb,
    goal_primary        = 'hipertrofia',
    lengthened_bias      = TRUE,
    injury_risk_profile = 'bajo'
WHERE nombre = 'Elevaciones laterales en polea baja';

-- "Copenhagen adduction (progresión con carga)" del doc == ya existía como
-- "Plancha de Copenhague" (isométrica, peso corporal). Se actualiza el
-- registro existente agregando los campos de evidencia y ampliando la
-- descripción para cubrir la progresión con carga externa (banda/disco/chaleco).
UPDATE exercises SET
    description = description || ' Progresión con carga: una vez dominada la versión isométrica de peso corporal, se puede progresar con una banda de resistencia alrededor de la pierna inferior, un disco sostenido contra el pecho, o un chaleco lastrado, para seguir sobrecargando el patrón de aducción.',
    evidence_score      = 3,
    evidence_rationale  = 'Score 3/5: incrementa la activación EMG de aductores hasta 108% MVIC (Schaber et al. 2021) y mejora fuerza excéntrica de aducción — evidencia de nicho pero consistente. Tag principal salud_general (prevención de lesiones de ingle).',
    goal_tags           = '["rendimiento", "salud_general"]'::jsonb,
    goal_primary        = 'salud_general',
    lengthened_bias      = TRUE,
    injury_risk_profile = 'moderado'
WHERE nombre = 'Plancha de Copenhague';
