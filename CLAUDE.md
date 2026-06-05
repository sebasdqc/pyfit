# CLAUDE.md — Instrucciones para Claude Code
## Proyecto: PyFit — Migración a Django + React Native

---

## ⚠️ VISUALIZACIÓN / PREVIEW — SIEMPRE EN DIGITALOCEAN (NUNCA LOCALHOST)

**Regla absoluta:** la visualización/preview de cualquier cambio en la **web** (el panel
**Zyfit Performance** y, en general, todo lo desplegado en DigitalOcean) se hace **SIEMPRE
desplegando en DigitalOcean vía `git push origin main`**, NUNCA en `localhost`.

- **NO** sugieras `npm run dev` / `localhost:5180` / `expo` como forma de "ver" un cambio web.
  El build local (`npm run build`) sirve **solo** para detectar errores de TypeScript/compilación,
  no como visualización.
- **Flujo de visualización:** commit → `git push origin main` → DO reconstruye solo
  (`deploy_on_push` a `main`) → el usuario lo ve en la URL de DO.
- **URLs en vivo (DigitalOcean):**
  - Panel **Zyfit Performance** (Static Site, `source_dir: /performance-web`):
    **https://zyfit-performance-svp4v.ondigitalocean.app**  · app `zyfit-performance`, ID `b50f22a7-3cdf-44fe-be54-e52a0d8ff2c6`.
  - Backend Django: **https://sea-lion-app-a2j4f.ondigitalocean.app** · app `sea-lion-app`, ID `8a67cba4-79c2-438d-a8e7-f7c317c019c5`.
- Ambas apps tienen `deploy_on_push` a `main`: **cada `git push` publica**. Tras pushear,
  avisa al usuario que abra la URL de DO (el deploy tarda ~1–3 min).
- **Excepción:** la app **móvil** se visualiza en **Expo Go** (no está en DO). Esta regla aplica
  a lo desplegado en DigitalOcean (panel web + backend).

---

## CONTEXTO DEL PROYECTO

PyFit es una aplicación fitness de IA adaptativa que genera rutinas de entrenamiento personalizadas basadas en múltiples variables fisiológicas, de estilo de vida y de rendimiento del usuario.

Antes de escribir cualquier código, lee completamente:
- Todos los archivos en `app/` para entender las páginas y flujos
- Todos los archivos en `app/api/` para entender los endpoints
- El archivo `app/api/generate/route.js` — este es el corazón del sistema
- El archivo `middleware.js` o `proxy.js` para entender la protección de rutas
- Los componentes en `app/components/`

---

## STACK ACTUAL (Next.js — origen)

- **Frontend + Backend:** Next.js 16 con App Router
- **Base de datos:** Supabase (PostgreSQL + Auth + RLS)
- **IA:** Groq API con modelo `llama-3.3-70b-versatile`
- **Autenticación:** Supabase Auth con SSR
- **Estilos:** CSS-in-JS con estilos inline en React

---

## STACK OBJETIVO (migración)

- **Backend:** Django 5 + Django REST Framework
- **Mobile:** React Native con Expo
- **Base de datos:** PostgreSQL (misma estructura de Supabase, nueva instancia)
- **Autenticación:** Django REST Framework + SimpleJWT
- **IA:** Groq API (mismo modelo, misma lógica de prompt)
- **Deploy Backend:** DigitalOcean App Platform
- **Deploy Frontend:** Expo EAS Build (iOS + Android) + Vercel para landing
- **CDN/Proxy:** Cloudflare

---

## ARQUITECTURA OBJETIVO

```
pyfit/
  backend/          ← Django project
    pyfit/          ← Django app principal
      settings.py
      urls.py
    users/          ← App de usuarios y perfiles
    workouts/       ← App de sesiones y ejercicios
    checkins/       ← App de check-ins diarios
    ai/             ← App de generación con IA
    requirements.txt
    Dockerfile
    .do/app.yaml

  mobile/           ← React Native + Expo
    app/            ← Expo Router (estructura similar a Next.js App Router)
      (auth)/       ← Pantallas de autenticación
      (app)/        ← Pantallas principales con tab navigator
        dashboard/
        checkin/
        generate/
        ejecutar/
        feedback/
        historial/
        estadisticas/
        perfil/
    components/
      NavBar.tsx
      CalendarioSemana.tsx
      CirculoProgreso.tsx
    lib/
      api.ts         ← Cliente HTTP hacia Django backend
      auth.ts        ← Gestión de JWT tokens
      storage.ts     ← AsyncStorage helpers
    assets/
    app.json
    package.json

  landing/          ← Next.js (solo landing page pública)
    app/
      page.js       ← Landing page actual de PyFit
```

