import calendar as _cal
from collections import Counter, defaultdict
from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Avg, Count, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Session, SessionFeedback, Competition, Exercise, UserExerciseProfile, UserAdaptationProfile, DailyCoachInsight, TrainingDNA
from .serializers import SessionDetailSerializer, SessionListSerializer, SessionFeedbackSerializer, CompetitionSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_list(request):
    sessions = request.user.sessions.select_related('feedback').all()
    return Response(SessionListSerializer(sessions, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_detail(request, pk):
    try:
        session = request.user.sessions.select_related('feedback').prefetch_related('exercises').get(pk=pk)
    except Session.DoesNotExist:
        return Response({'error': 'Sesión no encontrada'}, status=status.HTTP_404_NOT_FOUND)
    return Response(SessionDetailSerializer(session).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_feedback(request, pk):
    try:
        session = request.user.sessions.get(pk=pk)
    except Session.DoesNotExist:
        return Response({'error': 'Sesión no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    if hasattr(session, 'feedback'):
        return Response({'error': 'Esta sesión ya tiene feedback'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = SessionFeedbackSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    feedback = serializer.save(session=session)

    _actualizar_racha(request.user)
    _check_logros(request.user)
    _actualizar_adaptation_profile(request.user, session, feedback)

    return Response(SessionFeedbackSerializer(feedback).data, status=status.HTTP_201_CREATED)


def _actualizar_racha(user):
    try:
        profile = user.profile
    except Exception:
        return

    hoy = date.today()
    racha = 0
    dia = hoy

    for _ in range(365):
        tiene = user.sessions.filter(fecha=dia, feedback__isnull=False).exists()
        if not tiene:
            if dia == hoy:
                dia -= timedelta(days=1)
                tiene = user.sessions.filter(fecha=dia, feedback__isnull=False).exists()
                if not tiene:
                    break
            else:
                break
        racha += 1
        dia -= timedelta(days=1)

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
        for nombre in ejercicios_sesion:
            # Try to find the exercise in the DB to get its patron_movimiento
            patron = ''
            try:
                db_exercise = Exercise.objects.filter(
                    nombre__icontains=nombre, activo=True
                ).first()
                if db_exercise:
                    patron = db_exercise.patron_movimiento
            except Exception:
                pass

            ep, _ = UserExerciseProfile.objects.get_or_create(
                user=user,
                exercise_nombre=nombre,
                defaults={'patron_movimiento': patron},
            )

            n = ep.veces_realizado
            # Running average formula: new_avg = old_avg + (new_val - old_avg) / (n + 1)
            def running_avg(old_val, new_val, count):
                if old_val is None:
                    return Decimal(str(new_val))
                return old_val + (Decimal(str(new_val)) - old_val) / (count + 1)

            ep.rpe_promedio_real = running_avg(ep.rpe_promedio_real, float(feedback.rpe_real), n)
            ep.rpe_promedio_target = running_avg(ep.rpe_promedio_target, float(session.rpe_target), n)
            ep.cumplimiento_promedio = running_avg(ep.cumplimiento_promedio, float(feedback.cumplimiento), n)
            ep.rating_promedio = running_avg(ep.rating_promedio, float(feedback.rating), n)
            ep.veces_realizado = n + 1
            ep.ultima_vez = session.fecha
            if not ep.patron_movimiento and patron:
                ep.patron_movimiento = patron
            ep.save()

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
        rpe_bias = None
        if agg['rpe_real_avg'] is not None and agg['rpe_target_avg'] is not None:
            rpe_bias = round(agg['rpe_real_avg'] - agg['rpe_target_avg'], 2)

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

        # patron_preferido: most frequent patron in UserExerciseProfile (by veces_realizado)
        patron_preferido = ''
        patron_counts = {}
        for ep in UserExerciseProfile.objects.filter(user=user).exclude(patron_movimiento=''):
            p = ep.patron_movimiento
            patron_counts[p] = patron_counts.get(p, 0) + ep.veces_realizado
        if patron_counts:
            patron_preferido = max(patron_counts, key=patron_counts.get)

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
        adaptation.total_sesiones = total_sesiones
        adaptation.rpe_bias = rpe_bias
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


def _generar_insight_entrenador(user):
    from datetime import date, timedelta
    from collections import defaultdict
    from django.db.models import Avg
    hoy = date.today()

    # Requires ≥7 days since first session
    primera = user.sessions.order_by('fecha').first()
    if not primera or (hoy - primera.fecha).days < 7:
        return None

    # Return today's cached insight if it exists
    try:
        cached = DailyCoachInsight.objects.get(user=user, fecha=hoy)
        return cached.texto
    except DailyCoachInsight.DoesNotExist:
        pass

    hace_7  = hoy - timedelta(days=7)
    hace_14 = hoy - timedelta(days=14)
    hace_30 = hoy - timedelta(days=30)

    sesiones_fb = user.sessions.filter(feedback__isnull=False).select_related('feedback')

    rpe_s   = sesiones_fb.filter(fecha__gte=hace_7).aggregate(avg=Avg('feedback__rpe_real'))['avg']
    rpe_a   = sesiones_fb.filter(fecha__gte=hace_14, fecha__lt=hace_7).aggregate(avg=Avg('feedback__rpe_real'))['avg']
    cum_s   = sesiones_fb.filter(fecha__gte=hace_7).aggregate(avg=Avg('feedback__cumplimiento'))['avg']
    cum_a   = sesiones_fb.filter(fecha__gte=hace_14, fecha__lt=hace_7).aggregate(avg=Avg('feedback__cumplimiento'))['avg']

    # Day-of-week RPE pattern (last 30 days)
    day_rpe: dict = defaultdict(list)
    for s in sesiones_fb.filter(fecha__gte=hace_30):
        day_rpe[s.fecha.weekday()].append(float(s.feedback.rpe_real))
    day_names = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
    day_analysis = {
        day_names[d]: round(sum(v) / len(v), 1)
        for d, v in day_rpe.items() if len(v) >= 2
    }

    # Weekly volume (last 4 weeks, oldest first)
    sessions_by_week = []
    for i in range(4, 0, -1):
        inicio = hoy - timedelta(weeks=i)
        fin    = hoy - timedelta(weeks=i - 1)
        sessions_by_week.append(user.sessions.filter(fecha__gte=inicio, fecha__lt=fin).count())

    ultimas_72 = user.sessions.filter(fecha__gte=hoy - timedelta(days=3)).count()

    try:
        profile = user.profile
        racha = profile.racha_actual
        objetivo = profile.objetivo or ''
        dias_objetivo = profile.dias_semana or 3
    except Exception:
        racha, objetivo, dias_objetivo = 0, '', 3

    total_sesiones = user.sessions.count()

    ctx_lines = [
        f'Total sesiones: {total_sesiones}',
        f'Racha actual: {racha} días',
        f'Objetivo: {objetivo}' if objetivo else None,
        f'Días objetivo/semana: {dias_objetivo}',
        f'Sesiones últimas 4 semanas (más antigua primero): {sessions_by_week}',
        f'RPE promedio esta semana: {round(float(rpe_s), 1)}' if rpe_s is not None else None,
        f'RPE promedio semana anterior: {round(float(rpe_a), 1)}' if rpe_a is not None else None,
        f'Cumplimiento esta semana: {round(float(cum_s), 1)}%' if cum_s is not None else None,
        f'Cumplimiento semana anterior: {round(float(cum_a), 1)}%' if cum_a is not None else None,
        f'Sesiones en últimas 72h: {ultimas_72}',
        f'RPE promedio por día (últimos 30 días, solo días con ≥2 sesiones): {day_analysis}' if day_analysis else None,
    ]
    contexto = '. '.join(line for line in ctx_lines if line)

    prompt = f"""Eres el entrenador IA de una app de fitness. Analiza los datos de este atleta y genera exactamente UN insight específico, accionable y basado en datos reales.

Datos:
{contexto}

Reglas:
- Referencia números concretos del contexto — nunca seas genérico.
- Máximo 2 oraciones. Directo. Sin rodeos.
- Detecta uno de estos patrones si existe: tendencia de RPE, fatiga acumulada, día de bajo rendimiento, mejora de consistencia, riesgo de sobreentrenamiento, racha positiva, volumen decreciente.
- Tono: directo, técnico, alentador sin ser condescendiente.
- Sin emojis. Sin mencionar "la app" ni "el sistema".
- Responde ÚNICAMENTE con el texto del insight, sin comillas ni prefijos."""

    try:
        import groq
        from django.conf import settings
        client = groq.Groq(api_key=settings.GROQ_API_KEY)
        resp = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=100,
            temperature=0.6,
        )
        texto = resp.choices[0].message.content.strip().strip('"').strip("'")
        if texto:
            DailyCoachInsight.objects.update_or_create(
                user=user, fecha=hoy, defaults={'texto': texto}
            )
            return texto
    except Exception:
        pass

    return None


def _metrica_destacada(user, racha, dias_semana_objetivo, total_sesiones=0):
    from datetime import date, timedelta
    from django.db.models import Avg
    if total_sesiones < 3:
        return None
    hoy = date.today()
    hace_7  = hoy - timedelta(days=7)
    hace_14 = hoy - timedelta(days=14)
    hace_30 = hoy - timedelta(days=30)

    # ── Prioridad 1: RPE trend (requiere ≥2 semanas con feedback) ────────────
    rpe_s = (user.sessions
             .filter(fecha__gte=hace_7, feedback__isnull=False)
             .aggregate(avg=Avg('feedback__rpe_real'))['avg'])
    rpe_a = (user.sessions
             .filter(fecha__gte=hace_14, fecha__lt=hace_7, feedback__isnull=False)
             .aggregate(avg=Avg('feedback__rpe_real'))['avg'])

    if rpe_s is not None and rpe_a is not None:
        rs = round(float(rpe_s), 1)
        ra = round(float(rpe_a), 1)
        diff = round(rs - ra, 1)
        if diff > 0.3:
            desc = f'↑ {abs(diff)} vs semana anterior · Carga en aumento'
            tendencia = 'up'
        elif diff < -0.3:
            desc = f'↓ {abs(diff)} vs semana anterior · Buena recuperación'
            tendencia = 'down'
        else:
            desc = 'Estable · Carga consistente semana a semana'
            tendencia = 'neutral'
        return {
            'tipo': 'rpe', 'label': 'RPE PROMEDIO',
            'valor': rs, 'valor_display': str(rs), 'unidad': '/ 10',
            'descripcion': desc, 'progreso_pct': min(100, int(rs / 10 * 100)),
            'tendencia': tendencia,
        }

    # ── Prioridad 2: Consistencia mensual (requiere ≥14 días activos) ────────
    primera = user.sessions.order_by('fecha').first()
    if primera and (hoy - primera.fecha).days >= 14:
        sesiones_mes = user.sessions.filter(fecha__gte=hace_30).count()
        planificadas = max(1, round(30 / 7 * dias_semana_objetivo))
        pct = min(100, int(sesiones_mes / planificadas * 100))
        if pct >= 90:
            desc = f'{sesiones_mes} de {planificadas} sesiones · Excelente adherencia'
        elif pct >= 70:
            desc = f'{sesiones_mes} de {planificadas} sesiones · Buen ritmo'
        else:
            desc = f'{sesiones_mes} de {planificadas} sesiones · Hay margen para mejorar'
        tendencia = 'up' if pct >= 80 else ('down' if pct < 60 else 'neutral')
        return {
            'tipo': 'consistencia', 'label': 'CONSISTENCIA MENSUAL',
            'valor': pct, 'valor_display': f'{pct}', 'unidad': '%',
            'descripcion': desc, 'progreso_pct': pct, 'tendencia': tendencia,
        }

    # ── Prioridad 3: Progreso de carga (requiere ≥10 sesiones con feedback) ──
    total = user.sessions.count()
    if total >= 10:
        rpes = list(user.sessions
                    .filter(feedback__isnull=False)
                    .order_by('-fecha', '-created_at')
                    .values_list('feedback__rpe_real', flat=True)[:10])
        if len(rpes) >= 10:
            rec = sum(float(r) for r in rpes[:5]) / 5
            prev = sum(float(r) for r in rpes[5:]) / 5
            pct = min(100, max(0, int((rec - 5) / 5 * 100)))
            tendencia = 'up' if rec > prev + 0.3 else ('down' if rec < prev - 0.3 else 'neutral')
            return {
                'tipo': 'progreso', 'label': 'PROGRESO DE CARGA',
                'valor': round(rec, 1), 'valor_display': str(round(rec, 1)), 'unidad': 'RPE',
                'descripcion': f'Promedio últimas 5 sesiones · {total} sesiones totales',
                'progreso_pct': pct, 'tendencia': tendencia,
            }

    # ── Prioridad 4: Racha actual (fallback siempre disponible) ──────────────
    pct = min(100, int(racha / 30 * 100))
    if racha == 0:
        desc = 'Empieza hoy para iniciar tu racha'
    elif racha < 3:
        desc = f'{racha} día{"s" if racha > 1 else ""} · El hábito se construye de a uno'
    elif racha < 7:
        desc = f'Llevas {racha} días · Sigue hasta completar una semana'
    elif racha < 14:
        desc = f'{racha} días consecutivos · Una semana completa superada'
    elif racha < 30:
        desc = f'{racha} días · Ya es un hábito real'
    else:
        desc = f'{racha} días consecutivos · Nivel élite de consistencia'
    return {
        'tipo': 'racha', 'label': 'RACHA ACTUAL',
        'valor': racha, 'valor_display': str(racha), 'unidad': 'días',
        'descripcion': desc, 'progreso_pct': pct,
        'tendencia': 'up' if racha > 0 else 'neutral',
    }


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


def _semana_detalle(user, dias_semana_objetivo, cta_titulo):
    from datetime import date, timedelta
    hoy = date.today()
    lunes = hoy - timedelta(days=hoy.weekday())  # Monday of current week
    domingo = lunes + timedelta(days=6)

    sesiones_map = {
        str(s.fecha): s
        for s in user.sessions.filter(fecha__gte=lunes, fecha__lte=domingo)
    }

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
                s = sesiones_map[fecha_str]
                tipo = _tipo_corto(s.respuesta_ia.get('titulo', '') if s.respuesta_ia else '')
                detalle.append({'fecha': fecha_str, 'dia_abbr': abbr, 'estado': 'entrenado', 'tipo_sesion': tipo, 'is_today': False})
            else:
                detalle.append({'fecha': fecha_str, 'dia_abbr': abbr, 'estado': 'vacio', 'tipo_sesion': None, 'is_today': False})

        elif is_today:
            if fecha_str in sesiones_map:
                s = sesiones_map[fecha_str]
                tipo = _tipo_corto(s.respuesta_ia.get('titulo', '') if s.respuesta_ia else '')
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


def _cta_sugerido(user, total_sesiones, fatiga_pct):
    from datetime import date
    hoy = date.today()

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

    # Estado B — ya entrenó hoy
    sesion_hoy = user.sessions.filter(fecha=hoy).select_related('feedback').first()
    if sesion_hoy:
        cumplimiento = getattr(getattr(sesion_hoy, 'feedback', None), 'cumplimiento', None)
        desc = f'{round(cumplimiento)}% de cumplimiento' if cumplimiento is not None else 'Sesión registrada'
        return {
            'estado': 'B',
            'pill_label': 'Ya entrenaste hoy',
            'pill_color': 'neutral',
            'titulo': sesion_hoy.respuesta_ia.get('titulo', 'Sesión completada') if sesion_hoy.respuesta_ia else 'Sesión completada',
            'descripcion': desc,
            'sesion_hoy_id': sesion_hoy.id,
        }

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


def _generar_saludo(nombre, total_sesiones, racha, ultima_titulo, ultima_fecha, cumplimiento_prom):
    try:
        import groq, json
        from django.conf import settings
        client = groq.Groq(api_key=settings.GROQ_API_KEY)

        ctx_parts = [f'Nombre: {nombre}', f'Total sesiones: {total_sesiones}', f'Racha actual: {racha} días']
        if ultima_titulo and ultima_fecha:
            ctx_parts.append(f'Última sesión: "{ultima_titulo}" el {ultima_fecha}')
        if cumplimiento_prom:
            ctx_parts.append(f'Cumplimiento promedio esta semana: {round(cumplimiento_prom)}%')
        contexto = '. '.join(ctx_parts)

        prompt = f"""Genera un saludo de dashboard para una app de fitness adaptativa con IA.

Contexto: {contexto}

Reglas estrictas:
- Si total_sesiones == 0: bienvenida cálida con el nombre, sin referencias a historial.
- Si total_sesiones < 7: referencia la última sesión o el comienzo del hábito. Nada más.
- Si total_sesiones >= 7: puede referenciar racha, patrón semanal o logro reciente.
- saludo: máximo 2 líneas, usa el nombre directamente, tono directo y personal, sin clichés ni emojis.
- insight: máximo 1 oración sobre descanso, consistencia, sugerencia del día o advertencia de fatiga.
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_dashboard(request):
    hoy = date.today()
    hace_7 = hoy - timedelta(days=7)
    hace_14 = hoy - timedelta(days=14)

    sesiones_semana = request.user.sessions.filter(fecha__gte=hace_7)
    sesiones_semana_ant = request.user.sessions.filter(fecha__gte=hace_14, fecha__lt=hace_7)

    total_semana = sesiones_semana.count()
    total_ant = sesiones_semana_ant.count()

    con_feedback = sesiones_semana.filter(feedback__isnull=False)
    cumplimiento_prom = con_feedback.aggregate(avg=Avg('feedback__cumplimiento'))['avg'] or 0

    hace_72h = hoy - timedelta(days=3)
    ultimas_72 = request.user.sessions.filter(fecha__gte=hace_72h).count()
    fatiga_pct = min(100, ultimas_72 * 33)

    dias_entrenados_qs = sesiones_semana.values_list('fecha', flat=True).distinct()
    dias_entrenados = [str(d) for d in dias_entrenados_qs]
    try:
        dias_objetivo = request.user.profile.dias_semana or 3
    except Exception:
        dias_objetivo = 3
    volumen_pct = min(100, int(len(dias_entrenados) / dias_objetivo * 100))

    ultimas_3 = request.user.sessions.select_related('feedback').order_by('-fecha', '-created_at')[:3]

    try:
        profile = request.user.profile
        racha = profile.racha_actual
        nivel = profile.nivel_label
        nombre = profile.nombre
        puntos = profile.puntos_totales
    except Exception:
        racha = 0
        nivel = 'Rookie'
        nombre = request.user.email.split('@')[0]
        puntos = 0

    total_sesiones = request.user.sessions.count()
    ultima = request.user.sessions.order_by('-fecha', '-created_at').first()
    ultima_titulo = ultima.respuesta_ia.get('titulo', '') if ultima and ultima.respuesta_ia else ''
    ultima_fecha = str(ultima.fecha) if ultima else ''

    saludo, insight = _generar_saludo(nombre, total_sesiones, racha, ultima_titulo, ultima_fecha, cumplimiento_prom)
    cta = _cta_sugerido(request.user, total_sesiones, fatiga_pct)
    semana_detalle = _semana_detalle(request.user, dias_objetivo, cta.get('titulo', ''))
    metrica = _metrica_destacada(request.user, racha, dias_objetivo, total_sesiones)
    insight_entrenador = _generar_insight_entrenador(request.user)

    if not saludo:
        if total_sesiones == 0:
            saludo = f'Bienvenido, {nombre}. Todo empieza aquí.'
            insight = 'Completa tu primer entrenamiento para que la IA empiece a conocerte.'
        elif racha >= 3:
            saludo = f'Llevas {racha} días seguidos, {nombre}.'
            insight = 'La consistencia es el mejor entrenamiento.'
        else:
            saludo = f'Hola, {nombre}. ¿Listo para hoy?'
            insight = 'Cada sesión es un punto de datos más para la IA.'

    return Response({
        'nombre': nombre,
        'semana_actual': total_semana,
        'semana_anterior': total_ant,
        'cumplimiento_promedio': round(cumplimiento_prom, 1),
        'fatiga_porcentaje': fatiga_pct,
        'volumen_porcentaje': volumen_pct,
        'dias_entrenados': dias_entrenados,
        'racha_actual': racha,
        'nivel': nivel,
        'puntos_totales': puntos,
        'total_sesiones': total_sesiones,
        'ultimas_sesiones': SessionListSerializer(ultimas_3, many=True).data,
        'saludo': saludo,
        'insight': insight,
        'cta': cta,
        'semana_detalle': semana_detalle,
        'metrica': metrica,
        'insight_entrenador': insight_entrenador,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_full(request):
    hoy = date.today()
    hace_4_semanas = hoy - timedelta(weeks=4)
    hace_7 = hoy - timedelta(days=7)
    hace_14 = hoy - timedelta(days=14)
    hace_72h = hoy - timedelta(days=3)

    # ── rpe_historico: flat list of rpe_real floats (last 4 weeks) ──────────
    sesiones_con_feedback = (
        request.user.sessions
        .filter(fecha__gte=hace_4_semanas, feedback__isnull=False)
        .select_related('feedback')
        .order_by('fecha')
    )
    rpe_historico = [float(s.feedback.rpe_real) for s in sesiones_con_feedback]

    # ── cumplimiento_semanal: labels S-4..S-1 (oldest first) ────────────────
    cumplimiento_semanal = []
    for i in range(4, 0, -1):
        inicio = hoy - timedelta(weeks=i)
        fin = hoy - timedelta(weeks=i - 1)
        sems = request.user.sessions.filter(fecha__gte=inicio, fecha__lt=fin)
        cum = sems.filter(feedback__isnull=False).aggregate(avg=Avg('feedback__cumplimiento'))['avg'] or 0
        cumplimiento_semanal.append({
            'label': f'S-{i}',
            'sesiones': sems.count(),
            'cumplimiento': round(cum, 1),
        })

    # ── fatiga_porcentaje ────────────────────────────────────────────────────
    ultimas_72 = request.user.sessions.filter(fecha__gte=hace_72h).count()
    fatiga_porcentaje = min(100, ultimas_72 * 33)

    # ── volumen_porcentaje ───────────────────────────────────────────────────
    sesiones_semana_qs = request.user.sessions.filter(fecha__gte=hace_7)
    dias_entrenados = sesiones_semana_qs.values_list('fecha', flat=True).distinct().count()
    try:
        dias_objetivo = request.user.profile.dias_semana or 3
    except Exception:
        dias_objetivo = 3
    volumen_porcentaje = min(100, int(dias_entrenados / dias_objetivo * 100))

    # ── sesiones counts ──────────────────────────────────────────────────────
    sesiones_esta_semana = sesiones_semana_qs.count()
    sesiones_semana_anterior = request.user.sessions.filter(fecha__gte=hace_14, fecha__lt=hace_7).count()

    # ── profile fields ───────────────────────────────────────────────────────
    try:
        profile = request.user.profile
        racha_actual = profile.racha_actual
        nivel = profile.nivel_label
        puntos_totales = profile.puntos_totales
        logros = profile.logros
    except Exception:
        racha_actual = 0
        nivel = 'Rookie'
        puntos_totales = 0
        logros = []

    # ── alertas (with emoji field) ───────────────────────────────────────────
    alertas = []
    if ultimas_72 >= 3:
        alertas.append({
            'tipo': 'warning',
            'emoji': '⚠️',
            'mensaje': 'Alto volumen en 72h — considera un día de recuperación activa',
        })
    rpe_bajo = sesiones_semana_qs.filter(feedback__rpe_real__lt=5).count()
    if rpe_bajo >= 2:
        alertas.append({
            'tipo': 'info',
            'emoji': '💡',
            'mensaje': 'RPE consistentemente bajo — puedes incrementar la intensidad',
        })

    # ── series_por_semana ────────────────────────────────────────────────────
    sesiones_semana_con_ia = sesiones_semana_qs.exclude(respuesta_ia__isnull=True)
    series_por_semana = 0
    for s in sesiones_semana_con_ia:
        for fase in (s.respuesta_ia or {}).get('fases', []):
            for ej in fase.get('ejercicios', []):
                try:
                    series_por_semana += int(ej.get('series', 0))
                except (TypeError, ValueError):
                    pass

    # ── distribucion_foco (last 4 weeks of checkins) ────────────────────────
    distribucion_foco = []
    try:
        from checkins.models import DailyCheckin
        hace_4_sem = hoy - timedelta(weeks=4)
        checkins = DailyCheckin.objects.filter(
            user=request.user, fecha__gte=hace_4_sem
        ).exclude(foco_entrenamiento__isnull=True)
        foco_counter: Counter = Counter()
        for ci in checkins:
            for foco in (ci.foco_entrenamiento or []):
                if foco:
                    foco_counter[foco] += 1
        total_foco = sum(foco_counter.values())
        if total_foco > 0:
            distribucion_foco = [
                {'nombre': nombre, 'porcentaje': round(cnt / total_foco * 100)}
                for nombre, cnt in foco_counter.most_common()
            ]
    except Exception:
        distribucion_foco = []

    # ── adaptacion block ─────────────────────────────────────────────────────
    adaptacion = None
    try:
        ap = UserAdaptationProfile.objects.get(user=request.user)

        tiene_datos = ap.total_sesiones >= 3

        # rpe_bias_label
        rpe_bias_label = None
        if ap.rpe_bias is not None:
            bias = float(ap.rpe_bias)
            if bias > 0.5:
                rpe_bias_label = f'Percibes el esfuerzo {bias:+.1f} pts por encima del objetivo'
            elif bias < -0.5:
                rpe_bias_label = f'Percibes el esfuerzo {abs(bias):.1f} pts por debajo del objetivo'
            else:
                rpe_bias_label = 'Percepción del esfuerzo bien calibrada'

        # ejercicios_top: top 5 with veces >= 2
        exercise_profiles = (
            UserExerciseProfile.objects
            .filter(user=request.user, veces_realizado__gte=2)
            .order_by('-veces_realizado')[:5]
        )
        ejercicios_top = [
            {
                'nombre': ep.exercise_nombre,
                'veces': ep.veces_realizado,
                'cumplimiento': float(ep.cumplimiento_promedio) if ep.cumplimiento_promedio is not None else None,
                'patron': ep.patron_movimiento,
            }
            for ep in exercise_profiles
        ]

        # ejercicios_mejora: cumplimiento < 65 and veces >= 3, up to 3
        ejercicios_mejora_qs = (
            UserExerciseProfile.objects
            .filter(user=request.user, veces_realizado__gte=3, cumplimiento_promedio__lt=65)
            .order_by('cumplimiento_promedio')[:3]
        )
        ejercicios_mejora = [
            {
                'nombre': ep.exercise_nombre,
                'veces': ep.veces_realizado,
                'cumplimiento': float(ep.cumplimiento_promedio) if ep.cumplimiento_promedio is not None else None,
            }
            for ep in ejercicios_mejora_qs
        ]

        # patron_distribucion: sorted by total veces desc
        patron_counter: Counter = Counter()
        for ep in UserExerciseProfile.objects.filter(user=request.user).exclude(patron_movimiento=''):
            patron_counter[ep.patron_movimiento] += ep.veces_realizado
        patron_distribucion = [
            {'patron': patron, 'veces': veces}
            for patron, veces in patron_counter.most_common()
        ]

        # mesociclo via ai_workout
        from ai_workout.views import _calcular_estado_mesociclo
        mesociclo = _calcular_estado_mesociclo(request.user)

        adaptacion = {
            'tiene_datos': tiene_datos,
            'total_sesiones': ap.total_sesiones,
            'rpe_bias': float(ap.rpe_bias) if ap.rpe_bias is not None else None,
            'rpe_bias_label': rpe_bias_label,
            'cumplimiento_promedio': float(ap.cumplimiento_promedio) if ap.cumplimiento_promedio is not None else None,
            'rating_promedio': float(ap.rating_promedio) if ap.rating_promedio is not None else None,
            'volumen_tolerado_semana': ap.volumen_tolerado_semana,
            'patron_preferido': ap.patron_preferido,
            'semanas_carga_consecutivas': ap.semanas_carga_consecutivas,
            'ejercicios_top': ejercicios_top,
            'ejercicios_mejora': ejercicios_mejora,
            'patron_distribucion': patron_distribucion,
            'mesociclo': mesociclo,
        }
    except UserAdaptationProfile.DoesNotExist:
        adaptacion = {'tiene_datos': False}
    except Exception:
        adaptacion = {'tiene_datos': False}

    return Response({
        'rpe_historico': rpe_historico,
        'cumplimiento_semanal': cumplimiento_semanal,
        'fatiga_porcentaje': fatiga_porcentaje,
        'volumen_porcentaje': volumen_porcentaje,
        'sesiones_esta_semana': sesiones_esta_semana,
        'sesiones_semana_anterior': sesiones_semana_anterior,
        'racha_actual': racha_actual,
        'nivel': nivel,
        'puntos_totales': puntos_totales,
        'logros': logros,
        'alertas': alertas,
        'series_por_semana': series_por_semana,
        'distribucion_foco': distribucion_foco,
        'adaptacion': adaptacion,
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

    prompt = f"""Eres el entrenador IA de una app de fitness adaptativa. Con los siguientes datos del atleta, escribe UN párrafo corto que describe su perfil de entrenamiento. Máximo 3 oraciones.

Datos analizados:
{contexto}

Reglas:
- Máximo 3 oraciones. Texto fluido, no lista.
- Cada oración refiere un dato concreto del contexto.
- Estructura guía: "Entrenas mejor los [día]. Tu rendimiento es más alto en [tipo]. Operas principalmente en intensidad [rango]."
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
            max_tokens=120,
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

    return Response({
        'semanas_activas': semanas_activas,
        'consistencia_30d': consistencia_30d,
        'sesiones_mes': sesiones_mes,
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
    'fuerza':    ['serio'],
    'cardio':    ['descargar'],
    'movilidad': ['recuperar', 'moverme'],
}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_rpe_semanal(request):
    """
    Weekly RPE averages from registration week to current week.
    Query param: ?filtro=todo|fuerza|cardio|movilidad
    Uses feedback.rpe_real when available, falls back to session.rpe_target.
    """
    user = request.user
    filtro = request.GET.get('filtro', 'todo')
    hoy = date.today()
    fecha_registro = user.date_joined.date()
    semanas_entrenando = max(1, (hoy - fecha_registro).days // 7 + 1)

    sesiones = (
        user.sessions
        .select_related('feedback', 'checkin')
        .filter(fecha__gte=fecha_registro)
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

    # Group RPE by week number (1-indexed from registration)
    rpe_por_semana: dict = defaultdict(list)
    for s in sesiones:
        week_num = (s.fecha - fecha_registro).days // 7 + 1
        rpe = (
            float(s.feedback.rpe_real)
            if s.feedback and s.feedback.rpe_real is not None
            else float(s.rpe_target)
        )
        rpe_por_semana[week_num].append(rpe)

    semanas = [
        {
            'semana_num': w,
            'label': f'Sem {w}',
            'rpe': round(sum(rpas) / len(rpas), 1),
        }
        for w, rpas in sorted(rpe_por_semana.items())
    ]

    return Response({
        'semanas_entrenando': semanas_entrenando,
        'semanas': semanas,
        'fecha_registro_year': fecha_registro.year,
        'fecha_registro_month': fecha_registro.month,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_consistencia_mensual(request):
    """
    Day-by-day consistency heat map for a given month.
    Query params: ?year=2025&month=5
    """
    user = request.user
    today = date.today()
    year  = int(request.GET.get('year',  today.year))
    month = int(request.GET.get('month', today.month))

    # Never allow future months
    if (year, month) > (today.year, today.month):
        year, month = today.year, today.month

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
            rpe = (
                float(s.feedback.rpe_real)
                if s.feedback and s.feedback.rpe_real is not None
                else float(s.rpe_target)
            )
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
    sesiones_completadas = sum(
        1 for dia in dias if dia['intensidad'] > 0 or dia['es_descanso']
    )
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
