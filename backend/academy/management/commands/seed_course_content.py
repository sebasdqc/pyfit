"""Integra el contenido de los cursos (archivos .md) en la base de datos.

Lee cada `academy/content/<escuela>/<slug-del-curso>.md`, lo parsea, y crea/actualiza
el árbol Módulo → Lección → Quiz → Pregunta del curso cuyo `slug` coincide con el
nombre del archivo. El símbolo ✓ al final de una opción marca la respuesta correcta.

Es IDEMPOTENTE y preserva el progreso de los estudiantes: hace upsert por `orden`
(no borra-y-recrea), de modo que los ids de Lección/Quiz se mantienen estables y
LessonProgress / QuizAttempt sobreviven a un re-seed. Solo elimina los módulos,
lecciones y preguntas que ya no están en el .md.

Formato del .md (ver los archivos en academy/content/):

    # Título del curso
    ## Instrucciones para Claude Code        ← se ignora (meta)
    ## Módulo N: Título del módulo
    ### Lección N — Título (tipo: texto|video|audio|quiz)
        [cuerpo de la lección o, en video/audio, el guion de apoyo]
    #### Pregunta N (tipo: opcion_unica|opcion_multiple|verdadero_falso, puntos: N)
        Enunciado…
        - [a] Opción incorrecta
        - [b] Opción correcta ✓
    ## Fuentes de evidencia de este curso    ← se ignora (no es módulo)

Uso:
    python manage.py seed_course_content
    python manage.py seed_course_content --course fundamentos-de-periodizacion
    python manage.py seed_course_content --dry-run
"""

import re
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from academy.models import (
    Course, Module, Lesson, Quiz, Question,
    LESSON_TEXTO, LESSON_VIDEO, LESSON_AUDIO, LESSON_QUIZ,
    Q_OPCION_UNICA, Q_OPCION_MULTIPLE, Q_VERDADERO_FALSO,
)

CONTENT_DIR = Path(__file__).resolve().parents[2] / 'content'

# Marca de respuesta correcta (símbolo ✓, U+2713).
CHECK = '✓'

_TIPO_LECCION = {
    'texto': LESSON_TEXTO,
    'video': LESSON_VIDEO,
    'audio': LESSON_AUDIO,
    'quiz': LESSON_QUIZ,
}
_TIPO_PREGUNTA = {
    'opcion_unica': Q_OPCION_UNICA,
    'opcion_multiple': Q_OPCION_MULTIPLE,
    'verdadero_falso': Q_VERDADERO_FALSO,
}

# ── Regex de encabezados ──────────────────────────────────────────────────────
# El separador de la lección es un guion largo (— U+2014); admitimos también en
# dash (–) y guion normal (-) por robustez.
RE_MODULO = re.compile(r'^##\s+Módulo\s+(\d+)\s*:\s*(.+?)\s*$')
RE_LECCION = re.compile(
    r'^###\s+Lecci[óo]n\s+(\d+)\s*[—–-]\s*(.+?)\s*\(tipo:\s*(\w+)\s*\)\s*$'
)
RE_PREGUNTA = re.compile(
    r'^####\s+Pregunta\s+(\d+)\s*\(tipo:\s*(\w+)\s*,\s*puntos:\s*(\d+)\s*\)\s*$'
)
RE_OPCION = re.compile(r'^\s*-\s*\[([^\]]+)\]\s*(.+?)\s*$')
RE_MEDIA_URL = re.compile(r'^(video_url|audio_url)\s*:\s*(.*)$', re.IGNORECASE)


def _clean_media_url(raw):
    """Devuelve la URL de media si es real; '' si es un placeholder o está vacía."""
    raw = (raw or '').strip()
    if not raw or raw.startswith('[PLACEHOLDER') or raw.startswith('['):
        return ''
    return raw


# Marcador de autoría `[PLACEHOLDER: …]`: es una nota para el redactor (material
# pendiente de verificar/producir). El .md los conserva como recordatorio, pero
# NO deben mostrarse al estudiante, así que se eliminan del contenido sembrado.
RE_PLACEHOLDER = re.compile(r'\[PLACEHOLDER:.*?\]', re.DOTALL)