---

## ESQUEMA DE BASE DE DATOS

Replica exactamente este esquema en Django models. Los nombres de tablas y campos deben ser idénticos o equivalentes en snake_case.

### Tablas principales:

**profiles** (extiende auth user)
- id, nombre, objetivo, objetivos_multiples (ArrayField), nivel
- lesiones, experiencia_deportiva, estilo_entrenamiento
- edad (reemplazar por fecha_nacimiento date), peso (decimal), altura (int), sexo
- dias_semana (int), horario_preferido, nivel_estres, tipo_trabajo
- ejercicios_favoritos, ejercicios_evitar
- rm_sentadilla, rm_peso_muerto, rm_press_banca, rm_press_hombro (decimals)
- usa_ciclo_menstrual (bool), racha_actual (int), mejor_racha (int)
- puntos_totales (int), logros (ArrayField)
- created_at

**user_locations**
- id, user (FK profiles), nombre, tipo (gimnasio/casa/exterior)
- implementos (ArrayField), created_at

**daily_checkin**
- id, user (FK profiles), fecha (date, unique con user)
- estado_animo (1-5), calidad_sueno (decimal), hrv (int nullable)
- location (FK user_locations), duracion_disponible (int)
- foco_entrenamiento (ArrayField), dolor_hoy (text nullable)
- notas (text nullable), created_at

**sessions**
- id, user (FK profiles), checkin (FK daily_checkin nullable)
- location (FK user_locations nullable), fecha (date)
- duracion_planificada (int), rpe_target (decimal), volumen_relativo
- prompt_usado (text), respuesta_ia (JSONField), created_at

**session_exercises**
- id, session (FK sessions), orden (int), nombre, series (int)
- repeticiones (text), descanso_segundos (int), rpe_sugerido (decimal), notas

**session_feedback**
- id, session (FK sessions, OneToOne), rpe_real (decimal)
- cumplimiento (0-100), rating (1-5), notas, created_at

**competitions**
- id, user (FK profiles), nombre, fecha (date), tipo, distancia_disciplina

**menstrual_cycle**
- id, user (FK profiles), fecha_inicio (date), duracion_ciclo (int default 28)

---

## ENDPOINTS DJANGO REST FRAMEWORK

Crea estos endpoints replicando exactamente la lógica de los archivos en `app/api/`:

### Auth
```
POST /api/auth/register/         ← Registro con email + password
POST /api/auth/login/            ← Login, devuelve access + refresh JWT
POST /api/auth/refresh/          ← Refresh token
POST /api/auth/logout/
POST /api/auth/reset-password/   ← Envío de email de recuperación
```

### Profiles
```
GET  /api/profile/               ← Perfil del usuario autenticado
PUT  /api/profile/               ← Actualizar perfil
```

### Locations
```
GET  /api/locations/             ← Listar ubicaciones del usuario
POST /api/locations/             ← Crear ubicación
PUT  /api/locations/{id}/        ← Actualizar ubicación
```

### Check-ins
```
GET  /api/checkins/today/        ← Check-in de hoy (existe o no)
POST /api/checkins/              ← Crear check-in diario
```

### Sessions
```
POST /api/sessions/generate/     ← ENDPOINT CRÍTICO — genera sesión con IA
GET  /api/sessions/              ← Historial de sesiones
GET  /api/sessions/{id}/         ← Detalle de sesión
```

### Feedback
```
POST /api/sessions/{id}/feedback/  ← Crear feedback post-sesión
```

### Ejercicios
```
GET  /api/ejercicio-demo/        ← Emoji músculo + query YouTube por nombre
POST /api/ejercicios/regenerar/  ← Regenerar ejercicio individual con IA
```

### Stats
```
GET  /api/stats/dashboard/       ← Métricas para dashboard
GET  /api/stats/full/            ← Métricas completas para estadísticas
```

