"""Lógica de la racha de estudio de Zyfit Academy — capa de servicio.

Toda la mecánica de la racha vive aquí (igual que `academy.grading` concentra el
scoring y `workouts.training_cycle` la periodización): las vistas y el job diario
solo llaman a estas funciones. Son funciones de módulo (no clases), toman modelos
y una fecha `hoy` explícita —para poder testear días concretos y zonas horarias—
y devuelven estado serializable.

Reglas de negocio (confirmadas con producto):

  • Actividad de estudio válida = completar una lección/módulo o rendir un quiz en
    CUALQUIER curso de las tres escuelas. La racha es POR USUARIO, transversal a
    todos los cursos. Abrir la app o navegar el catálogo NO cuenta.

  • "Día" = día LOCAL del alumno. El proyecto no guarda zona horaria por usuario:
    el día lo aporta el cliente vía el header `X-Local-Date` (helper _get_local_date
    en las vistas, mismo mecanismo que workouts). El servidor cae a UTC si no llega.

  • Freeze: se gana 1 freeze automático cada DIAS_POR_FREEZE (5) días consecutivos
    de racha, hasta un tope de MAX_FREEZES (3) acumulables. Un freeze se consume
    automáticamente cuando el alumno se salta UN día, rellenando el hueco para que
    la racha no se rompa. Su uso NUNCA es silencioso (se notifica / se refleja en el
    estado que lee la web).

  • Ruptura: si pasan 2 días consecutivos sin actividad y sin freeze disponible, la
    racha se rompe y vuelve a 0. La racha rota no se borra: se archiva (mejor_racha,
    total_rachas_rotas) y queda "en riesgo" para poder recuperarla.

  • Recuperación (ventana VENTANA_RECUPERACION_H = 48 h post-ruptura): si el alumno
    vuelve a estudiar dentro de la ventana, la racha revive (efecto colateral de la
    acción real de estudio; no hay endpoint manual de "recuperar").

Este módulo se mantiene DESACOPLADO del streak de entrenamiento (users.Profile):
el futuro "doble streak" los combinará en la presentación sin fusionar el modelo.
"""

from datetime import date, timedelta

from django.utils import timezone

from .models import AcademyActivityDay, AcademyStreak


# ─── Parámetros de la mecánica (fuente única) ─────────────────────────────────

DIAS_POR_FREEZE = 5          # se gana 1 freeze cada 5 días consecutivos de racha
MAX_FREEZES = 3              # tope de freezes acumulables simultáneamente
PUNTOS_POR_DIA = 10          # puntos por cada día de estudio (paridad con workouts)
VENTANA_RECUPERACION_H = 48  # ventana post-ruptura para revivir la racha (horas)


# Hitos que disparan una notificación al CRUZARLOS (solo al crecer), mismo patrón
# que workouts._RACHA_HITOS. (emoji, título, cuerpo).
_ACADEMY_HITOS = {
    3:  ('🔥', '¡3 días estudiando!',       'Tres días seguidos de estudio. ¡Sigue así!'),
    7:  ('💎', '¡Una semana de estudio!',    '7 días seguidos aprendiendo. Excepcional.'),
    14: ('⚡', '¡Dos semanas seguidas!',     'Llevas 14 días de racha de estudio. Ya es hábito.'),
    30: ('👑', '¡Un mes completo!',          '30 días consecutivos de estudio. Eres una leyenda.'),
}

# Logros de estudio (paralelo a users._check_logros; sobre esta racha, no la de
# entrenamiento). `min_dias` mira el total de días de estudio; `min_racha` la mejor
# racha alcanzada.
_ACADEMY_LOGROS_DEF = [
    {'id': 'primer_dia', 'label': 'Primer día de estudio', 'icon': '🎯', 'min_dias': 1},
    {'id': 'racha_3',    'label': 'Racha de 3',            'icon': '🔥', 'min_racha': 3},
    {'id': 'racha_7',    'label': 'Semana de estudio',     'icon': '💎', 'min_racha': 7},
    {'id': 'dias_10',    'label': '10 días de estudio',    'icon': '⚡', 'min_dias': 10},
    {'id': 'dias_30',    'label': '30 días de estudio',    'icon': '🏆', 'min_dias': 30},
    {'id': 'racha_30',   'label': 'Mes perfecto',          'icon': '👑', 'min_racha': 30},
]


# ─── Helpers internos ─────────────────────────────────────────────────────────

def _cobertura(streak):
    """Última fecha "cubierta" por la racha = max(actividad, freeze)."""
    fechas = [f for f in (streak.ultima_actividad, streak.congelado_hasta) if f]
    return max(fechas) if fechas else None


