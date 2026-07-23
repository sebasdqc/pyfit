import logging
from django.conf import settings
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def json_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        return response

    logger.exception('Unhandled exception in %s', context.get('view'))
    # Con DEBUG=False (producción) nunca devolvemos str(exc)/nombre de la
    # excepción al cliente: puede filtrar nombres de columnas/constraints o
    # fragmentos de datos internos. El detalle real solo va al log (arriba).
    if settings.DEBUG:
        body = {'error': str(exc), 'type': type(exc).__name__}
    else:
        body = {'error': 'Error interno del servidor.'}
    return Response(body, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