### Competitions
```
GET  /api/competitions/
POST /api/competitions/
DELETE /api/competitions/{id}/
```

---

## LÓGICA DE GENERACIÓN DE RUTINAS (CRÍTICO)

El archivo más importante es `app/api/generate/route.js`. Migra esta lógica exactamente al view `SessionGenerateView` en Django.

### Funciones a migrar:

**calcularFatiga(sesiones)**
- Filtra sesiones de últimas 72h
- Devuelve 'alto' / 'medio' / 'bajo'

**calcularRPETarget(fatiga, estadoAnimo, hrv)**
- RPE base = 7
- Si fatiga alta: -2, media: -1
- Si ánimo ≤ 2: -1, ≥ 5: +1
- Si HRV < 50: -1, > 80: +1
- Clamp entre 4 y 9

**buildPrompt(contexto)**
- Prompt completo con todos los campos del perfil
- Principios científicos embebidos (Schoenfeld 2017, Zourdos 2016, etc.)
- Restricciones absolutas: dolor_hoy, ejercicios_evitar, implementos
- Schema JSON de respuesta estricto con fases: Calentamiento, Bloque principal, Vuelta a la calma
- La nota del entrenador debe ser máximo 2 oraciones

**Flujo completo del generate:**
1. Obtener perfil del usuario
2. Obtener check-in de hoy
3. Obtener sesiones recientes (últimas 2 semanas)
4. Obtener competición próxima (próximos 14 días)
5. Calcular fatiga y RPE target
6. Construir contexto completo
7. Construir prompt enriquecido
8. Llamar a Groq API (llama-3.3-70b-versatile, max_tokens=2048)
9. Parsear JSON de respuesta
10. Guardar sesión en DB con respuesta_ia
11. Devolver sesión + session_id

---

## REACT NATIVE — IDENTIDAD VISUAL

### Paleta de colores (replicar exactamente)
```javascript
const COLORS = {
  bg: '#000000',
  bgGradient: 'rgba(37,99,255,0.25)',  // gradiente superior
  white: '#ffffff',
  accent: '#4f8cff',
  accentLight: '#7ab6ff',
  accentDark: '#2563ff',
  cyan: '#6ce5ff',
  green: '#32c896',
  orange: '#ffaa32',
  red: '#ff4444',
  inkPrimary: '#e8efff',
  inkSecondary: 'rgba(255,255,255,0.6)',
  inkMuted: 'rgba(255,255,255,0.35)',
  inkFaint: 'rgba(255,255,255,0.15)',
  borderDefault: 'rgba(255,255,255,0.08)',
  borderBright: 'rgba(255,255,255,0.15)',
  cardBg: 'rgba(255,255,255,0.05)',
  glassBg: 'rgba(255,255,255,0.07)',  // inputs
}
```

### Tipografía
- **Títulos:** Space Grotesk 600-700, letterSpacing negativo (-0.02 a -0.04)
- **Labels/tags:** JetBrains Mono 400-500, uppercase, letterSpacing positivo
- **Acento tipográfico:** Instrument Serif italic para palabras clave en títulos
- **Cuerpo:** Space Grotesk 400-500

### Componentes de color por fase de entrenamiento
```javascript
const FASES = {
  calentamiento: { color: '#ffaa32', bg: 'rgba(255,160,50,0.1)', label: '🔥 CALENTAMIENTO' },
  principal:     { color: '#4f8cff', bg: 'rgba(79,140,255,0.1)',  label: '⚡ BLOQUE PRINCIPAL' },
  enfriamiento:  { color: '#32c896', bg: 'rgba(50,200,150,0.1)', label: '❄️ VUELTA A LA CALMA' },
}
```

### Glassmorphism (para cards y modales)
```javascript
// SIEMPRE usar expo-blur (compatible con Expo Go)
// NUNCA usar react-native-blur (NO compatible con Expo Go)
import { BlurView } from 'expo-blur'

// Uso:
<BlurView intensity={40} tint="dark" style={styles.glassCard}>
  {children}
</BlurView>

const styles = {
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    overflow: 'hidden',
  }
}

// Para cards simples sin blur real, puedes omitir BlurView:
const simpleCard = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  borderRadius: 20,
}
```

---

## NAVEGACIÓN REACT NATIVE

