# Zyfit — Resumen de la Plataforma

> Documento explicativo de qué es Zyfit, cómo funciona y cuáles son sus
> features relevantes. Pensado para leerse de corrido por alguien que necesita
> entender el producto completo sin meterse en el código.

---

## 1. Qué es Zyfit en una frase

**Zyfit es una plataforma de entrenamiento inteligente que genera rutinas
personalizadas con IA y que se ha extendido a tres líneas de producto:** una app
de consumo (B2C), un panel de rendimiento para clubes deportivos (B2B) y una
academia de formación online (e-learning). Todo corre sobre un mismo backend.

El corazón del producto es un **motor adaptativo**: en lugar de dar la misma
rutina a todos, cada sesión se construye a partir del perfil del usuario, su
estado del día (sueño, ánimo, dolor, fatiga), su historial reciente y principios
científicos del entrenamiento de fuerza, antes de pasar por un modelo de
lenguaje que redacta la sesión final.

---

## 2. Las tres líneas de producto

| Línea | Para quién | Dónde vive |
|---|---|---|
| **Zyfit** (app) | Personas que entrenan (fuerza + running) | App móvil React Native / Expo |
| **Zyfit Performance** | Clubes y centros deportivos (fútbol/futsal) | Panel web `performance-web` |
| **Zyfit Academy** | Formación de entrenadores (adaptada a CONMEBOL) | Panel web `academy-web` |

Las tres comparten el backend Django y la base de datos, pero cada una tiene su
propia interfaz, su propio login y sus propios roles.

---

## 3. La app de consumo (Zyfit) — el recorrido del usuario

La app está construida con **Expo Router** y un tab navigator inferior de 5
zonas: **Inicio (Dashboard)**, **Estadísticas**, **Entrenar (botón central)**,
**Chat** e **Historial/Perfil**. Estética oscura con glassmorphism, acentos
azules y tipografías Space Grotesk / JetBrains Mono / Instrument Serif.

### 3.1 Alta y onboarding
- Registro/login con **email + contraseña** o **"Continúa con Google"** (SDK
  nativo + endpoint `/api/auth/google/`).
- **Onboarding de 5 pasos** que captura todo lo que el motor necesita: objetivos
  múltiples, nivel, experiencia, lesiones, sexo, fecha de nacimiento, peso,
  altura, ciclo menstrual, días por semana, horario, estrés, tipo de trabajo,
  estilo de entrenamiento, ejercicios favoritos/a evitar y **ubicaciones con sus
  implementos** (qué equipo hay en cada gimnasio/casa/exterior).

### 3.2 Check-in diario
Antes de entrenar, el usuario hace un **check-in** que define el contexto del
día: foco de entrenamiento, dolor de hoy (con un **mapa corporal interactivo**
para marcar zonas), estado de ánimo, calidad de sueño, HRV opcional, ubicación,
duración disponible y notas. Esto es lo que hace que la rutina del lunes no sea
igual a la del martes.

### 3.3 Generación de la rutina (IA)
Con un toque, el motor genera la sesión del día (ver sección 4 para el detalle).
La pantalla muestra título, objetivo, stats (duración / RPE / RIR), una nota del
entrenador y las **fases colapsables** (calentamiento, bloque principal, vuelta a
la calma) con cada ejercicio: series, reps, descanso, RPE sugerido y un botón
para **regenerar/sustituir** un ejercicio puntual con IA.

### 3.4 Modo ejecución
Un modo "manos libres" para entrenar:
- Barra de progreso que avanza **por cada serie** completada de toda la sesión.
- Tarjeta de serie con RPE/RIR/reps, **registro de peso y reps por serie** y una
  escala de percepción de dificultad.
- **Timer circular de descanso** con cuenta regresiva y el siguiente ejercicio.
- Demo de cada ejercicio (emoji de músculo + enlace a YouTube).
- Pantalla de cierre con celebración.

### 3.5 Feedback post-sesión
RPE real, cumplimiento (%), rating y notas. Además genera un **resumen del
entrenador** (las decisiones que tomó el motor + evidencia), un **logro** y la
**próxima sesión sugerida**. Incluye una **tarjeta compartible** (PNG 9:16) con
los datos reales de la sesión para redes.

### 3.6 Modo running
Además de fuerza, hay un **modo carrera con GPS** (tracking en segundo plano,
ruta, métricas de ritmo/distancia) con su propio flujo de resumen y feedback.

