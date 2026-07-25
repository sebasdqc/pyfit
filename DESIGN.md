---
name: Zyfit Landing — Barra Cargada
description: Landing de lista de espera de Zyfit, en la identidad "Barra Cargada": el código de color de los discos olímpicos como sistema de datos.
colors:
  bg: "#17181b"
  bg-soft: "#1d1f23"
  surface: "#1f2124"
  surface-strong: "#26282c"
  plate-red: "#e0201f"
  plate-red-fill: "#c41c1b"
  plate-blue: "#2a5eaa"
  plate-yellow: "#f0b429"
  plate-green: "#2e8b57"
  chalk: "#ece7de"
  chalk-dim: "#aca69c"
  chalk-faint: "#6f6a62"
  plate-red-hover: "#ad1817"
  bevel-highlight-strong: "rgba(255, 255, 255, 0.18)"
  bevel-highlight-strong-hover: "rgba(255, 255, 255, 0.22)"
  bevel-highlight-strong-active: "rgba(255, 255, 255, 0.14)"
  bevel-shadow-fill: "rgba(0, 0, 0, 0.2)"
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
  sm: "6px"
  md: "8px"
  lg: "8px"
components:
  button-primary:
    backgroundColor: "{colors.plate-red-fill}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.lg}"
    padding: "14px 20px"
  button-primary-hover:
    backgroundColor: "{colors.plate-red-hover}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.lg}"
    padding: "14px 20px"
---

# Design System: Zyfit Landing — Barra Cargada

## Overview

**Creative North Star: "Barra Cargada" (Loaded Bar)**

El progreso no se representa con un gráfico neón: se representa con peso
real, cargado en una barra. El sistema de datos de la marca es el código de
color de los discos olímpicos de competencia (rojo = 25kg, azul = 20kg,
amarillo = 15kg, verde = 10kg) — un estándar real del deporte, no una
paleta decorativa inventada. Cada color que aparece en la interfaz significa
algo (intensidad, categoría de dato, estado), igual que en un gimnasio real.

Este mundo reemplaza uno anterior de "AI SaaS oscuro con glass y aurora de
colores" (fondo casi negro, tarjetas de vidrio esmerilado, texto en
gradiente, blobs de luz difusos) — un look que el propio detector de
Impeccable identifica como uno de los patrones más repetidos de interfaces
generadas por IA. Barra Cargada lo rechaza explícitamente: sin
`backdrop-filter`, sin texto en gradiente, sin blobs de color ambiental.

**Fuera de alcance:** `app/privacy/page.tsx` es un documento legal en modo
lectura que mantiene deliberadamente su propio sistema claro/inline,
separado de este mundo — no aplica esta paleta ni tipografía, y los
colores/tamaños que el detector marca ahí como "fuera de DESIGN.md" son
esperados, no drift.

**Key Characteristics:**
- Superficies mate tipo "chapa troquelada" (bisel sutil vía box-shadow en capas), nunca vidrio esmerilado.
- Un solo color por dato/estado, tomado del estándar real de discos — nunca degradados decorativos.
- Numerales industriales pesados para cifras y titulares; texto de cuerpo en una sans de trabajo neutra.
- Motion mecánico: asentamiento con ease-out decisivo, nunca rebote/elástico ni flotación ambiental.

## Colors

Paleta "Full palette": grafito de fondo + cuatro colores con significado
fijo (intensidad/categoría), nunca usados como decoración libre.

### Primary
- **Plate Red** (`#e0201f`): identidad principal — trazo del Zyfit Score, acento de énfasis en titulares (`.font-accent`), ícono "+" del FAQ, resplandor sutil del CTA. Solo como color de texto/gráfico sobre fondo oscuro (nunca como relleno con texto encima, ver *Plate Red Fill*).
- **Plate Red Fill** (`#c41c1b`): variante más oscura, exclusiva para rellenos sólidos con texto claro encima (botón primario). Existe porque `plate-red` puro no llega a 4.5:1 con texto claro — nunca usar `plate-red` como relleno de botón.

