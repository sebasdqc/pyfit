from collections import Counter
from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Avg, Count, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Session, SessionFeedback, Competition, Exercise, UserExerciseProfile, UserAdaptationProfile
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
        'ultimas_sesiones': SessionListSerializer(ultimas_3, many=True).data,
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
