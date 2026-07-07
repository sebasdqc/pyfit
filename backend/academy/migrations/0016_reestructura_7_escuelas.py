# Reestructura el catálogo de Escuelas de Zyfit Academy: de las 9 escuelas
# creadas en 0013_reestructura_escuelas a las 7 escuelas definitivas indicadas
# por el usuario. Revierte 3 de las 9 a su nombre/slug original de antes de
# 0013 (Ciencia del Entrenamiento / Analítica y Rendimiento Deportivo /
# Recuperación, Prevención y Wellness) y renombra otras 4; funde el contenido
# de "Recomposición Corporal" en "Fisiología y Nutrición Aplicada" y elimina
# esa escuela junto con "Biomecánica y Readaptación" (vacía).
#
# Estrategia (mismo patrón que 0013): renombrar en el lugar (misma fila/PK)
# para no romper FKs de Course/AcademyBadge/LibraryResource, mover por slug de
# curso los que cambian de escuela, y recién al final borrar las 2 escuelas
# que quedan sin cursos propios (sus FKs restantes, si las hubiera en un
# entorno con más datos, caen a NULL vía on_delete=SET_NULL).

from django.db import migrations

# slug_viejo -> datos nuevos (renombre en el lugar, misma fila/PK).
RENOMBRES = {
    'entrenamiento-y-rendimiento-deportivo': {
        'nombre': 'Ciencia del Entrenamiento',
        'slug': 'ciencia-del-entrenamiento',
        'descripcion': (
            'Bases científicas de la programación del entrenamiento: '
            'periodización, gestión de la carga y manejo de la fatiga a lo '
            'largo del ciclo de entrenamiento.'
        ),
        'orden': 1,
    },
    'readaptacion-deportiva-y-prevencion-de-lesiones': {
        'nombre': 'Analítica y Rendimiento Deportivo',
        'slug': 'analitica-y-rendimiento-deportivo',
        'descripcion': (
            'Cuantificación de la carga interna y externa, herramientas de '
            'monitoreo como el ACWR e individualización del rendimiento '
            'basada en datos con el Zyfit Score.'
        ),
        'orden': 2,
    },
    'salud-y-bienestar-deportivo': {
        'nombre': 'Recuperación, Prevención y Wellness',
        'slug': 'recuperacion-prevencion-y-wellness',
        'descripcion': (
            'Monitoreo de HRV y sueño, prevención de lesiones basada en '
            'datos, y carga psicológica y wellness del atleta para sostener '
            'el rendimiento en el tiempo.'
        ),
        'orden': 3,
    },
    'fisiologia-y-anatomia-aplicada': {
        'nombre': 'Fisiología y Nutrición Aplicada',
        'slug': 'fisiologia-y-nutricion-aplicada',
        'descripcion': (
            'Bases fisiológicas del ejercicio, nutrición aplicada al '
            'rendimiento y estrategias de composición corporal e '
            'hidratación basadas en datos.'
        ),
        'orden': 4,
    },
    'psicologia-deportiva': {
        'nombre': 'Psicología del Rendimiento',
        'slug': 'psicologia-del-rendimiento',
        'descripcion': (
            'Motivación, activación, rutinas mentales, liderazgo de '
            'equipos y retorno psicológico al deporte aplicados al '
            'rendimiento del atleta.'
        ),
        'orden': 5,
    },
    'poblaciones-especiales': {
        'nombre': 'Poblaciones Especiales y Salud Clínica',
        'slug': 'poblaciones-especiales-y-salud-clinica',
        'descripcion': (
            'Entrenamiento adaptado a poblaciones con necesidades '
            'específicas: enfermedad crónica, envejecimiento, embarazo, '
            'poblaciones pediátricas y discapacidad.'
        ),
        'orden': 6,
    },
    'negocio-y-marca-personal-en-el-deporte': {
        'nombre': 'Negocio, Coaching y Marca Profesional',
        'slug': 'negocio-coaching-y-marca-profesional',
        'descripcion': (
            'Herramientas de negocio, marca personal, comunicación con el '
            'cliente/atleta y ética profesional para entrenadores y '
            'profesionales del deporte independientes.'
        ),
        'orden': 7,
    },
}

