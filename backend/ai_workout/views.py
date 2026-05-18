import json
import logging
from datetime import date, timedelta
from types import SimpleNamespace
from groq import Groq
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from pyfit.throttles import GenerateSessionRateThrottle, RegenerarEjercicioRateThrottle
from workouts.models import Session, SessionExercise, Exercise, UserAdaptationProfile, UserExerciseProfile
from checkins.models import DailyCheckin

logger = logging.getLogger(__name__)

# Timeout for the Groq HTTP request (seconds). Keep below gunicorn worker timeout.
GROQ_TIMEOUT_SECONDS = 30


def _call_groq(prompt: str, max_tokens: int) -> dict:
    """
    Call Groq and return parsed JSON. Raises ValueError on parse/empty response,
    or any underlying Groq exception. Caller is responsible for translating
    exceptions into HTTP responses.
    """
    if not settings.GROQ_API_KEY:
        raise RuntimeError('GROQ_API_KEY not configured')

    groq_client = Groq(api_key=settings.GROQ_API_KEY, timeout=GROQ_TIMEOUT_SECONDS)
    completion = groq_client.chat.completions.create(
        model='llama-3.3-70b-versatile',
        messages=[{'role': 'user', 'content': prompt}],
        max_tokens=max_tokens,
    )
    text = (completion.choices[0].message.content or '').strip()
    if not text:
        raise ValueError('Empty response from AI')
    clean = text.replace('```json', '').replace('```', '').strip()
    return json.loads(clean)


# ─── Fatiga & RPE helpers ─────────────────────────────────────────────────────

def calcular_fatiga(sesiones_qs):
    from django.utils import timezone
    ahora = timezone.now()
    hace_72h = ahora - timedelta(hours=72)
    ultimas = sesiones_qs.filter(created_at__gte=hace_72h)
    count = ultimas.count()
    if count >= 3:
        return 'alto'
    if count == 2:
        return 'medio'
    return 'bajo'


def calcular_rpe_target(fatiga, estado_animo, hrv):
    rpe = 7
    if fatiga == 'alto':
        rpe -= 2
    elif fatiga == 'medio':
        rpe -= 1
    if estado_animo <= 2:
        rpe -= 1
    elif estado_animo >= 5:
        rpe += 1
    if hrv:
        if hrv < 50:
            rpe -= 1
        elif hrv > 80:
            rpe += 1
    return max(4, min(9, rpe))


# ─── Phase 1 & 2: Exercise pool ───────────────────────────────────────────────

def _get_exercise_pool(user, location, dolor_hoy=''):
    """
    Returns (grouped_dict, flat_list) of valid exercises for this user/location.

    Filtering rules:
    - Only active exercises
    - equipamiento must be a subset of location.implementos ([] = always valid)
    - Exclude exercises whose contraindicaciones overlap with:
        * active user injury zones
        * zones mentioned in dolor_hoy text
    """
    implementos_disponibles = set(location.implementos or [])

    # Gather forbidden zones from injuries
    injury_zones = set(
        user.injuries.filter(activa=True).values_list('zona', flat=True)
    )

    # Parse dolor_hoy for zone keywords
    DOLOR_KEYWORDS = {
        'rodilla': 'rodilla',
        'lumbar': 'lumbar',
        'espalda': 'lumbar',
        'hombro': 'hombro',
        'cuello': 'cuello',
        'cadera': 'cadera',
        'tobillo': 'tobillo',
        'muñeca': 'muñeca',
        'codo': 'codo',
    }
    if dolor_hoy:
        dolor_lower = dolor_hoy.lower()
        for kw, zona in DOLOR_KEYWORDS.items():
            if kw in dolor_lower:
                injury_zones.add(zona)

    all_active = Exercise.objects.filter(activo=True)

    flat_list = []
    grouped = {}

    for ex in all_active:
        # Equipment check: exercise equipment must be subset of available
        eq_set = set(ex.equipamiento)
        if eq_set and not eq_set.issubset(implementos_disponibles):
            continue

        # Contraindication check
        contra_set = set(ex.contraindicaciones)
        if contra_set & injury_zones:
            continue

        flat_list.append(ex.nombre)
        patron = ex.patron_movimiento
        if patron not in grouped:
            grouped[patron] = []
        grouped[patron].append(ex.nombre)

    return grouped, flat_list


# ─── Phase 3 & 4: Adaptation context ─────────────────────────────────────────

