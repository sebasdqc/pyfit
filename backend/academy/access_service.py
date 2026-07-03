"""Control de acceso a contenido de Zyfit Academy por tier (freemium).

Único punto de verdad: TODOS los endpoints que sirven o mutan contenido de un
módulo/lección deben pasar por `puede_ver_modulo`/`puede_ver_leccion` en vez de
repetir el chequeo de tier a mano.

`puede_ver_modulo`/`puede_ver_leccion` reciben el NIVEL ya resuelto (no el
`user`) a propósito: cuando exista el onboarding "probar antes de registrar"
(sesión anónima, sin cuenta — fuera de alcance de esta iteración), solo hace
falta un resolver nuevo para esa sesión que devuelva 'starter'/'pro'; esta
función de gating no cambia.
"""

NIVEL_STARTER = 'starter'
NIVEL_PRO = 'pro'


def nivel_academia_de(user) -> str:
    """Nivel de acceso a Academy de un usuario autenticado.

    Instructores/admin siempre ven todo (autoría/QA). El resto depende de si
    tiene una AcademySubscription propia con acceso vigente — NO de
    `users.Profile.plan` (Academy Pro es un paquete separado de "Zyfit Pro").
    """
    if not (user and user.is_authenticated):
        return NIVEL_STARTER
    if user.is_admin or user.is_staff or user.academy_instructor:
        return NIVEL_PRO
    sub = getattr(user, 'academy_subscription', None)
    return NIVEL_PRO if (sub and sub.da_acceso_pro()) else NIVEL_STARTER


def puede_ver_modulo(nivel: str, module) -> bool:
    """¿Puede un usuario con este NIVEL ver el contenido de este módulo?"""
    return nivel == NIVEL_PRO or module.es_gratuito


def puede_ver_leccion(nivel: str, lesson) -> bool:
    return puede_ver_modulo(nivel, lesson.module)
