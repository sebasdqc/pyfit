"""
Modelo DeviceIntegration — almacena la conexión OAuth con dispositivos externos.

Tokens encriptados con Fernet (cryptography library) a través de EncryptedTextField,
un campo Django 5.x-compatible que nunca escribe texto plano en la base de datos.
"""
from django.conf import settings
from django.db import models

from devices.fields import EncryptedTextField


class DeviceIntegration(models.Model):
    DEVICE_CHOICES = [
        ('garmin', 'Garmin Connect'),
    ]
    STATUS_CHOICES = [
        ('connected',    'Conectado'),
        ('disconnected', 'Desconectado'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='device_integrations',
    )
    device = models.CharField(max_length=50, choices=DEVICE_CHOICES)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='disconnected',
    )

    # Tokens encriptados con Fernet — nunca en texto plano en la DB
    access_token  = EncryptedTextField(null=True, blank=True)
    refresh_token = EncryptedTextField(null=True, blank=True)

    token_expires_at = models.DateTimeField(null=True, blank=True)
    last_synced_at   = models.DateTimeField(null=True, blank=True)

    # Métricas de salud sincronizadas desde Garmin
    hrv           = models.FloatField(null=True, blank=True, help_text='HRV nocturno (ms)')
    sleep_score   = models.FloatField(null=True, blank=True, help_text='Score sueño Garmin 0–100')
    resting_hr    = models.FloatField(null=True, blank=True, help_text='FC en reposo (bpm)')
    stress_level  = models.FloatField(null=True, blank=True, help_text='Nivel de estrés Garmin 0–100')
    body_battery  = models.FloatField(null=True, blank=True, help_text='Body Battery cargada 0–100')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'device')
        verbose_name = 'Integración de dispositivo'
        verbose_name_plural = 'Integraciones de dispositivos'
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.user_id} — {self.device} ({self.status})'
