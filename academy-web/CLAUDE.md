# CLAUDE.md — `academy-web/` (Zyfit Academy, e-learning)

> Se suma al `CLAUDE.md` raíz (mapa del ecosistema). Zyfit Academy es la
> plataforma de cursos online — **el producto con más desarrollo activo
> actualmente**. Backend compartido (`backend/academy/` + `backend/ai_tutor/`,
> ver `backend/CLAUDE.md`). Leer esto antes de tocar cursos, gamificación,
> comunidad, freemium o la landing pública.

---

## Qué es

Un instructor publica cursos (Curso→Módulo→Lección→Quiz→Pregunta); los
estudiantes se inscriben, avanzan, rinden quizzes y obtienen certificado.
Adaptado a la formación de entrenadores **CONMEBOL Evolución**
(disciplina/licencia/modalidad/carga horaria). **Estado: DESPLEGADO.**

## Ubicación y deploy

- **Código:** `academy-web/` (Vite + React 19 + TS, SPA), backend en las apps
  Django `academy` (cursos/aprendizaje/gamificación/comunidad) y `ai_tutor`
  (tutor IA) dentro de `backend/`.
- **Deploy:** Static Site en DO — `zyfit-academy`, ID
  `133dcb1d-370f-423e-9f0a-eef8c88e9c31` →
  **https://zyfit-academy-e8r4w.ondigitalocean.app**. `deploy_on_push` a
  `main`. Backend: `sea-lion-app` (compartido, ver `backend/CLAUDE.md`).
- **Dev local:** puerto **5181** (Performance usa 5180).
- Para visualizar cambios: **siempre `git push origin main`**, nunca
  `localhost` (regla del CLAUDE.md raíz).

## ⚠️ Identidad visual — YA NO es el manual CONMEBOL navy/Ubuntu

Memorias antiguas (semanas atrás) describen la identidad como "manual de
marca CONMEBOL: navy `#1a3e72` + azul `#0066b3`, tipografía Ubuntu, tagline
'Cree en grande'". **Eso quedó desactualizado.** Verificado directamente en
código (2026-07-08): `index.css`/`TenantContext.tsx` hoy definen una
identidad **propia de Zyfit Academy**, roja, sin depender de ningún tenant:

```css
--color-brand:        204 31 54;   /* #cc1f36 */
--color-accent:       230 57 80;   /* #e63950 */
--font-sans: 'Inter', system-ui, sans-serif;
```

Tagline actual: *"Ciencia en movimiento"*. El sistema **white-label
multi-tenant** (`Tenant` model, `TenantMiddleware`, `GET
/api/academy/tenant/config/`) **sigue existiendo en el backend** pero el
frontend (`src/tenant/TenantContext.tsx`) ya **no lo consume** — el
`TenantProvider` hoy es un objeto fijo hardcodeado, sin llamadas al API. Antes
de asumir que el white-labeling está "vivo" o "muerto", verificar ambos lados
directamente — es un estado híbrido, no uno de los dos extremos.

El **emblema tipo escudo/balón** (`Emblem.tsx`, inspirado deliberadamente en
el lenguaje del manual CONMEBOL pero sin reproducir el logo protegido) sigue
existiendo y se usa en `Sidebar`/`LoginPage`/`RegisterPage`/etc. En la
**landing pública** (`LandingPage.tsx`) se reemplazó por un wordmark
tipográfico puro (`Wordmark` en `Emblem.tsx`, 2026-07-08) — ver
`project_academy_landing_redesign` en memoria antes de tocar esa pantalla.

## Arquitectura backend (`backend/academy/`, tablas `academy_*`)

Catálogo: **School** (agrupa cursos, tema visual propio por slug en
`schoolTheme.ts`) → **Course** (instructor FK, `school` FK nullable, slug,
categoria, nivel, portada base64, publicado, + campos CONMEBOL:
`disciplina`/`licencia`/`modalidad`/`carga_horaria_h`/
`acredita_renovacion`) → **Module** → **Lesson** (tipo
video/texto/audio/quiz/en_vivo/practica/entregable) → **Quiz** (OneToOne
lesson) → **Question** (`respuestas_correctas` = clave secreta, NUNCA
expuesta al estudiante).

