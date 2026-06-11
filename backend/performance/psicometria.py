"""Cuestionarios psicológicos validados — catálogo + scoring por subescalas.

El psicólogo administra el instrumento (en su herramienta/papel) y registra aquí
la puntuación de cada SUBESCALA; el SERVIDOR valida los rangos y calcula el/los
índice(s) compuesto(s) e interpreta. No se reproducen los ítems (propiedad de cada
autor): esto es una herramienta de registro y cálculo que referencia instrumentos
estándar por su nombre. Esta es la única fuente de las fórmulas y rangos.

Para añadir un instrumento: declarar su entrada en INSTRUMENTS con sus subescalas
y un `scorer`. El frontend pinta el formulario desde el catálogo (subescalas).
"""

from __future__ import annotations


class InstrumentError(Exception):
    """Errores de validación {subescala: mensaje} → la vista los traduce a 400."""

    def __init__(self, errors):
        if isinstance(errors, str):
            errors = {'__all__': errors}
        self.errors = errors
        super().__init__(str(errors))


# ── Scorers (calculan los índices compuestos a partir de las subescalas) ───────

def _brums(v):
    # Brunel Mood Scale (Terry et al.): 6 subescalas 0–16. Alteración Total del
    # Estado de Ánimo (TMD) = Σ negativas − vigor (rango −16…64).
    neg = v['tension'] + v['depresion'] + v['colera'] + v['fatiga'] + v['confusion']
    tmd = round(neg - v['vigor'], 1)
    return {
        'indice': tmd,
        'indice_label': 'Alteración total del ánimo (TMD)',
        # Perfil "iceberg": vigor por encima de las subescalas negativas → buen estado.
        'interpretacion': 'Perfil iceberg: vigor dominante' if v['vigor'] >= neg / 5
        else 'Estado de ánimo alterado',
    }


def _poms(v):
    # Alteración Total del Estado de Ánimo (TMD) = Σ negativas − vigor (+100).
    neg = v['tension'] + v['depresion'] + v['colera'] + v['fatiga'] + v['confusion']
    tmd = round(neg - v['vigor'] + 100, 1)
    return {
        'indice': tmd,
        'indice_label': 'Alteración total del ánimo (TMD)',
        'interpretacion': 'Perfil iceberg: vigor dominante' if v['vigor'] >= neg / 5
        else 'Estado de ánimo alterado',
    }


def _restq(v):
    # Balance recuperación − estrés (escalas medias 0–6).
    balance = round(v['recuperacion'] - v['estres'], 2)
    return {
        'indice': balance,
        'indice_label': 'Balance recuperación − estrés',
        'interpretacion': 'Recuperación suficiente' if balance >= 0
        else 'Estrés por encima de la recuperación',
    }


def _csai2(v):
    # Ansiedad estado competitiva: cognitiva, somática y autoconfianza (9–36 c/u).
    ansiedad = round((v['ansiedad_cognitiva'] + v['ansiedad_somatica']) / 2, 1)
    return {
        'indice': round(v['autoconfianza'], 1),
        'indice_label': 'Autoconfianza (9–36)',
        'interpretacion': 'Autoconfianza por encima de la ansiedad' if v['autoconfianza'] >= ansiedad
        else 'Ansiedad por encima de la autoconfianza',
    }


def _abq(v):
    # Burnout deportivo: media de las 3 subescalas (1–5).
    burnout = round((v['agotamiento'] + v['devaluacion'] + v['reduccion_logro']) / 3, 2)
    nivel = 'Riesgo de burnout' if burnout >= 3 else 'Señales moderadas' if burnout >= 2 else 'Bajo'
    return {
        'indice': burnout,
        'indice_label': 'Burnout global (1–5)',
        'interpretacion': nivel,
    }


