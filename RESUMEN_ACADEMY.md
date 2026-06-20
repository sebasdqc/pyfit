# Zyfit Academy — Resumen de la Vertical E-Learning

> Documento explicativo de qué es Zyfit Academy, cómo funciona y cuáles
> son sus features. Pensado para leerse de corrido por alguien que necesita
> entender esta vertical sin meterse en el código.

---

## 1. Qué es Zyfit Academy en una frase

**Zyfit Academy es una plataforma de formación online para entrenadores
deportivos, adaptada al sistema de licencias CONMEBOL Evolución y con soporte
white-label multi-tenant.** Un instructor publica cursos; los estudiantes se
inscriben, avanzan por lecciones, rinden quizzes calificados en el servidor y
obtienen certificados verificables. El mismo backend Django y el mismo frontend
SPA sirven a múltiples organizaciones cliente (CONMEBOL, federaciones, clubes),
cada una con su propio subdominio, logo y catálogo privado.

---

## 2. Arquitectura multi-tenant (white-label)

El corazón de la multi-tenancy es el modelo `Tenant`:

- Cada tenant tiene `nombre`, `slug`, `dominio` (subdominio Zyfit) y
  `dominio_custom` (ej. `evolución.conmebol.com`), un JSON de `branding`
  (color primario, logo URL, tagline, copyright) y `settings`.
- El `TenantMiddleware` resuelve el tenant activo por el `Host` header de
  cada request y lo inyecta en `request.tenant`.
- El catálogo de cursos está **scoped por tenant**: `Course.tenant` es FK
  nullable — `NULL` = catálogo raíz Zyfit, visible solo desde el dominio base;
  un valor concreto = catálogo privado visible solo desde ese tenant.
- El endpoint `GET /api/academy/tenant/config/` (público, sin auth) devuelve
  el branding del tenant activo. El frontend lo llama antes del login para
  aplicar los colores y el logo correcto.

Para onboarding de un cliente nuevo no hace falta código ni deploy: basta con
`python manage.py create_tenant --nombre ... --slug ... --dominio ...
--color-primary ... --logo-url ... --assign-courses`.

---

## 3. Roles y acceso

| Rol | Quién es | Acceso |
|---|---|---|
| **Estudiante** | Cualquier `User.is_active` | Inscribirse, avanzar, rendir quizzes, obtener certificados |
| **Instructor** | `User.academy_instructor = True` | Crear/publicar cursos, gestionar módulos/lecciones/quizzes, revisar entregas |
| **Admin/Staff** | `User.is_staff` o `is_admin` | Todo — puede editar los cursos de cualquier instructor |

El acceso al panel (`academy_acceso`) es abierto: cualquier cuenta activa
entra como estudiante. Para convertir a alguien en instructor basta con
marcar `academy_instructor = True` en el admin Django (sin rol global nuevo,
a diferencia de Performance).

**Seguridad clave:** `Question.respuestas_correctas` **nunca se expone al
estudiante** — ni en el árbol del curso ni en el endpoint del quiz. El
serializer la oculta salvo contexto `include_answers` (solo autor/admin).
El cliente nunca envía puntaje ni progreso: todo se computa en el servidor.

---

## 4. Modelo de datos

```
Course (instructor, slug, portada, categoria, publicado, disciplina, licencia,
        modalidad, carga_horaria_h, acredita_renovacion, tenant)
  └── Module (orden)
        └── Lesson (tipo: video | texto | quiz | en_vivo | practica | entregable,
                    contenido, video_url, fecha_en_vivo, entregable_tipo)
              └── Quiz (OneToOne, puntaje_aprobacion %)
                    └── Question (opciones JSON, respuestas_correctas JSON —SECRETO—,
                                  tipo: opcion_unica | multiple | verdadero_falso,
                                  puntos, video_url)

Enrollment (student + course, unique; estado: activa | completada | cancelada; progreso 0-100)
  ├── LessonProgress (enrollment + lesson, unique)
  ├── QuizAttempt   (respuestas, detalle, puntaje %, aprobado; historial completo)
  ├── Submission    (enrollment + lesson, unique; tipo: texto | video | planificacion;
  │                  estado: enviada | aprobada | rechazada; feedback del instructor)
  └── Certificate   (OneToOne enrollment; codigo "ZA-XXXXXXXX" único verificable)

CourseBadge (course, lección que la otorga, orden, nombre, icono emoji, descripción)
EarnedBadge (enrollment + badge, unique; asignada por grading.award_badges)

Tenant (nombre, slug, dominio, dominio_custom, branding JSON, settings)
```

