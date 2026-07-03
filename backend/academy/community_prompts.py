"""Prompt de moderación automática de Comunidad.

Reutiliza la integración de Groq YA existente en el proyecto (mismo modelo y
wrapper que `ai_workout`/`ai_tutor`, ver `community_service._call_groq`) — no
introduce un proveedor de IA nuevo."""

CATEGORIAS_VALIDAS = {'apropiado', 'spam', 'fuera_de_tema', 'dañino'}

# Cota de caracteres del texto interpolado en el prompt: acota tokens/costo,
# mismo criterio que ai_tutor._sanitize (no es una defensa de seguridad, solo
# un límite de payload).
MAX_TEXTO_LEN = 2000


def build_moderation_prompt(texto: str) -> str:
    texto = (texto or '').strip()[:MAX_TEXTO_LEN]
    return (
        'Sos un moderador de contenido del foro de estudiantes de Zyfit Academy, '
        'una academia deportiva online. Clasificá el siguiente texto (una '
        'pregunta o respuesta de un alumno) en UNA única categoría:\n'
        '- "apropiado": pregunta o respuesta legítima relacionada con el curso, '
        'el entrenamiento o la plataforma.\n'
        '- "spam": publicidad, enlaces no relacionados, texto repetitivo sin sentido.\n'
        '- "fuera_de_tema": sin relación alguna con fitness, entrenamiento o la '
        'plataforma.\n'
        '- "dañino": insultos, acoso, discriminación, contenido sexual o '
        'instrucciones peligrosas.\n\n'
        'Respondé ÚNICAMENTE con JSON válido, sin texto adicional ni markdown:\n'
        '{"categoria": "...", "razon": "..."}\n\n'
        f'Texto a evaluar:\n"""\n{texto}\n"""'
    )