# ── Catálogo de instrumentos ──────────────────────────────────────────────────
# `dir`: 'neg' (mayor = peor) / 'pos' (mayor = mejor) — solo informativo para la UI.
INSTRUMENTS = {
    'brums': {
        'nombre': 'Estado de ánimo (BRUMS)',
        'descripcion': '6 subescalas (0–16) en 2–3 min; calcula la Alteración Total del Estado de Ánimo (TMD).',
        'subescalas': [
            {'key': 'tension', 'label': 'Tensión', 'min': 0, 'max': 16, 'dir': 'neg'},
            {'key': 'depresion', 'label': 'Depresión', 'min': 0, 'max': 16, 'dir': 'neg'},
            {'key': 'colera', 'label': 'Cólera', 'min': 0, 'max': 16, 'dir': 'neg'},
            {'key': 'vigor', 'label': 'Vigor', 'min': 0, 'max': 16, 'dir': 'pos'},
            {'key': 'fatiga', 'label': 'Fatiga', 'min': 0, 'max': 16, 'dir': 'neg'},
            {'key': 'confusion', 'label': 'Confusión', 'min': 0, 'max': 16, 'dir': 'neg'},
        ],
        'scorer': _brums,
    },
    'poms': {
        'nombre': 'Perfil de estados de ánimo (POMS)',
        'descripcion': '6 subescalas de ánimo; calcula la Alteración Total del Estado de Ánimo (TMD).',
        'subescalas': [
            {'key': 'tension', 'label': 'Tensión', 'min': 0, 'max': 100, 'dir': 'neg'},
            {'key': 'depresion', 'label': 'Depresión', 'min': 0, 'max': 100, 'dir': 'neg'},
            {'key': 'colera', 'label': 'Cólera', 'min': 0, 'max': 100, 'dir': 'neg'},
            {'key': 'vigor', 'label': 'Vigor', 'min': 0, 'max': 100, 'dir': 'pos'},
            {'key': 'fatiga', 'label': 'Fatiga', 'min': 0, 'max': 100, 'dir': 'neg'},
            {'key': 'confusion', 'label': 'Confusión', 'min': 0, 'max': 100, 'dir': 'neg'},
        ],
        'scorer': _poms,
    },
    'restq-sport': {
        'nombre': 'Recuperación-Estrés (RESTQ-Sport)',
        'descripcion': 'Balance entre estrés y recuperación (escalas medias 0–6).',
        'subescalas': [
            {'key': 'estres', 'label': 'Estrés general', 'min': 0, 'max': 6, 'dir': 'neg'},
            {'key': 'recuperacion', 'label': 'Recuperación', 'min': 0, 'max': 6, 'dir': 'pos'},
        ],
        'scorer': _restq,
    },
    'csai-2': {
        'nombre': 'Ansiedad estado competitiva (CSAI-2)',
        'descripcion': 'Ansiedad cognitiva, somática y autoconfianza (9–36 cada una).',
        'subescalas': [
            {'key': 'ansiedad_cognitiva', 'label': 'Ansiedad cognitiva', 'min': 9, 'max': 36, 'dir': 'neg'},
            {'key': 'ansiedad_somatica', 'label': 'Ansiedad somática', 'min': 9, 'max': 36, 'dir': 'neg'},
            {'key': 'autoconfianza', 'label': 'Autoconfianza', 'min': 9, 'max': 36, 'dir': 'pos'},
        ],
        'scorer': _csai2,
    },
    'abq': {
        'nombre': 'Burnout deportivo (ABQ)',
        'descripcion': 'Agotamiento, devaluación y reducción de logro (1–5); media global.',
        'subescalas': [
            {'key': 'agotamiento', 'label': 'Agotamiento físico/emocional', 'min': 1, 'max': 5, 'dir': 'neg'},
            {'key': 'devaluacion', 'label': 'Devaluación de la práctica', 'min': 1, 'max': 5, 'dir': 'neg'},
            {'key': 'reduccion_logro', 'label': 'Reducción de la sensación de logro', 'min': 1, 'max': 5, 'dir': 'neg'},
        ],
        'scorer': _abq,
    },
}


def catalog() -> list[dict]:
    """Catálogo para el frontend (sin el scorer)."""
    return [
        {'slug': slug, 'nombre': i['nombre'], 'descripcion': i['descripcion'], 'subescalas': i['subescalas']}
        for slug, i in INSTRUMENTS.items()
    ]


def score(slug: str, responses) -> dict:
    """Valida las subescalas y calcula los resultados. Lanza InstrumentError."""
    inst = INSTRUMENTS.get(slug)
    if inst is None:
        raise InstrumentError({'instrument': f'Instrumento desconocido: {slug!r}.'})
    if not isinstance(responses, dict):
        raise InstrumentError('Las subescalas deben ser un objeto.')

    clean, errors = {}, {}
    for s in inst['subescalas']:
        key, lo, hi = s['key'], s['min'], s['max']
        try:
            x = float(responses.get(key))
        except (TypeError, ValueError):
            errors[key] = f'Debe ser un número entre {lo} y {hi}.'
            continue
        if x < lo or x > hi:
            errors[key] = f'Debe estar entre {lo} y {hi}.'
            continue
        clean[key] = x
    if errors:
        raise InstrumentError(errors)

    return {
        'instrument': slug,
        'nombre': inst['nombre'],
        'subescalas': clean,
        'resultados': inst['scorer'](clean),
    }
