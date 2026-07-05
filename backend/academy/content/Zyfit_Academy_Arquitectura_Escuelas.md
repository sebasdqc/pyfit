# Zyfit Academy — Arquitectura de Escuelas
### Framework denso y escalable para expansión de catálogo

---

## 0. Criterio de diseño (por qué esta arquitectura y no otra)

Antes de la lista, las reglas que la gobiernan — porque la última vez que se propusieron 5 escuelas, 2 murieron por falta de densidad real. Esto no se repite si cada escuela pasa este filtro:

1. **Ancla académica/profesional real.** Cada escuela debe mapear a un dominio ya validado por una entidad de referencia (NSCA, ACSM, SFS Academy, curricula universitario de Ciencias del Deporte) — no una categoría inventada por conveniencia de marketing. Esto es lo que te da credibilidad frente a competidores que improvisan taxonomía.
2. **Densidad mínima de lanzamiento: 3 cursos reales, no rellenos.** Si una escuela no aguanta 3 cursos con currículo propio y no solapado, no es escuela — es módulo de otra.
3. **Los verticales de deporte NO son escuelas.** Fútbol, running, básquet, etc. son **tracks/etiquetas transversales** que atraviesan las escuelas. Ya lo decidiste así con la Escuela 5 descartada — se mantiene como principio permanente, no como excepción de esa vez.
4. **Cada escuela debe tener al menos un curso "ancla de producto"** — un curso que solo Zyfit puede enseñar con datos reales (Zyfit Score, Zyfit Coach, GPS, Performance). Esto es tu moat. Escuelas 100% teóricas sin ancla de producto son commodities que cualquier competidor replica.
5. **Honestidad metodológica por escuela.** Cada escuela se etiqueta según cuánta evidencia contestada maneja (bajo / medio / alto). Esto no es cosmético — determina cuánto trabajo de "presentar la controversia en vez de resolverla" vas a necesitar en el contenido.
6. **Escalable = capas, no expansión horizontal infinita.** Cada escuela tiene 3 niveles (Fundamentos → Aplicado → Especialista/Producto). Creces añadiendo cursos *dentro* de escuelas antes de añadir escuelas nuevas. La arquitectura crece hacia abajo, no hacia los lados.

---

## 1. Las 7 escuelas (arquitectura objetivo)

### 🟢 Ya construidas (3)

**Escuela 1 — Ciencia del Entrenamiento**
Ancla: NSCA CSCS (Program Design, Periodization) · Evidencia: alta certeza
Periodización · Gestión de Carga · Deload y Fatiga

**Escuela 2 — Analítica y Rendimiento Deportivo**
Ancla: NSCA CPSS (Sport Science/Technology & Data) · Evidencia: media
sRPE/TRIMP · ACWR · Zyfit Score *(ancla de producto)*

**Escuela 3 — Recuperación, Prevención y Wellness**
Ancla: SFS "Recovery" + "Sports Medicine" · Evidencia: media-alta
HRV · Prevención de Lesiones · Carga Psicológica

---

### 🟡 Nuevas — completan la arquitectura (4)

**Escuela 4 — Fisiología y Nutrición Aplicada**
Ancla: ACSM Guidelines + curricula universitario (Exercise Physiology, Nutrition & Metabolism) · Evidencia: nutrición = baja-media (mucho mito), fisiología base = alta
Este es el hueco más visible de tu catálogo actual: no tienes nada de nutrición ni fisiología de base, y es lo primero que un profesional serio espera ver en una academia de ciencias del deporte.
1. Bioenergética Aplicada al Entrenamiento (ATP-PC, glucolítico, oxidativo — cuándo importa cada uno)
2. Nutrición para Rendimiento: Mitos vs. Evidencia (timing de carbohidratos, proteína, suplementación con evidencia real)
3. Composición Corporal: Medición y Manipulación Basada en Datos *(ancla de producto: tracking en Zyfit)*

