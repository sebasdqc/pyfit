"""Clasifica cada lección contra la taxonomía curada de competencias vía Groq.

Recorre Escuela → Curso → Módulo → Lección, y para cada una le pide a Groq
que la clasifique contra la lista CERRADA de `Competency` activas (nunca
generación libre — ver `competency_prompts.build_tagging_system_prompt`).
Es REPRODUCIBLE e IDEMPOTENTE: upsert por (lección, competencia), con
`content_hash` para re-clasificar SOLO lo que cambió. Los tags con
`fuente=LessonCompetencyTag.FUENTE_MANUAL` (curados a mano por un admin desde
Django Admin) NUNCA son tocados por este comando, sin importar el hash.

⚠️ SIEMPRE manual (nunca en `entrypoint.sh` ni en ningún cron): consume cuota
de la API de Groq en cada corrida, y su output necesita revisión humana
(empezar con `--dry-run` sobre un curso piloto) antes de que `mastery_service`
empiece a confiar en los tags para recomendar contenido.

Uso:
    python manage.py tag_lesson_competencies --course fundamentos-de-periodizacion --dry-run
    python manage.py tag_lesson_competencies --course fundamentos-de-periodizacion
    python manage.py tag_lesson_competencies                  # todo el catálogo
    python manage.py tag_lesson_competencies --rebuild        # re-clasifica todo
"""

import hashlib
import json
import logging
import time

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from groq import Groq

from academy.competency_models import Competency, LessonCompetencyTag
from academy.competency_prompts import build_tagging_system_prompt, build_tagging_user_message
from academy.models import (
    LESSON_AUDIO, LESSON_EN_VIVO, LESSON_ENTREGABLE, LESSON_PRACTICA,
    LESSON_QUIZ, LESSON_TEXTO, LESSON_VIDEO, Course,
)
from ai_workout.views import GROQ_MAX_RETRIES, GROQ_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)

MODEL = 'llama-3.3-70b-versatile'
TEMPERATURE = 0.15  # clasificación, no generación creativa: buscamos consistencia.
MAX_TOKENS = 300

# Tipos de lección clasificables. `entregable`/`practica` usan el enunciado de
# la consigna (`Lesson.contenido`) igual que texto/video/audio/en_vivo.
CLASIFICABLES = {
    LESSON_TEXTO, LESSON_VIDEO, LESSON_AUDIO, LESSON_EN_VIVO, LESSON_PRACTICA,
    LESSON_ENTREGABLE, LESSON_QUIZ,
}


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def _texto_clasificable(lesson) -> str:
    """Texto a clasificar según el tipo de lección. Para `quiz`, se suma el
    enunciado de las preguntas (NUNCA `respuestas_correctas`, no hace falta
    para clasificar tema) al contenido de la lección."""
    partes = [lesson.contenido or '']
    if lesson.tipo == LESSON_QUIZ and hasattr(lesson, 'quiz'):
        partes += [q.enunciado for q in lesson.quiz.preguntas.all().order_by('orden')]
    return '\n\n'.join(p for p in partes if p).strip()


def _call_groq_tagging(system_prompt: str, user_message: str) -> dict:
    """Mismo patrón que `community_service._call_groq_moderation`: mensajes
    system/user separados, JSON parseado a mano (sin `response_format`, no
    usado en ningún otro lugar del proyecto). Propaga errores del SDK/JSON
    tal cual — el caller decide cómo degradar."""
    if not settings.GROQ_API_KEY:
        raise RuntimeError('GROQ_API_KEY not configured')
    client = Groq(api_key=settings.GROQ_API_KEY, timeout=GROQ_TIMEOUT_SECONDS, max_retries=GROQ_MAX_RETRIES)
    completion = client.chat.completions.create(
        model=MODEL,
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_message},
        ],
        max_tokens=MAX_TOKENS,
        temperature=TEMPERATURE,
    )
    text = (completion.choices[0].message.content or '').strip()
    if not text:
        raise ValueError('Empty response from AI')
    clean = text.replace('```json', '').replace('```', '').strip()
    return json.loads(clean)


