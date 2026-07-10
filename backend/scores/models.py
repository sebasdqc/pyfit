from django.conf import settings
from django.db import models


class ScoreSnapshot(models.Model):
    """Un cálculo del Zyfit Score para un usuario en un momento dado.

    Append-only: cada recálculo (disparado por session_feedback) crea una
    fila nueva, nunca se actualiza una existente. La app lee siempre "la más
    reciente" — nunca se recalcula on-demand en el request de lectura.

    `nivel_p0`: NO es un recálculo desde datos crudos de la ventana P0 — es el
    `nivel_p1` congelado de un snapshot anterior (~28 días atrás). Ver
    scores/service.py::_find_p0_anchor() para el porqué (evita un problema de
    regresión infinita: el Rendimiento de un P0 recalculado necesitaría su
    propio P0 anterior, y así indefinidamente).
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='score_snapshots')
    fecha_corte = models.DateField()

    nivel_p1 = models.FloatField()
    nivel_p0 = models.FloatField(null=True, blank=True)
    momentum = models.FloatField(null=True, blank=True)
    score_final = models.FloatField()

    # Breakdown por componente: valores, pesos aplicados (post-redistribución),
    # y metadata de fuente (ej. "rendimiento_source": "volume_fallback").
    componentes_json = models.JSONField(default=dict, blank=True)

    PERFIL_RENDIMIENTO = 'rendimiento'
    PERFIL_SALUD_GENERAL = 'salud_general'
    PERFIL_CHOICES = [
        (PERFIL_RENDIMIENTO, 'Rendimiento'),
        (PERFIL_SALUD_GENERAL, 'Salud general'),
    ]
    perfil_atleta = models.CharField(max_length=20, choices=PERFIL_CHOICES, null=True, blank=True)

    # {'es_provisional': bool, 'componentes_activos': [...], 'dias_historial': int}
    estado_cold_start = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'score_snapshots'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f'{self.user} — {self.fecha_corte} — {self.score_final}'


class ScoreConfig(models.Model):
    """Parámetros ajustables del motor de Zyfit Score (singleton, pk=1).

    No existe otro modelo singleton en el codebase (no hay django-solo);
    get_solo() implementa el patrón más simple: get_or_create(pk=1).
    """
    momentum_cap = models.FloatField(default=8.0, help_text='Cap de |Momentum| en puntos.')
    rendimiento_cap_pct = models.FloatField(default=0.20, help_text='Cap de cambio de Rendimiento por bloque (± fracción).')
    min_feedback_provisional = models.PositiveSmallIntegerField(default=2, help_text='Mínimo de sesiones con feedback para mostrar score provisional.')
    min_repeticiones_ejercicio = models.PositiveSmallIntegerField(default=2, help_text='Mínimo de repeticiones del mismo ejercicio (por bloque) para activar Rendimiento.')
    min_combinaciones_rpe_salud = models.PositiveSmallIntegerField(default=3, help_text='Mínimo de combinaciones de RPE distintas por ejercicio (perfil salud) para ajustar la regresión.')
    ventana_dias = models.PositiveSmallIntegerField(default=28, help_text='Tamaño de la ventana deslizante P1/P0, en días.')
    umbral_neutral_pct = models.FloatField(default=0.02, help_text='Umbral "sin cambio" (± fracción) para el piso neutral de perfiles no-rendimiento.')
    reps_max_e1rm = models.PositiveSmallIntegerField(default=12, help_text='Reps máximas de una serie para incluirla en el cálculo de e1RM.')
    rango_duracion_similar_cardio_pct = models.FloatField(default=0.20, help_text='Rango de "duración similar" (± fracción) para comparar sesiones de cardio Nivel B.')

    class Meta:
        db_table = 'score_config'
        verbose_name = 'Configuración del Zyfit Score'
        verbose_name_plural = 'Configuración del Zyfit Score'

    def __str__(self):
        return 'Configuración del Zyfit Score'

    @classmethod
    def get_solo(cls) -> 'ScoreConfig':
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
