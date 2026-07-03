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


class RefreshRateThrottle(AnonRateThrottle):
    """20 refreshes por minuto por IP — impide el volcado masivo de tokens de acceso
    desde un refresh token robado antes de que se detecte el compromiso."""
    scope = 'token_refresh'


class SessionResumenRateThrottle(UserRateThrottle):
    """20 resúmenes por hora por usuario — protege el gasto en Groq API.
    session_resumen llama a Groq en cada cache-miss; sin throttle un usuario
    puede forzar misses en sesiones distintas para disparar costes."""
    scope = 'session_resumen'


class ImpersonateRateThrottle(UserRateThrottle):
    """5 impersonaciones por hora por cuenta staff — limita la enumeración de
    usuarios en caso de que un token de staff quede comprometido."""
    scope = 'impersonate'


class ExerciseCatalogRateThrottle(AnonRateThrottle):
    """60 peticiones por minuto por IP al catálogo público — previene scraping
    masivo del catálogo sin autenticación."""
    scope = 'exercise_catalog'


class AIChatRateThrottle(UserRateThrottle):
    """30 mensajes por hora por usuario — protege el gasto en Groq API.
    El chat IA llama a Groq en cada mensaje; sin throttle un usuario puede
    disparar costes arbitrarios en sesiones largas."""
    scope = 'ai_chat'


class AcademyTutorRateThrottle(UserRateThrottle):
    """Tope HORARIO anti-ráfaga del Tutor de Academy — protege el gasto en Groq.
    El límite diario real por tier (free 3 / pro 30) lo aplica TutorDailyUsage a
    nivel de negocio; este throttle es un respaldo por hora."""
    scope = 'academy_tutor'


class AnonSessionRateThrottle(AnonRateThrottle):
    """20 sesiones anónimas nuevas por hora por IP — cada POST crea una fila
    de `AnonymousSession` en BD sin necesitar cuenta; sin este límite, el
    backstop genérico (60/min) permitía crear miles de sesiones huérfanas por
    hora. Solo cuenta POST: el GET (rehidratar la UI) no crea filas."""
    scope = 'anon_session'

    def allow_request(self, request, view):
        if request.method != 'POST':
            return True
        return super().allow_request(request, view)


class CommunityRateThrottle(UserRateThrottle):
    """30 publicaciones (preguntas + respuestas) por hora por usuario — protege
    el gasto en Groq: cada post/respuesta que no cae en los guardrails baratos
    pasa por `community_service.moderar_texto`, que llama a Groq. Sin este
    throttle, el backstop genérico de 300/min dejaba pasar hasta ~18.000
    llamadas/hora por cuenta. Solo cuenta POST (crear contenido); listar,
    votar y reportar no llaman a Groq y no necesitan este límite."""
    scope = 'community_write'

    def allow_request(self, request, view):
        if request.method != 'POST':
            return True
        return super().allow_request(request, view)
