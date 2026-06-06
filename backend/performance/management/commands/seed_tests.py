"""seed_tests — siembra/actualiza la tabla TestDefinition desde el motor de cálculo.

El REGISTRY de `performance.calculators` es la fuente única de verdad del catálogo;
este comando refleja ese catálogo en BD de forma idempotente. Los tests cuyo slug
ya no existe en el REGISTRY se marcan inactivos (no se borran, para no perder el
histórico de resultados que los referencian por `test_slug`).

Correr tras añadir o editar calculadoras:  python manage.py seed_tests
"""

from django.core.management.base import BaseCommand

from performance.calculators import catalog
from performance.models import TestDefinition

# Campos del catálogo que reflejamos en la tabla (slug es la clave, va aparte).
_CAMPOS = ('familia', 'nombre', 'descripcion', 'input_schema')


class Command(BaseCommand):
    help = 'Siembra/actualiza el catálogo de tests (TestDefinition) desde el motor de cálculo.'

    def handle(self, *args, **options):
        creados = actualizados = sin_cambios = 0
        vistos = set()

        for c in catalog():
            vistos.add(c['slug'])
            obj, created = TestDefinition.objects.get_or_create(
                slug=c['slug'],
                defaults={**{k: c[k] for k in _CAMPOS}, 'activo': True},
            )
            if created:
                creados += 1
                continue
            # Reflejar cambios del REGISTRY (incluida la reactivación si volvió).
            cambios = {k: c[k] for k in _CAMPOS if getattr(obj, k) != c[k]}
            if not obj.activo:
                cambios['activo'] = True
            if cambios:
                for k, v in cambios.items():
                    setattr(obj, k, v)
                obj.save(update_fields=[*cambios.keys(), 'updated_at'])
                actualizados += 1
            else:
                sin_cambios += 1

        # Desactivar definiciones huérfanas (su calculadora ya no está en el REGISTRY).
        desactivados = (
            TestDefinition.objects.filter(activo=True)
            .exclude(slug__in=vistos)
            .update(activo=False)
        )

        self.stdout.write(self.style.SUCCESS(
            f'Catálogo de tests sembrado: {creados} creados, {actualizados} '
            f'actualizados, {sin_cambios} sin cambios, {desactivados} desactivados.'
        ))