### Secondary
- **Plate Blue** (`#2a5eaa`): paso 02 ("La IA arma tu sesión"), feature "Zyfit Score", chip "Fuerza · Tren superior" del mockup, dato "Ritmo". Con texto encima, usar siempre chalk (nunca texto oscuro: `#2a5eaa` no llega a 3:1 con texto oscuro).
- **Plate Yellow** (`#f0b429`): paso 03, feature "Racha y logros", el tag/eyebrow de cada sección y el badge del Hero. Es el único de los cuatro que admite texto oscuro encima con contraste excelente (9.7:1) — por eso es el color por defecto para etiquetas de texto chico sobre relleno sólido.
- **Plate Green** (`#2e8b57`): paso 04, feature "Free Run GPS", barra "Adherencia", dato "Volumen semanal", estado de éxito del formulario de waitlist.

### Neutral
- **Chalk** (`#ece7de`): texto principal sobre fondo oscuro.
- **Chalk Dim** (`#aca69c`): texto secundario/descripciones.
- **Chalk Faint** (`#6f6a62`): reservado para elementos puramente decorativos que NO son texto legible (ya no se usa para placeholder ni copy — ver Do's and Don'ts).
- **Bg** (`#17181b`) / **Bg Soft** (`#1d1f23`): fondo de página y header al hacer scroll.
- **Surface** (`#1f2124`) / **Surface Strong** (`#26282c`): fondo de tarjetas (`.plate` / `.plate-strong`).

### Named Rules
**The Real-Standard Rule.** Ningún color nuevo se agrega a la paleta de datos sin corresponder a un disco IWF real. Si se necesita un quinto tono (como en Factor Bars → "Momentum"), se usa chalk (neutro), no un color inventado.

**The Fill-Needs-Contrast Rule.** Antes de usar un `plate-*` como `background` con texto encima, verificar el par en una calculadora de contraste. Solo `plate-yellow` (texto oscuro) y `plate-blue` (texto chalk) pasan 4.5:1 de forma nativa; el resto requiere una variante `-fill` dedicada o reservarse para texto/gráficos grandes (≥3:1).

## Typography

**Display Font:** Big Shoulders Display (con system-ui de fallback)
**Body Font:** Public Sans (con system-ui/-apple-system de fallback)
**Label/Mono Font:** JetBrains Mono

**Character:** una condensada industrial pesada (numerales de placa/matrícula) contra una sans de trabajo neutra — la tensión entre "cartel de taller" y "texto que se lee fácil en el celular".

### Hierarchy
- **Display** (700, `clamp(2.8rem, 6.6vw, 5.2rem)`, line-height 0.98): titular del Hero.
- **Section title** (700, `clamp(2.1rem, 3.8vw, 3.1rem)`, line-height 1): título de cada sección.
- **Accent** (800 itálica, color plate-red): la palabra de énfasis dentro de un titular (`.font-accent`) — nunca gradiente.
- **Body** (400, 1rem, line-height 1.6): párrafos descriptivos.
- **Label** (500, 0.75rem, uppercase, tracking 0.14em, JetBrains Mono): eyebrows, unidades de stats, datos de reps/ritmo.

- **Micro-label** (500, 9–11px, uppercase, tracking 0.14em, JetBrains Mono): datos de máxima densidad (ritmo, volumen, sets del mockup del teléfono) donde `label` (12px) no entra.

### Named Rules
**The No-Cliché-Grotesk Rule.** Nunca Space Grotesk, Inter-como-display, DM Sans u otra sans "de IA genérica" — Big Shoulders Display es la única fuente display del sistema.

## Layout

Contenedor central `max-w-6xl`, padding horizontal `px-6`. Grid de 2/3/4 columnas según breakpoint (`sm`/`lg`) para stats, pasos y features. Ritmo vertical por sección: `py-20` a `py-24`. El "rail" horizontal entre los 4 pasos (`Cómo funciona`) es un hairline plano (`--border-strong`), no un gradiente de color — representa la barra sobre la que se apoyan los pasos.

## Elevation & Depth

Sin sombras difusas de neón ni `backdrop-filter`. La profundidad se transmite con bisel de chapa: `box-shadow` en capas (highlight interior arriba, sombra interior abajo) más una sombra de proyección real hacia afuera en `.plate-strong`.