Aprendizaje: **Enrollment** → **LessonProgress** · **QuizAttempt** ·
**Certificate** (`ZA-XXXXXXXX`).

**Scoring siempre en el servidor** (`academy/grading.py`):
`grade_attempt`/`recompute_progress` (100% lecciones + todos los quizzes
aprobados → completada + emite certificado) /`issue_certificate`. El cliente
nunca envía puntaje/progreso.

**Identidad:** `User.academy_instructor` (bool, habilita autoría).
`User.academy_acceso = is_active` — cualquier cuenta activa entra como
estudiante (a diferencia de Performance, no hay rol global nuevo).

## 7 escuelas / 28 cursos (catálogo actual, reorg 2026-07-07)

Reestructurado de 9 a 7 escuelas (migración `0016`): Ciencia del
Entrenamiento, Analítica y Rendimiento Deportivo, Recuperación Prevención y
Wellness (nombres revertidos a los originales), más 4 renombradas. 28 cursos,
4 por escuela (`seed_zyfit_escuelas`). `schoolTheme.ts` tiene los 7 temas
visuales. Antes de agregar o renombrar una escuela, leer
`project_academy_escuelas` en memoria — ya hubo una reorganización completa y
revertir nombres por error es fácil.

**El catálogo real tiene más de 28:** a los 28 se suman los 3 de los
programas especiales (CONMEBOL Evolución Licencia C fútbol y futsal,
Programa Evolución 360°) y el curso demo `fundamentos-de-fuerza`. En
producción el catálogo público (`/api/academy/anon/catalogo/`) muestra **32**
cursos con contenido gratis (verificado 2026-11-05).

**Pipeline de contenido:** `.md` bajo `backend/academy/content/` →
`seed_course_content` (management command, idempotente, MANUAL) parsea a
Módulo→Lección→Quiz→Pregunta. El comando busca recursivamente (`rglob`) y
casa cada archivo por **nombre = `slug` del curso**; las carpetas conservan los
nombres numerados de la estructura vieja de 9 escuelas (`1-entrenamiento-…`,
`2-readaptacion-…`) y NO coinciden con las 7 escuelas actuales — no las
renombres pensando que importan. El `.md` es la fuente de verdad — editar
contenido = editar el `.md` + re-correr el comando (`--dry-run` para
ensayar, `--course <slug>` para uno solo). Formato estricto documentado en
`project_academy_content_standard` / `Zyfit_Academy_Estandar_Curso.md` —
**checklist obligatorio** antes de crear o editar cualquier curso.

**Markdown en las lecciones (desde 2026-11-05):** `Lesson.contenido` sigue
siendo texto plano en la BD (split por líneas en blanco), pero el frontend lo
muestra con `components/ui/MarkdownLite.tsx`, que entiende **negrita, cursiva,
`código`, listas (con guion, `*` o numeradas), tablas y enlaces**. Es el mismo
renderizador del blog y lo usan `LessonPlayerPage`, `ExploreLessonPage` y
`DeliverableLesson`. Es un subset a propósito, NO un parser genérico: no
soporta imágenes, bloques de código ni anidación. Los enlaces solo aceptan
`http(s)`, `mailto` y rutas internas (el contenido lo escriben instructores).
Los cursos viejos con `**` ya se ven bien sin re-sembrar.

## Estado real del contenido (medido el 2026-11-05 con el parser del seed)

Los 28 cursos de las 7 escuelas están completos en TEXTO y estructura (119
módulos, 432 lecciones, 385 preguntas, ~77.500 palabras en lecciones de texto,
~650 por lección; 0 lecciones de texto cortas). La estructura en producción
coincide 1:1 con los `.md` (verificado contra el catálogo anónimo público).
Lo que NO está:

