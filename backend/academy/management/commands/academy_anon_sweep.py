"""Management command: barrido de sesiones anónimas de Academy vencidas y
nunca convertidas (onboarding sin registro).

Corre UNA vez al día (mismo job programado que `academy_streak_sweep`, ver
`.github/workflows/academy-streak-sweep.yml`). Una sesión anónima vive
`ANON_SESSION_TTL_DIAS` días (ver academy.anon_views); si nunca se registró
(`migrada_en` sigue NULL) al llegar `expires_at`, se borra junto con su
`AnonymousProgress` (cascade) para no acumular datos huérfanos indefinidamente.

    python manage.py academy_anon_sweep

Equivalente HTTP: `POST /api/academy/anon/sweep/` (secreto compartido
`X-Cron-Secret`), para disparar desde el cron externo sin sesión de Django.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from academy.models import AnonymousSession


class Command(BaseCommand):
    help = 'Borra sesiones anónimas de Academy vencidas que nunca se convirtieron en cuenta.'

    def handle(self, *args, **options):
        vencidas = AnonymousSession.objects.filter(
            expires_at__lt=timezone.now(), migrada_en__isnull=True,
        )
        borradas = vencidas.count()
        vencidas.delete()
        self.stdout.write(self.style.SUCCESS(f'Academy anon sweep — sesiones borradas: {borradas}'))
