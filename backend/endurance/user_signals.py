"""Señales del usuario para estimar baseline — SPORT-AGNOSTIC, pero SÍ toca
Django (a diferencia de science.py/periodization.py/readiness.py, que son
puros): lee `users.Profile.fecha_nacimiento` y `devices.DeviceIntegration`,
ninguno de los dos propio de un deporte.

Extraído de `ai_running/baseline.py` 2026-08-21 al escribir
`ai_cycling/baseline.py` — misma lógica exacta, sin nada de correr."""


def edad_from_user(user) -> int | None:
    """Edad en años desde `Profile.fecha_nacimiento`, o None si no está cargada."""
    from django.utils import timezone
    perfil = getattr(user, 'profile', None)
    fn = getattr(perfil, 'fecha_nacimiento', None)
    if not fn:
        return None
    hoy = timezone.localdate()
    return hoy.year - fn.year - ((hoy.month, hoy.day) < (fn.month, fn.day))


def resting_hr_from_device(user) -> int | None:
    """FC de reposo del último dato de dispositivo (Garmin/Apple Health), si
    existe. Defensivo: si el modelo/campo cambia, devuelve None sin romper la
    estimación de baseline de ningún deporte."""
    try:
        from devices.models import DeviceIntegration
        di = (DeviceIntegration.objects
              .filter(user=user, resting_hr__isnull=False)
              .order_by('-id').first())
        return di.resting_hr if di else None
    except Exception:
        return None
