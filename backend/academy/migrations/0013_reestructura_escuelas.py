# Reestructura el catálogo de Escuelas de Zyfit Academy: de las 3 escuelas
# provisionales originales a las 9 escuelas definitivas del catálogo (por ahora).
#
# Estrategia: renombra en el lugar (misma fila/PK) 3 de las escuelas existentes
# hacia 3 de las 9 escuelas objetivo, para no romper las FK de Course/AcademyBadge
# que ya apuntan a ellas; crea las 6 escuelas nuevas restantes (vacías); y mueve
# los cursos cuya escuela de destino cambió de identidad respecto a la que
# heredaron por el renombre.

from django.db import migrations

OLD_TO_NEW_SCHOOL = {
    'ciencia-del-entrenamiento': {
        'nombre': 'Entrenamiento y Rendimiento Deportivo',
        'slug': 'entrenamiento-y-rendimiento-deportivo',
        'descripcion': (
            'Bases científicas de la programación del entrenamiento: periodización, '
            'gestión de la carga, analítica del rendimiento y toma de decisiones '
            'basada en datos.'
        ),
        'orden': 1,
    },
    'analitica-y-rendimiento-deportivo': {
        'nombre': 'Readaptación Deportiva y Prevención de Lesiones',
        'slug': 'readaptacion-deportiva-y-prevencion-de-lesiones',
        'descripcion': (
            'Factores de riesgo, señales tempranas y herramientas como el ACWR para '
            'prevenir lesiones y acompañar el retorno seguro a la competencia.'
        ),
        'orden': 2,
    },
    'recuperacion-prevencion-y-wellness': {
        'nombre': 'Salud y Bienestar Deportivo',
        'slug': 'salud-y-bienestar-deportivo',
        'descripcion': (
            'Monitoreo de HRV, sueño y bienestar general del atleta para sostener '
            'el rendimiento en el tiempo.'
        ),
        'orden': 4,
    },
}

NEW_SCHOOLS = [
    {
        'nombre': 'Recomposición Corporal',
        'slug': 'recomposicion-corporal',
        'descripcion': (
            'Estrategias de nutrición y entrenamiento para la composición corporal: '
            'pérdida de grasa, ganancia muscular y mantenimiento a largo plazo.'
        ),
        'orden': 3,
    },
    {
        'nombre': 'Psicología Deportiva',
        'slug': 'psicologia-deportiva',
        'descripcion': (
            'Carga psicológica, motivación y herramientas mentales aplicadas al '
            'rendimiento y al bienestar del atleta.'
        ),
        'orden': 5,
    },
    {
        'nombre': 'Biomecánica y Readaptación',
        'slug': 'biomecanica-y-readaptacion',
        'descripcion': (
            'Análisis biomecánico del movimiento aplicado a la readaptación '
            'funcional y la optimización técnica.'
        ),
        'orden': 6,
    },
    {
        'nombre': 'Fisiología y Anatomía Aplicada',
        'slug': 'fisiologia-y-anatomia-aplicada',
        'descripcion': (
            'Bases fisiológicas y anatómicas del ejercicio aplicadas al diseño de '
            'programas de entrenamiento.'
        ),
        'orden': 7,
    },
    {
        'nombre': 'Poblaciones Especiales',
        'slug': 'poblaciones-especiales',
        'descripcion': (
            'Entrenamiento adaptado a poblaciones con necesidades específicas: '
            'adultos mayores, embarazo, patologías crónicas y más.'
        ),
        'orden': 8,
    },
    {
        'nombre': 'Negocio y Marca Personal en el Deporte',
        'slug': 'negocio-y-marca-personal-en-el-deporte',
        'descripcion': (
            'Herramientas de negocio, marca personal y crecimiento profesional para '
            'entrenadores y profesionales del deporte.'
        ),
        'orden': 9,
    },
]

# slug_del_curso -> slug_de_la_escuela_destino. Solo los cursos cuya escuela
# cambia de identidad respecto a la que heredaron tras el renombre de arriba
# (p. ej. "Prevención de Lesiones..." estaba en la escuela que hoy pasa a ser
# "Salud y Bienestar Deportivo", pero debe vivir en "Readaptación...").
COURSE_SCHOOL_MOVES = {
    'carga-interna-101-srpe-y-trimp': 'entrenamiento-y-rendimiento-deportivo',
    'de-los-datos-a-la-decision-zyfit-score': 'entrenamiento-y-rendimiento-deportivo',
    'prevencion-de-lesiones-basada-en-datos': 'readaptacion-deportiva-y-prevencion-de-lesiones',
    'carga-psicologica-y-wellness-del-atleta': 'psicologia-deportiva',
}


def forwards(apps, schema_editor):
    School = apps.get_model('academy', 'School')
    Course = apps.get_model('academy', 'Course')
    AcademyBadge = apps.get_model('academy', 'AcademyBadge')

    for old_slug, nuevo in OLD_TO_NEW_SCHOOL.items():
        school = School.objects.filter(slug=old_slug).first()
        if school is None:
            # Entorno sin esa escuela todavía (p. ej. DB recién provisionada):
            # créala directo con los datos nuevos si no existe ya por su slug nuevo.
            School.objects.get_or_create(slug=nuevo['slug'], defaults=nuevo)
            continue
        school.nombre = nuevo['nombre']
        school.slug = nuevo['slug']
        school.descripcion = nuevo['descripcion']
        school.orden = nuevo['orden']
        school.save(update_fields=['nombre', 'slug', 'descripcion', 'orden'])

    for nueva in NEW_SCHOOLS:
        School.objects.get_or_create(slug=nueva['slug'], defaults=nueva)

    for course_slug, target_school_slug in COURSE_SCHOOL_MOVES.items():
        target = School.objects.filter(slug=target_school_slug).first()
        if target is not None:
            Course.objects.filter(slug=course_slug).update(school=target)

    # Ajusta las insignias de "escuela completada" a la nueva identidad de cada
    # escuela. "Analista de Datos" se retira (activo=False) porque su escuela de
    # origen deja de existir como entidad propia — no se borra para no perder el
    # historial de quien ya la ganó (ver docstring de AcademyBadge).
    AcademyBadge.objects.filter(identificador='fisiologo').update(
        descripcion='Completaste todos los cursos de Entrenamiento y Rendimiento Deportivo.',
    )
    AcademyBadge.objects.filter(identificador='especialista-en-recuperacion').update(
        descripcion='Completaste todos los cursos de Salud y Bienestar Deportivo.',
    )
    old_analitica_badge = AcademyBadge.objects.filter(identificador='analista-de-datos').first()
    if old_analitica_badge is not None:
        old_analitica_badge.activo = False
        old_analitica_badge.save(update_fields=['activo'])

        readaptacion = School.objects.filter(
            slug='readaptacion-deportiva-y-prevencion-de-lesiones',
        ).first()
        if readaptacion is not None:
            AcademyBadge.objects.update_or_create(
                identificador='especialista-en-prevencion',
                defaults={
                    'nombre': 'Especialista en Prevención',
                    'descripcion': (
                        'Completaste todos los cursos de Readaptación Deportiva y '
                        'Prevención de Lesiones.'
                    ),
                    'icono': '🛡️',
                    'criterio_tipo': 'escuela_completada',
                    'criterio_escuela': readaptacion,
                    'orden': 2,
                    'activo': True,
                },
            )


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0012_anonymoussession_anonymousprogress'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
