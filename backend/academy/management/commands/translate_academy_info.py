"""Backfill de traducción al inglés de la "información general" de Academy:
Course.titulo/resumen/descripcion, Module.titulo/descripcion,
School.nombre/descripcion. Fuera de alcance a propósito: Lesson.contenido y
Quiz/Question (fase futura).

Toda la lógica vive en `academy.translation_service`; este comando solo la
dispara y reporta. Es idempotente (salta lo que ya tiene traducción salvo
`--force`) y no aborta el lote si un curso falla.

    python manage.py translate_academy_info --dry-run
    python manage.py translate_academy_info
    python manage.py translate_academy_info --course fundamentos-de-periodizacion
    python manage.py translate_academy_info --force

Hay que volver a correrlo cada vez que se edite el contenido en español de un
curso ya traducido (mismo patrón manual ya establecido para
`index_tutor_content` — no se dispara solo desde el seed de contenido)."""

from django.core.management.base import BaseCommand

from academy import translation_service


class Command(BaseCommand):
    help = 'Traduce al inglés título/resumen/descripción de cursos, módulos y escuelas.'

    def add_arguments(self, parser):
        parser.add_argument('--course', help='Slug de un solo curso a traducir (y sus módulos).')
        parser.add_argument('--force', action='store_true',
                            help='Re-traduce aunque ya exista una traducción previa.')
        parser.add_argument('--dry-run', action='store_true',
                            help='Solo cuenta cuánto falta por traducir, sin llamar a Groq.')

    def handle(self, *args, **options):
        course_slug = options.get('course')
        force = options['force']
        dry_run = options['dry_run']

        if dry_run:
            pendientes = translation_service.count_pending(course_slug=course_slug)
            self.stdout.write(self.style.SUCCESS(
                'Pendientes de traducir — escuelas: {escuelas}, cursos: {cursos}, '
                'módulos: {modulos}'.format(**pendientes)
            ))
            return

        resumen = translation_service.translate_all(course_slug=course_slug, force=force)
        self.stdout.write(self.style.SUCCESS(
            'Traducidos — escuelas: {escuelas}, cursos: {cursos}, módulos: {modulos}'
            .format(**resumen)
        ))
        if resumen['cursos_fallidos']:
            self.stderr.write(self.style.WARNING(
                'Cursos que fallaron (revisar logs): ' + ', '.join(resumen['cursos_fallidos'])
            ))