- **Medios:** las 194 lecciones de video y audio (97 + 97) NO tienen URL en
  ningún `.md`, y las que se pudieron consultar en producción (6 de módulos
  gratuitos) tampoco. Hoy esas lecciones solo muestran su guion de apoyo.
- **Feedback por pregunta:** ninguna de las 385 preguntas trae feedback
  escrito a mano en el `.md`; el que ven los alumnos es el genérico que arma
  `quiz_feedback.py` ("el criterio esperado es X, tal como se trabaja en «módulo»").
- **Placeholders:** 247 marcadores `[PLACEHOLDER: …]` en los `.md` (cifras o
  fuentes por verificar contra la fuente primaria); el seed los quita del texto.
- **Profundidad de los quizzes:** 2–3 preguntas por quiz en los cursos de 4
  módulos (9–12 por curso); solo 8 cursos llegan a 25 preguntas.
- **Cursos fuera del catálogo de 28 que están publicados:** Programa Evolución
  360° (14 lecciones, entregables), CONMEBOL Licencia C fútbol (19) y futsal
  (solo 5 lecciones / 2 módulos — delgado) y `fundamentos-de-fuerza` (demo de
  3 lecciones; debería despublicarse o completarse).

## Programas especiales sobre la misma jerarquía (aditivos)

- **CONMEBOL Evolución** (`seed_conmebol_evolucion`): licencias C/B/A/PRO,
  disciplina fútbol/futsal/etc.
- **Programa Evolución 360°** (`seed_evolucion_360`): 3 tipos de lección
  nuevos (`en_vivo`, `practica`, `entregable` — este último NO
  autocompletable, lo aprueba el instructor vía `Submission`), insignias
  `CourseBadge`/`EarnedBadge` (Check-list de Competencias, **distinto** del
  sistema de badges de abajo).

## Gamificación — 2 sistemas de badges + 1 de racha, todos DISTINTOS entre sí

1. **`CourseBadge`/`EarnedBadge`** — Check-list de Competencias, POR CURSO
   (parte de Evolución 360°, arriba).
2. **`AcademyBadge`/`AcademyEarnedBadge`** — catálogo data-driven GLOBAL por
   escuela, `badges_service.py` evaluador genérico, `GET /api/academy/badges/`.
   `BadgeGallery.tsx` unifica ambos visualmente en el frontend.
3. **Racha de estudio** — `AcademyStreak`/`AcademyActivityDay`,
   `streak_service.py`, `GET /api/academy/streak/`, cron
   `academy_streak_sweep`. Freeze 1/5, máx 3, recuperación 48h. Día resuelto
   vía header `X-Local-Date` (zona horaria del cliente). **Totalmente
   desacoplada de la racha de entrenamiento de la app móvil** — no compartir
   código ni lógica entre ambas.

## Freemium (`AcademySubscription`)

**Paquete separado** de `Profile.plan` (que es Zyfit Pro, del entrenador en
la app móvil) — no confundir. `access_service.py` gatea
`Module.es_gratuito`/`Lesson.bloqueado`. Sin proveedor de pago real
(`AdministeredGateway` en `payments.py`): **los cobros los registra un admin desde
`/admin/cobros`** (decisión de Sebastian, 2026-11-05: se gestionan en el panel
de Academy, no con una pasarela externa). Flujo: el admin cobra por fuera
(transferencia, pago móvil, Zelle, efectivo...) y lo registra →
`billing_service.registrar_pago` crea una fila en el libro `AcademyPayment` y
EXTIENDE la `AcademySubscription` (si ya tiene Pro vigente, suma al final del
período; si venció, cuenta desde hoy). Un pago equivocado se ANULA, no se
borra, y el acceso se recalcula con los pagos que quedan. No hay endpoint
público para activarse Pro. ⚠️ **Regla nueva:** una suscripción `activa` con
`fecha_renovacion` vencida deja de dar acceso tras 3 días de cortesía
(`AcademySubscription.GRACIA_DIAS`); antes una `activa` daba Pro para siempre.
Sin fecha de renovación (otorgada a mano) no expira. ⚠️ Gotcha ya vivido: activar el
paywall afecta de inmediato a estudiantes YA inscritos — pensar la migración
antes de tocar tiers.

