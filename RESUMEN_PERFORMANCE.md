# Zyfit Performance — Resumen de la Vertical B2B

> Documento explicativo de qué es Zyfit Performance, cómo funciona y cuáles
> son sus features. Pensado para leerse de corrido por alguien que necesita
> entender esta vertical sin meterse en el código.

---

## 1. Qué es Zyfit Performance en una frase

**Zyfit Performance es el panel de gestión de rendimiento deportivo para
centros y clubes, orientado a fútbol y futsal.** Vive como una aplicación web
separada (`performance-web/`) que se conecta al mismo backend Django que la
app de consumo, pero con su propio login, su propio rol de acceso y su propia
identidad visual.

El panel no le habla al atleta: le habla al **cuerpo técnico** — director
técnico, preparador físico, fisioterapeuta, analista, planificador y
psicólogo — y les da herramientas para monitorear la carga, los tests físicos,
las lesiones, el estado psicológico y la planificación de la temporada de su
plantilla.

---

## 2. Para quién es (roles y acceso)

El acceso al panel se gatea por el flag `performance_acceso` del usuario, que
se activa cuando el usuario tiene **role `director_tecnico` o `admin`** en el
sistema, o bien tiene una `CenterMembership` activa en algún centro.

Dentro de cada centro, el rol fino no vive en el usuario sino en
**`CenterMembership.rol`**. Un mismo usuario puede ser director técnico en un
centro y fisioterapeuta en otro. Los roles disponibles y los módulos que ven
por defecto son:

| Rol | Módulos por defecto |
|---|---|
| `director_tecnico` | Todos (rendimiento, lesiones, test, planificación, psicológico) |
| `preparador_fisico` | Rendimiento, Planificación, Test |
| `fisioterapeuta` | Lesiones |
| `analista` | Test, Rendimiento |
| `planificador` | Planificación |
| `psicologo` | Psicológico |

El **gating es server-side**: cada endpoint de módulo verifica
`can_access_module(user, center, modulo)` y devuelve 403 si el usuario no
tiene acceso, aunque se la ingenie para pedir la URL directamente.

Simulador, Calendario y GPS son herramientas del cuerpo técnico y **no están
gateados por módulo** — los ve cualquiera que entre al panel.

---

## 3. Modelo de datos central

Todo el estado B2B vive en la app Django `performance/`. Las entidades clave:

- **`SportsCenter`** — la entidad raíz. Tiene nombre, slug, disciplina, un
  `director_principal` (FK a User) y un flag `activo`.

- **`CenterMembership`** — vincula un User con un centro como staff, con su
  `rol` y una whitelist `modulos` (JSON). El `director_principal` recibe una
  membresía automática al crear el centro. Hay un único registro por par
  `(center, user)`.

- **`CenterAthlete`** — vincula un atleta (User) con un centro. Lo registra
  el director; no es el atleta quien se conecta con un código (eso es del
  portal de coach, no de Performance). Campos: dorsal, posición, grupo,
  estado, foto (base64 provisional). El `<linkId>` que usan los endpoints es
  el id de este vínculo, **no** el id del User.

---

## 4. Alta de usuarios al panel

El panel permite dar de alta staff y atletas por **email**:

- Si el email ya tiene cuenta en Zyfit, se vincula esa cuenta al centro.
- Si no existe, se crea una nueva:
  - Para **staff**: cuenta real con contraseña temporal ≥8 caracteres. Puede
    entrar al panel con esa contraseña.
  - Para **atletas**: cuenta con contraseña no-usable (no pueden loguearse con
    email/contraseña). La cuenta es reclamable si el atleta decide usar la app
    de consumo en el futuro.

El botón "Invitar" en la vista de Equipo copia un mensaje al portapapeles con
las instrucciones; por ahora no hay envío automático de email.

---

## 5. Los módulos del panel

