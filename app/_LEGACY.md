# ⚠️ CÓDIGO LEGACY — NO USAR

Este directorio (`app/`) contiene el frontend original de PyFit construido en **Next.js**.

**Este código está DEPRECADO y ya no se desarrolla activamente.**

---

## Por qué existe todavía

- La carpeta `app/landing/` y `app/page.js` contienen la **landing page pública** que sigue desplegada en Vercel. Esa parte se mantiene.
- El resto de las carpetas (`auth/`, `dashboard/`, `checkin/`, `generate/`, `ejecutar/`, `feedback/`, `historial/`, `estadisticas/`, `perfil/`, `onboarding/`) son la antigua interfaz web. **No modificar.**

---

## Stack actual (el que se usa)

| Capa | Tecnología | Ubicación |
|------|-----------|-----------|
| Mobile app | React Native + Expo | `/mobile/` |
| Backend API | Django 5 + DRF | `/backend/` |
| Landing page | Next.js (solo lectura) | `/app/landing/` |

---

## Qué fue reemplazado por qué

| Este archivo legacy | Reemplazado por |
|--------------------|-----------------|
| `app/api/generate/route.js` | `backend/ai_workout/views.py` → `POST /api/sessions/generate/` |
| `app/api/auth/**` | `backend/users/views.py` → `/api/auth/*` |
| `app/api/checkin/**` | `backend/checkins/views.py` → `/api/checkins/` |
| `app/api/stats/**` | `backend/workouts/views.py` → `/api/stats/` |
| `app/dashboard/` | `mobile/app/(app)/dashboard/index.tsx` |
| `app/checkin/` | `mobile/app/(app)/checkin/index.tsx` |
| `app/generate/` | `mobile/app/(app)/generate/index.tsx` |
| `app/ejecutar/` | `mobile/app/(app)/ejecutar/[id].tsx` |
| `app/feedback/` | `mobile/app/(app)/feedback/[id].tsx` |
| `app/historial/` | `mobile/app/(app)/historial/index.tsx` |
| `app/estadisticas/` | `mobile/app/(app)/estadisticas/index.tsx` |
| `app/perfil/` | `mobile/app/(app)/perfil/index.tsx` |
| `app/onboarding/` | `mobile/app/(auth)/onboarding.tsx` |
| `app/auth/` | `mobile/app/(auth)/login.tsx` |

---

## Base de datos

El stack legacy usaba **Supabase** (PostgreSQL + Auth gestionado).
El stack nuevo usa **PostgreSQL directo** en Railway gestionado por Django ORM.
Los datos no se migraron — base de datos limpia.
