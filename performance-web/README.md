# Zyfit Performance — Panel Web (B2B)

Panel web independiente para **centros deportivos de alto rendimiento**. Es la
vertical B2B de Zyfit: una instancia totalmente separada de la app móvil
(`mobile/`, React Native) y de la landing (`landing/`, Next.js). Consume el
**backend Django existente** (`backend/`, app `performance`) vía JWT.

## Stack

- **Vite + React 19 + TypeScript** — SPA (todo detrás de login; no necesita SSR).
- **React Router** — ruteo con layout y rutas protegidas.
- **TanStack Query** — estado de servidor / llamadas a la API.
- **Axios** — cliente HTTP con inyección de JWT y refresh transparente.
- **Recharts** — gráficos.
- **Tailwind CSS** — estilos (cableado; el styling fino queda pendiente).

## Estructura

```
src/
  api/        client.ts (axios+JWT), auth.ts, performance.ts (stubs por recurso)
  auth/       AuthContext, useAuth, ProtectedRoute
  components/ layout/ (AppLayout, Sidebar, Topbar)  ui/ (Card, PageHeader)
  pages/      LoginPage, DashboardPage + un dir por módulo:
              rendimiento/ lesiones/ test/ planificacion/ psicologico/
  lib/        constants.ts (MODULES = fuente única de la barra lateral, API_URL)
  types/      contratos TS que espejan el backend
  router.tsx  mapa de rutas        App.tsx providers + router       main.tsx
```

Los **cinco módulos** (Rendimiento, Lesiones, Test, Planificación, Psicológico)
se definen una sola vez en `src/lib/constants.ts` y de ahí salen el sidebar y las
rutas anidadas `/centers/:centerId/<modulo>`.

## Estado actual

Andamiaje: **arquitectura, auth y cliente de API funcionales**; las pantallas de
módulo son placeholders (no conectadas a la API, sin styling fino) — tal como se
pidió. Lo que ya funciona de punta a punta: login (gatea acceso B2B), rehidratación
de sesión, refresh de token, guarda de rutas y layout con sidebar.

## Puesta en marcha

```bash
cd performance-web
cp .env.example .env        # ajusta VITE_API_URL al backend
npm install
npm run dev                 # http://localhost:5180
```

El backend debe correr aparte (`cd backend && python3 manage.py runserver`) y la
URL del panel debe estar en `CORS_ALLOWED_ORIGINS` del backend
(p. ej. `http://localhost:5180`).

### Acceso

Solo entran cuentas con `performance_acceso`: rol `director_tecnico`, `admin` o
staff de Django. Endpoint de login: `POST /api/performance/auth/login/`.

> Nota de seguridad: los tokens se guardan en `localStorage` (simple para una
> herramienta interna). Si se requiere endurecer, migrar a cookies httpOnly.
