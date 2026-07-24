from datetime import date
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import DailyCheckin
from .serializers import CheckinSerializer


def _dias_desde_ultima_sesion(user, hoy):
    """Días desde la última sesión de ENTRENAMIENTO real: fuerza con feedback
    (regla "día entrenado = con feedback") o running completado, lo más reciente
    de las dos. None si nunca entrenó. Alimenta la ventana de día de descanso.
    Failure-safe: cualquier error devuelve None y nunca rompe el guardado."""
    try:
        from workouts.models import Session
        from runs.models import RunSession
        fechas = []
        f_fuerza = (Session.objects.filter(user=user, feedback__isnull=False)
                    .order_by('-fecha').values_list('fecha', flat=True).first())
        if f_fuerza:
            fechas.append(f_fuerza)
        r_dt = (RunSession.objects.filter(user=user, status='completed', ended_at__isnull=False)
                .order_by('-ended_at').values_list('ended_at', flat=True).first())
        if r_dt:
            fechas.append(timezone.localtime(r_dt).date())
        if not fechas:
            return None
        # La sesión más reciente = el menor número de días desde hoy.
        return max(0, min((hoy - f).days for f in fechas))
    except Exception:
        return None


def _get_local_date(request) -> date:
    """
    Devuelve la fecha local del dispositivo (header X-Local-Date) para lecturas.
    Acepta la fecha del cliente solo si está dentro de ±1 día del servidor,
    al igual que _get_write_date, para un modelo de confianza coherente.
    """
    server_today = date.today()
    header = request.headers.get('X-Local-Date', '').strip()
    if header:
        try:
            client_date = date.fromisoformat(header)
            if abs((client_date - server_today).days) <= 1:
                return client_date
        except ValueError:
            pass
    return server_today


def _get_write_date(request) -> date:
    """
    Devuelve la fecha para operaciones de escritura.
    Acepta X-Local-Date solo si está dentro de ±1 día de date.today() para
    manejar diferencias de zona horaria, pero rechaza fechas arbitrarias del
    pasado o futuro que permitirían inflar rachas y adherencia artificialmente.
    """
    server_today = date.today()
    header = request.headers.get('X-Local-Date', '').strip()
    if header:
        try:
            client_date = date.fromisoformat(header)
            if abs((client_date - server_today).days) <= 1:
                return client_date
        except ValueError:
            pass
    return server_today


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def today_checkin(request):
    hoy = _get_local_date(request)
    checkin = request.user.checkins.select_related('location').filter(fecha=hoy).order_by('-created_at').first()
    if checkin:
        return Response(CheckinSerializer(checkin).data)
    return Response(None)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkin(request):
    hoy = _get_write_date(request)
    data = {**request.data, 'fecha': str(hoy)}
    # Evita acumular check-ins duplicados del mismo día: si ya existe uno hoy se
    # actualiza en lugar de crear otro (el último estado del día es el válido).
    existing = request.user.checkins.filter(fecha=hoy).order_by('-created_at').first()
    serializer = CheckinSerializer(existing, data=data) if existing else CheckinSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save(user=request.user, fecha=hoy)
    payload = dict(serializer.data)
    payload['dias_desde_ultima_sesion'] = _dias_desde_ultima_sesion(request.user, hoy)
    return Response(
        payload,
        status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED,
    )
