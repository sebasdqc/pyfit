"""
PyFit Adaptive Engine — Pasos 3, 4 y 5 del pipeline de generación de sesiones.

Paso 3: Filtrado del catálogo usando tablas normalizadas (ExerciseEquipment,
        ExerciseContraindication, ContraindicationCategory) en lugar de los
        JSONFields legacy.
Paso 4: Prioridad de patrones de movimiento basada en historial reciente.
Paso 5: Enriquecimiento con datos de progresión RPE-based.
"""
import logging
from datetime import date, timedelta

from workouts.models import Exercise, EquipmentItem, ContraindicationCategory, UserExerciseProfile

logger = logging.getLogger(__name__)

# Module-level cache: True once we confirm satellite tables have data.
# Avoids repeated COUNT(*) on every request when tables are empty.
_satellite_equipment_populated: bool | None = None
_satellite_contraindication_populated: bool | None = None


def _check_satellite_tables() -> tuple[bool, bool]:
    """
    Returns (has_equipment_data, has_contraindication_data).
    Caches results in module-level flags to avoid repeated DB hits.
    """
    global _satellite_equipment_populated, _satellite_contraindication_populated
    if _satellite_equipment_populated is None:
        _satellite_equipment_populated = EquipmentItem.objects.exists()
    if _satellite_contraindication_populated is None:
        _satellite_contraindication_populated = ContraindicationCategory.objects.exists()
    return _satellite_equipment_populated, _satellite_contraindication_populated

# Maps UserInjury.zona (lowercase) → ContraindicationCategory.body_zone (as seeded)
ZONA_A_BODY_ZONE: dict[str, str] = {
    'lumbar':    'Columna',
    'rodilla':   'Rodilla',
    'hombro':    'Hombro',
    'cuello':    'Columna',
    'cadera':    'Cadera',
    'tobillo':   'Tobillo',
    'muñeca':    'Muñeca',
    'codo':      'Hombro',
    'thoracica': 'Columna',
}

# Maps nivel del perfil → techo de technical_level permitido
NIVEL_MAP: dict[str, int] = {'principiante': 2, 'intermedio': 3, 'avanzado': 5}

CORE_PATTERNS = frozenset({'core_antiextension', 'core_antirrotacion', 'core_antiflexion'})
EMPUJE_PATTERNS = frozenset({'empuje_horizontal', 'empuje_vertical'})
JALON_PATTERNS  = frozenset({'jalon_horizontal',  'jalon_vertical'})

# Maps tokens del campo foco_entrenamiento → lista de patron_movimiento a elevar
FOCO_A_PATRONES: dict[str, list[str]] = {
    'piernas':     ['sentadilla', 'bisagra'],
    'espalda':     ['jalon_horizontal', 'jalon_vertical'],
    'pecho':       ['empuje_horizontal'],
    'hombros':     ['empuje_vertical'],
    'core':        ['core_antiextension', 'core_antirrotacion', 'core_antiflexion'],
    'brazos':      ['aislamiento'],
    'completo':    [],
    'movilidad':   [],
    'resistencia': [],
    'fuerza':      [],
    'hipertrofia': [],
}

DOLOR_KEYWORDS: dict[str, str] = {
    'rodilla': 'rodilla',
    'lumbar':  'lumbar',
    'espalda': 'lumbar',
    'hombro':  'hombro',
    'cuello':  'cuello',
    'cadera':  'cadera',
    'tobillo': 'tobillo',
    'muñeca':  'muñeca',
    'codo':    'codo',
}

# Equipo que nunca es restricción (peso corporal)
EQUIPO_LIBRE = {'ninguno (peso corporal)', 'ninguno'}


