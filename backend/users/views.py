import logging
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status

logger = logging.getLogger(__name__)
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from pyfit.throttles import LoginRateThrottle, RegisterRateThrottle, PasswordResetRateThrottle, ConfirmResetRateThrottle
from .models import Profile, UserLocation, UserInjury, PasswordResetCode, Notification, NotificationPreference
from .serializers import RegisterSerializer, ProfileSerializer, UserLocationSerializer, UserInjurySerializer

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {'id': user.id, 'email': user.email},
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    email = request.data.get('email', '').lower().strip()
    password = request.data.get('password', '')
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.check_password(password):
        return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.is_active:
        return Response({'error': 'Cuenta inactiva'}, status=status.HTTP_401_UNAUTHORIZED)
    refresh = RefreshToken.for_user(user)
    profile = getattr(user, 'profile', None)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'email': user.email,
            'nombre': profile.nombre if profile else '',
            'onboarding_completo': bool(profile and profile.is_onboarding_complete),
            'is_staff': user.is_staff,
        },
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def reset_password(request):
    email = request.data.get('email', '').lower().strip()
    try:
        user = User.objects.get(email=email)
        reset_code = PasswordResetCode.generate_for(user)
        send_mail(
            subject='Tu código de recuperación — PyFit',
            message=(
                f'Tu código de verificación es: {reset_code.code}\n\n'
                f'Este código expira en 15 minutos.\n\n'
                f'Si no solicitaste esto, ignora este mensaje.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
    except User.DoesNotExist:
        pass
    except Exception:
        logger.exception('reset_password: unexpected error for email=%s', email)
    return Response({'detail': 'Si el email existe, recibirás el código de verificación.'})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ConfirmResetRateThrottle])
