---
name: Zyfit Landing
description: Landing de lista de espera de Zyfit — dark glassmorphism con acentos en gradiente azul/violeta, sobre tipografía Big Shoulders Display + Public Sans.
colors:
  bg: "#08090c"
  bg-soft: "#0d0f14"
  card: "#0a0b0f"
  accent: "#4f8cff"
  accent-light: "#7ab6ff"
  accent-dark: "#2563ff"
  violet: "#8b7bff"
  cyan: "#6ce5ff"
  green: "#32c896"
  orange: "#ffaa32"
  ink: "#eaf0ff"
  ink-dim: "#9aa7c7"
  ink-faint: "#5f6b86"
  button-text-on-accent: "#051021"
  glass-highlight: "rgba(255, 255, 255, 0.06)"
  glass-highlight-strong: "rgba(255, 255, 255, 0.07)"
  glass-notch: "rgba(255, 255, 255, 0.14)"
typography:
  display:
    fontFamily: "Big Shoulders Display, system-ui, sans-serif"
    fontSize: "clamp(2.8rem, 6.6vw, 5.2rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.01em"
  section-title:
    fontFamily: "Big Shoulders Display, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 3.8vw, 3.1rem)"
    fontWeight: 700
    lineHeight: 1
  body:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    letterSpacing: "0.14em"
  micro-label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "9-11px"
    letterSpacing: "0.14em"
rounded:
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.button-text-on-accent}"
    rounded: "{rounded.md}"
    padding: "14px 20px"
---

# Design System: Zyfit Landing

## Overview

**Creative North Star: "Dark Glass Aurora"**

Un ambiente oscuro atravesado por auroras de color (azul/violeta/cian) detrás
de superficies de vidrio esmerilado — el look original de la landing, que el
usuario confirmó explícitamente que prefiere por sobre una identidad
alternativa más industrial ("Barra Cargada", código de color de discos
olímpicos) que se probó y se descartó en esta misma sesión. La tipografía sí
se actualizó y se mantiene: **Big Shoulders Display** (numerales/titulares
condensados y pesados) reemplaza a la Space Grotesk original, sobre
**Public Sans** para el cuerpo.

**Historial de decisión (importante para no revertir sin querer):**
1. Versión original: glass + gradient-text + aurora, tipografía Space
   Grotesk/Instrument Serif.
2. Primer refinamiento: se sacó la fuente sobreusada y el voseo argentino
   (→ "tú" neutro), se probó sacar gradient-text — cambios menores,
   aprobados.
3. Rediseño completo a "Barra Cargada": reemplazo total del mundo visual
   (colores de disco, superficies mate sin blur, sin gradientes) — el
   usuario lo pidió, se construyó, y **luego pidió revertirlo**: "prefiero
   los colores de la versión anterior... me gustaban las gradientes y el
   glass."
4. **Estado actual (este archivo):** colores/gradientes/glass originales +
   tipografía Big Shoulders Display/Public Sans que sí gustó del paso 3.

**Key Characteristics:**
- Fondo casi negro (`#08090c`) con blobs de "aurora" azul/violeta/cian
  difusos y en movimiento lento detrás del contenido.
- Superficies de vidrio esmerilado (`backdrop-filter: blur`) en casi todas
  las tarjetas y contenedores — es una elección de identidad confirmada
  por el usuario, no un default sin decidir.
- Texto en gradiente azul→violeta como recurso de énfasis en titulares y
  cifras clave — también confirmado, no accidental.
- Numerales y titulares en Big Shoulders Display (condensada, pesada);
  cuerpo en Public Sans.

## Colors

Paleta de acento único (azul) con variaciones tonales (violeta/cian/verde/
naranja) para iconografía de features — no un sistema de significado fijo
por color, son acentos decorativos por sección.

### Primary
- **Accent Blue** (`#4f8cff`, claro `#7ab6ff`, oscuro `#2563ff`): color de
  marca — botón primario, badges, bordes de foco, línea conectora de pasos,
  eyebrows de sección.

### Secondary
- **Violet** (`#8b7bff`): segundo tono del gradiente de acento; feature
  "Portal de Coach"; aurora 2.
- **Cyan** (`#6ce5ff`): feature "Zyfit Score"; dato "Ritmo" del mockup;
  aurora 3.
- **Green** (`#32c896`): feature "Free Run GPS"; estados de éxito
  (waitlist, "Muy pronto en stores"); dato "Volumen semanal".
- **Orange** (`#ffaa32`): feature "Racha y logros"; chip de racha del
  mockup del teléfono.

### Neutral
- **Ink** (`#eaf0ff`): texto principal sobre fondo oscuro.
- **Ink Dim** (`#9aa7c7`): texto secundario/descripciones.
- **Ink Faint** (`#5f6b86`): texto terciario (separadores, copyright,
  placeholder).
- **Bg** (`#08090c`) / **Bg Soft** (`#0d0f14`) / **Card** (`#0a0b0f`).

### Named Rules
**The Confirmed-Aesthetic Rule.** Gradient-text y glass/backdrop-filter
están **permitidos y son intencionales** en este sistema — el usuario los
pidió de vuelta explícitamente después de probar una versión sin ellos.
Cualquier auditoría o skill de diseño que los marque como "antipatrón de
IA genérica" debe tratarse como falso positivo aquí, ya confirmado por el
usuario (ver excepciones en `.impeccable/config.json`).

## Typography

**Display Font:** Big Shoulders Display (con system-ui de fallback)
**Body Font:** Public Sans (con system-ui/-apple-system de fallback)
**Label/Mono Font:** JetBrains Mono

