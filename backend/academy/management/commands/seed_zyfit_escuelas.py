"""Seed de las 9 Escuelas de Zyfit Academy (catálogo definitivo por ahora).

Jerarquía: Escuela → Curso → Módulo (sin contenido de lección — solo estructura
para los cursos nuevos que se definan aquí; los cursos ya existentes con
lecciones reales no se tocan salvo su asignación de escuela/metadatos).

Idempotente: re-ejecutar el comando sincroniza descripciones y módulos sin
duplicar registros. No toca lecciones, quizzes ni matrículas existentes.

Nota: en un entorno ya seedeado con las 3 escuelas originales, la migración de
datos `0013_reestructura_escuelas` es la que hace el renombre/reubicación real
la primera vez. Este comando sirve para entornos nuevos (bootstrap) y para
resincronizar descripciones/orden más adelante.

Uso:
    python manage.py seed_zyfit_escuelas
    python manage.py seed_zyfit_escuelas --publicar  # publica los cursos con módulos definidos aquí
"""

from django.core.management.base import BaseCommand

from academy.models import Course, Module, School, NIVEL_PRINCIPIANTE, NIVEL_INTERMEDIO, NIVEL_AVANZADO

ESCUELAS = [
    {
        'nombre': 'Entrenamiento y Rendimiento Deportivo',
        'slug': 'entrenamiento-y-rendimiento-deportivo',
        'descripcion': (
            'Bases científicas de la programación del entrenamiento: periodización, '
            'gestión de la carga, analítica del rendimiento y toma de decisiones '
            'basada en datos.'
        ),
        'orden': 1,
        'cursos': [
            {
                'titulo': 'Fundamentos de Periodización',
                'slug': 'fundamentos-de-periodizacion',
                'nivel': NIVEL_PRINCIPIANTE,
                'categoria': 'entrenamiento',
                'resumen': 'Modelos lineal, ondulado y polarizado; diseña tu primer macrociclo.',
                'descripcion': (
                    'Modelos lineal, ondulado y polarizado; cómo estructurar un macrociclo '
                    'de entrenamiento desde cero.'
                ),
                'modulos': [
                    'Introducción a la periodización deportiva',
                    'Modelo de periodización lineal',
                    'Modelo de periodización ondulada',
                    'Modelo de periodización polarizada',
                    'Diseño de un macrociclo completo',
                ],
            },
            {
                'titulo': 'Gestión de la Carga de Entrenamiento',
                'slug': 'gestion-de-la-carga-de-entrenamiento',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'entrenamiento',
                'resumen': 'El marco MEV/MAV/MRV aplicado a la progresión real de volumen e intensidad.',
                'descripcion': (
                    'El marco MEV/MAV/MRV aplicado a la progresión real de volumen e intensidad.'
                ),
                'modulos': [
                    'Fundamentos de volumen e intensidad',
                    'El marco MEV/MAV/MRV',
                    'Progresión de carga semana a semana',
                    'Señales para escalar o retroceder carga',
                    'Casos prácticos de ajuste de carga',
                ],
            },
            {
                'titulo': 'Deload y Gestión de la Fatiga',
                'slug': 'deload-y-gestion-de-la-fatiga',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'entrenamiento',
                'resumen': 'Cuándo y cómo programar descarga; detecta el sobreentrenamiento a tiempo.',
                'descripcion': (
                    'Cuándo y cómo programar descarga, y cómo identificar señales de '
                    'sobreentrenamiento a tiempo.'
                ),
                'modulos': [
                    'Qué es la fatiga acumulada y por qué importa',
                    'Señales de sobreentrenamiento',
                    'Cuándo programar una descarga',
                    'Diseño de una semana de deload',
                    'Protocolos de recuperación entre ciclos',
                ],
            },
            {
                'titulo': 'Carga Interna 101: sRPE y TRIMP',
                'slug': 'carga-interna-101-srpe-y-trimp',
                'nivel': NIVEL_PRINCIPIANTE,
                'categoria': 'analítica',
                'resumen': 'Cuantifica el esfuerzo percibido y tradúcelo en decisiones de entrenamiento.',
                'descripcion': (
                    'Cómo cuantificar el esfuerzo percibido y traducirlo en decisiones '
                    'de entrenamiento.'
                ),
                'modulos': [
                    'Qué es la carga interna y por qué medirla',
                    'El método sRPE paso a paso',
                    'Cálculo e interpretación del TRIMP',
                    'De la percepción del esfuerzo a la decisión de entrenamiento',
                    'Errores comunes al medir carga interna',
                ],
            },
            {
                'titulo': 'De los Datos a la Decisión: Individualización con Zyfit Score',
                'slug': 'de-los-datos-a-la-decision-zyfit-score',
                'nivel': NIVEL_AVANZADO,
                'categoria': 'analítica',
                'resumen': 'El marco consistencia/adaptabilidad/progresión para individualizar el entrenamiento.',
                'descripcion': (
                    'El marco de consistencia/adaptabilidad/progresión aplicado a la '
                    'individualización real del entrenamiento.'
                ),
                'modulos': [
                    'El marco del Zyfit Score: consistencia, adaptabilidad, progresión',
                    'Cómo se mide la consistencia del atleta',
                    'Cómo se mide la adaptabilidad a la carga',
                    'Cómo se mide la progresión real',
                    'Individualizar el entrenamiento con datos combinados',
                    'Caso integrador: de los datos crudos a la decisión',
                ],
            },
        ],
    },
    {
        'nombre': 'Readaptación Deportiva y Prevención de Lesiones',
        'slug': 'readaptacion-deportiva-y-prevencion-de-lesiones',
        'descripcion': (
            'Factores de riesgo, señales tempranas y herramientas como el ACWR para '
            'prevenir lesiones y acompañar el retorno seguro a la competencia.'
        ),
        'orden': 2,
        'cursos': [
            {
                'titulo': 'ACWR y Prevención de Picos de Carga',
                'slug': 'acwr-y-prevencion-de-picos-de-carga',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'analítica',
                'resumen': 'El ratio agudo:crónico para detectar riesgo antes de la lesión.',
                'descripcion': (
                    'El ratio agudo:crónico como herramienta para detectar riesgo antes '
                    'de la lesión.'
                ),
                'modulos': [
                    'Qué es el ratio agudo:crónico (ACWR)',
                    'Cómo calcular carga aguda y crónica',
                    'Zonas de riesgo y su interpretación',
                    'Detectar picos de carga antes de la lesión',
                    'Ajustar el plan de entrenamiento según el ACWR',
                ],
            },
            {
                'titulo': 'Prevención de Lesiones Basada en Datos',
                'slug': 'prevencion-de-lesiones-basada-en-datos',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'prevención',
                'resumen': 'Factores de riesgo, señales tempranas y trabajo preventivo basado en datos.',
                'descripcion': (
                    'Factores de riesgo, señales tempranas y diseño de trabajo preventivo '
                    'basado en datos.'
                ),
                'modulos': [
                    'Factores de riesgo de lesión en el deporte',
                    'Señales tempranas de alerta',
                    'Diseño de trabajo preventivo',
                    'Integración de carga y prevención',
                    'Casos prácticos de prevención basada en datos',
                ],
            },
        ],
    },
    {
        'nombre': 'Recomposición Corporal',
        'slug': 'recomposicion-corporal',
        'descripcion': (
            'Estrategias de nutrición y entrenamiento para la composición corporal: '
            'pérdida de grasa, ganancia muscular y mantenimiento a largo plazo.'
        ),
        'orden': 3,
        'cursos': [],
    },
    {
        'nombre': 'Salud y Bienestar Deportivo',
        'slug': 'salud-y-bienestar-deportivo',
        'descripcion': (
            'Monitoreo de HRV, sueño y bienestar general del atleta para sostener '
            'el rendimiento en el tiempo.'
        ),
        'orden': 4,
        'cursos': [
            {
                'titulo': 'Fundamentos de Recuperación y Monitoreo de HRV',
                'slug': 'fundamentos-de-recuperacion-y-hrv',
                'nivel': NIVEL_PRINCIPIANTE,
                'categoria': 'recuperación',
                'resumen': 'Qué es el HRV y cómo leerlo día a día para tomar mejores decisiones.',
                'descripcion': (
                    'Qué es la variabilidad de la frecuencia cardíaca y cómo leerla día '
                    'a día para tomar decisiones.'
                ),
                'modulos': [
                    'Qué es la variabilidad de la frecuencia cardíaca (HRV)',
                    'Cómo se mide el HRV día a día',
                    'Interpretar tendencias de HRV',
                    'HRV y decisiones de entrenamiento diario',
                    'Errores comunes al monitorear HRV',
                ],
            },
        ],
    },
    {
        'nombre': 'Psicología Deportiva',
        'slug': 'psicologia-deportiva',
        'descripcion': (
            'Carga psicológica, motivación y herramientas mentales aplicadas al '
            'rendimiento y al bienestar del atleta.'
        ),
        'orden': 5,
        'cursos': [
            {
                'titulo': 'Carga Psicológica y Wellness del Atleta',
                'slug': 'carga-psicologica-y-wellness-del-atleta',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'wellness',
                'resumen': 'Cuestionarios de bienestar y su conexión con el rendimiento físico.',
                'descripcion': (
                    'Cuestionarios de bienestar y cómo conectar el estado mental del atleta '
                    'con su rendimiento físico.'
                ),
                'modulos': [
                    'Qué es el bienestar del atleta y por qué medirlo',
                    'Cuestionarios de wellness: diseño e interpretación',
                    'Estrés percibido y su relación con el rendimiento',
                    'Conectar lo mental con la carga física',
                    'Construir un panel de wellness del atleta',
                ],
            },
        ],
    },
    {
        'nombre': 'Biomecánica y Readaptación',
        'slug': 'biomecanica-y-readaptacion',
        'descripcion': (
            'Análisis biomecánico del movimiento aplicado a la readaptación '
            'funcional y la optimización técnica.'
        ),
        'orden': 6,
        'cursos': [],
    },
    {
        'nombre': 'Fisiología y Anatomía Aplicada',
        'slug': 'fisiologia-y-anatomia-aplicada',
        'descripcion': (
            'Bases fisiológicas y anatómicas del ejercicio aplicadas al diseño de '
            'programas de entrenamiento.'
        ),
        'orden': 7,
        'cursos': [],
    },
    {
        'nombre': 'Poblaciones Especiales',
        'slug': 'poblaciones-especiales',
        'descripcion': (
            'Entrenamiento adaptado a poblaciones con necesidades específicas: '
            'adultos mayores, embarazo, patologías crónicas y más.'
        ),
        'orden': 8,
        'cursos': [],
    },
    {
        'nombre': 'Negocio y Marca Personal en el Deporte',
        'slug': 'negocio-y-marca-personal-en-el-deporte',
        'descripcion': (
            'Herramientas de negocio, marca personal y crecimiento profesional para '
            'entrenadores y profesionales del deporte.'
        ),
        'orden': 9,
        'cursos': [],
    },
]


