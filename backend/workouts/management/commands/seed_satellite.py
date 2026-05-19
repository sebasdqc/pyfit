"""
Management command: python manage.py seed_satellite

Corre los 6 archivos SQL de tablas satélite (muscle_groups, equipment_items,
contraindication_categories y tablas puente) en producción sin necesitar psql.

Trunca las bridge tables antes de correr los seeds de ejercicios para que sea
idempotente y seguro de re-ejecutar.
"""
import os

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

SQL_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), '..', '..', '..', 'sql')
)

SCHEMA_FILE = 'zyfit_exercise_schema.sql'

EXERCISE_SEED_FILES = [
    'zyfit_seed_exercises_01_bisagra_sentadilla.sql',
    'zyfit_seed_exercises_02_empuje.sql',
    'zyfit_seed_exercises_03_jalon.sql',
    'zyfit_seed_exercises_04_core.sql',
    'zyfit_seed_exercises_05_aislamiento.sql',
]

BRIDGE_TABLES = [
    'exercise_relationships',
    'exercise_contraindications',
    'exercise_equipment',
    'exercise_muscles',
]


class Command(BaseCommand):
    help = 'Seed satellite tables from SQL files (no psql required)'

    def handle(self, *args, **options):
        # Step 1: schema — idempotent (CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING)
        self._run_sql_file(SCHEMA_FILE)

        # Step 2: truncate bridge tables so the exercise seeds are safe to re-run
        self.stdout.write('Truncating bridge tables ...')
        with transaction.atomic():
            with connection.cursor() as cursor:
                for table in BRIDGE_TABLES:
                    cursor.execute(f'TRUNCATE TABLE {table}')
        self.stdout.write(self.style.SUCCESS('  OK'))

        # Step 3: exercise seeds
        for filename in EXERCISE_SEED_FILES:
            self._run_sql_file(filename)

    def _run_sql_file(self, filename):
        filepath = os.path.join(SQL_DIR, filename)
        if not os.path.exists(filepath):
            raise CommandError(f'SQL file not found: {filepath}')

        self.stdout.write(f'Running {filename} ...')
        sql = open(filepath, encoding='utf-8').read()

        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute(sql)
        except Exception as exc:
            raise CommandError(f'Failed on {filename}: {exc}') from exc

        self.stdout.write(self.style.SUCCESS('  OK'))

        self.stdout.write(self.style.SUCCESS('\nAll satellite seeds completed.'))

        # Quick sanity check
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    (SELECT count(*) FROM equipment_items)              AS equipment,
                    (SELECT count(*) FROM muscle_groups)                AS muscles,
                    (SELECT count(*) FROM contraindication_categories)  AS contraindications,
                    (SELECT count(*) FROM exercise_equipment)           AS ex_equipment,
                    (SELECT count(*) FROM exercise_muscles)             AS ex_muscles
            """)
            row = cursor.fetchone()

        labels = ['equipment', 'muscles', 'contraindications', 'ex_equipment', 'ex_muscles']
        for label, val in zip(labels, row):
            self.stdout.write(f'  {label}: {val}')