### 3.7 Dashboard, Historial y Estadísticas
- **Dashboard:** calendario semanal, círculos de fatiga y volumen, Zyfit Score,
  nivel/ranking y últimas sesiones.
- **Historial:** vista lista (agrupada por mes) y calendario (días coloreados por
  cumplimiento).
- **Estadísticas:** 4 secciones — Rendimiento (RPE real vs objetivo,
  cumplimiento), Carga (fatiga, volumen, series/semana, distribución muscular),
  Prevención (alertas, riesgo, señales de sobreentrenamiento) y Progresión
  (semana vs semana, proyección, racha y nivel) con un bloque de radar.

### 3.8 Perfil, dispositivos y gamificación
- **Perfil:** datos personales, objetivos, lesiones, datos de entrenamiento,
  ciencia/evidencia, glosario, ubicaciones, preferencias y ciclo menstrual.
- **Dispositivos:** integración con **Apple Health** y **Garmin**.
- **Suscripción:** planes, cambio de plan, historial de pagos, cancelación,
  referidos.
- **Gamificación:** niveles por nº de sesiones (Rookie → Atleta → Élite →
  Leyenda), **rachas** y un set de **logros** (primera sesión, racha de 3/7,
  10/25/50 sesiones, consistencia).

---

## 4. El motor adaptativo — el activo central

Cuando el usuario pide una rutina, el backend ejecuta un **pipeline de varios
pasos** antes (y después) de llamar al modelo de lenguaje. La idea clave: **la IA
no decide sola; se le entrega un contexto ya filtrado por evidencia científica.**

**Flujo de generación:**
1. **Contexto** — perfil del usuario + check-in de hoy + sesiones recientes (2
   semanas) + competición próxima (14 días).
2. **Estado** — cálculo de **fatiga** (sesiones de las últimas 72h) y de un
   **RPE objetivo** modulado por fatiga, ánimo y HRV.
3. **Filtros duros** (`training_science.py`) — capa de evidencia que es la "fuente
   única de verdad": taxonomía de 42 músculos → 13 grupos de volumen, landmarks
   de volumen semanal **MEV/MAV/MRV** por grupo y nivel, rangos de repeticiones,
   **topes de RPE de seguridad** por riesgo del ejercicio y descansos por
   evidencia. Es un módulo puro y testeable, sin dependencias de Django.
4. **Motor adaptativo** (`adaptive_engine.py`) — filtra el catálogo de ejercicios
   según equipo disponible y contraindicaciones, prioriza patrones de movimiento
   según el historial reciente, enriquece con la progresión basada en RPE y
   resuelve los parámetros de **periodización** desde el ciclo de entrenamiento
   activo (`TrainingCycle`, meso/microciclos).
5. **Prompt + LLM** — se construye un prompt enriquecido y se llama a **Groq**
   (`llama-3.3-70b-versatile`). El texto del usuario se **sanitiza** antes de
   interpolarse (defensa contra inyección de prompt).
6. **Persistencia** — se parsea el JSON de la sesión y se guarda con su
   estructura completa (fases → ejercicios) y la respuesta cruda de la IA.

**Base científica embebida:** volumen (Israetel / Renaissance Periodization,
Schoenfeld), repeticiones e hipertrofia (Schoenfeld, Baz-Valle), RPE/RIR y
proximidad al fallo (Zourdos, Helms, Grgic) y descansos (Grgic, NSCA). Esto es lo
que diferencia a Zyfit de "un GPT que arma rutinas": las decisiones de carga,
volumen y seguridad están acotadas por la literatura, no improvisadas.

---

## 5. Portal de Coach

Los entrenadores tienen su propio espacio dentro de la app (área `(coach)`):
- **Vínculo por código:** un atleta se conecta a su coach con un código.
- **Cartera de atletas:** lista, detalle, sesiones, estado y configuración por
  atleta; analytics de la cartera.
- **Directiva → IA:** el coach define una directiva para un atleta que **alimenta
  el motor de generación** (el coach guía, la IA ejecuta).
- **Constructor de rutinas** manual y **chat** coach↔atleta (con contador de no
  leídos).
- **Zyfit Score** como métrica de cabecera del atleta.

---

## 6. Zyfit Performance (B2B — clubes deportivos)

Panel web aparte (`performance-web`) orientado a **fútbol y futsal**. Modela
**centros deportivos** (`SportsCenter`), membresías de staff y atletas del
centro, con roles `director_tecnico` / `admin`.

