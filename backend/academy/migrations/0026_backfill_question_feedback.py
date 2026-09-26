# Generated manually to complete the feedback fields introduced in 0025.

from django.db import migrations


def _feedback(question):
    correctas = set(question.respuestas_correctas or [])
    textos = [
        str(opcion.get('texto', '')).strip()
        for opcion in (question.opciones or [])
        if opcion.get('id') in correctas and str(opcion.get('texto', '')).strip()
    ]
    respuesta = ' · '.join(f'«{texto}»' for texto in textos)
    contexto = (question.quiz.lesson.module.titulo or 'este módulo').strip()

    if not respuesta:
        return (
            f'Correcto. Aplicaste el criterio evaluado en el módulo «{contexto}».',
            f'Repasa el módulo «{contexto}» y contrasta cada opción con el criterio evaluado.',
        )
    if len(textos) > 1:
        return (
            f'Correcto. Identificaste el conjunto esperado: {respuesta}. '
            f'Es la combinación que recoge el criterio trabajado en «{contexto}».',
            f'Aún no. Debían seleccionarse conjuntamente: {respuesta}. '
            f'En una pregunta de selección múltiple, repasa «{contexto}» y verifica '
            'tanto las opciones que faltan como las que no corresponden.',
        )
    return (
        f'Correcto. El criterio esperado es {respuesta}, tal como se trabaja en «{contexto}».',
        f'Aún no. El criterio esperado es {respuesta}. Repasa «{contexto}» y contrasta '
        'cada opción con la explicación del curso antes de reintentar.',
    )


def forwards(apps, schema_editor):
    Question = apps.get_model('academy', 'Question')
    questions = Question.objects.select_related('quiz__lesson__module').all().iterator()
    for question in questions:
        correcta, incorrecta = _feedback(question)
        cambios = []
        if not question.feedback_correcta:
            question.feedback_correcta = correcta
            cambios.append('feedback_correcta')
        if not question.feedback_incorrecta:
            question.feedback_incorrecta = incorrecta
            cambios.append('feedback_incorrecta')
        if cambios:
            question.save(update_fields=cambios)


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0025_question_feedback'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