### 5.1 Rendimiento
Vista de equipo con métricas de rendimiento por atleta. Hoy usa métricas
**sintetizadas deterministas** porque el backend no modela métricas de
rendimiento individual directas (esa es la deuda técnica más grande del panel).
`DemoBadge` con variante `sim` marca los datos no completamente reales.

### 5.2 Lesiones
**Full-stack con roster real.** Captura partes corporales mediante un **mapa
corporal interactivo** (click para ubicar la lesión sobre una silueta SVG
200×415 px), con `vista` (frontal/dorsal), `zona_x/zona_y`, `tipo` y
`mecanismo`. El modal de alta incluye click-to-place en el `BodyMap`.
Acciones: dar de alta al jugador (PATCH estado → alta) y borrar lesión.
`InjuryReport` tiene campo `dias_baja` derivado en el serializer.

### 5.3 Test físicos
**Full-stack con roster real.** Motor de calculadoras server-side con un
catálogo de **24 tests** agrupados en **5 familias**:

| Familia | Tests incluidos |
|---|---|
| **Físico** (13) | Yo-Yo IR2, IFT 30-15, RAST (potencia anaeróbica), Sprint splits 10/20/30 m, COD deficit (505), Squat Jump, Drop Jump (RSI), Broad Jump, VO2máx indirecto, 1RM Epley, % graso Durnin-Womersley, IMC, Sargent |
| **Carga** (4) | sRPE (RPE×min), Carga semanal (monotonía + strain de Foster), ACWR (RA y EWMA), TRIMP Edwards (zonas FC) |
| **Prevención** (3) | Nordic Asimetría isquiotibial, LSI (Limb Symmetry Index), Hidratación (% pérdida de masa) |
| **Técnico** (2) | Control orientado, Pase al primer toque |
| **Táctico** (2) | Presión tras pérdida, Amplitud sin balón |

El frontend captura los inputs crudos; **el cálculo ocurre siempre en el
servidor** (endpoint `tests/compute/`). El catálogo es dinámico: la UI
renderiza cualquier test desde su `input_schema` sin cambios en el frontend.

Las constantes científicas están documentadas en `performance/calculators/constants.py`
(Buchheit, Bangsbo, Foster, Edwards, etc.) y los docstrings incluyen un
encuadre honesto (ej. el ACWR es un indicador contextual de carga, no un
predictor causal de lesión).

### 5.4 Carga Interna
**Módulo propio en el sidebar** (no solo dentro de Tests) con visibilidad
de equipo e individual:

- **Vista equipo:** tabla de atletas ordenada por riesgo ACWR, KPIs del equipo
  y semáforo de zonas (`AcwrBar`) por atleta.
- **Vista atleta:** formulario de carga diaria sRPE (slider de RPE ×
  duración en minutos), gráfico de carga diaria de 28 días, ACWR EWMA grande
  con barra de zona (sweet spot 0.8–1.3, peligro >1.5), monotonía y strain,
  lista de sesiones registradas.

El sRPE se persiste reutilizando el modelo `PerformanceMetric(tipo='carga')`.
El ACWR y la monotonía/strain los calcula el servidor via
`performance/carga_service.py`, que delega en las calculadoras de la familia
Carga. Si hay menos de 7 días de historial el servidor responde
`suficiente: false` y el frontend lo indica.

### 5.5 Planificación
**Full-stack con roster real.** Periodización clásica de equipo: un
`TrainingPlan` es el macrociclo, que contiene `Mesocycle`s y dentro de cada
uno `Microcycle`s. CRUD anidado scoped al centro. La UI muestra una onda de
carga, permite editar/reordenar fases y semanas, y asigna fechas y grupos.

### 5.6 Psicológico
**Full-stack con roster real.** Dos fases:

- **Fase A — Bienestar:** `WellnessCheckin` con índice calculado en el
  servidor (`wellness.py`). Carga y guarda en el servidor para roster real.