# slug_del_curso -> slug_de_la_escuela_destino (NUEVO, post-renombre). Solo los
# cursos cuya escuela de destino cambia de identidad respecto a la que
# heredaron por el renombre de arriba.
COURSE_SCHOOL_MOVES = {
    'carga-interna-101-srpe-y-trimp': 'analitica-y-rendimiento-deportivo',
    'de-los-datos-a-la-decision-zyfit-score': 'analitica-y-rendimiento-deportivo',
    'metricas-externas-carga-gps': 'analitica-y-rendimiento-deportivo',
    'prevencion-de-lesiones-basada-en-datos': 'recuperacion-prevencion-y-wellness',
    'carga-psicologica-y-wellness-del-atleta': 'recuperacion-prevencion-y-wellness',
    'composicion-corporal-medicion-y-manipulacion': 'fisiologia-y-nutricion-aplicada',
}

# Escuelas que quedan sin cursos propios tras los moves de arriba y se
# eliminan (su contenido, si tenía, ya fue absorbido por otra escuela).
ESCUELAS_A_BORRAR = ['recomposicion-corporal', 'biomecanica-y-readaptacion']


def forwards(apps, schema_editor):
    School = apps.get_model('academy', 'School')
    Course = apps.get_model('academy', 'Course')
    AcademyBadge = apps.get_model('academy', 'AcademyBadge')

    for old_slug, nuevo in RENOMBRES.items():
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
        # Limpia la traducción vieja (describía el nombre/identidad anterior)
        # para que `translate_academy_info` la regenere — ese comando solo
        # traduce si nombre_en está vacío.
        school.nombre_en = ''
        school.descripcion_en = ''
        school.save(update_fields=[
            'nombre', 'slug', 'descripcion', 'orden', 'nombre_en', 'descripcion_en',
        ])

    for course_slug, target_school_slug in COURSE_SCHOOL_MOVES.items():
        target = School.objects.filter(slug=target_school_slug).first()
        if target is not None:
            Course.objects.filter(slug=course_slug).update(school=target)

    # Ajusta las insignias de "escuela completada" a la nueva identidad.
    # "Fisiólogo" y "Especialista en Recuperación" sobreviven (sus escuelas
    # solo cambiaron de nombre, no de identidad). "Especialista en Prevención"
    # se retira: su escuela de origen se disuelve (ACWR se va a Analítica,
    # Prevención de Lesiones se va a Recuperación/Prevención/Wellness — ningún
    # destino único representa el criterio original) — mismo tratamiento que
    # recibió "Analista de Datos" en 0013, no se borra para no perder el
    # historial de quien ya la ganó.
    AcademyBadge.objects.filter(identificador='fisiologo').update(
        descripcion='Completaste todos los cursos de Ciencia del Entrenamiento.',
    )
    AcademyBadge.objects.filter(identificador='especialista-en-recuperacion').update(
        descripcion='Completaste todos los cursos de Recuperación, Prevención y Wellness.',
    )
    AcademyBadge.objects.filter(identificador='especialista-en-prevencion').update(
        activo=False,
    )

    ids_a_borrar = set(
        School.objects.filter(slug__in=ESCUELAS_A_BORRAR).values_list('id', flat=True),
    )
    for slug in ESCUELAS_A_BORRAR:
        School.objects.filter(slug=slug).delete()

    # Profile.escuelas_interes es un JSONField de IDs sin FK real (ver
    # onboarding) — sin esto, un usuario que marcó interés en una escuela
    # borrada arriba quedaría con un ID muerto en la lista para siempre.
    if ids_a_borrar:
        Profile = apps.get_model('users', 'Profile')
        for profile in Profile.objects.exclude(escuelas_interes=[]):
            limpio = [i for i in profile.escuelas_interes if i not in ids_a_borrar]
            if limpio != profile.escuelas_interes:
                profile.escuelas_interes = limpio
                profile.save(update_fields=['escuelas_interes'])


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0015_libraryresource_libraryfavorite_and_more'),
        ('users', '0030_profile_anios_experiencia_deporte_and_more'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
