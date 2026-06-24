from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from django.utils import timezone

from .models import RunSession, RunPoint
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

    serializer = RunPointSerializer(data=request.data.get('points', []), many=True)
    if serializer.is_valid():
        RunPoint.objects.bulk_create([
            RunPoint(session=session, **point) for point in serializer.validated_data
        ])
        return Response({'saved': len(serializer.validated_data)}, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