- **Fase B — Cuestionarios:** `PsychAssessment` con scoring por subescalas
  server-side. Instrumentos disponibles: **BRUMS** (6 subescalas 0–16, Tension
  Mood Depression, perfil iceberg), **POMS**, **RESTQ-Sport**, **CSAI-2**,
  **ABQ**. Por defecto solo psicólogo y director tienen acceso a este módulo
  (datos de salud sensibles).

---

## 6. Herramientas transversales (sin gateo por módulo)

### 6.1 Simulador táctico
Pizarra táctica digital para diseñar y animar jugadas:

- **Fichas** con tipos: jugador (azul), rival (rojo), balón.
- **Trazos** con tipos: pase, conducción, movimiento sin balón, bloqueo.
- **Coordenadas siempre normalizadas 0..1** (el serializer rechaza píxeles
  directamente).
- **Selector de cancha:** toggle fútbol 11 / futsal en el header. Fútbol
  renderiza `PitchMarkings`; futsal renderiza `FutsalMarkings` (áreas en "D"
  de 6 m, doble penal 6/10 m, círculo 3 m, superficie indoor). El tipo se
  persiste en el campo `campo` del modelo mediante mapeo
  `canchaToCampo/campoToCancha`.
- **Animaciones:** lista de frames + interpolación de fichas por id
  (`interpolateFichas` / `easeInOut` en `lib/simulador.ts`), tira de frames,
  controles `▶/⏸`, bucle y control de velocidad. Los trazos se ocultan
  durante la reproducción.
- **Full-stack:** persiste en `TacticalPlay.escena` (JSON de frames). Compat
  total con jugadas de 1 solo frame.

### 6.2 Calendario
Línea de tiempo de la temporada del centro:

- Tipos de evento: temporada, torneo, concentración (eventos rango), partido,
  entrenamiento, evaluación, descanso, otro.
- Vista mensual en JS puro (`lib/calendar.ts`) — sin librerías de calendario.
  Lunes como primer día. Bandas de color para eventos rango; chips para
  eventos puntuales.
- Panel lateral: sección "Temporadas y torneos" con estado (en curso / próxima
  / finalizada), "Próximos eventos" y leyenda de colores.
- Modal de crear/editar/eliminar con validación `fecha_fin ≥ fecha_inicio`.
- Modal de día que lista todos los eventos del día seleccionado.
- El GET de eventos admite `?desde=&hasta=` para filtrar por solapamiento
  de rango (eventos que caen dentro del rango pedido, incluidos los que
  empiezan antes y terminan después).
- **Full-stack, API real.**

### 6.3 GPS y Tecnología (datos demo)
Emula un sistema profesional de campo tipo Catapult/STATSports. **100%
frontend con datos de muestra deterministas** (aún sin backend GPS). El grupo
GPS en el sidebar tiene cuatro dashboards:

| Dashboard | Qué muestra |
|---|---|
| **Resumen de campo** (`/gps`) | Vista equipo y por atleta: KPIs, 5 zonas de velocidad (km/h), HSR/sprints, Player Load + planos, acel/decel, heatmap posicional (grid 15×10 gaussiano). |
| **Match Day** (`/gps/match-day`) | Reloj `LiveTimer` en tiempo real (1 s) con sondeo simulado cada 5 s. |
| **Post-sesión** (`/gps/post-sesion`) | Resumen de la última sesión. |
| **Carga semanal** (`/gps/carga-semanal`) | ACWR calculado en cliente + aguja de riesgo + tabla por atleta ordenada por riesgo. |
| **Perfil de jugador** (`/gps/jugador`) | Toggle de métrica, radar de perfil físico, return-to-play condicional. |

Perfiles de datos por demarcación (POR/DEF/LAT/MED/EXT/DEL) en
`lib/mockGps.ts`. Badge `DemoBadge` marca todos los datos GPS como demo.

---

## 7. Plantilla unificada y centro activo

El panel resuelve el problema de "¿qué atletas estoy viendo?" con dos
contextos globales:

