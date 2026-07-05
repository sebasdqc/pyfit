"""
Endpoints para búsqueda y creación de ejercicios personalizados por coaches.

GET  /api/exercises/catalog/   — opciones de dropdowns (AllowAny)
GET  /api/exercises/search/    — búsqueda por nombre (?q=...) — JWT
POST /api/exercises/create/    — crea ejercicio + enriquece con Groq — IsCoach
"""

import logging

from django.db.models import Q
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from pyfit.throttles import ExerciseCatalogRateThrottle
from rest_framework.response import Response
from rest_framework import status

from workouts.models import Exercise
from users.coach_views import IsCoach

logger = logging.getLogger(__name__)

# ─── Catálogos (mismos values que el modelo) ─────────────────────────────────

PATRON_OPCIONES = [
    {'value': 'empuje_horizontal', 'label': 'Empuje horizontal'},
    {'value': 'empuje_vertical',   'label': 'Empuje vertical'},
    {'value': 'jalon_horizontal',  'label': 'Jalón horizontal'},
    {'value': 'jalon_vertical',    'label': 'Jalón vertical'},
    {'value': 'sentadilla',        'label': 'Sentadilla / Cuádriceps'},
    {'value': 'bisagra',           'label': 'Bisagra / Cadena posterior'},
    {'value': 'core_antiextension','label': 'Core — antiextensión'},
    {'value': 'core_antirrotacion','label': 'Core — antirrotación'},
    {'value': 'core_antiflexion',  'label': 'Core — antiflexión lateral'},
    {'value': 'cargada',           'label': 'Cargada / Mov. olímpico'},
    {'value': 'locomocion',        'label': 'Locomoción / Transporte de carga'},
    {'value': 'aislamiento',       'label': 'Aislamiento muscular'},
]

DIFICULTAD_OPCIONES = [
    {'value': 'principiante', 'label': 'Principiante'},
    {'value': 'intermedio',   'label': 'Intermedio'},
    {'value': 'avanzado',     'label': 'Avanzado'},
]

SPACE_OPCIONES = [
    {'value': 'minimo', 'label': 'Mínimo (≈1 m²)'},
    {'value': 'medio',  'label': 'Medio (2–4 m²)'},
    {'value': 'amplio', 'label': 'Amplio (>4 m²)'},
]

NIVEL_1_5 = [
    {'value': 1, 'label': '1 — Muy bajo'},
    {'value': 2, 'label': '2 — Bajo'},
    {'value': 3, 'label': '3 — Moderado'},
    {'value': 4, 'label': '4 — Alto'},
    {'value': 5, 'label': '5 — Muy alto'},
]

# Músculos agrupados por zona anatómica
MUSCULOS = [
    {'grupo': 'Pierna', 'items': [
        'Cuádriceps', 'Isquiotibiales', 'Glúteo mayor', 'Glúteo medio',
        'Aductores', 'Abductores', 'Pantorrilla (gastrocnemio)', 'Sóleo',
        'Tensor de la fascia lata', 'Tibial anterior',
    ]},
    {'grupo': 'Pecho', 'items': [
        'Pectoral mayor (porción esternal)', 'Pectoral mayor (porción clavicular)',
        'Pectoral menor', 'Serrato anterior',
    ]},
    {'grupo': 'Espalda', 'items': [
        'Dorsal ancho', 'Redondo mayor', 'Trapecio superior', 'Trapecio medio',
        'Trapecio inferior', 'Romboides', 'Erector espinal', 'Multífidos',
    ]},
    {'grupo': 'Hombro', 'items': [
        'Deltoides anterior', 'Deltoides lateral', 'Deltoides posterior',
        'Infraespinoso', 'Redondo menor', 'Supraespinoso', 'Subescapular',
    ]},
    {'grupo': 'Brazo', 'items': [
        'Bíceps braquial', 'Braquial', 'Braquiorradial',
        'Tríceps braquial', 'Flexores del antebrazo', 'Extensores del antebrazo',
    ]},
    {'grupo': 'Core', 'items': [
        'Recto abdominal', 'Transverso abdominal', 'Oblicuo externo',
        'Oblicuo interno', 'Psoas ilíaco', 'Cuadrado lumbar',
    ]},
]

