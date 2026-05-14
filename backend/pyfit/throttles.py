from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """10 intentos por minuto por IP — protección contra brute-force."""
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    """5 registros por hora por IP — protección anti-spam."""
    scope = 'register'


class PasswordResetRateThrottle(AnonRateThrottle):
    """5 resets por hora por IP — evita flooding de emails."""
    scope = 'password_reset'


class GenerateSessionRateThrottle(UserRateThrottle):
    """10 generaciones por hora por usuario — protege el gasto en Groq API."""
    scope = 'generate_session'


class RegenerarEjercicioRateThrottle(UserRateThrottle):
    """20 regeneraciones por hora por usuario — protege el gasto en Groq API."""
    scope = 'regenerar_ejercicio'
