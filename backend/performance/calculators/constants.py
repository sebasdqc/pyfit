"""Constantes de las fórmulas de los tests.

Centralizadas y comentadas para que sean fáciles de AUDITAR y AJUSTAR. Cada bloque
cita la fórmula y su fuente. No metas números mágicos en las calculadoras: que todo
factor normativo viva aquí.
"""

# Gravedad (m/s²) — para derivar altura de salto desde tiempo de vuelo.
G = 9.81

# ── FÍSICOS ───────────────────────────────────────────────────────────────────

# Yo-Yo Intermittent Recovery Test (IR1)
# Cada "shuttle" son 2×20 m = 40 m de carrera. La distancia total (score del test)
# = nº de shuttles completados × 40 m.
YOYO_IR1_SHUTTLE_M = 40.0
# VO2máx estimado — Bangsbo et al. (2008):
#   VO2máx (ml/min/kg) = distancia(m) × 0.0084 + 36.4
BANGSBO_IR1_SLOPE = 0.0084
BANGSBO_IR1_INTERCEPT = 36.4

# Test 505 (cambio de dirección / agilidad)
# Asimetría inter-extremidad = (|dom − no_dom| / max(dom, no_dom)) × 100.
# Umbral a partir del cual se considera un desequilibrio relevante (alerta).
ASIMETRIA_UMBRAL_PCT = 10.0

# CMJ — potencia pico estimada (Sayers et al., 1999):
#   Peak Power (W) = 60.7 × altura(cm) + 45.3 × masa(kg) − 2055
SAYERS_ALTURA = 60.7
SAYERS_MASA = 45.3
SAYERS_CONST = 2055.0

# ── TÉCNICOS ──────────────────────────────────────────────────────────────────

# Loughborough Soccer Passing Test (LSPT) — matriz de penalización (segundos).
# Tiempo de rendimiento = tiempo de ejecución + Σ penalizaciones − Σ bonus.
# Valores estándar del protocolo; ajustables por centro si lo necesitan.
LSPT_PENALIZACIONES = {
    'pase_impreciso': 3.0,        # pase que no toca la diana correcta
    'objetivo_equivocado': 5.0,   # pasar a la diana equivocada
    'balon_fuera_area': 3.0,      # el balón sale del área de pase
    'manejo_balon': 5.0,          # control ilegal / tocar con la mano
    'no_parar_zona': 2.0,         # no recibir/parar dentro de la zona marcada
}
# Bonus: −1 s por golpear la banda/línea central de la diana.
LSPT_BONUS_DIANA = 1.0

# Slalom / conducción — penalización por cono derribado (segundos).
PENAL_CONO_S = 2.0

# ── TÁCTICOS ──────────────────────────────────────────────────────────────────

# TSAP (Team Sport Assessment Procedure) — Gréhaigne, Godbout & Bouthier (1997).
#   Volumen de juego (VJ)      = balones conquistados + balones recibidos
#   Índice de eficiencia (IE)  = (balones conquistados + balones ofensivos)
#                                / (10 + balones perdidos)
#   Puntuación de rendimiento  = (VJ / 2) + (IE × 10)
# "Balones ofensivos" agrupa pases ofensivos + jugadas exitosas (acciones que
# llegan a un compañero en posición de ataque). El 10 amortigua a jugadores con
# pocas pérdidas. Constantes abajo para poder ajustarlas/auditarlas.
TSAP_IE_AMORTIGUACION = 10.0   # término "+10" del denominador del IE
TSAP_VJ_DIVISOR = 2.0          # VJ/2 en la puntuación de rendimiento
TSAP_IE_FACTOR = 10.0          # IE×10 en la puntuación de rendimiento

# GPAI (Game Performance Assessment Instrument) — Oslin, Mitchell & Griffin (1998),
# variante de proporción (0–1), más estable que el ratio original cuando el
# denominador es pequeño:
#   Índice de un componente = acciones apropiadas / (apropiadas + inapropiadas)
#   Game Involvement (GI)   = Σ de todas las acciones observadas (conteo total)
#   Game Performance (GP)   = media de los índices de los componentes observados
# (No hay constantes numéricas: las fórmulas son proporciones puras.)
