# PyFit — Infraestructura y Configuración

Documento de referencia para retomar el proyecto en cualquier contexto nuevo.

---

## Estructura del repositorio

```
pyfit/
  backend/          ← Django 5/6 + DRF (API REST)
    pyfit/          ← Configuración principal Django
    users/          ← Auth, perfiles, ubicaciones
    workouts/       ← Sesiones, feedback, stats, competencias
    checkins/       ← Check-in diario
    ai_workout/     ← Generación con Groq + regenerar ejercicio
    requirements.txt
    Dockerfile
    railway.toml
    .env            ← No versionar

  mobile/           ← React Native + Expo (Expo Go compatible)
    app/
      _layout.tsx         ← Root layout: SafeAreaProvider + fuentes
      index.tsx           ← Redirect a login o dashboard
      (auth)/
        login.tsx
        onboarding.tsx    ← 5 pasos: perfil completo + ubicaciones
      (app)/
        _layout.tsx       ← Tab bar custom (5 tabs)
        dashboard/index.tsx
        checkin/index.tsx
        generate/index.tsx
        ejecutar/[id].tsx
        feedback/[id].tsx
        historial/index.tsx
        estadisticas/index.tsx
        perfil/index.tsx
    lib/
      api.ts        ← Cliente HTTP con refresh automático de JWT
      auth.ts       ← Login, logout, persistencia de tokens
      colors.ts     ← Paleta COLORS (única fuente de verdad visual)
      storage.ts    ← Helpers de AsyncStorage
    .env            ← No versionar

  landing/          ← Next.js (solo landing pública, desplegada en Vercel)
  app/              ← LEGACY Next.js — no usar, ver app/_LEGACY.md
  Infraestructura.md  ← Este archivo
  CLAUDE.md         ← Instrucciones completas para Claude Code
```

---

## Stack tecnológico

| Capa | Tecnología | Versión instalada |
|------|-----------|-------------------|
| Backend | Django + DRF | Django 5.2+ / DRF 3.15+ |
| Auth | SimpleJWT | 5.3+ |
| Base de datos dev | SQLite | (automática) |
| Base de datos prod | PostgreSQL | Railway managed |
| IA | Groq (`llama-3.3-70b-versatile`) | SDK groq 0.9+ |
| Mobile | React Native + Expo | RN 0.81.5 / Expo ~54 |
| Navegación | Expo Router | ~6.0 |
| Node | — | v26 |
| Python | — | 3.13 |
| TypeScript | — | ~5.9 |

---

## Arrancar el proyecto en desarrollo local

### Backend Django

```bash
cd pyfit/backend

# Primera vez o tras agregar dependencias:
pip install -r requirements.txt
python manage.py migrate

# Cada vez:
python manage.py runserver 0.0.0.0:8000
```

El servidor queda en `http://localhost:8000` y también accesible en la red local
por `http://<IP_LOCAL>:8000` (ver sección Red Local abajo).

### Mobile React Native

```bash
cd pyfit/mobile

# Primera vez:
npm install

# Cada vez:
npx expo start
```

Escanear el QR con la app **Expo Go** (iOS App Store / Android Play Store).
Cada save de archivo actualiza la app automáticamente (Fast Refresh).

---

## Variables de entorno

### `backend/.env`

```
SECRET_KEY=<generar con python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())">
DEBUG=True                          # False en producción
ALLOWED_HOSTS=localhost,127.0.0.1,<IP_LOCAL>
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
GROQ_API_KEY=<clave de console.groq.com>
FRONTEND_URL=http://localhost:3000
# DATABASE_URL=postgresql://...     # Descomentar en producción (Railway provee esta URL)

# Email (para reset de contraseña):
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_HOST_USER=
# EMAIL_HOST_PASSWORD=
```

### `mobile/.env`

```
EXPO_PUBLIC_API_URL=http://<IP_LOCAL>:8000
```

> **Importante:** `<IP_LOCAL>` cambia cada vez que el Mac se conecta a una red diferente.
> Obtener con: `ipconfig getifaddr en0`
> Actualizar en ambos `.env` antes de probar en dispositivo físico.

---

## Red local para testing en dispositivo

El iPhone/Android y el Mac deben estar en la **misma red Wi-Fi**.