- **`ActiveCenterContext`** — fuente única de "qué centro estoy gestionando".
  Persistido en `localStorage` (`zperf_active_center`). El `CenterSwitcher`
  en el Topbar permite cambiar de centro. `canSeeModule(id)` gatea el sidebar
  según la membresía del usuario en ese centro.

- **`SquadContext`** — única fuente de atletas del panel para el centro
  activo. Carga el roster real vía `listCenterAthletes`. Si hay centro, datos
  reales (vacíos → estado vacío con ilustración); si no hay centro → mock demo
  poblado con `DemoBadge: demo`. Los campos reales (nombre, posición, etc.) se
  guardan en la API; los sintéticos (métricas de rendimiento) se persisten en
  overrides locales por centro hasta que el backend los modele.

Los módulos Plantilla, Rendimiento, Lesiones, Test, Psicológico, Carga y
Equipo consumen `useSquad` — cuando el director ve un atleta en Plantilla, ese
mismo atleta aparece en todos los otros módulos.

---

## 8. Reportes

Módulo `/reportes` (full-stack cliente — sin backend):

- **Informe de equipo:** KPIs generales, plantilla completa, lesiones activas
  y próximos eventos del calendario.
- **Informe por atleta:** ficha completa del atleta, lesiones, tests físicos,
  bienestar y cuestionarios psicológicos.
- **Export PDF** (jsPDF + autotable, importado dinámicamente para code-split)
  y **CSV** (separado por `;` + BOM para Excel).
- Solo usa datos reales (omite los sintéticos de `squadSynth`). Carga con
  `Promise.allSettled` tolerante a 403 por módulo.

---

## 9. Identidad visual

**Color de acento: AZUL `#4f8cff`.** No confundir con el portal de Coach
(app móvil) que usa **morado `#7C5CFF`**. Son dos productos distintos.

| Token | Valor | Uso |
|---|---|---|
| `perf.bg` | `#0a0e1a` | Fondo principal |
| `accent` | `#4f8cff` | Acento principal |
| `accentLight` | `#7ab6ff` | Acento secundario |
| `ok` | `#32c896` | Estado correcto / verde |
| `warn` | `#ffaa32` | Alerta / amarillo |
| `danger` | `#ff4444` | Error / rojo |

Tipografía: igual que la app de consumo (Space Grotesk, JetBrains Mono,
Instrument Serif), pero sin la paleta de temas múltiples — Performance solo
tiene dark/azul marino.

---

## 10. Stack técnico del panel web

```
Frontend:  Vite + React 19 + TypeScript (SPA)
Routing:   React Router (createBrowserRouter)
HTTP:      Axios (JWT + refresh transparente; tokens en localStorage zperf_*)
Charts:    Recharts
CSS:       Tailwind v3
No usa:    TanStack Query (las llamadas van directamente con useState/useEffect)
Dev:       Puerto 5180
Build:     npm run build (tsc --noEmit + vite)
```

**Estructura `src/`:**
```
api/          client.ts (axios+JWT), auth.ts, performance.ts
auth/         AuthContext / useAuth / ProtectedRoute
centers/      ActiveCenterContext / SquadContext
components/   layout/ (Sidebar, Topbar, AppLayout) | ui/ (Dialog, DemoBadge, ...)
lib/          constants.ts, calendar.ts, simulador.ts, mockGps.ts, cargaDemo.ts, ...
pages/        Login, Dashboard, Equipo, Plantilla, Rendimiento, Lesiones, Test,
              Carga, Planificación, Psicológico, Simulador, Calendario, GPS (5),
              Reportes, Perfil
types/        CalendarEvent, Athlete, CargaMetrics, ...
router.tsx    módulos anidados en /centers/:centerId/<modulo>
```

---

## 11. Backend — app Django `performance/`

Todos los modelos B2B tienen prefijo `performance_*` y están registrados en
el admin (Unfold) y en auditlog.

**Endpoints** montados bajo `/api/performance/`:

