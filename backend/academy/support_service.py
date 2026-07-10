"""Lógica de Soporte de Zyfit Academy: FAQ + chat estudiante↔staff.

Ver `academy.support_models` para los modelos y `academy.support_views` para
los endpoints. El chat sigue el mismo criterio REST + polling (sin
WebSockets) que el chat coach↔atleta (`users.coach_views` /
`mobile/CLAUDE.md`, "Chat por polling de 5s").
"""

from django.contrib.auth import get_user_model

from .support_models import SupportFAQ, SupportMessage

User = get_user_model()


def faqs_publicadas(tenant):
    return SupportFAQ.objects.filter(tenant=tenant, publicado=True).order_by('orden', 'id')


def serializar_mensaje(msg):
    return {
        'id': msg.id,
        'from_admin': msg.from_admin,
        'texto': msg.texto,
        'created_at': msg.created_at.isoformat(),
    }


def hilo_estudiante(tenant, student):
    """Mensajes del hilo de un estudiante, más viejo primero (máx. 200,
    mismo tope que el chat coach↔atleta)."""
    return list(
        SupportMessage.objects.filter(tenant=tenant, student=student).order_by('created_at')[:200]
    )


def marcar_leidos(tenant, student, from_admin):
    """Marca leídos los mensajes de UN lado del hilo. `from_admin=True` marca
    los del admin (lo llama el estudiante al abrir su chat); `from_admin=False`
    marca los del estudiante (lo llama el admin al abrir ese hilo)."""
    SupportMessage.objects.filter(
        tenant=tenant, student=student, from_admin=from_admin, leido=False,
    ).update(leido=True)


def no_leidos_estudiante(tenant, student):
    """Mensajes del admin sin leer — para el badge del estudiante."""
    return SupportMessage.objects.filter(
        tenant=tenant, student=student, from_admin=True, leido=False,
    ).count()


def enviar_mensaje(tenant, student, texto, from_admin, admin=None):
    return SupportMessage.objects.create(
        tenant=tenant, student=student, texto=texto[:2000], from_admin=from_admin, admin=admin,
    )


def display_name(user):
    p = getattr(user, 'profile', None)
    return (p.nombre if p else '') or user.first_name or user.email.split('@')[0]


def hilos_admin(tenant):
    """Inbox del admin: un hilo por estudiante con al menos un mensaje, con el
    último mensaje y los no leídos (del estudiante), más reciente primero.

    Una sola query a SupportMessage + una a User (sin N+1 por estudiante,
    mismo criterio que `dashboard_service`) — el volumen esperado de mensajes
    de soporte por tenant es bajo, así que agrupar en Python es más simple
    que armar la subquery de "último mensaje por grupo" en el ORM."""
    mensajes = list(SupportMessage.objects.filter(tenant=tenant).order_by('-created_at'))
    por_estudiante = {}
    for m in mensajes:
        grupo = por_estudiante.setdefault(m.student_id, {'ultimo': m, 'no_leidos': 0})
        if not m.from_admin and not m.leido:
            grupo['no_leidos'] += 1

    estudiantes = {
        u.id: u for u in User.objects.filter(id__in=por_estudiante.keys()).select_related('profile')
    }
    resultado = []
    for student_id, grupo in por_estudiante.items():
        est = estudiantes.get(student_id)
        if not est:
            continue
        ultimo = grupo['ultimo']
        resultado.append({
            'student_id': student_id,
            'nombre': display_name(est),
            'email': est.email,
            'ultimo_mensaje': ultimo.texto,
            'ultimo_from_admin': ultimo.from_admin,
            'ultimo_at': ultimo.created_at.isoformat(),
            'no_leidos': grupo['no_leidos'],
        })
    resultado.sort(key=lambda h: h['ultimo_at'], reverse=True)
    return resultado