---

## 5. El motor de calificación (siempre en el servidor)

El módulo `academy/grading.py` es la fuente única de verdad para todo el
scoring. El cliente solo envía las respuestas crudas:

- **`grade_attempt(quiz, respuestas)`** → `{puntaje %, aprobado, detalle}`.
  Una pregunta es correcta si el conjunto de opciones enviadas coincide
  exactamente con el conjunto correcto. Vale para única, múltiple y
  verdadero/falso. El detalle por pregunta se devuelve al estudiante
  (retroalimentación) pero nunca la clave.

- **`recompute_progress(enrollment)`** → recalcula el `%` de lecciones
  completadas. Al llegar al 100% + todos los quizzes aprobados → cambia
  `estado = completada` y emite el certificado automáticamente (idempotente).

- **`award_badges(enrollment)`** → evalúa qué `CourseBadge`s del curso ya
  fueron desbloqueados por la lección que los otorga y crea los
  `EarnedBadge` que falten. Se llama siempre desde `recompute_progress`; el
  cliente nunca escribe insignias.

- **`issue_certificate`** → idempotente. Genera el código `ZA-XXXXXXXX` con
  `secrets`. El endpoint público `GET /certificates/verify/<codigo>/` permite
  validar cualquier certificado sin auth.

---

## 6. Tipos de lección

| Tipo | Descripción | ¿Autocompletable? |
|---|---|---|
| `video` | Contenido en video (YouTube/Vimeo embed). Muestra placeholder "Video en producción" si no hay URL. | Sí |
| `texto` | Contenido markdown/HTML. | Sí |
| `quiz` | Preguntas calificadas en servidor con retroalimentación y reintentos. | Sí (al aprobar el quiz) |
| `en_vivo` | Sesión sincrónica con `fecha_en_vivo` (DateTime) y enlace de reunión en `video_url`. | Sí |
| `practica` | Día presencial o tarea práctica autocompletable. | Sí |
| `entregable` | Trabajo entregado por el estudiante, revisado y aprobado por el instructor. **NO** autocompletable — la completa el instructor al aprobar la entrega. | No (requiere aprobación) |

---

## 7. El flujo del estudiante

### 7.1 Catálogo y inscripción
El estudiante navega el catálogo con filtros por categoría, disciplina, nivel
y licencia. Cada `CourseCard` muestra portada, categoría, nivel, disciplina,
carga horaria y el badge de licencia (chip blanco/navy). Al abrir el detalle
ve el árbol completo de módulos → lecciones con sus tipos. El botón "Inscribirse"
llama a `POST /courses/<id>/enroll/` (idempotente).

### 7.2 Reproductor de lecciones (modo enfoque)
Ruta `/aprender/:enrollmentId` — pantalla completa fuera del `AppLayout`
(sin sidebar ni topbar). Tres zonas:

- **Izquierda:** temario (`CourseOutline`) con progreso por lección (ticks
  verdes), lección activa resaltada y check-list de competencias (insignias).
- **Centro:** contenido de la lección activa — video embed, texto, quiz
  interactivo, sesión en vivo, práctica o formulario de entrega.
- **Abajo/navegación:** prev/siguiente con autoavance, marcar-completada
  para tipos autocompletables, banner de curso completado + enlace al
  certificado.

### 7.3 Quiz interactivo
- El estudiante selecciona respuestas y envía → `POST /enrollments/<eid>/quizzes/<qid>/attempt/`.
- El servidor devuelve `{puntaje, aprobado, detalle}` con retroalimentación
  por pregunta.
- Si aprueba: la lección del quiz queda completada y `recompute_progress`
  avanza el porcentaje (potencialmente completa el curso y emite certificado).
- Si no aprueba: puede reintentar; el historial de intentos se guarda y el
  frontend muestra el mejor intento.
- Las preguntas con `video_url` muestran un clip antes de la pregunta
  (Video-Quiz Interactivo).

