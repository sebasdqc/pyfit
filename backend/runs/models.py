from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class RunSession(models.Model):
    SESSION_TYPE_CHOICES = [
        ('free', 'Free Run'),
        ('planned', 'Planned Run'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='run_sessions')

    # Metadata
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Tipo — extensible para Planned Run
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES, default='free')

    # FK prepared for future Planned Run module — uncomment when 'plans' app exists
    # plan_session = models.ForeignKey(
    #     'plans.PlanSession',
    #     null=True, blank=True,
    #     on_delete=models.SET_NULL,
    #     related_name='run_sessions'
    # )

    # Métricas agregadas (se calculan al completar la sesión)
    total_distance_m = models.FloatField(default=0)
    total_duration_s = models.IntegerField(default=0)
    avg_pace_s_per_km = models.IntegerField(default=0)
    best_pace_s_per_km = models.IntegerField(default=0)
    calories_burned = models.FloatField(default=0)
    elevation_gain_m = models.FloatField(default=0)
    avg_heart_rate = models.IntegerField(null=True, blank=True)  # preparado para HR monitor

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'session_type']),
        ]

    def __str__(self):
        return f"{self.user.username} — {self.session_type} — {self.started_at:%Y-%m-%d %H:%M}"


class RunPoint(models.Model):
    session = models.ForeignKey(RunSession, on_delete=models.CASCADE, related_name='points')

    lat = models.FloatField()
    lng = models.FloatField()
    altitude_m = models.FloatField(null=True, blank=True)
    accuracy_m = models.FloatField()           # para filtrar puntos de baja calidad
    timestamp = models.DateTimeField()
    speed_m_s = models.FloatField(null=True, blank=True)  # velocidad instantánea del GPS

    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['session', 'timestamp']),
        ]
