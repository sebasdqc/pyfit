"""
Campo encriptado para tokens OAuth.

Usa Fernet (cryptography library) para encriptar/desencriptar transparentemente.
La clave se lee de settings.FIELD_ENCRYPTION_KEY — una URL-safe base64 de 32 bytes
generada con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

Compatible con Django 5.x.
"""
from django.conf import settings
from django.db import models


def _get_fernet():
    """Retorna instancia de Fernet o None si no hay clave configurada."""
    try:
        from cryptography.fernet import Fernet
    except ImportError as exc:
        raise ImportError(
            'La librería "cryptography" es requerida para encriptar tokens. '
            'Instálala con: pip install cryptography'
        ) from exc

    key = getattr(settings, 'FIELD_ENCRYPTION_KEY', '')
    if not key:
        # En desarrollo sin clave, los tokens se guardan en texto plano
        # y se logea una advertencia.
        import logging
        logging.getLogger(__name__).warning(
            'FIELD_ENCRYPTION_KEY no configurada — '
            'los tokens OAuth se almacenan sin encriptar (solo válido en DEBUG)'
        )
        return None

    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


class EncryptedTextField(models.TextField):
    """
    TextField que encripta el valor antes de guardarlo en la DB
    y lo desencripta al leerlo. Transparente para el ORM.
    """

    def from_db_value(self, value, expression, connection):
        if value is None:
            return None
        fernet = _get_fernet()
        if not fernet:
            return value
        try:
            return fernet.decrypt(value.encode()).decode()
        except Exception:
            # Si el valor no está encriptado (ej: migración desde texto plano),
            # devolver tal cual en lugar de crashear.
            return value

    def get_prep_value(self, value):
        if value is None:
            return None
        fernet = _get_fernet()
        if not fernet:
            return super().get_prep_value(value)
        if isinstance(value, str):
            value = value.encode()
        return fernet.encrypt(value).decode()

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        # El path que aparece en las migraciones apunta a esta clase
        path = 'devices.fields.EncryptedTextField'
        return name, path, args, kwargs
