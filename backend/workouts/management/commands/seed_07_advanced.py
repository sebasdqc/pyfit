"""Management command: seed_07_advanced

Carga los ejercicios avanzados del batch 07A y 07B desde los archivos SQL.

Uso:
    python manage.py seed_07_advanced
    python manage.py seed_07_advanced --dry-run   # muestra el conteo sin ejecutar
    python manage.py seed_07_advanced --file 07a  # solo un batch

Los archivos SQL usan ON CONFLICT (nombre) DO UPDATE, por lo que es seguro
correrlos múltiples veces — actualiza sin duplicar.

Batch 07A (38 ejercicios):
  - Piernas / Glúteos: Extensión cuádriceps máquina, Curl isquios, Zancada
    lateral, Sentadilla Cossack, Abducción banda/máquina, Hack squat,
    Prensa unilateral, Good morning, Reverse Nordic, B-stance RDL,
    Elevación talones sentado, Zercher, Pause squat, Jefferson curl,
    Pull-through polea baja
  - Espalda / Jalón: Dominada agarre neutro, Jalón neutro, Straight arm
    pulldown, Remo máquina, Dominadas asistidas, Rack pull, Déficit deadlift,
    Meadows row, Seal row, Dominadas lastradas, Remo Smith, Snatch grip DL
  - Empuje / Hombros: Press declinado barra/mancuernas, Push press, Press
    Arnold, Thruster, Landmine press, Rotación externa banda,
    Fondos paralelas tríceps, Z press

Batch 07B (30 ejercicios):
  - Bíceps / Tríceps: Press francés EZ, Curl inclinado, Reverse curl,
    Curl polea, Extensión unilateral, Curl Zottman, Curl predicador,
    Curl muñeca, Farmer carry
  - Core / Abdomen: Ab wheel, Pallof press, Dragon flag, L-sit, Plancha
    Copenhague, Suitcase carry, V-up, Bicycle crunch, Toes to bar,
    Hollow body rock, Chop y lift, Elevaciones piernas, GHD sit-up
  - Cardio / HIIT: Comba, Sprint, KB clean, Battle ropes, Sled push,
    Bear crawl, Inchworm
  - Movilidad: Squat to stand, Leg swing, Couch stretch, Hip 90-90,
    Extensión torácica foam roller, Movilización tobillo banda,
    Hip flexor march, Pigeon pose, Wall slide
"""

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection


SQL_DIR = Path(__file__).resolve().parent.parent.parent.parent / 'sql'

BATCHES = {
    '07a': SQL_DIR / 'zyfit_seed_exercises_07a.sql',
    '07b': SQL_DIR / 'zyfit_seed_exercises_07b.sql',
}


class Command(BaseCommand):
    help = 'Carga ejercicios avanzados batch 07A y 07B en la base de datos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra cuántos ejercicios existen antes y después sin ejecutar nada',
        )
        parser.add_argument(
            '--file',
            choices=['07a', '07b', 'all'],
            default='all',
            help='Qué batch ejecutar (default: all)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        batch   = options['file']

        # Seleccionar qué archivos correr
        if batch == 'all':
            files = list(BATCHES.values())
            labels = list(BATCHES.keys())
        else:
            files  = [BATCHES[batch]]
            labels = [batch]

        # Verificar que los archivos existen
        for f in files:
            if not f.exists():
                raise CommandError(f'Archivo SQL no encontrado: {f}')

        # Conteo antes
        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM exercises')
            before = cursor.fetchone()[0]

        self.stdout.write(f'Ejercicios en DB antes: {before}')

        if dry_run:
            self.stdout.write(self.style.WARNING(
                '--dry-run activo: no se ejecuta nada.'
            ))
            for label, f in zip(labels, files):
                self.stdout.write(f'  Batch {label.upper()}: {f}')
            return

        # Ejecutar cada archivo
        for label, sql_file in zip(labels, files):
            self.stdout.write(f'\nEjecutando batch {label.upper()}...')
            sql = sql_file.read_text(encoding='utf-8')

            try:
                with connection.cursor() as cursor:
                    cursor.execute(sql)
                self.stdout.write(self.style.SUCCESS(f'  ✓ Batch {label.upper()} ejecutado'))
            except Exception as exc:
                raise CommandError(
                    f'Error ejecutando {label.upper()}: {exc}\n'
                    f'El batch usa ON CONFLICT DO UPDATE — si el error es de columna '
                    f'faltante, verifica que las migraciones estén al día.'
                )

        # Conteo después
        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM exercises')
            after = cursor.fetchone()[0]

        added = after - before
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Completado — ejercicios antes: {before} | después: {after} | '
                f'añadidos/actualizados: {added}'
            )
        )
