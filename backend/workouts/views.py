import calendar as _cal
from collections import Counter, defaultdict
from datetime import date, timedelta
from decimal import Decimal
from django.db import transaction
from django.db.models import Avg, Count, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Session, SessionFeedback, Competition, Exercise, UserExerciseProfile, UserAdaptationProfile, DailyCoachInsight, DailySaludo, TrainingDNA, CalendarEvent, TrainingCycle


def _get_local_date(request) -> date:
    """
    Devuelve la fecha local del dispositivo cliente (header X-Local-Date).
    Fallback a date.today() (UTC) si el header no está presente o es inválido.

    Necesario porque date.today() en el servidor usa UTC, lo que puede
    diferir del día local del usuario en zonas horarias UTC- cuando entrena
    en la noche (ej: 10 PM martes local = 3 AM miércoles UTC).
    """
    header = request.headers.get('X-Local-Date', '').strip()
    if header:
        try:
            return date.fromisoformat(header)
        except ValueError:
            pass
    return date.today()
from .serializers import SessionDetailSerializer, SessionListSerializer, SessionFeedbackSerializer, CompetitionSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_list(request):
    # HIS-2: prefetch de exercises para exponer el peso real (series_log) por
    # ejercicio en el listado/historial sin disparar N+1.
    sessions = request.user.sessions.select_related('feedback', 'checkin').prefetch_related('exercises').all()
    # Filtro opcional por fecha: el dashboard solo necesita una ventana reciente
    # para el calendario (acota el payload). El historial los pide todos sin param.
    desde = request.query_params.get('desde')
    if desde:
        try:
            sessions = sessions.filter(fecha__gte=date.fromisoformat(desde))
        except ValueError:
            pass
    return Response(SessionListSerializer(sessions, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_detail(request, pk):
    try:
        session = request.user.sessions.select_related('feedback').prefetch_related('exercises').get(pk=pk)
    except Session.DoesNotExist:
        return Response({'error': 'Sesión no encontrada'}, status=status.HTTP_404_NOT_FOUND)
    return Response(SessionDetailSerializer(session).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_today(request):
    """Sesión de hoy en la forma { sesion_id, sesion } que consume la pantalla de
    generación.

    Sirve de respaldo cuando POST /api/sessions/generate/ supera el timeout de la
    pasarela (504) PERO el backend sí terminó de crear la sesión: el cliente hace
    polling de este endpoint hasta que la rutina esté lista. Devuelve la sesión
    más reciente del día; el cliente la distingue de una previa por su id.
    """
    hoy = _get_local_date(request)
    s = request.user.sessions.filter(fecha=hoy).order_by('-created_at').first()
    ia = s.respuesta_ia if s else None
    if not s or not isinstance(ia, dict) or 'fases' not in ia:
        return Response({'status': 'pending'})
    return Response({'status': 'ready', 'sesion_id': s.id, 'sesion': ia})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_assigned_today(request):
    """Sesión que el coach preparó para HOY (origen='coach') y que el atleta aún
    no completó. El flujo ENTRENAR la usa para ir directo a ejecutarla en vez de
    generar con IA (los días sin sesión del coach siguen el flujo de IA normal).
    Devuelve {sesion_id, titulo} o {sesion_id: null}. Las sesiones en BORRADOR no
    existen como Session, así que nunca aparecen aquí."""
    hoy = _get_local_date(request)
    s = (request.user.sessions
         .filter(fecha=hoy, origen=Session.ORIGEN_COACH)
         .select_related('feedback')
         .order_by('-created_at').first())
    if not s or getattr(s, 'feedback', None) is not None:
        return Response({'sesion_id': None})
    titulo = s.respuesta_ia.get('titulo') if isinstance(s.respuesta_ia, dict) else None
    return Response({'sesion_id': s.id, 'titulo': titulo or 'Sesión de tu coach'})


def _cumplimiento_real(session):
    """Cumplimiento real desde series_log: series ejecutadas (con peso o reps) vs
    prescritas. Devuelve None si no hay datos de ejecución (p. ej. 'marcar completada
    sin ejecutar'), para que el caller use el valor derivado de la sensación."""
    exercises = list(session.exercises.all())
    prescritas = sum((e.series or 0) for e in exercises)
    if prescritas <= 0:
        return None
    hechas = 0
    tiene_log = False
    for e in exercises:
        log = e.series_log or []
        if log:
            tiene_log = True
        hechas += sum(1 for s in log if isinstance(s, dict) and (s.get('peso') or s.get('reps')))
    if not tiene_log:
        return None
    return max(0, min(100, round(hechas / prescritas * 100)))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_feedback(request, pk):
    try:
        session = request.user.sessions.get(pk=pk)
    except Session.DoesNotExist:
        return Response({'error': 'Sesión no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    # FBK-3: feedback editable — si ya existe, se actualiza en vez de rechazar
    # (útil cuando se entra al feedback desde una salida parcial).
    existing = getattr(session, 'feedback', None)
    serializer = (
        SessionFeedbackSerializer(existing, data=request.data)
        if existing else SessionFeedbackSerializer(data=request.data)
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    feedback = serializer.save(session=session)

    # FBK-2: si la sesión se ejecutó en la app, usar el cumplimiento REAL
    # (series hechas vs prescritas) en vez del derivado de la sensación.
    cumpl_real = _cumplimiento_real(session)
    if cumpl_real is not None and cumpl_real != feedback.cumplimiento:
        feedback.cumplimiento = cumpl_real
        feedback.save(update_fields=['cumplimiento'])

    try:
        with transaction.atomic():
            _actualizar_racha(request.user)
            _check_logros(request.user)
            _actualizar_adaptation_profile(request.user, session, feedback)
            _evaluate_and_advance(request.user, session, feedback)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f'[feedback] post-processing error (non-fatal): {e}')

    # Invalidar caché del insight y del saludo para regenerarlos con los nuevos datos
    _hoy = _get_local_date(request)
    DailyCoachInsight.objects.filter(user=request.user, fecha=_hoy).delete()
    DailySaludo.objects.filter(user=request.user, fecha=_hoy).delete()

    return Response(
        SessionFeedbackSerializer(feedback).data,
        status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_iniciar(request, pk):
    try:
        session = request.user.sessions.get(pk=pk)
    except Session.DoesNotExist:
        return Response({'error': 'Sesión no encontrada'}, status=status.HTTP_404_NOT_FOUND)
    from django.utils import timezone
    session.inicio_real = timezone.now()
    session.save(update_fields=['inicio_real'])
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_resumen(request, pk):
    try:
        session = request.user.sessions.get(pk=pk)
    except Session.DoesNotExist:
        return Response({'error': 'Sesión no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    # Return cached if already generated
    if session.decisiones is not None and session.evidencia is not None:
        return Response({'decisiones': session.decisiones, 'evidencia': session.evidencia})

    if not session.respuesta_ia:
        return Response({'decisiones': [], 'evidencia': None})

    respuesta = session.respuesta_ia
    titulo = respuesta.get('titulo', 'Sesión de entrenamiento')
    objetivo = respuesta.get('objetivo_sesion', '')
    nota = respuesta.get('nota_del_entrenador', '')
    rpe_target = float(session.rpe_target)
    duracion = session.duracion_planificada

    ejercicios_list = []
    for fase in respuesta.get('fases', []):
        for ej in fase.get('ejercicios', []):
            nombre = ej.get('nombre', '').strip()
            if nombre:
                ejercicios_list.append(nombre)

    try:
        profile = request.user.profile
        nivel = profile.nivel or ''
        objetivo_usuario = profile.objetivo or ''
        lesiones = profile.lesiones or ''
    except Exception:
        nivel = objetivo_usuario = lesiones = ''

    ctx_parts = [f'Título: {titulo}']
    if objetivo:
        ctx_parts.append(f'Objetivo de la sesión: {objetivo}')
    ctx_parts.append(f'RPE objetivo: {rpe_target}')
    ctx_parts.append(f'Duración: {duracion} min')
    if nivel:
        ctx_parts.append(f'Nivel del atleta: {nivel}')
    if objetivo_usuario:
        ctx_parts.append(f'Objetivo del atleta: {objetivo_usuario}')
    if lesiones:
        ctx_parts.append(f'Lesiones/restricciones: {lesiones}')
    if ejercicios_list:
        ctx_parts.append(f'Ejercicios: {", ".join(ejercicios_list[:8])}')
    if nota:
        ctx_parts.append(f'Nota del entrenador: {nota}')

    contexto = '\n'.join(f'- {l}' for l in ctx_parts)

    prompt = f"""Eres el entrenador IA de una app de fitness. Analiza esta sesión y explica al atleta por qué fue diseñada de esta manera.

Sesión:
{contexto}

Responde ÚNICAMENTE con este JSON válido (sin markdown):
{{
  "decisiones": [
    {{"icon": "emoji", "text": "decisión 1 — por qué se tomó esta decisión de diseño"}},
    {{"icon": "emoji", "text": "decisión 2 — otra decisión clave de la sesión"}}
  ],
  "evidencia": {{
    "text": "cita de investigación científica relevante en español",
    "reference": "Apellido et al., año"
  }}
}}

Reglas:
- decisiones: exactamente 2 o 3 items. Cada uno explica UNA decisión de diseño específica de esta sesión con datos concretos.
- Emojis sugeridos: 🎯 objetivos, ⚡ intensidad, 💪 volumen, 😴 recuperación, 🔄 variación, 🏋️ ejercicios, ❤️ cardio, 🧘 movilidad, 📊 progresión, 🌡️ carga.
- Cada text: máxima 1 oración directa en español. Menciona datos concretos de la sesión.
- evidencia: cita real de la literatura (Schoenfeld, Zourdos, Helms, NSCA, ACSM, etc.) relacionada con el tipo de entrenamiento. En español."""

    try:
        import groq as _groq, json as _json
        from django.conf import settings as _settings
        client = _groq.Groq(api_key=_settings.GROQ_API_KEY)
        resp = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=400,
            temperature=0.6,
        )
        raw = resp.choices[0].message.content.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        data = _json.loads(raw.strip())
        decisiones = data.get('decisiones', [])
        evidencia = data.get('evidencia', None)
        session.decisiones = decisiones
        session.evidencia = evidencia
        session.save(update_fields=['decisiones', 'evidencia'])
        return Response({'decisiones': decisiones, 'evidencia': evidencia})
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f'session_resumen error session {pk}: {e}', exc_info=True)
        return Response({'decisiones': [], 'evidencia': None})


def _calcular_racha_realtime(user, hoy=None):
    """
    Calcula la racha de días consecutivos en tiempo real (sin leer del perfil).
    Un día cuenta como entrenado si tiene cualquier sesión (misma definición que
    el calendario / volumen / Zyfit Score). Si hoy no tiene sesión, retrocede un día.
    Retorna el entero de días consecutivos.
    """
    if hoy is None:
        hoy = date.today()
    # Días con cualquier sesión en los últimos 365 días
    fecha_min = hoy - timedelta(days=365)
    dates_with_session = set(
        Session.objects.filter(
            user=user,
            fecha__gte=fecha_min,
            fecha__lte=hoy,
        ).values_list('fecha', flat=True)
    )
    if not dates_with_session:
        return 0
    # Start from today; if today has no session, start from yesterday
    dia = hoy if hoy in dates_with_session else hoy - timedelta(days=1)
    racha = 0
    while dia in dates_with_session:
        racha += 1
        dia -= timedelta(days=1)
    return racha


def _calcular_racha_contexto(user, hoy=None):
    """
    Calcula la racha en tiempo real y devuelve un objeto de contexto
    con la alerta/recomendación adecuada según el estado actual del usuario.

    Lógica:
    - racha >= 4 + entrenó hoy       → sugerir descanso mañana
    - racha >= 4 + entrenó ayer      → hoy ya está descansando, reforzar
    - racha >= 4 + hace 2+ días      → racha interrumpida, motivar retomar
    - racha 2-3 + entrenó hoy        → motivar continuar
    - resto                          → sin alerta
    """
    if hoy is None:
        hoy = date.today()

    # Single bulk query shared by all derived metrics — avoids 3 extra queries.
    # Un día entrenado = cualquier sesión (consistente con el calendario / Zyfit Score).
    fecha_min = hoy - timedelta(days=365)
    lunes = hoy - timedelta(days=hoy.weekday())
    dates_with_session = set(
        Session.objects.filter(
            user=user,
            fecha__gte=fecha_min,
            fecha__lte=hoy,
        ).values_list('fecha', flat=True)
    )

    # Racha (derived from set — no extra query)
    dia = hoy if hoy in dates_with_session else hoy - timedelta(days=1)
    racha = 0
    while dia in dates_with_session:
        racha += 1
        dia -= timedelta(days=1)

    # Derived metrics — all from the set, no DB hits
    entrenado_hoy = hoy in dates_with_session
    fechas_ordenadas = sorted(dates_with_session, reverse=True)
    ultima_fecha = fechas_ordenadas[0] if fechas_ordenadas else None
    dias_desde_ultima = (hoy - ultima_fecha).days if ultima_fecha else None

    sesiones_semana_fechas = {f for f in dates_with_session if f >= lunes}
    dias_entrenados_semana = len(sesiones_semana_fechas)
    dias_descanso_semana = (hoy.weekday() + 1) - dias_entrenados_semana

    # ── Determinar alerta ─────────────────────────────────────────────────────
    alerta = None

    if racha >= 4:
        if dias_desde_ultima == 0:
            # Entrenó hoy y lleva 4+ días seguidos
            alerta = {
                'tipo': 'descanso_manana',
                'mensaje': f'{racha} días seguidos · Programa descanso activo mañana',
                'color': 'orange',
            }
        elif dias_desde_ultima == 1:
            # Última sesión fue ayer, hoy ya está descansando
            alerta = {
                'tipo': 'descansando',
                'mensaje': f'Llevas {racha} días de racha · Hoy es un buen día de recuperación',
                'color': 'blue',
            }
        elif dias_desde_ultima is not None and dias_desde_ultima >= 2:
            # Ya descansó 2+ días desde la racha — motivar a retomar
            alerta = {
                'tipo': 'retomar',
                'mensaje': f'Tuviste {racha} días de racha · Hora de retomar el ritmo',
                'color': 'green',
            }
    elif racha >= 2 and entrenado_hoy:
        # Racha moderada activa hoy — motivar a continuar
        alerta = {
            'tipo': 'continuar',
            'mensaje': f'{racha} días seguidos · Vas construyendo el hábito',
            'color': 'blue',
        }

    return {
        'racha_actual': racha,
        'dias_desde_ultima': dias_desde_ultima,
        'entrenado_hoy': entrenado_hoy,
        'dias_entrenados_semana': dias_entrenados_semana,
        'dias_descanso_semana': dias_descanso_semana,
        'alerta': alerta,
    }


def _actualizar_racha(user):
    """
    Persiste la racha en profile.racha_actual para gamificación y logros.
    Se llama solo después de guardar un feedback.
    El dashboard NO debe leer de aquí — usa _calcular_racha_contexto() en tiempo real.
    """
    try:
        profile = user.profile
    except Exception:
        return

    racha = _calcular_racha_realtime(user)
    profile.racha_actual = racha
    if racha > profile.mejor_racha:
        profile.mejor_racha = racha
    profile.puntos_totales = user.sessions.filter(feedback__isnull=False).count() * 10
    profile.save(update_fields=['racha_actual', 'mejor_racha', 'puntos_totales'])


def _check_logros(user):
    try:
        profile = user.profile
    except Exception:
        return
    from users.views import _check_logros as check
    check(profile)


def _actualizar_adaptation_profile(user, session, feedback):
    """
    After saving feedback, update UserExerciseProfile for each exercise in the
    session and recalculate UserAdaptationProfile for the user.
    """
    try:
        # ── 1. Extract exercise names from session ──────────────────────────
        respuesta = session.respuesta_ia or {}
        fases = respuesta.get('fases', [])
        ejercicios_sesion = []
        for fase in fases:
            for ej in fase.get('ejercicios', []):
                nombre = ej.get('nombre', '').strip()
                if nombre:
                    ejercicios_sesion.append(nombre)

        # ── 2. Update UserExerciseProfile for each exercise ─────────────────
        # Pre-fetch all DB exercises and existing profiles in bulk (avoids N+1)
        db_exercises_map = {
            ex.nombre.lower(): ex
            for ex in Exercise.objects.filter(activo=True)
        }
        existing_eps = {
            ep.exercise_nombre: ep
            for ep in UserExerciseProfile.objects.filter(
                user=user, exercise_nombre__in=ejercicios_sesion
            )
        }

        def running_avg(old_val, new_val, count):
            if old_val is None:
                return Decimal(str(new_val))
            return old_val + (Decimal(str(new_val)) - old_val) / (count + 1)

        eps_to_update = []
        eps_to_create = []

        for nombre in ejercicios_sesion:
            # Match exercise by lowercase name prefix (tolerant match)
            patron = ''
            db_ex = db_exercises_map.get(nombre.lower())
            if db_ex is None:
                # Fallback: check if any key starts-with or contains the name
                for key, ex in db_exercises_map.items():
                    if nombre.lower() in key or key in nombre.lower():
                        db_ex = ex
                        break
            if db_ex:
                patron = db_ex.patron_movimiento

            ep = existing_eps.get(nombre)
            if ep is None:
                ep = UserExerciseProfile(
                    user=user,
                    exercise_nombre=nombre,
                    patron_movimiento=patron,
                )
                eps_to_create.append(ep)
            else:
                n = ep.veces_realizado
                ep.rpe_promedio_real = running_avg(ep.rpe_promedio_real, float(feedback.rpe_real), n)
                ep.rpe_promedio_target = running_avg(ep.rpe_promedio_target, float(session.rpe_target), n)
                ep.cumplimiento_promedio = running_avg(ep.cumplimiento_promedio, float(feedback.cumplimiento), n)
                ep.rating_promedio = running_avg(ep.rating_promedio, float(feedback.rating), n)
                ep.veces_realizado = n + 1
                ep.ultima_vez = session.fecha
                if not ep.patron_movimiento and patron:
                    ep.patron_movimiento = patron
                eps_to_update.append(ep)

        if eps_to_create:
            UserExerciseProfile.objects.bulk_create(eps_to_create, ignore_conflicts=True)
            # Set initial stats for newly created profiles (bulk_create skips save signals)
            for ep in eps_to_create:
                ep.rpe_promedio_real = Decimal(str(float(feedback.rpe_real)))
                ep.rpe_promedio_target = Decimal(str(float(session.rpe_target)))
                ep.cumplimiento_promedio = Decimal(str(float(feedback.cumplimiento)))
                ep.rating_promedio = Decimal(str(float(feedback.rating)))
                ep.veces_realizado = 1
                ep.ultima_vez = session.fecha
            UserExerciseProfile.objects.bulk_update(
                eps_to_create,
                ['rpe_promedio_real', 'rpe_promedio_target', 'cumplimiento_promedio',
                 'rating_promedio', 'veces_realizado', 'ultima_vez'],
            )
        if eps_to_update:
            UserExerciseProfile.objects.bulk_update(
                eps_to_update,
                ['rpe_promedio_real', 'rpe_promedio_target', 'cumplimiento_promedio',
                 'rating_promedio', 'veces_realizado', 'ultima_vez', 'patron_movimiento'],
            )

        # ── 3. Recalculate UserAdaptationProfile ────────────────────────────
        sessions_with_feedback = Session.objects.filter(
            user=user, feedback__isnull=False
        ).select_related('feedback')

        total_sesiones = sessions_with_feedback.count()

        agg = sessions_with_feedback.aggregate(
            rpe_real_avg=Avg('feedback__rpe_real'),
            rpe_target_avg=Avg('rpe_target'),
            cumplimiento_avg=Avg('feedback__cumplimiento'),
            rating_avg=Avg('feedback__rating'),
        )
        cumplimiento_promedio = round(agg['cumplimiento_avg'], 2) if agg['cumplimiento_avg'] is not None else None
        rating_promedio = round(agg['rating_avg'], 2) if agg['rating_avg'] is not None else None

        # volumen_tolerado_semana: find max sessions/week (in last 12 weeks)
        # where that week's avg cumplimiento >= 80
        hoy = date.today()
        volumen_tolerado = None
        for i in range(12):
            inicio_semana = hoy - timedelta(weeks=i + 1)
            fin_semana = hoy - timedelta(weeks=i)
            sems = sessions_with_feedback.filter(fecha__gte=inicio_semana, fecha__lt=fin_semana)
            count_week = sems.count()
            if count_week == 0:
                continue
            cum_week = sems.aggregate(avg=Avg('feedback__cumplimiento'))['avg'] or 0
            if cum_week >= 80:
                if volumen_tolerado is None or count_week > volumen_tolerado:
                    volumen_tolerado = count_week

        # patron_preferido: DB aggregate (no Python-side full scan)
        from django.db.models import Sum
        patron_row = (
            UserExerciseProfile.objects
            .filter(user=user)
            .exclude(patron_movimiento='')
            .values('patron_movimiento')
            .annotate(total=Sum('veces_realizado'))
            .order_by('-total')
            .first()
        )
        patron_preferido = patron_row['patron_movimiento'] if patron_row else ''

        # semanas_carga_consecutivas: consecutive weeks going back from current
        # where user had >= 2 sessions with feedback
        semanas_carga = 0
        for i in range(52):
            inicio_semana = hoy - timedelta(weeks=i + 1)
            fin_semana = hoy - timedelta(weeks=i)
            count_week = sessions_with_feedback.filter(
                fecha__gte=inicio_semana, fecha__lt=fin_semana
            ).count()
            if count_week >= 2:
                semanas_carga += 1
            else:
                break

        adaptation, _ = UserAdaptationProfile.objects.get_or_create(user=user)
        # FBK-5: rpe_bias con media exponencial del sesgo de ESTA sesión (fuente
        # única; antes el cálculo por dificultad de serie y este se pisaban).
        _prev_bias = float(adaptation.rpe_bias) if adaptation.rpe_bias is not None else 0.0
        _delta = float(feedback.rpe_real) - float(session.rpe_target)
        adaptation.total_sesiones = total_sesiones
        adaptation.rpe_bias = round(0.30 * _delta + 0.70 * _prev_bias, 2)
        adaptation.cumplimiento_promedio = cumplimiento_promedio
        adaptation.rating_promedio = rating_promedio
        adaptation.volumen_tolerado_semana = volumen_tolerado
        adaptation.patron_preferido = patron_preferido
        adaptation.semanas_carga_consecutivas = semanas_carga
        adaptation.save()

    except Exception as e:
        # Never let adaptation tracking crash the feedback response
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f'_actualizar_adaptation_profile error for user {user.id}: {e}', exc_info=True)


def _generar_mensaje_entrenador(user) -> dict:
    """
    Devuelve {modo, mensaje, fragmento} — nunca None, siempre hay un payload.

    Modos según sesiones completadas:
      empty    — 0 sesiones: estático, sin LLM
      first    — 1 sesión:   estático, sin LLM
      building — 2-6 ses.:  plantilla con datos reales, sin LLM
      full     — 7+ ses.:   LLM con fallback a plantilla building
    Cacheado en DailyCoachInsight (por usuario × día).
    """
    from datetime import date, timedelta
    from collections import Counter

    hoy = date.today()

    # ── Cache diario — si ya existe entry con modo, retornar
    try:
        entry = DailyCoachInsight.objects.get(user=user, fecha=hoy)
        if entry.modo:
            return entry.to_payload()
        # Entry legada (solo texto sin modo) → tratar como full
        return {'modo': 'full', 'mensaje': entry.texto, 'fragmento': ''}
    except DailyCoachInsight.DoesNotExist:
        pass

    total_sesiones = user.sessions.count()

    # ────────────────────────────────────────────────────────────────
    # MODO EMPTY — 0 sesiones, mensaje estático
    # ────────────────────────────────────────────────────────────────
    if total_sesiones == 0:
        return _cache_insight(user, hoy,
            modo='empty',
            mensaje='Realiza tu primer entrenamiento para obtener más datos.',
            fragmento='primer entrenamiento',
        )

    # ────────────────────────────────────────────────────────────────
    # MODO FIRST — exactamente 1 sesión, mensaje estático
    # ────────────────────────────────────────────────────────────────
    if total_sesiones == 1:
        return _cache_insight(user, hoy,
            modo='first',
            mensaje='Acabas de completar tu primera sesión. Tu entrenador empieza a conocerte desde hoy.',
            fragmento='primera sesión',
        )

    # ────────────────────────────────────────────────────────────────
    # MODO BUILDING — 2-6 sesiones, plantilla con datos reales (sin LLM)
    # ────────────────────────────────────────────────────────────────
    if total_sesiones <= 6:
        return _generar_building(user, hoy, total_sesiones)

    # ────────────────────────────────────────────────────────────────
    # MODO FULL — 7+ sesiones, LLM con fallback a building
    # ────────────────────────────────────────────────────────────────
    return _generar_full(user, hoy, total_sesiones)


def _cache_insight(user, hoy, *, modo: str, mensaje: str, fragmento: str) -> dict:
    """Guarda en DailyCoachInsight y devuelve el payload dict."""
    DailyCoachInsight.objects.update_or_create(
        user=user, fecha=hoy,
        defaults={'texto': mensaje, 'modo': modo, 'fragmento': fragmento},
    )
    return {'modo': modo, 'mensaje': mensaje, 'fragmento': fragmento}


def _generar_building(user, hoy, total_sesiones: int) -> dict:
    """Plantilla con datos reales, sin LLM (modo building: 2-6 sesiones)."""
    from datetime import timedelta

    ultima = (
        user.sessions
        .select_related('feedback')
        .order_by('-fecha', '-created_at')
        .first()
    )

    # Preferir dato de RPE si existe
    if ultima and ultima.feedback and ultima.feedback.rpe_real is not None:
        rpe = float(ultima.feedback.rpe_real)
        rpe_str = str(int(rpe)) if rpe == int(rpe) else str(round(rpe, 1))
        mensaje = (
            f'Tu sesión {total_sesiones} tuvo un RPE de {rpe_str}. '
            'Tu entrenador ya tiene tu punto de partida.'
        )
        fragmento = f'RPE de {rpe_str}'
    else:
        mensaje = (
            f'Llevas {total_sesiones} sesiones en Zyfit. '
            'Con cada una, tu entrenador te conoce mejor.'
        )
        fragmento = f'{total_sesiones} sesiones'

    return _cache_insight(user, hoy, modo='building', mensaje=mensaje, fragmento=fragmento)


def _generar_full(user, hoy, total_sesiones: int) -> dict:
    """LLM con contexto completo (modo full: 7+ sesiones). Fallback a building."""
    from datetime import timedelta
    from collections import Counter

    dia_semana = hoy.weekday()
    DIA_NOMBRES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
    dia_nombre  = DIA_NOMBRES[dia_semana]

    hace_6_semanas = hoy - timedelta(weeks=6)
    hace_3_semanas = hoy - timedelta(weeks=3)

    sesiones_recientes = list(
        user.sessions.filter(fecha__gte=hace_6_semanas)
        .select_related('checkin', 'feedback')
        .order_by('-fecha')
    )

    # ── Patrón del día de la semana
    sesiones_mismo_dia = [s for s in sesiones_recientes if s.fecha.weekday() == dia_semana][:6]

    def _disciplina(titulo):
        if not titulo:
            return None
        t = titulo.lower()
        if any(w in t for w in ['pierna', 'glúteo', 'sentadilla', 'squat', 'femoral', 'cuádricep']):
            return 'piernas'
        if any(w in t for w in ['pecho', 'press banca', 'pectoral', 'push', 'trícep']):
            return 'pecho y tríceps'
        if any(w in t for w in ['espalda', 'jalón', 'remo', 'bícep', 'pull', 'dorsal']):
            return 'espalda y bíceps'
        if any(w in t for w in ['hombro', 'deltoid', 'press hombro', 'shoulder', 'militar']):
            return 'hombros'
        if any(w in t for w in ['full body', 'cuerpo completo', 'funcional', 'hiit', 'circuito']):
            return 'full body'
        if any(w in t for w in ['corr', 'run', 'cardio', 'aerob']):
            return 'cardio'
        if any(w in t for w in ['movil', 'flex', 'yoga', 'stretching', 'movilidad']):
            return 'movilidad'
        return None

    disciplinas = [
        _disciplina(s.respuesta_ia.get('titulo', '') if s.respuesta_ia else '')
        for s in sesiones_mismo_dia
    ]
    disciplinas = [d for d in disciplinas if d]

    patron_desc = 'sin patrón claro aún'
    if disciplinas:
        mas_comun, freq = Counter(disciplinas).most_common(1)[0]
        if freq >= 3:
            patron_desc = f'{freq}/{len(sesiones_mismo_dia)} veces: {mas_comun}'

    # ── Consistencia
    try:
        racha         = user.profile.racha_actual or 0
        dias_objetivo = user.profile.dias_semana or 3
    except Exception:
        racha, dias_objetivo = 0, 3

    sesiones_sem = user.sessions.filter(fecha__gte=hoy - timedelta(days=hoy.weekday())).count()
    sesiones_3s  = user.sessions.filter(fecha__gte=hace_3_semanas).count()

    semanas_activas = len({
        s.fecha - timedelta(days=s.fecha.weekday())
        for s in sesiones_recientes
    })

    ctx = '\n'.join(filter(None, [
        f'Hoy: {dia_nombre}',
        f'Total sesiones: {total_sesiones}',
        f'Patrón de {dia_nombre}s: {patron_desc}',
        f'Racha actual: {racha} días',
        f'Sesiones esta semana: {sesiones_sem} de {dias_objetivo} planificadas',
        f'Semanas activas (últimas 6): {semanas_activas}/6',
        f'Sesiones últimas 3 semanas: {sesiones_3s}',
    ]))

    prompt = f"""Eres el entrenador IA de PyFit. Genera un mensaje personalizado de exactamente DOS oraciones para este atleta.

DATOS:
{ctx}

INSTRUCCIONES ESTRICTAS:
1. DOS oraciones únicamente. La primera describe un patrón concreto con datos numéricos. La segunda conecta ese patrón con hoy o la oportunidad actual.
2. Al menos un dato numérico concreto en el mensaje.
3. Sin lenguaje motivacional genérico. Sin consejos de carga ni nutrición. Sin signos de exclamación.
4. Tono: entrenador que conoce al atleta, directo.
5. Devuelve SOLO un objeto JSON con exactamente estos dos campos, sin texto extra:
{{"mensaje": "...", "fragmento": "..."}}
El campo "fragmento" es la frase más relevante del mensaje (3-6 palabras) que se destacará visualmente."""

    try:
        import groq, json as _json
        from django.conf import settings as dj_settings
        client = groq.Groq(api_key=dj_settings.GROQ_API_KEY)
        resp = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=180,
            temperature=0.65,
        )
        raw = resp.choices[0].message.content.strip()
        # Extraer JSON del response (puede venir con backticks)
        raw = raw.strip('`').strip()
        if raw.startswith('json'):
            raw = raw[4:].strip()
        parsed = _json.loads(raw)
        mensaje   = parsed.get('mensaje', '').strip()
        fragmento = parsed.get('fragmento', '').strip()
        if mensaje:
            return _cache_insight(user, hoy, modo='full', mensaje=mensaje, fragmento=fragmento)
    except Exception:
        pass

    # Fallback: plantilla building
    return _generar_building(user, hoy, total_sesiones)


# ── Alias para compatibilidad con la llamada en stats_dashboard ───────────────
_generar_insight_entrenador = _generar_mensaje_entrenador


def _calcular_zyfit_score(user, total_sesiones, racha, dias_objetivo, hoy=None):
    """
    Zyfit Score 0-100. Requiere al menos 7 sesiones totales.
    Componentes:
      - Consistencia semanal  35 pts  (días entrenados esta semana / objetivo)
      - Cumplimiento reciente 30 pts  (avg feedback.cumplimiento últimas 5 sesiones)
      - Adherencia RPE        20 pts  (qué tan cerca estuvo rpe_real de rpe_target)
      - Racha                 15 pts  (min(racha, 14) / 14)
    """
    if total_sesiones < 7:
        return None, None

    if hoy is None:
        hoy = date.today()
    hace_7 = hoy - timedelta(days=7)

    # 1 — Consistencia
    dias_sem = (user.sessions
                .filter(fecha__gte=hace_7)
                .values('fecha').distinct().count())
    consistencia = min(1.0, dias_sem / max(dias_objetivo, 1)) * 35

    # 2 — Cumplimiento
    last_fb = list(
        user.sessions
        .filter(feedback__isnull=False)
        .select_related('feedback')
        .order_by('-fecha', '-created_at')[:5]
    )
    if last_fb:
        avg_c    = sum(float(s.feedback.cumplimiento) for s in last_fb) / len(last_fb)
        comp_pts = avg_c / 100.0 * 30
    else:
        comp_pts = 15  # neutro

    # 3 — Adherencia RPE
    last_rpe = list(
        user.sessions
        .filter(feedback__isnull=False,
                feedback__rpe_real__isnull=False,
                rpe_target__isnull=False)
        .select_related('feedback')
        .order_by('-fecha', '-created_at')[:5]
    )
    if last_rpe:
        diffs    = [abs(float(s.feedback.rpe_real) - float(s.rpe_target)) for s in last_rpe]
        avg_diff = sum(diffs) / len(diffs)
        rpe_pts  = max(0.0, 1.0 - avg_diff / 3.0) * 20
    else:
        rpe_pts = 10  # neutro

    # 4 — Racha
    racha_pts = min(racha, 14) / 14.0 * 15

    score       = min(100, max(0, round(consistencia + comp_pts + rpe_pts + racha_pts)))
    descripcion = _descripcion_zyfit_score(score, dias_sem, last_fb, racha, dias_objetivo)
    return score, descripcion


def _descripcion_zyfit_score(score, dias_sem_actual, sesiones_con_fb, racha, dias_objetivo):
    """Descripción en lenguaje natural del Zyfit Score."""
    partes = []

    # Parte A — tendencia general
    if score >= 91:
        partes.append('Rendimiento de élite esta semana')
    elif score >= 76:
        partes.append('Semana de alto rendimiento')
    elif score >= 56:
        partes.append('Entrenando con buena consistencia')
    elif score >= 31:
        partes.append('En ritmo, construyendo el hábito')
    else:
        partes.append('Semana de bajo volumen')

    # Parte B — dato más relevante
    if sesiones_con_fb:
        avg_c = sum(float(s.feedback.cumplimiento) for s in sesiones_con_fb) / len(sesiones_con_fb)
        if avg_c >= 90:
            partes.append(f'cumplimiento del {int(avg_c)}% en tus últimas sesiones')
        elif racha >= 5:
            partes.append(f'racha activa de {racha} días')
        elif dias_sem_actual >= dias_objetivo:
            partes.append(f'completaste las {dias_sem_actual} sesiones de la semana')
        else:
            ses = 'sesión' if dias_sem_actual == 1 else 'sesiones'
            partes.append(f'{dias_sem_actual} {ses} esta semana')
    elif racha >= 3:
        partes.append(f'llevas {racha} días consecutivos')
    else:
        partes.append('sigue entrenando para ver tu progreso')

    return ' — '.join(partes)


def _tipo_corto(titulo):
    if not titulo:
        return 'Sesión'
    t = titulo.lower()
    if 'fuerza' in t:   return 'Fuerza'
    if 'hiit' in t:     return 'HIIT'
    if 'cardio' in t:   return 'Cardio'
    if 'movilidad' in t: return 'Móvil'
    if 'full' in t or 'cuerpo' in t: return 'Full B.'
    if 'recuper' in t:  return 'Recup.'
    return 'Sesión'


def _semana_detalle(user, dias_semana_objetivo, cta_titulo, hoy: date | None = None):
    from datetime import date, timedelta
    if hoy is None:
        hoy = date.today()  # fallback UTC si no se pasa la fecha local
    lunes = hoy - timedelta(days=hoy.weekday())  # Monday of current week
    domingo = lunes + timedelta(days=6)

    # Build a dict of {date_str: [sessions]} to support multiple sessions per day
    sesiones_map: dict[str, list] = {}
    for s in user.sessions.filter(fecha__gte=lunes, fecha__lte=domingo).order_by('created_at'):
        key = str(s.fecha)
        sesiones_map.setdefault(key, []).append(s)

    # Carreras libres completadas esta semana — RunSession es un modelo aparte.
    # Solo se añaden al mapa si ese día no tiene ya una Session de gym/IA.
    run_dates: set[str] = set()
    try:
        from runs.models import RunSession as RunSessionModel
        for r in RunSessionModel.objects.filter(
            user=user,
            started_at__date__gte=lunes,
            started_at__date__lte=domingo,
            status='completed',
        ):
            key = str(r.started_at.date())
            run_dates.add(key)
            if key not in sesiones_map:
                sesiones_map[key] = []   # marca el día sin Session objects
    except Exception:
        pass

    # Count unique days trained up to and including today (not total sessions)
    sesiones_hasta_hoy = sum(
        1 for i in range(hoy.weekday() + 1)
        if str(lunes + timedelta(days=i)) in sesiones_map
    )
    restantes_a_entrenar = max(0, dias_semana_objetivo - sesiones_hasta_hoy)

    DIA_ABBR = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
    detalle = []
    planned_count = 0

    for i in range(7):
        dia = lunes + timedelta(days=i)
        fecha_str = str(dia)
        abbr = DIA_ABBR[i]
        is_today = dia == hoy

        if dia < hoy:
            if fecha_str in sesiones_map:
                sessions_dia = sesiones_map[fecha_str]
                if sessions_dia:
                    s = sessions_dia[-1]
                    tipo = _tipo_corto(s.respuesta_ia.get('titulo', '') if s.respuesta_ia else '')
                else:
                    tipo = 'Running'  # día de run sin Session de gym
                detalle.append({'fecha': fecha_str, 'dia_abbr': abbr, 'estado': 'entrenado', 'tipo_sesion': tipo, 'is_today': False})
            else:
                detalle.append({'fecha': fecha_str, 'dia_abbr': abbr, 'estado': 'vacio', 'tipo_sesion': None, 'is_today': False})

        elif is_today:
            if fecha_str in sesiones_map:
                sessions_dia = sesiones_map[fecha_str]
                if sessions_dia:
                    s = sessions_dia[-1]
                    tipo = _tipo_corto(s.respuesta_ia.get('titulo', '') if s.respuesta_ia else '')
                else:
                    tipo = 'Running'
                detalle.append({'fecha': fecha_str, 'dia_abbr': abbr, 'estado': 'entrenado', 'tipo_sesion': tipo, 'is_today': True})
            else:
                tipo = _tipo_corto(cta_titulo) if cta_titulo else None
                detalle.append({'fecha': fecha_str, 'dia_abbr': abbr, 'estado': 'hoy', 'tipo_sesion': tipo, 'is_today': True})

        else:
            if planned_count < restantes_a_entrenar:
                detalle.append({'fecha': fecha_str, 'dia_abbr': abbr, 'estado': 'planificado', 'tipo_sesion': _tipo_corto(cta_titulo), 'is_today': False})
                planned_count += 1
            else:
                detalle.append({'fecha': fecha_str, 'dia_abbr': abbr, 'estado': 'descanso', 'tipo_sesion': None, 'is_today': False})

    return detalle


def _sugerir_entrenamiento(ultima_sesion, objetivo):
    if not ultima_sesion or not ultima_sesion.respuesta_ia:
        return 'Entrenamiento full body'
    t = (ultima_sesion.respuesta_ia.get('titulo') or '').lower()
    obj = (objetivo or '').lower()
    if 'inferior' in t or 'pierna' in t or 'glúteo' in t or 'gluteo' in t:
        return 'Fuerza en tren superior'
    if 'superior' in t or 'pecho' in t or 'espalda' in t or 'hombro' in t or 'brazo' in t:
        return 'Fuerza en tren inferior'
    if 'cardio' in t or 'hiit' in t or 'aeróbico' in t:
        return 'Fuerza full body'
    if 'full' in t or 'cuerpo completo' in t:
        return 'Cardio y movilidad' if 'cardio' in obj or 'resistencia' in obj else 'Fuerza en tren superior'
    if 'movilidad' in t or 'recuperación' in t or 'recuperacion' in t:
        return 'Fuerza full body'
    return 'Fuerza full body'


def _proxima_sesion(user, sesion_actual):
    objetivo = ''
    try:
        objetivo = user.profile.objetivo or ''
    except Exception:
        pass
    tipo = _sugerir_entrenamiento(sesion_actual, objetivo)
    dia_sugerido = date.today() + timedelta(days=2)
    DIAS_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    return {'tipo': tipo, 'dia': DIAS_ES[dia_sugerido.weekday()]}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_logro(request, pk):
    try:
        session = request.user.sessions.get(pk=pk)
    except Session.DoesNotExist:
        return Response({'error': 'Sesión no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    proxima = _proxima_sesion(request.user, session)

    if session.logro is not None:
        return Response({'logro': session.logro, 'proxima_sesion': proxima})

    total_sesiones = request.user.sessions.count()
    racha = 0
    nivel = ''
    objetivo_usuario = ''
    try:
        profile = request.user.profile
        racha = profile.racha_actual
        nivel = profile.nivel or ''
        objetivo_usuario = profile.objetivo or ''
    except Exception:
        pass

    respuesta = session.respuesta_ia or {}
    titulo = respuesta.get('titulo', '')
    ejercicios_list = []
    for fase in respuesta.get('fases', []):
        for ej in fase.get('ejercicios', []):
            n = ej.get('nombre', '').strip()
            if n:
                ejercicios_list.append(n)

    hace_7 = date.today() - timedelta(days=7)
    sesiones_semana = request.user.sessions.filter(fecha__gte=hace_7).count()

    ctx_parts = [
        f'Número de sesión total: {total_sesiones}',
        f'Sesiones esta semana: {sesiones_semana}',
        f'Racha actual: {racha} días',
    ]
    if nivel:
        ctx_parts.append(f'Nivel: {nivel}')
    if objetivo_usuario:
        ctx_parts.append(f'Objetivo del atleta: {objetivo_usuario}')
    if titulo:
        ctx_parts.append(f'Sesión de hoy: {titulo}')
    if ejercicios_list:
        ctx_parts.append(f'Ejercicios: {", ".join(ejercicios_list[:6])}')

    contexto = '\n'.join(f'- {l}' for l in ctx_parts)

    fallback = {
        'icon': '🎯',
        'titulo': f'Sesión {total_sesiones} completada.',
        'descripcion': 'Cada sesión suma a tu perfil adaptativo.',
    }

    prompt = f"""Eres el entrenador IA de una app de fitness. Genera un logro específico para este atleta tras completar esta sesión.

Datos:
{contexto}

Responde ÚNICAMENTE con JSON válido (sin markdown):
{{
  "icon": "emoji representativo",
  "titulo": "el logro en 1 oración directa",
  "descripcion": "1-2 oraciones con contexto concreto de progreso"
}}

Elige el logro más relevante según los datos:
- Milestone sesiones si total_sesiones es redondo o notable (5, 10, 25, 50...)
- Racha si racha >= 3 (menciona el número exacto)
- Consistencia semanal si sesiones_semana >= 3
- General si no aplica ninguno (referencia siempre un número real)

Reglas: titulo máximo 7 palabras. Sin signos de exclamación. En español. Sin emojis en titulo ni descripcion."""

    try:
        import groq as _groq, json as _json
        from django.conf import settings as _settings
        client = _groq.Groq(api_key=_settings.GROQ_API_KEY)
        resp = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=200,
            temperature=0.65,
        )
        raw = resp.choices[0].message.content.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        data = _json.loads(raw.strip())
        logro_data = {
            'icon': str(data.get('icon', fallback['icon'])),
            'titulo': str(data.get('titulo', fallback['titulo'])),
            'descripcion': str(data.get('descripcion', fallback['descripcion'])),
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f'session_logro error {pk}: {e}', exc_info=True)
        logro_data = fallback

    session.logro = logro_data
    session.save(update_fields=['logro'])
    return Response({'logro': logro_data, 'proxima_sesion': proxima})


def _cta_sugerido(user, total_sesiones, fatiga_pct, hoy=None):
    from datetime import date
    if hoy is None:
        hoy = date.today()

    # Sesión del coach para HOY (origen='coach') sin completar → tiene prioridad
    # sobre cualquier otro estado, incluso en la primera semana: si el coach
    # preparó la sesión, el atleta debe verla y entrar directo a ejecutarla.
    sesion_coach = (user.sessions
                    .filter(fecha=hoy, origen=Session.ORIGEN_COACH)
                    .select_related('feedback').order_by('-created_at').first())
    if sesion_coach and getattr(sesion_coach, 'feedback', None) is None:
        empezada = sesion_coach.inicio_real is not None
        titulo_c = sesion_coach.respuesta_ia.get('titulo') if isinstance(sesion_coach.respuesta_ia, dict) else None
        return {
            'estado': 'E',
            'pill_label': 'Entrenamiento en curso' if empezada else 'Sesión de tu coach',
            'pill_color': 'orange',
            'titulo': titulo_c or 'Tu sesión de hoy',
            'descripcion': 'Retoma donde la dejaste' if empezada else 'Tu coach preparó tu sesión de hoy',
            'sesion_hoy_id': sesion_coach.id,
        }

    # Estado D — primera semana (< 3 sesiones totales)
    if total_sesiones < 3:
        return {
            'estado': 'D',
            'pill_label': 'Empieza hoy',
            'pill_color': 'green',
            'titulo': 'Tu primer entrenamiento adaptativo',
            'descripcion': '30–45 min · La IA aprende con cada sesión',
            'sesion_hoy_id': None,
        }

    # Sesión de hoy: distinguir GENERADA-sin-terminar vs COMPLETADA.
    # La sesión se crea al GENERAR, no al terminar; por eso "tener una sesión
    # hoy" no implica haber entrenado. El feedback es la señal de completada
    # (se guarda al finalizar o al marcar completada sin ejecutar).
    sesion_hoy = user.sessions.filter(fecha=hoy).select_related('feedback').first()
    if sesion_hoy:
        tiene_feedback = getattr(sesion_hoy, 'feedback', None) is not None
        titulo_hoy = (
            sesion_hoy.respuesta_ia.get('titulo') if sesion_hoy.respuesta_ia else None
        )

        # Estado E — sesión generada hoy pero aún sin terminar → Continuar
        if not tiene_feedback:
            empezada = sesion_hoy.inicio_real is not None
            return {
                'estado': 'E',
                'pill_label': 'Entrenamiento en curso' if empezada else 'Sesión lista',
                'pill_color': 'orange',
                'titulo': titulo_hoy or 'Tu sesión de hoy',
                'descripcion': (
                    'Retoma donde la dejaste' if empezada
                    else 'Tienes una sesión generada lista para empezar'
                ),
                'sesion_hoy_id': sesion_hoy.id,
            }

        # Estado B — ya entrenó hoy (hay feedback → completada)
        cumplimiento = getattr(getattr(sesion_hoy, 'feedback', None), 'cumplimiento', None)
        desc = f'{round(cumplimiento)}% de cumplimiento' if cumplimiento is not None else 'Sesión registrada'
        return {
            'estado': 'B',
            'pill_label': 'Ya entrenaste hoy',
            'pill_color': 'neutral',
            'titulo': titulo_hoy or 'Sesión completada',
            'descripcion': desc,
            'sesion_hoy_id': sesion_hoy.id,
        }

    # Carrera libre completada hoy — RunSession es un modelo separado de Session.
    # Si no hay Session gym/IA pero sí un RunSession completado, el usuario ya entrenó.
    try:
        from runs.models import RunSession as RunSessionModel
        run_hoy = (RunSessionModel.objects
                   .filter(user=user, started_at__date=hoy, status='completed')
                   .order_by('-started_at').first())
        if run_hoy:
            desc_parts = []
            if run_hoy.total_distance_m:
                km = round(run_hoy.total_distance_m / 1000, 1)
                desc_parts.append(f'{km} km')
            if run_hoy.total_duration_s:
                desc_parts.append(f'{run_hoy.total_duration_s // 60} min')
            return {
                'estado': 'B',
                'pill_label': 'Ya entrenaste hoy',
                'pill_color': 'neutral',
                'titulo': 'Sesión de Running',
                'descripcion': ' · '.join(desc_parts) if desc_parts else 'Carrera completada',
                'sesion_hoy_id': None,
                'run_sesion_hoy_id': run_hoy.id,
            }
    except Exception:
        pass

    # Estado C — descanso sugerido (fatiga alta)
    if fatiga_pct >= 80:
        return {
            'estado': 'C',
            'pill_label': 'Día de recuperación',
            'pill_color': 'orange',
            'titulo': 'Hoy es día de recuperación',
            'descripcion': 'Carga acumulada alta · Movilidad y estiramientos · 20–30 min',
            'sesion_hoy_id': None,
        }

    # Estado A — listo para entrenar
    ultima = user.sessions.order_by('-fecha', '-created_at').first()
    objetivo = ''
    duracion = 45
    try:
        objetivo = user.profile.objetivo or ''
        duracion = user.profile.duracion_disponible or 45
    except Exception:
        pass

    titulo = _sugerir_entrenamiento(ultima, objetivo)

    desc_parts = [f'{duracion} min']
    if ultima:
        dias_diff = (hoy - ultima.fecha).days
        if dias_diff == 1:
            desc_parts.append('Continúa donde dejaste ayer')
        elif dias_diff == 2:
            desc_parts.append('Retoma tras un día de descanso')
        elif dias_diff >= 3:
            desc_parts.append(f'Retoma tras {dias_diff} días')
        else:
            desc_parts.append('Primera sesión de la semana')
    carga = max(70, 100 - int(fatiga_pct * 0.3))
    desc_parts.append(f'{carga}% de carga sugerida')

    return {
        'estado': 'A',
        'pill_label': 'Listo para ti',
        'pill_color': 'green',
        'titulo': titulo,
        'descripcion': ' · '.join(desc_parts),
        'sesion_hoy_id': None,
    }


def _saludo_cacheado(user, hoy, *, nombre, total_sesiones, racha, ultima_titulo,
                     ultima_fecha, cumplimiento_prom, sexo):
    """Devuelve (saludo, insight) desde caché diario; genera con IA solo una vez
    por usuario × día. No cachea fallos de IA (None) para permitir reintento y
    que el fallback determinístico de stats_dashboard tome el control."""
    try:
        entry = DailySaludo.objects.get(user=user, fecha=hoy)
        return entry.saludo, entry.insight
    except DailySaludo.DoesNotExist:
        pass

    saludo, insight = _generar_saludo(
        nombre, total_sesiones, racha, ultima_titulo, ultima_fecha, cumplimiento_prom, sexo,
    )
    if saludo:
        DailySaludo.objects.update_or_create(
            user=user, fecha=hoy,
            defaults={'saludo': saludo, 'insight': insight or ''},
        )
    return saludo, insight


def _generar_saludo(nombre, total_sesiones, racha, ultima_titulo, ultima_fecha, cumplimiento_prom, sexo=''):
    try:
        import groq, json
        from django.conf import settings
        client = groq.Groq(api_key=settings.GROQ_API_KEY)

        ctx_parts = [f'Nombre: {nombre}', f'Total sesiones: {total_sesiones}', f'Racha actual: {racha} días']
        if sexo:
            ctx_parts.append(f'Sexo: {sexo}')
        if ultima_titulo and ultima_fecha:
            ctx_parts.append(f'Última sesión: "{ultima_titulo}" el {ultima_fecha}')
        if cumplimiento_prom:
            ctx_parts.append(f'Cumplimiento promedio esta semana: {round(cumplimiento_prom)}%')
        contexto = '. '.join(ctx_parts)

        prompt = f"""Genera un saludo de dashboard para una app de fitness adaptativa con IA.

Contexto: {contexto}

Reglas estrictas:
- Si total_sesiones == 0: bienvenida con el nombre, sin referencias a historial.
- Si total_sesiones < 7: referencia breve a la última sesión o al inicio del hábito.
- Si total_sesiones >= 7: puede mencionar racha, patrón semanal o logro reciente.
- Concordancia de género: si sexo == 'femenino' usa formas femeninas ("Bienvenida", "lista", "preparada"). Si sexo == 'masculino' usa masculinas ("Bienvenido", "listo", "preparado"). Si sexo == 'otro' o vacío, usa formas neutras.
- saludo: UNA SOLA LÍNEA, máximo 10 palabras, usa el nombre directamente, tono directo y personal, sin clichés ni emojis.
- insight: máximo 1 oración breve sobre descanso, consistencia, sugerencia del día o advertencia de fatiga.
- Responde ÚNICAMENTE JSON válido, sin markdown: {{"saludo": "...", "insight": "..."}}"""

        resp = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=120,
            temperature=0.75,
        )
        raw = resp.choices[0].message.content.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        data = json.loads(raw.strip())
        return str(data.get('saludo', '')).strip(), str(data.get('insight', '')).strip()
    except Exception:
        return None, None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_sustituir(request, pk):
    try:
        session = request.user.sessions.get(pk=pk)
    except Session.DoesNotExist:
        return Response({'error': 'Sesión no encontrada'}, status=status.HTTP_404_NOT_FOUND)
    original = str(request.data.get('original', ''))[:200]
    sustitucion = {
        'original': original,
        'elegido':  str(request.data.get('elegido', ''))[:200],
        'motivo':   str(request.data.get('motivo', ''))[:100],
        'fase':     str(request.data.get('fase', ''))[:50],
    }
    session.sustituciones = (session.sustituciones or []) + [sustitucion]

    # GEN-1: persistir el cambio en respuesta_ia para que ejecutar/feedback usen el
    # ejercicio sustituido (antes solo se guardaba el log y se ejecutaba el original).
    nuevo = request.data.get('nuevo')
    updated = False
    if isinstance(nuevo, dict) and original and isinstance(session.respuesta_ia, dict):
        fase_nombre = sustitucion['fase']
        nuevo_ej = {
            'nombre':            str(nuevo.get('nombre', ''))[:200],
            'series':            nuevo.get('series'),
            'repeticiones':      str(nuevo.get('repeticiones', ''))[:50],
            'descanso_segundos': nuevo.get('descanso_segundos'),
            'rpe_sugerido':      nuevo.get('rpe_sugerido'),
            'notas':             str(nuevo.get('notas', '') or ''),
        }
        if nuevo_ej['nombre']:
            for fase in session.respuesta_ia.get('fases', []) or []:
                if fase_nombre and fase.get('nombre') != fase_nombre:
                    continue
                ejercicios = fase.get('ejercicios', []) or []
                for i, ej in enumerate(ejercicios):
                    if ej.get('nombre') == original:
                        ejercicios[i] = nuevo_ej
                        updated = True
                        break
                if updated:
                    break

    update_fields = ['sustituciones']
    if updated:
        update_fields.append('respuesta_ia')
    session.save(update_fields=update_fields)

    if updated:
        from ai_workout.views import _persist_session_exercises
        session.exercises.all().delete()
        _persist_session_exercises(session, session.respuesta_ia)

    return Response({'ok': True, 'updated': updated})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_dashboard(request):
    hoy = _get_local_date(request)  # fecha local del dispositivo, no UTC
    hace_7 = hoy - timedelta(days=7)
    hace_72h = hoy - timedelta(days=3)

    # Cumplimiento promedio semanal — alimenta el saludo de IA
    con_feedback = request.user.sessions.filter(fecha__gte=hace_7, feedback__isnull=False)
    cumplimiento_prom = con_feedback.aggregate(avg=Avg('feedback__cumplimiento'))['avg'] or 0

    # Fatiga acumulada — la consume el CTA
    ultimas_72 = request.user.sessions.filter(fecha__gte=hace_72h).count()
    fatiga_pct = min(100, ultimas_72 * 33)

    try:
        profile = request.user.profile
        nombre = profile.nombre
        sexo = profile.sexo or ''
        dias_objetivo = profile.dias_semana or 3
        avatar = profile.avatar or ''
    except Exception:
        nombre = request.user.email.split('@')[0]
        sexo = ''
        dias_objetivo = 3
        avatar = ''

    # Racha en tiempo real, con fecha LOCAL (evita desfase de un día cerca de medianoche)
    racha = _calcular_racha_contexto(request.user, hoy=hoy)['racha_actual']

    total_sesiones = request.user.sessions.count()
    ultima = request.user.sessions.order_by('-fecha', '-created_at').first()
    ultima_titulo = ultima.respuesta_ia.get('titulo', '') if ultima and ultima.respuesta_ia else ''
    ultima_fecha = str(ultima.fecha) if ultima else ''

    # Saludo cacheado por usuario × día — evita una llamada Groq síncrona por carga/refoco
    saludo, _insight = _saludo_cacheado(
        request.user, hoy,
        nombre=nombre, total_sesiones=total_sesiones, racha=racha,
        ultima_titulo=ultima_titulo, ultima_fecha=ultima_fecha,
        cumplimiento_prom=cumplimiento_prom, sexo=sexo,
    )
    cta = _cta_sugerido(request.user, total_sesiones, fatiga_pct, hoy=hoy)
    semana_detalle = _semana_detalle(request.user, dias_objetivo, cta.get('titulo', ''), hoy=hoy)
    insight_entrenador = _generar_insight_entrenador(request.user)
    zyfit_score_valor, zyfit_score_desc = _calcular_zyfit_score(
        request.user, total_sesiones, racha, dias_objetivo, hoy=hoy,
    )

    if not saludo:
        # Fallback determinístico cuando la IA falla. Concordancia por género:
        # femenino → 'Bienvenida' / 'lista'; masculino → 'Bienvenido' / 'listo';
        # otros → forma neutra.
        if sexo == 'femenino':
            bienvenida, lista_adj = 'Bienvenida', 'lista'
        elif sexo == 'masculino':
            bienvenida, lista_adj = 'Bienvenido', 'listo'
        else:
            bienvenida, lista_adj = 'Te damos la bienvenida', None

        if total_sesiones == 0:
            saludo = f'{bienvenida}, {nombre}.'
        elif racha >= 3:
            saludo = f'{nombre}, llevas {racha} días seguidos.'
        elif lista_adj:
            saludo = f'Hola, {nombre}. ¿{lista_adj.capitalize()}?'
        else:
            saludo = f'Hola, {nombre}. ¿Empezamos?'

    return Response({
        'nombre': nombre,
        'avatar': avatar,
        'saludo': saludo,
        'cta': cta,
        'semana_detalle': semana_detalle,
        'insight_entrenador': insight_entrenador,
        'zyfit_score': {
            'valor': zyfit_score_valor,
            'descripcion': zyfit_score_desc,
            'has_data': zyfit_score_valor is not None,
        },
    })


def _analizar_entrenamiento(user):
    from datetime import date, timedelta
    from collections import defaultdict
    hoy = date.today()
    hace_90 = hoy - timedelta(days=90)

    sesiones_fb = list(
        user.sessions.filter(feedback__isnull=False, fecha__gte=hace_90)
        .select_related('feedback')
    )
    if len(sesiones_fb) < 3:
        return {}

    findings = {}
    day_names_es = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

    # 1. Día con mayor RPE promedio (min 2 sesiones ese día)
    day_rpe: dict = defaultdict(list)
    for s in sesiones_fb:
        day_rpe[s.fecha.weekday()].append(float(s.feedback.rpe_real))
    best_day, best_day_val = None, 0.0
    for day, rpes in day_rpe.items():
        if len(rpes) >= 2:
            avg = sum(rpes) / len(rpes)
            if avg > best_day_val:
                best_day_val, best_day = avg, day_names_es[day]
    if best_day:
        findings['mejor_dia'] = best_day
        findings['mejor_dia_rpe'] = round(best_day_val, 1)

    # 2. Tipo de entrenamiento con mejor cumplimiento (min 2 sesiones de ese tipo)
    tipo_cum: dict = defaultdict(list)
    for s in sesiones_fb:
        if s.respuesta_ia:
            tipo = _tipo_corto(s.respuesta_ia.get('titulo', ''))
            tipo_cum[tipo].append(float(s.feedback.cumplimiento))
    best_tipo, best_tipo_val = None, 0.0
    for tipo, cums in tipo_cum.items():
        if len(cums) >= 2:
            avg = sum(cums) / len(cums)
            if avg > best_tipo_val:
                best_tipo_val, best_tipo = avg, tipo
    if best_tipo:
        findings['mejor_tipo'] = best_tipo
        findings['mejor_tipo_cum'] = round(best_tipo_val, 1)

    # 3. Rango de intensidad dominante (solo si ≥5 sesiones y >40% en un rango)
    if len(sesiones_fb) >= 5:
        buckets = {'baja': 0, 'moderada': 0, 'alta': 0}
        for s in sesiones_fb:
            rpe = float(s.feedback.rpe_real)
            if rpe <= 5:
                buckets['baja'] += 1
            elif rpe <= 7:
                buckets['moderada'] += 1
            else:
                buckets['alta'] += 1
        total = sum(buckets.values())
        if total:
            rango = max(buckets, key=buckets.get)
            pct = round(buckets[rango] / total * 100)
            if pct >= 40:
                findings['rango_rpe'] = rango
                findings['rango_rpe_pct'] = pct

    # 4. Sueño vs cumplimiento (activates when real sleep data exists)
    try:
        from checkins.models import DailyCheckin
        sueno_map = {
            ci.fecha: float(ci.calidad_sueno)
            for ci in DailyCheckin.objects.filter(
                user=user, fecha__gte=hace_90, calidad_sueno__isnull=False
            )
        }
        bajo, bueno = [], []
        for s in sesiones_fb:
            sueno = sueno_map.get(s.fecha)
            if sueno is not None:
                cum = float(s.feedback.cumplimiento)
                if sueno < 6:
                    bajo.append(cum)
                elif sueno >= 8:
                    bueno.append(cum)
        if len(bajo) >= 2 and len(bueno) >= 2:
            diff = sum(bueno) / len(bueno) - sum(bajo) / len(bajo)
            if abs(diff) >= 8:
                findings['sueno_diff'] = round(diff, 1)
    except Exception:
        pass

    return findings


def _generar_adn_entrenamiento(user):
    from datetime import date
    hoy = date.today()
    total_sesiones = user.sessions.count()

    if total_sesiones < 7:
        return None

    # Cache: return if <7 days old AND <5 new sessions since last generation
    try:
        cached = TrainingDNA.objects.get(user=user)
        dias_desde = (hoy - cached.generated_at.date()).days
        nuevas_desde = total_sesiones - cached.total_sesiones_at_generation
        if dias_desde < 7 and nuevas_desde < 5:
            return cached.texto
    except TrainingDNA.DoesNotExist:
        pass

    findings = _analizar_entrenamiento(user)
    if not findings:
        # Fall back to cached text if available
        try:
            return TrainingDNA.objects.get(user=user).texto
        except TrainingDNA.DoesNotExist:
            return None

    # Build context lines
    ctx_lines = []
    if findings.get('mejor_dia'):
        ctx_lines.append(
            f"Día con mayor RPE promedio: {findings['mejor_dia']} (RPE {findings['mejor_dia_rpe']})"
        )
    if findings.get('mejor_tipo'):
        ctx_lines.append(
            f"Tipo con mejor cumplimiento: {findings['mejor_tipo']} ({findings['mejor_tipo_cum']}%)"
        )
    if findings.get('rango_rpe'):
        ctx_lines.append(
            f"Intensidad dominante: {findings['rango_rpe']} ({findings['rango_rpe_pct']}% de sesiones)"
        )
    if findings.get('sueno_diff') is not None:
        diff = findings['sueno_diff']
        direction = 'sube' if diff > 0 else 'baja'
        ctx_lines.append(
            f"El sueño impacta el rendimiento: con buen sueño el cumplimiento {direction} {abs(diff)} puntos"
        )

    if not ctx_lines:
        try:
            return TrainingDNA.objects.get(user=user).texto
        except TrainingDNA.DoesNotExist:
            return None

    contexto = '\n'.join(f'- {l}' for l in ctx_lines)

    prompt = f"""Eres el entrenador IA de una app de fitness adaptativa. Con los siguientes datos del atleta, escribe UN párrafo breve que describe su perfil de entrenamiento. Máximo 2 oraciones.

Datos analizados:
{contexto}

Reglas:
- Máximo 2 oraciones. Texto fluido, no lista. Conciso.
- Cada oración refiere un dato concreto del contexto.
- Estructura guía: "Entrenas mejor los [día]. Operas principalmente en intensidad [rango]."
- En español. Tono directo y personal. Sin emojis.
- No menciones "la app", "el sistema" ni "los datos muestran".
- Responde ÚNICAMENTE con el texto del párrafo, sin comillas ni prefijos."""

    try:
        import groq
        from django.conf import settings
        client = groq.Groq(api_key=settings.GROQ_API_KEY)
        resp = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=85,
            temperature=0.65,
        )
        texto = resp.choices[0].message.content.strip().strip('"').strip("'")
        if texto:
            TrainingDNA.objects.update_or_create(
                user=user,
                defaults={'texto': texto, 'total_sesiones_at_generation': total_sesiones},
            )
            return texto
    except Exception:
        pass

    # Last resort: return stale cached text
    try:
        return TrainingDNA.objects.get(user=user).texto
    except TrainingDNA.DoesNotExist:
        return None


def _contar_datos_medidos(user, desde):
    """Suma TODOS los puntos de dato medidos del usuario en los últimos 30 días.

    Cuenta cada valor no nulo que la app captura sobre el usuario: estados de
    check-in (ánimo, sueño, HRV, foco, dolor, duración), parámetros planificados
    de cada sesión y ejercicio, cada serie registrada en ejecución, el feedback
    post-sesión, las métricas de carrera, cada punto GPS y los syncs de wearables.

    El objetivo es mostrarle al usuario cuánto lo conocemos. Es puramente
    informativo: cada bloque está aislado en try/except para no romper el
    endpoint si una fuente de datos falla o no existe todavía.
    """
    total = 0

    # 1) Check-ins diarios — cada campo medido no nulo
    try:
        from checkins.models import DailyCheckin
        for c in DailyCheckin.objects.filter(user=user, fecha__gte=desde).iterator():
            for v in (c.estado_animo, c.calidad_sueno, c.hrv, c.duracion_disponible, c.estado_fisico):
                if v is not None:
                    total += 1
            if c.foco_entrenamiento:
                total += len(c.foco_entrenamiento)
            if c.dolor_hoy:
                total += 1
    except Exception:
        pass

    # 2) Sesiones + ejercicios + series registradas en ejecución
    try:
        sesiones = user.sessions.filter(fecha__gte=desde).prefetch_related('exercises')
        for s in sesiones:
            total += 2  # duracion_planificada + rpe_target (siempre presentes)
            for ex in s.exercises.all():
                for v in (ex.series, ex.repeticiones, ex.descanso_segundos, ex.rpe_sugerido):
                    if v is not None and v != '':
                        total += 1
                if ex.series_log:
                    for serie in ex.series_log:
                        if isinstance(serie, dict):
                            total += sum(1 for val in serie.values() if val not in (None, ''))
                        else:
                            total += 1
    except Exception:
        pass

    # 3) Feedback post-sesión
    try:
        for fb in SessionFeedback.objects.filter(
            session__user=user, created_at__date__gte=desde
        ).iterator():
            for v in (fb.rpe_real, fb.cumplimiento, fb.rating):
                if v is not None:
                    total += 1
            if fb.molestias:
                total += len(fb.molestias)
    except Exception:
        pass

    # 4) Carreras (RunSession) + cada punto GPS
    try:
        from runs.models import RunSession, RunPoint
        for r in RunSession.objects.filter(user=user, started_at__date__gte=desde).iterator():
            total += 6  # distancia, duración, pace medio, mejor pace, calorías, desnivel
            if r.avg_heart_rate is not None:
                total += 1
        total += RunPoint.objects.filter(
            session__user=user, session__started_at__date__gte=desde
        ).count()
    except Exception:
        pass

    # 5) Wearables conectados (DeviceIntegration) — métricas sincronizadas
    try:
        from devices.models import DeviceIntegration
        for d in DeviceIntegration.objects.filter(user=user, updated_at__date__gte=desde).iterator():
            for v in (d.hrv, d.sleep_score, d.resting_hr, d.stress_level, d.body_battery):
                if v is not None:
                    total += 1
    except Exception:
        pass

    return total


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_profile(request):
    from datetime import date, timedelta
    hoy = date.today()
    hace_30 = hoy - timedelta(days=30)

    # Semanas activas desde date_joined
    date_joined = request.user.date_joined.date()
    semanas_activas = (hoy - date_joined).days // 7

    # Consistencia últimos 30 días
    sesiones_30 = request.user.sessions.filter(fecha__gte=hace_30).count()
    try:
        dias_objetivo = request.user.profile.dias_semana or 3
    except Exception:
        dias_objetivo = 3
    planificadas_30 = max(1, round(30 / 7 * dias_objetivo))
    consistencia_30d = min(100, int(sesiones_30 / planificadas_30 * 100))

    # Sesiones este mes
    sesiones_mes = request.user.sessions.filter(
        fecha__year=hoy.year, fecha__month=hoy.month
    ).count()

    adn_entrenamiento = _generar_adn_entrenamiento(request.user)

    # Total de datos medidos en los últimos 30 días (para la card "DATOS MEDIDOS")
    datos_medidos_30d = _contar_datos_medidos(request.user, hace_30)

    return Response({
        'semanas_activas': semanas_activas,
        'consistencia_30d': consistencia_30d,
        'sesiones_mes': sesiones_mes,
        'datos_medidos_30d': datos_medidos_30d,
        'adn_entrenamiento': adn_entrenamiento,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def competitions(request):
    if request.method == 'GET':
        comps = request.user.competitions.all()
        return Response(CompetitionSerializer(comps, many=True).data)
    serializer = CompetitionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save(user=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def competition_detail(request, pk):
    try:
        comp = request.user.competitions.get(pk=pk)
    except Competition.DoesNotExist:
        return Response({'error': 'No encontrado'}, status=status.HTTP_404_NOT_FOUND)
    comp.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Filtro → foco_entrenamiento values ───────────────────────────────────────

_FOCO_MAP = {
    'fuerza': ['serio'],
    'cardio': ['descargar'],
    'libre':  ['moverme'],   # EST-1: antes "movilidad" etiquetaba mal sesiones libres; 'recuperar' era token muerto
}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_rpe_semanal(request):
    try:
        return _stats_rpe_semanal(request)
    except Exception as exc:
        import logging; logging.getLogger(__name__).exception('stats_rpe_semanal')
        return Response({'error': 'Error interno del servidor. Intenta de nuevo.'}, status=500)


def _stats_rpe_semanal(request):
    """
    Daily performance score (rendimiento = 11 - rpe) per session, last 28 days.
    Higher value = lower perceived effort = better adaptation. Scale 1–10.
    Query param: ?filtro=todo|fuerza|cardio|movilidad
    Uses feedback.rpe_real when available, falls back to session.rpe_target.
    """
    user = request.user
    filtro = request.GET.get('filtro', 'todo')
    hoy = _get_local_date(request)   # EST-4: fecha local del dispositivo
    fecha_registro = user.date_joined.date()
    semanas_entrenando = max(1, (hoy - fecha_registro).days // 7 + 1)
    hace_28 = hoy - timedelta(days=27)

    DIAS_LABEL = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

    sesiones = (
        user.sessions
        .select_related('feedback', 'checkin')
        .filter(fecha__gte=hace_28)
        .order_by('fecha')
    )

    # Apply tipo filter via checkin.foco_entrenamiento
    if filtro in _FOCO_MAP:
        focos = _FOCO_MAP[filtro]
        sesiones = [
            s for s in sesiones
            if s.checkin and any(f in (s.checkin.foco_entrenamiento or []) for f in focos)
        ]
    else:
        sesiones = list(sesiones)

    dias = []
    for s in sesiones:
        fb = getattr(s, 'feedback', None)
        rpe = float(fb.rpe_real) if fb is not None and fb.rpe_real is not None else float(s.rpe_target)
        dias.append({
            'fecha': s.fecha.isoformat(),
            'label': DIAS_LABEL[s.fecha.weekday()],
            'rendimiento': round(11 - rpe, 1),
        })

    return Response({
        'semanas_entrenando': semanas_entrenando,
        'dias': dias,
        'fecha_registro_year': fecha_registro.year,
        'fecha_registro_month': fecha_registro.month,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_consistencia_mensual(request):
    try:
        return _stats_consistencia_mensual(request)
    except Exception as exc:
        import logging; logging.getLogger(__name__).exception('stats_consistencia_mensual')
        return Response({'error': 'Error interno del servidor. Intenta de nuevo.'}, status=500)


def _stats_consistencia_mensual(request):
    """
    Day-by-day consistency heat map for a given month.
    Query params: ?year=2025&month=5
    """
    user = request.user
    today = date.today()
    year  = int(request.GET.get('year',  today.year))
    month = int(request.GET.get('month', today.month))

    first_day     = date(year, month, 1)
    days_in_month = _cal.monthrange(year, month)[1]
    last_day      = date(year, month, days_in_month)
    fecha_registro = user.date_joined.date()

    sesiones = (
        user.sessions
        .select_related('feedback', 'checkin')
        .filter(fecha__gte=first_day, fecha__lte=last_day)
    )

    # Build per-day map, keeping highest intensity for a day
    dia_map: dict = {}
    for s in sesiones:
        foco       = s.checkin.foco_entrenamiento if s.checkin else []
        es_descanso = 'recuperar' in foco

        if es_descanso:
            intensidad = 0
        else:
            fb = getattr(s, 'feedback', None)
            rpe = float(fb.rpe_real) if fb is not None and fb.rpe_real is not None else float(s.rpe_target)
            dur = s.duracion_planificada or 0
            if rpe < 5 or dur < 20:
                intensidad = 1
            elif rpe < 7:
                intensidad = 2
            elif rpe < 8.5:
                intensidad = 3
            else:
                intensidad = 4

        existing = dia_map.get(s.fecha)
        if existing is None or intensidad > existing['intensidad']:
            dia_map[s.fecha] = {'intensidad': intensidad, 'es_descanso': es_descanso}

    # Full month array (all days)
    dias = []
    d = first_day
    while d <= last_day:
        info = dia_map.get(d)
        dias.append({
            'fecha':       d.isoformat(),
            'intensidad':  info['intensidad']  if info else 0,
            'es_descanso': info['es_descanso'] if info else False,
        })
        d += timedelta(days=1)

    # Metrics
    sesiones_completadas = sesiones.count()
    try:
        dias_semana = user.profile.dias_semana or 3
    except Exception:
        dias_semana = 3
    sesiones_planificadas = max(1, round(dias_semana * days_in_month / 7))

    return Response({
        'year':  year,
        'month': month,
        'dias':  dias,
        'sesiones_completadas':  sesiones_completadas,
        'sesiones_planificadas': sesiones_planificadas,
        'fecha_registro_year':   fecha_registro.year,
        'fecha_registro_month':  fecha_registro.month,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_cuerpo_contexto(request):
    try:
        return _stats_cuerpo_contexto(request)
    except Exception as exc:
        import logging; logging.getLogger(__name__).exception('stats_cuerpo_contexto')
        return Response({'error': 'Error interno del servidor. Intenta de nuevo.'}, status=500)


def _stats_cuerpo_contexto(request):
    """
    Daily values of estado_fisico and estado_animo (1-4 scale) for the last
    28 calendar days, plus intencion distribution from all-time checkins.
    Each bar in the frontend represents one training day.
    """
    user = request.user
    today = date.today()
    hace_28 = today - timedelta(days=27)

    # Abbreviations match the calendar DAY_LABELS convention (Mon=0)
    DIAS_LABEL = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

    # Daily data: last 28 calendar days, one entry per checkin with data
    checkins_28 = user.checkins.filter(fecha__gte=hace_28).order_by('fecha')

    dias_fisico = []
    dias_mental = []
    for ci in checkins_28:
        label = DIAS_LABEL[ci.fecha.weekday()]
        if ci.estado_fisico is not None:
            dias_fisico.append({
                'fecha': ci.fecha.isoformat(),
                'label': label,
                'valor': ci.estado_fisico,
            })
        if ci.estado_animo is not None:
            dias_mental.append({
                'fecha': ci.fecha.isoformat(),
                'label': label,
                'valor': min(ci.estado_animo, 4),
            })

    # Intencion counts from all-time checkins for a stable donut distribution
    todos = user.checkins.all()
    intencion_counts = {'serio': 0, 'descargar': 0, 'moverme': 0, 'recuperar': 0}
    for ci in todos:
        for foco in (ci.foco_entrenamiento or []):
            if foco in intencion_counts:
                intencion_counts[foco] += 1

    return Response({
        'dias_fisico': dias_fisico,
        'dias_mental': dias_mental,
        'intencion_counts': intencion_counts,
        'total_checkins': todos.count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_ejercicios_top(request):
    try:
        return _stats_ejercicios_top(request)
    except Exception as exc:
        import logging; logging.getLogger(__name__).exception('stats_ejercicios_top')
        return Response({'error': 'Error interno del servidor. Intenta de nuevo.'}, status=500)


def _stats_ejercicios_top(request):
    """
    Top 5 exercises by frequency across all completed sessions.
    Tie-broken by RPE desc. Includes variacion = avg(last 3 RPE) - avg(first 3 RPE),
    or null when fewer than 3 appearances.
    """
    user = request.user

    sesiones = (
        user.sessions
        .select_related('feedback', 'checkin')
        .prefetch_related('exercises')
        .order_by('fecha', 'created_at')
    )

    def foco_to_cat(foco_list):
        for f in (foco_list or []):
            if f == 'serio':                 return 'Fuerza'
            if f == 'descargar':             return 'Cardio'
            if f in ('moverme', 'recuperar'): return 'Movilidad'
        return 'General'

    ejercicio_apariciones: dict = defaultdict(list)

    for s in sesiones:
        fb = getattr(s, 'feedback', None)
        rpe = float(fb.rpe_real) if fb is not None and fb.rpe_real is not None else float(s.rpe_target)
        foco = s.checkin.foco_entrenamiento if s.checkin else []
        categoria = foco_to_cat(foco)
        for ex in s.exercises.all():
            ejercicio_apariciones[ex.nombre].append({'rpe': rpe, 'categoria': categoria})

    result = []
    for nombre, apariciones in ejercicio_apariciones.items():
        count    = len(apariciones)
        rpe_vals = [a['rpe'] for a in apariciones]
        rpe_prom = round(sum(rpe_vals) / count, 1)
        categoria = Counter(a['categoria'] for a in apariciones).most_common(1)[0][0]

        if count >= 3:
            variacion = round(sum(rpe_vals[-3:]) / 3 - sum(rpe_vals[:3]) / 3, 1)
        else:
            variacion = None

        result.append({
            'nombre':       nombre,
            'count':        count,
            'categoria':    categoria,
            'rpe_promedio': rpe_prom,
            'variacion':    variacion,
        })

    result.sort(key=lambda x: (-x['count'], -x['rpe_promedio']))
    return Response(result[:5])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_radar(request):
    try:
        return _stats_radar(request)
    except Exception as exc:
        import logging; logging.getLogger(__name__).exception('stats_radar')
        return Response({'error': 'Error interno del servidor. Intenta de nuevo.'}, status=500)


def _stats_radar(request):
    user = request.user
    today = _get_local_date(request)   # EST-4: fecha local del dispositivo

    hace_30 = today - timedelta(days=30)
    hace_60 = today - timedelta(days=60)
    hace_14 = today - timedelta(days=14)
    hace_28 = today - timedelta(days=28)

    total_sessions = user.sessions.count()
    if total_sessions < 7:
        return Response({'enough_data': False, 'metrics': []})

    sessions_curr = list(
        user.sessions.select_related('feedback', 'checkin').filter(fecha__gte=hace_30)
    )
    sessions_prev = list(
        user.sessions.select_related('feedback', 'checkin').filter(fecha__gte=hace_60, fecha__lt=hace_30)
    )
    checkins_curr = list(user.checkins.filter(fecha__gte=hace_14))
    checkins_prev = list(user.checkins.filter(fecha__gte=hace_28, fecha__lt=hace_14))

    try:
        dias_semana = user.profile.dias_semana or 3
    except Exception:
        dias_semana = 3

    def _rpe(s):
        fb = getattr(s, 'feedback', None)
        return float(fb.rpe_real) if fb and fb.rpe_real is not None else float(s.rpe_target)

    def calc_fuerza(sessions):
        strength = [s for s in sessions if s.checkin and 'serio' in (s.checkin.foco_entrenamiento or [])]
        if not strength:
            return 50
        avg_rpe = sum(_rpe(s) for s in strength) / len(strength)
        return round(max(0, min(100, (10 - avg_rpe) / 5 * 100)))

    def calc_cardio(sessions):
        cardio = [s for s in sessions if s.checkin and 'descargar' in (s.checkin.foco_entrenamiento or [])]
        if not cardio:
            return 0
        freq_score = min(100, len(cardio) / 8 * 100)
        ordered = sorted(cardio, key=lambda s: s.fecha)
        rpe_vals = [_rpe(s) for s in ordered]
        if len(rpe_vals) >= 2:
            rpe_trend = rpe_vals[0] - rpe_vals[-1]
            rpe_score = max(0, min(100, 50 + rpe_trend * 10))
        else:
            rpe_score = 50
        return round(freq_score * 0.6 + rpe_score * 0.4)

    def calc_movilidad(sessions):
        mobility = [
            s for s in sessions
            if s.checkin and any(f in (s.checkin.foco_entrenamiento or []) for f in ['moverme', 'recuperar'])
        ]
        objetivo_mensual = max(dias_semana * 4, 1)
        return round(min(100, len(mobility) / objetivo_mensual * 100))

    def calc_estres(checkins):
        scores = [((c.estado_animo - 1) / 4 * 100) for c in checkins if c.estado_animo is not None]
        return round(sum(scores) / len(scores)) if scores else 50

    def calc_recuperacion(checkins):
        if not checkins:
            return 50
        sleep_scores = []
        for c in checkins:
            if c.calidad_sueno is not None:
                h = float(c.calidad_sueno)
                if 7 <= h <= 9:
                    s = 100
                elif h > 9:
                    s = max(60, 100 - (h - 9) * 20)
                else:
                    s = max(0, h / 7 * 100)
                sleep_scores.append(s)
        sleep_avg = sum(sleep_scores) / len(sleep_scores) if sleep_scores else 50
        pain_count = sum(1 for c in checkins if c.dolor_hoy and c.dolor_hoy.strip())
        pain_score = max(0, 100 - (pain_count / len(checkins)) * 100)
        return round(sleep_avg * 0.7 + pain_score * 0.3)

    def calc_consistencia(sessions):
        planificadas = max(dias_semana * 4, 1)
        return round(min(100, len(sessions) / planificadas * 100))

    metrics = [
        {'key': 'fuerza',       'label': 'Fuerza',       'value': calc_fuerza(sessions_curr),       'prev': calc_fuerza(sessions_prev)},
        {'key': 'cardio',       'label': 'Cardio',        'value': calc_cardio(sessions_curr),        'prev': calc_cardio(sessions_prev)},
        {'key': 'movilidad',    'label': 'Movilidad',     'value': calc_movilidad(sessions_curr),     'prev': calc_movilidad(sessions_prev)},
        {'key': 'estres',       'label': 'Estrés',        'value': calc_estres(checkins_curr),        'prev': calc_estres(checkins_prev)},
        {'key': 'recuperacion', 'label': 'Recuperación',  'value': calc_recuperacion(checkins_curr),  'prev': calc_recuperacion(checkins_prev)},
        {'key': 'consistencia', 'label': 'Consistencia',  'value': calc_consistencia(sessions_curr),  'prev': calc_consistencia(sessions_prev)},
    ]

    return Response({'enough_data': True, 'metrics': metrics})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_series_log(request, pk):
    """
    Receives per-set weight/reps data and saves it to each SessionExercise.series_log.
    Body: { "log": [{ "orden": 1, "series": [{"serie": 1, "peso": 40.0, "reps": 10}, ...] }] }
    """
    try:
        session = request.user.sessions.get(pk=pk)
    except Session.DoesNotExist:
        return Response({'error': 'Sesión no encontrada.'}, status=404)

    log_entries = request.data.get('log', [])
    if not isinstance(log_entries, list):
        return Response({'error': 'log debe ser un array.'}, status=400)

    # Pre-fetch all exercises to avoid N+1
    exercises_map = {ex.orden: ex for ex in session.exercises.all()}

    updated = 0
    for entry in log_entries:
        orden = entry.get('orden')
        series = entry.get('series')
        if orden is None or not isinstance(series, list):
            continue
        try:
            exercise = exercises_map.get(orden)
            if exercise is None:
                continue
            exercise.series_log = series
            exercise.save(update_fields=['series_log'])
            updated += 1
        except Exception:
            pass

    return Response({'updated': updated})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def calendar_eventos(request):
    if request.method == 'GET':
        year  = int(request.GET.get('year',  date.today().year))
        month = int(request.GET.get('month', date.today().month))
        eventos = CalendarEvent.objects.filter(
            user=request.user, fecha__year=year, fecha__month=month,
        )
        return Response([{
            'id':     e.id,
            'fecha':  str(e.fecha),
            'titulo': e.titulo,
            'tipo':   e.tipo,
        } for e in eventos])

    # POST — create event
    titulo = (request.data.get('titulo') or '').strip()
    if not titulo:
        return Response({'error': 'El título es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        evento = CalendarEvent.objects.create(
            user=request.user,
            fecha=request.data['fecha'],
            titulo=titulo,
            tipo=request.data.get('tipo', 'otro'),
            notas=request.data.get('notas', ''),
        )
    except Exception:
        import logging
        logging.getLogger(__name__).exception('calendar_eventos: create failed user=%s', request.user.id)
        return Response({'error': 'No se pudo crear el evento. Verifica los datos e intenta de nuevo.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response({
        'id':     evento.id,
        'fecha':  str(evento.fecha),
        'titulo': evento.titulo,
        'tipo':   evento.tipo,
    }, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def calendar_evento_delete(request, pk):
    try:
        evento = CalendarEvent.objects.get(pk=pk, user=request.user)
        evento.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except CalendarEvent.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)


# ─── Post-feedback: advance cycle + evaluate triggers ─────────────────────────

def _evaluate_and_advance(user, session, feedback):
    """
    Called after feedback is saved. Advances the active TrainingCycle's week
    counter if a new calendar week has elapsed, then evaluates deload triggers.
    Wrapped in try/except so it never crashes the feedback response.
    """
    try:
        cycle = TrainingCycle.objects.get(user=user, is_active=True)
    except TrainingCycle.DoesNotExist:
        return
    except Exception:
        return

    try:
        from workouts.training_cycle import advance_week_if_needed
        user_goal = getattr(getattr(user, 'profile', None), 'goal', None) or None
        advance_week_if_needed(cycle, user_goal=user_goal)
    except Exception:
        import logging
        logging.getLogger(__name__).error(
            '_evaluate_and_advance week_advance failed user=%s', user.id, exc_info=True,
        )

    try:
        from workouts.deload_triggers import evaluate_deload_triggers
        evaluate_deload_triggers(user, session, feedback)
    except Exception:
        import logging
        logging.getLogger(__name__).error(
            '_evaluate_and_advance trigger_eval failed user=%s', user.id, exc_info=True,
        )


# ─── Training Cycle API ───────────────────────────────────────────────────────

def _serialize_cycle(cycle) -> dict:
    return {
        'id':                    cycle.id,
        'goal':                  cycle.goal,
        'block_type':            cycle.block_type,
        'week_number':           cycle.week_number,
        'is_deload':             cycle.is_deload,
        'next_session_is_deload': cycle.next_session_is_deload,
        'is_active':             cycle.is_active,
        'started_at':            str(cycle.started_at),
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def training_cycle_view(request):
    """
    GET  /api/training-cycle/  — Returns the active cycle or null.
    POST /api/training-cycle/  — Creates a new cycle for the given goal,
                                  deactivating any existing one.
    """
    user = request.user

    if request.method == 'GET':
        try:
            cycle = TrainingCycle.objects.get(user=user, is_active=True)
            return Response({'cycle': _serialize_cycle(cycle)})
        except TrainingCycle.DoesNotExist:
            return Response({'cycle': None})

    # POST — create / replace cycle
    from workouts.training_cycle import init_cycle, GOAL_FIRST_BLOCK
    goal = str(request.data.get('goal', '')).strip()
    if goal not in GOAL_FIRST_BLOCK:
        return Response(
            {'error': f'goal inválido. Opciones: {list(GOAL_FIRST_BLOCK)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    cycle = init_cycle(user, goal)

    # Keep profile.goal in sync
    try:
        from django.utils import timezone
        prof = user.profile
        old_goal = prof.goal
        if old_goal != goal:
            prof.previous_goal = old_goal or ''
            prof.goal = goal
            prof.goal_changed_at = timezone.now()
            prof.save(update_fields=['goal', 'previous_goal', 'goal_changed_at'])
    except Exception:
        pass

    return Response(_serialize_cycle(cycle), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def training_cycle_advance(request):
    """
    POST /api/training-cycle/advance/
    Manually advances the active cycle by one calendar week (debug / admin use).
    Normal advancement happens automatically post-feedback.
    """
    user = request.user
    try:
        cycle = TrainingCycle.objects.get(user=user, is_active=True)
    except TrainingCycle.DoesNotExist:
        return Response({'error': 'Sin ciclo activo'}, status=status.HTTP_404_NOT_FOUND)

    from workouts.training_cycle import advance_week_if_needed
    user_goal = getattr(getattr(user, 'profile', None), 'goal', None) or None
    updated = advance_week_if_needed(cycle, user_goal=user_goal)
    return Response(_serialize_cycle(updated))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_insight_cache(request):
    """
    POST /api/stats/reset-insight/
    Borra el caché del insight del entrenador de hoy para que se regenere
    en el próximo load del dashboard.
    """
    _hoy = _get_local_date(request)
    deleted, _ = DailyCoachInsight.objects.filter(user=request.user, fecha=_hoy).delete()
    DailySaludo.objects.filter(user=request.user, fecha=_hoy).delete()
    return Response({'ok': True, 'deleted': deleted})
