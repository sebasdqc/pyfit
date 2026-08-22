"""Motor adaptativo de RUNNING — F2 (espejo de AdaptiveEngineService).

Decide de forma DETERMINÍSTICA: la estructura del microciclo semanal y la
re-adaptación de la sesión del día según la readiness. Reutiliza el motor de carga
ACWR del vertical Performance (performance.carga_service.athlete_carga), construyendo
la serie de sRPE diaria desde las RunSession del propio corredor.
"""
from datetime import timedelta

from django.utils import timezone

from runs.models import RunSession, PlannedRunSession
from workouts.models import Competition
from performance.carga_service import athlete_carga
from endurance import periodization, readiness, science
from . import training_science_running as ts


# Días de entrenamiento por defecto (lun=0 … dom=6), con el último = día del long run.
DEFAULT_TRAINING_DAYS = {
    1: [5], 2: [2, 5], 3: [1, 3, 5], 4: [1, 3, 5, 6],
    5: [0, 2, 3, 5, 6], 6: [0, 1, 2, 3, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6],
}

# Nº de sesiones de calidad y tipos por fase.
N_QUALITY_BY_PHASE = {'base': 1, 'build': 2, 'peak': 2, 'taper': 1, 'recovery': 0}
QUALITY_TYPES_BY_PHASE = {
    'base': ['tempo'], 'build': ['tempo', 'vo2'], 'peak': ['vo2', 'tempo'],
    'taper': ['tempo'], 'recovery': [],
}

# Dolor en zona de carga del corredor (tren inferior + columna). Dato PROPIO de
# running (ciclismo tendrá el suyo: sillín, cuello, lumbar...) — se lo inyecta
# a endurance.readiness.compute_readiness, que no sabe qué es "correr".
RUN_LOAD_PAIN_KEYWORDS = (
    'rodilla', 'tobillo', 'cadera', 'lumbar', 'espalda', 'muslo', 'pierna',
    'gemelo', 'pantorrilla', 'isquio', 'pie', 'talon', 'aquiles', 'tibial', 'planta',
)


