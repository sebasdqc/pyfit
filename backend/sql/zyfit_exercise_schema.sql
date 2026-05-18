-- ============================================================
-- ZYFIT — Exercise Database Schema (satellite tables only)
-- The `exercises` table is managed by Django migrations.
-- Run this script AFTER running Django migrations.
-- Director: Research & Sports Science
-- Version: 1.1
-- ============================================================

-- ============================================================
-- 1. MUSCLE GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS muscle_groups (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    anatomical_group VARCHAR(50) NOT NULL,
    notes           TEXT
);

-- ============================================================
-- 2. EQUIPMENT ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS equipment_items (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    category        VARCHAR(50) NOT NULL,
    is_gym_only     BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- 3. CONTRAINDICATION CATEGORIES
-- Severity: 'grave' = absolute contraindication
--           'leve'  = relative contraindication (with modification)
-- ============================================================
CREATE TABLE IF NOT EXISTS contraindication_categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    body_zone       VARCHAR(50) NOT NULL,
    severity        VARCHAR(10) NOT NULL CHECK (severity IN ('leve', 'grave')),
    description     TEXT NOT NULL
);

-- ============================================================
-- 4. EXERCISE ↔ MUSCLE GROUPS (Bridge)
-- ============================================================
CREATE TABLE IF NOT EXISTS exercise_muscles (
    exercise_id     INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_id       INT NOT NULL REFERENCES muscle_groups(id) ON DELETE RESTRICT,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('primario', 'secundario', 'estabilizador')),
    PRIMARY KEY (exercise_id, muscle_id)
);

-- ============================================================
-- 5. EXERCISE ↔ EQUIPMENT (Bridge)
-- ============================================================
CREATE TABLE IF NOT EXISTS exercise_equipment (
    exercise_id     INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    equipment_id    INT NOT NULL REFERENCES equipment_items(id) ON DELETE RESTRICT,
    is_required     BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (exercise_id, equipment_id)
);

-- ============================================================
-- 6. EXERCISE ↔ CONTRAINDICATIONS (Bridge)
-- ============================================================
CREATE TABLE IF NOT EXISTS exercise_contraindications (
    exercise_id             INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    contraindication_id     INT NOT NULL REFERENCES contraindication_categories(id) ON DELETE RESTRICT,
    notes                   TEXT,
    PRIMARY KEY (exercise_id, contraindication_id)
);

-- ============================================================
-- 7. EXERCISE RELATIONSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS exercise_relationships (
    id                  SERIAL PRIMARY KEY,
    source_exercise_id  INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    target_exercise_id  INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    relationship_type   VARCHAR(30) NOT NULL CHECK (relationship_type IN (
                            'harder',
                            'easier',
                            'unilateral_version',
                            'equipment_alternative',
                            'variant'
                        )),
    notes               TEXT,
    CONSTRAINT no_self_reference CHECK (source_exercise_id <> target_exercise_id),
    UNIQUE (source_exercise_id, target_exercise_id, relationship_type)
);

-- ============================================================
-- INDEXES — Query performance for the algorithm
-- ============================================================

-- exercises table — column names as defined by Django models
CREATE INDEX IF NOT EXISTS idx_exercises_movement_pattern  ON exercises(patron_movimiento);
CREATE INDEX IF NOT EXISTS idx_exercises_technical_level   ON exercises(technical_level);
CREATE INDEX IF NOT EXISTS idx_exercises_systemic_fatigue  ON exercises(systemic_fatigue);
CREATE INDEX IF NOT EXISTS idx_exercises_bilateral         ON exercises(bilateral);

