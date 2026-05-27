from datetime import date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import DailyCheckin
from .serializers import CheckinSerializer


def _get_local_date(request) -> date:
    """
    Devuelve la fecha local del dispositivo del cliente (header X-Local-Date).
    Si el header no está presente o es inválido, cae back a date.today() (UTC).

    Esto es necesario porque date.today() en el servidor devuelve la fecha UTC,
    que puede ser un día distinto al del usuario en zonas UTC- cuando entrena
    en la noche (ej: 10 PM local = 3 AM UTC del día siguiente).
    """
    header = request.headers.get('X-Local-Date', '').strip()
    if header:
        try:
            return date.fromisoformat(header)
        except ValueError:
            pass
    return date.today()


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
    hoy = _get_local_date(request)
    data = {**request.data, 'fecha': str(hoy)}
    serializer = CheckinSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save(user=request.user, fecha=hoy)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