Usa **Expo Router** con tab navigator inferior.

### Tab Navigator (5 tabs):
```
Inicio        → /app/(app)/dashboard
Estadísticas  → /app/(app)/estadisticas
[ENTRENAR]    → /app/(app)/checkin  (botón central destacado blanco)
Historial     → /app/(app)/historial
Perfil        → /app/(app)/perfil
```

### Stack dentro de cada flujo:
```
checkin → generate → ejecutar/[id] → feedback/[id]
```

---

## FLUJOS COMPLETOS A MIGRAR

### 1. Autenticación
- Login / Registro con email+password
- Forgot password (envía email via Django)
- Botones visuales de Google y Apple (no conectados)
- Después del registro → Onboarding

### 2. Onboarding (5 pasos)
- Paso 1: Nombre, objetivos (múltiples), nivel, experiencia deportiva, lesiones
- Paso 2: Sexo, fecha nacimiento, peso (kg/lb toggle), altura (cm/ft toggle), ciclo menstrual toggle
- Paso 3: Días/semana (slider), horario, estrés, tipo trabajo
- Paso 4: Estilo entrenamiento, ejercicios favoritos (selector con búsqueda), ejercicios a evitar (selector con búsqueda)
- Paso 5: Ubicaciones con implementos

### 3. Check-in diario
Campos: foco_entrenamiento (multi-select chips), dolor_hoy (textarea), estado_animo (1-5 emojis), calidad_sueno (slider 3-12h), hrv (input opcional), ubicacion (selector), duracion (slider 20-120min), notas

### 4. Generación de rutina
- Pantalla de loading con spinner y mensaje animado
- Muestra: título, objetivo_sesion, stats (duración/RPE/RIR), nota del entrenador (máx 2 oraciones), fases colapsables con ejercicios
- Cada ejercicio: nombre, series, reps, descanso, RPE, RIR, notas, botón regenerar (↻)
- Botones: Ejecutar sesión / Marcar completada sin ejecutar

### 5. Modo ejecución
- Barra de progreso superior
- Nav: ← ANTERIOR | fase actual | SALIR
- Pantalla ejercicio: nombre, demo (emoji músculo + link YouTube), nota técnica, card serie (serie X/Y, RPE, RIR, reps, descanso), indicadores de series
- Pantalla descanso: timer circular con countdown, nombre del siguiente ejercicio
- Pantalla fin: celebración + botón feedback

### 6. Feedback post-sesión
- RPE real (slider 1-10)
- Cumplimiento (slider 0-100%)
- Rating general (1-5 emojis)
- Notas (textarea)
- Botones: Finalizar / Compartir en redes (próximamente) / Saltar

### 7. Dashboard
- Header: avatar iniciales + nombre + campana notificaciones
- Calendario semanal L-D con días entrenados destacados (click → historial calendario)
- Dos círculos: Fatiga (%) + Volumen semanal (%)
- Card de Ranking/Nivel (click → alert próximamente)
- Últimas 3 sesiones con botón "Ver todo"

### 8. Historial
- Toggle Lista / Calendario
- Vista lista: agrupada por mes, click en sesión abre modal con detalle
- Vista calendario: 6 meses, días coloreados por cumplimiento, click en día abre modal
- Leyenda de colores: ≥90% verde, 70-89% verde claro, sin feedback azul, <70% naranja, hoy amarillo

### 9. Estadísticas (4 secciones)
- **Rendimiento:** RPE real vs objetivo (line chart), cumplimiento semanal (bar chart), resumen
- **Carga:** Círculos fatiga+volumen, series por semana (bar chart), sesiones por semana, distribución foco muscular (barras), tendencia sueño
- **Prevención:** Alertas inteligentes, perfil de riesgo, señales de sobreentrenamiento
- **Progresión:** Esta semana vs anterior, nivel y racha, proyección 4 semanas

### 10. Perfil
- Header: avatar iniciales + nombre + nivel + objetivos
- Lista de items con flecha: Datos personales, Dispositivos conectados, Datos de entrenamiento, Suscripción, Refiere un amigo, Dar feedback, Centro de ayuda
- Cada item abre modal propio
- Cerrar sesión al fondo
- Versión y copyright

---

## GAMIFICACIÓN

