"""Management command: barrido diario de las rachas de estudio de Zyfit Academy.

Corre UNA vez al día (job programado). Para cada usuario con racha activa que no
tuvo actividad de estudio, consume un freeze (si tiene) o rompe la racha cuando
acumula 2 días consecutivos sin actividad. Toda la lógica vive en
`academy.streak_service.run_daily_maintenance`; este comando solo la dispara.

    python manage.py academy_streak_sweep

Programación (mismo patrón que `workouts.send_reminders`): DigitalOcean App
Platform no tiene cron nativo en el app spec, así que se dispara con un trigger
externo diario (p. ej. GitHub Actions `schedule`, DO Functions, o un cron que
haga `doctl apps run <app> academy_streak_sweep`). Corre en hora del servidor
(UTC); como romper la racha exige 2 días consecutivos sin actividad, ese margen
absorbe el desfase de zona horaria del alumno. Es idempotente: correrlo dos veces
el mismo día no rompe rachas de más (una racha sana no cambia; una en gracia solo
avanza cuando pasa otro día real).
"""

from django.core.management.base import BaseCommand

from academy import streak_service


class Command(BaseCommand):
    help = 'Aplica freezes / rompe rachas de estudio de Academy sin actividad (job diario).'

    def handle(self, *args, **options):
        resumen = streak_service.run_daily_maintenance()
        self.stdout.write(self.style.SUCCESS(
            'Academy streak sweep — evaluados: {evaluados}, '
            'freezes consumidos: {freezes_consumidos}, '
            'rachas rotas: {rotas}, sanas: {sanas}'.format(**resumen)
        ))