### Shadow Vocabulary
- **plate** (`inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.3)`): tarjetas estándar (stats, pasos, features, FAQ).
- **plate-strong** (`inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 0 rgba(0,0,0,0.35), 0 24px 60px -20px rgba(0,0,0,0.65)`): superficies destacadas (mockup del teléfono, tarjeta del Zyfit Score, CTA final).
- **button-bevel** (borde `bevel-shadow-fill` #`rgba(0,0,0,0.2)`, highlight interior `bevel-highlight-strong` `rgba(255,255,255,0.18)`, hover `bevel-highlight-strong-hover` `rgba(255,255,255,0.22)`, active `bevel-highlight-strong-active` `rgba(255,255,255,0.14)`): mismo bisel de chapa que `plate`, pero con opacidades más altas — un fondo saturado (`plate-red-fill`) necesita un highlight más visible que uno neutro para seguir leyendo como metal, no como superficie plana.

### Named Rules
**The No-Blur Rule.** `backdrop-filter` no existe en este sistema. Ninguna superficie es translúcida; todas son chapa mate opaca.

## Shapes

Radios pequeños y consistentes (`rounded-lg` ≈ 8px) en tarjetas e inputs — nada de `rounded-2xl`/`rounded-3xl` (esos pertenecían al mundo de vidrio anterior). Las etiquetas/tags usan un corte diagonal (`clip-path` vía `.stamp`, ~6% de sesgo en los bordes) que evoca una etiqueta de equipo/gancho de gimnasio, no un pill redondeado.

## Components

### Buttons
- **Shape:** `rounded-lg` (8px).
- **Primary:** fondo `plate-red-fill` (#c41c1b), texto chalk, `padding: 14px 20px`. Nunca `plate-red` puro de fondo (falla contraste).
- **Hover:** oscurece a `plate-red-hover` (#ad1817) + sombra más profunda (nunca aclara — aclarar empeora el contraste).
- **Active:** `translateY(2px)` — la barra "baja" al presionar, como una repetición.

### Tags / Stamps
- **Style:** relleno sólido `plate-yellow` + texto oscuro (`#14161a`) para eyebrows de sección y el badge del Hero — es el único par de alto contraste nativo para texto chico sobre color sólido.
- **Shape:** `.stamp` (clip-path diagonal), nunca `rounded-full`.

### Cards / Containers
- **Corner Style:** `rounded-lg`.
- **Background:** `.plate` (surface) o `.plate-strong` (gradiente surface→surface-strong) según jerarquía.
- **Shadow Strategy:** ver Elevation & Depth.
- **Border:** hairline `--border` / `--border-strong`, nunca coloreado.

### Inputs / Fields
- **Style:** `.plate` (mismo tratamiento que una tarjeta), texto chalk, placeholder en chalk-dim (nunca chalk-faint — falla contraste).
- **Focus:** cambia el borde a `plate-red`.

### Navigation
- Header fijo, fondo transparente en el tope; al hacer scroll pasa a `--bg-soft` sólido (nunca blur). Links en chalk-dim, hover a blanco.

### Zyfit Score Ring (signature component)
Anillo SVG con `stroke-linecap: butt` (no `round`) y color sólido `plate-red` — deliberadamente sin gradiente ni `drop-shadow` de glow, para que el número lea como una lectura de instrumento, no un efecto decorativo.

## Do's and Don'ts

### Do:
- **Do** usar `plate-yellow` + texto oscuro para cualquier etiqueta de texto chico sobre relleno sólido — es el único par nativamente accesible.
- **Do** usar `plate-red-fill` (no `plate-red`) para cualquier botón/relleno con texto encima.
- **Do** mantener cada color de dato atado a su significado real (rojo=máxima intensidad, azul=secundario, amarillo=atención/etiqueta, verde=éxito/positivo) en vez de usarlo libremente por decoración.
- **Do** usar chalk-dim (no chalk-faint) para cualquier texto real que el usuario deba leer (placeholders incluidos).

### Don't:
- **Don't** reintroducir `backdrop-filter`, texto en gradiente, o fondos de aurora/blobs — son exactamente el mundo que este rediseño reemplazó.
- **Don't** usar easing con rebote/elástico (`cubic-bezier` con overshoot >1) — el detector de Impeccable lo marca como "tacky"; usar `--ease-mech` (ease-out-expo puro).
- **Don't** usar `plate-blue` con texto oscuro encima, ni `plate-red`/`plate-green` con texto chico de ningún color — no llegan a 4.5:1.
- **Don't** agregar un quinto color de "disco" que no corresponda a un peso IWF real.