def confirm_reset(request):
    email = request.data.get('email', '').lower().strip()
    code = request.data.get('code', '').strip()
    new_password = request.data.get('new_password', '')

    if not email or not code or not new_password:
        return Response({'error': 'Todos los campos son requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new_password) < 8:
        return Response({'error': 'La contraseña debe tener al menos 8 caracteres'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'Código inválido o expirado'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        logger.exception('confirm_reset: db error looking up user email=%s', email)
        return Response({'error': 'Error interno. Intenta de nuevo.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        reset_code = PasswordResetCode.objects.filter(user=user, code=code).latest('created_at')
    except PasswordResetCode.DoesNotExist:
        return Response({'error': 'Código inválido o expirado'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        logger.exception('confirm_reset: db error looking up reset code user=%s', user.pk)
        return Response({'error': 'Error interno. Intenta de nuevo.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    if not reset_code.is_valid():
        reset_code.delete()
        return Response({'error': 'El código ha expirado. Solicita uno nuevo.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    reset_code.delete()
    return Response({'detail': 'Contraseña actualizada correctamente'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            pass
    return Response({'detail': 'Sesión cerrada'})


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    from django.db import transaction

    try:
        prof = request.user.profile
    except Profile.DoesNotExist:
        prof = Profile.objects.create(user=request.user, nombre=request.user.email.split('@')[0])

    if request.method == 'GET':
        return Response(ProfileSerializer(prof).data)

    serializer = ProfileSerializer(prof, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    old_goal = prof.goal  # capture before save

    with transaction.atomic():
        serializer.save()
        _sync_user_locations(request.user, request.data)
        _sync_user_injuries(request.user, request.data)

    prof.refresh_from_db()
    _check_logros(prof)

    # Handle goal transition when goal changes
    new_goal = prof.goal
    if new_goal and old_goal != new_goal:
        from django.utils import timezone
        prof.previous_goal = old_goal or ''
        prof.goal_changed_at = timezone.now()
        prof.save(update_fields=['previous_goal', 'goal_changed_at'])
        try:
            from workouts.training_cycle import apply_goal_transition
            apply_goal_transition(request.user, old_goal or '', new_goal)
        except Exception:
            import logging
            logging.getLogger(__name__).error(
                'goal_transition failed for user %s', request.user.id, exc_info=True,
            )

    data = serializer.data
    data['onboarding_completo'] = prof.is_onboarding_complete
    return Response(data)


_VALID_TIPO_LOCATION = {'gimnasio', 'casa', 'exterior'}
_VALID_SEVERIDAD    = {'leve', 'moderada', 'severa', 'cronica'}


def _sync_user_locations(user, payload):
    """Replace user.locations with the structured list, if provided."""
    lugares = payload.get('lugares_estructurados')
    if not isinstance(lugares, list):
        return
    user.locations.all().delete()
    for raw in lugares[:10]:
        if not isinstance(raw, dict):
            continue
        nombre = str(raw.get('nombre') or '').strip()[:100]
        if not nombre:
            continue
        tipo = str(raw.get('tipo') or 'casa').strip().lower()
        if tipo not in _VALID_TIPO_LOCATION:
            tipo = 'casa'
        implementos = raw.get('implementos')
        if not isinstance(implementos, list):
            implementos = []
        implementos = [str(i)[:100] for i in implementos[:50] if i]
        UserLocation.objects.create(user=user, nombre=nombre, tipo=tipo, implementos=implementos)


def _sync_user_injuries(user, payload):
    """Replace user.injuries with the structured list, if provided."""
    lesiones = payload.get('lesiones_estructuradas')
    if not isinstance(lesiones, list):
        return
    user.injuries.all().delete()
    for raw in lesiones[:30]:
        if not isinstance(raw, dict):
            continue
        zona = str(raw.get('zona') or '').strip()[:20]
        if not zona:
            continue
        severidad = str(raw.get('severidad') or 'leve').strip().lower()[:20]
        if severidad not in _VALID_SEVERIDAD:
            severidad = 'leve'
        descripcion = str(raw.get('descripcion') or '')[:500]
        activa = bool(raw.get('activa', True))
        UserInjury.objects.create(
            user=user, zona=zona, severidad=severidad,
            descripcion=descripcion, activa=activa,
        )


def _check_logros(profile):
    LOGROS_DEF = [
        {'id': 'primera_sesion', 'label': 'Primera sesión', 'icon': '🎯', 'min_sesiones': 1},
        {'id': 'racha_3',        'label': 'Racha de 3',     'icon': '🔥', 'min_racha': 3},
        {'id': 'racha_7',        'label': 'Semana perfecta','icon': '💎', 'min_racha': 7},
        {'id': 'sesiones_10',    'label': '10 sesiones',    'icon': '⚡', 'min_sesiones': 10},
        {'id': 'sesiones_25',    'label': '25 sesiones',    'icon': '🏆', 'min_sesiones': 25},
        {'id': 'sesiones_50',    'label': '50 sesiones',    'icon': '👑', 'min_sesiones': 50},
    ]
    total_sesiones = profile.user.sessions.count()
    logros_actuales = {l['id'] for l in (profile.logros or [])}
    nuevos = list(profile.logros or [])
    changed = False
    for logro in LOGROS_DEF:
        if logro['id'] in logros_actuales:
            continue
        cumple = (
            ('min_sesiones' in logro and total_sesiones >= logro['min_sesiones']) or
            ('min_racha' in logro and profile.racha_actual >= logro['min_racha'])
        )
        if cumple:
            nuevos.append({'id': logro['id'], 'label': logro['label'], 'icon': logro['icon']})
            changed = True
            try:
                prefs = getattr(profile.user, 'notification_prefs', None)
                if prefs is None or prefs.logro:
                    Notification.objects.create(
                        user=profile.user,
                        tipo='logro',
                        texto=f'¡Desbloqueaste "{logro["icon"]} {logro["label"]}"! Sigue construyendo hábitos.',
                    )
            except Exception:
                pass
    if changed:
        profile.logros = nuevos
        profile.save(update_fields=['logros'])


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def locations_view(request):
    if request.method == 'GET':
        locs = request.user.locations.all()
        return Response(UserLocationSerializer(locs, many=True).data)
    serializer = UserLocationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save(user=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def injuries_view(request):
    if request.method == 'GET':
        return Response(UserInjurySerializer(request.user.injuries.all(), many=True).data)
    serializer = UserInjurySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save(user=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def injury_detail_view(request, pk):
    try:
        injury = request.user.injuries.get(pk=pk)
    except UserInjury.DoesNotExist:
        return Response({'error': 'No encontrado'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'DELETE':
        injury.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = UserInjurySerializer(injury, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def location_detail_view(request, pk):
    try:
        loc = request.user.locations.get(pk=pk)
    except UserLocation.DoesNotExist:
        return Response({'error': 'No encontrado'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(UserLocationSerializer(loc).data)
    if request.method == 'DELETE':
        loc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = UserLocationSerializer(loc, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


# ─── Notification helpers ─────────────────────────────────────────────────────

def _get_notif_prefs(user):
    try:
        return user.notification_prefs
    except NotificationPreference.DoesNotExist:
        return None


def _maybe_generate_notifications(user):
    from datetime import date, timedelta
    from django.utils import timezone

    hoy   = date.today()
    ahora = timezone.now()
    prefs = _get_notif_prefs(user)

    silencio = prefs is not None and prefs.silencio
    dentro_horario = prefs is None or prefs.within_hora_window()

    # Non-critical notifications: skip if silenced or outside hora window
    if not silencio and dentro_horario:
        # Reencuentro — last session ≥ 5 days ago, no reencuentro in last 5 days
        if prefs is None or prefs.reencuentro:
            ultima = user.sessions.order_by('-fecha').values('fecha').first()
            if ultima:
                dias = (hoy - ultima['fecha']).days
                if dias >= 5:
                    ya_existe = user.notifications.filter(
                        tipo='reencuentro',
                        created_at__gte=ahora - timedelta(days=5),
                    ).exists()
                    if not ya_existe:
                        try:
                            nombre = user.profile.nombre or 'atleta'
                        except Exception:
                            nombre = 'atleta'
                        Notification.objects.create(
                            user=user,
                            tipo='reencuentro',
                            texto=(
                                f'Han pasado {dias} días desde tu último entrenamiento, {nombre}. '
                                'Tu cuerpo agradece la consistencia.'
                            ),
                        )

        # Insight semanal — ≥ 2 sesiones en los últimos 7 días, no insight en los últimos 7
        if prefs is None or prefs.insight:
            sesiones_semana = user.sessions.filter(fecha__gte=hoy - timedelta(days=7)).count()
            if sesiones_semana >= 2:
                ya_existe = user.notifications.filter(
                    tipo='insight',
                    created_at__gte=ahora - timedelta(days=7),
                ).exists()
                if not ya_existe:
                    _crear_insight_notification(user, sesiones_semana)

    # Critical alerts — always shown in-app regardless of silencio, but respect hora window
    if dentro_horario:
        _check_alertas_criticas(user, ahora)


def _check_alertas_criticas(user, ahora):
    from datetime import timedelta
    from django.db.models import Avg

    # RPE > 9 for 3 consecutive sessions
    ultimas = list(
        user.sessions.filter(feedback__isnull=False)
        .order_by('-fecha', '-created_at')
        .values('feedback__rpe_real')[:3]
    )
    if len(ultimas) >= 3 and all(
        s['feedback__rpe_real'] is not None and float(s['feedback__rpe_real']) > 9
        for s in ultimas
    ):
        ya_existe = user.notifications.filter(
            tipo='alerta',
            texto__icontains='RPE',
            created_at__gte=ahora - timedelta(days=7),
        ).exists()
        if not ya_existe:
            Notification.objects.create(
                user=user,
                tipo='alerta',
                texto='Tu RPE superó 9 en las últimas 3 sesiones consecutivas. Considera un día de recuperación activa antes de la próxima sesión.',
            )

    # Injury pattern — 3+ pain reports in check-ins in 7 days
    try:
        from checkins.models import DailyCheckin
        pain_count = DailyCheckin.objects.filter(
            user=user,
            fecha__gte=(ahora - timedelta(days=7)).date(),
            dolor_hoy__isnull=False,
        ).exclude(dolor_hoy='').count()
        if pain_count >= 3:
            ya_existe = user.notifications.filter(
                tipo='alerta',
                texto__icontains='dolor',
                created_at__gte=ahora - timedelta(days=7),
            ).exists()
            if not ya_existe:
                Notification.objects.create(
                    user=user,
                    tipo='alerta',
                    texto=f'Reportaste molestias en {pain_count} sesiones de los últimos 7 días. Revisa tu técnica y considera una consulta con un especialista.',
                )
    except Exception:
        pass


def _crear_insight_notification(user, sesiones_semana):
    from datetime import date, timedelta
    from django.db.models import Avg

    hoy = date.today()
    stats = user.sessions.filter(
        fecha__gte=hoy - timedelta(days=7),
        feedback__isnull=False,
    ).aggregate(
        rpe_avg=Avg('feedback__rpe_real'),
        cum_avg=Avg('feedback__cumplimiento'),
    )
    rpe = stats['rpe_avg']
    cum = stats['cum_avg']

    if rpe and cum:
        texto = (
            f'Esta semana entrenaste {sesiones_semana} veces '
            f'con un RPE promedio de {float(rpe):.1f} y {float(cum):.0f}% de cumplimiento. '
            'Sigue así.'
        )
    else:
        texto = (
            f'Esta semana entrenaste {sesiones_semana} veces. '
            'Registra tu feedback para obtener insights personalizados.'
        )
    Notification.objects.create(user=user, tipo='insight', texto=texto)


# ─── Notification views ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_list(request):
    _maybe_generate_notifications(request.user)
    notifs = request.user.notifications.order_by('leida', '-created_at')[:50]
    data = [
        {
            'id':        n.id,
            'tipo':      n.tipo,
            'texto':     n.texto,
            'leida':     n.leida,
            'timestamp': n.created_at.isoformat(),
        }
        for n in notifs
    ]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notification_leer(request, pk):
    try:
        notif = request.user.notifications.get(pk=pk)
    except Notification.DoesNotExist:
        return Response({'error': 'No encontrada'}, status=status.HTTP_404_NOT_FOUND)
    notif.leida = True
    notif.save(update_fields=['leida'])
    return Response({'ok': True})


# ─── Notification preferences ─────────────────────────────────────────────────

VALID_TIPOS = {'invitacion', 'insight', 'alerta', 'logro', 'reencuentro'}


def _prefs_response(prefs):
    return {
        'invitacion':  prefs.invitacion,
        'insight':     prefs.insight,
        'alerta':      prefs.alerta,
        'logro':       prefs.logro,
        'reencuentro': prefs.reencuentro,
        'hora_inicio': prefs.hora_inicio.strftime('%H:%M'),
        'hora_fin':    prefs.hora_fin.strftime('%H:%M'),
        'silencio':    prefs.silencio,
    }


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def notification_prefs_view(request):
    from datetime import time as dtime

    prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        return Response(_prefs_response(prefs))

    fields_to_save = []

    # Boolean tipo fields
    for tipo in VALID_TIPOS:
        if tipo in request.data:
            setattr(prefs, tipo, bool(request.data[tipo]))
            fields_to_save.append(tipo)

    # Silencio
    if 'silencio' in request.data:
        prefs.silencio = bool(request.data['silencio'])
        fields_to_save.append('silencio')

    # Hora fields — accept "HH:MM:SS", "HH:MM", or integer hour
    for field in ('hora_inicio', 'hora_fin'):
        if field not in request.data:
            continue
        val = request.data[field]
        try:
            if isinstance(val, str):
                hour = int(val.split(':')[0])
            else:
                hour = int(val)
            hour = max(7, min(22, hour))
            setattr(prefs, field, dtime(hour, 0))
            fields_to_save.append(field)
        except (ValueError, TypeError):
            pass

    if fields_to_save:
        prefs.save(update_fields=fields_to_save)

    return Response(_prefs_response(prefs))
