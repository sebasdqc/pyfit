"""Recuperación (RAG) sobre los chunks indexados de los cursos.

Embebe la pregunta del alumno y la compara por coseno contra los embeddings de
`TutorChunk` (en memoria). Si el backend de embeddings no está disponible, cae a
un ranking por solapamiento de palabras para degradar con gracia en vez de romper.

El corpus es pequeño (unos cientos de chunks), así que el coseno en Python puro es
instantáneo y evita depender de pgvector/numpy en la ruta de recuperación.
"""

import logging
import math
import re

from . import embeddings
from .models import TutorChunk

logger = logging.getLogger(__name__)

TOP_K = 4
# Umbral mínimo de coseno para considerar un chunk como grounding real. Debajo de
# esto asumimos que el curso no cubre la pregunta (el tutor lo dirá explícitamente).
MIN_SCORE = 0.30

_WORD_RE = re.compile(r'\w+', re.UNICODE)


def _cosine(a, b) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


def _tokens(text) -> set:
    return {w.lower() for w in _WORD_RE.findall(text or '') if len(w) > 3}


def _keyword_fallback(query, chunks, top_k):
    """Ranking por solapamiento de palabras (cuando no hay embeddings)."""
    qt = _tokens(query)
    if not qt:
        return []
    scored = []
    for ch in chunks:
        ct = _tokens(ch.contenido)
        if not ct:
            continue
        overlap = len(qt & ct) / len(qt)
        if overlap > 0:
            scored.append((ch, overlap))
    scored.sort(key=lambda t: t[1], reverse=True)
    return scored[:top_k]


def retrieve(query, top_k=TOP_K, course_id=None):
    """Devuelve [(TutorChunk, score)] ordenado desc por relevancia.

    Si `course_id` se pasa, restringe la búsqueda a ese curso (mejor precisión
    cuando el alumno pregunta desde una lección). El caller puede reintentar sin
    filtro si no hay resultados relevantes.
    """
    qs = TutorChunk.objects.all()
    if course_id:
        qs = qs.filter(course_id=course_id)
    chunks = list(qs)
    if not chunks:
        return []

    try:
        qvec = embeddings.embed_text(query)
    except embeddings.EmbeddingsUnavailable:
        logger.warning('tutor_retrieval: embeddings no disponibles, fallback por palabras')
        return _keyword_fallback(query, chunks, top_k)

    if not qvec:
        return _keyword_fallback(query, chunks, top_k)

    scored = []
    for ch in chunks:
        if not ch.embedding:
            continue
        scored.append((ch, _cosine(qvec, ch.embedding)))
    scored.sort(key=lambda t: t[1], reverse=True)
    return [(ch, s) for ch, s in scored[:top_k] if s >= MIN_SCORE]


def retrieve_grounding(query, course_id=None, top_k=TOP_K):
    """Recupera grounding priorizando el curso activo y cayendo al catálogo global.

    Devuelve (results, scoped) donde `scoped=True` indica que los resultados salieron
    del curso activo (útil para matizar la cita)."""
    if course_id:
        scoped = retrieve(query, top_k=top_k, course_id=course_id)
        if scoped:
            return scoped, True
    return retrieve(query, top_k=top_k), False
