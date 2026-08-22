# CLAUDE.md — `mobile/` (Zyfit, la app de consumo)

> Este archivo se suma al `CLAUDE.md` raíz (mapa del ecosistema de 3 productos +
> reglas cross-cutting). Acá vive el detalle profundo de **la app móvil de
> consumo (B2C)** — la migración original de Next.js/Supabase a Django+RN, hoy
> prácticamente completa. Si vas a tocar `mobile/` o los endpoints de
> `backend/` que consume (`users`, `workouts`, `checkins`, `ai_workout`,
> `runs`, `ai_running`, `devices`), leé esto primero.

---

## ⚠️ Corrección importante: la app YA NO corre en Expo Go puro

Desde el **2026-05-30** la app dejó de ser 100% Expo-Go-compatible porque
incorporó `react-native-maps`, ubicación en segundo plano (`expo-location` con
permisos "always"/foreground service Android) y Sentry
(`@sentry/react-native`) — ninguno soportado por Expo Go. Ahora se usa un
**development build (EAS)**. Si en algún lugar (docs viejos, memoria antigua)
ves "nunca uses `react-native-maps`, mantené compatibilidad con Expo Go", **ya
no aplica** — fue una decisión deliberada para habilitar el tracking GPS del
módulo de running.

- **Dev loop:** `cd mobile && npx expo start --dev-client` (hot reload igual
  que antes; NO es `npx expo start` a secas).
- **Rebuild del dev-client** (solo si cambian deps nativas o
  `app.json`/`eas.json`): `npx eas-cli build --profile development --platform ios`.
- Requiere `.npmrc` con `legacy-peer-deps=true` y `newArchEnabled: true`.
- Build de desarrollo local con `expo run:ios`: setear
  `SENTRY_DISABLE_AUTO_UPLOAD=true` (ya está en los profiles de `eas.json`) —
  si no, falla al subir symbols de Sentry.
- **Librerías nativas activas hoy** (más allá de las Expo-Go-friendly de
  siempre): `react-native-maps`, `expo-location` (background), `expo-dev-client`,
  `@sentry/react-native`, `@react-native-google-signin/google-signin`,
  `expo-video`. Las de siempre siguen: `expo-blur` (glassmorphism, NUNCA
  `react-native-blur`), `expo-router`, `expo-secure-store`,
  `expo-linear-gradient`, `expo-haptics`, `expo-notifications`,
  `react-native-svg`, `react-native-reanimated`, `react-native-gesture-handler`,
  `@expo-google-fonts/*`.

## Backend compartido

Este producto consume las apps Django: `users`, `workouts`, `checkins`,
`ai_workout` (motor de fuerza), `runs` + `ai_running` (motor de running),
`devices`, `promos` (compartida con Zyfit Academy — códigos de descuento de
influencers). Backend deploy: DO `sea-lion-app` →
`https://sea-lion-app-a2j4f.ondigitalocean.app`. Ver `backend/CLAUDE.md` para
la vista de infraestructura compartida (migraciones, gotchas de deploy, CORS).

Cliente HTTP: `mobile/lib/api.ts` (JWT con auto-refresh). El portal de coach
usa un cliente **aparte**, `mobile/lib/coachApi.ts` (token
`coach_access_token`, refresh propio) — no mezclarlos.

```typescript
// lib/api.ts — patrón real
import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

async function getHeaders() {
  const token = await SecureStore.getItemAsync('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
```

## Identidad visual

- **8 paletas de color**, no una sola fija — `mobile/lib/colors.ts` exporta
  `DARK_COLORS`, `LIGHT_COLORS`, `PINK_COLORS` (rosado), `MIDNIGHT_COLORS`,
  `SAND_COLORS`, `FOREST_COLORS`, `NEON_COLORS`, `OCEAN_COLORS`. El usuario
  elige tema; `lib/theme.tsx` expone `isDark` y resuelve la paleta activa.
  `COLORS` (alias legado) = `DARK_COLORS`. **Antes de asumir un valor
  hexadecimal, leer `lib/colors.ts` directamente** — ya divergió del original:
  hoy `DARK_COLORS.bg = '#0d0d0d'` (no `#000000` puro; `sheetBg`/`cardBg` sí
  son negro puro), `accent = '#4f8cff'` se mantiene.