EQUIPAMIENTO = [
    'Sin equipamiento (peso corporal)',
    'Barra olímpica',
    'Mancuernas',
    'Kettlebell',
    'Máquina de cable / Polea',
    'Máquina guiada',
    'Bandas elásticas',
    'TRX / Suspensión',
    'Banco',
    'Rack / Jaula',
    'Balón medicinal',
    'Cajón / Step',
    'Paralelas',
    'Barra de dominadas',
]

# Zonas de contraindicación (lo que el atleta puede tener lesionado)
CONTRAINDICACIONES = [
    'Rodilla',
    'Espalda baja (lumbar)',
    'Espalda alta / Cervical',
    'Hombro',
    'Cadera',
    'Codo',
    'Muñeca / Mano',
    'Tobillo / Pie',
]


# ─── Endpoint 1: catálogo de opciones ────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([ExerciseCatalogRateThrottle])
def exercise_catalog(request):
    """Devuelve todas las opciones de dropdowns para el formulario de ejercicio."""
    return Response({
        'patron_movimiento': PATRON_OPCIONES,
        'dificultad': DIFICULTAD_OPCIONES,
        'space_required': SPACE_OPCIONES,
        'error_risk': NIVEL_1_5,
        'technical_level': NIVEL_1_5,
        'systemic_fatigue': NIVEL_1_5,
        'musculos': MUSCULOS,
        'equipamiento': EQUIPAMIENTO,
        'contraindicaciones': CONTRAINDICACIONES,
    })


# ─── Endpoint 2: búsqueda ─────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def exercise_search(request):
    """Busca ejercicios activos por nombre (icontains). Devuelve hasta 12 resultados."""
    q = (request.query_params.get('q') or '').strip()
    if len(q) < 2:
        return Response({'results': []})

    qs = (Exercise.objects
          .filter(nombre__icontains=q, activo=True)
          .order_by('patron_movimiento', 'nombre')[:12])

    results = [{
        'id': ex.id,
        'nombre': ex.nombre,
        'patron': ex.patron_movimiento,
        'patron_label': next((p['label'] for p in PATRON_OPCIONES if p['value'] == ex.patron_movimiento), ex.patron_movimiento),
        'dificultad': ex.dificultad,
        'musculos_primarios': ex.musculos_primarios,
        'equipamiento': ex.equipamiento,
    } for ex in qs]

    return Response({'results': results})


# ─── Helpers Groq ─────────────────────────────────────────────────────────────

_GROQ_EXERCISE_PROMPT = """\
Eres un experto en ciencias del ejercicio (NSCA-CSCS). Un coach creó el siguiente \
ejercicio personalizado y necesitas enriquecerlo con información técnica precisa.

Ejercicio: {nombre}
Patrón de movimiento: {patron}
Dificultad declarada: {dificultad}
Músculos primarios: {musculos_primarios}
Músculos secundarios: {musculos_secundarios}
Equipamiento: {equipamiento}
Tipo: {tipo}
Riesgo de error técnico declarado (1-5): {error_risk}

Devuelve SOLO un objeto JSON válido (sin comentarios, sin markdown) con esta estructura exacta:
{{
  "coaching_cues": ["<tip técnico 1>", "<tip técnico 2>", "<tip técnico 3>"],
  "description": "<1-2 oraciones describiendo el ejercicio y su beneficio principal>",
  "contraindicaciones_sugeridas": ["<zona lesión 1>", "<zona lesión 2>"],
  "technical_level": <entero 1-5>,
  "systemic_fatigue": <entero 1-5>,
  "rest_seconds_default": <entero entre 30 y 300>
}}

Reglas:
- coaching_cues: exactamente 3 puntos técnicos accionables, máx 80 chars cada uno, en español.
- description: máx 120 chars, en español.
- contraindicaciones_sugeridas: SOLO de esta lista: {contras_lista}. Puede ser lista vacía.
- technical_level: complejidad de coordinación/técnica (1=simple, 5=muy complejo).
- systemic_fatigue: demanda cardiovascular/neural sistémica (1=local/bajo, 5=muy alto).
- rest_seconds_default: tiempo de recuperación recomendado entre series.
"""


