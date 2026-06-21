"""Servicio de baseline del corredor: lee el historial de Free Run (RunSession) y/o
un tiempo declarado, estima el umbral con training_science_running y escribe las
zonas en RunnerProfile. Reutilizable desde las vistas (F1) y el motor (F2/F3)."""
from datetime import timedelta

from django.utils import timezone

from runs.models import RunSession, RunnerProfile
from . import training_science_running as ts


def get_or_create_runner_profile(user) -> RunnerProfile:
    rp, _ = RunnerProfile.objects.get_or_create(user=user)
    return rp


def _runs_for_baseline(user, days: int = 120) -> list[dict]:
    """RunSession completadas recientes en el formato que espera estimate_threshold_pace."""
    since = timezone.now() - timedelta(days=days)
    qs = RunSession.objects.filter(user=user, status='completed', started_at__gte=since)
    return [{
        'best_pace_s_km': r.best_pace_s_per_km or 0,
        'avg_pace_s_km':  r.avg_pace_s_per_km or 0,
        'distance_km':    (r.total_distance_m or 0) / 1000.0,
        'duration_s':     r.total_duration_s or 0,
    } for r in qs]


def _edad(user) -> int | None:
    perfil = getattr(user, 'profile', None)
    fn = getattr(perfil, 'fecha_nacimiento', None)
    if not fn:
        return None
    hoy = timezone.localdate()
    return hoy.year - fn.year - ((hoy.month, hoy.day) < (fn.month, fn.day))


def _resting_hr_from_device(user) -> int | None:
    """FC de reposo del último dato de dispositivo (Garmin/Apple Health), si existe.
    Defensivo: si el modelo/campo cambia, devuelve None sin romper la estimación."""
    try:
        from devices.models import DeviceIntegration
        di = (DeviceIntegration.objects
              .filter(user=user, resting_hr__isnull=False)
              .order_by('-id').first())
        return di.resting_hr if di else None
    except Exception:
        return None


def recompute_runner_baseline(user, *, declared=None) -> RunnerProfile:
    """Recalcula el baseline completo y persiste el RunnerProfile.

    declared = (tiempo_s, distancia_km) de una carrera reciente (alta confianza),
    o None para estimar solo desde el historial. Respeta fc_max/fc_reposo ya
    fijados a mano (solo los completa si están vacíos)."""
    rp = get_or_create_runner_profile(user)
    perfil = getattr(user, 'profile', None)
    nivel = (getattr(perfil, 'nivel', None) or 'intermedio')

    est = ts.estimate_threshold_pace(declared=declared, runs=_runs_for_baseline(user), nivel=nivel)
    rp.threshold_pace_s_km = est['threshold_pace_s_km']
    rp.vo2_estimado = est['vo2_estimado']
    rp.fuente_baseline = est['fuente']
    rp.confianza = est['confianza']
    rp.n_runs_baseline = est['n']

    # FC: completar FCmáx por edad (Tanaka) y FC reposo desde dispositivo si faltan.
    edad = _edad(user)
    if rp.fc_max is None and edad:
        rp.fc_max = ts.fc_max_tanaka(edad)
        rp.fc_max_es_estimada = True
    if rp.fc_reposo is None:
        rhr = _resting_hr_from_device(user)
        if rhr:
            rp.fc_reposo = rhr

    rp.volumen_semanal_base_km = ts.weekly_volume_baseline(_runs_for_baseline(user, days=28))
    rp.zonas = ts.derive_zones(
        threshold_pace_s_km=rp.threshold_pace_s_km,
        fc_max=rp.fc_max, fc_reposo=rp.fc_reposo,
        fc_max_es_estimada=rp.fc_max_es_estimada,
    )
    rp.fecha_calculo = timezone.now()
    rp.save()
    return rp