class Command(BaseCommand):
    help = 'Clasifica lecciones contra la taxonomía de competencias vía Groq (idempotente, manual).'

    def add_arguments(self, parser):
        parser.add_argument('--course', help='Slug de un solo curso a clasificar.')
        parser.add_argument('--rebuild', action='store_true', help='Re-clasifica todo, ignorando el hash.')
        parser.add_argument('--dry-run', action='store_true', help='Reporta sin escribir en la BD.')

    def handle(self, *args, **options):
        only = options.get('course')
        rebuild = options['rebuild']
        dry = options['dry_run']

        competencias = list(Competency.objects.filter(activo=True).values('slug', 'nombre', 'descripcion'))
        if not competencias:
            self.stderr.write(self.style.ERROR(
                'No hay competencias activas — correr seed_academy_competencies primero.',
            ))
            return
        slugs_validos = {c['slug'] for c in competencias}
        system_prompt = build_tagging_system_prompt(competencias)

        courses = Course.objects.select_related('school')
        if only:
            courses = courses.filter(slug=only)
        courses = list(courses)
        if not courses:
            self.stderr.write(self.style.ERROR('No se encontraron cursos a clasificar.'))
            return

        n_lecciones = n_reclasificadas = n_sin_tags = n_errores = 0

        for course in courses:
            escuela_nombre = course.school.nombre if course.school else ''
            for module in course.modulos.all().order_by('orden'):
                for lesson in module.lecciones.select_related('quiz').prefetch_related('quiz__preguntas').all().order_by('orden'):
                    if lesson.tipo not in CLASIFICABLES:
                        continue
                    n_lecciones += 1

                    texto = _texto_clasificable(lesson)
                    if not texto:
                        continue
                    content_hash = _hash(texto)

                    tags_existentes = list(LessonCompetencyTag.objects.filter(lesson=lesson))
                    tags_manual = [t for t in tags_existentes if t.fuente == LessonCompetencyTag.FUENTE_MANUAL]
                    tags_ia = [t for t in tags_existentes if t.fuente == LessonCompetencyTag.FUENTE_IA]

                    ya_actualizado = (
                        not rebuild and tags_ia and tags_ia[0].content_hash == content_hash
                    )
                    if ya_actualizado:
                        continue

                    user_message = build_tagging_user_message(
                        escuela_nombre=escuela_nombre, curso_titulo=course.titulo,
                        leccion_titulo=lesson.titulo, contenido=texto,
                    )

                    resultado = None
                    for intento in range(2):  # 1 intento + 1 reintento si el JSON no parsea/es inválido.
                        try:
                            t0 = time.monotonic()
                            data = _call_groq_tagging(system_prompt, user_message)
                            elapsed = time.monotonic() - t0
                            crudos = data.get('competencias') if isinstance(data, dict) else None
                            if not isinstance(crudos, list):
                                raise ValueError(f'formato inesperado: {data!r}')
                            resultado = [
                                (c.get('slug'), float(c.get('peso', 0.5)))
                                for c in crudos if isinstance(c, dict) and c.get('slug') in slugs_validos
                            ][:3]
                            logger.info(
                                'tag_lesson_competencies lesson=%s intento=%d elapsed=%.2fs tags=%d',
                                lesson.id, intento, elapsed, len(resultado),
                            )
                            break
                        except Exception as exc:
                            logger.warning(
                                'tag_lesson_competencies lesson=%s intento=%d falló: %s', lesson.id, intento, exc,
                            )
                            resultado = None
                            continue

                    if resultado is None:
                        n_errores += 1
                        self.stderr.write(self.style.WARNING(
                            f'  ✗ "{lesson.titulo}" — Groq no disponible/JSON inválido tras reintento, se salta.',
                        ))
                        continue

                    # No duplicar una competencia que un admin ya tageó a mano.
                    slugs_manual = {t.competency.slug for t in tags_manual}
                    resultado = [(slug, peso) for slug, peso in resultado if slug not in slugs_manual]

                    if dry:
                        etiquetas = ', '.join(f'{s} ({p:.2f})' for s, p in resultado) or '(sin tags)'
                        self.stdout.write(f'  {lesson.titulo[:60]:<60} → {etiquetas}')
                        if not resultado:
                            n_sin_tags += 1
                        n_reclasificadas += 1
                        continue

                    with transaction.atomic():
                        LessonCompetencyTag.objects.filter(
                            lesson=lesson, fuente=LessonCompetencyTag.FUENTE_IA,
                        ).delete()
                        for slug, peso in resultado:
                            LessonCompetencyTag.objects.update_or_create(
                                lesson=lesson,
                                competency=Competency.objects.get(slug=slug),
                                defaults={
                                    'peso': max(0.0, min(1.0, peso)),
                                    'fuente': LessonCompetencyTag.FUENTE_IA,
                                    'content_hash': content_hash,
                                },
                            )
                        # Nota: una lección sin ninguna competencia clara no queda
                        # con ninguna fila (no hay dónde guardar su hash sin tags),
                        # así que se re-consulta a Groq en cada corrida futura —
                        # aceptable: el comando es manual/infrecuente, no un cron.

                    if not resultado:
                        n_sin_tags += 1
                    n_reclasificadas += 1

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ {"Dry-run" if dry else "Completado"}: {n_lecciones} lección(es) clasificables · '
            f'{n_reclasificadas} (re)clasificada(s) · {n_sin_tags} sin competencia clara · '
            f'{n_errores} con error (saltadas).'
        ))
