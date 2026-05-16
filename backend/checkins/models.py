from django.db import models
from django.conf import settings


class DailyCheckin(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='checkins')
    fecha = models.DateField()
    estado_animo = models.IntegerField()
    calidad_sueno = models.DecimalField(max_digits=4, decimal_places=1)
    hrv = models.IntegerField(null=True, blank=True)
    location = models.ForeignKey(
        'users.UserLocation', on_delete=models.SET_NULL, null=True, blank=True, related_name='checkins'
    )
    duracion_disponible = models.IntegerField()
    foco_entrenamiento = models.JSONField(default=list, blank=True)
    estado_fisico = models.IntegerField(null=True, blank=True)
    dolor_hoy = models.TextField(blank=True, null=True)
    notas = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'daily_checkin'
        indexes = [
            models.Index(fields=['user', '-fecha']),
        ]

    def __str__(self):
        return f'{self.user} - {self.fecha}'
