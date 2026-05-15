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
from pyfit.throttles import LoginRateThrottle, RegisterRateThrottle, PasswordResetRateThrottle
from .models import Profile, UserLocation, UserInjury, PasswordResetCode
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
            'onboarding_completo': bool(profile and profile.objetivo),
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
    try:
        prof = request.user.profile
    except Profile.DoesNotExist:
        prof = Profile.objects.create(user=request.user, nombre=request.user.email.split('@')[0])

    if request.method == 'GET':
        return Response(ProfileSerializer(prof).data)

    serializer = ProfileSerializer(prof, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    _check_logros(prof)
    return Response(serializer.data)


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