**Códigos de descuento de influencers** (`backend/promos/`) — app
GENERALIZADA multi-producto vía campo `producto` (`zyfit_pro` +
`academy_pro`), un solo `Influencer`/cola de solicitudes para ambos
(compartida con la app móvil). Reemplaza los placeholders "Próximamente" en
`mobile/app/.../suscripcion.tsx` y `academy-web/.../SubscriptionPage.tsx`.
**Desplegado** (verificado 2026-11-05: `/api/promos/` está montado en
`pyfit/urls.py` y `/api/promos/validar/` responde 401 sin sesión). Las
solicitudes (`/api/promos/solicitudes/`) las revisa un humano; nada cobra solo.

## Onboarding sin registro (visitante anónimo)

`AnonymousSession`/`AnonymousProgress` (UUID pk, expira a 30 días) — un
visitante sin cuenta consume contenido `es_gratuito` real en `/explorar` y
conserva progreso entre visitas. Migración a cuenta nueva reutiliza
literalmente el mismo evento de streak/badges/certificados que
`lesson_complete`. Endpoints dedicados en `anon_views.py` (`AllowAny`) — las
vistas autenticadas NO se tocaron. Cron `academy_anon_sweep` (mismo patrón
que `academy_streak_sweep`) borra sesiones vencidas.

## Tutor IA (`backend/ai_tutor/`)

Conversacional, RAG sobre el contenido de los cursos: embeddings **LOCALES**
con `sentence-transformers` + coseno en JSON (**sin pgvector**), **DeepSeek**
(`deepseek-chat`, vía el cliente central `pyfit/llm.py`; no Claude ni Groq)
para generar respuestas, guardrails médico/de programa, límite por
tier (free 3/pro 30 mensajes). Endpoints `/api/academy/tutor/`. Widget
**global** en el Sidebar + contextual en `LessonPlayer`. Comando manual
`index_tutor_content`.

⚠️ **`index_tutor_content` NUNCA debe correr automático en el arranque del
backend** — causó un incidente de OOM en producción (basic-xxs, ~500MB del
modelo compitiendo con gunicorn). Ver gotcha completo en `backend/CLAUDE.md`.
`torch` pesa considerablemente en el `Dockerfile` del backend.

## Comunidad (foro Q&A)

Posts/respuestas entre alumnos, moderación automática vía el LLM central
(DeepSeek; guardrails+IA, fail-open — si el LLM falla, no bloquea), reportes con umbral de
auto-ocultamiento, badge opcional "Colaborador". **Nunca gatea progreso,
racha ni badges core** — es una feature social aparte.

## Otras features construidas

- **Home/dashboard del estudiante** (`dashboard_service.py`, sigue el patrón
  de `streak_service.py`, ~15 queries fijo, sin N+1): progreso agregado en
  UNA llamada. El indicador es `puntos_aprendizaje` (reemplazó a
  `progreso_general`, retirado 2026-07-10) — **nunca "score"** (ese término
  es del Zyfit Score de Coach, otro producto).
- **i18n es/en**: `LocaleMiddleware` + campos `_en` (Course/Module/School),
  comando `translate_academy_info` (vía el LLM central, DeepSeek). Idioma
  **global** (a diferencia del dark mode, que es shell-only). Los títulos de
  curso ya salen traducidos en prod (verificado 2026-11-05). Falta traducir
  la UI de varias pantallas que no usan `useT`: `LessonPlayerPage`,
  `SubscriptionPage`, `CommunityPage`/`QuestionDetailPage`, las del
  instructor, los 3 simuladores, términos y privacidad, y `NotFoundPage`.
