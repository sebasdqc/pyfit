# CLAUDE.md — `performance-web/` (Zyfit Performance, B2B)

> Se suma al `CLAUDE.md` raíz (mapa del ecosistema). Zyfit Performance es un
> panel web **independiente de la app móvil**, para centros deportivos de alto
> rendimiento (fútbol/futsal). Backend compartido (`backend/performance/`, ver
> `backend/CLAUDE.md`). Leer esto antes de tocar cualquier feature B2B.

---

## Qué es

Panel web para **staff de centros deportivos** (no atletas de consumo): 5
módulos — Rendimiento, Lesiones, Test, Planificación, Psicológico — más
Simulador táctico y Calendario. Múltiples roles de staff por centro
(`director_tecnico`, `preparador_fisico`, `fisioterapeuta`, `analista`,
`planificador`, `psicologo`). **Estado: DESPLEGADO y en desarrollo activo.**

## Ubicación y deploy

- **Código:** `performance-web/` (Vite + React 19 + TS, SPA tras login),
  backend en la app Django `performance` dentro de `backend/`.
- **Deploy:** Static Site en DO App Platform, app separada del backend —
  `zyfit-performance`, ID `b50f22a7-3cdf-44fe-be54-e52a0d8ff2c6` →
  **https://zyfit-performance-svp4v.ondigitalocean.app**. `deploy_on_push` a
  `main`. Backend: `sea-lion-app` (compartido, ver `backend/CLAUDE.md`).
- **Dev local:** `cd performance-web && cp .env.example .env && npm install
  && npm run dev` — puerto **5180**.
- Para visualizar cambios: **siempre `git push origin main`**, nunca
  `localhost` (regla del CLAUDE.md raíz).

## Identidad de color — VERDE AZULADO / TEAL (antes azul, cambiado 2026-08-01)

Único acento `#14b8a6` (`accent`) + `accentDark #0d9488` + `accentLight
#5eead4`; fondos azul-marino profundo (`#0a0e1a`, sin cambios — es el fondo,
no el acento); semánticos `ok #32c896`/`warn #ffaa32`/`danger #ff4444`.

**Por qué cambió:** el azul original (`#4f8cff`/`#7ab6ff`/`#2563ff`) resultó
ser el mismo hex EXACTO que usa la landing de la APP (`app/globals.css`,
`--accent`/`--accent-light`/`--accent-dark`) — una colisión real de marca
entre dos productos del ecosistema, no solo una coincidencia estética.
Detectado y corregido en la misma sesión que agregó la landing pública de
Performance (ver `project_performance_landing`/`project_performance_color_rebrand`
en memoria).

Memorias antiguas y comentarios de código pre-2026-08-01 pueden seguir
diciendo "azul" o citar `#4f8cff` — ya está desactualizado, verificar
directamente en `tailwind.config.js` antes de asumir el valor.

No confundir con el rojo de Academy (`#cc1f36`) ni con la identidad del
Portal de Coach (otro producto dentro de la app móvil, `mobile/lib/
coachTheme.ts` — históricamente morado; Sebastian mencionó en 2026-08-01 que
cambió a vinotinto, sin verificar todavía directamente en ese archivo).

## Arquitectura backend (`backend/performance/`, tablas `performance_*`)

- **Capa de identidad en `users`, no en `performance`:** `User.role`
  ∈ `{athlete, coach, director_tecnico, admin}`. `performance_acceso` (bool)
  gatea el panel = `is_active AND (role∈{director,admin} OR is_staff OR
  CenterMembership ACTIVA)`.
- **`SportsCenter`** — entidad raíz (nombre, slug, disciplina, director
  principal). **`CenterMembership`** — staff↔centro con `rol` +
  `modulos` (whitelist). **`CenterAthlete`** — el DIRECTOR registra al atleta
  (a diferencia del consumo, donde el atleta ingresa un código); incluye
  `foto` (data URL base64 hoy — ver "Object storage" abajo).
- **5 módulos**, todos heredan `CenterRecord` salvo donde se indique:
  `PerformanceMetric`, `InjuryReport`, `PhysicalTest`, `TrainingPlan`,
  `PsychAssessment`.
- **`TacticalPlay`** (Simulador, no hereda CenterRecord) — pizarra táctica con
  animación por keyframes, selector cancha fútbol/futsal, coords SIEMPRE
  normalizadas 0..1. **`CalendarEvent`** (no hereda CenterRecord) — línea de
  tiempo de temporada (torneo/concentración/partido/entrenamiento/etc). Ambos
  son herramientas del cuerpo técnico, **sin gating de módulo**.

## Motor de calculadoras (`backend/performance/calculators/`) — 25 + BRUMS

`REGISTRY` es el catálogo único, `constants.py` documenta cada fórmula citada
(Buchheit, Bangsbo IR2, Foster, Williams EWMA, Edwards, Draper&Whyte RAST,
etc.) — **todo cálculo vive en el servidor**, el frontend solo captura inputs
crudos. 5 familias: físico (13), carga (5, incluye `forma`/TSB), prevención
(3), técnico (2), táctico (2). Psicometría aparte: BRUMS/POMS/RESTQ-Sport/
CSAI-2/ABQ. Encuadre honesto en docstrings — el ACWR es indicador contextual
de carga, **no** predictor causal de lesión.

- **Familia CARGA** es la columna vertebral: `srpe`, `carga-semanal`
  (monotonía+strain Foster), `acwr` (RA y EWMA, zonas 0.8–1.3 sweet spot /
  >1.5 peligro), `trimp-edwards`, y **`forma`** (fitness-fatiga estilo
  Banister: EWMA 7d/42d, TSB = fitness − fatiga).
