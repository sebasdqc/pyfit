# CLAUDE.md — Instrucciones para Claude Code
## Ecosistema Zyfit / PyFit

---

## ⚠️ VISUALIZACIÓN / PREVIEW — SIEMPRE EN DIGITALOCEAN (NUNCA LOCALHOST)

**Regla absoluta:** la visualización/preview de cualquier cambio en cualquiera
de los **paneles web** (Zyfit Performance, Zyfit Academy, y en general todo lo
desplegado en DigitalOcean) se hace **SIEMPRE desplegando en DigitalOcean vía
`git push origin main`**, NUNCA en `localhost`.

- **NO** sugieras `npm run dev` / `localhost:5180` / `localhost:5181` / `expo`
  como forma de "ver" un cambio web. El build local (`npm run build`) sirve
  **solo** para detectar errores de TypeScript/compilación, no como
  visualización.
- **Flujo de visualización:** commit → `git push origin main` → DO reconstruye
  solo (`deploy_on_push` a `main`) → el usuario lo ve en la URL de DO (tarda
  ~1–3 min).
- **Antes de reportar un deploy como "listo", verificar la fase real** con
  `doctl apps list-deployments <ID>` (`ACTIVE`, no rollback) — un `git push`
  exitoso no garantiza que el deploy llegó a producción (ver gotcha de OOM en
  `backend/CLAUDE.md`; ya pasó que deploys fallaron y DO revirtió solo sin que
  nadie lo notara).
- **Excepción:** la app **móvil** se visualiza con **Expo dev-client**
  (`npx expo start --dev-client`, YA NO Expo Go puro — ver `mobile/CLAUDE.md`)
  o builds internas de EAS. No está en DO.

---

## 🗺️ Ecosistema — 3 productos, 1 backend compartido

Zyfit es una plataforma de entrenamiento inteligente que se extendió a tres
líneas de producto, todas sobre el mismo backend Django y la misma base de
datos:

### 1. APP — la app móvil de consumo (B2C)

Fitness con IA adaptativa (fuerza + running) para personas que entrenan.

- **Ubicación:** `mobile/` (React Native + Expo Router)
- **Backend:** apps Django `users`, `workouts`, `checkins`, `ai_workout`,
  `runs`, `ai_running`, `devices`, `promos` (compartida con Academy)
- **Deploy backend:** DO `sea-lion-app` →
  `https://sea-lion-app-a2j4f.ondigitalocean.app`
- **La app móvil en sí:** aún **no publicada** en Play Store/App Store; se
  prueba con Expo dev-client / builds internas de EAS
- **Incluye:** el Portal de Coach (`mobile/app/(coach)/*`) y el módulo de
  Running — ambos dentro de esta misma app, no son productos aparte
- 📄 **Doc completa: [`mobile/CLAUDE.md`](mobile/CLAUDE.md)**

### 2. ZYFIT PERFORMANCE — panel B2B

Panel web para centros deportivos de alto rendimiento (fútbol/futsal):
rendimiento, lesiones, tests, planificación, psicológico.

- **Ubicación:** `performance-web/` (Vite + React 19 + TS) + app Django
  `performance`
- **Deploy:** DO `zyfit-performance` (Static Site), ID
  `b50f22a7-3cdf-44fe-be54-e52a0d8ff2c6` →
  **https://zyfit-performance-svp4v.ondigitalocean.app**
- **Estado:** DESPLEGADO, identidad **azul** (no confundir con el morado del
  Portal de Coach, que es otro producto)
- 📄 **Doc completa: [`performance-web/CLAUDE.md`](performance-web/CLAUDE.md)**

### 3. ZYFIT ACADEMY — e-learning

Plataforma de cursos online, adaptada a la formación de entrenadores CONMEBOL
Evolución.

- **Ubicación:** `academy-web/` (Vite + React 19 + TS) + apps Django
  `academy` y `ai_tutor`
- **Deploy:** DO `zyfit-academy` (Static Site), ID
  `133dcb1d-370f-423e-9f0a-eef8c88e9c31` →
  **https://zyfit-academy-e8r4w.ondigitalocean.app**
- **Estado:** DESPLEGADO — es el producto con **más desarrollo activo**
  actualmente (cursos, gamificación, comunidad, freemium, tutor IA,
  onboarding anónimo, i18n; landing pública rediseñada 2026-07-08)
- 📄 **Doc completa: [`academy-web/CLAUDE.md`](academy-web/CLAUDE.md)**

### Backend compartido — NO son 3 backends

`backend/` es **un solo proyecto Django** ("sea-lion-app" en DO) que sirve a
**los tres** productos, con una sola base de datos Postgres. No hay backend
separado por producto. Un cambio a `settings.py`/`urls.py`/`users/models.py`
puede afectar a los tres a la vez.