- **Analítica del instructor** (`/instructor/analitica`,
  `instructor_analytics_service.py`, `GET /api/academy/instructor/analytics/
  ?course_id=`): métricas agregadas por curso, **nunca datos de estudiantes**.
  Pasa por `_course_for_edit`, así que un instructor ajeno recibe **403** (no
  404, igual que editar un curso ajeno).
- **Feedback por pregunta** (`Question.feedback_correcta/feedback_incorrecta`,
  migraciones `0025`/`0026`): en el `.md` va como `> Feedback correcta:` /
  `> Feedback incorrecta:` bajo la pregunta; si falta, `quiz_feedback.py` y el
  backfill de `0026` generan uno genérico.
- **Panel de gestión para admins** (solo `IsAcademyAdmin`, acotado al tenant
  efectivo del admin, nunca por header; un instructor NO entra):
  - `/admin/metricas` (`AdminMetricsPage`, `GET /api/academy/admin/metricas/
    ?dias=7|30|90`, `admin_analytics_service.py`): 4 pestañas — Resumen (+tabla
    de cursos), Estudiantes (nuevos, activos hoy/7d/30d, "en riesgo" =
    matrícula activa y 14+ días sin estudiar, quizzes), Retención (cohortes
    semanales por primera matrícula, mapa de calor) y Finanzas (ingresos, MRR/
    ARR/ARPU, altas/renovaciones/bajas, churn aproximado, por método y plan).
    Definiciones: "estudiante" = cuenta con ≥1 matrícula en el tenant (no toda
    cuenta activa: en el tenant raíz comparten tabla las cuentas de la app móvil);
    "activo" = tiene `AcademyActivityDay`; los ingresos salen SOLO del libro
    `AcademyPayment` confirmado, nunca del estado de la suscripción. El churn es
    `None` ("—") si no había suscriptores al inicio del período.
  - `/admin/cobros` (`AdminBillingPage`, `admin_billing_views.py`): solicitudes
    de Pro pendientes (de `promos`), suscriptores con estado efectivo (vigente /
    por vencer / vencida / cancelada con acceso), libro de pagos, y diálogos para
    registrar pago, anular y cancelar renovación. Pagar una solicitud la marca
    `confirmada` en la misma transacción. Referencia repetida del mismo usuario
    y método = rechazada (evita doble clic).
  - Estas dos páginas están en español fijo (sin `useT`), igual que las del instructor.
  - Los tests de esta zona crean usuarios SIN contraseña: hashear una (PBKDF2)
    cuesta ~2 s por usuario y volvió eterna una suite de 30 tests (399 s → 2 s).
- **Blog**: 6 posts editoriales sembrados con `seed_blog_posts` (idempotente,
  MANUAL en prod). Se renderizan con `MarkdownLite`.
- **Banner de Zyfit APP** (`PromoZyfitApp`): ya no es un "Muy pronto" muerto;
  el badge enlaza a la lista de espera de la landing
  (`https://zyfit-landing.vercel.app`). Cuando haya URL de tienda, cambiar
  `WAITLIST_URL` en el componente.
- **Dark mode**: toggle sol/luna en Topbar, `data-theme` se estampa en la
  raíz de `AppLayout`/`LessonPlayerPage` — **NUNCA en `<html>`** — para no
  filtrarse a landing/login/explorar (comparten `.za-card`).
- **Biblioteca de recursos** (`LibraryResource`) — catálogo plano
  administrado 100% vía Django Admin, con favoritos y gating freemium. Sin
  autoría de instructor todavía.
- **Panel de admin de usuarios** — `/api/academy/admin/usuarios/`
  (`IsAcademyAdmin`, distinto de `IsInstructorOrAdmin`), aislado por tenant.
- **Simuladores pedagógicos** (`/simulador`) — carga/ACWR, planificación de
  sesión, return-to-play. Cada uno reutiliza un motor REAL
  (`performance.calculators` / `ai_workout`) en vez de reimplementar
  fórmulas — patrón a seguir si se agrega un simulador nuevo.