- Tipografía: **Space Grotesk** 600-700 en títulos (tracking negativo -0.02 a
  -0.04), **JetBrains Mono** 400-500 en labels/tags (uppercase, tracking
  positivo), **Instrument Serif** italic como acento en títulos, Space Grotesk
  400-500 en cuerpo. Cargadas con `@expo-google-fonts/*` vía `expo-font`.
- Glassmorphism: **siempre** `expo-blur` (`BlurView`), nunca
  `react-native-blur` (no compatible con Expo Go / dev-client sin rebuild).
- Colores por fase de entrenamiento (`FASES` en `lib/colors.ts`):
  calentamiento naranja `#ffaa32`, bloque principal azul `#4f8cff`, vuelta a
  la calma verde `#32c896`.
- **Zyfit Coach (portal de entrenador, vive DENTRO de esta misma app) usa una
  paleta morada FIJA e independiente** — `lib/coachTheme.ts`, objeto `P`,
  `purple #7C5CFF`. No confundir con las 8 paletas de arriba, y mucho menos con
  el azul de Zyfit Performance (`#4f8cff`, panel web aparte) — son 3
  identidades de color distintas en 3 superficies distintas.

```javascript
import { BlurView } from 'expo-blur'
<BlurView intensity={40} tint="dark" style={styles.glassCard}>{children}</BlurView>
```