### Niveles (basados en total de sesiones):
- Rookie: 0-4 sesiones
- Atleta: 5-14 sesiones
- Élite: 15-29 sesiones
- Leyenda: 30+ sesiones

### Logros:
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

### Cálculo de racha:
Sesiones consecutivas hacia atrás desde hoy. Si hoy no entrenó, empieza desde ayer. Máximo lookback: 365 días.

---

## EXPO GO — COMPATIBILIDAD CRÍTICA

**PyFit mobile debe funcionar 100% en Expo Go durante desarrollo.** No uses ninguna librería que requiera desarrollo nativo o un development build.

### Librerías APROBADAS (compatibles con Expo Go):
```
expo-blur                ← glassmorphism (NUNCA react-native-blur)
expo-router              ← navegación file-based como Next.js App Router
expo-font                ← fuentes custom
expo-secure-store        ← guardar JWT tokens
expo-linear-gradient     ← gradientes de fondo y botones
expo-haptics             ← feedback táctil
expo-clipboard           ← copiar código de referido
expo-notifications       ← notificaciones (si se necesitan)
react-native-svg         ← círculos de progreso e iconos SVG
react-native-reanimated  ← animaciones fluidas
react-native-gesture-handler ← gestos
@expo-google-fonts/*     ← Space Grotesk, JetBrains Mono, Instrument Serif
```

### Librerías PROHIBIDAS (rompen Expo Go):
```
react-native-blur        ← usar expo-blur
react-native-camera      ← no necesario
react-native-maps        ← no necesario
@stripe/stripe-react-native ← no necesario aún
react-native-firebase    ← no necesario, usamos Django
react-native-push-notification ← usar expo-notifications
```

### Setup inicial del proyecto mobile:
```bash
npx create-expo-app mobile --template blank-typescript
cd mobile
npx expo install expo-router expo-blur expo-font expo-secure-store
npx expo install expo-linear-gradient expo-haptics expo-clipboard
npx expo install react-native-svg react-native-reanimated react-native-gesture-handler
npx expo install @expo-google-fonts/space-grotesk
npx expo install @expo-google-fonts/jetbrains-mono
npx expo install @expo-google-fonts/instrument-serif
```

### Fuentes (forma correcta con Expo):
```javascript
import { useFonts } from 'expo-font'
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk'
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono'
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif'

const [fontsLoaded] = useFonts({
  'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
  'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
  'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
  'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
  'JetBrainsMono-Regular': JetBrainsMono_400Regular,
  'JetBrainsMono-Medium': JetBrainsMono_500Medium,
  'InstrumentSerif-Italic': InstrumentSerif_400Regular_Italic,
})
```

### Gradiente de fondo (reemplaza CSS radial-gradient):
```javascript
import { LinearGradient } from 'expo-linear-gradient'

<View style={{ flex: 1, backgroundColor: '#000' }}>
  <LinearGradient
    colors={['rgba(37,99,255,0.25)', 'transparent']}
    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
  />
  {children}
</View>
```

### Glassmorphism con expo-blur:
```javascript
import { BlurView } from 'expo-blur'

<BlurView intensity={40} tint="dark" style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
  {children}
</BlurView>

// Para cards simples sin blur real:
const cardStyle = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  borderRadius: 20,
}
```

### Círculos de progreso con react-native-svg:
```javascript
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

### Timer modo ejecución:
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

### JWT con expo-secure-store:
```javascript
import * as SecureStore from 'expo-secure-store'

// Guardar después del login
await SecureStore.setItemAsync('access_token', data.access)
await SecureStore.setItemAsync('refresh_token', data.refresh)

// Leer para requests
const token = await SecureStore.getItemAsync('access_token')

// Limpiar al logout
await SecureStore.deleteItemAsync('access_token')
await SecureStore.deleteItemAsync('refresh_token')
```

### Cliente HTTP hacia Django (lib/api.ts):
```typescript
import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

