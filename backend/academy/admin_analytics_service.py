"""Métricas de gestión de la academia para los administradores.

Responde cuatro preguntas del negocio, todas acotadas al tenant efectivo del
admin (nunca mezcla organizaciones):

  1. ¿Cómo va la academia?         → resumen + cursos
  2. ¿Cómo van los estudiantes?    → crecimiento + engagement
  3. ¿Se quedan?                   → retención por cohortes semanales
  4. ¿Cuánto entra y cuánto se va? → finanzas (ingresos, MRR, churn)

Definiciones (todas se devuelven al front para que el admin las lea):
  - "Estudiante": cuenta con al menos una matrícula en un curso del tenant.
    No se cuenta toda cuenta activa: en el tenant raíz comparten tabla las
    cuentas de la app móvil, que nunca tocaron Academy.
  - "Activo": cuenta con al menos un día de estudio (`AcademyActivityDay`,
    completar lección o rendir quiz). Abrir la app no cuenta.
  - Cohorte: estudiantes cuya PRIMERA matrícula cae en una misma semana.
  - Los ingresos salen del libro `AcademyPayment` (solo confirmados), nunca del
    estado de la suscripción.

Solo agregados: no devuelve filas por estudiante.
"""

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Avg, Count, Min, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from .billing_service import MESES_POR_PLAN
from .models import (
    AcademyActivityDay, AcademyPayment, AcademySubscription, AnonymousSession,
    Certificate, Course, Enrollment, LessonProgress, QuizAttempt,
)

COHORT_WEEKS = 8
RISK_DAYS = 14
MONTHS_SERIES = 6


def _pct(num, den):
    return round(num * 100 / den) if den else 0


def _money(value):
    return float((value or Decimal('0')).quantize(Decimal('0.01')))


def _variation(current, previous):
    """Variación % contra el período anterior; None si no hay base."""
    if not previous:
        return None
    return round((current - previous) * 100 / previous)


