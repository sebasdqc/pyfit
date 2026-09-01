"""Servicio de baseline del ciclista: lee un test de 20-30 min declarado y/o el
historial de RideSession, estima FTHR/FTP con training_science_cycling y
escribe las zonas en CyclistProfile. Espejo de ai_running/baseline.py.
Reutilizable desde las vistas y el motor.

El nivel "historial" (ver training_science_cycling.estimate_threshold) usa
potencia normalizada (o promedio, sin potenciómetro) de salidas largas y
sentidas como duras como proxy de un test de 20 min — no hay RidePoint para
aislar el mejor tramo sostenido como sí puede hacer running desde el GPS."""
from datetime import timedelta

from django.utils import timezone

from cycling.models import CyclistProfile
from endurance import user_signals as _us
from . import training_science_cycling as ts


def get_or_create_cyclist_profile(user) -> CyclistProfile:
    cp, _ = CyclistProfile.objects.get_or_create(user=user)
    return cp


def _rides_for_baseline(user, days: int = 120) -> list[dict]:
    """RideSession completadas recientes en el formato que espera estimate_threshold."""
    from cycling.models import RideSession
    since = timezone.now() - timedelta(days=days)
    qs = RideSession.objects.filter(user=user, status='completed', started_at__gte=since)
    return [{
        'duration_min':       (r.total_duration_s or 0) / 60.0,
        'rpe_real':           r.rpe_real or 0,
        'normalized_power_w': r.normalized_power_w,
        'avg_power_w':        r.avg_power_w,
        'avg_heart_rate':     r.avg_heart_rate,
    } for r in qs]


def recompute_cyclist_baseline(user, *, declared_test: dict = None) -> CyclistProfile:
    """Recalcula el baseline completo y persiste el CyclistProfile.

    declared_test = {'avg_power_w': ..., 'avg_hr_20min': ...} de un test de
    20-30 min declarado, o None (en ese caso se estima desde el historial de
    RideSession). Respeta fc_max/fc_reposo ya fijados a mano (solo los
    completa si están vacíos) — mismo criterio que running."""
    cp = get_or_create_cyclist_profile(user)

    est = ts.estimate_threshold(declared_test=declared_test, rides=_rides_for_baseline(user))
    if est['ftp_w']:
        cp.ftp_w = est['ftp_w']
    if est['fthr_bpm']:
        cp.fthr_bpm = est['fthr_bpm']
    cp.fuente_baseline = est['fuente']
    cp.confianza = est['confianza']
    cp.n_rides_baseline = est['n']

    # FC: completar FCmáx por edad (Tanaka) y FC reposo desde dispositivo si faltan.
    edad = _us.edad_from_user(user)
    if cp.fc_max is None and edad:
        cp.fc_max = ts.fc_max_tanaka(edad)
        cp.fc_max_es_estimada = True
    if cp.fc_reposo is None:
        rhr = _us.resting_hr_from_device(user)
        if rhr:
            cp.fc_reposo = rhr

    cp.zonas = ts.derive_zones(
        fthr_bpm=cp.fthr_bpm, ftp_w=cp.ftp_w,
        fc_max=cp.fc_max, fc_reposo=cp.fc_reposo,
        fc_max_es_estimada=cp.fc_max_es_estimada,
    )
    cp.fecha_calculo = timezone.now()
    cp.save()
    return cp