### 7.4 Entregas (lecciones `entregable`)
El estudiante sube su trabajo (texto, URL de video o planificación táctica).
Puede reenviar mientras no esté aprobada. El instructor revisa, aprueba o
pide ajustes con feedback. Al aprobar, el servidor crea el `LessonProgress`
y llama a `recompute_progress`.

### 7.5 Mis certificados
La pantalla `/certificados` lista los certificados obtenidos con su código
y un diploma visual. El verificador en `GET /certificates/verify/<codigo>/`
es público — cualquiera puede confirmar la autenticidad de un certificado.

---

## 8. El flujo del instructor

### 8.1 Crear y publicar cursos
El panel `/instructor` lista los cursos del instructor (`?mine=1`, incluye
borradores). El modal "Crear curso" captura título, descripción, categoría,
nivel, disciplina, licencia, modalidad y carga horaria. Los cursos no
publicados son invisibles para los estudiantes (404 a terceros). El guard
`puede_crear_cursos` oculta toda la sección de instructor si el usuario no
tiene el flag.

### 8.2 Gestión de videos
La pantalla `/instructor/cursos/:id/contenido` (`CourseContentPage`) lista
las lecciones del curso y permite anexar/cambiar/quitar la `video_url` por
lección, ver la vista previa del embed, poner el enlace de reunión para
lecciones `en_vivo` y convertir el tipo de lección (lectura ↔ video).

### 8.3 Revisión de entregas
La pantalla `/instructor/cursos/:id/entregas` (`SubmissionsPage`) muestra
las entregas en tabs por estado (enviadas / aprobadas / rechazadas). El
instructor puede aprobar (→ crea LessonProgress + recompute) o pedir
ajustes (→ borra el LessonProgress de esa lección) con un campo de feedback.

---

## 9. Adaptación CONMEBOL Evolución

Academy se adaptó al sistema oficial de formación de entrenadores de la
Confederación Sudamericana de Fútbol. La adaptación es **aditiva** — no
rompe cursos normales (los campos tienen defaults).

### 9.1 Campos CONMEBOL en `Course`
| Campo | Valores | Descripción |
|---|---|---|
| `disciplina` | general / futbol / futsal / futbol_playa / arqueros / preparacion_fisica | Disciplina del entrenador |
| `licencia` | (ninguna) / C / B / A / PRO | Nivel de licencia CONMEBOL al que aplica |
| `modalidad` | presencial / virtual / semipresencial | Formato de dictado |
| `carga_horaria_h` | entero | Horas del curso (el sistema CONMEBOL cuenta en horas) |
| `acredita_renovacion` | bool | Si acredita horas para renovar licencia (≥20h cada 3 años) |

### 9.2 Cursos sembrados (`seed_conmebol_evolucion`)
Comando idempotente (`python manage.py seed_conmebol_evolucion`) que crea:

1. **"Licencia C: Fundamentos del Entrenador"** — Fútbol, 140h,
   semipresencial. 5 módulos: sistema de licencias CONMEBOL, pedagogía
   y andragogía, modelo de juego, preparación física y salud del deportista,
   ética y reglamento. 5 quizzes, 22 preguntas.

2. **"Futsal: Lógica del Juego y Modelo"** — Futsal, 120h, virtual.
   2 módulos, 1 quiz.

El seed sincroniza tipo y `video_url` en runs subsecuentes (match por orden
y título) sin tocar quizzes ni progreso existente, respetando URLs ya
anexadas.

---

## 10. Programa Evolución 360° — "Del Clic a la Cancha"

Implementación de una propuesta de innovación académica que combina clases en
vivo, prácticas de campo y entregables evaluados por instructor.

**Características clave:**
- 5 fases como módulos: sesión en vivo inicial → módulo digital intermedio →
  segunda sesión en vivo con Video-Quiz → 3 días presenciales + escenario
  crítico + entregable de planificación → sesión en vivo final + entregable
  de diario de estrategia en video + evaluación final.
- **3 insignias de competencia:** 🎯 Estratega Analítico, 🎥 Comunicador
  Visual, 📋 Planificador Táctico.
- Disciplina fútbol, modalidad semipresencial, 40h, acredita renovación.

Sembrable con `python manage.py seed_evolucion_360 [--instructor-email ...]`.

