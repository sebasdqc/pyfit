from datetime import date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import DailyCheckin
from .serializers import CheckinSerializer


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
    return Response(
        serializer.data,
        status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED,
    )
