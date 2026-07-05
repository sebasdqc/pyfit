"""Servicio de fotos de sesión: valida un dataURI base64 (mismo transporte que el
avatar, ver users/views.upload_avatar) y la persiste. Si USE_SPACES está activo
sube el archivo a DO Spaces (image_key); si no, guarda el data URI directamente
en la columna image_data, como antes. Reutilizado por los endpoints de fotos de
fuerza (workouts) y running (runs)."""
import base64
from io import BytesIO

from django.conf import settings

from pyfit.media_storage import save_image_to_spaces
from .models import SessionPhoto

MAX_PHOTOS_PER_SESSION = 6
MAX_DECODED_BYTES = 4 * 1024 * 1024   # ~4 MB tras decodificar (el móvil comprime antes)
_EXT_BY_MIME = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/gif': 'gif',
}


class PhotoError(Exception):
    """Error de validación de la foto; el caller lo traduce a HTTP 400."""


def create_session_photo(user, data_uri, *, session=None, run_session=None) -> SessionPhoto:
    """Valida y persiste una foto para EXACTAMENTE una sesión (gym o running)."""
    if (session is None) == (run_session is None):
        raise PhotoError('Debe indicarse exactamente una sesión.')

    # Tope de cantidad por sesión.
    owner_qs = session.photos if session is not None else run_session.photos
    if owner_qs.count() >= MAX_PHOTOS_PER_SESSION:
        raise PhotoError(f'Máximo {MAX_PHOTOS_PER_SESSION} fotos por sesión.')

    data_uri = str(data_uri or '')
    if not data_uri.startswith('data:image/'):
        raise PhotoError('Formato de imagen inválido.')
    try:
        header, b64 = data_uri.split(',', 1)
        raw = base64.b64decode(b64)
    except Exception:
        raise PhotoError('Base64 inválido.')
    if not raw:
        raise PhotoError('Imagen vacía.')
    if len(raw) > MAX_DECODED_BYTES:
        raise PhotoError('La imagen es demasiado grande.')

    # Rechazar SVG/XML aunque declaren image/* (igual que upload_avatar).
    snippet = raw[:1024].lower()
    if b'<svg' in snippet or b'<?xml' in snippet or b'<!doctype' in snippet:
        raise PhotoError('Tipo de imagen no permitido.')

    # Extensión desde el mime declarado (no depende de Pillow).
    mime = header.split(';')[0].split(':')[-1].lower()
    ext = _EXT_BY_MIME.get(mime)
    if not ext:
        raise PhotoError('Solo se admiten JPEG, PNG, WebP o GIF.')

    # Validación de magic bytes con Pillow SOLO si está disponible (en prod sí; en
    # local puede no estarlo — el proyecto evita exigir Pillow). Best-effort.
    try:
        from PIL import Image
        Image.open(BytesIO(raw)).verify()
    except ImportError:
        pass
    except Exception:
        raise PhotoError('El archivo no es una imagen válida.')

    if settings.USE_SPACES:
        owner_kind = 'gym' if session is not None else 'running'
        owner_id = session.id if session is not None else run_session.id
        key = save_image_to_spaces(raw, mime, folder=f'session_photos/{owner_kind}/{owner_id}')
        photo = SessionPhoto(user=user, session=session, run_session=run_session, image_key=key)
    else:
        # Se reescribe el dataURI de forma canónica (mime validado + base64 limpio)
        # en vez de confiar en el header entrante.
        canonical = f'data:{mime};base64,{base64.b64encode(raw).decode("ascii")}'
        photo = SessionPhoto(user=user, session=session, run_session=run_session,
                             image_data=canonical)
    photo.save()
    return photo