**Escuela 5 — Psicología del Rendimiento**
Ancla: SFS "Psychology" + NSCA (Psychological Foundations) · Evidencia: media
Ya identificado como hueco en el reservorio Delta. Se diferencia de la "Carga Psicológica" de la Escuela 3 (que es wellness/monitoreo) enfocándose en **rendimiento activo**: la cabeza compitiendo, no la cabeza recuperándose.
1. Fundamentos de Psicología Deportiva (motivación, activación, ansiedad competitiva)
2. Construcción Mental de Rutinas de Alto Rendimiento (rutinas pre-competitivas, foco, visualización con evidencia)
3. Liderazgo y Dinámica de Grupo en Equipos Deportivos

**Escuela 6 — Poblaciones Especiales y Salud Clínica**
Ancla: ACSM (Clinical Exercise Physiology) — literalmente el estándar de oro de esta categoría · Evidencia: alta
Mercado con menos competencia directa en español y alta disposición a pagar (fisioterapeutas, entrenadores que trabajan con adultos mayores, poblaciones con enfermedades crónicas). Amplía el mercado más allá del atleta de rendimiento.
1. Entrenamiento en Poblaciones con Enfermedad Crónica (cardiovascular, metabólica, oncológica)
2. Ejercicio y Envejecimiento: Sarcopenia y Funcionalidad
3. Adaptaciones para Embarazo, Postparto y Poblaciones Pediátricas

**Escuela 7 — Negocio, Coaching y Marca Profesional**
Ancla: SFS "Coaching" + demanda transversal validada en tu research original de Delta · Evidencia: baja controversia (es más práctico que científico)
Esta escuela no enseña ciencia — enseña a monetizar la ciencia. Es tu motor de retención: alguien que ya completó las otras escuelas necesita esto para convertir conocimiento en ingreso, lo cual alarga el LTV y da una razón de negocio real para que seas tú (no un curso suelto) quien lo enseñe.
1. Construcción de Marca Personal para Profesionales del Deporte
2. Modelos de Negocio para Entrenadores Independientes (pricing, retención, escalar sin perder calidad)
3. Comunicación con el Cliente/Atleta: De la Ciencia a la Adherencia

---

## 2. Tabla resumen — decisión de un vistazo

| # | Escuela | Ancla externa | Evidencia contestada | Curso ancla de producto |
|---|---|---|---|---|
| 1 | Ciencia del Entrenamiento | NSCA CSCS | Baja | — |
| 2 | Analítica y Rendimiento | NSCA CPSS | Media | Zyfit Score |
| 3 | Recuperación y Wellness | SFS Recovery/Med | Media-alta | — |
| 4 | Fisiología y Nutrición | ACSM | Baja (fisio) / Alta (nutrición) | Composición corporal |
| 5 | Psicología del Rendimiento | SFS Psychology | Media | — |
| 6 | Poblaciones Especiales | ACSM Clinical | Baja | — |
| 7 | Negocio y Marca | SFS Coaching | N/A (práctico) | — |

---

## 3. Cómo crece esto sin dispersarse

- **Fase actual → Fase +1:** añade Escuela 4 (Fisiología y Nutrición) primero — es el hueco más visible para cualquiera que compare tu catálogo con NSCA/ACSM, y tiene la mayor demanda transversal (todos los perfiles la necesitan).
- **Fase +2:** Escuela 6 (Poblaciones Especiales) — abre mercado nuevo (fisioterapeutas, salud) sin canibalizar tu base de rendimiento deportivo.
- **Fase +3:** Escuela 5 (Psicología) y Escuela 7 (Negocio) en paralelo — ambas son de menor densidad científica y más rápidas de producir, buenas para llenar el catálogo sin gran inversión de research.
- **Los tracks de deporte** (fútbol/futsal ya investigado, running vía Zyfit Coach) se activan como filtros transversales sobre las 7 escuelas, no como escuelas nuevas — cuando tengas 2-3 deportes con profundidad real, ahí sí se justifica evaluar una escuela de "Rendimiento Aplicado por Deporte", pero no antes.

**Regla de oro para el futuro:** si en algún momento quieres proponer una escuela 8, primero corre la prueba de las 6 reglas de la sección 0. Si no pasa las 6, es un curso, no una escuela.
