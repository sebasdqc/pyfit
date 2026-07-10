"""Endpoints de solicitudes de suscripción con código de descuento de
influencer — Zyfit Pro y Zyfit Academy Pro (`producto`).

    POST /api/promos/validar/           previsualiza el descuento de un código (sin crear nada)
    POST /api/promos/solicitudes/       crea (o devuelve la ya pendiente) la solicitud del usuario
    GET  /api/promos/solicitudes/mias/  solicitud más reciente del usuario autenticado

Los tres reciben/filtran por `producto` ('zyfit_pro' | 'academy_pro'), con
default 'zyfit_pro' para no romper al cliente mobile existente (que no lo
envía todavía). Sin cobrador conectado todavía: no existe un endpoint que
active un producto por sí solo, eso solo ocurre al confirmar la solicitud
desde Django Admin — ver `promos.payments`.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from pyfit.throttles import PromoCodeValidateRateThrottle

from .models import PRODUCTO_ZYFIT_PRO, CodigoPromocional, SolicitudSuscripcion
from .payments import PRECIOS, CodigoInvalidoError, calcular_precio


def _buscar_codigo(codigo_str, producto):
    if not codigo_str:
        return None, None
    try:
        codigo = CodigoPromocional.objects.get(codigo=codigo_str.strip().upper())
    except CodigoPromocional.DoesNotExist:
        return None, 'Este código no existe.'
    if codigo.producto != producto:
        return None, 'Este código no aplica a este producto.'
    if not codigo.es_valido():
        return None, 'Este código no es válido o ya venció.'
    return codigo, None


def _solicitud_payload(solicitud):
    return {
        'id': solicitud.id,
        'producto': solicitud.producto,
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
@throttle_classes([PromoCodeValidateRateThrottle])
def validar_codigo(request):
    producto = request.data.get('producto') or PRODUCTO_ZYFIT_PRO
    plan_tipo = request.data.get('plan_tipo')
    if producto not in PRECIOS or plan_tipo not in PRECIOS[producto]:
        return Response({'detail': 'plan_tipo inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    codigo, error = _buscar_codigo(request.data.get('codigo'), producto)
    if error:
        return Response({'valido': False, 'mensaje': error})

    precio_lista, descuento_aplicado, precio_final = calcular_precio(producto, plan_tipo, codigo)
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
    producto = request.data.get('producto') or PRODUCTO_ZYFIT_PRO
    plan_tipo = request.data.get('plan_tipo')
    if producto not in PRECIOS or plan_tipo not in PRECIOS[producto]:
        return Response({'detail': 'plan_tipo inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    pendiente = SolicitudSuscripcion.objects.filter(
        user=request.user, producto=producto, estado=SolicitudSuscripcion.ESTADO_PENDIENTE,
    ).first()
    if pendiente:
        return Response(_solicitud_payload(pendiente))

    codigo = None
    codigo_str = request.data.get('codigo')
    if codigo_str:
        codigo, error = _buscar_codigo(codigo_str, producto)
        if error:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

    try:
        precio_lista, descuento_aplicado, precio_final = calcular_precio(producto, plan_tipo, codigo)
    except CodigoInvalidoError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    solicitud = SolicitudSuscripcion.objects.create(
        user=request.user,
        producto=producto,
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
    producto = request.query_params.get('producto') or PRODUCTO_ZYFIT_PRO
    solicitud = SolicitudSuscripcion.objects.filter(user=request.user, producto=producto).first()
    if not solicitud:
        return Response(None)
    return Response(_solicitud_payload(solicitud))
