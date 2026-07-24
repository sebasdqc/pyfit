"""Traducción automática (español → inglés) de la "información general" de
Academy — Course.titulo/resumen/descripcion, Module.titulo/descripcion,
School.nombre/descripcion. Fuera de alcance a propósito: Lesson.contenido y
Quiz/Question (ver comando `translate_academy_info`).

Reutiliza la integración de Groq YA existente en el proyecto (mismas
constantes de timeout/retry que ai_workout, mismo modelo) en vez de introducir
un proveedor nuevo. Llamadas pequeñas y acotadas por curso — una para el curso,
otra separada para sus módulos — en vez de un solo prompt gigante, para evitar
el truncamiento de JSON bajo el límite de tokens ya documentado en
`ai_workout.views._call_groq` (finish_reason == 'length').

Idempotente: si el campo `_en` ya tiene contenido, se salta salvo `force=True`.
"""

import json
import logging
import time as _time

from django.conf import settings

from ai_workout.views import GROQ_TIMEOUT_SECONDS, GROQ_MAX_RETRIES
from pyfit.llm import get_llm_client
from .models import Course, Module, School

logger = logging.getLogger(__name__)

MAX_TOKENS = 2048


class TranslationUnavailable(Exception):
    """Groq no disponible o la respuesta no se pudo parsear como JSON."""


def _call_groq_json(prompt: str):
    if not settings.LLM_API_KEY:
        raise TranslationUnavailable('LLM_API_KEY not configured')

    t0 = _time.monotonic()
    client = get_llm_client(timeout=GROQ_TIMEOUT_SECONDS, max_retries=GROQ_MAX_RETRIES)
    completion = client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=[{'role': 'user', 'content': prompt}],
        max_tokens=MAX_TOKENS,
    )
    elapsed = _time.monotonic() - t0
    text = (completion.choices[0].message.content or '').strip()
    tokens_in = getattr(completion.usage, 'prompt_tokens', 0) or 0
    tokens_out = getattr(completion.usage, 'completion_tokens', 0) or 0
    logger.info(
        'academy_translate_groq tokens_in=%d tokens_out=%d elapsed=%.2fs',
        tokens_in, tokens_out, elapsed,
    )
    if not text:
        raise TranslationUnavailable('Empty response from AI')
    clean = text.replace('```json', '').replace('```', '').strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError as exc:
        raise TranslationUnavailable(f'Respuesta no es JSON válido: {exc}') from exc


_INSTRUCCIONES = (
    "Traduce al inglés los siguientes campos de una academia deportiva en línea "
    "(Zyfit Academy). Tono profesional/educativo. Usa terminología deportiva "
    "estándar en inglés cuando exista (no traduzcas palabra por palabra un "
    "término técnico). Devuelve SOLO un array JSON, sin texto adicional ni "
    "bloques de markdown, con EXACTAMENTE esta forma (mismo id, mismo orden):\n\n"
    "{items}\n\n"
    "Responde con un array de objetos; cada uno debe traer 'id' y los mismos "
    "campos recibidos con sufijo '_en' (ej. 'titulo' → 'titulo_en')."
)


def _translate_batch(items):
    """items: lista de dicts con 'id' + campos en español. Devuelve
    {id: {<campo>_en: valor}} con lo que Groq devolvió, o {} si falló (la
    llamada NUNCA levanta — el caller decide qué hacer con un resultado vacío)."""
    if not items:
        return {}
    prompt = _INSTRUCCIONES.format(items=json.dumps(items, ensure_ascii=False, indent=2))
    try:
        data = _call_groq_json(prompt)
    except TranslationUnavailable as exc:
        logger.error('academy_translate falló para %d ítem(s): %s', len(items), exc)
        return {}
    if not isinstance(data, list):
        logger.error('academy_translate: la respuesta no es una lista (%r)', type(data))
        return {}
    return {row.get('id'): row for row in data if isinstance(row, dict) and 'id' in row}


