from unittest.mock import patch

from django.test import TestCase

from workouts.tasks import send_daily_reminders


class SendDailyRemindersTaskTests(TestCase):
    """send_reminders no estaba cableado a ningún scheduler (ni Celery Beat ni
    un Job de DO) — esta tarea es el wiring; el propio comando ya tiene su
    lógica de negocio, así que solo verificamos que la tarea lo invoca."""

    def test_task_calls_send_reminders_command(self):
        with patch('workouts.tasks.call_command') as mock_call:
            send_daily_reminders()
        mock_call.assert_called_once_with('send_reminders')