class Command(BaseCommand):
    help = 'Crea (o sincroniza) las 9 escuelas de Zyfit Academy con sus cursos y módulos.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--publicar',
            action='store_true',
            help='Publica los cursos con módulos definidos aquí (publicado=True). Por defecto quedan como borradores.',
        )

    def handle(self, *args, **options):
        publicar = options['publicar']

        n_escuelas = n_cursos = n_modulos = 0

        for escuela_data in ESCUELAS:
            cursos_data = escuela_data.pop('cursos')

            school, created = School.objects.update_or_create(
                slug=escuela_data['slug'],
                defaults={
                    'nombre': escuela_data['nombre'],
                    'descripcion': escuela_data['descripcion'],
                    'orden': escuela_data['orden'],
                },
            )
            n_escuelas += 1
            tag = 'CREADA' if created else 'ACTUALIZADA'
            self.stdout.write(f'  Escuela {tag}: {school.nombre}')

            for curso_data in cursos_data:
                modulos_titulos = curso_data.pop('modulos')

                course, c_created = Course.objects.update_or_create(
                    slug=curso_data['slug'],
                    defaults={
                        'school': school,
                        'titulo': curso_data['titulo'],
                        'nivel': curso_data['nivel'],
                        'categoria': curso_data['categoria'],
                        'resumen': curso_data['resumen'],
                        'descripcion': curso_data['descripcion'],
                        **(({'publicado': True}) if publicar else {}),
                    },
                )
                n_cursos += 1
                c_tag = 'CREADO' if c_created else 'ACTUALIZADO'
                self.stdout.write(f'    Curso {c_tag}: {course.titulo}')

                # Sincroniza módulos por orden — no toca lecciones existentes.
                modulos_existentes = {
                    m.orden: m for m in course.modulos.all()
                }
                for orden, titulo in enumerate(modulos_titulos, start=1):
                    n_modulos += 1
                    if orden in modulos_existentes:
                        mod = modulos_existentes[orden]
                        if mod.titulo != titulo:
                            mod.titulo = titulo
                            mod.save(update_fields=['titulo'])
                            self.stdout.write(f'      Módulo ACTUALIZADO [{orden}]: {titulo}')
                    else:
                        Module.objects.create(course=course, orden=orden, titulo=titulo)
                        self.stdout.write(f'      Módulo CREADO [{orden}]: {titulo}')

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Seed completado: {n_escuelas} escuelas, {n_cursos} cursos con estructura definida, '
            f'{n_modulos} módulos.'
        ))
        if not publicar:
            self.stdout.write(
                '  Los cursos definidos aquí están en borrador. Usa --publicar para publicarlos.'
            )