class RunningAdaptiveEngineService:
    def __init__(self, user, perfil, runner_profile, plan, checkin=None):
        self.user = user
        self.perfil = perfil
        self.runner_profile = runner_profile
        self.plan = plan
        self.checkin = checkin

    # ─── helpers de contexto ──────────────────────────────────────────────────

    def _nivel(self) -> str:
        return getattr(self.perfil, 'nivel', None) or 'intermedio'

    def _zonas(self) -> dict:
        return self.runner_profile.zonas or {}

    def _training_days(self) -> list[int]:
        n = self.plan.dias_semana or 3
        pref = self.plan.dias_preferidos or []
        if pref and len(pref) >= n:
            return sorted({int(x) for x in pref})[:n]
        return DEFAULT_TRAINING_DAYS.get(n, DEFAULT_TRAINING_DAYS[3])

    def _competition_anchor(self, ref_date) -> dict | None:
        """Competición en los próximos 14 días (mismo criterio que el motor de fuerza)."""
        comp = (Competition.objects
                .filter(user=self.user, fecha__gte=ref_date,
                        fecha__lte=ref_date + timedelta(days=14))
                .order_by('fecha').first())
        if comp:
            return {'nombre': comp.nombre, 'fecha': comp.fecha,
                    'dias': (comp.fecha - ref_date).days}
        return None

    # ─── carga / readiness ────────────────────────────────────────────────────

    def _estimate_rpe(self, run: RunSession) -> int:
        """RPE de una RunSession: el real si existe; si no, estimado desde el ritmo
        medio vs el umbral (las free runs casi nunca traen feedback)."""
        if run.rpe_real:
            return int(run.rpe_real)
        tp = self.runner_profile.threshold_pace_s_km
        ap = run.avg_pace_s_per_km
        if tp and ap and ap > 0:
            ratio = tp / ap                       # >1 = más rápido que el umbral
            if ratio >= 1.0:
                return 9
            if ratio >= 0.95:
                return 7
            if ratio >= 0.88:
                return 5
            return 4
        return 5

    def _build_srpe_series(self, ref_date, days: int = 35) -> list[tuple]:
        """Serie (fecha, sRPE) de las RunSession completadas. sRPE = RPE × min (Foster)."""
        since = ref_date - timedelta(days=days)
        qs = RunSession.objects.filter(
            user=self.user, status='completed',
            started_at__date__gte=since, started_at__date__lte=ref_date,
        )
        loads = []
        for r in qs:
            dur_min = (r.total_duration_s or 0) / 60.0
            if dur_min <= 0:
                continue
            d = timezone.localdate(r.started_at) if timezone.is_aware(r.started_at) else r.started_at.date()
            loads.append((d, self._estimate_rpe(r) * dur_min))
        return loads

    def _carga(self, ref_date):
        return athlete_carga(self._build_srpe_series(ref_date), ref_date)

    def _realized_km_last_week(self, week_start) -> float:
        """Km REALMENTE corridos (RunSession completadas) en la semana previa. Base
        correcta para la regla del 10%: progresa sobre lo hecho, no lo planificado, y
        tras una inactividad cae a ~0 → re-entrada en volumen base (sin arrastrar un
        volumen que el atleta ya perdió)."""
        ini = week_start - timedelta(days=7)
        fin = week_start - timedelta(days=1)
        qs = RunSession.objects.filter(
            user=self.user, status='completed',
            started_at__date__gte=ini, started_at__date__lte=fin,
        )
        total_m = sum((r.total_distance_m or 0) for r in qs)
        return round(total_m / 1000.0, 1)

    def compute_readiness(self, hoy=None) -> dict:
        """Señales objetivas + subjetivas para decidir la sesión del día.
        Delega en endurance.readiness — solo inyecta el dato propio de
        running (qué palabras de dolor importan)."""
        hoy = hoy or timezone.localdate()
        carga = self._carga(hoy)
        return readiness.compute_readiness(
            carga=carga, checkin=self.checkin, pain_keywords=RUN_LOAD_PAIN_KEYWORDS)

    def adapt_today(self, planned: PlannedRunSession, signals: dict) -> dict:
        """Tabla de re-adaptación (primera regla que dispara, gana). Devuelve el tipo
        de sesión final + estado + factores para prescribe_run_session. La tabla en
        sí vive en endurance.readiness (misma para cualquier deporte de resistencia);
        acá solo se renombra `factor` → `km_factor`, el vocabulario que ya conoce
        el resto de este motor."""
        out = readiness.adapt_today(
            tipo_sesion=planned.tipo_sesion, es_calidad=planned.es_calidad,
            zona_principal=planned.zona_principal, rpe_by_zone=ts.RPE_BY_ZONE,
            signals=signals,
        )
        out['km_factor'] = out.pop('factor')
        return out

    # ─── periodización / microciclo ───────────────────────────────────────────

    def resolve_phase(self, ref_date) -> str:
        """Fase de periodización para la semana de ref_date. Delega en
        endurance.periodization — solo resuelve el booleano "hay competencia
        cerca" (running-specific: consulta workouts.Competition), la fórmula
        de fases es sport-agnostic."""
        plan = self.plan
        return periodization.resolve_phase(
            ref_date=ref_date,
            has_competition_soon=bool(self._competition_anchor(ref_date)),
            meta_fecha=plan.meta_fecha, started_at=plan.started_at,
            semana_actual=plan.semana_actual,
        )

    @staticmethod
    def _pick_quality_days(days: list[int], long_day: int, n: int, min_gap: int = 2) -> set:
        """Espaciado de días de calidad — ver endurance.science.pick_quality_days
        (algoritmo sport-agnostic, sin nada propio de running)."""
        return science.pick_quality_days(days, long_day, n, min_gap)

    def _upsert_planned(self, fecha, tipo, fase, km, nivel):
        """Crea/actualiza la PlannedRunSession del día. No toca lo ya ejecutado/ajustado."""
        existing = PlannedRunSession.objects.filter(plan=self.plan, fecha=fecha).first()
        if existing and existing.estado in ('completada', 'ajustada'):
            return existing
        presc = ts.prescribe_run_session(
            tipo_sesion=tipo, zonas=self._zonas(), nivel=nivel,
            periodizacion={'fase': fase, 'km_objetivo_semana': km, 'is_deload': fase == 'recovery'},
        )
        defaults = {
            'user': self.user,
            'tipo_sesion': tipo,
            'es_calidad': ts.SESSION_TYPES.get(tipo, {}).get('es_calidad', False),
            'zona_principal': presc.get('zona_principal') or '',
            'duracion_objetivo_min': presc.get('duracion_min'),
            'distancia_objetivo_km': presc.get('distancia_km'),
            'rpe_target': presc.get('rpe_target') or None,
            'estructura_fases': presc,
            'estado': 'planificada',
        }
        row, _ = PlannedRunSession.objects.update_or_create(
            plan=self.plan, fecha=fecha, defaults=defaults)
        return row

    def generate_microcycle(self, week_start) -> list:
        """Genera/refresca las PlannedRunSession de la semana (determinístico, sin LLM).
        week_start = lunes ISO de la semana."""
        fase = self.resolve_phase(week_start)
        nivel = self._nivel()
        # Regla del 10% sobre el volumen REALIZADO la semana previa (no el planificado):
        # progresa sobre lo hecho y, tras inactividad (realizado ~0), re-entra en base
        # en lugar de progresar +10% sobre un volumen que el atleta ya no sostiene.
        realized = self._realized_km_last_week(week_start)
        prev = realized if realized > 0 else None
        km = ts.weekly_volume_target(meta_tipo=self.plan.meta_tipo, nivel=nivel,
                                     fase=fase, prev_km=prev)
        # Cap por ACWR: si la carga ya está en precaución/peligro, no subir volumen.
        carga = self._carga(week_start)
        if carga and carga.get('suficiente') and carga.get('zona') in readiness.ZONAS_PRECAUCION and prev:
            km = min(km, prev)

        days = self._training_days()
        long_day = days[-1]
        n_q = N_QUALITY_BY_PHASE.get(fase, 1)
        n_q = min(n_q, max(0, len(days) - 1))
        # Espaciado mínimo entre sesiones de calidad (incluye el long run como día duro).
        min_gap = ts.MIN_EASY_DAYS_BY_NIVEL.get(nivel, 1) + 1
        q_days = self._pick_quality_days(days, long_day, n_q, min_gap)
        q_types = QUALITY_TYPES_BY_PHASE.get(fase, [])

        rows = []
        qi = 0
        for d in days:
            if d == long_day:
                tipo = 'long' if fase != 'recovery' else 'easy'
            elif d in q_days and q_types:
                tipo = q_types[qi % len(q_types)]
                qi += 1
            else:
                tipo = 'recovery' if fase == 'recovery' else 'easy'
            row = self._upsert_planned(week_start + timedelta(days=d), tipo, fase, km, nivel)
            if row:
                rows.append(row)

        self.plan.km_objetivo_semana = km
        self.plan.fase_actual = fase
        self.plan.week_start = week_start
        self.plan.save(update_fields=['km_objetivo_semana', 'fase_actual', 'week_start',
                                      'semana_actual', 'updated_at'])
        return rows

    def ensure_current_week(self, hoy):
        """Asegura que el microciclo de la semana de `hoy` esté generado; avanza el
        contador de semana si el plan venía de una semana anterior. Devuelve el lunes."""
        monday = hoy - timedelta(days=hoy.weekday())
        es_semana_nueva = self.plan.week_start is None or self.plan.week_start < monday
        # También (re)generar si la semana actual está vacía (p. ej. plan recién creado).
        vacia = not PlannedRunSession.objects.filter(
            plan=self.plan, fecha__gte=monday, fecha__lte=monday + timedelta(days=6)).exists()
        if es_semana_nueva or vacia:
            if self.plan.week_start and self.plan.week_start < monday:
                weeks = max(1, (monday - self.plan.week_start).days // 7)
                self.plan.semana_actual = (self.plan.semana_actual or 1) + weeks
            self.generate_microcycle(monday)
        return monday
