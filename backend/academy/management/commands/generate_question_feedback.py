"""Redacta feedback explicativo para las preguntas de quiz que solo tienen el
genérico ("el criterio esperado es X...").

Una buena explicación dice POR QUÉ la respuesta correcta lo es. Escribir las
385 a mano es lento; este comando propone una por pregunta con el LLM central
(`pyfit.llm`), PERO restringido al texto de las lecciones del propio módulo:

  - El modelo solo puede apoyarse en el texto que se le entrega. Si la lección
    no respalda una explicación, debe remitir a repasarla (nunca inventar una
    cifra, un estudio o un autor).
  - NO escribe nada por defecto. Sin `--apply` solo muestra las propuestas
    (y las vuelca a `--export` si se pide) para que una persona las revise.
  - Solo toca preguntas cuyo feedback está vacío o es el genérico: jamás pisa
    uno escrito a mano por un instructor.
  - Descarta propuestas mal formadas, demasiado largas o con voseo.

Es contenido que verán los alumnos: revisa las propuestas antes de `--apply`,
sobre todo en cursos de salud (poblaciones especiales, nutrición, lesiones).
Las propuestas se pueden corregir luego desde la pantalla de edición del curso.

Uso:
    python manage.py generate_question_feedback --course fundamentos-de-periodizacion
    python manage.py generate_question_feedback --course fundamentos-de-periodizacion --export /tmp/fb.json
    python manage.py generate_question_feedback --course fundamentos-de-periodizacion --apply
    python manage.py generate_question_feedback --limit 10
"""

import json
import re

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from academy.models import LESSON_TEXTO, Question
from academy.quiz_feedback import build_default_question_feedback
from ai_workout.views import GROQ_MAX_RETRIES, GROQ_TIMEOUT_SECONDS
from pyfit.llm import get_llm_client

TEMPERATURE = 0.2
MAX_TOKENS = 400
MAX_CONTEXT_CHARS = 6000
MAX_FEEDBACK_CHARS = 450

VOSEO = re.compile(
    r'\b(sabés|tenés|podés|querés|elegí|mirá|fijate|andá|hacé|vos|Repasá|Revisá|Pensá|Considerá)\b',
    re.IGNORECASE,
)

SYSTEM_PROMPT = (
    'Eres redactor de contenido educativo de ciencias del deporte. Escribes el feedback que ve '
    'un estudiante después de responder una pregunta de un quiz.\n'
    'Reglas estrictas:\n'
    '1. Usa SOLO la información del TEXTO DE LA LECCIÓN que se te entrega. No agregues cifras, '
    'estudios, autores ni datos que no estén en ese texto.\n'
    '2. Si el texto no respalda una explicación, escribe en su lugar una remisión a repasar la '
    'lección. No inventes.\n'
    '3. "correcta": 1 a 3 frases que expliquen POR QUÉ la respuesta correcta lo es.\n'
    '4. "incorrecta": 1 a 3 frases que expliquen el concepto correcto sin decir "la opción b" '
    'ni nombrar letras, para que sirva aunque se reordenen las opciones.\n'
    '5. Español neutro, tratamiento de "tú". Nunca voseo (nada de "vos", "tenés", "podés").\n'
    '6. Responde ÚNICAMENTE con un objeto JSON: {"correcta": "...", "incorrecta": "..."}.'
)


def _es_generico(question, contexto_titulo) -> bool:
    """¿Feedback vacío o idéntico al genérico? Si no, alguien lo escribió: no se toca."""
    c, i = build_default_question_feedback(
        opciones=question.opciones, respuestas_correctas=question.respuestas_correctas,
        contexto_titulo=contexto_titulo,
    )
    return (
        (not question.feedback_correcta or question.feedback_correcta == c)
        and (not question.feedback_incorrecta or question.feedback_incorrecta == i)
    )


def _contexto_leccion(question) -> str:
    """Texto de las lecciones de lectura del mismo módulo (lo único en lo que
    el modelo puede apoyarse)."""
    modulo = question.quiz.lesson.module
    trozos = [
        f'## {l.titulo}\n{l.contenido.strip()}'
        for l in modulo.lecciones.filter(tipo=LESSON_TEXTO).order_by('orden')
        if l.contenido.strip()
    ]
    return '\n\n'.join(trozos)[:MAX_CONTEXT_CHARS]


def _mensaje_usuario(question, contexto) -> str:
    opciones = '\n'.join(f'- [{o.get("id")}] {o.get("texto")}' for o in question.opciones)
    correctas = ', '.join(str(c) for c in question.respuestas_correctas)
    return (
        f'TEXTO DE LA LECCIÓN:\n{contexto}\n\n'
        f'PREGUNTA: {question.enunciado}\nOPCIONES:\n{opciones}\n'
        f'RESPUESTA(S) CORRECTA(S): {correctas}'
    )