class AdaptiveEngineService:
    """
    Encapsula los pasos determinísticos del motor adaptativo.
    Debe instanciarse una vez por request de generación.
    """

    def __init__(self, user, checkin, location, perfil):
        self.user = user
        self.checkin = checkin
        self.location = location
        self.perfil = perfil
        self._injury_zones: set[str] | None = None   # zona values (lowercase)
        self._body_zones: set[str] | None = None      # body_zone values (title-case)

    # ─── helpers internos ─────────────────────────────────────────────────────

    def _get_injury_zones(self) -> set[str]:
        """Devuelve zonas de lesión del usuario incluyendo dolor reportado hoy."""
        if self._injury_zones is None:
            zones: set[str] = set(
                self.user.injuries.filter(activa=True).values_list('zona', flat=True)
            )
            if self.checkin.dolor_hoy:
                lower = self.checkin.dolor_hoy.lower()
                for kw, zona in DOLOR_KEYWORDS.items():
                    if kw in lower:
                        zones.add(zona)
            self._injury_zones = zones
        return self._injury_zones

    def _get_body_zones(self) -> set[str]:
        """Convierte injury_zones al formato body_zone de ContraindicationCategory."""
        if self._body_zones is None:
            self._body_zones = {
                ZONA_A_BODY_ZONE[z]
                for z in self._get_injury_zones()
                if z in ZONA_A_BODY_ZONE
            }
        return self._body_zones

    # ─── Paso 3 ───────────────────────────────────────────────────────────────

    def get_exercise_pool(self) -> list[dict]:
        """
        Filtra el catálogo de ejercicios usando tablas normalizadas cuando están
        disponibles, o los JSONFields legacy como fallback cuando no lo están.
        Aplica los 7 filtros en orden: contraindicaciones, equipamiento,
        nivel técnico, estado físico, espacio, activo.
        Devuelve lista de dicts enriquecidos.
        """
        has_equipment_data, has_contraindication_data = _check_satellite_tables()
        if not has_equipment_data and not has_contraindication_data:
            logger.info(
                'adaptive_engine satellite tables empty for user=%s — using JSONField fallback',
                self.user.id,
            )
            return self._get_exercise_pool_jsonfield()

        body_zones = self._get_body_zones()
        implementos_raw = self.location.implementos or []
        implementos_disponibles = {i.lower().strip() for i in implementos_raw}

        nivel_usuario = NIVEL_MAP.get(self.perfil.nivel, 3)
        estado_fisico: int = self.checkin.estado_fisico or self.checkin.estado_animo
        espacio_restringido = self.location.tipo in ('casa', 'exterior')

        candidates = (
            Exercise.objects
            .filter(activo=True)
            .prefetch_related(
                'contraindication_links__contraindication',
                'equipment_links__equipment',
                'muscles__muscle',
            )
        )

        pool: list[dict] = []

        for ex in candidates:
            # ── Filtro 1 & 2: Contraindicaciones ─────────────────────────────
            requires_warning = False
            warning_text: str | None = None
            skip = False

            if has_contraindication_data:
                for ec in ex.contraindication_links.all():
                    cc = ec.contraindication
                    if cc.body_zone in body_zones:
                        if cc.severity == 'grave':
                            skip = True
                            break
                        if not requires_warning:
                            requires_warning = True
                            warning_text = (
                                ec.notes
                                or f'Precaución: puede afectar la zona {cc.body_zone}'
                            )
            else:
                # JSONField fallback for contraindications
                injury_zones = self._get_injury_zones()
                contra_set = set(ex.contraindicaciones or [])
                if contra_set & injury_zones:
                    skip = True
            if skip:
                continue

            # ── Filtro 3: Equipamiento ───────────────────────────────────────
            if has_equipment_data:
                required_equip = [
                    ee.equipment.name.lower().strip()
                    for ee in ex.equipment_links.all()
                    if ee.is_required and ee.equipment.name.lower().strip() not in EQUIPO_LIBRE
                ]
                if required_equip:
                    if not implementos_disponibles:
                        continue
                    if not all(eq in implementos_disponibles for eq in required_equip):
                        continue
            else:
                # JSONField fallback for equipment
                eq_set = set(ex.equipamiento or [])
                if eq_set and not eq_set.issubset(implementos_disponibles):
                    continue

            # ── Filtro 4: Nivel técnico ──────────────────────────────────────
            if (
                ex.technical_level is not None
                and ex.technical_level > nivel_usuario + 1
            ):
                continue

            # ── Filtro 5: Estado físico ──────────────────────────────────────
            if ex.systemic_fatigue is not None:
                if estado_fisico <= 2 and ex.systemic_fatigue > 3:
                    continue
                if estado_fisico == 3 and ex.systemic_fatigue == 5:
                    continue

            # ── Filtro 6: Espacio ────────────────────────────────────────────
            if espacio_restringido and ex.space_required == 'amplio':
                continue

            # ── Construir dict enriquecido ────────────────────────────────────
            muscles_by_role: dict[str, list[str]] = {}
            if has_equipment_data:  # muscle data comes from same seed batch
                for em in ex.muscles.all():
                    muscles_by_role.setdefault(em.role, []).append(em.muscle.name)
            else:
                # Use JSONFields as muscle fallback
                muscles_by_role['primario']   = list(ex.musculos_primarios or [])
                muscles_by_role['secundario'] = list(ex.musculos_secundarios or [])

            set_dur  = ex.set_duration_seconds  or 45
            rest_def = ex.rest_seconds_default  or 90

            pool.append({
                'id':                   ex.id,
                'nombre':               ex.nombre,
                'patron_movimiento':    ex.patron_movimiento,
                'es_compuesto':         ex.es_compuesto,
                'bilateral':            ex.bilateral,
                'dificultad':           ex.dificultad,
                'technical_level':      ex.technical_level,
                'systemic_fatigue':     ex.systemic_fatigue,
                'set_duration_seconds': set_dur,
                'rest_seconds_default': rest_def,
                'total_set_seconds':    set_dur + rest_def,
                'musculos_primarios':   muscles_by_role.get('primario', []),
                'musculos_secundarios': muscles_by_role.get('secundario', []),
                'coaching_cues':        list(ex.coaching_cues or []),
                'description':          ex.description or '',
                'requires_warning':     requires_warning,
                'warning_text':         warning_text,
                'primera_vez':          True,
                'progresion':           None,
                'rpe_referencia':       None,
                'veces_realizado':      0,
            })

        logger.debug('adaptive_engine paso3 user=%s pool=%d', self.user.id, len(pool))
        return pool

    def _get_exercise_pool_jsonfield(self) -> list[dict]:
        """
        Fallback pool builder using JSONField data (legacy approach).
        Used when satellite tables have not been seeded yet.
        Both location.implementos and ex.equipamiento use the same category names
        (e.g. 'Barras', 'Máquinas') — compare directly without normalizing case.
        """
        injury_zones = self._get_injury_zones()
        implementos_disponibles = set(self.location.implementos or [])
        nivel_usuario = NIVEL_MAP.get(self.perfil.nivel, 3)
        estado_fisico: int = self.checkin.estado_fisico or self.checkin.estado_animo
        espacio_restringido = self.location.tipo in ('casa', 'exterior')

        pool: list[dict] = []
        for ex in Exercise.objects.filter(activo=True):
            # Equipment: JSONField (names in Spanish, same format as location.implementos)
            eq_set = set(ex.equipamiento or [])
            if eq_set and not eq_set.issubset(implementos_disponibles):
                continue

            # Contraindications: JSONField (zone names lowercase)
            contra_set = set(ex.contraindicaciones or [])
            if contra_set & injury_zones:
                continue

            # Level
            if ex.technical_level is not None and ex.technical_level > nivel_usuario + 1:
                continue

            # Fatigue
            if ex.systemic_fatigue is not None:
                if estado_fisico <= 2 and ex.systemic_fatigue > 3:
                    continue
                if estado_fisico == 3 and ex.systemic_fatigue == 5:
                    continue

            # Space
            if espacio_restringido and ex.space_required == 'amplio':
                continue

            set_dur  = ex.set_duration_seconds  or 45
            rest_def = ex.rest_seconds_default  or 90

            pool.append({
                'id':                   ex.id,
                'nombre':               ex.nombre,
                'patron_movimiento':    ex.patron_movimiento,
                'es_compuesto':         ex.es_compuesto,
                'bilateral':            ex.bilateral,
                'dificultad':           ex.dificultad,
                'technical_level':      ex.technical_level,
                'systemic_fatigue':     ex.systemic_fatigue,
                'set_duration_seconds': set_dur,
                'rest_seconds_default': rest_def,
                'total_set_seconds':    set_dur + rest_def,
                'musculos_primarios':   list(ex.musculos_primarios or []),
                'musculos_secundarios': list(ex.musculos_secundarios or []),
                'coaching_cues':        list(ex.coaching_cues or []),
                'description':          ex.description or '',
                'requires_warning':     False,
                'warning_text':         None,
                'primera_vez':          True,
                'progresion':           None,
                'rpe_referencia':       None,
                'veces_realizado':      0,
            })

        logger.debug('adaptive_engine paso3 jsonfield_fallback user=%s pool=%d', self.user.id, len(pool))
        return pool

    # ─── Paso 4 ───────────────────────────────────────────────────────────────

    def get_pattern_priorities(self) -> dict:
        """
        Analiza el historial reciente para determinar prioridad de patrones.
        Devuelve {priorizados: [...], evitar: [...], razon_evitar: {...}}.
        """
        hoy = date.today()
        inicio_semana = hoy - timedelta(days=hoy.weekday())

        # Última fecha ejecutada por patrón (desde UserExerciseProfile)
        pattern_last: dict[str, date] = {}
        for row in (
            UserExerciseProfile.objects
            .filter(user=self.user, ultima_vez__isnull=False)
            .values('patron_movimiento', 'ultima_vez')
        ):
            pat = row['patron_movimiento']
            ul  = row['ultima_vez']
            if pat not in pattern_last or ul > pattern_last[pat]:
                pattern_last[pat] = ul

        # Patrones elevados por el foco declarado por el usuario
        foco = self.checkin.foco_entrenamiento or []
        focos_elevados: set[str] = set()
        for f in foco:
            focos_elevados.update(FOCO_A_PATRONES.get(str(f).lower(), []))

        all_patterns = [p[0] for p in Exercise.PATRON_CHOICES]
        priorizados: list[tuple[str, int, bool]] = []  # (patron, score, is_foco)
        evitar: list[str] = []
        razon_evitar: dict[str, str] = {}

        for patron in all_patterns:
            last_date = pattern_last.get(patron)
            dias = None if last_date is None else (hoy - last_date).days
            min_rest = 1 if patron in CORE_PATTERNS else 2

            if dias is None or dias >= 3:
                priorizados.append((patron, 0, patron in focos_elevados))
            elif dias >= min_rest:
                priorizados.append((patron, 1, patron in focos_elevados))
            else:
                evitar.append(patron)
                razon_evitar[patron] = (
                    f'ejecutado hace {dias} día{"" if dias == 1 else "s"}'
                )

        # Ordenar: foco-elevados primero, luego por score ascendente
        priorizados.sort(key=lambda x: (not x[2], x[1]))

        # Balance empuje/jalón en la semana actual
        empuje_week = (
            UserExerciseProfile.objects
            .filter(
                user=self.user,
                patron_movimiento__in=EMPUJE_PATTERNS,
                ultima_vez__gte=inicio_semana,
            )
            .count()
        )
        jalon_week = (
            UserExerciseProfile.objects
            .filter(
                user=self.user,
                patron_movimiento__in=JALON_PATTERNS,
                ultima_vez__gte=inicio_semana,
            )
            .count()
        )
        if empuje_week > 0 and empuje_week / max(jalon_week, 1) > 1.4:
            # Empuje domina la semana → elevar jalón
            priorizados.sort(key=lambda x: (
                x[0] not in JALON_PATTERNS,
                not x[2],
                x[1],
            ))

        return {
            'priorizados': [p[0] for p in priorizados],
            'evitar':       evitar,
            'razon_evitar': razon_evitar,
        }

    # ─── Paso 5 ───────────────────────────────────────────────────────────────

    def enrich_with_load(self, pool: list[dict], deload_session: bool = False) -> tuple[list[dict], dict]:
        """
        Enriquece el pool con datos de progresión RPE-based desde UserExerciseProfile.
        Devuelve (enriched_pool, session_meta).
        """
        hoy = date.today()
        nombres = [ex['nombre'] for ex in pool]

        profiles_map = {
            uep.exercise_nombre: uep
            for uep in UserExerciseProfile.objects.filter(
                user=self.user, exercise_nombre__in=nombres,
            )
        }

        tiempo_efectivo_s = max(0, (self.checkin.duracion_disponible - 15) * 60)

        enriched: list[dict] = []
        for ex in pool:
            uep = profiles_map.get(ex['nombre'])
            primera_vez = uep is None or uep.veces_realizado == 0
            progresion: str | None = None
            rpe_referencia: float | None = None
            veces_realizado = 0

            if not primera_vez and uep is not None:
                veces_realizado = uep.veces_realizado
                rpe_ref = float(uep.rpe_promedio_real) if uep.rpe_promedio_real else None
                rpe_referencia = rpe_ref

                if uep.ultima_vez and (hoy - uep.ultima_vez).days > 7:
                    progresion = 'consolidar'
                elif rpe_ref is not None:
                    if rpe_ref < 7.0:
                        progresion = 'incrementar'
                    elif rpe_ref <= 8.5:
                        progresion = 'mantener'
                    else:
                        progresion = 'reducir'
                else:
                    progresion = 'mantener'

            enriched.append({
                **ex,
                'primera_vez':     primera_vez,
                'progresion':      progresion,
                'rpe_referencia':  rpe_referencia,
                'veces_realizado': veces_realizado,
            })

        # Estimar sets disponibles
        avg_total_sec = (
            sum(ex['total_set_seconds'] for ex in enriched) / len(enriched)
            if enriched else 135
        )
        max_sets = int(tiempo_efectivo_s / avg_total_sec) if avg_total_sec > 0 else 20
        max_sets = max(8, min(30, max_sets))
        if deload_session:
            max_sets = int(max_sets * 0.65)

        session_meta = {
            'deload_session':  deload_session,
            'max_sets_sesion': max_sets,
        }

        logger.debug(
            'adaptive_engine paso5 user=%s pool=%d max_sets=%d deload=%s',
            self.user.id, len(enriched), max_sets, deload_session,
        )
        return enriched, session_meta