def _monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _add_months(d: date, n: int) -> date:
    month = d.month - 1 + n
    return date(d.year + month // 12, month % 12 + 1, 1)


# ─── Consultas base (siempre acotadas al tenant) ──────────────────────────────

def _enrollments(tenant):
    return Enrollment.objects.filter(course__tenant=tenant)


def _student_ids(tenant):
    """Subconsulta SQL con los ids de estudiantes del tenant."""
    return _enrollments(tenant).values('student_id')


def _activity(tenant):
    return AcademyActivityDay.objects.filter(user_id__in=_student_ids(tenant))


# ─── Bloques ──────────────────────────────────────────────────────────────────

def _students_block(tenant, hoy, desde, dias):
    primeras = dict(
        _enrollments(tenant).values('student_id').annotate(primera=Min('created_at'))
        .values_list('student_id', 'primera')
    )
    total = len(primeras)
    nuevos = sum(1 for dt in primeras.values() if dt.date() >= desde)
    previo_desde = desde - timedelta(days=dias)
    nuevos_previo = sum(1 for dt in primeras.values() if previo_desde <= dt.date() < desde)

    # Serie diaria de nuevos estudiantes en el período.
    por_dia = defaultdict(int)
    for dt in primeras.values():
        if dt.date() >= desde:
            por_dia[dt.date()] += 1
    serie_nuevos = [
        {'fecha': (desde + timedelta(days=i)).isoformat(), 'nuevos': por_dia.get(desde + timedelta(days=i), 0)}
        for i in range((hoy - desde).days + 1)
    ]

    act_30 = _activity(tenant).filter(fecha__gte=hoy - timedelta(days=29))
    mau = act_30.values('user_id').distinct().count()
    wau = _activity(tenant).filter(fecha__gte=hoy - timedelta(days=6)).values('user_id').distinct().count()
    dau_hoy = _activity(tenant).filter(fecha=hoy).values('user_id').distinct().count()
    # DAU promedio de los últimos 30 días (días sin actividad cuentan 0).
    dau_prom = act_30.count() / 30 if mau else 0

    # Con matrícula activa y sin estudiar hace RISK_DAYS días o más.
    activos_recientes = _activity(tenant).filter(
        fecha__gte=hoy - timedelta(days=RISK_DAYS - 1),
    ).values('user_id')
    en_riesgo = (
        _enrollments(tenant).filter(estado=Enrollment.ESTADO_ACTIVA)
        .exclude(student_id__in=activos_recientes)
        .values('student_id').distinct().count()
    )

    lecciones = LessonProgress.objects.filter(
        enrollment__course__tenant=tenant, completado_at__date__gte=desde,
    ).count()
    intentos = QuizAttempt.objects.filter(enrollment__course__tenant=tenant, created_at__date__gte=desde)
    intentos_total = intentos.count()
    intentos_ok = intentos.filter(aprobado=True).count()

    return primeras, {
        'total': total,
        'nuevos': nuevos,
        'nuevos_variacion': _variation(nuevos, nuevos_previo),
        'activos_hoy': dau_hoy,
        'activos_7d': wau,
        'activos_30d': mau,
        'dau_promedio_30d': round(dau_prom, 1),
        'stickiness': _pct(dau_prom, mau) if mau else 0,
        'en_riesgo': en_riesgo,
        'dias_en_riesgo': RISK_DAYS,
        'lecciones_completadas': lecciones,
        'quiz_intentos': intentos_total,
        'quiz_aprobacion': _pct(intentos_ok, intentos_total),
        'serie_nuevos': serie_nuevos,
    }


def _overview_block(tenant, desde, students_total):
    enr = _enrollments(tenant)
    total = enr.count()
    completadas = enr.filter(estado=Enrollment.ESTADO_COMPLETADA).count()
    cursos = Course.objects.filter(tenant=tenant)
    anon = None
    if tenant is None:
        # Las sesiones anónimas no tienen tenant: solo tienen sentido en el raíz.
        sesiones = AnonymousSession.objects.filter(created_at__date__gte=desde)
        anon = {
            'sesiones': sesiones.count(),
            'convertidas': sesiones.filter(migrada_en__isnull=False).count(),
        }
        anon['conversion'] = _pct(anon['convertidas'], anon['sesiones'])
    return {
        'estudiantes': students_total,
        'cursos_publicados': cursos.filter(publicado=True).count(),
        'matriculas': total,
        'matriculas_periodo': enr.filter(created_at__date__gte=desde).count(),
        'completadas': completadas,
        'tasa_finalizacion': _pct(completadas, total),
        'progreso_promedio': round(enr.aggregate(p=Avg('progreso'))['p'] or 0),
        'certificados_periodo': Certificate.objects.filter(
            enrollment__course__tenant=tenant, emitido_at__date__gte=desde,
        ).count(),
        'visitantes_anonimos': anon,
    }


def _courses_block(tenant):
    cursos = list(
        Course.objects.filter(tenant=tenant, publicado=True)
        .annotate(
            matriculas=Count('enrollments'),
            completadas=Count('enrollments', filter=Q(enrollments__estado=Enrollment.ESTADO_COMPLETADA)),
            progreso=Avg('enrollments__progreso'),
        )
        .values('id', 'titulo', 'matriculas', 'completadas', 'progreso')
    )
    intentos = {
        row['enrollment__course_id']: row
        for row in QuizAttempt.objects.filter(enrollment__course__tenant=tenant)
        .values('enrollment__course_id')
        .annotate(total=Count('id'), aprobados=Count('id', filter=Q(aprobado=True)))
    }
    filas = []
    for c in cursos:
        q = intentos.get(c['id'], {'total': 0, 'aprobados': 0})
        filas.append({
            'id': c['id'],
            'titulo': c['titulo'],
            'matriculas': c['matriculas'],
            'completadas': c['completadas'],
            'tasa_finalizacion': _pct(c['completadas'], c['matriculas']),
            'progreso_promedio': round(c['progreso'] or 0),
            'quiz_intentos': q['total'],
            'quiz_aprobacion': _pct(q['aprobados'], q['total']),
        })
    filas.sort(key=lambda f: (-f['matriculas'], f['titulo']))
    return {
        'filas': filas[:15],
        'total_publicados': len(filas),
        'sin_matriculas': sum(1 for f in filas if f['matriculas'] == 0),
    }


def _retention_block(tenant, primeras, hoy):
    inicio_primera = _monday(hoy) - timedelta(weeks=COHORT_WEEKS - 1)
    cohortes = defaultdict(list)  # lunes de la semana → ids
    for user_id, dt in primeras.items():
        lunes = _monday(dt.date())
        if lunes >= inicio_primera:
            cohortes[lunes].append(user_id)

    ids = [uid for users in cohortes.values() for uid in users]
    actividad = defaultdict(set)  # user_id → fechas con estudio
    if ids:
        for uid, fecha in AcademyActivityDay.objects.filter(
            user_id__in=ids, fecha__gte=inicio_primera,
        ).values_list('user_id', 'fecha'):
            actividad[uid].add(fecha)

    filas = []
    semana_1 = []
    for i in range(COHORT_WEEKS):
        lunes = inicio_primera + timedelta(weeks=i)
        usuarios = cohortes.get(lunes, [])
        max_offset = (_monday(hoy) - lunes).days // 7
        retencion = []
        for k in range(max_offset + 1):
            ini = lunes + timedelta(weeks=k)
            fin = ini + timedelta(days=6)
            activos = sum(1 for u in usuarios if any(ini <= f <= fin for f in actividad.get(u, ())))
            retencion.append(_pct(activos, len(usuarios)) if usuarios else None)
        if usuarios and max_offset >= 1 and retencion[1] is not None:
            semana_1.append(retencion[1])
        filas.append({'semana': lunes.isoformat(), 'tamano': len(usuarios), 'retencion': retencion})

    return {
        'cohortes': filas,
        'semanas': COHORT_WEEKS,
        'retencion_semana_1': round(sum(semana_1) / len(semana_1)) if semana_1 else None,
    }


def _finance_block(tenant, hoy, desde, dias):
    pagos = AcademyPayment.objects.filter(tenant=tenant, estado=AcademyPayment.ESTADO_CONFIRMADO)
    previo_desde = desde - timedelta(days=dias)

    def suma(qs):
        return qs.aggregate(t=Sum('monto'))['t'] or Decimal('0')

    ingresos = suma(pagos.filter(fecha_pago__gte=desde, fecha_pago__lte=hoy))
    ingresos_previo = suma(pagos.filter(fecha_pago__gte=previo_desde, fecha_pago__lt=desde))
    mes_actual = date(hoy.year, hoy.month, 1)
    mes_prev = _add_months(mes_actual, -1)

    # Serie mensual (los últimos MONTHS_SERIES meses, con ceros).
    inicio_serie = _add_months(mes_actual, -(MONTHS_SERIES - 1))
    por_mes = {
        r['mes'].date() if hasattr(r['mes'], 'date') else r['mes']: r
        for r in pagos.filter(fecha_pago__gte=inicio_serie)
        .annotate(mes=TruncMonth('fecha_pago')).values('mes')
        .annotate(total=Sum('monto'), n=Count('id'))
    }
    serie = []
    for i in range(MONTHS_SERIES):
        mes = _add_months(inicio_serie, i)
        r = por_mes.get(mes)
        serie.append({'mes': mes.isoformat(), 'ingresos': _money(r['total']) if r else 0.0, 'pagos': r['n'] if r else 0})

    en_periodo = pagos.filter(fecha_pago__gte=desde, fecha_pago__lte=hoy)
    por_metodo = [
        {'metodo': r['metodo'], 'pagos': r['n'], 'ingresos': _money(r['total'])}
        for r in en_periodo.values('metodo').annotate(n=Count('id'), total=Sum('monto')).order_by('-total')
    ]
    por_plan = [
        {'plan': r['plan_tipo'], 'pagos': r['n'], 'ingresos': _money(r['total'])}
        for r in en_periodo.values('plan_tipo').annotate(n=Count('id'), total=Sum('monto')).order_by('-total')
    ]

    # Altas = primer pago de la historia dentro del período; renovaciones = el resto.
    primer_pago = dict(
        pagos.exclude(user__isnull=True).values('user_id').annotate(p=Min('fecha_pago')).values_list('user_id', 'p')
    )
    altas = sum(1 for p in primer_pago.values() if desde <= p <= hoy)
    pagos_periodo = en_periodo.count()
    renovaciones = max(pagos_periodo - altas, 0)

    # Estado de las suscripciones.
    subs = list(AcademySubscription.objects.filter(user__academy_tenant=tenant))
    vigentes = [s for s in subs if s.estado == AcademySubscription.ESTADO_ACTIVA and s.da_acceso_pro()]
    en_gracia = [s for s in subs if s.estado == AcademySubscription.ESTADO_CANCELADA and s.da_acceso_pro()]
    lapsadas = [s for s in subs if s.estado == AcademySubscription.ESTADO_ACTIVA and not s.da_acceso_pro()]
    bajas = sum(
        1 for s in subs
        if s.estado in (AcademySubscription.ESTADO_CANCELADA, AcademySubscription.ESTADO_VENCIDA,
                        AcademySubscription.ESTADO_PAGO_FALLIDO)
        and desde <= s.updated_at.date() <= hoy
    )

    # MRR: pago más reciente de cada suscriptor vigente normalizado a mes.
    ultimo_pago = {}
    for r in pagos.exclude(user__isnull=True).order_by('fecha_pago', 'id').values('user_id', 'monto', 'plan_tipo'):
        ultimo_pago[r['user_id']] = r
    mrr = Decimal('0')
    con_pago = 0
    for s in vigentes:
        r = ultimo_pago.get(s.user_id)
        if r:
            mrr += r['monto'] / MESES_POR_PLAN.get(r['plan_tipo'], 1)
            con_pago += 1
    activos_inicio = max(len(vigentes) + bajas - altas, 0)

    por_vencer = lambda dias_: sum(  # noqa: E731
        1 for s in vigentes if s.fecha_renovacion and hoy <= s.fecha_renovacion <= hoy + timedelta(days=dias_)
    )

    estudiantes = _enrollments(tenant).values('student_id').distinct().count()

    from promos.models import PRODUCTO_ACADEMY_PRO, SolicitudSuscripcion
    solicitudes = SolicitudSuscripcion.objects.filter(
        producto=PRODUCTO_ACADEMY_PRO, user__academy_tenant=tenant,
    )
    comisiones = solicitudes.filter(
        estado=SolicitudSuscripcion.ESTADO_CONFIRMADA, comision_pagada=False,
    ).aggregate(t=Sum('comision_influencer'))['t']

    return {
        'moneda': 'USD',
        'ingresos_periodo': _money(ingresos),
        'ingresos_variacion': _variation(ingresos, ingresos_previo),
        'ingresos_mes_actual': _money(suma(pagos.filter(fecha_pago__gte=mes_actual, fecha_pago__lte=hoy))),
        'ingresos_mes_anterior': _money(suma(pagos.filter(fecha_pago__gte=mes_prev, fecha_pago__lt=mes_actual))),
        'ingresos_historico': _money(suma(pagos)),
        'pagos_periodo': pagos_periodo,
        'mrr': _money(mrr),
        'arr': _money(mrr * 12),
        'arpu': _money(mrr / con_pago) if con_pago else 0.0,
        'suscriptores_activos': len(vigentes),
        'suscriptores_sin_pago_registrado': len(vigentes) - con_pago,
        'cancelados_con_acceso': len(en_gracia),
        'vencidos_sin_marcar': len(lapsadas),
        'altas_periodo': altas,
        'renovaciones_periodo': renovaciones,
        'bajas_periodo': bajas,
        # None = no había suscriptores al inicio: el porcentaje no se puede medir.
        'churn_aprox': _pct(bajas, activos_inicio) if activos_inicio else None,
        'conversion_a_pago': _pct(len(vigentes), estudiantes),
        'por_vencer_7d': por_vencer(7),
        'por_vencer_30d': por_vencer(30),
        'serie_mensual': serie,
        'por_metodo': por_metodo,
        'por_plan': por_plan,
        'solicitudes_pendientes': solicitudes.filter(estado=SolicitudSuscripcion.ESTADO_PENDIENTE).count(),
        'comisiones_pendientes': _money(comisiones),
    }


def build_admin_metrics(tenant, dias=30):
    """Reporte completo para el panel de gestión. `dias` ∈ {7, 30, 90}."""
    hoy = timezone.localdate()
    desde = hoy - timedelta(days=dias - 1)
    primeras, estudiantes = _students_block(tenant, hoy, desde, dias)
    return {
        'periodo': {'dias': dias, 'desde': desde.isoformat(), 'hasta': hoy.isoformat()},
        'resumen': _overview_block(tenant, desde, estudiantes['total']),
        'estudiantes': estudiantes,
        'cursos': _courses_block(tenant),
        'retencion': _retention_block(tenant, primeras, hoy),
        'finanzas': _finance_block(tenant, hoy, desde, dias),
    }