async function getHeaders() {
  const token = await SecureStore.getItemAsync('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function apiGet(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: await getHeaders() })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function apiPost(path: string, body: any) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST', headers: await getHeaders(), body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function apiPut(path: string, body: any) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT', headers: await getHeaders(), body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
```

### Para probar en dispositivo con Expo Go:
```bash
cd mobile
npx expo start
# Escanear QR con la app Expo Go instalada en iPhone/Android
# Cada save actualiza la app automáticamente
```

---

## VARIABLES DE ENTORNO

### Backend Django (.env)
```
SECRET_KEY=
DEBUG=False
DATABASE_URL=postgresql://...
GROQ_API_KEY=
ALLOWED_HOSTS=api.pyfit.app,localhost
CORS_ALLOWED_ORIGINS=https://pyfit.app,exp://...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
```

### Mobile React Native

El proyecto tiene templates de entorno en `mobile/`. Expo carga automáticamente `.env.development` en desarrollo con mayor prioridad que `.env`, por eso los templates usan nombres sin punto inicial para que Expo no los cargue automáticamente:

- `env.development.template` → IP local del backend Django (`http://192.168.0.118:8000`)
- `env.production.template` → backend en DigitalOcean (`https://sea-lion-app-a2j4f.ondigitalocean.app`)
- `.env` → el único archivo que Expo lee (editar directamente o copiar desde un template)

**Para cambiar de entorno, copiar el template correspondiente a `.env`:**
```bash
# Desarrollo local
cp mobile/env.development.template mobile/.env

# Producción (DigitalOcean)
cp mobile/env.production.template mobile/.env
```

Después de cambiar el `.env`, reiniciar Expo con `npx expo start --clear` para que tome el nuevo valor.

El archivo `.env` no se sube a GitHub (está en `.gitignore`). Los templates sí se suben.

---

## ORDEN DE DESARROLLO SUGERIDO

1. **Django setup:** proyecto, apps, modelos, migraciones
2. **Auth endpoints:** register, login, JWT refresh
3. **Profile + Locations endpoints**
4. **Check-in endpoints**
5. **Generate session endpoint** (el más crítico — testear exhaustivamente)
6. **Sessions + Feedback endpoints**
7. **Stats endpoint**
8. **Expo setup:** navegación, tema, cliente HTTP
9. **Pantallas auth:** Login, Registro, Forgot Password
10. **Onboarding** (5 pasos)
11. **Check-in screen**
12. **Generate screen**
13. **Ejecutar screen** (con timer)
14. **Feedback screen**
15. **Dashboard**
16. **Historial** (lista + calendario)
17. **Estadísticas** (4 secciones)
18. **Perfil** (con modales)
19. **Deploy backend en DigitalOcean App Platform**
20. **Deploy mobile con Expo EAS**

---

## NOTAS IMPORTANTES PARA CLAUDE CODE

1. **Lee todo el código existente antes de empezar.** La lógica del prompt de generación en `app/api/generate/route.js` es compleja y debe migrarse con precisión exacta.

2. **El prompt de generación es el activo más importante.** Contiene principios científicos embebidos (Schoenfeld, Zourdos, Helms, NSCA) que deben preservarse intactos en la migración a Django.

3. **La identidad visual es crítica.** Los colores, tipografías y componentes deben replicarse exactamente. PyFit tiene una estética oscura con glassmorphism y acentos azules que es parte de su diferenciación.

4. **No uses Supabase en el stack nuevo.** Todo el auth y base de datos migra a Django + PostgreSQL nativo. Los datos existentes no se migran — base de datos limpia.

5. **El campo `respuesta_ia` (antes `respuesta_claude`) es un JSONField** que almacena el objeto completo de la sesión generada con estructura: `{titulo, objetivo_sesion, rpe_target, duracion_total, fases: [{nombre, duracion_minutos, ejercicios: [{nombre, series, repeticiones, descanso_segundos, rpe_sugerido, notas}]}], nota_del_entrenador}`.

6. **Groq SDK para Python:** `pip install groq`. El modelo es `llama-3.3-70b-versatile`.

7. **Para el calendario semanal y mensual en React Native**, usa lógica JavaScript pura sin librerías externas de calendario — la implementación actual es custom y funciona bien.

8. **Los círculos de progreso** (fatiga, volumen semanal, nivel) son SVG custom en web. En React Native usa `react-native-svg`.

9. **El modo ejecución con timer** usa `setInterval` en web. En React Native usa `useRef` con `setInterval` y limpia correctamente en el cleanup del `useEffect`.

10. **Landing page:** mantener en Next.js desplegado en Vercel. Solo migrar la app móvil a React Native y el backend a Django.