```bash
# Obtener IP actual del Mac:
ipconfig getifaddr en0

# Actualizar en backend/.env:
ALLOWED_HOSTS=localhost,127.0.0.1,<NUEVA_IP>

# Actualizar en mobile/.env:
EXPO_PUBLIC_API_URL=http://<NUEVA_IP>:8000

# Reiniciar el backend y Expo tras el cambio.
```

---

## Endpoints API

### Auth
```
POST   /api/auth/register/        Registro (email + password)
POST   /api/auth/login/           Login → {access, refresh}
POST   /api/auth/refresh/         Renovar access token
POST   /api/auth/logout/          Invalidar refresh token (blacklist)
POST   /api/auth/reset-password/  Enviar email de recuperación
```

### Perfil y ubicaciones
```
GET    /api/profile/              Perfil del usuario autenticado
PUT    /api/profile/              Actualizar perfil
GET    /api/locations/            Listar ubicaciones
POST   /api/locations/            Crear ubicación
GET    /api/locations/{id}/       Detalle ubicación
PUT    /api/locations/{id}/       Actualizar ubicación
DELETE /api/locations/{id}/       Eliminar ubicación
```

### Check-in diario
```
GET    /api/checkins/today/       Check-in de hoy (existe o null)
POST   /api/checkins/             Crear check-in
```

### Sesiones y IA
```
POST   /api/sessions/generate/    CRÍTICO — genera sesión con Groq
GET    /api/sessions/             Historial de sesiones
GET    /api/sessions/{id}/        Detalle de sesión
POST   /api/sessions/{id}/feedback/  Feedback post-sesión
GET    /api/ejercicio-demo/       Emoji músculo + query YouTube
POST   /api/ejercicios/regenerar/ Regenerar ejercicio individual
```

### Stats
```
GET    /api/stats/dashboard/      Métricas para el dashboard (racha, fatiga, volumen, últimas 3 sesiones)
GET    /api/stats/full/           Métricas completas (RPE histórico, cumplimiento semanal, alertas, progresión)
```

### Competencias
```
GET    /api/competitions/         Listar competencias
POST   /api/competitions/         Crear competencia
DELETE /api/competitions/{id}/    Eliminar competencia
```

---

## Autenticación JWT

- **Access token:** 1 hora de vida
- **Refresh token:** 30 días de vida
- **Rotación:** activada — cada refresh emite un nuevo par de tokens
- **Blacklist:** activada — los refresh tokens usados quedan invalidados
- **Header:** `Authorization: Bearer <access_token>`
- **Almacenamiento mobile:** `expo-secure-store` (nunca AsyncStorage para tokens)

Flujo en `mobile/lib/api.ts`: si un request recibe 401, intenta renovar el
access token automáticamente con el refresh token. Si la renovación falla,
cierra sesión y redirige a login.

---

## Rate limiting (throttling)

Configurado en `backend/pyfit/throttles.py` y aplicado por decorador en cada view:

| Endpoint | Límite |
|----------|--------|
| Login | 10 / minuto (por IP) |
| Registro | 5 / hora (por IP) |
| Reset password | 5 / hora (por IP) |
| Generar sesión | 10 / hora (por usuario) |
| Regenerar ejercicio | 20 / hora (por usuario) |

---

## Base de datos

### Desarrollo (SQLite)
Archivo: `backend/db.sqlite3`. No requiere configuración.

### Producción (PostgreSQL en Railway)
Configurar `DATABASE_URL` en el `.env` de producción.
Django detecta automáticamente si existe esa variable y usa PostgreSQL.

### Apps Django instaladas
```
django.contrib.admin
rest_framework
rest_framework_simplejwt
rest_framework_simplejwt.token_blacklist   ← JWT blacklist
corsheaders
users
workouts
checkins
ai_workout
```

### Migrar base de datos
```bash
python manage.py makemigrations
python manage.py migrate
```

---

## Despliegue

### Backend → Railway

```bash
# railway.toml ya configurado:
# Build: Dockerfile
# Start: python manage.py migrate && gunicorn pyfit.wsgi:application --bind 0.0.0.0:$PORT --workers 2
# Healthcheck: GET /api/auth/login/

# Variables de entorno a configurar en Railway:
# SECRET_KEY, DATABASE_URL (automática), GROQ_API_KEY,
# ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, DEBUG=False
# EMAIL_HOST, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD
```