def _push(user, title, body, data=None):
    """Envía un push best-effort reutilizando la infra existente (users.push).

    Nunca lanza: si el usuario no tiene token (típico en alumnos solo-web) devuelve
    False y el estado sigue comunicándose por la UI. Aísla el import para no acoplar
    Academy a users en el arranque."""
    try:
        from users.push import send_push
        return send_push(user, title=title, body=body, data=data)
    except Exception:
        return False


def _maybe_grant_freeze(streak, racha_anterior):
    """Otorga freezes por cruzar múltiplos de DIAS_POR_FREEZE, con tope MAX_FREEZES.
    Devuelve cuántos se otorgaron (para notificar)."""
    ganados = streak.racha_actual // DIAS_POR_FREEZE - racha_anterior // DIAS_POR_FREEZE
    if ganados <= 0 or streak.freezes_disponibles >= MAX_FREEZES:
        return 0
    nuevos = min(ganados, MAX_FREEZES - streak.freezes_disponibles)
    streak.freezes_disponibles += nuevos
    return nuevos


def _recompute_logros(streak):
    """Recalcula la lista de logros desbloqueados (idempotente). Devuelve los ids
    recién desbloqueados en esta llamada."""
    total_dias = AcademyActivityDay.objects.filter(user=streak.user).count()
    referencia_racha = max(streak.racha_actual, streak.mejor_racha)
    ya = {l.get('id') for l in (streak.logros or [])}
    nuevos = []
    logros = list(streak.logros or [])
    for d in _ACADEMY_LOGROS_DEF:
        if d['id'] in ya:
            continue
        ok = total_dias >= d.get('min_dias', 10 ** 9) or referencia_racha >= d.get('min_racha', 10 ** 9)
        if ok:
            logros.append({'id': d['id'], 'label': d['label'], 'icon': d['icon']})
            nuevos.append(d['id'])
    streak.logros = logros
    return nuevos


def _notify_hito(user, racha, racha_anterior):
    """Push al cruzar un hito de racha (solo al crecer, como en workouts)."""
    if racha in _ACADEMY_HITOS and racha > racha_anterior:
        icono, titulo, cuerpo = _ACADEMY_HITOS[racha]
        _push(user, titulo, cuerpo, data={'tipo': 'academy_streak_hito', 'dias': racha})


# ─── API pública del servicio ─────────────────────────────────────────────────

def record_study_activity(user, hoy=None, origen='', ahora=None):
    """Registra actividad de estudio del `user` en su día LOCAL `hoy` y actualiza
    la racha. Idempotente por día. Es el ÚNICO camino de escritura desde la acción
    real de aprendizaje (se llama desde lesson_complete / quiz_attempt) — no hay un
    endpoint manual de "marcar actividad".

    Devuelve el AcademyStreak actualizado.
    """
    if hoy is None:
        hoy = date.today()
    if ahora is None:
        ahora = timezone.now()

    streak, _ = AcademyStreak.objects.get_or_create(user=user)
    _day, creado = AcademyActivityDay.objects.get_or_create(
        user=user, fecha=hoy, defaults={'origen': origen or ''},
    )
    if not creado:
        # Ya hubo actividad hoy: la racha no cambia (idempotente por día).
        return streak

    racha_anterior = streak.racha_actual
    riesgo_anterior = streak.racha_en_riesgo
    cover = _cobertura(streak)
    en_recuperacion = (
        streak.racha_en_riesgo > 0
        and streak.recuperable_hasta is not None
        and ahora <= streak.recuperable_hasta
    )
    recuperada = False

    if streak.ultima_actividad is None:
        # Primera actividad de la vida (o tras un reset total sin racha en riesgo).
        streak.racha_actual = streak.racha_en_riesgo + 1 if en_recuperacion else 1
        recuperada = en_recuperacion
    elif en_recuperacion:
        # Vuelve dentro de la ventana → revive la racha perdida + el día de hoy.
        streak.racha_actual = streak.racha_en_riesgo + 1
        recuperada = True
    else:
        gap = (hoy - cover).days if cover else None
        if gap is None or gap <= 0:
            # Día ya cubierto (duplicado o actividad en un día congelado): asegura 1.
            streak.racha_actual = max(streak.racha_actual, 1)
        elif gap <= 2:
            # Consecutivo (gap 1) o con un único día de gracia perdido (gap 2):
            # la racha continúa (romper exige 2 días seguidos sin actividad).
            streak.racha_actual += 1
        else:
            # gap >= 3: la racha ya estaba rota (el job no corrió o volvió tardísimo).
            if streak.racha_actual:
                streak.total_rachas_rotas += 1
            streak.racha_actual = 1

    # Volver a estar activo limpia el estado de riesgo/congelado: la cobertura
    # ahora es la actividad de hoy.
    streak.racha_en_riesgo = 0
    streak.recuperable_hasta = None
    streak.congelado_hasta = None
    streak.ultima_actividad = hoy
    if streak.racha_actual > streak.mejor_racha:
        streak.mejor_racha = streak.racha_actual

    # Baseline para otorgar freezes: en una recuperación, la racha ya tenía sus
    # freezes concedidos hasta `riesgo_anterior`, así que solo cuenta el nuevo día.
    base_freeze = riesgo_anterior if recuperada else racha_anterior
    freezes_ganados = _maybe_grant_freeze(streak, base_freeze)
    streak.puntos_totales = AcademyActivityDay.objects.filter(user=user).count() * PUNTOS_POR_DIA
    _recompute_logros(streak)
    streak.save()

    # Notificaciones (best-effort; el estado también se refleja en la web).
    if recuperada:
        _push(user, '¡Racha recuperada! 🔥',
              f'Volviste a tiempo: tu racha de {streak.racha_actual} días sigue viva.',
              data={'tipo': 'academy_streak_recuperada', 'dias': streak.racha_actual})
    else:
        _notify_hito(user, streak.racha_actual, racha_anterior)
    if freezes_ganados:
        _push(user, '❄️ Ganaste un freeze de racha',
              'Guardamos un escudo: si te saltas un día, tu racha no se rompe.',
              data={'tipo': 'academy_streak_freeze_ganado',
                    'freezes': streak.freezes_disponibles})
    return streak


