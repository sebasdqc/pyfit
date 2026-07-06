"""Generador de sesiones de EQUIPO con IA (módulo Planificación).

Genera UNA sesión por día del microciclo — no una por atleta — porque en
fútbol/futsal el plantel entrena junto (con variantes puntuales por posición o
por restricción individual), a diferencia del motor de la app de consumo que
genera una sesión por atleta. El cuerpo técnico ya fijó tipo/duración/RPE
objetivo al crear el `PlannedSession`; la IA solo redacta el contenido (fases,
bloques, variantes individuales) — mismo split "el motor manda los números, el
LLM redacta" que usa `runs.PlannedRunSession`.

Reutiliza el caller genérico de Groq de `ai_workout` (mismo patrón ya
establecido por `ai_running`: `from ai_workout.views import _call_groq`).
"""

from collections import defaultdict

from ai_workout.views import _call_groq, _sanitize_prompt_text

from .carga_service import athlete_carga
from .models import InjuryReport, PerformanceMetric, PlannedSession
from .roster_service import team_athlete_ids

GROQ_MAX_TOKENS = 1400


def _team_load_context(center, athlete_ids, fecha):
    """Agregado de ACWR/monotonía del plantel (mismo dato que la vista de
    equipo de `carga_view`), resumido en % de atletas con carga en alerta."""
    if not athlete_ids:
        return {'n_atletas': 0, 'n_con_datos': 0, 'atletas_riesgo_pct': 0.0}

    qs = PerformanceMetric.objects.filter(
        center=center, tipo='carga', athlete_id__in=athlete_ids,
    ).only('athlete_id', 'fecha', 'valor')
    por_atleta = defaultdict(list)
    for r in qs:
        por_atleta[r.athlete_id].append((r.fecha, float(r.valor)))

    n_con_datos = n_riesgo = 0
    for loads in por_atleta.values():
        m = athlete_carga(loads, fecha)
        if not m or not m.get('suficiente'):
            continue
        n_con_datos += 1
        if m.get('riesgo_alerta') or m.get('monotonia_alerta'):
            n_riesgo += 1

    pct = round(n_riesgo / n_con_datos * 100, 1) if n_con_datos else 0.0
    return {'n_atletas': len(athlete_ids), 'n_con_datos': n_con_datos, 'atletas_riesgo_pct': pct}


def _return_to_play_context(center, athlete_ids):
    """Atletas en return-to-play o con lesión activa — consulta `InjuryReport`
    DIRECTAMENTE. Nunca se confía en `CenterAthlete.estado`: es un flag manual
    del staff que puede desincronizarse de los partes de lesión reales."""
    if not athlete_ids:
        return []
    reports = (
        InjuryReport.objects
        .filter(center=center, athlete_id__in=athlete_ids, estado__in=['activa', 'recuperacion'])
        .order_by('athlete_id', '-fecha')
    )
    vistos, out = set(), []
    for r in reports:
        if r.athlete_id in vistos:
            continue
        vistos.add(r.athlete_id)
        out.append({'athlete_id': r.athlete_id, 'zona': r.zona, 'estado': r.get_estado_display()})
    return out