- **Datos personales de perfil** (país/ciudad/fecha_nacimiento/profesión/
  intereses/redes_sociales) compartidos con `Profile` de mobile, pero Academy
  usa su propio endpoint `/api/academy/me/` (NO `ProfileSerializer`).
- **Onboarding inicial** (`/bienvenida`, wizard de 4 pasos tras primer login)
  — guardado progresivo vía `/api/academy/me/`.
- **Landing pública rediseñada (2026-07-08):** header flotante oscuro,
  wordmark tipográfico en vez del emblema-escudo, Hero a `100dvh` con fondo
  Aurora WebGL más dinámico (`speed`/`amplitude` subidos). Ver
  `project_academy_landing_redesign`. **Gotcha de layout:** el `overflow-hidden`
  del Hero debe quedar en un `<div>` interno que envuelve SOLO el fondo
  animado, nunca en el `<section>` completo, o cualquier card que se
  "derrame" fuera del Hero con margen negativo queda clipeada.

## ⚠️ GOTCHA recurrente — headers custom y CORS (ya pasó 2 veces)

Cualquier header nuevo que agregue `academy-web/src/api/client.ts` (o
cualquier hook/contexto que inyecte headers globales — Locale, Tenant,
AnonSession, LocalDate) debe sumarse **en el mismo commit** a
`CORS_ALLOW_HEADERS` en `backend/pyfit/settings.py`. Si no, **todas** las
requests cross-origin fallan en silencio con "no se pudo conectar con el
servidor" (parece backend caído, es CORS). `django-cors-headers` v4.x
eliminó los defaults, así que el allowlist está hardcodeado a mano. Para
diagnosticar sin adivinar:

```bash
curl -s -i -X OPTIONS https://sea-lion-app-a2j4f.ondigitalocean.app/api/academy/auth/login/ \
  -H "Origin: https://zyfit-academy-e8r4w.ondigitalocean.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,x-tenant-slug,x-local-date"
```

## Notas críticas

1. **Fuente de verdad del contenido de un curso = el `.md`**, no la BD
   directamente — editar y re-correr `seed_course_content`.
2. `Question.respuestas_correctas` nunca se expone al estudiante — cualquier
   endpoint nuevo que toque preguntas debe respetar esto.
3. Antes de reportar un deploy como listo, verificar
   `doctl apps list-deployments 133dcb1d-370f-423e-9f0a-eef8c88e9c31` (fase
   `ACTIVE`) — 3 deploys de Academy (tutor/dashboard/badges) fallaron y
   revirtieron solos sin que nadie lo notara. Ver `backend/CLAUDE.md`.
4. No mezclar los 3 sistemas de gamificación (Check-list por curso / badges
   globales / racha de estudio) ni con la racha/logros de la app móvil.
5. Auditoría de seguridad/UX ya corrida (0 crítico seguridad, 1 crítico UX,
   4 alto, 7 medio, 6 bajo) — hallazgos Alto+Medio corregidos donde aplicaba,
   ver `project_academy_security_audit` antes de retomar los pendientes Bajo.
6. **Sentry está en el código pero APAGADO en producción** (verificado el
   2026-11-05 contra el spec vivo de DO): ni el build de `zyfit-academy` tiene
   `VITE_SENTRY_DSN` ni `sea-lion-app` tiene `SENTRY_DSN`; sin ellos
   `initSentry()` es un no-op. `VITE_*` se fija al compilar, así que además de
   poner la variable hay que reconstruir el front. Mientras tanto, los errores
   de producción no llegan a ningún lado.
7. **Voz del copy: "tú", nunca voseo** (regla del `CLAUDE.md` raíz). Incluye
   los seeds del backend (blog, cursos) y los mensajes de error de la API, no
   solo los diccionarios `es.ts`. `test_blog_seed.py` falla si el blog trae voseo.

## Referencias

Detalle profundo de cada sub-feature (modelos exactos, comandos, commits,
tests) vive en memorias dedicadas — ver el índice `MEMORY.md` del proyecto,
sección Academy, antes de trabajo profundo en una feature específica.
