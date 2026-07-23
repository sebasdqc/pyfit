from django.test import TestCase, override_settings

from pyfit.exceptions import json_exception_handler


class JsonExceptionHandlerTests(TestCase):
    """`json_exception_handler` es el EXCEPTION_HANDLER global de DRF — cubre
    los 3 productos. No debe filtrar `str(exc)` en producción (DEBUG=False)."""

    def _call(self):
        return json_exception_handler(ValueError('columna x_secreta no existe'), {'view': None})

    @override_settings(DEBUG=False)
    def test_prod_hides_exception_detail(self):
        response = self._call()
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data, {'error': 'Error interno del servidor.'})

    @override_settings(DEBUG=True)
    def test_debug_still_shows_exception_detail(self):
        response = self._call()
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data['error'], 'columna x_secreta no existe')
        self.assertEqual(response.data['type'], 'ValueError')
