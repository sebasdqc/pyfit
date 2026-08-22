"""Motor adaptativo de CICLISMO — espejo de ai_running/adaptive_engine_running.py.

Decide de forma DETERMINÍSTICA: la estructura del microciclo semanal y la
re-adaptación de la sesión del día según la readiness. Reutiliza el motor de
carga ACWR del vertical Performance (igual que running) y TODA la lógica
sport-agnostic de endurance/ (readiness, periodización, espaciado de
calidad) — lo único propio de acá es: qué dato de RideSession usa para
estimar el RPE, qué palabras de dolor importan en bici, y el catálogo de
tipos de sesión de ciclismo."""
from datetime import timedelta

from django.utils import timezone

from cycling.models import RideSession, PlannedRide
from workouts.models import Competition
from performance.carga_service import athlete_carga
from endurance import periodization, readiness, science
from . import training_science_cycling as ts


# Nº de sesiones de calidad y tipos por fase. Sweet spot es la base de la
# construcción aeróbica en ciclismo (menor costo de fatiga que threshold);
# threshold/vo2max entran en build/peak, igual que tempo/vo2 en running.
N_QUALITY_BY_PHASE = {'base': 1, 'build': 2, 'peak': 2, 'taper': 1, 'recovery': 0}
QUALITY_TYPES_BY_PHASE = {
    'base': ['sweet_spot'], 'build': ['sweet_spot', 'threshold'],
    'peak': ['threshold', 'vo2max'], 'taper': ['sweet_spot'], 'recovery': [],
}

# Dolor/molestia en zona de carga del ciclista — distinto de running: sillín,
# cuello y manos por la postura, no aquiles/tibial (sin impacto de zancada).
RIDE_LOAD_PAIN_KEYWORDS = (
    'rodilla', 'cadera', 'lumbar', 'espalda', 'cuello', 'hombro',
    'muñeca', 'mano', 'sillin', 'silla', 'gluteo', 'isquio', 'cuadriceps',
)