---

## 11. Identidad visual

**Tema: CLARO** (fondos blancos). Manual de marca CONMEBOL (archivo
`manual-de-marca-conmebol-ingles.pdf`). Los colores oficiales de CONMEBOL
son blanco y azul.

| Token | Valor | Uso |
|---|---|---|
| `brand` | `#1a3e72` (navy) | Color primario / fondo de login |
| `accent` | `#0066b3` (azul flat) | Acento / botones / links |
| Fondos | blancos | Contenido, cards |

- Tipografía: **Ubuntu** (Google Fonts, la tipografía oficial CONMEBOL para
  digital; cargada en `index.html`).
- Tagline: *"Cree en grande"* (dinámica, viene del tenant config).
- **Emblema:** placeholder SVG (escudo + birrete en azules) en
  `src/components/Emblem.tsx`. El logo CONMEBOL real es protegido — reemplazar
  por el asset definitivo cuando se autorice.
- Los colores son CSS variables con canales RGB (soporta `bg-brand/10` en
  Tailwind). `TenantProvider` los aplica en runtime según el branding del
  tenant activo.

**No confundir con Performance** (oscuro, azul eléctrico `#4f8cff`) ni con
la app de consumo Coach (oscuro, morado `#7C5CFF`).

---

## 12. Stack técnico del panel web

```
Frontend:  Vite 6 + React 19 + TypeScript (SPA)
Routing:   React Router 7
HTTP:      Axios (JWT + refresh transparente; tokens en localStorage zacad_*)
CSS:       Tailwind 3 con CSS variables de tenant
Dev:       Puerto 5181 (Performance usa 5180)
Build:     npm run build (tsc --noEmit + vite, 125+ módulos)
No usa:    TanStack Query (llamadas con useState/useEffect)
```

**Estructura `src/`:**
```
api/       client.ts (axios+JWT), auth.ts, academy.ts
auth/      AuthContext / useAuth / ProtectedRoute
tenant/    TenantContext / TenantProvider (branding runtime)
components/
  Emblem.tsx          placeholder del logo
  Icon.tsx            íconos (live, pitch, upload, ...)
  layout/             Sidebar, Topbar, AppLayout (modo enfoque sin sidebar)
  player/             CourseOutline, QuizLesson, DeliverableLesson, CompetencyChecklist
  ui/                 Dialog (focus-trap + Escape), ProgressBar (role=progressbar), ...
lib/        constants.ts (BRAND, CATEGORIAS, DISCIPLINAS, LICENCIAS, MODALIDADES)
            videoEmbed.ts (YouTube/Vimeo → iframe)
            useDialogA11y.ts
pages/
  LoginPage            hero navy
  CatalogPage          filtros disciplina/nivel/licencia/categoría
  CourseDetailPage     árbol módulos → lecciones + inscripción + check-list insignias
  LessonPlayerPage     reproductor modo enfoque (FUERA de AppLayout)
  MyLearningPage       mis cursos con progreso
  CertificatesPage     diplomas + verificador por código
  InstructorPage       lista ?mine=1 + modal crear curso
  CourseContentPage    gestión de videos por lección
  SubmissionsPage      bandeja de entregas (tabs por estado)
  ProfilePage          PATCH nombre
types/      espejo del backend (Course, Lesson, Enrollment, QuizAttempt, ...)
router.tsx
```

---

## 13. Endpoints

Todos bajo `/api/academy/`:

```
GET    /tenant/config/                        branding del tenant (público)

POST   /auth/login/                           gatea academy_acceso
GET    /me/                                   flags is_instructor / puede_crear_cursos
PATCH  /me/                                   actualizar nombre

GET/POST      /courses/                       catálogo (?mine=1 para autor)
GET/PUT/PATCH/DELETE  /courses/<id>/
GET/POST      /courses/<id>/modules/
PUT/PATCH/DELETE      /courses/<id>/modules/<mid>/
GET/POST      /courses/<id>/modules/<mid>/lessons/
PUT/PATCH/DELETE      /courses/<id>/modules/<mid>/lessons/<lid>/
GET/PUT       /lessons/<lid>/quiz/            upsert quiz
GET/POST      /quizzes/<qid>/questions/
PUT/PATCH/DELETE      /quizzes/<qid>/questions/<qid>/

POST   /courses/<id>/enroll/                  idempotente
GET    /courses/<id>/enrollments/             (autor: lista de inscritos)
GET    /enrollments/
GET    /enrollments/<eid>/
POST   /enrollments/<eid>/lessons/<lid>/complete/
POST   /enrollments/<eid>/quizzes/<qid>/attempt/   calificado en servidor
GET/POST      /enrollments/<eid>/lessons/<lid>/submission/   (estudiante)
GET    /enrollments/<eid>/certificate/

GET    /courses/<id>/submissions/?estado=     (autor: bandeja de entregas)
POST   /submissions/<sid>/review/             (autor: aprobar / pedir ajustes)

GET    /certificates/verify/<codigo>/         público, sin auth
```

