# CLAUDE.md — `backend/` (Django, compartido por los 3 productos)

> Se suma al `CLAUDE.md` raíz. **Este NO es el backend de un solo producto —
> es UN monolito Django que sirve a los tres**: la app móvil (APP), Zyfit
> Performance y Zyfit Academy. Un solo deploy en DigitalOcean
> (`sea-lion-app`), una sola base de datos Postgres. Antes de crear una app
> Django nueva o tocar `settings.py`/`urls.py`, entender qué más comparte ese
> archivo.

---

## Deploy

- **App DO:** `sea-lion-app`, ID `8a67cba4-79c2-438d-a8e7-f7c317c019c5` →
  **https://sea-lion-app-a2j4f.ondigitalocean.app**. Región `sfo`, DB
  `dev-db-389502` (Postgres 17), `source_dir: backend`, `dockerfile:
  backend/Dockerfile`, `deploy_on_push` a `main`.
- ⚠️ **El `.do/app.yaml` del repo NO es la fuente de verdad del spec vivo**
  (region/DB/envs distintos, y trae CORS/secretos que el repo no tiene). Para
  tocar la config real: `doctl apps spec get <ID> > f.yaml`, editar,
  `doctl apps update <ID> --spec f.yaml` (preserva secretos `EV[...]`).
- **Antes de reportar un deploy como "listo"**, verificar la fase real:
  ```bash
  doctl apps list-deployments 8a67cba4-79c2-438d-a8e7-f7c317c019c5 --format ID,Cause,Phase,Progress --no-header | head -3
  ```
  Un `git push` exitoso **no garantiza** que el deploy llegó a producción —
  ya pasó que 3 pushes seguidos (tutor IA, dashboard, badges de Academy)
  fallaron su deploy y DO hizo rollback automático **sin que nadie lo
  notara**, dejando memorias que decían "desplegado" cuando en realidad
  seguía corriendo código viejo.

## ⚠️ GOTCHA — migraciones (RESUELTO, pero entender por qué)

El app spec vivo de `sea-lion-app` **no tiene** job `PRE_DEPLOY migrate`
(aunque el `.do/app.yaml` del repo lo declare). Durante meses las migraciones
se aplicaron a mano en la consola de DO. Un incidente real: desplegar una
migración que agregaba una FK inversa/`OneToOne` a `User`/`Profile`
(modelos auditados por `auditlog`) sin aplicarla tumbó **todo el registro de
usuarios con 500**, porque `auditlog` recorre las relaciones inversas al
loguear el diff.

**Fix ya aplicado:** `backend/entrypoint.sh` corre
`python manage.py migrate --noinput` (bajo `set -e`) antes de `exec gunicorn`
— idempotente y self-healing en cada deploy/restart. Si falla, el contenedor
no arranca y DO mantiene el deploy anterior (nunca sirve un esquema a medias).
**Ya no hace falta migrar a mano.**

**Regla que se deriva:** agregar una FK inversa/`OneToOne` a `User`/`Profile`
hace que la tabla nueva sea REQUISITO para crear cualquier usuario — el
esquema tiene que estar migrado antes de servir el código nuevo (con el fix
de arriba esto ya es automático, pero explica por qué el orden importa).

## ⚠️ GOTCHA — nunca cargar un modelo ML en el arranque

La instancia de `sea-lion-app` es **`basic-xxs`** (~512MB RAM). Un intento de
correr `index_tutor_content` (carga `sentence-transformers`, ~500MB) en
`entrypoint.sh`:
- En **foreground**: bloqueaba el health check de DO → contenedor matado
  antes de que gunicorn levantara → rollback automático.
- En **background** (`&`): desbloqueaba el health check, pero el modelo
  corriendo en paralelo con gunicorn causaba **OOM kills intermitentes**
  (doble "Starting gunicorn" en los logs = el contenedor se reinició solo).

**Regla:** `entrypoint.sh` queda SOLO con `migrate` (bloqueante a propósito)
+ `seed_tests` (liviano, ya probado) + `exec gunicorn`. Cualquier
seed/index/comando nuevo que cargue un modelo o haga trabajo pesado de
CPU/RAM (embeddings, banco de preguntas grande, etc.) es **siempre manual**
desde la consola web de DO — nunca en el arranque.

```bash
doctl apps list-deployments 8a67cba4-79c2-438d-a8e7-f7c317c019c5 --format ID,Cause,Phase,Progress --no-header | head -5
doctl apps logs 8a67cba4-79c2-438d-a8e7-f7c317c019c5 --deployment <id> --type build
doctl apps logs 8a67cba4-79c2-438d-a8e7-f7c317c019c5 --deployment <id> --type run
```

## ⚠️ GOTCHA — headers custom nuevos rompen CORS en silencio

