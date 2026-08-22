"""Servicio de baseline del ciclista: lee un test de 20-30 min declarado, estima
FTHR/FTP con training_science_cycling y escribe las zonas en CyclistProfile.
Espejo de ai_running/baseline.py. Reutilizable desde las vistas y el motor.

⚠️ Sin nivel "historial" todavía (a diferencia de estimate_threshold_pace de
running, que suma el mejor 1km de Free Runs): training_science_cycling.
estimate_threshold() solo tiene declarado→cold_start. Sumar un tercer nivel
desde RideSession es trabajo nuevo, no parte de esta fase — ver la nota en
ese módulo antes de tocarlo."""
from django.utils import timezone

from cycling.models import CyclistProfile
from endurance import user_signals as _us
from . import training_science_cycling as ts


def get_or_create_cyclist_profile(user) -> CyclistProfile:
    cp, _ = CyclistProfile.objects.get_or_create(user=user)
    return cp


def recompute_cyclist_baseline(user, *, declared_test: dict = None) -> CyclistProfile:
    """Recalcula el baseline completo y persiste el CyclistProfile.

    declared_test = {'avg_power_w': ..., 'avg_hr_20min': ...} de un test de
    20-30 min declarado, o None. Respeta fc_max/fc_reposo ya fijados a mano
    (solo los completa si están vacíos) — mismo criterio que running."""
    cp = get_or_create_cyclist_profile(user)

    est = ts.estimate_threshold(declared_test=declared_test)
    if est['ftp_w']:
        cp.ftp_w = est['ftp_w']
    if est['fthr_bpm']:
        cp.fthr_bpm = est['fthr_bpm']
    cp.fuente_baseline = est['fuente']
    cp.confianza = est['confianza']

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
