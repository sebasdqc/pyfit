"""
Management command para ejecutar la sincronización de Garmin manualmente.

Uso:
    python manage.py sync_garmin_data
    python manage.py sync_garmin_data --user 42   # solo un usuario
"""
import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sincroniza datos de salud desde Garmin Connect para todos los usuarios conectados.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=int,
            default=None,
            help='ID del usuario a sincronizar (omitir = todos)',
        )

    def handle(self, *args, **options):
        user_id = options.get('user')

        if user_id:
            # Sincronizar un solo usuario
            from devices.models import DeviceIntegration
            from devices.garmin_sync import _sync_single_user, _disconnect_and_notify

            integration = DeviceIntegration.objects.filter(
                user_id=user_id,
                device='garmin',
                status='connected',
            ).select_related('user').first()

            if not integration:
                self.stderr.write(
                    self.style.WARNING(
                        f'No se encontró integración Garmin activa para user_id={user_id}'
                    )
                )
                return

            ok = _sync_single_user(integration)
            if ok:
                self.stdout.write(self.style.SUCCESS(f'✓ user {user_id} sincronizado'))
            else:
                self.stdout.write(self.style.WARNING(f'✗ user {user_id} falló o fue desconectado'))
        else:
            # Sincronizar todos
            from devices.garmin_sync import sync_all_garmin_users

            result = sync_all_garmin_users()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Garmin sync completado — '
                    f'total={result["total"]} '
                    f'success={result["success"]} '
                    f'failed={result["failed"]} '
                    f'disconnected={result["disconnected"]}'
                )
            )