---

## 14. Deploy

| App DO | URL | ID | Tipo |
|---|---|---|---|
| `zyfit-academy` (frontend) | `https://zyfit-academy-e8r4w.ondigitalocean.app` | `133dcb1d-...` | Static Site (nyc) |
| `sea-lion-app` (backend) | `https://sea-lion-app-a2j4f.ondigitalocean.app` | `8a67cba4-...` | Docker (sfo) — compartido con Performance |

El backend de Academy **no es una app DO nueva**: las tablas `academy_*` viven
dentro del mismo backend Django (`sea-lion-app`). Deploy = `git push origin main`
→ `entrypoint.sh` corre `migrate --noinput` → crea las tablas nuevas automáticamente.

El frontend se despliega como Static Site separado con spec en
`academy-web/.do/app.yaml`. `VITE_API_URL` se inyecta en build time (Vite
lo inlinea en el bundle).

**CORS:** la URL de Academy está añadida a `CORS_ALLOWED_ORIGINS` en el env
de `sea-lion-app`. Si se crean subdominios por tenant, añadir sus orígenes.

**Gotcha Safari móvil:** Safari cachea agresivamente el `index.html`. Si el
usuario "no ve cambios" tras un deploy, pedir que use pestaña privada o
borre datos de Safari. Verificar el deploy por contenido (`curl` + grep de
una clase CSS nueva), no por el hash del bundle.

---

## 15. Accesibilidad implementada

- `useDialogA11y.ts` + `Dialog.tsx`: focus-trap, cierre con Escape,
  scroll-lock y restauración de foco. Enfoca el elemento con `[data-autofocus]`.
  Usar para todo modal nuevo.
- `:focus-visible` global en `index.css`.
- `@media prefers-reduced-motion` en `index.css`.
- Token `ink-muted` oscurecido a `#647189` (contraste AA). `ink-faint` solo
  decorativo.
- `ProgressBar` con `role="progressbar"`.
- Quiz con `role="group"` + `aria-labelledby` (no `fieldset`).
- Mutaciones con `aria-live` + `try/catch`.
- Touch: feedback táctil en `@media (hover:none)`, `tap-highlight-color:transparent`,
  íconos-botón a 40px, gutter móvil de 24px → 32px → 40px en `AppLayout` y `Topbar`.

---

## 16. Pendientes

| Pendiente | Estado |
|---|---|
| Editor completo de cursos en el instructor | Solo "crear curso" + gestión de videos; edición de módulos/lecciones/preguntas pendiente |
| Portadas reales de cursos | Hoy es `portada` TextField (data URL base64); sin object storage |
| Logo/marca definitivo CONMEBOL | Emblem.tsx es placeholder SVG; requiere asset oficial autorizado |
| Diseño final del diploma | Certificado funcional pero pendiente polish visual |
| Seguimiento de tiempo de video | No hay autocompletado por reproducción; se completa manualmente |
| Subdominios por tenant en prod | Multi-tenant funcional; DNS/CORS de subdominios cliente aún sin configurar |
| Seed CONMEBOL en prod | Correr `seed_conmebol_evolucion` desde consola web DO o script API |
| Object storage de portadas | Mismo patrón pendiente que fotos de Performance (DO Spaces) |

---

*Documento generado como resumen ejecutivo de la vertical e-learning. Para el
detalle de implementación ver `CLAUDE.md`, el código de `academy-web/` y
`backend/academy/`, y el archivo de memoria
`memory/project_academy_vertical.md`.*
