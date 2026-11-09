"""Fábricas compartidas por los tests de repaso y evaluaciones. Los usuarios se
crean SIN contraseña: hashear una (PBKDF2) cuesta ~2 s y estos tests autentican
con force_authenticate."""

from django.contrib.auth import get_user_model

from academy.models import Course, Enrollment, Lesson, Module, Question, Quiz

User = get_user_model()


def make_user(email, **kw):
    return User.objects.create_user(username=email, email=email, **kw)


def make_course(instructor, slug='curso-x', modulos=2, preguntas_por_quiz=3, gratis=(True, False)):
    """Curso con `modulos` módulos, cada uno con un quiz de `preguntas_por_quiz`
    preguntas de opción única (la correcta es siempre 'b'). `gratis` dice qué
    módulos son gratuitos."""
    course = Course.objects.create(
        instructor=instructor, titulo=slug, slug=slug, descripcion='d', publicado=True,
    )
    preguntas = []
    for m in range(modulos):
        module = Module.objects.create(
            course=course, orden=m + 1, titulo=f'M{m + 1}',
            es_gratuito=gratis[m] if m < len(gratis) else False,
        )
        texto = Lesson.objects.create(module=module, orden=1, titulo=f'Texto {m + 1}', tipo='texto', contenido='x')
        lesson = Lesson.objects.create(module=module, orden=2, titulo=f'Quiz {m + 1}', tipo='quiz')
        quiz = Quiz.objects.create(lesson=lesson, titulo=f'Quiz {m + 1}')
        for q in range(preguntas_por_quiz):
            preguntas.append(Question.objects.create(
                quiz=quiz, orden=q + 1, enunciado=f'Pregunta {m + 1}.{q + 1}', tipo='opcion_unica',
                opciones=[{'id': 'a', 'texto': 'A'}, {'id': 'b', 'texto': 'B'}],
                respuestas_correctas=['b'],
                feedback_correcta='Bien', feedback_incorrecta='Repasa la lección',
            ))
    return course, preguntas, texto


def enroll(student, course, **kw):
    return Enrollment.objects.create(student=student, course=course, **kw)