### Mobile → Expo EAS Build

```bash
npm install -g eas-cli
eas login
eas build --platform ios     # genera .ipa para TestFlight
eas build --platform android # genera .apk/.aab para Play Store

# Antes del build de producción, actualizar mobile/.env:
EXPO_PUBLIC_API_URL=https://api.pyfit.app
```

### Landing → Vercel
La carpeta `landing/` contiene el Next.js de la landing pública.
Despliegue automático en Vercel desde el repositorio.

---

## Pantallas y estado de desarrollo

| Pantalla | Archivo | Estado |
|----------|---------|--------|
| Login / Registro | `(auth)/login.tsx` | ✅ Completo |
| Onboarding (5 pasos) | `(auth)/onboarding.tsx` | ✅ Completo |
| Dashboard | `(app)/dashboard/index.tsx` | ✅ Completo |
| Check-in | `(app)/checkin/index.tsx` | ✅ Completo |
| Generar rutina | `(app)/generate/index.tsx` | ✅ Completo |
| Modo ejecución | `(app)/ejecutar/[id].tsx` | ✅ Completo |
| Feedback | `(app)/feedback/[id].tsx` | ✅ Completo |
| Historial | `(app)/historial/index.tsx` | ✅ Completo |
| Estadísticas | `(app)/estadisticas/index.tsx` | ✅ Completo |
| Perfil | `(app)/perfil/index.tsx` | ✅ Completo |

---

## Notas críticas

### Expo Go — compatibilidad
La app **debe funcionar en Expo Go** durante desarrollo. Librerías prohibidas:
`react-native-blur` (usar `expo-blur`), `react-native-camera`, `react-native-firebase`,
`react-native-maps`, `@stripe/stripe-react-native`.

### Choice fields en Django
Los campos con `choices` en DRF validan contra la **clave lowercase**, no el label.
Siempre enviar valores en minúscula desde el mobile:
```
nivel:               'principiante' | 'intermedio' | 'avanzado'
sexo:                'masculino' | 'femenino' | 'otro'
horario_preferido:   'mañana' | 'mediodía' | 'tarde' | 'noche'
nivel_estres:        'bajo' | 'moderado' | 'alto'
tipo_trabajo:        'sedentario' | 'activo' | 'mixto'
estilo_entrenamiento:'fuerza' | 'hipertrofia' | 'resistencia' | 'funcional' | 'mixto'
tipo (ubicación):    'gimnasio' | 'casa' | 'exterior'
```

### SafeAreaProvider
`useSafeAreaInsets()` en el tab bar requiere `<SafeAreaProvider>` como ancestro
en `app/_layout.tsx`. Sin esto, los insets son cero y el tab bar queda roto.

### dias_entrenados en stats_dashboard
`/api/stats/dashboard/` devuelve `dias_entrenados` como lista de strings ISO
`["2026-05-10", "2026-05-12"]`. El frontend usa `Array.isArray()` para defensivamente
crear el Set, nunca asumir que es iterable.

### respuesta_ia (JSONField)
Estructura del JSON generado por Groq y almacenado en `sessions.respuesta_ia`:
```json
{
  "titulo": "...",
  "objetivo_sesion": "...",
  "rpe_target": 7,
  "duracion_total": 55,
  "fases": [
    {
      "nombre": "Calentamiento",
      "duracion_minutos": 10,
      "ejercicios": [
        {
          "nombre": "...",
          "series": 3,
          "repeticiones": "8-10",
          "descanso_segundos": 60,
          "rpe_sugerido": 6,
          "notas": "..."
        }
      ]
    }
  ],
  "nota_del_entrenador": "Máximo 2 oraciones."
}
```

### Modelo IA
`llama-3.3-70b-versatile` en Groq. `max_tokens=2048`.
SDK Python: `pip install groq`. Clave en `GROQ_API_KEY`.

---

## Comandos útiles de referencia rápida

```bash
# Ver IP local actual:
ipconfig getifaddr en0

# Crear superusuario Django:
cd backend && python manage.py createsuperuser

# Shell Django:
cd backend && python manage.py shell

# TypeScript check mobile:
cd mobile && npx tsc --noEmit

# Limpiar caché Expo si hay problemas raros:
cd mobile && npx expo start --clear

# Ver logs backend en Railway:
railway logs
```
