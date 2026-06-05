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


class ConfirmResetRateThrottle(AnonRateThrottle):
    """10 intentos por hora por IP — impide brute-force del PIN de 6 dígitos.
    Sin este throttle, un atacante puede probar 1.000.000 combinaciones antes
    de que el código expire en 15 minutos.
    """
    scope = 'confirm_reset'


class GenerateSessionRateThrottle(UserRateThrottle):
    """10 generaciones por hora por usuario — protege el gasto en Groq API."""
    scope = 'generate_session'


class RegenerarEjercicioRateThrottle(UserRateThrottle):
    """20 regeneraciones por hora por usuario — protege el gasto en Groq API."""
    scope = 'regenerar_ejercicio'


class AjustarSesionRateThrottle(UserRateThrottle):
    """15 ajustes por hora por usuario — previene abuso de Groq via session_ajustar.
    session_ajustar llama a la API de Groq; sin throttle el usuario puede
    disparar costes arbitrarios.
    """
    scope = 'ajustar_sesion'


class CoachChatRateThrottle(UserRateThrottle):
    """60 mensajes por minuto por usuario — anti-spam del chat coach↔atleta.
    Solo cuenta los envíos (POST): el GET hace polling cada 5s y no debe gastar
    el presupuesto ni ser bloqueado."""
    scope = 'coach_chat'

    def allow_request(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return super().allow_request(request, view)


class CoachVincularRateThrottle(UserRateThrottle):
    """20 intentos por hora por usuario — frena el barrido de códigos de coach
    (el atleta está autenticado, así que el límite es por cuenta)."""
    scope = 'coach_vincular'
