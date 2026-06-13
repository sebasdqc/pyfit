from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class DailyCheckin(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='checkins')
    fecha = models.DateField()
    estado_animo = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    calidad_sueno = models.DecimalField(
        max_digits=4, decimal_places=1,
        validators=[MinValueValidator(0), MaxValueValidator(15)],
    )
    hrv = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(300)],
    )
    location = models.ForeignKey(
        'users.UserLocation', on_delete=models.SET_NULL, null=True, blank=True, related_name='checkins'
    )
    duracion_disponible = models.IntegerField(
        validators=[MinValueValidator(10), MaxValueValidator(300)],
    )
    foco_entrenamiento = models.JSONField(default=list, blank=True)
    estado_fisico = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    dolor_hoy = models.TextField(blank=True, null=True)
    notas = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'daily_checkin'
        unique_together = [('user', 'fecha')]
        indexes = [
            models.Index(fields=['user', '-fecha']),
        ]

    def __str__(self):
        return f'{self.user} - {self.fecha}'