-- Satellite tables
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_exercise   ON exercise_muscles(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_muscle     ON exercise_muscles(muscle_id);

CREATE INDEX IF NOT EXISTS idx_exercise_equipment_exercise ON exercise_equipment(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_equipment_required ON exercise_equipment(equipment_id, is_required);

CREATE INDEX IF NOT EXISTS idx_exercise_contra_exercise    ON exercise_contraindications(exercise_id);
CREATE INDEX IF NOT EXISTS idx_contraindication_zone       ON contraindication_categories(body_zone);
CREATE INDEX IF NOT EXISTS idx_contraindication_severity   ON contraindication_categories(severity);

CREATE INDEX IF NOT EXISTS idx_exercise_rel_source         ON exercise_relationships(source_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_rel_type           ON exercise_relationships(relationship_type);

-- ============================================================
-- VIEW: v_exercise_full
-- Central view for algorithm queries.
-- Column names use Django's Spanish naming for the exercises table.
-- Use this view in the adaptive engine, NOT raw table joins.
-- ============================================================
CREATE OR REPLACE VIEW v_exercise_full AS
SELECT
    e.id,
    e.nombre,
    e.patron_movimiento,
    e.bilateral,
    e.es_compuesto,
    e.dificultad,
    e.technical_level,
    e.error_risk,
    e.space_required,
    e.systemic_fatigue,
    e.set_duration_seconds,
    e.rest_seconds_default,
    (e.set_duration_seconds + e.rest_seconds_default) AS total_set_seconds,
    e.description,
    e.coaching_cues,

    -- Muscles: arrays aggregated by role
    ARRAY_AGG(DISTINCT mg_p.name)  FILTER (WHERE em_p.role  = 'primario')       AS primary_muscles,
    ARRAY_AGG(DISTINCT mg_s.name)  FILTER (WHERE em_s.role  = 'secundario')     AS secondary_muscles,
    ARRAY_AGG(DISTINCT mg_st.name) FILTER (WHERE em_st.role = 'estabilizador')  AS stabilizer_muscles,

    -- Equipment: required items
    ARRAY_AGG(DISTINCT eq.name) FILTER (WHERE exe.is_required = TRUE)           AS required_equipment,

    -- Contraindications: separated by severity
    ARRAY_AGG(DISTINCT cc_g.name) FILTER (WHERE cc_g.severity = 'grave')        AS contraindications_grave,
    ARRAY_AGG(DISTINCT cc_l.name) FILTER (WHERE cc_l.severity = 'leve')         AS contraindications_leve

FROM exercises e

LEFT JOIN exercise_muscles em_p   ON e.id = em_p.exercise_id  AND em_p.role  = 'primario'
LEFT JOIN muscle_groups mg_p      ON em_p.muscle_id  = mg_p.id

LEFT JOIN exercise_muscles em_s   ON e.id = em_s.exercise_id  AND em_s.role  = 'secundario'
LEFT JOIN muscle_groups mg_s      ON em_s.muscle_id  = mg_s.id

LEFT JOIN exercise_muscles em_st  ON e.id = em_st.exercise_id AND em_st.role = 'estabilizador'
LEFT JOIN muscle_groups mg_st     ON em_st.muscle_id = mg_st.id

LEFT JOIN exercise_equipment exe  ON e.id = exe.exercise_id   AND exe.is_required = TRUE
LEFT JOIN equipment_items eq      ON exe.equipment_id = eq.id

LEFT JOIN exercise_contraindications ec_g ON e.id = ec_g.exercise_id
LEFT JOIN contraindication_categories cc_g ON ec_g.contraindication_id = cc_g.id AND cc_g.severity = 'grave'

LEFT JOIN exercise_contraindications ec_l ON e.id = ec_l.exercise_id
LEFT JOIN contraindication_categories cc_l ON ec_l.contraindication_id = cc_l.id AND cc_l.severity = 'leve'

WHERE e.activo = TRUE
GROUP BY e.id;

-- ============================================================
-- SEED DATA: Contraindication Categories
-- ============================================================
INSERT INTO contraindication_categories (name, body_zone, severity, description) VALUES

-- COLUMNA
('Dolor lumbar agudo',          'Columna', 'grave', 'Fase inflamatoria activa L1-S1. Todo ejercicio con carga axial o flexión/extensión lumbar está absolutamente contraindicado.'),
('Hernia discal lumbar activa', 'Columna', 'grave', 'Protrusión/extrusión con síntomas neurológicos. Contraindicación absoluta para cargas compresivas y flexión lumbar.'),
('Dolor lumbar crónico',        'Columna', 'leve',  'Dolor lumbar no específico persistente >12 semanas sin fase aguda. Ejercicio adaptado es terapéutico; evitar cargas axiales máximas.'),
('Escoliosis severa',           'Columna', 'leve',  'Curva >40°. Evitar cargas asimétricas y torsión. Ejercicio bilateral controlado puede ser beneficioso.'),
('Estenosis espinal',           'Columna', 'leve',  'Reducción del canal vertebral. Contraindicación para extensión lumbar bajo carga; flexión generalmente tolerada.'),
('Cirugía de columna reciente', 'Columna', 'grave', 'Período post-quirúrgico <6 meses. Clearance médico obligatorio antes de cualquier ejercicio con carga.'),

-- RODILLA
('Dolor anterior de rodilla',   'Rodilla', 'leve',  'Síndrome patelofemoral. Evitar flexión >90° bajo carga, sentadillas profundas y ejercicios con rodilla sobre punta del pie.'),
('Rotura de ligamento (LCA/LCP)','Rodilla','grave', 'Post-rotura sin reconstrucción o en fase aguda post-quirúrgica. Contraindicación absoluta para ejercicios de pivote y carga.'),
('Meniscopatía aguda',          'Rodilla', 'grave', 'Desgarro meniscal con síntomas agudos. Contraindicación para carga compresiva y torsión de rodilla.'),
('Artrosis de rodilla',         'Rodilla', 'leve',  'Degeneración cartilaginosa. Contraindicación relativa para impacto repetido; ejercicio de bajo impacto es terapéutico.'),
('Bursitis de rodilla',         'Rodilla', 'leve',  'Inflamación de bursa. Evitar compresión directa y flexión extrema hasta resolución.'),

-- HOMBRO
('Dolor de hombro agudo',       'Hombro', 'grave',  'Fase inflamatoria aguda. Contraindicación para todo movimiento de hombro con carga.'),
('Manguito rotador lesionado',  'Hombro', 'grave',  'Desgarro parcial o completo. Contraindicación para empuje/jalón overhead y rotaciones con resistencia.'),
('Inestabilidad glenohumeral',  'Hombro', 'leve',   'Laxitud capsular o historial de luxación. Evitar posiciones de abducción+rotación externa bajo carga (posición de riesgo).'),
('Síndrome de impingement',     'Hombro', 'leve',   'Compresión subacromial. Contraindicación relativa para press overhead y jalones detrás del cuello.'),
('Cirugía de hombro reciente',  'Hombro', 'grave',  'Post-quirúrgico <6 meses. Clearance médico y fisioterapia previa obligatorios.'),

-- MUÑECA
('Dolor de muñeca agudo',       'Muñeca', 'grave',  'Fase inflamatoria. Contraindicación para cualquier ejercicio con carga en muñeca.'),
('Síndrome del túnel carpiano', 'Muñeca', 'leve',   'Compresión del nervio mediano. Evitar extensión de muñeca bajo carga prolongada (ej. planchas, press).'),
('Tendinitis de muñeca',        'Muñeca', 'leve',   'Inflamación tendinosa. Reducir ROM y carga en ejercicios que impliquen agarre o extensión/flexión de muñeca.'),

-- CADERA
('Dolor de cadera agudo',       'Cadera', 'grave',  'Fase inflamatoria activa. Contraindicación para toda carga en cadera.'),
('Impingement femoroacetabular','Cadera', 'leve',   'Choque entre cabeza femoral y acetábulo. Evitar flexión de cadera >90° bajo carga y adducción en carga.'),
('Artrosis de cadera',          'Cadera', 'leve',   'Degeneración articular. Contraindicación relativa para impacto; ejercicio de bajo impacto es terapéutico.'),
('Prótesis de cadera',          'Cadera', 'grave',  'Riesgo de luxación de prótesis. Contraindicación absoluta para flexión >90°, adducción cruzada y rotación interna forzada.'),

-- TOBILLO
('Esguince de tobillo agudo',   'Tobillo','grave',  'Fase aguda <72h. Contraindicación para carga en bipedestación y ejercicios de impacto.'),
('Inestabilidad crónica de tobillo','Tobillo','leve','Esguinces recurrentes con laxitud ligamentosa. Precaución en ejercicios de equilibrio y cambios de dirección.'),

-- GENERAL / SISTÉMICO
('Embarazo',                    'General','leve',   'Modificaciones específicas por trimestre. Contraindicados: ejercicios en decúbito supino >T2, Valsalva, alto impacto, riesgo de traumatismo.'),
('Hipertensión no controlada',  'General','grave',  'PA >180/110 sin tratamiento. Contraindicación absoluta para ejercicios isométricos máximos y Valsalva.'),
('Hipertensión controlada',     'General','leve',   'Bajo medicación. Evitar Valsalva, ejercicios isométricos prolongados y pesos máximos.'),
('Osteoporosis severa',         'General','grave',  'T-score <-2.5. Contraindicación para impacto, torsión espinal y cargas axiales máximas.'),
('Mareo/vértigo',               'General','leve',   'Precaución en ejercicios que impliquen cambios rápidos de posición de la cabeza o inversión.'),
('Post-parto inmediato',        'General','grave',  '<6 semanas post-parto. Solo ejercicios de suelo pélvico y movilidad suave. Clearance médico obligatorio para carga.')

ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED DATA: Equipment Items
-- ============================================================
INSERT INTO equipment_items (name, category, is_gym_only) VALUES
('Ninguno (peso corporal)',          'Ninguno',   FALSE),
('Barra olímpica',                   'Libre',     FALSE),
('Barra EZ',                         'Libre',     FALSE),
('Barra fija (dominadas)',            'Libre',     FALSE),
('Mancuernas',                       'Libre',     FALSE),
('Kettlebell',                       'Libre',     FALSE),
('Disco olímpico',                   'Libre',     FALSE),
('Polea alta',                       'Cable',     TRUE),
('Polea baja',                       'Cable',     TRUE),
('Polea ajustable',                  'Cable',     TRUE),
('Máquina Smith',                    'Máquina',   TRUE),
('Máquina de cable cruzado',         'Máquina',   TRUE),
('Prensa de piernas',                'Máquina',   TRUE),
('Máquina de remo sentado',          'Máquina',   TRUE),
('Máquina de pecho',                 'Máquina',   TRUE),
('Máquina de hombros',               'Máquina',   TRUE),
('Máquina de extensión de piernas',  'Máquina',   TRUE),
('Máquina de curl de piernas',       'Máquina',   TRUE),
('Máquina de aducción/abducción',    'Máquina',   TRUE),
('Máquina de glúteos (hip thrust)',  'Máquina',   TRUE),
('Banco ajustable',                  'Accesorio', FALSE),
('Banco plano',                      'Accesorio', FALSE),
('Caja pliométrica',                 'Accesorio', FALSE),
('Banda de resistencia',             'Accesorio', FALSE),
('TRX / Suspensión',                 'Accesorio', FALSE),
('Rueda de abdominales',             'Accesorio', FALSE),
('Bosu',                             'Accesorio', FALSE),
('Step / Escalón',                   'Accesorio', FALSE),
('Paralelas (dips)',                  'Accesorio', FALSE),
('Barra de dominadas (puerta)',      'Accesorio', FALSE),
('Colchoneta',                       'Accesorio', FALSE)

ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED DATA: Muscle Groups
-- ============================================================
INSERT INTO muscle_groups (name, anatomical_group) VALUES
('Cuádriceps',                        'Pierna'),
('Isquiotibiales',                    'Pierna'),
('Glúteo mayor',                      'Pierna'),
('Glúteo medio',                      'Pierna'),
('Glúteo menor',                      'Pierna'),
('Aductores',                         'Pierna'),
('Abductores',                        'Pierna'),
('Pantorrilla (gastrocnemio)',         'Pierna'),
('Sóleo',                             'Pierna'),
('Tibial anterior',                   'Pierna'),
('Tensor de la fascia lata',          'Pierna'),
('Dorsal ancho',                      'Espalda'),
('Trapecio superior',                 'Espalda'),
('Trapecio medio',                    'Espalda'),
('Trapecio inferior',                 'Espalda'),
('Romboides',                         'Espalda'),
('Redondo mayor',                     'Espalda'),
('Redondo menor',                     'Espalda'),
('Infraespinoso',                     'Espalda'),
('Supraespinoso',                     'Espalda'),
('Erector espinal',                   'Espalda'),
('Multífidos',                        'Espalda'),
('Pectoral mayor (porción clavicular)','Pecho'),
('Pectoral mayor (porción esternal)', 'Pecho'),
('Pectoral menor',                    'Pecho'),
('Serrato anterior',                  'Pecho'),
('Deltoides anterior',                'Hombro'),
('Deltoides lateral',                 'Hombro'),
('Deltoides posterior',               'Hombro'),
('Subescapular',                      'Hombro'),
('Bíceps braquial',                   'Brazo'),
('Braquial',                          'Brazo'),
('Braquiorradial',                    'Brazo'),
('Tríceps braquial',                  'Brazo'),
('Flexores del antebrazo',            'Brazo'),
('Extensores del antebrazo',          'Brazo'),
('Recto abdominal',                   'Core'),
('Oblicuo externo',                   'Core'),
('Oblicuo interno',                   'Core'),
('Transverso abdominal',              'Core'),
('Cuadrado lumbar',                   'Core'),
('Psoas ilíaco',                      'Core')

ON CONFLICT (name) DO NOTHING;
