"""Management command: apply_evidence_backfill

Aplica la clasificación de evidencia científica (evidence_score,
evidence_rationale, goal_tags, goal_primary, lengthened_bias,
injury_risk_profile) a los ejercicios preexistentes del catálogo, leyendo
backend/zyfit_evidencia_backfill_220.json — el archivo generado para revisión
manual (ver zyfit-evidencia-ejercicios-spec.md).

A diferencia de seed_08_gap_fill (SQL crudo, solo Postgres), este comando usa
el ORM de Django (`Exercise.objects.filter(nombre=...).update(...)`), así que
corre igual en sqlite (dev) y Postgres (prod).

Salta automáticamente los 2 ejercicios que "Plancha de Copenhague" y
"Elevaciones laterales en polea baja" ya recibieron en el batch 08 (mismos
valores, por venir del mismo ancla del informe/spec) — evita una escritura
redundante y deja el log más claro sobre qué tocó cada batch.

Uso:
    python manage.py apply_evidence_backfill --dry-run   # solo cuenta, no escribe
    python manage.py apply_evidence_backfill              # aplica de verdad

Es seguro correrlo más de una vez — es un UPDATE por nombre exacto (unique),
no un INSERT.
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from workouts.models import Exercise

JSON_FILE = Path(__file__).resolve().parent.parent.parent.parent / 'zyfit_evidencia_backfill_220.json'

# Ya actualizados directamente por sql/zyfit_seed_exercises_08_gap_fill.sql con
# los mismos valores (mismo ancla de evidencia) — no re-escribir acá.
YA_APLICADOS_EN_BATCH_08 = {
    'Plancha de Copenhague',
    'Elevaciones laterales en polea baja',
}


class Command(BaseCommand):
    help = 'Aplica el backfill de evidencia científica (zyfit_evidencia_backfill_220.json) al catálogo'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra cuántos se actualizarían/saltarían/no-encontrarían, sin escribir nada',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if not JSON_FILE.exists():
            raise CommandError(f'Archivo no encontrado: {JSON_FILE}')

        data = json.loads(JSON_FILE.read_text(encoding='utf-8'))
        ejercicios = data.get('ejercicios', data if isinstance(data, list) else [])
        if not ejercicios:
            raise CommandError('El archivo no contiene ejercicios (clave "ejercicios" vacía o ausente).')

        self.stdout.write(f'Ejercicios en el archivo: {len(ejercicios)}')

        updated = skipped = not_found = 0
        by_confianza = {'alta': 0, 'media': 0, 'baja': 0}

        for row in ejercicios:
            nombre = row['nombre']
            if nombre in YA_APLICADOS_EN_BATCH_08:
                skipped += 1
                continue

            fields = dict(
                evidence_score=row['evidence_score'],
                evidence_rationale=row['evidence_rationale'],
                goal_tags=row['goal_tags'],
                goal_primary=row['goal_primary'],
                lengthened_bias=row['lengthened_bias'],
                injury_risk_profile=row['injury_risk_profile'],
            )

            if dry_run:
                if Exercise.objects.filter(nombre=nombre).exists():
                    updated += 1
                    by_confianza[row.get('confianza', 'media')] += 1
                else:
                    not_found += 1
                    self.stdout.write(self.style.WARNING(f'  No encontrado en la BD: {nombre}'))
                continue

            n = Exercise.objects.filter(nombre=nombre).update(**fields)
            if n:
                updated += 1
                by_confianza[row.get('confianza', 'media')] += 1
            else:
                not_found += 1
                self.stdout.write(self.style.WARNING(f'  No encontrado en la BD: {nombre}'))

        if dry_run:
            self.stdout.write(self.style.WARNING('--dry-run activo: no se escribió nada.'))

        self.stdout.write(
            self.style.SUCCESS(
                f'\n{"Se actualizarían" if dry_run else "Actualizados"}: {updated} '
                f'(alta={by_confianza["alta"]}, media={by_confianza["media"]}, baja={by_confianza["baja"]}) | '
                f'Ya aplicados en batch 08 (saltados): {skipped} | '
                f'No encontrados en la BD: {not_found}'
            )
        )
        if not_found:
            self.stdout.write(self.style.ERROR(
                f'⚠ {not_found} nombres del archivo no matchearon ningún ejercicio en la BD — '
                f'revisar antes de confiar en el resultado (posible desync entre catálogo y archivo).'
            ))