def parsear_respuesta(raw: str):
    """Extrae y valida {"correcta","incorrecta"}. Devuelve (dict|None, motivo)."""
    texto = (raw or '').strip()
    texto = re.sub(r'^```(?:json)?\s*|\s*```$', '', texto, flags=re.IGNORECASE)
    try:
        data = json.loads(texto)
    except (ValueError, TypeError):
        return None, 'no es JSON válido'
    if not isinstance(data, dict):
        return None, 'no es un objeto'
    out = {}
    for clave in ('correcta', 'incorrecta'):
        valor = data.get(clave)
        if not isinstance(valor, str) or not valor.strip():
            return None, f'falta "{clave}"'
        valor = valor.strip()
        if len(valor) > MAX_FEEDBACK_CHARS:
            return None, f'"{clave}" demasiado largo'
        if VOSEO.search(valor):
            return None, f'"{clave}" tiene voseo'
        out[clave] = valor
    return out, ''


class Command(BaseCommand):
    help = 'Propone (y con --apply guarda) feedback explicativo para preguntas con feedback genérico.'

    def add_arguments(self, parser):
        parser.add_argument('--course', help='Slug de un solo curso.')
        parser.add_argument('--limit', type=int, default=0, help='Máximo de preguntas a procesar.')
        parser.add_argument('--apply', action='store_true', help='Guarda las propuestas en la BD.')
        parser.add_argument('--export', help='Ruta de un .json donde volcar las propuestas para revisarlas.')

    def handle(self, *args, **options):
        if not settings.LLM_API_KEY:
            raise CommandError('Falta DEEPSEEK_API_KEY: sin clave no se puede llamar al modelo.')

        qs = Question.objects.select_related('quiz__lesson__module__course').order_by(
            'quiz__lesson__module__course_id', 'quiz__lesson__module__orden', 'quiz__lesson__orden', 'orden',
        )
        if options.get('course'):
            qs = qs.filter(quiz__lesson__module__course__slug=options['course'])

        client = get_llm_client(timeout=GROQ_TIMEOUT_SECONDS, max_retries=GROQ_MAX_RETRIES)
        propuestas, omitidas, fallidas, guardadas = [], 0, 0, 0

        for q in qs:
            modulo = q.quiz.lesson.module
            if not _es_generico(q, modulo.titulo):
                omitidas += 1
                continue
            if options['limit'] and len(propuestas) + fallidas >= options['limit']:
                break
            contexto = _contexto_leccion(q)
            if not contexto:
                fallidas += 1
                self.stdout.write(self.style.WARNING(f'  · q{q.id}: el módulo no tiene texto de lección; se omite.'))
                continue
            try:
                resp = client.chat.completions.create(
                    model=settings.LLM_MODEL, temperature=TEMPERATURE, max_tokens=MAX_TOKENS,
                    messages=[
                        {'role': 'system', 'content': SYSTEM_PROMPT},
                        {'role': 'user', 'content': _mensaje_usuario(q, contexto)},
                    ],
                )
                parsed, motivo = parsear_respuesta(resp.choices[0].message.content)
            except Exception as exc:  # red/timeout: seguir con las demás
                parsed, motivo = None, f'error del modelo: {exc.__class__.__name__}'
            if parsed is None:
                fallidas += 1
                self.stdout.write(self.style.WARNING(f'  · q{q.id}: descartada ({motivo}).'))
                continue

            propuestas.append({
                'question_id': q.id, 'curso': modulo.course.slug, 'modulo': modulo.titulo,
                'enunciado': q.enunciado, **parsed,
            })
            self.stdout.write(f'\n[q{q.id}] {modulo.course.slug} · {q.enunciado[:80]}')
            self.stdout.write(f'   ✓ {parsed["correcta"]}\n   ✗ {parsed["incorrecta"]}')
            if options['apply']:
                q.feedback_correcta, q.feedback_incorrecta = parsed['correcta'], parsed['incorrecta']
                q.save(update_fields=['feedback_correcta', 'feedback_incorrecta'])
                guardadas += 1

        if options.get('export'):
            with open(options['export'], 'w', encoding='utf-8') as f:
                json.dump(propuestas, f, ensure_ascii=False, indent=2)
            self.stdout.write(f'\nPropuestas volcadas en {options["export"]}')

        accion = f'{guardadas} guardada(s)' if options['apply'] else 'NINGUNA guardada (usa --apply tras revisarlas)'
        self.stdout.write(self.style.SUCCESS(
            f'\n✓ {len(propuestas)} propuesta(s), {omitidas} con feedback propio (intactas), '
            f'{fallidas} descartada(s). {accion}.'
        ))
