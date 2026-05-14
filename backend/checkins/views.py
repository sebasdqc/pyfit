from datetime import date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import DailyCheckin
from .serializers import CheckinSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def today_checkin(request):
    hoy = date.today()
    try:
        checkin = request.user.checkins.select_related('location').get(fecha=hoy)
        return Response(CheckinSerializer(checkin).data)
    except DailyCheckin.DoesNotExist:
        return Response(None)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkin(request):
    hoy = date.today()
    if request.user.checkins.filter(fecha=hoy).exists():
        return Response({'error': 'Ya existe un check-in para hoy'}, status=status.HTTP_400_BAD_REQUEST)

    data = {**request.data, 'fecha': str(hoy)}
    serializer = CheckinSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save(user=request.user, fecha=hoy)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
