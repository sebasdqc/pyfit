"""Seed de la taxonomía curada de competencias de Zyfit Academy.

Curada a mano contra el catálogo real (7 escuelas / 30 cursos / 126 módulos),
NO generada libremente por la IA de tagging — así el grafo de competencias
queda consistente (nombres/granularidad estables) y `tag_lesson_competencies`
solo puede clasificar contra esta lista cerrada, nunca inventar una nueva.

Dos grupos, en el orden en que aparecen abajo:
  1. Competencias TRANSVERSALES (orden 1-10): aparecen en 3+ escuelas — son el
     núcleo del "grafo cruza escuelas" (ej. una lección de nutrición y una de
     recuperación pueden compartir "individualización basada en datos").
  2. Competencias ESPECÍFICAS por escuela (orden 11+): dan granularidad al
     contenido propio de cada escuela que no encaja en una transversal.

Idempotente: `update_or_create` por `slug`, mismo patrón que
`seed_academy_badges`. Retirar una competencia = marcarla `activo=False` acá
(nunca borrar la fila, para no romper `LessonCompetencyTag`/
`StudentCompetencyMastery` ya existentes).

Uso:
    python manage.py seed_academy_competencies
"""

from django.core.management.base import BaseCommand

from academy.competency_models import Competency

COMPETENCIAS = [
    # ─── Transversales (3+ escuelas) ───────────────────────────────────────
    {
        'slug': 'pensamiento-critico-basado-en-evidencia',
        'nombre': 'Pensamiento crítico basado en evidencia',
        'descripcion': (
            'Distinguir evidencia sólida de mitos, anécdotas o hallazgos '
            'sobrevalorados en ciencia del deporte, nutrición y negocio.'
        ),
        'orden': 1,
    },
    {
        'slug': 'periodizacion-y-gestion-de-carga',
        'nombre': 'Periodización y gestión de la carga',
        'descripcion': 'Diseñar y ajustar la carga de entrenamiento a lo largo del tiempo.',
        'orden': 2,
    },
    {
        'slug': 'monitoreo-y-decisiones-con-datos',
        'nombre': 'Monitoreo y decisiones basadas en datos',
        'descripcion': (
            'Usar métricas objetivas (carga interna/externa, HRV, GPS) para '
            'decidir, sin sobre-interpretar la herramienta.'
        ),
        'orden': 3,
    },
    {
        'slug': 'individualizacion-basada-en-datos',
        'nombre': 'Individualización basada en datos',
        'descripcion': 'Adaptar el programa o la decisión a la persona real, no a la media poblacional.',
        'orden': 4,
    },
    {
        'slug': 'prevencion-y-gestion-del-riesgo-de-lesion',
        'nombre': 'Prevención y gestión del riesgo de lesión',
        'descripcion': 'Detectar y mitigar factores de riesgo antes de que se conviertan en lesión.',
        'orden': 5,
    },
    {
        'slug': 'readaptacion-tras-lesion',
        'nombre': 'Readaptación tras lesión',
        'descripcion': 'Acompañar el retorno físico y psicológico seguro tras una lesión.',
        'orden': 6,
    },
    {
        'slug': 'bienestar-y-carga-psicologica-del-atleta',
        'nombre': 'Bienestar y carga psicológica del atleta',
        'descripcion': 'Monitorear y responder al estado psicológico/emocional del deportista.',
        'orden': 7,
    },
    {
        'slug': 'comunicacion-y-adherencia-del-cliente',
        'nombre': 'Comunicación y adherencia del cliente',
        'descripcion': 'Traducir la ciencia en mensajes y hábitos que el cliente realmente sostiene.',
        'orden': 8,
    },
    {
        'slug': 'etica-y-responsabilidad-profesional',
        'nombre': 'Ética y responsabilidad profesional',
        'descripcion': 'Actuar dentro del alcance de práctica y gestionar el riesgo legal/ético.',
        'orden': 9,
    },
    {
        'slug': 'adaptacion-a-poblaciones-especiales',
        'nombre': 'Adaptación a poblaciones especiales',
        'descripcion': 'Ajustar principios de entrenamiento a condiciones de salud o etapas de vida particulares.',
        'orden': 10,
    },

    # ─── Ciencia del Entrenamiento ─────────────────────────────────────────
    {'slug': 'modelos-de-periodizacion', 'nombre': 'Modelos de periodización (lineal/ondulada/polarizada)',
     'descripcion': 'Diferencias, ventajas y contextos de uso de cada modelo de periodización.', 'orden': 11},
    {'slug': 'mev-mav-mrv-y-progresion-de-volumen', 'nombre': 'MEV/MAV/MRV y progresión de volumen',
     'descripcion': 'El marco de volumen mínimo/máximo adaptativo/máximo recuperable y su progresión semanal.', 'orden': 12},
    {'slug': 'fatiga-acumulada-y-sobreentrenamiento', 'nombre': 'Fatiga acumulada y señales de sobreentrenamiento',
     'descripcion': 'Reconocer fatiga acumulada y las señales tempranas de sobreentrenamiento.', 'orden': 13},
    {'slug': 'diseno-de-semanas-de-deload', 'nombre': 'Diseño de semanas de deload',
     'descripcion': 'Cuándo y cómo programar una descarga dentro de un ciclo de entrenamiento.', 'orden': 14},
    {'slug': 'entrenamiento-concurrente', 'nombre': 'Entrenamiento concurrente (fuerza + resistencia)',
     'descripcion': 'El efecto interferencia y cómo secuenciar fuerza y resistencia en el mismo bloque.', 'orden': 15},

    # ─── Analítica y Rendimiento Deportivo ─────────────────────────────────
    {'slug': 'srpe-y-trimp-carga-interna', 'nombre': 'sRPE y TRIMP (carga interna)',
     'descripcion': 'Medir e interpretar la carga interna vía percepción del esfuerzo.', 'orden': 16},
    {'slug': 'acwr-y-picos-de-carga', 'nombre': 'ACWR y picos de carga',
     'descripcion': 'El índice agudo:crónico, sus límites metodológicos y su uso práctico real.', 'orden': 17},
    {'slug': 'metricas-gps-y-analisis-de-movimiento', 'nombre': 'Métricas GPS y análisis de movimiento',
     'descripcion': 'Qué mide bien y qué mide mal el GPS, umbrales absolutos vs. individualizados.', 'orden': 18},
    {'slug': 'uso-responsable-de-scores-compuestos', 'nombre': 'Uso responsable de scores compuestos',
     'descripcion': 'Interpretar y comunicar un score compuesto (ej. Zyfit Score) sin tratarlo como oráculo.', 'orden': 19},

    # ─── Recuperación, Prevención y Wellness ───────────────────────────────
    {'slug': 'hrv-y-monitoreo-de-recuperacion', 'nombre': 'HRV y monitoreo de la recuperación',
     'descripcion': 'Medir e interpretar la variabilidad de la frecuencia cardíaca día a día.', 'orden': 20},
    {'slug': 'sueno-y-rendimiento-deportivo', 'nombre': 'Sueño y rendimiento deportivo',
     'descripcion': 'Privación/extensión de sueño y su evidencia real sobre el rendimiento.', 'orden': 21},
    {'slug': 'cuestionarios-de-wellness-y-sus-limites', 'nombre': 'Cuestionarios de wellness y sus límites',
     'descripcion': 'Qué tan sólida es la herramienta de autorreporte de bienestar más usada, y cómo no sobre-interpretarla.', 'orden': 22},
    {'slug': 'modelo-de-estres-y-lesion', 'nombre': 'Modelo de estrés y lesión',
     'descripcion': 'La conexión real entre carga psicológica y riesgo de lesión física.', 'orden': 23},

    # ─── Fisiología y Nutrición Aplicada ────────────────────────────────────
    {'slug': 'bioenergetica-y-sistemas-energeticos', 'nombre': 'Bioenergética y sistemas energéticos',
     'descripcion': 'ATP-PC, sistema glucolítico y sistema oxidativo — cuándo se activa cada uno.', 'orden': 24},
    {'slug': 'composicion-corporal-y-recomposicion', 'nombre': 'Composición corporal y recomposición',
     'descripcion': 'Medición jerárquica de composición corporal y manipulación basada en datos de seguimiento.', 'orden': 25},
    {'slug': 'mitos-de-nutricion-deportiva', 'nombre': 'Mitos de nutrición deportiva',
     'descripcion': 'Ventana anabólica, disponibilidad de glucógeno y otros mitos frente a la evidencia real.', 'orden': 26},
    {'slug': 'jerarquia-de-evidencia-en-suplementacion', 'nombre': 'Jerarquía de evidencia en suplementación',
     'descripcion': 'Clasificar suplementos según la solidez real de su evidencia.', 'orden': 27},
    {'slug': 'hidratacion-y-termorregulacion', 'nombre': 'Hidratación y termorregulación',
     'descripcion': 'Umbrales de deshidratación, riesgo de hiponatremia y estrategias de hidratación planificada.', 'orden': 28},

    # ─── Psicología del Rendimiento ────────────────────────────────────────
    {'slug': 'motivacion-y-activacion-deportiva', 'nombre': 'Motivación y activación deportiva',
     'descripcion': 'Por qué compite realmente un atleta y cómo se relaciona activación con rendimiento.', 'orden': 29},
    {'slug': 'ansiedad-competitiva', 'nombre': 'Ansiedad competitiva',
     'descripcion': 'Diferenciar y manejar la ansiedad cognitiva de la somática antes de competir.', 'orden': 30},
    {'slug': 'rutinas-mentales-y-visualizacion', 'nombre': 'Rutinas mentales y visualización',
     'descripcion': 'Diseño de rutinas pre-competitivas y visualización con evidencia real (modelo PETTLEP).', 'orden': 31},
    {'slug': 'foco-atencional-bajo-presion', 'nombre': 'Foco atencional bajo presión',
     'descripcion': 'Estrategias de atención visual y mental en momentos de alta presión competitiva.', 'orden': 32},
    {'slug': 'cohesion-de-equipo-y-liderazgo', 'nombre': 'Cohesión de equipo y liderazgo',
     'descripcion': 'Dinámica de grupo, pereza social y el rol y límites del liderazgo del entrenador.', 'orden': 33},
    {'slug': 'kinesiofobia-y-miedo-al-movimiento', 'nombre': 'Kinesiofobia y miedo al movimiento',
     'descripcion': 'El miedo a moverse que puede perpetuar el riesgo tras una lesión.', 'orden': 34},
    {'slug': 'acl-rsi-y-prediccion-de-retorno', 'nombre': 'ACL-RSI y predicción de retorno al deporte',
     'descripcion': 'Qué tan bien predicen las escalas psicológicas el retorno seguro al deporte.', 'orden': 35},

    # ─── Poblaciones Especiales y Salud Clínica ────────────────────────────
    {'slug': 'rehabilitacion-cardiovascular-y-metabolica', 'nombre': 'Rehabilitación cardiovascular y metabólica',
     'descripcion': 'Ejercicio como rehabilitación en enfermedad cardiovascular y control glucémico en diabetes tipo 2.', 'orden': 36},
    {'slug': 'ejercicio-oncologico', 'nombre': 'Ejercicio oncológico',
     'descripcion': 'Ejercicio seguro durante y después del tratamiento oncológico.', 'orden': 37},
    {'slug': 'sarcopenia-y-envejecimiento-activo', 'nombre': 'Sarcopenia y envejecimiento activo',
     'descripcion': 'Diagnóstico de sarcopenia y entrenamiento de fuerza/potencia en adultos mayores.', 'orden': 38},
    {'slug': 'prevencion-de-caidas', 'nombre': 'Prevención de caídas',
     'descripcion': 'Qué tipo de ejercicio previene caídas en adultos mayores, y cuál no.', 'orden': 39},
    {'slug': 'ejercicio-en-embarazo-y-postparto', 'nombre': 'Ejercicio en embarazo y postparto',
     'descripcion': 'Seguridad real del ejercicio en embarazo, y diástasis/piso pélvico en postparto.', 'orden': 40},
    {'slug': 'entrenamiento-de-fuerza-en-poblacion-pediatrica', 'nombre': 'Entrenamiento de fuerza en población pediátrica',
     'descripcion': 'Seguridad del entrenamiento de fuerza en niños y adolescentes frente al mito de que detiene el crecimiento.', 'orden': 41},
    {'slug': 'entrenamiento-adaptado-a-la-discapacidad', 'nombre': 'Entrenamiento adaptado a la discapacidad',
     'descripcion': 'Guías de ejercicio para lesión medular y riesgos específicos como la autodisreflexia.', 'orden': 42},

    # ─── Negocio, Coaching y Marca Profesional ─────────────────────────────
    {'slug': 'marca-personal-para-profesionales-del-deporte', 'nombre': 'Marca personal para profesionales del deporte',
     'descripcion': 'Diferenciación, especialización y autenticidad como pilares de marca personal.', 'orden': 43},
    {'slug': 'modelos-de-precio-y-retencion-de-clientes', 'nombre': 'Modelos de precio y retención de clientes',
     'descripcion': 'Precio por hora vs. basado en valor, y qué realmente retiene a un cliente.', 'orden': 44},
    {'slug': 'entrevista-motivacional', 'nombre': 'Entrevista motivacional',
     'descripcion': 'Técnica de conversación para facilitar el cambio de comportamiento del cliente.', 'orden': 45},
    {'slug': 'framing-de-mensajes-y-cambio-de-comportamiento', 'nombre': 'Framing de mensajes y cambio de comportamiento',
     'descripcion': 'Ganancia vs. pérdida, y qué combinaciones de autorregistro y metas funcionan realmente.', 'orden': 46},
    {'slug': 'escalabilidad-de-servicios-de-coaching', 'nombre': 'Escalabilidad de servicios de coaching',
     'descripcion': 'Cómo escalar un servicio de entrenamiento sin perder calidad.', 'orden': 47},
    {'slug': 'alcance-de-practica-y-limites-legales', 'nombre': 'Alcance de práctica y límites legales',
     'descripcion': 'Negligencia, deber de cuidado y qué protege realmente un descargo de responsabilidad.', 'orden': 48},
]


class Command(BaseCommand):
    help = 'Crea (o sincroniza) la taxonomía curada de competencias de Zyfit Academy.'

    def handle(self, *args, **options):
        creadas = actualizadas = 0
        for data in COMPETENCIAS:
            data = dict(data)
            slug = data.pop('slug')
            competency, created = Competency.objects.update_or_create(
                slug=slug, defaults=data,
            )
            creadas += created
            actualizadas += not created
            tag = 'CREADA' if created else 'ACTUALIZADA'
            self.stdout.write(f'  Competencia {tag}: {competency.nombre}')

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Seed completado: {creadas} creadas, {actualizadas} actualizadas '
            f'({len(COMPETENCIAS)} en la taxonomía).'
        ))
