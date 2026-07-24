"""Cliente LLM central del proyecto (DeepSeek, OpenAI-compatible).

Migrado de Groq a DeepSeek. La API de DeepSeek es compatible con la de OpenAI,
así que se usa el SDK `openai` apuntando a `settings.LLM_BASE_URL`. La firma de
`client.chat.completions.create(...)` (model/messages/max_tokens/temperature) y
la forma de la respuesta (`choices[0].message.content`, `usage.prompt_tokens`,
`usage.completion_tokens`, `finish_reason`) son idénticas a las de Groq, por lo
que el resto del código (parseo de JSON a mano, detección de truncado por
`finish_reason == 'length'`, métricas de tokens) NO cambia.

Este es el único punto para cambiar de proveedor/modelo: `settings.LLM_*`. El
modelo se pasa en cada llamada como `settings.LLM_MODEL` (por defecto
`deepseek-chat`).
"""

from django.conf import settings
from openai import OpenAI


def get_llm_client(timeout: float = 30.0, max_retries: int = 1) -> OpenAI:
    """Devuelve un cliente OpenAI-compatible apuntado al proveedor configurado.

    Se crea uno por llamada (mismo patrón que antes con `Groq(...)`): el cliente
    es liviano y su costo es despreciable frente a la latencia del LLM. El caller
    es responsable de verificar `settings.LLM_API_KEY` antes de llamar (mismo
    contrato que antes con `GROQ_API_KEY`).
    """
    return OpenAI(
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_BASE_URL,
        timeout=timeout,
        max_retries=max_retries,
    )