def _build_adaptation_context(user):
    """
    Returns a descriptive text block about the user's training adaptation history.
    """
    try:
        ap = user.adaptation_profile
    except UserAdaptationProfile.DoesNotExist:
        return 'Sin historial suficiente (menos de 3 sesiones completadas).'

    if ap.total_sesiones < 3:
        return 'Sin historial suficiente (menos de 3 sesiones completadas).'

    lines = [
        f'Total sesiones completadas: {ap.total_sesiones}',
    ]

    if ap.rpe_bias is not None:
        bias = float(ap.rpe_bias)
        if bias > 0.5:
            lines.append(
                f'Sesga RPE: el usuario percibe el esfuerzo {bias:+.1f} puntos MÁS alto que el objetivo — '
                f'considera prescribir RPE ligeramente más bajo para compensar.'
            )
        elif bias < -0.5:
            lines.append(
                f'Sesga RPE: el usuario percibe el esfuerzo {bias:+.1f} puntos MÁS bajo que el objetivo — '
                f'puede manejar mayor intensidad de la prescrita.'
            )
        else:
            lines.append(f'RPE percibido muy alineado con el objetivo (desviación: {bias:+.1f}).')

    if ap.cumplimiento_promedio is not None:
        lines.append(f'Cumplimiento promedio histórico: {float(ap.cumplimiento_promedio):.0f}%.')

    if ap.rating_promedio is not None:
        lines.append(f'Satisfacción media de sesiones: {float(ap.rating_promedio):.1f}/5.')

    if ap.volumen_tolerado_semana is not None:
        lines.append(
            f'Volumen tolerado con ≥80% cumplimiento: {ap.volumen_tolerado_semana} sesiones/semana.'
        )

    if ap.patron_preferido:
        label = PATRON_LABELS_CORTO.get(ap.patron_preferido, ap.patron_preferido)
        lines.append(f'Patrón de movimiento más frecuente: {label}.')

    if ap.semanas_carga_consecutivas > 0:
        lines.append(
            f'Semanas de carga consecutivas (≥2 sesiones/semana): {ap.semanas_carga_consecutivas}.'
        )

    # Top exercises by frequency
    top_exs = (
        UserExerciseProfile.objects.filter(user=user)
        .order_by('-veces_realizado')[:5]
    )
    if top_exs:
        nombres = ', '.join(ep.exercise_nombre for ep in top_exs)
        lines.append(f'Ejercicios más realizados: {nombres}.')

    return ' '.join(lines)


# ─── Phase 5: Periodization state ─────────────────────────────────────────────

def _calcular_estado_mesociclo(user):
    """
    Returns a dict describing current periodization state:
    - necesita_deload: bool
    - recomendacion: string
    """
    try:
        ap = user.adaptation_profile
    except UserAdaptationProfile.DoesNotExist:
        return {
            'necesita_deload': False,
            'recomendacion': 'Fase inicial — construye hábito antes de periodizar.',
        }

    if ap.total_sesiones < 3:
        return {
            'necesita_deload': False,
            'recomendacion': 'Historial insuficiente — aplica principios generales de progresión.',
        }

    # Check deload conditions
    necesita_deload = False
    if ap.semanas_carga_consecutivas >= 3:
        # Check cumplimiento last 3 weeks
        hoy = date.today()
        hace_3_semanas = hoy - timedelta(weeks=3)
        from workouts.models import Session as SessionModel, SessionFeedback
        from django.db.models import Avg
        cum_3_semanas = (
            SessionModel.objects.filter(
                user=user,
                fecha__gte=hace_3_semanas,
                feedback__isnull=False,
            ).aggregate(avg=Avg('feedback__cumplimiento'))['avg'] or 100
        )
        if cum_3_semanas < 75:
            necesita_deload = True

    if necesita_deload:
        recomendacion = (
            f'DELOAD recomendado: {ap.semanas_carga_consecutivas} semanas de carga consecutivas '
            f'con cumplimiento reciente bajo. Reduce volumen e intensidad en un 40-50%. '
            f'Prioriza movilidad, técnica y recuperación activa.'
        )
    elif ap.semanas_carga_consecutivas >= 2:
        recomendacion = (
            f'Fase de PROGRESIÓN: {ap.semanas_carga_consecutivas} semanas de carga consecutivas '
            f'con buen cumplimiento. Mantén o incrementa ligeramente el volumen/intensidad '
            f'(+2.5-5% en carga o +1 serie por patrón).'
        )
    else:
        recomendacion = (
            'Fase de ADAPTACIÓN: el usuario está en las primeras semanas. '
            'Prioriza consistencia, técnica correcta y progresión gradual.'
        )

    return {
        'necesita_deload': necesita_deload,
        'recomendacion': recomendacion,
    }


# ─── Prompt builder ───────────────────────────────────────────────────────────

# Movement pattern labels — used in adaptation context and exercise pool formatting.
PATRON_LABELS_CORTO = {
    'empuje_horizontal':  'empuje horizontal',
    'empuje_vertical':    'empuje vertical',
    'jalon_horizontal':   'jalón horizontal',
    'jalon_vertical':     'jalón vertical',
    'sentadilla':         'sentadilla/cuádriceps',
    'bisagra':            'bisagra/cadena posterior',
    'core_antiextension': 'core antiextensión',
    'core_antirrotacion': 'core antirrotación',
    'core_antiflexion':   'core antiflexión lateral',
    'cargada':            'cargada/olímpico',
    'locomocion':         'locomoción/transporte de carga',
    'aislamiento':        'aislamiento muscular',
}

