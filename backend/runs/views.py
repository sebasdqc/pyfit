import logging
from decimal import Decimal

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from django.utils import timezone

from .models import RunSession, RunPoint, RunTypeProfile
from workouts.photo_service import create_session_photo, PhotoError
from workouts.serializers import SessionPhotoSerializer
from .serializers import (
    RunSessionCreateSerializer,
    RunSessionUpdateSerializer,
    RunSessionDetailSerializer,
    RunSessionListSerializer,
    RunPointSerializer,
    RunFeedbackSerializer,
)

logger = logging.getLogger(__name__)


class RunSessionPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class RunSessionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = RunSessionPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RunSessionCreateSerializer
        return RunSessionListSerializer

    def get_queryset(self):
        qs = RunSession.objects.filter(user=self.request.user)
        desde = self.request.query_params.get('desde')
        if desde:
            qs = qs.filter(started_at__date__gte=desde)
        return qs


class RunSessionDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return RunSessionUpdateSerializer
        return RunSessionDetailSerializer

    def get_queryset(self):
        return RunSession.objects.filter(user=self.request.user).prefetch_related('photos')


# El cliente hace flush cada 10s con muestreo ~2s (BATCH_INTERVAL_MS en
# useRunTracking.ts) → un batch normal trae ~5 puntos. Este tope es solo una
# red de seguridad contra un payload deforme/malicioso, no una restricción
# real de uso: incluso ~1h sin conectividad reencolando puntos (peor caso
# realista de flushPoints) queda muy por debajo.
MAX_POINTS_PER_BATCH = 2000


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_run_points(request, pk):
    """
    Recibe un batch de puntos GPS y los guarda.
    Body: { "points": [ {lat, lng, altitude_m, accuracy_m, timestamp, speed_m_s}, ... ] }
    """
    session = get_object_or_404(RunSession, pk=pk, user=request.user)

    if session.status == 'completed':
        return Response(
            {'error': 'Cannot add points to a completed session.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    points_in = request.data.get('points', [])
    if len(points_in) > MAX_POINTS_PER_BATCH:
        return Response(
            {'error': f'Máximo {MAX_POINTS_PER_BATCH} puntos por batch.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = RunPointSerializer(data=points_in, many=True)
    if serializer.is_valid():
        # ignore_conflicts: un reintento de red que reenvía un batch ya
        # insertado (unique_point_per_session_timestamp) no duplica filas —
        # ver el comentario del constraint en RunPoint.Meta.
        RunPoint.objects.bulk_create(
            [RunPoint(session=session, **point) for point in serializer.validated_data],
            ignore_conflicts=True,
        )
        return Response({'saved': len(serializer.validated_data)}, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def _actualizar_run_type_profile(user, session):
    """Tras guardar feedback: si esta RunSession está vinculada a una
    PlannedRunSession (se conoce su `tipo_sesion`), acumula el promedio de
    RPE real/objetivo y cumplimiento PARA ESE TIPO — equivalente a
    `workouts._actualizar_adaptation_profile` (UserExerciseProfile), pero por
    tipo de sesión en vez de por ejercicio. Se consume en
    `generate_run_session` para afinar el ritmo de la próxima sesión de ese
    tipo (ver `training_science_running.pace_bias_from_profile`).

    Free Runs sin vincular a un plan no tienen tipo_sesion al que atribuir el
    dato — se ignoran a propósito, mismo criterio que el resto del motor
    (el aprendizaje es sobre sesiones PRESCRITAS, no carreras libres).
    Nunca debe poder tumbar la respuesta de feedback: cualquier error queda
    logueado, no propagado."""
    try:
        planned = session.planned_origin.first()
        if not planned or session.rpe_real is None or planned.rpe_target is None:
            return
        rtp, _created = RunTypeProfile.objects.get_or_create(
            user=user, tipo_sesion=planned.tipo_sesion,
        )
        n = rtp.veces_realizado

        def running_avg(old, new, count):
            if old is None:
                return Decimal(str(new))
            return old + (Decimal(str(new)) - old) / (count + 1)

        rtp.rpe_promedio_real = running_avg(rtp.rpe_promedio_real, session.rpe_real, n)
        rtp.rpe_promedio_target = running_avg(rtp.rpe_promedio_target, planned.rpe_target, n)
        if session.cumplimiento is not None:
            rtp.cumplimiento_promedio = running_avg(rtp.cumplimiento_promedio, session.cumplimiento, n)
        rtp.veces_realizado = n + 1
        rtp.ultima_vez = session.local_date or (session.started_at.date() if session.started_at else None)
        rtp.save()
    except Exception:
        logger.exception('run_feedback: fallo al actualizar RunTypeProfile user=%s', user.id)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_feedback(request, pk):
    """Registra el feedback post-carrera sobre la RunSession.

    Body (todos opcionales): { rpe_real, rating, cumplimiento, molestias[], feedback_notas }
    Idempotente: vuelve a enviar sobreescribe el feedback previo.
    """
    session = get_object_or_404(RunSession, pk=pk, user=request.user)
    serializer = RunFeedbackSerializer(session, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save(feedback_at=timezone.now())
        _actualizar_run_type_profile(request.user, session)
        return Response(
            RunSessionDetailSerializer(session, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_photos(request, pk):
    """POST /api/runs/<pk>/photos/ — adjunta una foto (base64 dataURI) a la carrera."""
    session = get_object_or_404(RunSession, pk=pk, user=request.user)
    try:
        photo = create_session_photo(request.user, request.data.get('image', ''), run_session=session)
    except PhotoError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(SessionPhotoSerializer(photo).data, status=status.HTTP_201_CREATED)
