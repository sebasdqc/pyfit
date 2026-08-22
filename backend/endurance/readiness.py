"""Readiness diaria y re-adaptación de sesión — SPORT-AGNOSTIC.

`compute_readiness()` traduce el check-in diario (`checkins.DailyCheckin`, ya
compartido por TODOS los deportes/disciplinas del producto — no es propio de
running) más la carga ACWR (`performance.carga_service.athlete_carga`,
también ya compartida) en un score 0-100 y un set de flags. `adapt_today()`
aplica sobre esas señales la tabla de re-adaptación: qué hacer con la sesión
del día cuando hay dolor, ACWR alto, ánimo bajo, etc.

Lo único que cada deporte inyecta es SU DATO propio:
  · `pain_keywords` — qué palabras de dolor importan (running: rodilla,
    gemelo, aquiles...; ciclismo tendrá otras: sillín, cuello, lumbar...).
  · `rpe_by_zone` — el RPE nominal por zona de intensidad (las zonas de
    running, Z1-Z5 por ritmo, no son las de ciclismo, que en Coggan son 7 por
    potencia).
La DECISIÓN (qué degradar, cuánto, con qué ajuste) es la misma tabla para
cualquier deporte — es lo que extrae este módulo.

Extraído de `RunningAdaptiveEngineService.compute_readiness()` /
`.adapt_today()` 2026-08-21 (Fase 1 del plan running+ciclismo). Ver
`ai_running/adaptive_engine_running.py` para el wrapper que sigue exponiendo
el contrato exacto que ya usan sus tests y `prescribe_run_session`.

Módulo PURO: no importa Django ni modelos — `checkin` se usa por duck-typing
(cualquier objeto con `.estado_animo`/`.calidad_sueno`/`.hrv`/`.dolor_hoy`/
`.foco_entrenamiento`, típicamente un `checkins.DailyCheckin`).
"""
import unicodedata

# Zonas de carga (ACWR EWMA) que disparan precaución / degradación. Nombres
# ya genéricos en `performance.carga_service` — no son propios de running.
ZONAS_ALTAS = ('Zona de peligro', 'Riesgo alto')
ZONAS_PRECAUCION = ('Precaución',) + ZONAS_ALTAS


def _norm(s: str) -> str:
    """Normaliza texto (minúsculas, sin acentos) para matching de keywords.
    Reimplementado acá (en vez de importar `ai_workout.training_science._norm`)
    para que `endurance` no dependa del motor de FUERZA — un módulo
    compartido entre deportes de resistencia no debería colgar de un motor
    de deporte concreto. Misma normalización exacta."""
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode('ascii')
    return s.lower().strip()


def detectar_dolor(texto: str, keywords) -> str | None:
    """Primera keyword de `keywords` que aparece en `texto` (normalizado), o
    None si no hay texto o ninguna coincide."""
    txt = _norm(texto or '')
    if not txt:
        return None
    for kw in keywords:
        if kw in txt:
            return kw
    return None


def es_checkin_de_descanso(foco_entrenamiento) -> bool:
    """`foco_entrenamiento` es un ArrayField de `DailyCheckin`, compartido por
    todas las disciplinas — el check-in de descanso no es un concepto de
    running."""
    return any('descanso' in _norm(f) for f in (foco_entrenamiento or []))


def compute_readiness(*, carga: dict | None, checkin, pain_keywords) -> dict:
    """Señales objetivas (ACWR) + subjetivas (check-in) → score 0-100 y flags.

    `carga` = salida de `athlete_carga()`, o None si aún no hay carga.
    `checkin` = objeto tipo `DailyCheckin`, o None (día sin check-in — el
    score arranca en 70 sin ajustes subjetivos, pero SIGUE reaccionando a
    ACWR/dolor si hubiera datos objetivos)."""
    suficiente = bool(carga and carga.get('suficiente'))
    zona = carga.get('zona') if carga else 'Acumulando datos'
    riesgo_alto = bool(carga and (carga.get('riesgo_alerta') or zona in ZONAS_ALTAS))
    infracarga = bool(suficiente and zona == 'Infracarga')

    score = 70
    flags: list[str] = []
    has_checkin = checkin is not None
    animo = None
    sueno_bad = False
    hrv_low = False

    if has_checkin:
        animo = checkin.estado_animo
        score += {5: 10, 4: 5, 3: 0, 2: -10, 1: -20}.get(animo, 0)
        cs = float(checkin.calidad_sueno or 7)
        if cs <= 4:                               # escala de dispositivo (1–4)
            score += {1: -15, 2: -5}.get(int(cs), 5)
            sueno_bad = cs <= 2
        else:                                     # horas (check-in manual)
            if cs < 6:
                score -= 15
                sueno_bad = True
            elif cs < 7:
                score -= 5
            else:
                score += 5
        hrv = checkin.hrv
        if hrv and hrv < 45:
            hrv_low = True
            score -= 10
        elif hrv and hrv > 80:
            score += 5

    if suficiente:
        if riesgo_alto:
            score -= 20
            flags.append('acwr_alto')
        elif zona in ('Precaución',):
            score -= 8
            flags.append('acwr_precaucion')
        elif infracarga:
            flags.append('infracarga')

    dolor_texto = getattr(checkin, 'dolor_hoy', '') if checkin else ''
    dolor = detectar_dolor(dolor_texto, pain_keywords)
    if dolor:
        score -= 15
        flags.append(f'dolor:{dolor}')

    foco = getattr(checkin, 'foco_entrenamiento', None) if checkin else None

    return {
        'score': max(0, min(100, score)),
        'suficiente': suficiente,
        'zona_acwr': zona,
        'acwr_ewma': (carga.get('acwr_ewma') if carga else None),
        'riesgo_alto': riesgo_alto,
        'infracarga': infracarga,
        'has_checkin': has_checkin,
        'animo': animo,
        'sueno_bad': sueno_bad,
        'hrv_low': hrv_low,
        'dolor': dolor,
        'rest_checkin': es_checkin_de_descanso(foco),
        'flags': flags,
    }