**Módulos del centro:**
- **Rendimiento**, **Carga** (con **ACWR** — acute:chronic workload ratio),
  **Lesiones**, **Tests físicos**, **Planificación** (periodización con
  mesociclos y microciclos), **Psicológico** (wellness + **BRUMS**),
  **Simulador de jugadas**, **Calendario** y **Reportes**.
- **Motor de métricas server-side:** **24 calculadoras** organizadas en **5
  familias** (carga/ACWR, prevención, físico, técnico, táctico) más el
  cuestionario **BRUMS**, con un catálogo de tests y endpoints de cómputo
  (`tests/compute`, `psicologico/wellness/compute`). Las métricas se calculan en
  el servidor para garantizar consistencia.

---

## 7. Zyfit Academy (e-learning)

Panel web aparte (`academy-web`) para **formación de entrenadores**, **adaptado a
CONMEBOL Evolución** (disciplinas, licencias **C-B-A-PRO**, modalidad y carga
horaria).

**Modelo:** `Course → Module → Lesson → Quiz → Question`, con **inscripciones**,
**certificados verificables** (endpoint público `certificates/verify/<codigo>`),
**scoring server-side** de los quizzes y rol `academy_instructor`.

**Programa Evolución 360°:** lecciones de tipo en vivo / práctica / entregable,
con **entregas (`Submission`) revisadas por el instructor** e **insignias**
(`CourseBadge` / `EarnedBadge`).

---

## 8. Administración y seguridad

- **Panel admin** en una ruta **configurable y ofuscada** (no el `/admin/` que
  todo atacante prueba primero), con **verificación OTP**.
- **Métricas, exportaciones** (usuarios / sesiones / feedback a CSV),
  **broadcast** de notificaciones e **impersonación** de usuarios para soporte.
- **Throttling** por endpoint (generación, regeneración, refresh, etc.).
- **Validación de fecha local** del cliente (header `X-Local-Date`, aceptada solo
  dentro de ±1 día) para que no se manipule el contexto de generación.
- **Sanitización** del texto de usuario antes de construir el prompt de IA.

---

## 9. Arquitectura técnica

```
Backend (Django 5 + DRF + SimpleJWT)
  ├─ users/        perfiles, auth, locations, lesiones, ciclo, notificaciones
  ├─ checkins/     check-in diario
  ├─ workouts/     sesiones, ejercicios, feedback, stats, periodización, catálogo
  ├─ ai_workout/   motor adaptativo (training_science + adaptive_engine) + Groq
  ├─ runs/         modo carrera con GPS
  ├─ devices/      integraciones (Apple Health, Garmin)
  ├─ performance/  vertical B2B clubes (centros, módulos, métricas)
  └─ academy/      vertical e-learning (cursos, certificados, evolución 360)

Frontend
  ├─ mobile/           app React Native + Expo (atleta + coach + admin)
  ├─ performance-web/  panel React (Vite) Zyfit Performance
  └─ academy-web/      panel React (Vite) Zyfit Academy

IA:      Groq · llama-3.3-70b-versatile
DB:      PostgreSQL
Deploy:  DigitalOcean App Platform (deploy_on_push a main) · Sentry para errores
```

**Notas de stack relevantes:**
- La app móvil es 100% compatible con **Expo Go** en desarrollo (sin libs
  nativas que rompan el flujo); el preview de la **web** se hace siempre
  desplegando en DigitalOcean.
- **JWT** con access/refresh; tokens guardados en `expo-secure-store`.
- **i18n** (español/inglés) y **temas** múltiples (dark, light, midnight, sand,
  forest, neon, rosado).

---

## 10. Por qué importa (diferenciadores)

1. **Personalización real, no cosmética:** cada sesión nace del estado del día +
   historial + ciencia, no de plantillas fijas.
2. **IA acotada por evidencia:** el LLM redacta, pero los límites de volumen,
   carga, RPE y seguridad los pone una capa científica determinista.
3. **Un backend, tres negocios:** consumo, clubes y formación comparten núcleo,
   lo que multiplica el alcance sin multiplicar la infraestructura.
4. **Ecosistema cerrado entrenador–atleta:** el coach puede guiar al motor y
   comunicarse dentro de la misma app.
5. **Preparada para escalar de forma segura:** admin ofuscado, OTP, throttling,
   sanitización de prompts y validaciones de contexto desde el día uno.

---

*Documento generado como resumen ejecutivo de la plataforma. Para el detalle de
implementación, ver `CLAUDE.md` y el código de cada app.*