```
POST   /auth/login/                          gatea performance_acceso
GET    /me/                                  rol + centros + módulos
PATCH  /me/                                  actualizar nombre

GET/POST      /centers/
GET           /centers/<id>/
GET/POST      /centers/<id>/staff/
GET/POST      /centers/<id>/athletes/
GET/PUT/PATCH/DELETE  /centers/<id>/athletes/<linkId>/

GET/POST      /centers/<id>/rendimiento/
GET/POST      /centers/<id>/lesiones/
GET/DELETE    /centers/<id>/lesiones/<id>/
GET/POST      /centers/<id>/test/
GET/DELETE    /centers/<id>/test/<id>/
GET/POST      /centers/<id>/planificacion/
              /centers/<id>/planificacion/<id>/mesocycles/ ...
GET/POST      /centers/<id>/psicologico/
GET/DELETE    /centers/<id>/psicologico/<id>/
GET/POST      /centers/<id>/psicologico/wellness/
GET/POST      /centers/<id>/carga/
DELETE        /carga/<id>/

GET/POST      /centers/<id>/simulador/
GET/PUT/PATCH/DELETE  /centers/<id>/simulador/<play_id>/

GET/POST      /centers/<id>/calendario/
GET/PUT/PATCH/DELETE  /centers/<id>/calendario/<event_id>/

GET           /tests/catalog/
POST          /tests/compute/
POST          /psicologico/wellness/compute/
```

---

## 12. Deploy

El panel se despliega como **Static Site en DigitalOcean App Platform**,
separado del backend:

| App DO | URL | ID | Tipo |
|---|---|---|---|
| `zyfit-performance` | `https://zyfit-performance-svp4v.ondigitalocean.app` | `b50f22a7-...` | Static Site (gratis, nyc) |
| `sea-lion-app` (backend) | `https://sea-lion-app-a2j4f.ondigitalocean.app` | `8a67cba4-...` | Docker (sfo) |

Ambas apps tienen `deploy_on_push: main` — cada `git push` publica.
El spec del panel está en `performance-web/.do/app.yaml`. `VITE_API_URL` se
inyecta en build time (Vite lo inlinea en el bundle).

**CORS del backend:** lista exacta de orígenes permitidos configurada como
env var `CORS_ALLOWED_ORIGINS` en la app DO del backend.

**Custom domain:** `panel.pyfit.app` ya está en la lista CORS; requiere
apuntar el DNS a la app del panel en DO.

---

## 13. Lo que está pendiente

| Pendiente | Estado |
|---|---|
| Fotos de atleta con DO Spaces | Código listo (FileField + django-storages), **pausado** sin commitear — requiere credenciales Spaces |
| Métricas reales de rendimiento | `lib/squadSynth` genera métricas deterministas; la deuda es modelar estos datos en el backend |
| Dashboard conectado a carga real | El microciclo del Dashboard sigue de muestra |
| Sección Staff en el Dashboard | Solo muestra atletas, no el cuerpo técnico |
| Módulos Convocatoria y Ajustes | En sidebar con pill "Pronto" |
| Backend GPS real | GPS es 100% demo; endpoints `/api/gps/...` no existen todavía |
| DELETE de membresía de staff | No hay endpoint de borrado de `CenterMembership` |
| Accesibilidad pendiente | `Dialog` aplicado solo a 2 modales; falta `SegmentedControl` accesible, `role="img"` en charts, alternativa de teclado en BodyMap/Simulador |
| Invitación por email automática | Hoy se copia el mensaje al portapapeles |
| Simulador / Planificación | Resuelven su propio `centerId` local; pendiente unificar al `ActiveCenterContext` global |

---

*Documento generado como resumen ejecutivo de la vertical B2B. Para el
detalle de implementación ver `CLAUDE.md`, el código de `performance-web/` y
`backend/performance/`, y el archivo de memoria
`memory/project_performance_vertical.md`.*