def _strip_placeholders(text):
    """Quita los marcadores [PLACEHOLDER: …] y colapsa el espacio en blanco que dejan."""
    text = RE_PLACEHOLDER.sub('', text)
    # Limpia espacios finales por línea y colapsa 3+ saltos de línea a 2.
    text = '\n'.join(line.rstrip() for line in text.splitlines())
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def parse_course_markdown(text):
    """Parsea el .md de un curso a una estructura anidada de módulos/lecciones."""
    lines = text.splitlines()

    titulo_curso = ''
    modulos = []
    cur_mod = None      # módulo actual
    cur_les = None      # lección actual
    cur_q = None        # pregunta actual (dentro de un quiz)
    body_buf = []       # buffer de cuerpo de la lección de texto/video/audio
    enun_buf = []       # buffer de enunciado de la pregunta actual
    in_modules = False  # ¿ya entramos a la zona de módulos?

    def flush_body():
        """Vuelca el buffer de cuerpo a la lección actual (texto/video/audio)."""
        nonlocal body_buf
        if cur_les is not None and cur_les['tipo'] != LESSON_QUIZ:
            cur_les['contenido'] = _strip_placeholders('\n'.join(body_buf))
        body_buf = []

    def flush_enunciado():
        """Vuelca el buffer de enunciado a la pregunta actual."""
        nonlocal enun_buf
        if cur_q is not None:
            cur_q['enunciado'] = '\n'.join(enun_buf).strip()
        enun_buf = []

    for line in lines:
        # Título del curso (primer H1).
        if not titulo_curso and line.startswith('# ') and not line.startswith('##'):
            titulo_curso = line[2:].strip()
            continue

        m = RE_MODULO.match(line)
        if m:
            flush_enunciado()
            flush_body()
            in_modules = True
            cur_mod = {'orden': int(m.group(1)), 'titulo': m.group(2).strip(), 'lecciones': []}
            modulos.append(cur_mod)
            cur_les = None
            cur_q = None
            continue

        # Cualquier otro H2 (## …) que no sea "Módulo": fin de la zona de módulos
        # (típicamente "## Instrucciones…" antes, o "## Fuentes…" al final).
        if line.startswith('## '):
            flush_enunciado()
            flush_body()
            if in_modules:
                # Encabezado post-módulos (Fuentes): dejamos de acumular.
                cur_mod = None
                cur_les = None
                cur_q = None
            continue

        m = RE_LECCION.match(line)
        if m and cur_mod is not None:
            flush_enunciado()
            flush_body()
            tipo = _TIPO_LECCION.get(m.group(3).strip().lower(), LESSON_TEXTO)
            cur_les = {
                'orden': int(m.group(1)),
                'titulo': m.group(2).strip(),
                'tipo': tipo,
                'contenido': '',
                'video_url': '',
                'preguntas': [],
            }
            cur_mod['lecciones'].append(cur_les)
            cur_q = None
            continue

        m = RE_PREGUNTA.match(line)
        if m and cur_les is not None and cur_les['tipo'] == LESSON_QUIZ:
            flush_enunciado()
            cur_q = {
                'orden': int(m.group(1)),
                'tipo': _TIPO_PREGUNTA.get(m.group(2).strip().lower(), Q_OPCION_UNICA),
                'puntos': int(m.group(3)),
                'enunciado': '',
                'opciones': [],
                'respuestas_correctas': [],
            }
            cur_les['preguntas'].append(cur_q)
            continue

        # Opción de una pregunta (dentro de un quiz).
        if cur_q is not None:
            mo = RE_OPCION.match(line)
            if mo:
                opt_id = mo.group(1).strip()
                texto = mo.group(2)
                correcta = CHECK in texto
                texto = texto.replace(CHECK, '').strip()
                cur_q['opciones'].append({'id': opt_id, 'texto': texto})
                if correcta:
                    cur_q['respuestas_correctas'].append(opt_id)
                continue
            # Línea de enunciado (antes de la primera opción).
            if not cur_q['opciones'] and line.strip():
                enun_buf.append(line.strip())
            continue

        # Cuerpo de una lección texto/video/audio.
        if cur_les is not None and cur_les['tipo'] != LESSON_QUIZ:
            mm = RE_MEDIA_URL.match(line.strip())
            if mm:
                cur_les['video_url'] = _clean_media_url(mm.group(2))
                continue
            body_buf.append(line)

    flush_enunciado()
    flush_body()

    return {'titulo': titulo_curso, 'modulos': modulos}


