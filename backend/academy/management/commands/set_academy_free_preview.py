"""Marca como gratis (freemium) el primer módulo de cada escuela.

Para cada `School`, toma el `Module` con menor `(Course.id, Module.orden)` entre
TODOS los cursos de esa escuela — el módulo "más antiguo" de su curso "más
antiguo" — y le pone `es_gratuito=True` si aún no lo tiene. Idempotente: no
pisa flags que un admin ya haya puesto a mano en otro módulo (si una escuela ya
tiene algún módulo marcado gratis, se deja tal cual y se informa por stdout).

El admin puede ajustar después CUÁL módulo es el gratis de cada escuela desde
Django Admin sin volver a correr este comando.

Uso:
    python manage.py set_academy_free_preview [--dry-run]
"""

from django.core.management.base import BaseCommand

from academy.models import Module, School


class Command(BaseCommand):
    help = 'Marca es_gratuito=True en el primer módulo de cada escuela (freemium).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                             help='Solo muestra qué módulo se marcaría, sin guardar.')

    def handle(self, *args, **options):
        dry = options['dry_run']
        verbo = 'Se marcaría (dry-run)' if dry else 'Marcado'

        for school in School.objects.order_by('orden', 'nombre'):
            ya_tiene_gratis = Module.objects.filter(
                course__school=school, es_gratuito=True,
            ).exists()
            if ya_tiene_gratis:
                self.stdout.write(f'  {school.nombre}: ya tiene un módulo gratis — sin cambios.')
                continue

            primer_modulo = (
                Module.objects.filter(course__school=school)
                .order_by('course_id', 'orden')
                .select_related('course')
                .first()
            )
            if not primer_modulo:
                self.stdout.write(self.style.WARNING(
                    f'  {school.nombre}: sin módulos todavía — nada que marcar.'
                ))
                continue

            if not dry:
                primer_modulo.es_gratuito = True
                primer_modulo.save(update_fields=['es_gratuito'])
            self.stdout.write(
                f'  {school.nombre}: {verbo} "{primer_modulo.titulo}" '
                f'(curso "{primer_modulo.course.titulo}") como gratis.'
            )

        self.stdout.write(self.style.SUCCESS('\n✓ set_academy_free_preview completado.'))
