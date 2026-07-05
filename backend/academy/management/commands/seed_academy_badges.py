"""Seed del catálogo inicial de insignias de identidad de Zyfit Academy.

Idempotente: re-ejecutar el comando sincroniza nombre/descripción/criterio sin
duplicar filas (`update_or_create` por `identificador`). Depende de que las
escuelas reales ya existan (ver `seed_zyfit_escuelas`) — si falta alguna, avisa
por stdout y sigue con el resto en vez de fallar.

Uso:
    python manage.py seed_academy_badges
"""

from django.core.management.base import BaseCommand

from academy.models import AcademyBadge, School

BADGES = [
    {
        'identificador': 'fisiologo',
        'nombre': 'Fisiólogo',
        'descripcion': 'Completaste todos los cursos de Entrenamiento y Rendimiento Deportivo.',
        'icono': '🧬',
        'criterio_tipo': AcademyBadge.CRITERIO_ESCUELA_COMPLETADA,
        'escuela_slug': 'entrenamiento-y-rendimiento-deportivo',
        'orden': 1,
    },
    # Retirada: su escuela de origen ("Analítica y Rendimiento Deportivo") se
    # fusionó en otras escuelas y dejó de existir como entidad propia. Se
    # mantiene aquí con activo=False para no perder el historial de quien ya
    # la ganó (ver docstring de AcademyBadge) y para que el seed no la reviva.
    {
        'identificador': 'analista-de-datos',
        'nombre': 'Analista de Datos',
        'descripcion': 'Completaste todos los cursos de Analítica y Rendimiento Deportivo.',
        'icono': '📊',
        'criterio_tipo': AcademyBadge.CRITERIO_ESCUELA_COMPLETADA,
        'escuela_slug': 'entrenamiento-y-rendimiento-deportivo',
        'orden': 2,
        'activo': False,
    },
    {
        'identificador': 'especialista-en-prevencion',
        'nombre': 'Especialista en Prevención',
        'descripcion': (
            'Completaste todos los cursos de Readaptación Deportiva y Prevención '
            'de Lesiones.'
        ),
        'icono': '🛡️',
        'criterio_tipo': AcademyBadge.CRITERIO_ESCUELA_COMPLETADA,
        'escuela_slug': 'readaptacion-deportiva-y-prevencion-de-lesiones',
        'orden': 2,
    },
    {
        'identificador': 'especialista-en-recuperacion',
        'nombre': 'Especialista en Recuperación',
        'descripcion': 'Completaste todos los cursos de Salud y Bienestar Deportivo.',
        'icono': '🧘',
        'criterio_tipo': AcademyBadge.CRITERIO_ESCUELA_COMPLETADA,
        'escuela_slug': 'salud-y-bienestar-deportivo',
        'orden': 3,
    },
    {
        'identificador': 'primer-paso',
        'nombre': 'Primer Paso',
        'descripcion': 'Completaste tu primera lección en Zyfit Academy.',
        'icono': '🎯',
        'criterio_tipo': AcademyBadge.CRITERIO_PRIMERA_LECCION,
        'orden': 0,
    },
    {
        'identificador': 'racha-7',
        'nombre': 'Racha de una Semana',
        'descripcion': '7 días seguidos de estudio.',
        'icono': '💎',
        'criterio_tipo': AcademyBadge.CRITERIO_STREAK_DIAS,
        'criterio_valor': 7,
        'orden': 4,
    },
    {
        'identificador': 'racha-30',
        'nombre': 'Racha de un Mes',
        'descripcion': '30 días seguidos de estudio.',
        'icono': '👑',
        'criterio_tipo': AcademyBadge.CRITERIO_STREAK_DIAS,
        'criterio_valor': 30,
        'orden': 5,
    },
    {
        'identificador': 'colaborador',
        'nombre': 'Colaborador',
        'descripcion': '5 de tus respuestas en Comunidad fueron marcadas como mejor respuesta.',
        'icono': '🤝',
        'criterio_tipo': AcademyBadge.CRITERIO_RESPUESTAS_UTILES,
        'criterio_valor': 5,
        'orden': 6,
    },
]


class Command(BaseCommand):
    help = 'Crea (o sincroniza) el catálogo inicial de insignias de identidad de Zyfit Academy.'

    def handle(self, *args, **options):
        escuelas_por_slug = {s.slug: s for s in School.objects.filter(
            slug__in=[b['escuela_slug'] for b in BADGES if 'escuela_slug' in b],
        )}

        creadas = actualizadas = 0
        for data in BADGES:
            data = dict(data)
            escuela_slug = data.pop('escuela_slug', None)
            escuela = escuelas_por_slug.get(escuela_slug) if escuela_slug else None
            if escuela_slug and escuela is None:
                self.stdout.write(self.style.WARNING(
                    f'  Escuela "{escuela_slug}" no encontrada — saltando "{data["nombre"]}" '
                    f'(correr seed_zyfit_escuelas primero).',
                ))
                continue

            identificador = data.pop('identificador')
            badge, created = AcademyBadge.objects.update_or_create(
                identificador=identificador,
                defaults={**data, 'criterio_escuela': escuela},
            )
            tag = 'CREADA' if created else 'ACTUALIZADA'
            creadas += created
            actualizadas += not created
            self.stdout.write(f'  Insignia {tag}: {badge.icono} {badge.nombre}')

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Seed completado: {creadas} creadas, {actualizadas} actualizadas.'
        ))