def translate_schools(force=False):
    """Traduce nombre/descripción de todas las Schools en una sola llamada
    (son pocas y cortas). Devuelve cuántas se actualizaron."""
    schools = list(School.objects.all())
    pendientes = schools if force else [s for s in schools if not s.nombre_en or not s.descripcion_en]
    if not pendientes:
        return 0
    items = [{'id': s.id, 'nombre': s.nombre, 'descripcion': s.descripcion} for s in pendientes]
    resultados = _translate_batch(items)
    actualizadas = 0
    for school in pendientes:
        row = resultados.get(school.id)
        if not row:
            continue
        school.nombre_en = row.get('nombre_en') or school.nombre_en
        school.descripcion_en = row.get('descripcion_en') or school.descripcion_en
        school.save(update_fields=['nombre_en', 'descripcion_en'])
        actualizadas += 1
    return actualizadas


def translate_course(course, force=False):
    """Traduce SOLO titulo/resumen/descripcion del curso — llamada acotada,
    deliberadamente separada de sus módulos (ver `translate_course_modules`)."""
    if not force and course.titulo_en and course.resumen_en and course.descripcion_en:
        return False
    items = [{
        'id': course.id, 'titulo': course.titulo,
        'resumen': course.resumen, 'descripcion': course.descripcion,
    }]
    row = _translate_batch(items).get(course.id)
    if not row:
        return False
    course.titulo_en = row.get('titulo_en') or course.titulo_en
    course.resumen_en = row.get('resumen_en') or course.resumen_en
    course.descripcion_en = row.get('descripcion_en') or course.descripcion_en
    course.save(update_fields=['titulo_en', 'resumen_en', 'descripcion_en'])
    return True


def translate_course_modules(course, force=False):
    """Traduce titulo/descripcion de TODOS los módulos de un curso en una sola
    llamada (separada de la del curso — ver docstring del módulo). Devuelve
    cuántos módulos se actualizaron."""
    modulos = list(course.modulos.all())
    pendientes = modulos if force else [m for m in modulos if not m.titulo_en or not m.descripcion_en]
    if not pendientes:
        return 0
    items = [{'id': m.id, 'titulo': m.titulo, 'descripcion': m.descripcion} for m in pendientes]
    resultados = _translate_batch(items)
    actualizados = 0
    for modulo in pendientes:
        row = resultados.get(modulo.id)
        if not row:
            continue
        modulo.titulo_en = row.get('titulo_en') or modulo.titulo_en
        modulo.descripcion_en = row.get('descripcion_en') or modulo.descripcion_en
        modulo.save(update_fields=['titulo_en', 'descripcion_en'])
        actualizados += 1
    return actualizados


def count_pending(course_slug=None):
    """Cuenta cuántas escuelas/cursos/módulos NO tienen traducción todavía —
    para `--dry-run`, sin gastar cuota de Groq."""
    cursos_qs = Course.objects.all()
    if course_slug:
        cursos_qs = cursos_qs.filter(slug=course_slug)
    return {
        'escuelas': School.objects.filter(nombre_en='').count() if course_slug is None else 0,
        'cursos': cursos_qs.filter(titulo_en='').count(),
        'modulos': Module.objects.filter(course__in=cursos_qs, titulo_en='').count(),
    }


def translate_all(course_slug=None, force=False):
    """Orquesta el backfill completo: escuelas + cada curso + sus módulos.
    `course_slug` acota a un solo curso (para iterar rápido o reintentar uno
    que falló). Un curso que falla no aborta el resto del lote. Devuelve un
    resumen para que el comando lo imprima."""
    resumen = {'escuelas': 0, 'cursos': 0, 'modulos': 0, 'cursos_fallidos': []}
    if course_slug is None:
        resumen['escuelas'] = translate_schools(force=force)

    cursos = Course.objects.all()
    if course_slug:
        cursos = cursos.filter(slug=course_slug)
    for course in cursos:
        try:
            if translate_course(course, force=force):
                resumen['cursos'] += 1
            resumen['modulos'] += translate_course_modules(course, force=force)
        except Exception:
            logger.exception('academy_translate: el curso %s falló, se continúa con el resto', course.slug)
            resumen['cursos_fallidos'].append(course.slug)
    return resumen