PATRON_LABELS_LARGO = {
    'empuje_horizontal':  'EMPUJE HORIZONTAL (pectoral, tríceps)',
    'empuje_vertical':    'EMPUJE VERTICAL (deltoides, tríceps)',
    'jalon_horizontal':   'JALÓN HORIZONTAL (dorsal, romboides)',
    'jalon_vertical':     'JALÓN VERTICAL (dorsal, bíceps)',
    'sentadilla':         'SENTADILLA / CUÁDRICEPS',
    'bisagra':            'BISAGRA / CADENA POSTERIOR (glúteos, isquiotibiales)',
    'core_antiextension': 'CORE — ANTIEXTENSIÓN (recto abdominal, transverso)',
    'core_antirrotacion': 'CORE — ANTIRROTACIÓN (oblicuos, multífidos)',
    'core_antiflexion':   'CORE — ANTIFLEXIÓN LATERAL (cuadrado lumbar, oblicuos)',
    'cargada':            'CARGADA / MOVIMIENTO OLÍMPICO (cuerpo completo)',
    'locomocion':         'LOCOMOCIÓN / TRANSPORTE DE CARGA (cuerpo completo)',
    'aislamiento':        'AISLAMIENTO MUSCULAR',
}


def _format_exercise_pool(grouped):
    """Format grouped exercise dict as a readable text block."""
    if not grouped:
        return 'No hay ejercicios en el banco para la ubicación actual.'

    lines = []
    for patron, exercises in sorted(grouped.items()):
        label = PATRON_LABELS_LARGO.get(patron, patron.upper())
        lines.append(f'{label}:')
        for ex in exercises:
            lines.append(f'  - {ex}')
    return '\n'.join(lines)