def _enriquecer_con_groq(nombre, patron, dificultad, musculos_prim, musculos_sec,
                          equipamiento, es_compuesto, error_risk) -> dict | None:
    """Llama a Groq y devuelve el dict enriquecido. Retorna None si hay error."""
    if not settings.GROQ_API_KEY:
        logger.warning('exercise_create: GROQ_API_KEY no configurada, se omite enriquecimiento')
        return None

    try:
        from groq import Groq
        import json

        tipo = 'Compuesto (multi-articular)' if es_compuesto else 'Aislamiento (mono-articular)'
        contras_lista = ', '.join(CONTRAINDICACIONES)

        prompt = _GROQ_EXERCISE_PROMPT.format(
            nombre=nombre,
            patron=next((p['label'] for p in PATRON_OPCIONES if p['value'] == patron), patron),
            dificultad=dificultad,
            musculos_primarios=', '.join(musculos_prim) if musculos_prim else 'no especificados',
            musculos_secundarios=', '.join(musculos_sec) if musculos_sec else 'ninguno',
            equipamiento=', '.join(equipamiento) if equipamiento else 'sin equipamiento',
            tipo=tipo,
            error_risk=error_risk or 'no especificado',
            contras_lista=contras_lista,
        )

        client = Groq(api_key=settings.GROQ_API_KEY, timeout=20.0, max_retries=1)
        completion = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=400,
            temperature=0.2,
        )
        raw = (completion.choices[0].message.content or '').strip()

        # Extraer JSON aunque venga con backticks
        if '```' in raw:
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        data = json.loads(raw)

        # Sanear campos
        cues = [str(c)[:80] for c in (data.get('coaching_cues') or [])[:5]]
        contras_raw = [c for c in (data.get('contraindicaciones_sugeridas') or []) if c in CONTRAINDICACIONES]
        return {
            'coaching_cues': cues,
            'description': str(data.get('description') or '')[:200],
            'contraindicaciones_groq': contras_raw,
            'technical_level': max(1, min(5, int(data.get('technical_level') or 3))),
            'systemic_fatigue': max(1, min(5, int(data.get('systemic_fatigue') or 3))),
            'rest_seconds_default': max(30, min(300, int(data.get('rest_seconds_default') or 90))),
        }
    except Exception as exc:
        logger.warning('exercise_create groq error: %s', exc)
        return None


# ─── Endpoint 3: crear ejercicio personalizado ───────────────────────────────