class CyclingAdaptiveEngineService:
    def __init__(self, user, perfil, cyclist_profile, plan, checkin=None):
        self.user = user
        self.perfil = perfil
        self.cyclist_profile = cyclist_profile
        self.plan = plan
        self.checkin = checkin

    # ─── helpers de contexto ──────────────────────────────────────────────────

    def _nivel(self) -> str:
        return getattr(self.perfil, 'nivel', None) or 'intermedio'

    def _zonas(self) -> dict:
        return self.cyclist_profile.zonas or {}

    def _training_days(self) -> list[int]:
        n = self.plan.dias_semana or 3
        pref = self.plan.dias_preferidos or []
        if pref and len(pref) >= n:
            return sorted({int(x) for x in pref})[:n]
        return science.DEFAULT_TRAINING_DAYS.get(n, science.DEFAULT_TRAINING_DAYS[3])

    def _competition_anchor(self, ref_date) -> dict | None:
        """Competición en los próximos 14 días (mismo criterio que fuerza/running)."""
        comp = (Competition.objects
                .filter(user=self.user, fecha__gte=ref_date,
                        fecha__lte=ref_date + timedelta(days=14))
                .order_by('fecha').first())
        if comp:
            return {'nombre': comp.nombre, 'fecha': comp.fecha,
                    'dias': (comp.fecha - ref_date).days}
        return None

    # ─── carga / readiness ────────────────────────────────────────────────────

    def _estimate_rpe(self, ride: RideSession) -> int:
        """RPE de una RideSession: el real si existe; si no, estimado desde la
        FC media vs el FTHR (las free rides casi nunca traen feedback). Sin
        potencia: la mayoría no tiene potenciómetro — FC es el dato disponible."""
        if ride.rpe_real:
            return int(ride.rpe_real)
        fthr = self.cyclist_profile.fthr_bpm
        hr = ride.avg_heart_rate
        if fthr and hr and hr > 0:
            ratio = hr / fthr                      # >1 = por encima del umbral
            if ratio >= 1.0:
                return 9
            if ratio >= 0.94:
                return 7
            if ratio >= 0.81:
                return 5
            return 4
        return 5

    def _build_srpe_series(self, ref_date, days: int = 35) -> list[tuple]:
        """Serie (fecha, sRPE) de las RideSession completadas. sRPE = RPE × min (Foster)."""
        since = ref_date - timedelta(days=days)
        qs = RideSession.objects.filter(
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

    def _realized_hours_last_week(self, week_start) -> float:
        """Horas REALMENTE pedaleadas (RideSession completadas) en la semana previa.
        Base correcta para el cap de progresión: progresa sobre lo hecho, no lo
        planificado (mismo criterio que _realized_km_last_week de running)."""
        ini = week_start - timedelta(days=7)
        fin = week_start - timedelta(days=1)
        qs = RideSession.objects.filter(
            user=self.user, status='completed',
            started_at__date__gte=ini, started_at__date__lte=fin,
        )
        total_s = sum((r.total_duration_s or 0) for r in qs)
        return round(total_s / 3600.0, 1)

    def compute_readiness(self, hoy=None) -> dict:
        """Señales objetivas + subjetivas para decidir la sesión del día.
        Delega en endurance.readiness — solo inyecta el dato propio de
        ciclismo (qué palabras de dolor importan)."""
        hoy = hoy or timezone.localdate()
        carga = self._carga(hoy)
        return readiness.compute_readiness(
            carga=carga, checkin=self.checkin, pain_keywords=RIDE_LOAD_PAIN_KEYWORDS)

    def adapt_today(self, planned: PlannedRide, signals: dict) -> dict:
        """Tabla de re-adaptación — vive en endurance.readiness (misma para
        cualquier deporte de resistencia). Acá solo se renombra `factor` →
        `horas_factor`, el vocabulario que usa el resto de este motor
        (running lo llama `km_factor`; running mide en km, ciclismo en horas)."""
        out = readiness.adapt_today(
            tipo_sesion=planned.tipo_sesion, es_calidad=planned.es_calidad,
            zona_principal=planned.zona_principal, rpe_by_zone=ts.RPE_BY_ZONE,
            signals=signals,
        )
        out['horas_factor'] = out.pop('factor')
        return out

    # ─── periodización / microciclo ───────────────────────────────────────────

    def resolve_phase(self, ref_date) -> str:
        """Fase de periodización — misma fórmula que running (endurance.periodization),
        solo resuelve el booleano "hay competencia cerca" (workouts.Competition,
        compartida entre deportes)."""
        plan = self.plan
        return periodization.resolve_phase(
            ref_date=ref_date,
            has_competition_soon=bool(self._competition_anchor(ref_date)),
            meta_fecha=plan.meta_fecha, started_at=plan.started_at,
            semana_actual=plan.semana_actual,
        )

    @staticmethod
    def _pick_quality_days(days: list[int], anchor_day: int, n: int, min_gap: int = 2) -> set:
        """Espaciado de días de calidad — ver endurance.science.pick_quality_days."""
        return science.pick_quality_days(days, anchor_day, n, min_gap)

    def _upsert_planned(self, fecha, tipo, fase, horas, nivel):
        """Crea/actualiza el PlannedRide del día. No toca lo ya ejecutado/ajustado."""
        existing = PlannedRide.objects.filter(plan=self.plan, fecha=fecha).first()
        if existing and existing.estado in ('completada', 'ajustada'):
            return existing
        presc = ts.prescribe_ride_session(
            tipo_sesion=tipo, zonas=self._zonas(), nivel=nivel,
            periodizacion={'fase': fase, 'horas_objetivo_semana': horas, 'is_deload': fase == 'recovery'},
        )
        defaults = {
            'user': self.user,
            'tipo_sesion': tipo,
            'es_calidad': ts.SESSION_TYPES.get(tipo, {}).get('es_calidad', False),
            'zona_principal': presc.get('zona_principal') or '',
            'duracion_objetivo_min': presc.get('duracion_min'),
            'rpe_target': presc.get('rpe_target') or None,
            'estructura_fases': presc,
            'estado': 'planificada',
        }
        row, _ = PlannedRide.objects.update_or_create(
            plan=self.plan, fecha=fecha, defaults=defaults)
        return row

    def generate_microcycle(self, week_start) -> list:
        """Genera/refresca los PlannedRide de la semana (determinístico, sin LLM).
        week_start = lunes ISO de la semana."""
        fase = self.resolve_phase(week_start)
        nivel = self._nivel()
        realized = self._realized_hours_last_week(week_start)
        prev = realized if realized > 0 else None
        horas = ts.weekly_volume_target(meta_tipo=self.plan.meta_tipo, nivel=nivel,
                                        fase=fase, prev_hours=prev)
        # Cap por ACWR: si la carga ya está en precaución/peligro, no subir volumen.
        carga = self._carga(week_start)
        if carga and carga.get('suficiente') and carga.get('zona') in readiness.ZONAS_PRECAUCION and prev:
            horas = min(horas, prev)

        days = self._training_days()
        long_day = days[-1]
        n_q = N_QUALITY_BY_PHASE.get(fase, 1)
        n_q = min(n_q, max(0, len(days) - 1))
        min_gap = ts.MIN_EASY_DAYS_BY_NIVEL.get(nivel, 1) + 1
        q_days = self._pick_quality_days(days, long_day, n_q, min_gap)
        q_types = QUALITY_TYPES_BY_PHASE.get(fase, [])

        rows = []
        qi = 0
        for d in days:
            if d == long_day:
                tipo = 'long_ride' if fase != 'recovery' else 'easy'
            elif d in q_days and q_types:
                tipo = q_types[qi % len(q_types)]
                qi += 1
            else:
                tipo = 'recovery' if fase == 'recovery' else 'easy'
            row = self._upsert_planned(week_start + timedelta(days=d), tipo, fase, horas, nivel)
            if row:
                rows.append(row)

        self.plan.horas_objetivo_semana = horas
        self.plan.fase_actual = fase
        self.plan.week_start = week_start
        self.plan.save(update_fields=['horas_objetivo_semana', 'fase_actual', 'week_start',
                                      'semana_actual', 'updated_at'])
        return rows

    def ensure_current_week(self, hoy):
        """Asegura que el microciclo de la semana de `hoy` esté generado; avanza el
        contador de semana si el plan venía de una semana anterior. Devuelve el lunes."""
        monday = hoy - timedelta(days=hoy.weekday())
        es_semana_nueva = self.plan.week_start is None or self.plan.week_start < monday
        vacia = not PlannedRide.objects.filter(
            plan=self.plan, fecha__gte=monday, fecha__lte=monday + timedelta(days=6)).exists()
        if es_semana_nueva or vacia:
            if self.plan.week_start and self.plan.week_start < monday:
                weeks = max(1, (monday - self.plan.week_start).days // 7)
                self.plan.semana_actual = (self.plan.semana_actual or 1) + weeks
            self.generate_microcycle(monday)
        return monday
