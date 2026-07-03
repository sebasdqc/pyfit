"""Proveedor de embeddings del Tutor de Academy.

Decisión de diseño: embeddings LOCALES con `sentence-transformers` (modelo
multilingüe) + similitud coseno EN PROCESO. El corpus de los cursos es pequeño y
estático, así que no hace falta pgvector ni un vector store externo: guardamos los
vectores como JSON en `TutorChunk.embedding` y la recuperación se resuelve con
aritmética en memoria (instantánea a esta escala) — y funciona igual en SQLite
(dev/tests) y en PostgreSQL (prod).

La interfaz es deliberadamente MÍNIMA (`embed_texts` / `embed_text`) para poder
sustituir el proveedor más adelante (p. ej. una API de embeddings) sin tocar el
resto del tutor. El modelo se carga UNA sola vez por proceso (singleton perezoso)
para no pagar el coste de carga en cada request.
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)

# Modelo multilingüe por defecto (buen soporte de español, 384 dims). Configurable
# por entorno para poder cambiarlo sin tocar código.
DEFAULT_MODEL = getattr(
    settings, 'TUTOR_EMBEDDING_MODEL',
    'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
)

_model = None  # instancia SentenceTransformer cacheada


class EmbeddingsUnavailable(RuntimeError):
    """El backend de embeddings no está disponible (librería/modelo no instalado).

    El tutor degrada con gracia a recuperación por palabras (ver retrieval.py) en
    vez de romper cuando esto ocurre."""


def get_model_name() -> str:
    return DEFAULT_MODEL


def _load_model():
    global _model
    if _model is not None:
        return _model
    try:
        from sentence_transformers import SentenceTransformer
    except Exception as exc:  # ImportError u otros problemas de entorno
        raise EmbeddingsUnavailable(
            f'sentence-transformers no disponible: {exc}'
        ) from exc
    logger.info('tutor_embeddings cargando modelo %s (carga única por proceso)', DEFAULT_MODEL)
    _model = SentenceTransformer(DEFAULT_MODEL)
    return _model


def embed_texts(texts):
    """Devuelve una lista de vectores (list[float]) para `texts`.

    Los vectores se normalizan (norma 1) para que el coseno sea un simple producto
    punto en la recuperación."""
    if not texts:
        return []
    model = _load_model()
    vectors = model.encode(
        list(texts), normalize_embeddings=True, convert_to_numpy=True,
    )
    return [v.tolist() for v in vectors]


def embed_text(text):
    out = embed_texts([text])
    return out[0] if out else []


def is_available() -> bool:
    """True si el modelo de embeddings puede cargarse en este proceso."""
    try:
        _load_model()
        return True
    except EmbeddingsUnavailable:
        return False
