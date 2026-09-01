import logging
from decimal import Decimal

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import RideSession, CyclistTypeProfile
from .serializers import (
    RideSessionCreateSerializer,
    RideSessionUpdateSerializer,
    RideSessionDetailSerializer,
    RideSessionListSerializer,
    RideFeedbackSerializer,
)

logger = logging.getLogger(__name__)


class RideSessionPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class RideSessionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = RideSessionPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RideSessionCreateSerializer
        return RideSessionListSerializer

    def get_queryset(self):
        qs = RideSession.objects.filter(user=self.request.user)
        desde = self.request.query_params.get('desde')
        if desde:
            qs = qs.filter(started_at__date__gte=desde)
        return qs


class RideSessionDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return RideSessionUpdateSerializer
        return RideSessionDetailSerializer

    def get_queryset(self):
        return RideSession.objects.filter(user=self.request.user)


def _actualizar_cyclist_type_profile(user, session):
    """Tras guardar feedback: si esta RideSession está vinculada a un
    PlannedRide (se conoce su `tipo_sesion`), acumula el promedio de RPE
    real/objetivo y cumplimiento PARA ESE TIPO — mismo patrón exacto que
    runs.views._actualizar_run_type_profile (RunTypeProfile). Se consume en
    generate_ride_session para afinar la potencia/FC de la próxima sesión de
    ese tipo (ver training_science_cycling.power_bias_from_profile).

    Free Rides sin vincular a un plan no tienen tipo_sesion al que atribuir
    el dato — se ignoran a propósito. Nunca debe poder tumbar la respuesta de
    feedback: cualquier error queda logueado, no propagado."""
    try:
        planned = session.planned_origin.first()
        if not planned or session.rpe_real is None or planned.rpe_target is None:
            return
        ctp, _created = CyclistTypeProfile.objects.get_or_create(
            user=user, tipo_sesion=planned.tipo_sesion,
        )
        n = ctp.veces_realizado

        def running_avg(old, new, count):
            if old is None:
                return Decimal(str(new))
            return old + (Decimal(str(new)) - old) / (count + 1)

        ctp.rpe_promedio_real = running_avg(ctp.rpe_promedio_real, session.rpe_real, n)
        ctp.rpe_promedio_target = running_avg(ctp.rpe_promedio_target, planned.rpe_target, n)
        if session.cumplimiento is not None:
            ctp.cumplimiento_promedio = running_avg(ctp.cumplimiento_promedio, session.cumplimiento, n)
        ctp.veces_realizado = n + 1
        ctp.ultima_vez = session.local_date or (session.started_at.date() if session.started_at else None)
        ctp.save()
    except Exception:
        logger.exception('ride_feedback: fallo al actualizar CyclistTypeProfile user=%s', user.id)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ride_feedback(request, pk):
    """Registra el feedback post-salida sobre la RideSession.

    Body (todos opcionales): { rpe_real, rating, cumplimiento, molestias[], feedback_notas }
    Idempotente: volver a enviar sobreescribe el feedback previo."""
    session = get_object_or_404(RideSession, pk=pk, user=request.user)
    serializer = RideFeedbackSerializer(session, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save(feedback_at=timezone.now())
        _actualizar_cyclist_type_profile(request.user, session)
        return Response(
            RideSessionDetailSerializer(session, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
