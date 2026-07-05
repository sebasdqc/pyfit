"""
Guarda/sirve imágenes de usuario (avatares, fotos de sesión) en DO Spaces
cuando está configurado (settings.USE_SPACES); si no, el caller conserva el
comportamiento histórico de guardar el data URI base64 directamente en la fila.

Las validaciones (tamaño, mime, rechazo de SVG, magic bytes) siguen viviendo en
cada caller (users.views.upload_avatar, workouts.photo_service) — este módulo
solo resuelve DÓNDE queda el byte final: Spaces o la propia fila.
"""
import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

_EXT_BY_MIME = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/gif': 'gif',
}


def save_image_to_spaces(raw: bytes, mime: str, *, folder: str, stable_name: str | None = None) -> str:
    """Guarda `raw` en Spaces bajo `folder/` y devuelve la key resultante.

    Con `stable_name` (p. ej. el user id) reutiliza siempre el mismo nombre de
    archivo — el caller es responsable de borrar la key anterior primero si el
    nombre puede cambiar (p. ej. cambia la extensión entre subidas). Sin
    `stable_name` (fotos de sesión, donde puede haber varias) usa un nombre
    único por archivo.

    AWS_S3_FILE_OVERWRITE=False (ver settings.py) hace que Storage.save()
    NUNCA sobreescriba un nombre existente — por eso, si el nombre exacto ya
    existe, se borra antes de guardar para que el re-upload quede en el mismo
    lugar en vez de acumular objetos huérfanos con sufijos.
    """
    ext = _EXT_BY_MIME.get(mime, 'jpg')
    name = f'{folder}/{stable_name}.{ext}' if stable_name else f'{folder}/{uuid.uuid4().hex}.{ext}'
    if default_storage.exists(name):
        default_storage.delete(name)
    return default_storage.save(name, ContentFile(raw))


def resolve_image_url(*, legacy_data_uri: str, storage_key: str) -> str:
    """URL a mostrar: la key de Spaces (resuelta a URL firmada) si existe, si
    no el data URI legacy guardado en la fila."""
    if storage_key:
        return default_storage.url(storage_key)
    return legacy_data_uri or ''


def delete_image(storage_key: str) -> None:
    """Borra el objeto de Spaces si existe. Best-effort: un fallo acá no debe
    romper el flujo principal (borrar una foto, reemplazar un avatar)."""
    if not storage_key:
        return
    try:
        default_storage.delete(storage_key)
    except Exception:
        pass
