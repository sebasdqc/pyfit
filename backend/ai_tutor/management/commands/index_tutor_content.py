"""Indexa el contenido de los cursos para el RAG del Tutor de Academy.

Recorre los cursos (Escuela → Curso → Módulo → Lección), trocea el `contenido` de
las lecciones de tipo texto/video/audio/en_vivo/práctica en chunks, calcula su
embedding y hace UPSERT en `TutorChunk`. Es la fuente de grounding del tutor.

Es REPRODUCIBLE e IDEMPOTENTE: upsert por (lección, chunk_index) y `content_hash`
para re-embeber SOLO lo que cambió (barato de re-correr en cada deploy). Borra los
chunks que ya no correspondan a contenido vigente.

Uso:
    python manage.py index_tutor_content
    python manage.py index_tutor_content --course fundamentos-de-periodizacion
    python manage.py index_tutor_content --rebuild        # re-embebe todo
    python manage.py index_tutor_content --dry-run        # reporta sin escribir
"""

import hashlib

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from academy.models import (
    Course, LESSON_TEXTO, LESSON_VIDEO, LESSON_AUDIO, LESSON_EN_VIVO, LESSON_PRACTICA,
)
from ai_tutor import embeddings
from ai_tutor.models import TutorChunk

# Tipos de lección cuyo cuerpo (`contenido`) sirve de grounding conceptual.
GROUNDING_TIPOS = {LESSON_TEXTO, LESSON_VIDEO, LESSON_AUDIO, LESSON_EN_VIVO, LESSON_PRACTICA}

CHUNK_MAX_CHARS = 1100


def _chunk_text(text: str, max_chars=CHUNK_MAX_CHARS):
    """Trocea por párrafos (doble salto) agrupando hasta ~max_chars por chunk."""
    text = (text or '').strip()
    if not text:
        return []
    paras = [p.strip() for p in text.split('\n\n') if p.strip()]
    chunks, buf = [], ''
    for p in paras:
        # Párrafo enorme: pártelo en trozos duros.
        if len(p) > max_chars:
            if buf:
                chunks.append(buf)
                buf = ''
            for i in range(0, len(p), max_chars):
                chunks.append(p[i:i + max_chars])
            continue
        if buf and len(buf) + 2 + len(p) > max_chars:
            chunks.append(buf)
            buf = p
        else:
            buf = f'{buf}\n\n{p}' if buf else p
    if buf:
        chunks.append(buf)
    return chunks


def _hash(model_name: str, text: str) -> str:
    return hashlib.sha256(f'{model_name}\n{text}'.encode('utf-8')).hexdigest()