class Command(BaseCommand):
    help = 'Integra el contenido .md de los cursos en la base de datos (idempotente).'

    def add_arguments(self, parser):
        parser.add_argument('--course', help='Slug de un solo curso a integrar.')
        parser.add_argument('--dry-run', action='store_true',
                            help='Parsea y reporta sin escribir en la base de datos.')

    def handle(self, *args, **options):
        only = options.get('course')
        dry = options['dry_run']

        md_files = sorted(CONTENT_DIR.rglob('*.md'))
        if not md_files:
            self.stderr.write(self.style.ERROR(f'No se encontraron .md en {CONTENT_DIR}'))
            return

        total_cursos = total_mods = total_lecs = total_quizzes = total_preguntas = 0

        for path in md_files:
            slug = path.stem
            if only and slug != only:
                continue

            try:
                course = Course.objects.get(slug=slug)
            except Course.DoesNotExist:
                self.stderr.write(self.style.WARNING(
                    f'  ⚠ No existe curso con slug "{slug}" (archivo {path.name}); se omite.'
                ))
                continue

            data = parse_course_markdown(path.read_text(encoding='utf-8'))
            n_mods = len(data['modulos'])
            n_lecs = sum(len(mo['lecciones']) for mo in data['modulos'])
            n_quiz = sum(1 for mo in data['modulos'] for le in mo['lecciones']
                         if le['tipo'] == LESSON_QUIZ)
            n_preg = sum(len(le['preguntas']) for mo in data['modulos']
                         for le in mo['lecciones'])

            self.stdout.write(
                f'\n• {course.titulo}  ({slug})\n'
                f'    {n_mods} módulos · {n_lecs} lecciones · {n_quiz} quizzes · {n_preg} preguntas'
            )

            if not dry:
                with transaction.atomic():
                    self._sync_course(course, data)

            total_cursos += 1
            total_mods += n_mods
            total_lecs += n_lecs
            total_quizzes += n_quiz
            total_preguntas += n_preg

        verbo = 'Parseados (dry-run)' if dry else 'Integrados'
        self.stdout.write(self.style.SUCCESS(
            f'\n✓ {verbo}: {total_cursos} cursos, {total_mods} módulos, '
            f'{total_lecs} lecciones, {total_quizzes} quizzes, {total_preguntas} preguntas.'
        ))

    # ── Upsert idempotente (preserva progreso) ────────────────────────────────

    def _sync_course(self, course, data):
        parsed_mod_ordenes = set()
        for mod_data in data['modulos']:
            module, _ = Module.objects.update_or_create(
                course=course, orden=mod_data['orden'],
                defaults={'titulo': mod_data['titulo']},
            )
            parsed_mod_ordenes.add(mod_data['orden'])
            self._sync_module(module, mod_data)

        # Elimina módulos que ya no están en el .md.
        course.modulos.exclude(orden__in=parsed_mod_ordenes).delete()

    def _sync_module(self, module, mod_data):
        parsed_les_ordenes = set()
        for les_data in mod_data['lecciones']:
            lesson, _ = Lesson.objects.update_or_create(
                module=module, orden=les_data['orden'],
                defaults={
                    'titulo': les_data['titulo'],
                    'tipo': les_data['tipo'],
                    'contenido': les_data['contenido'],
                    'video_url': les_data['video_url'],
                },
            )
            parsed_les_ordenes.add(les_data['orden'])

            if les_data['tipo'] == LESSON_QUIZ:
                self._sync_quiz(lesson, les_data)
            else:
                # Si la lección dejó de ser quiz, elimina un quiz previo.
                Quiz.objects.filter(lesson=lesson).delete()

        module.lecciones.exclude(orden__in=parsed_les_ordenes).delete()

    def _sync_quiz(self, lesson, les_data):
        quiz, _ = Quiz.objects.update_or_create(
            lesson=lesson,
            defaults={'titulo': les_data['titulo']},
        )
        parsed_q_ordenes = set()
        for q_data in les_data['preguntas']:
            Question.objects.update_or_create(
                quiz=quiz, orden=q_data['orden'],
                defaults={
                    'enunciado': q_data['enunciado'],
                    'tipo': q_data['tipo'],
                    'opciones': q_data['opciones'],
                    'respuestas_correctas': q_data['respuestas_correctas'],
                    'puntos': q_data['puntos'],
                },
            )
            parsed_q_ordenes.add(q_data['orden'])

        quiz.preguntas.exclude(orden__in=parsed_q_ordenes).delete()