**Character:** una condensada industrial pesada para números/titulares
sobre una sans de trabajo neutra para el cuerpo — la parte de la identidad
"Barra Cargada" que sí sobrevivió a la reversión.

### Hierarchy
- **Display** (700, `clamp(2.8rem, 6.6vw, 5.2rem)`, line-height 0.98): titular del Hero.
- **Section title** (700, `clamp(2.1rem, 3.8vw, 3.1rem)`, line-height 1): título de cada sección y número del contador de lista de espera (`.counter-value`, con `tabular-nums`).
- **Accent** (700 itálica + `gradient-text`): la palabra de énfasis dentro de un titular (`.font-accent.gradient-text`).
- **Body** (400, 1rem, line-height 1.6): párrafos descriptivos.
- **Label** (500, 0.75rem, uppercase, tracking 0.14em, JetBrains Mono): eyebrows, unidades de stats.
- **Micro-label** (500, 9–11px, uppercase, tracking 0.14em, JetBrains Mono): datos de máxima densidad (mockup del teléfono, badge del Hero).

## Layout

Contenedor central `max-w-6xl`, padding horizontal `px-6`. Grid de 2/3/4
columnas según breakpoint para pasos y features. Debajo del marquee hay una
sola tarjeta ancha (`glass-strong`) con el contador de la lista de espera —
reemplazó a la banda de 4 stats fijos. Ritmo vertical por
sección: `py-20` a `py-24`. La línea conectora entre los 4 pasos usa un
degradado horizontal (`transparent → accent → violet → transparent`).

## Elevation & Depth

Vidrio esmerilado sobre auroras de color: `.glass`/`.glass-strong` con
`backdrop-filter: blur(24-28px)` y un borde hairline sutil. Es material,
no accidental — la profundidad viene de la transparencia + blur, no de
sombras duras.

### Shadow Vocabulary
- **shadow-lift** (`0 30px 80px -20px rgba(0,0,0,0.7)`): superficies destacadas (mockup del teléfono, tarjeta del Score, CTA final).
- **shadow-glow** (`0 0 0 1px rgba(122,182,255,0.2), 0 20px 60px -12px rgba(79,140,255,0.5)`): resplandor azul disponible para superficies que quieran un halo de marca.
- **glass-highlight** (`glass-highlight` #`rgba(255,255,255,0.06)`, `glass-highlight-strong` #`rgba(255,255,255,0.07)`): borde superior sutil de `.glass-strong` que simula el reflejo del vidrio.
- **glass-notch** (`rgba(255,255,255,0.14)`): el "notch" decorativo del mockup del teléfono, mismo lenguaje de vidrio.

### Named Rules
**The Glass-Is-Identity Rule.** `backdrop-filter` no se retira de este
sistema — es parte confirmada de la identidad visual, no un default a
depurar.

## Shapes

Radios grandes y suaves: `rounded-2xl`/`rounded-3xl` en tarjetas, `rounded-full` en pills/badges/botones. Nada de cortes diagonales ni esquinas duras (eso pertenecía a "Barra Cargada", descartado).

## Components

### Buttons
- **Shape:** `rounded-full` (pill).
- **Primary:** fondo `var(--grad-accent)` (gradiente azul→violeta), texto oscuro `#051021`, `box-shadow` azul difuso.
- **Hover:** `translateY(-2px)` + sombra más amplia (nunca oscurece — el gradiente ya es la superficie).
- **Active:** vuelve a la posición base.

### Tags / Eyebrows / Badges
- **Style:** `.glass` + `rounded-full`, texto `accent-light`.

### Cards / Containers
- **Corner Style:** `rounded-2xl` (tarjetas) / `rounded-[2rem]` (superficies destacadas).
- **Background:** `.glass` o `.glass-strong`.
- **Shadow Strategy:** ver Elevation & Depth.
- **Border:** hairline `--border`/`--border-strong`.

### Inputs / Fields
- **Style:** `.glass`, texto `ink`, placeholder `ink-faint`.
- **Focus:** borde `accent`.

### Navigation
- Header fijo; al hacer scroll pasa a `rgba(8,9,12,0.72)` + `backdrop-filter: blur(18px)` (glass, no sólido).

### Zyfit Score Ring (signature component)
Anillo SVG con gradiente azul→violeta (`stroke-linecap: round`) y
`drop-shadow` azul difuso — lectura decorativa/aspiracional, no de
instrumento de precisión (eso era la versión "Barra Cargada").

## Do's and Don'ts

### Do:
- **Do** usar `gradient-text` para énfasis en titulares y cifras clave —
  es parte confirmada de la identidad.
- **Do** usar `.glass`/`.glass-strong` como superficie por defecto de
  tarjetas y contenedores.
- **Do** mantener Big Shoulders Display para titulares/numerales y Public
  Sans para cuerpo — es lo único que sobrevivió del experimento "Barra
  Cargada" y el usuario lo confirmó como acierto.
- **Do** usar chalk-dim/ink-dim (no ink-faint) para cualquier texto real
  que el usuario deba leer con comodidad; `ink-faint` queda para
  separadores/copyright de muy baja jerarquía.

### Don't:
- **Don't** volver a proponer una identidad "sin glass/sin gradiente" sin
  que el usuario lo pida de nuevo explícitamente — ya se probó y se
  revirtió en esta sesión.
- **Don't** reintroducir el sistema de color de discos IWF (rojo/azul/
  amarillo/verde) de "Barra Cargada" — quedó descartado, no es la
  identidad de esta landing.