📄 **Doc completa: [`backend/CLAUDE.md`](backend/CLAUDE.md)** — qué app
Django pertenece a qué producto, gotchas de deploy (migraciones, límites de
RAM, CORS).

### Remanente sin producto activo

`app/` en la raíz (`layout.tsx` + `privacy/page.tsx`) es lo que queda del
Next.js original pre-migración — hoy **solo** sirve la política de
privacidad (deploy separado, probablemente Vercel). No tiene relación con
ningún producto activo ni con la generación de rutinas (esa lógica vive
íntegramente en `backend/ai_workout/`). No agregar features ahí.

---

## Cómo usar los CLAUDE.md de este repo

Claude Code carga automáticamente el `CLAUDE.md` de la carpeta donde estés
trabajando, además de este archivo raíz. La división es intencional:

- **Este archivo (raíz):** mapa del ecosistema + reglas que aplican a los 3
  productos (visualización, principios generales de trabajo).
- **`mobile/CLAUDE.md`:** todo el detalle de la app de consumo — esquema de
  datos, lógica de generación de rutinas, identidad visual RN, navegación,
  flujos, gamificación, Coach, Running, Expo/EAS.
- **`performance-web/CLAUDE.md`:** arquitectura y estado de Zyfit
  Performance.
- **`academy-web/CLAUDE.md`:** arquitectura y estado de Zyfit Academy.
- **`backend/CLAUDE.md`:** infraestructura compartida, gotchas de deploy.

**Antes de tocar código de un producto específico, leer su CLAUDE.md
anidado** — ahí vive el detalle que antes estaba (desactualizado, solo para
la app móvil) en este archivo.

---

## Historia — de dónde viene esto

PyFit empezó como una app Next.js + Supabase (Groq para IA, RLS de Postgres,
CSS-in-JS). La migración a Django + React Native (descrita en detalle en
`mobile/CLAUDE.md`) está **prácticamente completa**: el prompt de generación
de rutinas vive en `backend/ai_workout/`, la app corre en Expo. Sobre esa
base se construyeron después Zyfit Performance y Zyfit Academy, que **no
existían** en el plan de migración original — por eso cualquier documento
viejo que hable solo de "la app" está describiendo un tercio del ecosistema
actual.

---

## Notas críticas transversales (los 3 productos)

1. **No confundir identidades de color entre productos:** Zyfit Performance
   es azul (`#4f8cff`), el Portal de Coach (dentro de la app móvil) es
   morado fijo (`#7C5CFF`), Zyfit Academy es rojo (`#cc1f36`) con temas
   propios por escuela, y la app de consumo tiene 8 paletas seleccionables
   por el usuario. Ver el CLAUDE.md de cada producto para el detalle exacto.
2. **No confundir sistemas de gamificación:** la app móvil tiene su propia
   racha/niveles/logros de entrenamiento; Zyfit Academy tiene una racha de
   estudio y DOS sistemas de badges distintos entre sí — ninguno comparte
   código con otro.
3. **Verificar el estado real del deploy antes de decir "está listo".** Un
   `git push` exitoso no es lo mismo que "en producción" — varios deploys
   fallaron y DO revirtió solo sin que nadie lo notara (ver
   `backend/CLAUDE.md`).
4. **No uses Supabase en ningún producto nuevo.** Todo el auth y base de
   datos vive en Django + PostgreSQL nativo.
5. **Groq SDK para Python:** `pip install groq`, modelo
   `llama-3.3-70b-versatile` — usado por la generación de rutinas de fuerza,
   running, sesiones de equipo de Performance y el tutor IA de Academy.
   `GROQ_API_KEY` en `backend/.env`.
6. Al agregar un header HTTP custom en cualquier frontend, sumarlo en el
   mismo commit a `CORS_ALLOW_HEADERS` en `backend/pyfit/settings.py` — ya
   causó fallas de conexión "fantasma" dos veces (ver `backend/CLAUDE.md`).
7. **Voz del copy: español neutro, tratamiento de "tú" — NUNCA voseo
   argentino** (nada de "vos", "tenés", "sabés", "elegí", "andá", etc.), en
   ningún producto ni superficie: landing de la app (`app/`), landing y UI
   de Zyfit Performance, landing y UI de Zyfit Academy. Esto ya se había
   confirmado explícitamente para la landing de `app/` (ver `PRODUCT.md`,
   2026-07-24) pero se coló voseo por default del modelo en varios textos
   de Academy y Performance (diccionarios `es.ts`, componentes de
   comunidad/soporte, un error de rate-limit de la API) — corregido
   2026-08-21. Si aparece voseo nuevo, es una regresión del modelo, no una
   instrucción del proyecto: corregirlo a "tú" sin preguntar.
