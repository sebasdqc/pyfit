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
from .models import Profile, UserLocation, UserInjury, MenstrualCycle, PasswordResetCode, Notification, NotificationPreference
from .serializers import RegisterSerializer, ProfileSerializer, UserLocationSerializer, UserInjurySerializer

User = get_user_model()


def _migrar_progreso_academy_anonimo(user, request):
    """Onboarding sin registro de Zyfit Academy: si el visitante navegó
    contenido gratis como anónimo, migra ese progreso a la cuenta recién
    creada (racha día 1, insignias, matrícula) — ver academy.migration_service.
    Failure-safe e importado perezosamente (evita acoplar `users` a `academy`
    a nivel de módulo, mismo patrón que ai_tutor.models.TutorDailyUsage.limit_for);
    la inmensa mayoría de registros no traen este header y no hacen nada aquí."""
    anon_id = request.headers.get('X-Anon-Session', '').strip()
    if not anon_id:
        return
    try:
        from academy.migration_service import migrar_progreso_anonimo
        from academy.models import AnonymousSession
        session = AnonymousSession.objects.filter(pk=anon_id).first()
        migrar_progreso_anonimo(session, user)
    except Exception:
        logger.exception('No se pudo migrar progreso anónimo de Academy')


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    user = serializer.save()
    # Estampa el tenant de Academy resuelto por TenantMiddleware (X-Tenant-Slug
    # del sitio blanco-etiquetado desde el que se registró, si corresponde) —
    # SOLO al crear la cuenta, nunca después. Cuentas registradas sin tenant
    # (p. ej. desde la app móvil) quedan con academy_tenant=None = sin
    # restricción, igual que todas las cuentas anteriores a este campo.
    tenant = getattr(request, 'tenant', None)
    if tenant:
        user.academy_tenant = tenant
        user.save(update_fields=['academy_tenant'])
    refresh = RefreshToken.for_user(user)
    _migrar_progreso_academy_anonimo(user, request)
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
            'role': user.role,
        },
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def google_login(request):
    """Inicio de sesión con Google (SDK nativo en la app).

    La app obtiene un `id_token` de Google con la SDK nativa y lo envía aquí.
    Verificamos firma + audiencia del token contra settings.GOOGLE_OAUTH_CLIENT_IDS
    y buscamos-o-creamos el usuario por email, devolviendo el MISMO par JWT que el
    login normal. Una cuenta creada por Google no tiene contraseña usable
    (set_unusable_password): solo entra por Google hasta que use "olvidé mi
    contraseña" para fijar una.
    """
    token = (request.data.get('id_token') or '').strip()
    if not token:
        return Response({'error': 'Falta el id_token de Google'}, status=status.HTTP_400_BAD_REQUEST)

    audiences = getattr(settings, 'GOOGLE_OAUTH_CLIENT_IDS', [])
    if not audiences:
        logger.error('Google login invocado pero GOOGLE_OAUTH_CLIENT_IDS no está configurado')
        return Response({'error': 'Inicio con Google no disponible'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        # Sin `audience`, verify_oauth2_token valida firma, emisor y expiración
        # pero NO la audiencia: la chequeamos a mano contra la lista de client IDs
        # aceptados (Web/iOS/Android del mismo proyecto de Google Cloud).
        idinfo = google_id_token.verify_oauth2_token(token, google_requests.Request())
    except Exception:
        logger.warning('Google login: id_token inválido', exc_info=True)
        return Response({'error': 'Token de Google inválido'}, status=status.HTTP_401_UNAUTHORIZED)

    if idinfo.get('aud') not in audiences:
        return Response({'error': 'Token de Google inválido'}, status=status.HTTP_401_UNAUTHORIZED)
    if idinfo.get('iss') not in ('accounts.google.com', 'https://accounts.google.com'):
        return Response({'error': 'Token de Google inválido'}, status=status.HTTP_401_UNAUTHORIZED)

    email = (idinfo.get('email') or '').lower().strip()
    if not email or not idinfo.get('email_verified'):
        return Response({'error': 'La cuenta de Google no tiene un email verificado'},
                        status=status.HTTP_400_BAD_REQUEST)

    nombre_google = (idinfo.get('name') or idinfo.get('given_name') or '').strip()
    nombre_default = nombre_google or email.split('@')[0]

    user, created = User.objects.get_or_create(email=email, defaults={'username': email})
    if created:
        # Sin contraseña usable: la cuenta solo entra por Google hasta que el
        # usuario fije una con el flujo de "olvidé mi contraseña".
        user.set_unusable_password()
        user.save(update_fields=['password'])
        Profile.objects.create(user=user, nombre=nombre_default)
    elif not getattr(user, 'profile', None):
        # Cuenta preexistente sin Profile (estado raro): lo creamos para no romper.
        Profile.objects.create(user=user, nombre=nombre_default)

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
            'role': user.role,
        },
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def coach_login_view(request):
    """Login del portal de entrenador.

    Valida credenciales y exige que la cuenta sea un coach con el acceso
    activado. Si las credenciales son válidas pero el acceso de coach no está
    activo (rol distinto, coach sin activar o cuenta inactiva) devuelve 403 con
    `pending_activation` para que el cliente muestre el aviso de activación
    pendiente — sin revelar si la cuenta es o no coach. No afecta a los atletas
    ni al login estándar.
    """
    email = request.data.get('email', '').lower().strip()
    password = request.data.get('password', '')
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.check_password(password):
        return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.coach_acceso_activo:
        return Response({
            'pending_activation': True,
            'detail': 'Tu acceso está pendiente de activación. Si ya nos contactaste, te escribiremos pronto.',
        }, status=status.HTTP_403_FORBIDDEN)
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'email': user.email,
            'nombre': (user.get_full_name() or user.first_name or user.email.split('@')[0]),
            'role': user.role,
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


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """Borra la cuenta del usuario autenticado y todos sus datos asociados
    (Profile, ubicaciones, lesiones, sesiones, ciclos… vía on_delete=CASCADE).

    Se usa cuando el usuario cancela el registro durante el onboarding: como la
    cuenta se crea al registrarse (antes del onboarding), abandonar dejaría un
    usuario con perfil incompleto. Esto garantiza que no queden datos a medias."""
    request.user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    from django.db import transaction

    prof, _ = Profile.objects.get_or_create(
        user=request.user,
        defaults={'nombre': request.user.email.split('@')[0]}
    )

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """POST /api/profile/avatar/ — recibe base64 dataURI y lo guarda en el perfil."""
    import base64
    from io import BytesIO
    from PIL import Image

    avatar_data = request.data.get('avatar', '')
    if not avatar_data:
        return Response({'error': 'No se recibió imagen'}, status=400)

    # 1. Validar prefijo dataURI
    if not avatar_data.startswith('data:image/'):
        return Response({'error': 'Formato inválido'}, status=400)

    # 2. Limitar tamaño (~500 KB tras decodificar → ~680 KB en base64)
    if len(avatar_data) > 700_000:
        return Response({'error': 'Imagen demasiado grande. Máximo 500 KB.'}, status=400)

    # 3. Decodificar y validar bytes reales (bloquea SVG/XML aunque declaren image/*)
    try:
        _, b64part = avatar_data.split(',', 1)
        raw_bytes = base64.b64decode(b64part)
    except Exception:
        return Response({'error': 'Base64 inválido'}, status=400)

    # Rechazar SVG/XML — los primeros 1 KB son suficientes para detectarlos
    snippet = raw_bytes[:1024].lower()
    if b'<svg' in snippet or b'<?xml' in snippet or b'<!doctype' in snippet:
        return Response({'error': 'Tipo de imagen no permitido'}, status=400)

    # Validar magic bytes con Pillow (compatible con Python 3.13+, reemplaza imghdr)
    try:
        img = Image.open(BytesIO(raw_bytes))
        img.verify()
        fmt = img.format.lower() if img.format else ''
    except Exception:
        return Response({'error': 'El archivo no es una imagen válida'}, status=400)

    if fmt not in ('jpeg', 'png', 'gif', 'webp'):
        return Response({'error': 'Solo se admiten JPEG, PNG, GIF o WebP'}, status=400)

    try:
        prof = request.user.profile
    except Exception:
        return Response({'error': 'Perfil no encontrado'}, status=404)

    prof.avatar = avatar_data
    prof.save(update_fields=['avatar'])
    return Response({'ok': True, 'avatar': avatar_data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_push_token(request):
    """POST /api/profile/push-token/ — registra el Expo push token del dispositivo."""
    token = (request.data.get('token') or '').strip()
    if not token:
        return Response({'error': 'token requerido'}, status=400)
    try:
        prof = request.user.profile
    except Exception:
        return Response({'error': 'Perfil no encontrado'}, status=404)
    prof.push_token = token
    prof.save(update_fields=['push_token'])
    return Response({'ok': True})


_VALID_TIPO_LOCATION = {'gimnasio', 'casa', 'exterior'}
_VALID_SEVERIDAD    = {'leve', 'moderada', 'severa', 'cronica'}

# Normaliza las zonas lateralizadas / extra que envía el onboarding
# ('rodilla_izq', 'brazo_der', 'cabeza'...) a las zonas canónicas que entiende
# el motor adaptativo (ZONA_A_BODY_ZONE en ai_workout.adaptive_engine). Sin esto
# el filtro determinista de contraindicaciones por lesión queda desactivado:
# 'rodilla_izq' nunca coincide con la contraindicación 'rodilla'.
_INJURY_ZONA_CANONICAL = {
    'rodilla': 'rodilla', 'rodilla_izq': 'rodilla', 'rodilla_der': 'rodilla',
    'hombro': 'hombro',   'hombro_izq': 'hombro',   'hombro_der': 'hombro',
    'tobillo': 'tobillo', 'tobillo_izq': 'tobillo', 'tobillo_der': 'tobillo',
    'muñeca': 'muñeca',   'muneca': 'muñeca',
    'muneca_izq': 'muñeca', 'muneca_der': 'muñeca',
    'muñeca_izq': 'muñeca', 'muñeca_der': 'muñeca',
    'codo': 'codo',
    'brazo_izq': 'codo',  'brazo_der': 'codo',     # etiqueta UI "Brazo / Codo"
    'muslo_izq': 'cadera', 'muslo_der': 'cadera',
    'cadera': 'cadera',
    'lumbar': 'lumbar',
    'cuello': 'cuello',   'cabeza': 'cuello',       # etiqueta UI "Cabeza / Cuello"
    'pecho': 'hombro',                              # empuje/press → contraindicación de hombro
    'abdomen': 'lumbar',                            # core → carga espinal
    'thoracica': 'thoracica',
}


def _canonical_injury_zona(raw) -> str:
    z = str(raw or '').strip().lower()
    return _INJURY_ZONA_CANONICAL.get(z, z)


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
        zona = _canonical_injury_zona(raw.get('zona'))[:20]
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
                # Push para el mismo logro (fire-and-forget)
                from users.push import send_push
                send_push(
                    profile.user,
                    title=f'{logro["icon"]} ¡Nuevo logro!',
                    body=logro['label'],
                    data={'tipo': 'logro', 'logro_id': logro['id']},
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


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def menstrual_cycle_view(request):
    """PRF-1: GET devuelve el ciclo más reciente; POST registra el inicio del ciclo
    (fecha_inicio + duración). Es lo que consume _calcular_fase_ciclo en la
    generación para adaptar la sesión a la fase del ciclo (GEN-5)."""
    from datetime import date as _date

    if request.method == 'GET':
        ciclo = request.user.ciclos.order_by('-fecha_inicio').first()
        if not ciclo:
            return Response(None)
        return Response({
            'fecha_inicio':   str(ciclo.fecha_inicio),
            'duracion_ciclo': ciclo.duracion_ciclo,
        })

    try:
        fecha_inicio = _date.fromisoformat(str(request.data.get('fecha_inicio', '')))
    except ValueError:
        return Response({'error': 'fecha_inicio inválida (YYYY-MM-DD)'}, status=status.HTTP_400_BAD_REQUEST)
    if fecha_inicio > _date.today():
        return Response({'error': 'La fecha de inicio no puede ser futura.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        dur = int(request.data.get('duracion_ciclo', 28))
    except (ValueError, TypeError):
        dur = 28
    dur = max(20, min(45, dur))

    # update_or_create por fecha → re-guardar la misma fecha actualiza la duración;
    # una fecha nueva registra el inicio del nuevo ciclo (la generación usa el más reciente).
    ciclo, _ = MenstrualCycle.objects.update_or_create(
        user=request.user, fecha_inicio=fecha_inicio,
        defaults={'duracion_ciclo': dur},
    )
    return Response(
        {'fecha_inicio': str(ciclo.fecha_inicio), 'duracion_ciclo': ciclo.duracion_ciclo},
        status=status.HTTP_201_CREATED,
    )


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
