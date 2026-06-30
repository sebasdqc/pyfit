"""
Management command: send daily push reminders.

Run daily via cron (e.g. DigitalOcean Job at 19:00 UTC):
    python manage.py send_reminders

Two reminder types:
  1. Check-in reminder — user has no check-in today AND no completed session today.
  2. Streak at risk — user has an active streak but hasn't completed a session today.

Respects NotificationPreference.silencio (do-not-disturb flag).
Skips users without a push token.
"""

from datetime import date, timedelta

from django.core.management.base import BaseCommand

from checkins.models import DailyCheckin
from users.models import Profile
from users.push import send_push
from workouts.models import Session


class Command(BaseCommand):
    help = 'Send daily push reminders (check-in + streak at risk)'

    def handle(self, *args, **options):
        hoy = date.today()

        profiles = (
            Profile.objects
            .exclude(push_token='')
            .select_related('user', 'user__notification_prefs')
        )

        checkin_sent = 0
        streak_sent = 0

        for prof in profiles:
            user = prof.user

            prefs = getattr(user, 'notification_prefs', None)
            if prefs and prefs.silencio:
                continue

            ya_entrenó = Session.objects.filter(
                user=user, fecha=hoy, feedback__isnull=False
            ).exists()

            if ya_entrenó:
                # No molestar — ya completó su sesión hoy
                continue

            ya_checkin = DailyCheckin.objects.filter(user=user, fecha=hoy).exists()

            # ── Recordatorio de check-in ──────────────────────────────────────
            if not ya_checkin:
                nombre = (prof.nombre or '').split()[0] or 'campeón'
                sent = send_push(
                    user,
                    title='¿Ya entrenaste hoy? 💪',
                    body=f'{nombre}, completa tu check-in y genera tu rutina del día.',
                    data={'tipo': 'checkin_reminder'},
                )
                if sent:
                    checkin_sent += 1
                continue   # si no hizo check-in, no enviar también el de racha

            # ── Racha en riesgo ───────────────────────────────────────────────
            if prof.racha_actual > 0:
                sent = send_push(
                    user,
                    title=f'Tu racha de {prof.racha_actual} días está en riesgo 🔥',
                    body='Completa una sesión hoy para mantenerla.',
                    data={'tipo': 'streak_risk', 'racha': prof.racha_actual},
                )
                if sent:
                    streak_sent += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Reminders sent — check-in: {checkin_sent}, streak: {streak_sent}'
            )
        )
