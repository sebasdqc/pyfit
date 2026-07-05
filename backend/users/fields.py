"""
Campo JSON encriptado para datos médicos estructurados (Profile.condiciones_medicas).

Reutiliza la misma clave y helper de Fernet que devices.fields.EncryptedTextField
(FIELD_ENCRYPTION_KEY). El valor almacenado en la columna jsonb/json es un STRING
JSON que contiene el token cifrado, no la estructura real — funciona igual en
Postgres y SQLite porque Django siempre decodifica el valor crudo de la columna
a texto ANTES de llamar from_db_value/get_prep_value (psycopg registra un loader
de texto plano para jsonb específicamente para permitir decoders custom como
este; ver django.db.backends.postgresql.psycopg_any.get_adapters_template).
"""
import json

from django.db import models

from devices.fields import _get_fernet


class EncryptedJSONField(models.JSONField):
    """JSONField cuyo contenido se guarda encriptado. Filas creadas antes de
    activar el cifrado (con la lista/dict en texto plano) se leen tal cual —
    no se pierden ni rompen, solo quedan sin encriptar hasta que algo las
    vuelva a guardar (ver la migración de datos que re-encripta lo existente)."""

    def get_prep_value(self, value):
        if value is None:
            return None
        fernet = _get_fernet()
        if not fernet:
            return super().get_prep_value(value)
        plaintext = json.dumps(value, cls=self.encoder)
        return fernet.encrypt(plaintext.encode()).decode()

    def from_db_value(self, value, expression, connection):
        decoded = super().from_db_value(value, expression, connection)
        if not isinstance(decoded, str):
            return decoded  # None, o fila sin migrar ya deserializada a list/dict
        fernet = _get_fernet()
        if not fernet:
            return decoded
        try:
            plaintext = fernet.decrypt(decoded.encode()).decode()
            return json.loads(plaintext, cls=self.decoder)
        except Exception:
            return decoded  # token inválido o fila sin migrar

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        path = 'users.fields.EncryptedJSONField'
        return name, path, args, kwargs
