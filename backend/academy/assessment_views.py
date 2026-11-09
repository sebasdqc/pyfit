"""Endpoints del diagnóstico inicial y la evaluación final (estudiante).

    GET  /api/academy/enrollments/<id>/evaluaciones/                estado + ganancia
    GET  /api/academy/enrollments/<id>/evaluaciones/<kind>/         preguntas (sin clave)
    POST /api/academy/enrollments/<id>/evaluaciones/<kind>/         {respuestas: {qid: [opcion]}}

`kind` = `diagnostico` | `final`. Ver academy.assessment_service.
"""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from . import access_service, assessment_service
from .models import Enrollment
from .permissions import IsAcademyUser


def _enrollment(request, enrollment_id):
    return get_object_or_404(Enrollment, pk=enrollment_id, student=request.user)


def _error(exc):
    code = status.HTTP_409_CONFLICT if exc.code == 'ya_hecha' else status.HTTP_400_BAD_REQUEST
    return Response({'detail': str(exc), 'code': exc.code}, status=code)


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def assessment_status(request, enrollment_id):
    enrollment = _enrollment(request, enrollment_id)
    return Response(assessment_service.estado(enrollment, access_service.nivel_academia_de(request.user)))


@api_view(['GET', 'POST'])
@permission_classes([IsAcademyUser])
def assessment_run(request, enrollment_id, kind):
    enrollment = _enrollment(request, enrollment_id)
    nivel = access_service.nivel_academia_de(request.user)
    try:
        if request.method == 'GET':
            return Response({
                'kind': kind,
                'preguntas': assessment_service.preguntas(enrollment, nivel, kind),
            })
        return Response(
            assessment_service.calificar(enrollment, nivel, kind, request.data.get('respuestas')),
            status=status.HTTP_201_CREATED,
        )
    except assessment_service.AssessmentError as exc:
        return _error(exc)