def build_team_session_prompt(ctx: dict) -> str:
    """Arma el prompt de una sesión de EQUIPO. Los números (tipo/duración/RPE)
    ya los fijó el cuerpo técnico y van como CONTEXTO fijo — la IA no los
    decide, solo redacta objetivo/fases/bloques/variantes."""
    carga = ctx['carga_equipo']
    riesgo_txt = (
        f"{carga['atletas_riesgo_pct']:.0f}% del plantel con datos suficientes muestra carga en zona de alerta (ACWR/monotonía)."
        if carga['n_con_datos'] else
        'Sin datos de carga interna suficientes todavía para este plantel.'
    )
    rtp_txt = '\n'.join(
        f"- Atleta #{a['athlete_id']}: {a['estado']} (zona: {a['zona']})" for a in ctx['rtp']
    ) or 'Ninguno reportado.'

    return f"""Eres el cuerpo técnico asistente de un centro de {ctx['disciplina']}. Genera UNA sesión de \
entrenamiento de EQUIPO (no individual) para un día del microciclo, en JSON estricto.

CONTEXTO DEL MICROCICLO
- Fase del mesociclo: {ctx['meso_tipo']} (énfasis: {ctx['meso_enfasis'] or 'general'})
- Tipo de semana: {ctx['micro_tipo']} · carga relativa objetivo de la semana: {ctx['carga_relativa']}%
- Tipo de sesión de HOY (ya decidido por el cuerpo técnico, NO lo cambies): {ctx['tipo']}
- Duración objetivo: {ctx['duracion_min']} min · RPE objetivo: {ctx['rpe_objetivo']}

ESTADO DEL PLANTEL
- {riesgo_txt}
- Atletas en return-to-play o con restricción médica activa (proponles una variante, no los excluyas del todo salvo que el motivo lo exija):
{rtp_txt}

RESTRICCIONES ABSOLUTAS
- La sesión es para el EQUIPO completo, con variantes puntuales SOLO para los atletas listados arriba.
- Respeta el tipo de sesión, la duración y el RPE ya fijados; no los cambies ni los repitas como si los decidieras tú.
- La nota del cuerpo técnico debe tener máximo 2 oraciones.
- No inventes nombres de atletas: usa el "athlete_id" tal como aparece arriba.

Responde SOLO con este JSON, sin texto fuera del JSON:
{{
  "titulo": "string",
  "objetivo_sesion": "string",
  "fases": [
    {{"nombre": "string", "bloques": [
      {{"nombre": "string", "duracion_min": number, "descripcion": "string", "jugadores": "string (ej. 'todos', 'porteros', 'defensas')", "espacio": "string", "objetivo": "string"}}
    ]}}
  ],
  "variantes_individuales": [
    {{"athlete_id": number, "motivo": "string", "ajuste": "string"}}
  ],
  "nota_del_cuerpo_tecnico": "string (máx 2 oraciones)"
}}"""


def generate_team_session(planned: PlannedSession, user) -> PlannedSession:
    """Genera el contenido de una `PlannedSession` con IA y la persiste.

    Precondición (fecha_inicio/fecha ya calculada) la valida la VISTA antes de
    llamar aquí, como 400 — este servicio asume que ya se cumple y solo lanza
    `ValueError` si la IA no devuelve el formato esperado (la vista lo traduce
    a 502). Deja que cualquier excepción de Groq se propague. Sin fallback
    local para v1: es una acción de planificación puntual del técnico, no el
    hábito diario crítico del atleta — si Groq falla, el técnico reintenta.
    """
    micro = planned.microciclo
    meso = micro.mesociclo
    plan = meso.plan
    center = plan.center
    athlete_ids = team_athlete_ids(center, plan.grupo)
    ctx = {
        'disciplina': center.disciplina or 'fútbol',
        'meso_tipo': meso.get_tipo_display(),
        'meso_enfasis': _sanitize_prompt_text(meso.enfasis, 200),
        'micro_tipo': micro.get_tipo_display(),
        'carga_relativa': micro.carga_relativa,
        'tipo': planned.get_tipo_display(),
        'duracion_min': planned.duracion_min or 60,
        'rpe_objetivo': float(planned.rpe_objetivo) if planned.rpe_objetivo is not None else 6.0,
        'carga_equipo': _team_load_context(center, athlete_ids, planned.fecha),
        'rtp': _return_to_play_context(center, athlete_ids),
    }
    prompt = build_team_session_prompt(ctx)
    data, usage = _call_groq(
        prompt, GROQ_MAX_TOKENS, user_id=getattr(user, 'id', None), return_usage=True,
    )

    if not isinstance(data, dict) or 'fases' not in data:
        raise ValueError('La IA no devolvió una sesión con el formato esperado (falta "fases").')

    planned.contenido = data
    planned.respuesta_ia = data
    planned.prompt_usado = prompt
    planned.origen = PlannedSession.ORIGEN_IA
    planned.estado = PlannedSession.ESTADO_GENERADA
    planned.generacion_ms = usage['elapsed_ms']
    planned.tokens_in = usage['tokens_in']
    planned.tokens_out = usage['tokens_out']
    planned.save()
    return planned
