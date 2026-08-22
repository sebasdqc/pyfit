from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import RideSession
from .serializers import (
    RideSessionCreateSerializer,
    RideSessionUpdateSerializer,
    RideSessionDetailSerializer,
    RideSessionListSerializer,
    RideFeedbackSerializer,
)


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
        return Response(
            RideSessionDetailSerializer(session, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