def run_daily_maintenance(hoy=None, ahora=None):
    """Barrido diario: para cada usuario con racha activa que no tuvo actividad,
    consume un freeze (si tiene) o rompe la racha si acumula 2 días sin actividad.

    Lo ejecuta el management command `academy_streak_sweep` (job diario). Se apoya
    en la fecha del servidor (UTC): como romper exige 2 días consecutivos, el margen
    absorbe el desfase de zona horaria del alumno. Devuelve un resumen contable.
    """
    if hoy is None:
        hoy = date.today()
    if ahora is None:
        ahora = timezone.now()

    resumen = {'evaluados': 0, 'freezes_consumidos': 0, 'rotas': 0, 'sanas': 0}

    qs = AcademyStreak.objects.filter(racha_actual__gt=0).select_related('user')
    for streak in qs:
        resumen['evaluados'] += 1
        cover = _cobertura(streak)
        if cover is None:
            continue
        gap = (hoy - cover).days

        if gap <= 1:
            # Activo hoy o ayer (o cubierto hasta ayer): racha sana.
            resumen['sanas'] += 1
            continue

        if gap == 2:
            # Exactamente un día (ayer) sin cubrir.
            ayer = hoy - timedelta(days=1)
            if streak.freezes_disponibles > 0:
                streak.freezes_disponibles -= 1
                streak.freezes_usados += 1
                streak.congelado_hasta = ayer  # la cobertura avanza a ayer
                streak.save(update_fields=[
                    'freezes_disponibles', 'freezes_usados', 'congelado_hasta', 'updated_at',
                ])
                resumen['freezes_consumidos'] += 1
                _push(streak.user, '❄️ Usamos un freeze por ti',
                      f'No estudiaste ayer, así que gastamos un freeze: tu racha de '
                      f'{streak.racha_actual} días sigue viva.',
                      data={'tipo': 'academy_streak_freeze_usado',
                            'dias': streak.racha_actual,
                            'freezes': streak.freezes_disponibles})
            else:
                # Sin freeze: primer día perdido (gracia). Aún no se rompe; avisamos.
                resumen['sanas'] += 1
                _push(streak.user, 'Tu racha está en riesgo 🔥',
                      f'No estudiaste ayer. Completa una lección hoy para conservar '
                      f'tu racha de {streak.racha_actual} días.',
                      data={'tipo': 'academy_streak_en_riesgo',
                            'dias': streak.racha_actual})
            continue

        # gap >= 3: 2+ días consecutivos sin actividad y sin freeze → ROMPER.
        _romper_racha(streak, ahora)
        resumen['rotas'] += 1

    return resumen


def _romper_racha(streak, ahora):
    """Rompe la racha a 0 archivándola y abriendo la ventana de recuperación."""
    perdida = streak.racha_actual
    streak.racha_en_riesgo = perdida
    streak.recuperable_hasta = ahora + timedelta(hours=VENTANA_RECUPERACION_H)
    streak.racha_actual = 0
    streak.congelado_hasta = None
    streak.total_rachas_rotas += 1
    streak.save(update_fields=[
        'racha_en_riesgo', 'recuperable_hasta', 'racha_actual',
        'congelado_hasta', 'total_rachas_rotas', 'updated_at',
    ])
    _push(streak.user, 'Tu racha se rompió 💔',
          f'Se pausó tu racha de {perdida} días. Aún puedes revivirla: completa una '
          f'lección en las próximas {VENTANA_RECUPERACION_H} h.',
          data={'tipo': 'academy_streak_rota', 'dias': perdida})