Cualquier header custom que agregue un cliente HTTP de un frontend
(`academy-web/src/api/client.ts`, `performance-web/src/api/client.ts`) debe
sumarse **en el mismo commit** a `CORS_ALLOW_HEADERS` en
`backend/pyfit/settings.py` (hardcodeado a mano porque `django-cors-headers`
v4.x eliminó `corsheaders.defaults`). Si no, el navegador bloquea el
preflight y **todas** las requests fallan con un error de red genérico —
indistinguible de "el backend está caído". Ya pasó 2 veces con
`academy-web` (`X-Local-Date`, luego `X-Locale`). Antes de cerrar cualquier
sesión que toque un cliente HTTP o agregue un header global nuevo, simular el
preflight:

```bash
curl -s -i -X OPTIONS https://sea-lion-app-a2j4f.ondigitalocean.app/api/<producto>/... \
  -H "Origin: https://<frontend>.ondigitalocean.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,<tu-header-nuevo>"
```

## Apps Django — qué app pertenece a qué producto

| App | Producto | Qué es |
|---|---|---|
| `users` | APP + Coach + Performance (identidad) | User, Profile, CoachAthlete/CoachSubscription/CoachAssignedSession, `coach_views.py` |
| `workouts` | APP | Session, SessionExercise, SessionFeedback, Exercise |
| `checkins` | APP | DailyCheckin |
| `ai_workout` | APP | Generación de rutinas de fuerza — **el prompt más crítico del producto**, ver `mobile/CLAUDE.md` |
| `runs` | APP | RunSession/RunPoint/RunnerProfile/RunningPlan (modelos de running) |
| `ai_running` | APP | Generación adaptativa de sesiones de running |
| `endurance` | APP (compartida running + ciclismo) | SIN modelos ni URLs — lógica pura de resistencia (readiness, ACWR/sRPE, periodización, espaciado de calidad, polarización 80/20, Karvonen/Tanaka, pick_reps). `ai_running` y `ai_cycling` delegan ahí |
| `ai_cycling` | APP (motor de ciclismo) | Ciencia (`training_science_cycling.py`, ancla FC+RPE, potencia opcional, volumen en horas) + motor adaptativo (`adaptive_engine_cycling.py`, delega en `endurance/`) + endpoints `/api/cycling/*` (perfil/baseline/plan/generate). Generable desde el backend; SIN pantallas móviles ni CRUD de RideSession (tracking) |
| `cycling` | APP (modelos de ciclismo) | CyclistProfile/RidePlan/PlannedRide/RideSession (espejo de `runs`). SIN RidePoint (tracking GPS) — es trabajo de mobile nativo, no de backend |
| `devices` | APP | Integraciones Garmin/Apple Health |
| `performance` | Zyfit Performance | SportsCenter/CenterMembership/CenterAthlete, 5 módulos, calculators/, Simulador, Calendario, Planificación+IA equipo |
| `academy` | Zyfit Academy | School/Course/Module/Lesson/Quiz, Enrollment/Certificate, streak, badges, comunidad, onboarding anónimo, submissions |
| `ai_tutor` | Zyfit Academy | Tutor IA RAG (embeddings locales + Groq) |
| `promos` | **Compartida: APP + Academy** | Códigos de descuento de influencers, campo `producto` (`zyfit_pro`/`academy_pro`) |

**`pyfit/urls.py`** es la fuente exacta de todos los prefijos de ruta —
consultarlo antes de asumir que un endpoint existe.

## CORS por producto

Cada frontend estático (Performance, Academy) necesita su origen en
`CORS_ALLOWED_ORIGINS` (env de `sea-lion-app`, no en el `.do/app.yaml` del
repo). Ya configurados: `https://zyfit-performance-svp4v.ondigitalocean.app`,
`https://zyfit-academy-e8r4w.ondigitalocean.app`, más `localhost:5180`
(Performance) y `localhost:5181` (Academy) para dev.

## Dev local

```bash
cd backend && python3 manage.py runserver
```

SQLite para dev, Postgres para prod. `GROQ_API_KEY` debe estar en
`backend/.env` para que funcione cualquier generación con IA (fuerza,
running, equipo de Performance).

## Notas críticas

1. **No es 3 backends — es 1.** Un cambio a `settings.py`/`urls.py`/
   `users/models.py` puede afectar a los 3 productos a la vez; revisar qué
   más comparte el archivo antes de un `git add -A` (ya pasó que un commit de
   Academy tuvo que stagearse quirúrgicamente porque esos 3 archivos traían
   WIP de otra feature).
2. Al agregar una FK inversa/`OneToOne` nueva a `User`/`Profile`, recordar
   que `auditlog` la recorre — la migración tiene que estar aplicada antes de
   que el código nuevo sirva tráfico (ya es automático vía `entrypoint.sh`,
   pero no lo rompas quitando el `migrate` de ahí).
3. Nunca agregues carga de modelos ML ni trabajo pesado a `entrypoint.sh`.
4. Cualquier header custom nuevo en un frontend → mismo commit en
   `CORS_ALLOW_HEADERS`.