@api_view(['POST'])
@permission_classes([IsCoach])
def exercise_create(request):
    """
    Crea un ejercicio personalizado. Si analizar_con_ia=True, llama a Groq
    para enriquecer coaching_cues, description, contraindicaciones, etc.

    Body:
      nombre*, patron_movimiento*, dificultad*, es_compuesto,
      musculos_primarios[], musculos_secundarios[], equipamiento[],
      contraindicaciones[], error_risk, space_required, analizar_con_ia
    """
    body = request.data if isinstance(request.data, dict) else {}

    # Sin saltos de línea: este nombre entra al catálogo GLOBAL (activo de inmediato,
    # sin revisión) y se interpola literalmente en el prompt de generación de
    # CUALQUIER usuario de la app, no solo de los atletas de este coach.
    nombre = str(body.get('nombre') or '').replace('\n', ' ').replace('\r', ' ').strip()[:200]
    if not nombre:
        return Response({'error': 'El nombre es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

    patron = body.get('patron_movimiento') or ''
    if patron not in [p['value'] for p in PATRON_OPCIONES]:
        return Response({'error': 'Patrón de movimiento inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    dificultad = body.get('dificultad') or 'intermedio'
    if dificultad not in [d['value'] for d in DIFICULTAD_OPCIONES]:
        dificultad = 'intermedio'

    space = body.get('space_required') or None
    if space and space not in [s['value'] for s in SPACE_OPCIONES]:
        space = None

    es_compuesto = bool(body.get('es_compuesto', True))

    # Listas — se filtran contra los catálogos para evitar valores inventados
    todos_musculos = [m for g in MUSCULOS for m in g['items']]
    musculos_prim = [m for m in (body.get('musculos_primarios') or []) if m in todos_musculos]
    musculos_sec  = [m for m in (body.get('musculos_secundarios') or []) if m in todos_musculos]
    equipamiento  = [e for e in (body.get('equipamiento') or []) if e in EQUIPAMIENTO]
    contrainds    = [c for c in (body.get('contraindicaciones') or []) if c in CONTRAINDICACIONES]

    error_risk = body.get('error_risk')
    if error_risk is not None:
        try:
            error_risk = max(1, min(5, int(error_risk)))
        except (TypeError, ValueError):
            error_risk = None

    analizar = bool(body.get('analizar_con_ia', True))

    # Si el nombre ya existe, devolver el existente con mensaje informativo
    existing = Exercise.objects.filter(nombre__iexact=nombre).first()
    if existing:
        return Response({
            'warning': f'Ya existe un ejercicio llamado "{existing.nombre}" en el catálogo.',
            'ejercicio': _serialize_exercise(existing),
        }, status=status.HTTP_200_OK)

    # Enriquecimiento con Groq (opcional)
    groq_data = None
    if analizar:
        groq_data = _enriquecer_con_groq(
            nombre, patron, dificultad, musculos_prim, musculos_sec,
            equipamiento, es_compuesto, error_risk,
        )

    # Fusionar: los valores explícitos del coach tienen prioridad sobre Groq
    coaching_cues = groq_data['coaching_cues'] if groq_data else []
    description   = groq_data['description']   if groq_data else ''
    tech_level    = groq_data['technical_level']    if groq_data else None
    syst_fatigue  = groq_data['systemic_fatigue']   if groq_data else None
    rest_default  = groq_data['rest_seconds_default'] if groq_data else None

    # Contraindicaciones: unión de las del coach + las sugeridas por Groq
    if groq_data:
        for c in groq_data.get('contraindicaciones_groq') or []:
            if c not in contrainds:
                contrainds.append(c)

    ex = Exercise.objects.create(
        nombre=nombre,
        patron_movimiento=patron,
        dificultad=dificultad,
        es_compuesto=es_compuesto,
        musculos_primarios=musculos_prim,
        musculos_secundarios=musculos_sec,
        equipamiento=equipamiento,
        contraindicaciones=contrainds,
        error_risk=error_risk,
        space_required=space,
        technical_level=tech_level,
        systemic_fatigue=syst_fatigue,
        rest_seconds_default=rest_default,
        coaching_cues=coaching_cues,
        description=description,
        activo=True,
        creado_por=request.user,
    )

    return Response({
        'ejercicio': _serialize_exercise(ex),
        'enriquecido': groq_data is not None,
    }, status=status.HTTP_201_CREATED)


def _serialize_exercise(ex: Exercise) -> dict:
    patron_label = next((p['label'] for p in PATRON_OPCIONES if p['value'] == ex.patron_movimiento), ex.patron_movimiento)
    return {
        'id': ex.id,
        'nombre': ex.nombre,
        'patron': ex.patron_movimiento,
        'patron_label': patron_label,
        'dificultad': ex.dificultad,
        'es_compuesto': ex.es_compuesto,
        'musculos_primarios': ex.musculos_primarios,
        'musculos_secundarios': ex.musculos_secundarios,
        'equipamiento': ex.equipamiento,
        'contraindicaciones': ex.contraindicaciones,
        'error_risk': ex.error_risk,
        'technical_level': ex.technical_level,
        'systemic_fatigue': ex.systemic_fatigue,
        'space_required': ex.space_required,
        'rest_seconds_default': ex.rest_seconds_default,
        'coaching_cues': ex.coaching_cues,
        'description': ex.description,
        'creado_por_coach': ex.creado_por_id is not None,
    }
