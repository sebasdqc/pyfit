"""Endpoints de solicitudes de suscripción a Zyfit Pro con código de
descuento de influencer.

    POST /api/promos/validar/           previsualiza el descuento de un código (sin crear nada)
    POST /api/promos/solicitudes/       crea (o devuelve la ya pendiente) la solicitud del usuario
    GET  /api/promos/solicitudes/mias/  solicitud más reciente del usuario autenticado

Sin cobrador conectado todavía: no existe un endpoint que active Pro por sí
solo, eso solo ocurre al confirmar la solicitud desde Django Admin — ver
`promos.payments`.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CodigoPromocional, SolicitudSuscripcion
from .payments import PRECIOS, CodigoInvalidoError, calcular_precio


def _buscar_codigo(codigo_str):
    if not codigo_str:
        return None, None
    try:
        codigo = CodigoPromocional.objects.get(codigo=codigo_str.strip().upper())
    except CodigoPromocional.DoesNotExist:
        return None, 'Este código no existe.'
    if not codigo.es_valido():
        return None, 'Este código no es válido o ya venció.'
    return codigo, None


def _solicitud_payload(solicitud):
    return {
        'id': solicitud.id,
        'plan_tipo': solicitud.plan_tipo,
        'codigo': solicitud.codigo_promocional.codigo if solicitud.codigo_promocional else None,
        'precio_lista': solicitud.precio_lista,
        'descuento_aplicado': solicitud.descuento_aplicado,
        'precio_final': solicitud.precio_final,
        'estado': solicitud.estado,
        'created_at': solicitud.created_at.isoformat(),
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validar_codigo(request):
    plan_tipo = request.data.get('plan_tipo')
    if plan_tipo not in PRECIOS:
        return Response({'detail': 'plan_tipo inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    codigo, error = _buscar_codigo(request.data.get('codigo'))
    if error:
        return Response({'valido': False, 'mensaje': error})

    precio_lista, descuento_aplicado, precio_final = calcular_precio(plan_tipo, codigo)
    return Response({
        'valido': True,
        'mensaje': 'Código aplicado.',
        'precio_lista': precio_lista,
        'descuento_aplicado': descuento_aplicado,
        'precio_final': precio_final,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_solicitud(request):
    plan_tipo = request.data.get('plan_tipo')
    if plan_tipo not in PRECIOS:
        return Response({'detail': 'plan_tipo inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    pendiente = SolicitudSuscripcion.objects.filter(
        user=request.user, estado=SolicitudSuscripcion.ESTADO_PENDIENTE,
    ).first()
    if pendiente:
        return Response(_solicitud_payload(pendiente))

    codigo = None
    codigo_str = request.data.get('codigo')
    if codigo_str:
        codigo, error = _buscar_codigo(codigo_str)
        if error:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

    try:
        precio_lista, descuento_aplicado, precio_final = calcular_precio(plan_tipo, codigo)
    except CodigoInvalidoError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    solicitud = SolicitudSuscripcion.objects.create(
        user=request.user,
        plan_tipo=plan_tipo,
        codigo_promocional=codigo,
        precio_lista=precio_lista,
        descuento_aplicado=descuento_aplicado,
        precio_final=precio_final,
        comision_influencer=codigo.comision_monto if codigo else 0,
    )
    return Response(_solicitud_payload(solicitud), status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mi_solicitud(request):
    solicitud = SolicitudSuscripcion.objects.filter(user=request.user).first()
    if not solicitud:
        return Response(None)
    return Response(_solicitud_payload(solicitud))