def streak_state(streak, hoy=None, ahora=None):
    """Estado enriquecido de la racha para la API/UI (calculado en tiempo real).

    Devuelve un dict listo para serializar: incluye el estado ('activa',
    'en_riesgo', 'congelada', 'recuperable', 'sin_iniciar'), una alerta motivacional
    (tono de marca, no punitivo), el progreso hacia el próximo freeze y la ventana
    de recuperación si aplica."""
    if hoy is None:
        hoy = date.today()
    if ahora is None:
        ahora = timezone.now()

    entrenado_hoy = AcademyActivityDay.objects.filter(user=streak.user, fecha=hoy).exists()
    cover = _cobertura(streak)
    gap = (hoy - cover).days if cover else None
    en_recuperacion = (
        streak.racha_en_riesgo > 0
        and streak.recuperable_hasta is not None
        and ahora <= streak.recuperable_hasta
    )

    if en_recuperacion:
        estado = 'recuperable'
    elif streak.racha_actual == 0:
        estado = 'sin_iniciar'
    elif entrenado_hoy:
        estado = 'activa'
    elif gap is not None and gap >= 2:
        estado = 'en_riesgo'
    elif streak.congelado_hasta and streak.congelado_hasta >= hoy - timedelta(days=1):
        estado = 'congelada'
    else:
        estado = 'activa'  # cubierto hasta ayer; hoy aún está por hacer

    # Días hasta el próximo freeze (None si ya está al tope).
    if streak.freezes_disponibles >= MAX_FREEZES or streak.racha_actual == 0:
        proximo_freeze_en = None
    else:
        resto = streak.racha_actual % DIAS_POR_FREEZE
        proximo_freeze_en = DIAS_POR_FREEZE - resto if resto else DIAS_POR_FREEZE

    recuperacion = None
    if en_recuperacion:
        horas = max(0, int((streak.recuperable_hasta - ahora).total_seconds() // 3600))
        recuperacion = {'racha_en_riesgo': streak.racha_en_riesgo, 'horas_restantes': horas}

    return {
        'racha_actual': streak.racha_actual,
        'mejor_racha': streak.mejor_racha,
        'ultima_actividad': streak.ultima_actividad.isoformat() if streak.ultima_actividad else None,
        'estudiado_hoy': entrenado_hoy,
        'estado': estado,
        'en_riesgo': estado == 'en_riesgo',
        'freezes_disponibles': streak.freezes_disponibles,
        'freezes_usados': streak.freezes_usados,
        'congelada': estado == 'congelada',
        'proximo_freeze_en': proximo_freeze_en,
        'freezes_max': MAX_FREEZES,
        'dias_por_freeze': DIAS_POR_FREEZE,
        'recuperacion': recuperacion,
        'total_dias_activos': AcademyActivityDay.objects.filter(user=streak.user).count(),
        'total_rachas_rotas': streak.total_rachas_rotas,
        'puntos_totales': streak.puntos_totales,
        'logros': streak.logros or [],
        'alerta': _alerta(estado, streak, entrenado_hoy),
    }


def _alerta(estado, streak, entrenado_hoy):
    """Mensaje motivacional según el estado. Tono de marca, no punitivo. `color`
    mapea a los tonos del <Badge/> de la web (brand/accent/ok/warn/neutral)."""
    racha = streak.racha_actual
    if estado == 'recuperable':
        return {'tipo': 'recuperar',
                'mensaje': f'Tu racha de {streak.racha_en_riesgo} días te espera — '
                           'completa una lección para recuperarla',
                'color': 'accent'}
    if estado == 'en_riesgo':
        return {'tipo': 'en_riesgo',
                'mensaje': 'Tu racha está en pausa — una lección hoy la mantiene viva',
                'color': 'warn'}
    if estado == 'congelada':
        return {'tipo': 'congelada',
                'mensaje': f'Usamos un freeze para proteger tu racha de {racha} días',
                'color': 'neutral'}
    if estado == 'activa' and entrenado_hoy and racha >= 3:
        return {'tipo': 'felicitacion',
                'mensaje': f'{racha} días de racha — vas increíble',
                'color': 'ok'}
    if estado == 'activa' and not entrenado_hoy and racha >= 2:
        return {'tipo': 'continuar',
                'mensaje': f'{racha} días seguidos — suma hoy para no perder el ritmo',
                'color': 'brand'}
    return None


def get_or_create_state(user, hoy=None, ahora=None):
    """Atajo para las vistas: asegura el AcademyStreak del usuario y devuelve su
    estado enriquecido."""
    streak, _ = AcademyStreak.objects.get_or_create(user=user)
    return streak_state(streak, hoy=hoy, ahora=ahora)