class Command(BaseCommand):
    help = 'Indexa el contenido de los cursos para el RAG del Tutor de Academy (idempotente).'

    def add_arguments(self, parser):
        parser.add_argument('--course', help='Slug de un solo curso a indexar.')
        parser.add_argument('--rebuild', action='store_true', help='Re-embebe todo, ignorando el hash.')
        parser.add_argument('--dry-run', action='store_true', help='Reporta sin escribir en la BD.')
        parser.add_argument('--require-embeddings', action='store_true',
                            help='Falla si el backend de embeddings no está disponible.')

    def handle(self, *args, **options):
        only = options.get('course')
        rebuild = options['rebuild']
        dry = options['dry_run']
        require = options['require_embeddings']

        model_name = embeddings.get_model_name()

        courses = Course.objects.select_related('school')
        if only:
            courses = courses.filter(slug=only)
        courses = list(courses)
        if not courses:
            self.stderr.write(self.style.ERROR('No se encontraron cursos a indexar.'))
            return

        # 1) Parsear todos los chunks objetivo.
        parsed = []          # dicts con meta + contenido + hash
        processed_course_ids = []
        for course in courses:
            processed_course_ids.append(course.id)
            escuela = course.school
            for module in course.modulos.all().order_by('orden'):
                for lesson in module.lecciones.all().order_by('orden'):
                    if lesson.tipo not in GROUNDING_TIPOS:
                        continue
                    for idx, texto in enumerate(_chunk_text(lesson.contenido)):
                        parsed.append({
                            'lesson': lesson, 'course': course,
                            'escuela_nombre': escuela.nombre if escuela else '',
                            'escuela_slug': escuela.slug if escuela else '',
                            'curso_titulo': course.titulo, 'curso_slug': course.slug,
                            'modulo_titulo': module.titulo, 'modulo_orden': module.orden,
                            'leccion_titulo': lesson.titulo, 'leccion_orden': lesson.orden,
                            'chunk_index': idx, 'contenido': texto,
                            'content_hash': _hash(model_name, texto),
                        })

        n_chunks = len(parsed)
        self.stdout.write(
            f'{len(courses)} curso(s) · {n_chunks} chunks objetivo · modelo {model_name}'
        )

        # 2) ¿Cuáles necesitan (re)embeber?
        existing = {
            (c.lesson_id, c.chunk_index): c
            for c in TutorChunk.objects.filter(course_id__in=processed_course_ids)
        }
        to_embed = []
        for row in parsed:
            key = (row['lesson'].id, row['chunk_index'])
            prev = existing.get(key)
            needs = (
                rebuild or prev is None or not prev.embedding
                or prev.content_hash != row['content_hash']
                or prev.embedding_model != model_name
            )
            row['_needs_embed'] = needs
            if needs:
                to_embed.append(row)

        self.stdout.write(f'{len(to_embed)} chunk(s) requieren embedding.')

        if dry:
            self.stdout.write(self.style.SUCCESS('Dry-run: no se escribió nada.'))
            return

        # 3) Embeber los que hagan falta (en lote).
        vectors = {}
        if to_embed:
            try:
                embs = embeddings.embed_texts([r['contenido'] for r in to_embed])
                for r, v in zip(to_embed, embs):
                    vectors[(r['lesson'].id, r['chunk_index'])] = v
            except embeddings.EmbeddingsUnavailable as exc:
                if require:
                    raise CommandError(f'Embeddings no disponibles: {exc}')
                self.stderr.write(self.style.WARNING(
                    f'Embeddings no disponibles ({exc}). Se guardan los chunks SIN vector; '
                    'el tutor usará recuperación por palabras hasta re-indexar con el modelo.'
                ))

        # 4) Upsert idempotente + limpieza de chunks obsoletos.
        with transaction.atomic():
            for row in parsed:
                key = (row['lesson'].id, row['chunk_index'])
                defaults = {
                    'course': row['course'],
                    'escuela_nombre': row['escuela_nombre'], 'escuela_slug': row['escuela_slug'],
                    'curso_titulo': row['curso_titulo'], 'curso_slug': row['curso_slug'],
                    'modulo_titulo': row['modulo_titulo'], 'modulo_orden': row['modulo_orden'],
                    'leccion_titulo': row['leccion_titulo'], 'leccion_orden': row['leccion_orden'],
                    'contenido': row['contenido'], 'content_hash': row['content_hash'],
                }
                if key in vectors:
                    defaults['embedding'] = vectors[key]
                    defaults['embedding_model'] = model_name
                TutorChunk.objects.update_or_create(
                    lesson=row['lesson'], chunk_index=row['chunk_index'], defaults=defaults,
                )

            # Borra chunks que ya no corresponden a contenido vigente (por curso).
            vigentes = {(r['lesson'].id, r['chunk_index']) for r in parsed}
            obsoletos = [
                c.id for c in TutorChunk.objects.filter(course_id__in=processed_course_ids)
                if (c.lesson_id, c.chunk_index) not in vigentes
            ]
            if obsoletos:
                TutorChunk.objects.filter(id__in=obsoletos).delete()
                self.stdout.write(f'{len(obsoletos)} chunk(s) obsoleto(s) eliminado(s).')

        self.stdout.write(self.style.SUCCESS(
            f'✓ Indexado: {n_chunks} chunks ({len(to_embed)} (re)embebidos).'
        ))
