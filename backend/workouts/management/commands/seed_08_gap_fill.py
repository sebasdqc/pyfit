"""Management command: seed_08_gap_fill

Carga el batch 08 (gap-fill de evidencia científica) en la base de datos:
28 ejercicios nuevos + 2 actualizaciones de ejercicios ya existentes que
resultaron duplicados funcionales del gap-fill ("Elevaciones laterales en
polea baja" y "Plancha de Copenhague" — ver sql/zyfit_seed_exercises_08_gap_fill.sql
sección 4).

Requiere la migración workouts/0028_exercise_evidence_and_goal_fields
aplicada antes de correrlo (agrega evidence_score/evidence_rationale/
goal_tags/goal_primary/lengthened_bias/injury_risk_profile a `exercises`).

Uso:
    python manage.py seed_08_gap_fill
    python manage.py seed_08_gap_fill --dry-run   # muestra el conteo sin ejecutar

Solo corre en Postgres (usa `::jsonb` y `ON CONFLICT`, igual que los batches
01-07b) — no ejecutar contra el sqlite de dev local. Ver backend/CLAUDE.md:
el catálogo no se siembra en el deploy, se corre a mano contra producción.
"""

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection


SQL_FILE = Path(__file__).resolve().parent.parent.parent.parent / 'sql' / 'zyfit_seed_exercises_08_gap_fill.sql'


class Command(BaseCommand):
    help = 'Carga el batch 08 (gap-fill de evidencia científica) en la base de datos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra el conteo antes/después sin ejecutar nada',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if not SQL_FILE.exists():
            raise CommandError(f'Archivo SQL no encontrado: {SQL_FILE}')

        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM exercises')
            before = cursor.fetchone()[0]

        self.stdout.write(f'Ejercicios en DB antes: {before}')

        if dry_run:
            self.stdout.write(self.style.WARNING('--dry-run activo: no se ejecuta nada.'))
            self.stdout.write(f'  Archivo: {SQL_FILE}')
            return

        sql = SQL_FILE.read_text(encoding='utf-8')
        try:
            with connection.cursor() as cursor:
                cursor.execute(sql)
            self.stdout.write(self.style.SUCCESS('  ✓ Batch 08 ejecutado'))
        except Exception as exc:
            raise CommandError(
                f'Error ejecutando batch 08: {exc}\n'
                f'El batch usa ON CONFLICT DO UPDATE — si el error es de columna '
                f'faltante, verifica que la migración 0028 esté aplicada.'
            )

        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM exercises')
            after = cursor.fetchone()[0]

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Completado — ejercicios antes: {before} | después: {after} | '
                f'añadidos: {after - before} (esperado: +28; los 2 duplicados son UPDATE)'
            )
        )
