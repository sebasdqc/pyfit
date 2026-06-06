"""Índice de bienestar del módulo Psicológico (monitoreo de wellness).

Subescalas de autopercepción tipo Hooper-Mackinnon + ánimo, en escala 1–7 con
convención **"mayor = mejor"** (1 = peor, 7 = mejor) para que el índice agregado
sea intuitivo. El índice de bienestar (0–100) y el estado (ok/duda/alerta) los
calcula SIEMPRE el servidor; esta es la única fuente de la fórmula (la usan el
modelo al guardar y el endpoint de cálculo en vivo).
"""

SCALE_MIN = 1
SCALE_MAX = 7

# Las 5 subescalas (todas 1–7, mayor = mejor). `label` lo usa el frontend.
WELLNESS_ITEMS = [
    {'name': 'sueno', 'label': 'Calidad del sueño'},
    {'name': 'fatiga', 'label': 'Energía (vs. fatiga)'},
    {'name': 'estres', 'label': 'Calma (vs. estrés)'},
    {'name': 'dolor_muscular', 'label': 'Ausencia de dolor muscular'},
    {'name': 'animo', 'label': 'Estado de ánimo'},
]
ITEM_NAMES = [i['name'] for i in WELLNESS_ITEMS]

# Umbrales del estado a partir del índice (0–100). Centralizados para auditarlos.
UMBRAL_OK = 70      # ≥ 70 → bien
UMBRAL_DUDA = 50    # 50–69 → monitoreo · < 50 → alerta


def compute_index(values) -> int:
    """Índice de bienestar 0–100 (mayor = mejor) = media normalizada de las 5
    subescalas. total ∈ [5, 35] → 0–100."""
    total = sum(int(values[n]) for n in ITEM_NAMES)
    span = (SCALE_MAX - SCALE_MIN) * len(ITEM_NAMES)        # 30
    base = SCALE_MIN * len(ITEM_NAMES)                      # 5
    return round((total - base) / span * 100)


def estado(indice: int) -> str:
    """ok / duda / alerta según el índice de bienestar."""
    if indice >= UMBRAL_OK:
        return 'ok'
    if indice >= UMBRAL_DUDA:
        return 'duda'
    return 'alerta'
