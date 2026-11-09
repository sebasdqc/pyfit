"""Endpoints del repaso espaciado (estudiante autenticado).

    GET  /api/academy/repaso/             resumen + preguntas que tocan hoy
    GET  /api/academy/repaso/resumen/     solo el resumen (tarjeta del Home)
    POST /api/academy/repaso/responder/   {question_id, respuestas: [opcion_id]}

Ver academy.review_service para las reglas (cajas, intervalos y seguridad).
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from . import access_service, review_service
from .permissions import IsAcademyUser
from .views import _get_local_date, _registrar_actividad_estudio


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def review_queue(request):
    hoy = _get_local_date(request)
    nivel = access_service.nivel_academia_de(request.user)
    return Response({
        'resumen': review_service.resumen(request.user, nivel, hoy),
        'preguntas': review_service.cola(request.user, nivel, hoy),
    })


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def review_summary(request):
    hoy = _get_local_date(request)
    nivel = access_service.nivel_academia_de(request.user)
    return Response(review_service.resumen(request.user, nivel, hoy))


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def review_answer(request):
    hoy = _get_local_date(request)
    nivel = access_service.nivel_academia_de(request.user)
    respuestas = request.data.get('respuestas')
    if not isinstance(respuestas, list):
        return Response({'detail': 'respuestas debe ser una lista.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        question_id = int(request.data.get('question_id'))
    except (TypeError, ValueError):
        return Response({'detail': 'question_id no es válido.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        resultado = review_service.responder(request.user, nivel, question_id, respuestas, hoy)
    except review_service.ReviewError as exc:
        code = status.HTTP_403_FORBIDDEN if exc.code == 'requiere_academy_pro' else status.HTTP_400_BAD_REQUEST
        return Response({'detail': str(exc), 'code': exc.code}, status=code)
    # Repasar es estudiar: cuenta para la racha igual que completar un quiz.
    resultado['racha_estudio'] = _registrar_actividad_estudio(request.user, request, origen='repaso')
    resultado['resumen'] = review_service.resumen(request.user, nivel, hoy)
    return Response(resultado)