```javascript
// Círculo de progreso (fatiga, volumen semanal, nivel) — SVG custom
import Svg, { Circle } from 'react-native-svg'
function CirculoProgreso({ porcentaje, color, size = 100 }) {
  const radio = (size - 12) / 2
  const circunferencia = 2 * Math.PI * radio
  const offset = circunferencia - (Math.min(porcentaje, 100) / 100) * circunferencia
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size/2} cy={size/2} r={radio} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8"/>
      <Circle cx={size/2} cy={size/2} r={radio} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${circunferencia} ${circunferencia}`}
        strokeDashoffset={offset} strokeLinecap="round"/>
    </Svg>
  )
}
```

## Navegación (Expo Router)

Tab navigator inferior — **6 tabs visibles hoy** (el plan original tenía 5,
sin Chat): **Inicio** (`dashboard`), **Estadísticas** (`estadisticas`),
**Entrenar/check-in** (`checkin`, botón central destacado), **Chat**
(`chat` — recomendaciones de IA, `/api/chat/*`), **Historial** (`historial`),
**Perfil** (`perfil`).

Rutas ocultas del tab bar (`options={{ href: null }}`): `notificaciones`,
`generate`, `ejecutar/[id]`, `feedback/[id]`, `run/index`,
`run/resumen/[id]`, `run/feedback/[id]`, `running/index` (módulo de running),
`admin/index` (panel admin in-app, gated `is_staff`).

Stack del flujo de fuerza: `checkin → generate → ejecutar/[id] → feedback/[id]`.

Portal de coach vive en su propio grupo de rutas, **`app/(coach)/*`**
(`inicio`, `atleta/[id]`, `analytics`, `ajustes`, `rutina-builder` —
registrado `href:null` en el layout principal), con login propio
(`POST /api/auth/coach/login/`). Lado atleta:
`app/(app)/perfil/registro-coach.tsx` (ingresar código / chatear con el coach).

## Esquema de base de datos (apps `users` / `workouts` / `checkins`)

**profiles** (extiende auth user) — nombre, objetivo, objetivos_multiples
(ArrayField), nivel, lesiones, experiencia_deportiva, estilo_entrenamiento,
fecha_nacimiento, peso, altura, sexo, dias_semana, horario_preferido,
nivel_estres, tipo_trabajo, ejercicios_favoritos, ejercicios_evitar, rm_*
(sentadilla/peso_muerto/press_banca/press_hombro), usa_ciclo_menstrual,
racha_actual, mejor_racha, puntos_totales, logros (ArrayField).

**user_locations** — user FK, nombre, tipo (gimnasio/casa/exterior),
implementos (ArrayField).

**daily_checkin** — user FK, fecha (unique con user), estado_animo (1-5),
calidad_sueno (decimal), hrv (nullable), location FK, duracion_disponible,
foco_entrenamiento (ArrayField), dolor_hoy, notas.

**sessions** — user FK, checkin FK (nullable), location FK (nullable), fecha,
duracion_planificada, rpe_target, volumen_relativo, prompt_usado,
`respuesta_ia` (JSONField), origen (`manual`/`ia`/`coach` — este último de
`CoachAssignedSession` publicada), creado_por.

**session_exercises** — session FK, orden, nombre, series, repeticiones,
descanso_segundos, rpe_sugerido, notas.

**session_feedback** — session FK (OneToOne), rpe_real, cumplimiento (0-100),
rating (1-5), notas.

**competitions** — user FK, nombre, fecha, tipo, distancia_disciplina.

**menstrual_cycle** — user FK, fecha_inicio, duracion_ciclo (default 28).

## Endpoints (ver `backend/pyfit/urls.py` para la lista exacta)

Auth (`/api/auth/*` incluyendo `/api/auth/google/`), `/api/profile/`
(+`/push-token/`), `/api/locations/`, `/api/injuries/`,
`/api/menstrual-cycle/`, `/api/checkins/*`, `/api/sessions/*`, `/api/stats/*`,
`/api/chat/*` (+`/recomendaciones/`), `/api/runs/*`, `/api/running/*`,
`/api/training-cycle/*`, `/api/eventos/*`, `/api/notificaciones/*`,
`/api/competitions/*`, `/api/integrations/garmin/*`,
`/api/integrations/apple-health/*`, `/api/exercises/*` (+`/search/`
+`/create/`), `/api/coach/*` (portal de coach), `/api/admin/*` (admin in-app).

## Lógica de generación de rutinas de FUERZA (CRÍTICO — `backend/ai_workout/views.py`)

El activo más valioso del producto — preservar con precisión exacta.

**calcularFatiga(sesiones)** — filtra sesiones de últimas 72h, devuelve
`'alto' / 'medio' / 'bajo'`.

**calcularRPETarget(fatiga, estadoAnimo, hrv)** — RPE base = 7. Fatiga alta:
−2, media: −1. Ánimo ≤2: −1, ≥5: +1. HRV <50: −1, >80: +1. Clamp entre 4 y 9.

**buildPrompt(contexto)** — prompt completo con todos los campos del perfil,
principios científicos embebidos (Schoenfeld 2017, Zourdos 2016, Helms, NSCA),
restricciones absolutas (dolor_hoy, ejercicios_evitar, implementos), y **tras**
esas restricciones el bloque "DIRECTIVA DEL ENTRENADOR" si el atleta tiene
coach activo (ver sección Coach abajo). Schema JSON de respuesta estricto:
fases Calentamiento / Bloque principal / Vuelta a la calma. Nota del
entrenador: máximo 2 oraciones.

**Flujo completo:** perfil → check-in de hoy → sesiones recientes (2 semanas)
→ competición próxima (14 días) → `_get_coach_config`/`_get_coach_directiva`
(no-op sin coach) → calcular fatiga y RPE target → contexto → prompt → Groq
(`llama-3.3-70b-versatile`, max_tokens=2048) → parsear JSON → guardar Session
con `respuesta_ia` → devolver sesión + session_id.

`respuesta_ia` (JSONField): `{titulo, objetivo_sesion, rpe_target,
duracion_total, fases: [{nombre, duracion_minutos, ejercicios: [{nombre,
series, repeticiones, descanso_segundos, rpe_sugerido, notas}]}],
nota_del_entrenador}`.

## Running — módulo que NO estaba en el plan de migración original

Espejo del motor de fuerza, para carreras. Modelos en `backend/runs/`:
`RunSession`/`RunPoint` (tracking GPS — por esto la app dejó Expo Go),
`RunnerProfile`, `RunningPlan`/`PlannedRunSession` (planificación).
`backend/ai_running/views.py`: estima baseline (`estimate_baseline`,
`start_time_trial`), genera sesión adaptativa (`generate_run_session`) con el
mismo patrón "el motor fija los números (ritmo/duración/zona), el LLM solo
redacta" que usa `ai_workout` y que luego copió el generador de equipo de
Zyfit Performance. Pantallas: `mobile/app/(app)/run/` y `running/`.

### ⚠️ El motor de running SOLO sirve para correr

`ai_running` ancla **toda** la intensidad en `threshold_pace_s_km` y devuelve
objetivos en min/km. Eso no significa nada sobre una bici (viento y pendiente
destruyen el ritmo) ni en una piscina.

En el check-in, **todas** las disciplinas CARDIOVASCULAR comparten
`path: 'running'` porque el FLUJO es el mismo (elegir entorno → tracking GPS)
— pero eso hacía que Ciclismo, Natación y Caminata ofrecieran "Entrenamiento
inteligente" y recibieran una sesión de CARRERA. Corregido 2026-08-21:
`mobile/lib/disciplinas.ts` es el **único** lugar que decide qué disciplina
tiene motor propio (hoy `running`, `trail` y, desde 2026-08-22, `ciclismo`
— ver sección propia más abajo). Natación y caminata siguen sin motor: no
inventar uno solo por simetría.

### Ejecución guiada (`mobile/lib/runSteps.ts`)

`estructura_fases.segmentos` describe la sesión de forma comprimida: un
segmento puede valer 5 repeticiones. `expandirPasos()` lo despliega en la
secuencia de bloques ejecutables que el tracker recorre uno a uno.

Dos reglas que hay que respetar si se toca:
1. **La recuperación va solo ENTRE repeticiones**, nunca tras la última —
   es la misma regla con la que el backend calcula la duración total
   (`n_rec = max(0, reps - 1)`). Contarlo distinto hace que la sesión guiada
   dure más que la prescrita.
2. **Hay bloques sin duración declarada** (la recuperación de cuestas es
   `{tipo: 'bajar trotando'}`, sin `min` ni `seg`). Se modelan como `manual`
   y los cierra el usuario; no inventarles un tiempo.

Los tests de `lib/runSteps.test.ts` usan fixtures copiados de la salida real
de `prescribe_run_session` — si el backend cambia de forma, fallan a
propósito.

## Ciclismo — motor propio, SIN GPS en v1

Espejo de Running, con las mismas piezas del lado backend (`backend/cycling/`,
`backend/ai_cycling/`, `backend/endurance/` compartida) y del lado mobile:
`mobile/lib/cyclingApi.ts` (motor, `/api/cycling/*`) + `mobile/lib/ridesApi.ts`
(CRUD, `/api/rides/*`) — mismo split que `runningApi.ts`/`runsApi.ts`.
Pantallas: `app/(app)/cycling/` (generación) y `app/(app)/ride/` (ejecución +
`ride/feedback/[id]`).

**Decisión de producto (2026-08-22): sin tracking GPS por ahora.**
`app/(app)/ride/index.tsx` es SOLO timer + guía por pasos — nada de mapa,
distancia ni ritmo en vivo. Las métricas agregadas (potencia/cadencia/FC/
distancia) las reporta el cliente al completar la `RideSession` (ver
`backend/cycling/serializers.py`), no se derivan de una traza — no hay
`RidePoint` (equivalente a `RunPoint`) todavía. Si se pide tracking en vivo,
es una feature de mobile nativo aparte, no una extensión silenciosa de esta
pantalla.

**Ancla FC + RPE, potencia OPCIONAL** (no FTP): la mayoría de quien pedalea
no tiene potenciómetro. `potencia_objetivo` es `null` en ese caso — el caso
ESPERADO, nunca lo trates como un estado degradado.

### ⚠️ Acoplamiento que no era obvio al planear esto

Activar `ciclismo` en `DISCIPLINAS_MOTOR_INTELIGENTE` **sin** las pantallas
`cycling/`/`ride/` ya construidas habría hecho que el botón "Entrenamiento
inteligente" del check-in (que navegaba SIEMPRE a `/(app)/running`,
sin mirar la disciplina) le diera a un ciclista una sesión de CARRERA con
ritmos en min/km — el mismo bug que cerró la Fase 0, por una puerta
distinta. Las tres piezas van juntas: pantallas propias + generalizar el
copy de `checkin/index.tsx` (`esCiclismo`/`isCiclismo` en `renderD4b`/
`renderD6`, routing del CTA final) + la entrada en `disciplinas.ts`. Si se
suma otro deporte cardio con motor propio en el futuro, repetir el trío
completo — sumar solo a `disciplinas.ts` reintroduce el bug.

**Gap conocido, no bloqueante:** el paso "¿exteriores o interiores?" (d5 del
check-in) se sigue mostrando para ciclismo porque comparte secuencia de
pantallas con running, pero ninguna pantalla de ciclismo lee esa respuesta
(no hay distinción indoor/outdoor sin GPS). No corrompe nada — solo pregunta
algo que hoy no se usa.

`mobile/lib/runSteps.ts` (Fase 4 de running) se escribió **antes** de que
existiera el motor de ciclismo — no sabía leer `potencia_objetivo`. Se le
sumó `powerRange` a `PasoObjetivo` (retrocompatible: running nunca manda esa
clave, sigue dando `null` ahí) — si se toca `runSteps.ts`, tener presente que
ahora lo usan los dos deportes.

## Gamificación (fuerza — Academy tiene la suya, NO mezclar)

Niveles por total de sesiones: Rookie (0-4), Atleta (5-14), Élite (15-29),
Leyenda (30+).

```python
LOGROS = [
    {'id': 'primera_sesion', 'label': 'Primera sesión', 'icon': '🎯', 'condicion': lambda s, r, c: s >= 1},
    {'id': 'racha_3',        'label': 'Racha de 3',     'icon': '🔥', 'condicion': lambda s, r, c: r >= 3},
    {'id': 'racha_7',        'label': 'Semana perfecta','icon': '💎', 'condicion': lambda s, r, c: r >= 7},
    {'id': 'sesiones_10',    'label': '10 sesiones',    'icon': '⚡', 'condicion': lambda s, r, c: s >= 10},
    {'id': 'sesiones_25',    'label': '25 sesiones',    'icon': '🏆', 'condicion': lambda s, r, c: s >= 25},
    {'id': 'sesiones_50',    'label': '50 sesiones',    'icon': '👑', 'condicion': lambda s, r, c: s >= 50},
    {'id': 'consistencia',   'label': 'Consistente',    'icon': '🎖️', 'condicion': lambda s, r, c: c >= 90},
]
```

Racha: sesiones consecutivas hacia atrás desde hoy (si hoy no entrenó, empieza
desde ayer; lookback máximo 365 días). **Un "día entrenado" cuenta solo si la
`Session` tiene `SessionFeedback`** — generar sin dar feedback ya NO suma
racha ni calendario (decisión de producto, no revertir).

**Zyfit Academy (e-learning) tiene su PROPIO sistema de racha de estudio**
(`AcademyStreak`/`AcademyActivityDay`, freeze/recuperación distintos) —
completamente desacoplado de este. No reusar código ni confundir ambos al
escribir sobre "racha" en Zyfit.

## Portal de Coach (dentro de esta app — backend en `backend/users/coach_views.py`)

Production-ready. Un coach es un `User` con `role='coach'` +
`coach_activo=True`; login propio `/api/auth/coach/login/`. Vínculo
coach↔atleta por **código de invitación** (`Profile.codigo_coach`, modelo
`CoachAthlete`). Zyfit Score = `0.45·consistencia + 0.40·adherencia +
0.15·recencia` (0-100). El coach fija una **directiva** (objetivo/foco/evitar/
nota) que sesga el prompt de IA — no arma rutinas manuales por sí solo, salvo
con el constructor `rutina-builder` que crea un borrador
(`CoachAssignedSession`) que solo se materializa como `Session` real al
publicar. 3 toggles de config con enforcement real: `checkin`, `feedback`,
`ia` (si `ia=false`, `generate_session` corta con 403
`{coach_pausa_ia:true}` antes de llamar a Groq). Facturación administrada vía
`CoachSubscription` (sin cobrador conectado). Chat por polling de 5s (sin
push/WebSocket). Detalle completo, fórmulas exactas y todos los endpoints en
la memoria `project_coach_portal` — leerla antes de tocar esta feature.

## Continúa con Google

Login social: SDK nativo (`@react-native-google-signin/google-signin`) +
endpoint `/api/auth/google/`. Código completo y testeado (backend+mobile);
falta que el usuario configure sus propias credenciales OAuth. Ver memoria
`project_google_signin`.

## Publicación en tiendas — AÚN NO PUBLICADA

La app todavía no está en Play Store/App Store. Plan de lanzamiento completo
(verificación de identidad, OAuth Android SHA-1, Sentry DSN, Maps key, build
`.aab`, testing ~20 usuarios/14 días, formulario de permisos sensibles +
justificación ES/EN, video, Data Safety, ficha) documentado en la memoria
`project_playstore_publication` — leerla antes de retomar el lanzamiento.

## Flujos del producto

1. **Autenticación** — email+contraseña, "Continúa con Google", forgot
   password, onboarding tras registro.
2. **Onboarding (5 pasos)** — objetivos/nivel/experiencia/lesiones → sexo/
   fecha nacimiento/peso/altura/ciclo → días-semana/horario/estrés/trabajo →
   estilo/ejercicios favoritos-evitar → ubicaciones con implementos.
3. **Check-in diario** — foco, dolor_hoy (mapa corporal interactivo),
   estado_animo, calidad_sueno, hrv opcional, ubicación, duración, notas.
4. **Generación de rutina (IA)** — loading animado; muestra título, objetivo,
   stats, nota del entrenador, fases colapsables; botón regenerar por
   ejercicio; ejecutar / marcar completada sin ejecutar.
5. **Modo ejecución** — barra de progreso, nav ← ANTERIOR/SALIR, pantalla de
   ejercicio (demo emoji+YouTube, nota técnica, card de serie), pantalla de
   descanso (timer circular), pantalla de fin + CTA feedback.
6. **Feedback post-sesión** — RPE real, cumplimiento, rating, notas.
7. **Dashboard** — calendario semanal, círculos de fatiga/volumen, ranking,
   últimas 3 sesiones.
8. **Historial** — lista agrupada por mes / calendario de 6 meses coloreado
   por cumplimiento.
9. **Estadísticas** — 4 secciones: Rendimiento, Carga, Prevención,
   Progresión.
10. **Perfil** — datos personales, dispositivos, datos de entrenamiento,
    suscripción, referidos, feedback, ayuda; modales por ítem.
11. **Running** (ver arriba) — perfil de corredor, time trial, plan
    adaptativo, tracking GPS en vivo.
12. **Chat** — recomendaciones conversacionales de IA.
13. **Portal de Coach** (ver arriba) — cartera de atletas, analytics, chat,
    directiva/rutina manual.

## Timer del modo ejecución

```javascript
const intervalRef = useRef(null)
useEffect(() => {
  if (timerActivo && timerSegundos > 0) {
    intervalRef.current = setInterval(() => {
      setTimerSegundos(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setTimerActivo(false)
          setEstado('ejercicio')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }
  return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
}, [timerActivo, timerSegundos])
```

## Variables de entorno

Templates en `mobile/`: `env.development.template` (IP local del backend
Django, p. ej. `http://192.168.0.118:8000`) y `env.production.template`
(backend DO, `https://sea-lion-app-a2j4f.ondigitalocean.app`). Expo solo lee
`.env` (nombres sin punto inicial a propósito, para que Expo no cargue los
templates automáticamente).

```bash
cp mobile/env.development.template mobile/.env   # local
cp mobile/env.production.template mobile/.env    # producción
npx expo start --dev-client --clear              # tras cambiar .env
```

`.env` está en `.gitignore`; los templates sí se commitean.

## Notas críticas

1. El prompt de generación de fuerza es el activo más importante — cualquier
   cambio ahí se prueba exhaustivamente antes de mergear.
2. La identidad visual (colores, tipografías, glassmorphism) es parte de la
   diferenciación del producto — no la reinventes por pantalla.
3. `respuesta_ia` es un JSONField con la estructura exacta de arriba — no la
   cambies sin migrar los datos existentes.
4. Groq SDK para Python: `pip install groq`, modelo
   `llama-3.3-70b-versatile`. `GROQ_API_KEY` en `backend/.env`.
5. El calendario semanal/mensual usa lógica JS pura, sin librerías — no
   agregar una librería de calendario.
6. Los círculos de progreso son SVG custom (`react-native-svg`), no una
   librería de gráficos.
7. Assets de imagen deben ir en `mobile/assets/` — si no, renderizan en
   blanco sin error (gotcha ya conocido).
8. No confundir esta app con Zyfit Performance ni Zyfit Academy — comparten
   backend pero son productos, audiencias y (en Coach vs Performance) hasta
   paletas de color distintas.

## Dev commands

```bash
cd backend && python3 manage.py runserver   # backend
cd mobile && npx expo start --dev-client    # app móvil (NO Expo Go)
```