- **Módulo "Carga interna"** (sidebar, sin modelo nuevo): persiste sRPE diario
  en `PerformanceMetric(tipo='carga')`, `performance/carga_service.py`
  delega el cálculo a las calculadoras `acwr`/`carga-semanal`. **"Forma"** es
  el mismo patrón con `forma_service.py`.
- Al agregar un test nuevo al `REGISTRY`, hay que actualizar los conteos
  duros en `test_endpoints.py`/`test_psicologico.py` (gotcha ya conocido —
  las aserciones fijan `len==N`).

## PLANIFICACIÓN rediseñada + IA de equipo + asesor (jul 2026, DESPLEGADO)

- **`PlannedSession`** — día dentro de un `Microcycle` (FK, `dia_semana`+
  `orden`, `fecha` siempre calculada por la vista, nunca por señales).
  Prescripción fijada por el técnico (`tipo`/`duracion_min`/`rpe_objetivo`/
  `carga_objetivo_ua`), FK opcional a `CalendarEvent`. `contenido` es JSON (no
  filas hijas — no hace falta analítica por-ejercicio como en consumo
  individual).
- **`team_session_generator.py`** — genera **una sesión de EQUIPO por día**
  (no una por atleta — decisión de producto: fútbol/futsal entrena junto).
  Reusa `ai_workout._call_groq`. Patrón "el motor fija los números, el LLM
  solo redacta" — mismo split que `ai_running`. Contexto de riesgo: ACWR/
  monotonía agregados + return-to-play consultando `InjuryReport` DIRECTO
  (nunca `CenterAthlete.estado`, que puede desincronizarse).
- **`planning_advisor.py`** — asesor de **SOLO LECTURA**: sin endpoint de
  escritura propio, el botón "Aplicar" del frontend llama al mismo
  `updateMeso`/`updateMicro` del formulario manual. Nunca reescribe el plan
  solo.

## Frontend (`performance-web/src/`)

- Vite + React 19 + TS, React Router (`createBrowserRouter`), TanStack Query
  **NO se usa** (llamadas por `axios` con `useState/useEffect`), Recharts,
  Tailwind v3.
- **Centro activo global** (`centers/ActiveCenterContext.tsx`) + **plantilla
  unificada** (`centers/SquadContext.tsx`, `useSquad`) — única fuente de
  atletas del panel; roster real + métricas sintetizadas deterministas donde
  el backend aún no las modela (`DemoBadge` marca `demo` vs `sim`). Providers
  obligatorios en orden: `Auth > ActiveCenter > Squad > Router`.
- Estructura: `src/api/` (axios+JWT), `src/auth/`, `src/centers/`,
  `src/components/layout|ui/`, `src/pages/` (uno por módulo + Reportes,
  GPS, Carga interna, Forma, Calendario), `src/lib/constants.ts` (`MODULES`
  = fuente única del sidebar).

## Estado por módulo (para no asumir "todo mock" ni "todo real")

- **API real de punta a punta:** Simulador, Calendario, Planificación
  (+meso/micro/PlannedSession), Carga interna, Forma, Wellness (Fase A
  Psicológico), Lesiones (con mapa corporal), Test y Psicológico
  (cuestionarios Fase B) para roster real.
- **Historial por atleta vía `localStorage`** (no servidor) para Test/Psico
  cuando NO hay centro activo (modo demo) — `testStore`/`psychStore`.
- **Sin backend aún, 100% frontend con datos sintéticos:** GPS y Tecnología
  (`/gps/*`, 4 dashboards estilo Catapult/STATSports).
- **Rendimiento (`PerformanceMetric` genérico):** sigue sintético — es la
  gran pendiente de "métricas reales".
- **Gating server-side de módulos:** hecho — `permissions.can_access_module`
  + `_assert_module` (403). Simulador y Calendario quedan sin gatear a
  propósito.

## Pendiente / no construir especulativamente

- **Object storage de fotos (DO Spaces):** código listo (`foto_img`,
  `_store_athlete_foto`, deps `django-storages`/`boto3`) pero **pausado sin
  commitear** — Spaces es de pago, inerte sin credenciales.
- Invitación por email automática (hoy se copia al portapapeles).
- Catálogo de drills reusables — backlog explícito, no construir sin que se
  pida.
- Accesibilidad Fase 1: `<Dialog>`/`useDialogA11y` ya existen y están
  cableados en algunos modales — falta aplicarlos a los inline de
  Calendario/Equipo/Lesiones/Simulador, y un `<SegmentedControl>` accesible
  para las ~12 tabs hoy solo-color.

## Notas críticas

1. El cálculo/scoring vive **siempre en el servidor** — el frontend nunca
   calcula ACWR/monotonía/TRIMP/etc. por su cuenta salvo en el modo demo
   explícitamente marcado con `DemoBadge`.
2. No agregar TanStack Query "porque sí" — el panel deliberadamente no lo
   usa.
3. Antes de reportar un deploy como listo, verificar
   `doctl apps list-deployments b50f22a7-3cdf-44fe-be54-e52a0d8ff2c6` (fase
   `ACTIVE`, no rollback) — ver gotcha de deploy en `backend/CLAUDE.md`.
4. `package-lock.json` debe estar commiteado (`npm ci` lo exige en el build
   de DO).

## Referencias

Detalle exhaustivo de cada módulo (comandos, migraciones, commits, tests) en
la memoria `project_performance_vertical` — leerla para trabajo profundo en
un módulo específico.
