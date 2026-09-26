"""Feedback de recuperación para las preguntas de Academy.

El feedback se construye únicamente con la clave ya validada de la pregunta y
con el módulo al que pertenece. No agrega una afirmación nueva: orienta al
estudiante hacia el criterio que el propio curso ya evaluó. Los autores pueden
reemplazarlo por una explicación más específica desde el editor de contenido.
"""


def build_default_question_feedback(*, opciones, respuestas_correctas, contexto_titulo):
    """Crea feedback seguro y útil cuando el autor no escribió uno propio.

    Las opciones correctas solo se muestran después de que el servidor califica
    el intento. En las preguntas múltiples se aclara que el conjunto completo
    es necesario, para que el estudiante no interprete una opción aislada como
    suficiente.
    """
    correctas = set(respuestas_correctas or [])
    textos = [
        str(opcion.get('texto', '')).strip()
        for opcion in (opciones or [])
        if opcion.get('id') in correctas and str(opcion.get('texto', '')).strip()
    ]
    respuesta = ' · '.join(f'«{texto}»' for texto in textos)
    contexto = (contexto_titulo or 'este módulo').strip()

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