def adapt_today(*, tipo_sesion: str, es_calidad: bool, zona_principal: str,
                rpe_by_zone: dict, signals: dict) -> dict:
    """Tabla de re-adaptación (primera regla que dispara, gana). Decide el
    tipo de sesión final del día a partir de las señales de `compute_readiness`.

    `rpe_by_zone` = RPE nominal por zona del deporte que llama (running:
    Z1-Z5; ciclismo tendrá el suyo) — solo se usa para el cap de RPE en la
    regla de ánimo bajo.

    Devuelve {tipo_sesion, estado, ajuste_aplicado, rpe_cap, factor}. `factor`
    es el multiplicador de VOLUMEN de la sesión/semana en la unidad del
    deporte que llama (km en running, horas en ciclismo) — cada motor de
    deporte lo renombra a su propio vocabulario al envolver esta función (ver
    `RunningAdaptiveEngineService.adapt_today`, que lo expone como
    `km_factor` para no romper su contrato ya testeado)."""
    out = {'tipo_sesion': tipo_sesion, 'estado': 'planificada',
           'ajuste_aplicado': 'confirmada', 'rpe_cap': None, 'factor': 1.0}

    def adj(t, ajuste, rpe_cap=None, factor=1.0):
        out.update({'tipo_sesion': t, 'estado': 'ajustada',
                    'ajuste_aplicado': ajuste, 'rpe_cap': rpe_cap, 'factor': factor})

    # 1) Dolor en zona de carga.
    if signals['dolor']:
        if es_calidad:
            adj('easy', 'dolor_a_easy', rpe_cap=5, factor=0.7)
        else:
            adj('rest', 'dolor_a_descanso')
        return out
    # 2) Check-in de descanso explícito.
    if signals['rest_checkin']:
        adj('rest', 'checkin_descanso')
        return out
    # 3) ACWR alto (solo con ventana suficiente).
    if signals['suficiente'] and signals['riesgo_alto']:
        if es_calidad:
            adj('easy', 'acwr_alto_degradado', rpe_cap=6, factor=0.75)
        else:
            out.update({'estado': 'ajustada', 'ajuste_aplicado': 'acwr_alto_recorta',
                        'factor': 0.8})
        return out
    # 4) Día sin check-in → neutro (no intensificar).
    if not signals['has_checkin']:
        out['ajuste_aplicado'] = 'sin_checkin_neutro'
        return out
    # 5) Readiness baja (HRV/sueño/score).
    if signals['hrv_low'] or signals['sueno_bad'] or signals['score'] < 45:
        if es_calidad:
            adj('easy', 'readiness_baja_suaviza', rpe_cap=6, factor=0.85)
        else:
            out.update({'estado': 'ajustada', 'ajuste_aplicado': 'readiness_baja_recorta',
                        'factor': 0.85})
        return out
    # 6) Ánimo bajo.
    if signals['animo'] is not None and signals['animo'] <= 2:
        out.update({'estado': 'ajustada', 'ajuste_aplicado': 'animo_bajo_suaviza',
                    'factor': 0.85,
                    'rpe_cap': max(4, rpe_by_zone.get(zona_principal, 6) - 1)})
        return out
    # 7) Infracarga con readiness alta → permitir leve progresión.
    if signals['infracarga'] and signals['score'] >= 70:
        out.update({'ajuste_aplicado': 'infracarga_ok', 'factor': 1.05})
        return out
    # 8) Todo verde → confirmar.
    return out