def build_prompt(ctx):
    exercise_pool_text = _format_exercise_pool(ctx.get('exercise_pool', {}))
    adaptation_text = ctx.get('adaptation_context', 'Sin historial suficiente.')
    mesociclo = ctx.get('estado_mesociclo', {})
    mesociclo_text = mesociclo.get('recomendacion', '')
    deload_warning = (
        '\n*** ATENCIÓN: El atleta necesita DELOAD. Reduce volumen e intensidad en un 40-50%. ***'
        if mesociclo.get('necesita_deload')
        else ''
    )

    return f"""
Eres un entrenador personal y científico del ejercicio de élite. Tienes formación en fisiología del ejercicio, periodización y nutrición deportiva. Cada decisión que tomas está respaldada por evidencia científica de nivel A (meta-análisis y revisiones sistemáticas).

PERFIL COMPLETO DEL ATLETA:
- Nombre: {ctx['nombre']}
- Edad: {ctx['edad'] or 'no especificada'}
- Sexo biológico: {ctx['sexo'] or 'no especificado'}
- Peso: {f"{ctx['peso']} kg" if ctx['peso'] else 'no especificado'}
- Altura: {f"{ctx['altura']} cm" if ctx['altura'] else 'no especificada'}
- Objetivo principal: {ctx['objetivo']}
- Nivel de experiencia: {ctx['nivel']}
- Experiencia deportiva previa: {ctx['experiencia_deportiva'] or 'ninguna especificada'}
- Lesiones o limitaciones: {ctx['lesiones'] or 'ninguna'}
- Estilo de entrenamiento preferido: {ctx['estilo_entrenamiento'] or 'no especificado'}
- Ejercicios favoritos: {ctx['ejercicios_favoritos'] or 'ninguno especificado'}
- Ejercicios a evitar: {ctx['ejercicios_evitar'] or 'ninguno'}
- Días de entrenamiento por semana: {ctx['dias_semana'] or 3}
- Horario preferido: {ctx['horario_preferido'] or 'no especificado'}
- Nivel de estrés habitual: {ctx['nivel_estres'] or 'no especificado'}
- Tipo de trabajo: {ctx['tipo_trabajo'] or 'no especificado'}

MARCADORES DE RENDIMIENTO (1RM):
- Sentadilla: {f"{ctx['rm_sentadilla']} kg" if ctx['rm_sentadilla'] else 'desconocido'}
- Peso muerto: {f"{ctx['rm_peso_muerto']} kg" if ctx['rm_peso_muerto'] else 'desconocido'}
- Press banca: {f"{ctx['rm_press_banca']} kg" if ctx['rm_press_banca'] else 'desconocido'}
- Press hombro: {f"{ctx['rm_press_hombro']} kg" if ctx['rm_press_hombro'] else 'desconocido'}

ESTADO HOY:
- Estado de ánimo: {ctx['estado_animo']}/5
- Horas de sueño: {ctx['calidad_sueno']}h
- HRV: {ctx['hrv'] or 'no disponible'}
- Notas del usuario: {ctx['notas'] or 'ninguna'}
- Dolor o molestia HOY: {ctx['dolor_hoy'] or 'ninguno reportado'}
- Foco de entrenamiento solicitado: {', '.join(ctx['foco_entrenamiento']) if ctx['foco_entrenamiento'] else 'libre — decide tú según el contexto'}
- Fatiga acumulada últimas 72h: {ctx['fatiga']}
- RPE objetivo calculado: {ctx['rpe_target']}/10

SESIÓN DE HOY:
- Ubicación: {ctx['ubicacion_nombre']} ({ctx['ubicacion_tipo']})
- Implementos disponibles: {', '.join(ctx['implementos']) if ctx['implementos'] else 'solo peso corporal'}
- Duración disponible: {ctx['duracion']} minutos

COMPETICIÓN PRÓXIMA:
{f"- {ctx['competicion_nombre']} el {ctx['competicion_fecha']}" if ctx.get('competicion_nombre') else '- Ninguna en los próximos 14 días'}

FASE DEL CICLO MENSTRUAL:
{ctx.get('fases_ciclo') or 'No aplica o no disponible'}

---

BANCO DE EJERCICIOS VALIDADOS:
Los siguientes ejercicios han sido pre-filtrados para esta sesión: cumplen con los implementos disponibles y NO tienen contraindicaciones con las lesiones activas ni el dolor reportado hoy.

{exercise_pool_text}

INSTRUCCIÓN CRÍTICA: DEBES elegir ejercicios EXCLUSIVAMENTE del banco de ejercicios validados listado arriba. Si el banco no tiene suficientes ejercicios para un patrón, puedes crear uno nuevo SOLO si cumple con los implementos disponibles y no tiene contraindicaciones con el usuario.

---

HISTORIAL DE ADAPTACIÓN DEL USUARIO:
{adaptation_text}

---

ESTADO DEL MESOCICLO:
{mesociclo_text}{deload_warning}

---

PRINCIPIOS CIENTÍFICOS QUE DEBES APLICAR OBLIGATORIAMENTE:

1. VOLUMEN EFECTIVO (Schoenfeld, 2017; Krieger, 2010)
   - Principiante: 10-15 series semanales por grupo muscular
   - Intermedio: 15-20 series semanales
   - Avanzado: 20-25 series semanales
   - Distribuye el volumen de hoy según la fatiga acumulada: si es ALTA reduce 30-40%, si es MEDIA reduce 15-20%
   - Nunca superes el umbral de volumen máximo recuperable (MRV) en una sola sesión

2. INTENSIDAD Y RPE (Zourdos et al., 2016; Helms et al., 2018)
   - RPE objetivo para hoy: {ctx['rpe_target']}/10
   - Si tienes 1RM disponible, calcula las cargas usando la fórmula de Epley: Carga = 1RM × (1 - reps/30)
   - RIR (Reps In Reserve) = 10 - RPE. Hoy el atleta debe terminar cada serie con {10 - ctx['rpe_target']} reps en reserva
   - Fatiga alta o HRV bajo → prioriza RPE 6-7, técnica sobre carga
   - Estado de ánimo bajo (≤2) → reduce intensidad, aumenta componente de movilidad

3. SELECCIÓN DE EJERCICIOS (Baz-Valle et al., 2022)
   - USA EXCLUSIVAMENTE los implementos disponibles: {', '.join(ctx['implementos']) if ctx['implementos'] else 'peso corporal'}
   - NUNCA incluyas ejercicios que requieran implementos no disponibles
   - Prioriza ejercicios multiarticulares (mayor estímulo hormonal y neuromuscular)
   - Incluye variedad: no repitas el mismo patrón de movimiento más de 2 veces en la misma sesión
   - Respeta ejercicios a evitar: {ctx['ejercicios_evitar'] or 'ninguno'}
   - Considera ejercicios favoritos cuando sea apropiado: {ctx['ejercicios_favoritos'] or 'ninguno especificado'}
   - Patrones de movimiento a cubrir según objetivo: empuje, tracción, piernas, core

4. ESTRUCTURA DE LA SESIÓN (NSCA Guidelines, 2022)
   - Calentamiento: activación neuromuscular progresiva, movilidad específica, 8-12 min
   - Bloque principal: ejercicios ordenados de mayor a menor demanda neuromuscular (compuestos primero)
   - Vuelta a la calma: estiramientos estáticos, trabajo de movilidad, respiración, 8-10 min
   - Tiempo total: exactamente {ctx['duracion']} minutos incluyendo todas las fases

5. PERIODIZACIÓN SEGÚN OBJETIVO (Issurin, 2010; Bompa & Buzzichelli, 2018)
   - Pérdida de grasa: densidad alta, descansos cortos (45-75s), supersets ocasionales
   - Ganancia muscular: 3-4 series, 6-12 reps, descansos 90-120s, énfasis en tensión mecánica
   - Rendimiento deportivo: trabajo de potencia, movimientos explosivos, especificidad
   - Resistencia: volumen moderado-alto, intensidad moderada, descansos cortos
   - Salud general: variedad, movimientos funcionales, bajo impacto articular

6. ADAPTACIONES POR SEXO BIOLÓGICO (Sung et al., 2014; Tarnopolsky, 2008)
   {'- Las mujeres tienen mayor resistencia a la fatiga → pueden manejar más volumen por sesión\n   - Mayor capacidad de recuperación → descansos pueden ser ligeramente más cortos\n   - Énfasis en cadena posterior y glúteos cuando sea apropiado al objetivo' if ctx['sexo'] == 'femenino' else '- Mayor capacidad de generar fuerza máxima → puede priorizar trabajo de alta intensidad\n   - Responde bien a volumen alto con recuperación adecuada' if ctx['sexo'] == 'masculino' else '- Aplica principios generales de periodización'}

7. CONTEXTO DE VIDA (Kreher & Schwartz, 2012)
   - Trabajo {ctx['tipo_trabajo'] or 'mixto'}: {'ya tiene demanda física diaria, reduce volumen total en 10-15%' if ctx['tipo_trabajo'] == 'activo' else 'mayor potencial de recuperación entre sesiones' if ctx['tipo_trabajo'] == 'sedentario' else 'considera fatiga acumulada moderada'}
   - Estrés {ctx['nivel_estres'] or 'moderado'}: {'el cortisol elevado interfiere con la recuperación, reduce intensidad y prioriza ejercicios placenteros' if ctx['nivel_estres'] == 'alto' else 'óptimo para sesiones de alta demanda' if ctx['nivel_estres'] == 'bajo' else 'monitorea señales de fatiga'}
   - Sueño {ctx['calidad_sueno']}h: {'privación de sueño significativa, reduce RPE objetivo en 1 punto adicional' if float(ctx['calidad_sueno']) < 6 else 'sueño subóptimo, modera la intensidad' if float(ctx['calidad_sueno']) < 7 else 'recuperación adecuada'}

---

INSTRUCCIONES FINALES:
0. RESTRICCIONES ABSOLUTAS — estas son reglas que NO puedes violar bajo ninguna circunstancia:
   - Si hay dolor o molestia reportada hoy ("{ctx['dolor_hoy'] or 'ninguno'}"), NUNCA incluyas ejercicios que involucren esa zona corporal. Esto es innegociable.
   - Si el usuario especificó un foco de entrenamiento, la sesión DEBE centrarse en ese foco.
   - Los implementos disponibles son: {', '.join(ctx['implementos']) if ctx['implementos'] else 'solo peso corporal'}. NUNCA uses un implemento que no esté en esta lista.
   - ELIGE ÚNICAMENTE ejercicios del banco de ejercicios validados listado arriba.
1. Genera UNA sesión completa para HOY, no un plan semanal
2. Cada ejercicio debe ser ejecutable con los implementos disponibles — verifica esto antes de incluirlo
3. La nota del entrenador DEBE citar al menos 2 principios científicos específicos explicando POR QUÉ la sesión está diseñada así hoy
4. Las notas de cada ejercicio deben incluir un cue técnico clave basado en biomecánica
5. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown

JSON requerido:
{{
  "titulo": "nombre descriptivo y motivador de la sesión",
  "objetivo_sesion": "qué adaptación fisiológica específica se busca hoy en una frase",
  "rpe_target": {ctx['rpe_target']},
  "duracion_total": {ctx['duracion']},
  "fases": [
    {{
      "nombre": "Calentamiento",
      "duracion_minutos": 10,
      "ejercicios": [
        {{
          "nombre": "nombre del ejercicio",
          "series": 2,
          "repeticiones": "30 segundos",
          "descanso_segundos": 15,
          "rpe_sugerido": 4,
          "notas": "cue técnico biomecánico específico"
        }}
      ]
    }},
    {{
      "nombre": "Bloque principal",
      "duracion_minutos": 40,
      "ejercicios": []
    }},
    {{
      "nombre": "Vuelta a la calma",
      "duracion_minutos": 10,
      "ejercicios": []
    }}
  ],
  "nota_del_entrenador": "máximo 2 oraciones explicando por qué esta sesión está diseñada así HOY específicamente, basado en el estado del usuario"
}}
"""


