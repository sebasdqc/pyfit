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

# Squat Jump (SJ): misma derivación de altura por tiempo de vuelo que el CMJ
# (h = g·t²/8); sin contramovimiento. La diferencia CMJ − SJ estima el aporte del
# ciclo estiramiento-acortamiento (índice elástico), pero requiere ambos saltos.

# Yo-Yo Intermittent Recovery Test LEVEL 2 (IR2)
# Mismo shuttle de 2×20 m = 40 m, pero arranca más rápido y con mayor componente
# anaeróbico (Krustrup et al. 2006). VO2máx estimado — Bangsbo et al. (2008):
#   VO2máx (ml/min/kg) = distancia(m) × 0.0136 + 45.3
YOYO_IR2_SHUTTLE_M = 40.0
BANGSBO_IR2_SLOPE = 0.0136
BANGSBO_IR2_INTERCEPT = 45.3

# 30-15 Intermittent Fitness Test (30-15 IFT) — Buchheit (2008).
# VIFT = velocidad de la última etapa completada (km/h). Estima VO2máx y, sobre
# todo, individualiza la velocidad de referencia del HIIT (≈ VIFT).
#   VO2máx (ml/kg/min) = 28.3 − 2.15·G − 0.741·A − 0.0357·W
#                        + 0.0586·A·VIFT + 1.03·VIFT
#   G = sexo (hombre = 1, mujer = 2); A = edad (años); W = peso (kg).
IFT_VO2_CONST = 28.3
IFT_VO2_SEXO = -2.15
IFT_VO2_EDAD = -0.741
IFT_VO2_PESO = -0.0357
IFT_VO2_EDAD_VIFT = 0.0586
IFT_VO2_VIFT = 1.03

# RAST (Running Anaerobic Sprint Test) — Draper & Whyte (1997).
# 6 sprints máximos de 35 m con 10 s de recuperación.
#   Potencia de cada sprint (W) = masa(kg) × distancia²(m²) ÷ tiempo³(s³)
#   Potencia pico = máx; media = suma/n; Índice de Fatiga (W/s) =
#     (potencia pico − potencia mínima) ÷ tiempo total de los sprints.
RAST_DISTANCIA_M = 35.0

# Reactive Strength Index (RSI) a partir del Drop Jump:
#   RSI = altura del salto (m) ÷ tiempo de contacto con el suelo (s)
# Mide la capacidad reactiva/pliométrica (ciclo estiramiento-acortamiento rápido).

# COD Deficit — aísla la capacidad de cambiar de dirección de la velocidad lineal:
#   COD deficit (s) = tiempo 505 − tiempo del tramo lineal de 10 m
#   COD deficit (%) = (tiempo 505 ÷ tiempo 10 m − 1) × 100
# Nota: fiabilidad limitada en jóvenes (CV alto); usar como guía, no corte fino.

# ── CARGA INTERNA (sRPE → monotonía → strain → ACWR) ──────────────────────────
# Método de Foster (session-RPE). Validado ampliamente (Haddad et al. 2017).
#   sRPE (UA) = RPE (0–10, CR-10 de Borg) × duración de la sesión (min)
#   Carga semanal = Σ de las cargas diarias (UA) de la semana
#   Monotonía = media de la carga diaria ÷ desviación estándar de la carga diaria
#   Strain = carga semanal total × monotonía
RPE_MAX = 10.0
MONOTONIA_ALERTA = 2.0   # monotonía > 2.0 = riesgo (Foster 1998)

# Edwards TRIMP (Training Impulse por zonas de FC) — REQUIERE monitor de FC.
#   TRIMP (UA) = Σ tiempo en cada zona (min) × factor de zona
#   5 zonas por %FCmáx: Z1 50–60, Z2 60–70, Z3 70–80, Z4 80–90, Z5 90–100.
#   Factores: Z1×1, Z2×2, Z3×3, Z4×4, Z5×5.
# En deportes intermitentes (fútbol/futsal) el % de tiempo por encima del 85–90 %
# FCmáx es la métrica dosis-respuesta clave. En FUTSAL es prioritaria: los jugadores
# pasan ~83 % del tiempo por encima del 85 % FCmáx (Barbero-Álvarez et al.).
EDWARDS_FACTORES = (1, 2, 3, 4, 5)

# ACWR (Acute:Chronic Workload Ratio) — relación carga aguda (7 d) ÷ crónica (28 d).
# Dos modelos: media móvil (RA) y media móvil exponencial (EWMA, más sensible al
# riesgo; Williams et al. 2017). λ = 2 ÷ (N + 1).
ACWR_VENTANA_AGUDA = 7
ACWR_VENTANA_CRONICA = 28
# Zonas (benchmarks de gestión de carga, NO predicción causal de lesión):
ACWR_INFRACARGA = 0.8    # < 0.8  → infracarga / destraining
ACWR_OPTIMA_MAX = 1.3    # 0.8–1.3 → sweet spot (riesgo más bajo)
ACWR_PRECAUCION_MAX = 1.5  # 1.3–1.5 → precaución
ACWR_RIESGO_ALTO = 2.0   # > 2.0  → riesgo relativo muy elevado

# Forma (fitness-fatiga, Banister 1975 / TSB "Training Stress Balance" popularizado
# por Coggan en ciclismo). Dos EWMA de la misma serie diaria de carga con distinta
# constante de tiempo: "fitness" (crónica, cambia lento) y "fatiga" (aguda, cambia
# rápido). TSB = fitness − fatiga: positivo = fresco/con forma, negativo = fatigado.
# IMPORTANTE (encuadre honesto, igual que ACWR): es una TENDENCIA de gestión de
# carga, no una predicción exacta de "el día del pico" — ni para forma física ni,
# menos aún, para equilibrio psicológico (no existe modelo validado para eso).
FORMA_VENTANA_FATIGA = 7     # EWMA corta ("fatiga aguda")
FORMA_VENTANA_FITNESS = 42   # EWMA larga ("fitness crónico"); se estabiliza ~6 semanas
FORMA_TSB_FRESCO = 5         # TSB > 5   → fresco / con forma
FORMA_TSB_NEUTRO_MIN = -10   # -10..5    → neutro/transición ; < -10 → fatigado

# ── PREVENCIÓN / RETURN-TO-PLAY ───────────────────────────────────────────────
# Nordic Hamstring — asimetría de fuerza excéntrica entre piernas (NordBord y
# similares). Umbral de asimetría relevante igual que en el resto del panel.
ASIMETRIA_NORDIC_UMBRAL_PCT = 10.0
# Limb Symmetry Index (LSI) en baterías de hop tests / fuerza:
#   LSI = (rendimiento pierna lesionada ÷ pierna sana) × 100
#   Criterio RTP clásico: LSI ≥ 90 %. Cautela: puede sobreestimar la recuperación
#   (la pierna sana se debilita en la rehab); muchos exigen 95–100 % y comparación
#   con valores pre-lesión.
LSI_UMBRAL_RTP_PCT = 90.0
# Deshidratación por cambio de masa corporal (sin hardware, báscula):
#   % deshidratación = (peso pre − peso post) ÷ peso pre × 100
#   Pérdida > 2 % del peso corporal = umbral de afectación del rendimiento.
DESHIDRATACION_ALERTA_PCT = 2.0

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