# ─── Main generate view ───────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([GenerateSessionRateThrottle])
def generate_session(request):
    user = request.user
    hoy = date.today()
    hace_14_dias = hoy - timedelta(days=14)

    try:
        perfil = user.profile
    except Exception:
        return Response({'error': 'Perfil no encontrado. Completa el onboarding.'}, status=400)

    checkin = user.checkins.select_related('location').filter(fecha=hoy).order_by('-created_at').first()
    if not checkin:
        return Response({'error': 'Necesitas completar el check-in de hoy primero.'}, status=400)

    if checkin.location:
        loc = checkin.location
    else:
        loc = user.locations.order_by('created_at').first()
        if not loc:
            loc = SimpleNamespace(nombre='Sin ubicación', tipo='casa', implementos=[])

    sesiones_recientes = user.sessions.filter(created_at__date__gte=hace_14_dias)
    fatiga = calcular_fatiga(sesiones_recientes)
    rpe_target = calcular_rpe_target(fatiga, checkin.estado_animo, checkin.hrv)

    competicion = user.competitions.filter(
        fecha__gte=hoy,
        fecha__lte=hoy + timedelta(days=14)
    ).order_by('fecha').first()

    # Phase 1 & 2: Build exercise pool
    exercise_pool, exercise_flat_list = _get_exercise_pool(
        user, loc, dolor_hoy=checkin.dolor_hoy or ''
    )

    # Phase 3 & 4: Adaptation context
    adaptation_context = _build_adaptation_context(user)

    # Phase 5: Periodization / mesocycle state
    estado_mesociclo = _calcular_estado_mesociclo(user)

    ctx = {
        'nombre': perfil.nombre,
        'objetivo': perfil.objetivo or 'salud general',
        'nivel': perfil.nivel,
        'lesiones': perfil.lesiones,
        'experiencia_deportiva': perfil.experiencia_deportiva,
        'edad': perfil.edad,
        'sexo': perfil.sexo,
        'peso': perfil.peso,
        'altura': perfil.altura,
        'dias_semana': perfil.dias_semana,
        'horario_preferido': perfil.horario_preferido,
        'nivel_estres': perfil.nivel_estres,
        'tipo_trabajo': perfil.tipo_trabajo,
        'estilo_entrenamiento': perfil.estilo_entrenamiento,
        'ejercicios_favoritos': perfil.ejercicios_favoritos,
        'ejercicios_evitar': perfil.ejercicios_evitar,
        'rm_sentadilla': perfil.rm_sentadilla,
        'rm_peso_muerto': perfil.rm_peso_muerto,
        'rm_press_banca': perfil.rm_press_banca,
        'rm_press_hombro': perfil.rm_press_hombro,
        'estado_animo': checkin.estado_animo,
        'calidad_sueno': checkin.calidad_sueno,
        'hrv': checkin.hrv,
        'notas': checkin.notas,
        'fatiga': fatiga,
        'rpe_target': rpe_target,
        'duracion': checkin.duracion_disponible,
        'ubicacion_nombre': loc.nombre,
        'ubicacion_tipo': loc.tipo,
        'implementos': loc.implementos or [],
        'competicion_nombre': competicion.nombre if competicion else None,
        'competicion_fecha': str(competicion.fecha) if competicion else None,
        'fases_ciclo': None,
        'dolor_hoy': checkin.dolor_hoy,
        'foco_entrenamiento': checkin.foco_entrenamiento or [],
        'exercise_pool': exercise_pool,
        'adaptation_context': adaptation_context,
        'estado_mesociclo': estado_mesociclo,
    }

    prompt = build_prompt(ctx)

    try:
        sesion_generada = _call_groq(prompt, max_tokens=2048)
    except json.JSONDecodeError:
        logger.exception('Groq returned invalid JSON for user %s', user.id)
        return Response(
            {'error': 'La IA devolvió una respuesta inválida. Intenta de nuevo.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except (ValueError, RuntimeError) as e:
        logger.exception('AI generation failed for user %s', user.id)
        return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception:
        logger.exception('Unexpected error during AI generation for user %s', user.id)
        return Response(
            {'error': 'Servicio de IA no disponible. Intenta de nuevo en unos segundos.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Basic shape validation — the prompt asks for these keys; reject if missing.
    if not isinstance(sesion_generada, dict) or 'fases' not in sesion_generada:
        logger.error('Groq response missing "fases" for user %s: %s', user.id, sesion_generada)
        return Response(
            {'error': 'La IA devolvió una respuesta incompleta. Intenta de nuevo.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    volumen = 'bajo' if fatiga == 'alto' else 'medio' if fatiga == 'medio' else 'alto'

    db_location = loc if isinstance(loc, user.locations.model) else None

    with transaction.atomic():
        sesion = Session.objects.create(
            user=user,
            checkin=checkin,
            location=db_location,
            fecha=hoy,
            duracion_planificada=checkin.duracion_disponible,
            rpe_target=rpe_target,
            volumen_relativo=volumen,
            prompt_usado=prompt,
            respuesta_ia=sesion_generada,
        )
        _persist_session_exercises(sesion, sesion_generada)

    return Response({'sesion': sesion_generada, 'sesion_id': sesion.id})


def _persist_session_exercises(sesion, sesion_generada):
    """Parse the AI response and create SessionExercise rows for analytics/history."""
    orden = 1
    to_create = []
    for fase in sesion_generada.get('fases', []) or []:
        for ej in fase.get('ejercicios', []) or []:
            try:
                nombre = str(ej.get('nombre', '')).strip()[:200]
                if not nombre:
                    continue
                series = int(ej.get('series', 0) or 0)
                descanso = int(ej.get('descanso_segundos', 0) or 0)
                repeticiones = str(ej.get('repeticiones', ''))[:50]
                rpe_raw = ej.get('rpe_sugerido')
                rpe = float(rpe_raw) if rpe_raw is not None else None
                notas = str(ej.get('notas', '') or '')
                to_create.append(SessionExercise(
                    session=sesion,
                    orden=orden,
                    nombre=nombre,
                    series=series,
                    repeticiones=repeticiones,
                    descanso_segundos=descanso,
                    rpe_sugerido=rpe,
                    notas=notas,
                ))
                orden += 1
            except (TypeError, ValueError):
                # Skip malformed exercise entries rather than failing the whole save
                continue
    if to_create:
        SessionExercise.objects.bulk_create(to_create)


# ─── Regenerar ejercicio ──────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([RegenerarEjercicioRateThrottle])
def regenerar_ejercicio(request):
    def _clean(value, max_len):
        if value is None:
            return ''
        return str(value).replace('\n', ' ').replace('\r', ' ').strip()[:max_len]

    nombre_ejercicio = _clean(request.data.get('nombre'), 120)
    fase             = _clean(request.data.get('fase'), 50)
    motivo           = _clean(request.data.get('motivo'), 200)

    if not nombre_ejercicio:
        return Response(
            {'error': 'El nombre del ejercicio es requerido'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Resolve implementos from the session's location
    implementos = []
    session_id = request.data.get('session_id')
    if session_id:
        try:
            from workouts.models import Session as WorkoutSession
            session_obj = request.user.sessions.select_related('location').get(pk=session_id)
            if session_obj.location and session_obj.location.implementos:
                implementos = [_clean(i, 50) for i in session_obj.location.implementos[:30] if i]
        except Exception:
            pass

    # Resolve active injuries from user profile
    lesiones = []
    try:
        lesiones = list(request.user.injuries.filter(activa=True).values_list('zona', flat=True))
    except Exception:
        pass

    motivo_texto = motivo or 'el usuario quiere una variante diferente'
    impl_texto   = ', '.join(implementos) if implementos else 'peso corporal / sin equipamiento'
    lesion_texto = ', '.join(lesiones) if lesiones else 'ninguna'

    prompt = f"""Eres un entrenador personal de élite. Un usuario quiere sustituir un ejercicio de su sesión.

Ejercicio a sustituir: {nombre_ejercicio}
Fase de la sesión: {fase or 'principal'}
Motivo de la sustitución: {motivo_texto}
Equipamiento disponible: {impl_texto}
Lesiones activas del usuario: {lesion_texto}

Genera exactamente 2 ejercicios alternativos que:
1. Sean ejecutables con el equipamiento disponible
2. Trabajen el mismo grupo muscular o patrón de movimiento que el original
3. Respeten las lesiones activas
4. Sean distintos entre sí

Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{{
  "alternativas": [
    {{
      "nombre": "nombre del ejercicio",
      "series": 3,
      "repeticiones": "10-12",
      "descanso_segundos": 90,
      "rpe_sugerido": 7,
      "notas": "cue técnico en 1 frase",
      "por_que": "razón de por qué es buena sustitución para este usuario en 1 frase"
    }},
    {{
      "nombre": "nombre del ejercicio",
      "series": 3,
      "repeticiones": "10-12",
      "descanso_segundos": 90,
      "rpe_sugerido": 7,
      "notas": "cue técnico en 1 frase",
      "por_que": "razón de por qué es buena sustitución para este usuario en 1 frase"
    }}
  ]
}}"""

    try:
        result = _call_groq(prompt, max_tokens=700)
    except json.JSONDecodeError:
        logger.exception('Groq returned invalid JSON in regenerar for user %s', request.user.id)
        return Response(
            {'error': 'La IA devolvió una respuesta inválida.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception:
        logger.exception('Regenerar ejercicio failed for user %s', request.user.id)
        return Response(
            {'error': 'No se pudo buscar alternativas. Intenta de nuevo.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    alternativas = result.get('alternativas') if isinstance(result, dict) else None
    if not isinstance(alternativas, list) or len(alternativas) == 0:
        return Response(
            {'error': 'La IA devolvió una respuesta incompleta.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({'alternativas': alternativas})


# ─── Ajustar sesión (regenerate with overrides) ──────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_ajustar(request, pk):
    """Re-generate an existing session with duration and/or RPE overrides."""
    from types import SimpleNamespace

    try:
        session = (
            request.user.sessions
            .select_related('checkin', 'location', 'checkin__location')
            .get(pk=pk)
        )
    except Session.DoesNotExist:
        return Response({'error': 'Sesión no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    try:
        duracion_delta = int(request.data.get('duracion_delta', 0))
        rpe_delta      = int(request.data.get('rpe_delta', 0))
    except (TypeError, ValueError):
        return Response({'error': 'Parámetros inválidos.'}, status=status.HTTP_400_BAD_REQUEST)

    duracion_delta = max(-30, min(30, duracion_delta))
    rpe_delta      = max(-2,  min(2,  rpe_delta))

    user    = request.user
    checkin = session.checkin

    # Resolve location (prefer session.location, fallback to checkin.location, then first)
    if session.location:
        loc = session.location
    elif checkin and checkin.location:
        loc = checkin.location
    else:
        loc = user.locations.order_by('created_at').first()
        if not loc:
            loc = SimpleNamespace(nombre='Sin ubicación', tipo='casa', implementos=[])

    duracion_base = session.duracion_planificada or (checkin.duracion_disponible if checkin else 60)
    rpe_base      = float(session.rpe_target)

    nueva_duracion = max(20, min(120, duracion_base + duracion_delta))
    nuevo_rpe      = round(max(4.0, min(9.0, rpe_base + rpe_delta)), 1)

    try:
        perfil = user.profile
    except Exception:
        return Response({'error': 'Perfil no encontrado.'}, status=status.HTTP_400_BAD_REQUEST)

    dolor_hoy      = (checkin.dolor_hoy or '') if checkin else ''
    exercise_pool, _ = _get_exercise_pool(user, loc, dolor_hoy=dolor_hoy)
    adaptation_context = _build_adaptation_context(user)
    estado_mesociclo   = _calcular_estado_mesociclo(user)

    hoy = date.today()
    competicion = user.competitions.filter(
        fecha__gte=hoy,
        fecha__lte=hoy + timedelta(days=14),
    ).order_by('fecha').first()

    sesiones_recientes = user.sessions.filter(created_at__date__gte=hoy - timedelta(days=14))
    fatiga = calcular_fatiga(sesiones_recientes)

    ctx = {
        'nombre':               perfil.nombre,
        'objetivo':             perfil.objetivo or 'salud general',
        'nivel':                perfil.nivel,
        'lesiones':             perfil.lesiones,
        'experiencia_deportiva': perfil.experiencia_deportiva,
        'edad':                 perfil.edad,
        'sexo':                 perfil.sexo,
        'peso':                 perfil.peso,
        'altura':               perfil.altura,
        'dias_semana':          perfil.dias_semana,
        'horario_preferido':    perfil.horario_preferido,
        'nivel_estres':         perfil.nivel_estres,
        'tipo_trabajo':         perfil.tipo_trabajo,
        'estilo_entrenamiento': perfil.estilo_entrenamiento,
        'ejercicios_favoritos': perfil.ejercicios_favoritos,
        'ejercicios_evitar':    perfil.ejercicios_evitar,
        'rm_sentadilla':        perfil.rm_sentadilla,
        'rm_peso_muerto':       perfil.rm_peso_muerto,
        'rm_press_banca':       perfil.rm_press_banca,
        'rm_press_hombro':      perfil.rm_press_hombro,
        'estado_animo':         checkin.estado_animo if checkin else 3,
        'calidad_sueno':        checkin.calidad_sueno if checkin else 7,
        'hrv':                  checkin.hrv if checkin else None,
        'notas':                checkin.notas if checkin else None,
        'fatiga':               fatiga,
        'rpe_target':           nuevo_rpe,
        'duracion':             nueva_duracion,
        'ubicacion_nombre':     loc.nombre,
        'ubicacion_tipo':       loc.tipo,
        'implementos':          loc.implementos or [],
        'competicion_nombre':   competicion.nombre if competicion else None,
        'competicion_fecha':    str(competicion.fecha) if competicion else None,
        'fases_ciclo':          None,
        'dolor_hoy':            dolor_hoy,
        'foco_entrenamiento':   (checkin.foco_entrenamiento or []) if checkin else [],
        'exercise_pool':        exercise_pool,
        'adaptation_context':   adaptation_context,
        'estado_mesociclo':     estado_mesociclo,
    }

    prompt = build_prompt(ctx)

    try:
        sesion_generada = _call_groq(prompt, max_tokens=2048)
    except json.JSONDecodeError:
        logger.exception('Groq invalid JSON in ajustar for user %s', user.id)
        return Response(
            {'error': 'La IA devolvió una respuesta inválida. Intenta de nuevo.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception:
        logger.exception('Ajustar sesion failed for user %s', user.id)
        return Response(
            {'error': 'Servicio de IA no disponible. Intenta de nuevo.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if not isinstance(sesion_generada, dict) or 'fases' not in sesion_generada:
        return Response(
            {'error': 'La IA devolvió una respuesta incompleta. Intenta de nuevo.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    with transaction.atomic():
        session.respuesta_ia        = sesion_generada
        session.duracion_planificada = nueva_duracion
        session.rpe_target           = nuevo_rpe
        session.sustituciones        = None
        session.decisiones           = None
        session.evidencia            = None
        session.save(update_fields=[
            'respuesta_ia', 'duracion_planificada', 'rpe_target',
            'sustituciones', 'decisiones', 'evidencia',
        ])
        session.exercises.all().delete()
        _persist_session_exercises(session, sesion_generada)

    return Response({'sesion': sesion_generada})


# ─── Ejercicio demo ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ejercicio_demo(request):
    nombre = request.query_params.get('nombre', '')
    if not nombre:
        return Response({'error': 'Se requiere el parámetro nombre'}, status=400)

    MUSCULOS = {
        'sentadilla': '🦵', 'press': '💪', 'remo': '🏋️', 'peso muerto': '🏋️',
        'plancha': '🧱', 'burpee': '🔥', 'dominada': '💪', 'fondos': '💪',
        'zancada': '🦵', 'hip thrust': '🍑', 'curl': '💪', 'extensión': '🦵',
        'abdominales': '🧱', 'elevación': '🏋️', 'salto': '🔥',
    }
    emoji = '💪'
    nombre_lower = nombre.lower()
    for key, val in MUSCULOS.items():
        if key in nombre_lower:
            emoji = val
            break

    gif_url = ''
    imagen_url = ''
    try:
        ejercicio = Exercise.objects.get(nombre__iexact=nombre)
        gif_url = ejercicio.gif_url or ''
        imagen_url = ejercicio.imagen_url or ''
    except Exercise.DoesNotExist:
        pass

    youtube_query = f"{nombre} ejercicio técnica correcta"
    return Response({
        'emoji': emoji,
        'gif_url': gif_url,
        'imagen_url': imagen_url,
        'youtube_query': youtube_query,
        'youtube_url': f"https://www.youtube.com/results?search_query={youtube_query.replace(' ', '+')}",
    })
