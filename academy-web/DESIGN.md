---
name: Zyfit Academy — Retrato de Planos
description: Sistema visual de la LANDING PÚBLICA de Zyfit Academy — afiche de planos geométricos llenos (Ikko Tanaka) sobre papel washi, con el rojo de marca en el rol del bermellón. No aplica al producto autenticado.
colors:
  paper: "#f2e8d5"
  paper-2: "#e8dac0"
  ink: "#14110f"
  ink-soft: "#5a524a"
  vermilion: "#cc1f36"
  indigo: "#1e3a8a"
  gold: "#c8a24b"
  on-indigo-soft: "#b9c6e8"
  on-ink-soft: "#a79c90"
  on-vermilion-soft: "#fce8ea"
typography:
  display:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 6.4vw, 5.25rem)"
    fontWeight: 800
    fontStretch: "112%"
    lineHeight: 0.94
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Archivo"
    fontSize: "clamp(1.9rem, 3.4vw, 2.9rem)"
    fontWeight: 700
    fontStretch: "105%"
  body:
    fontFamily: "Archivo"
    fontSize: "1.0625rem"
    lineHeight: 1.62
    maxWidth: "62ch"
  label:
    fontFamily: "Archivo"
    fontSize: "0.6875rem"
    fontWeight: 600
    fontStretch: "88%"
    letterSpacing: "0.2em"
    textTransform: "uppercase"
rounded:
  all: "0"
components:
  button-primary:
    backgroundColor: "{colors.vermilion}"
    textColor: "#ffffff"
    rounded: "0"
    padding: "0 1.5rem"
    minHeight: "3.25rem"
---

# Design System: Zyfit Academy — Retrato de Planos

## Alcance — leer antes de aplicar nada de acá

Este sistema gobierna **solo la landing pública** (`src/pages/LandingPage.tsx`
+ `src/pages/landing.css` + `src/components/landing/*`). Todo vive bajo la clase
raíz `.zl` con variables propias `--zl-*`.

**No toca** los tokens globales de `index.css` (`--color-brand`, `--color-ink`,
`--color-surface`), ni `.za-card`, ni Tailwind. El producto autenticado, el
login, `/explorar` y el blog siguen en el sistema anterior (Inter, tarjetas
redondeadas con sombra, dark mode por `data-theme`) y **no deben migrarse a
este mundo sin una decisión explícita**. Los dos sistemas conviven a propósito.

## Overview

**Norte creativo: "Retrato de Planos".**

El afiche de Ikko Tanaka: una figura reconstruida con pocos planos geométricos
**llenos y sin contorno** sobre una grilla silenciosa. Quitar un plano desarma
la persona. Ese es el argumento literal de la página: cada una de las 7 escuelas
de especialización **es** un plano de la figura, así que "un profesional se
compone por partes" queda demostrado a la vista y no afirmado en un párrafo.

Elegido por el usuario el 2026-07-28 sobre la dirección que había asignado el
dado ("Pizarra de Análisis"), en un round de decisión con 3 opciones.

**Reemplaza** la identidad anterior de la landing (fondo Aurora WebGL, cards con
`BorderGlow` rojo, `StarBorder`, hero casi negro a 100dvh). Esos componentes
siguen existiendo porque `LoginPage`/`BlogPage` los usan — **no borrarlos**,
pero tampoco reintroducirlos en la landing.

## Colors

Estrategia: **paleta completa (4 roles nombrados)**, comprometida a escala de
página. El color toma **regiones enteras**, no acentos sueltos sobre un fondo
neutro.

- **Papel** `#f2e8d5` (y `#e8dac0` para alternar regiones): el fondo por
  defecto. La landing es CLARA — se lee de día, en una laptop, por alguien que
  está decidiendo si invertir en su formación.
- **Bermellón** `#cc1f36`: **es el rojo de marca de Academy, sin cambiarlo.**
  Acción primaria, cifras, la región de cierre entera, el plan destacado.
- **Índigo** `#1e3a8a` y **Oro** `#c8a24b`: los otros dos planos. Regiones
  completas y marcas de escuela.
- **Tinta** `#14110f`: región oscura ("Cómo funciona"), pie, y el fondo de toda
  figura.

Texto secundario **siempre teñido desde su fondo** (`--zl-on-indigo-soft`,
`--zl-on-ink-soft`, `--zl-on-vermilion-soft`), nunca gris neutro. Todos los
pares verificados ≥4.5:1.

## Typography

**Una sola familia: Archivo variable** (ejes `wdth` 85–120 + `wght` 400–800),
cargada en `index.html` solo para esta pantalla; el resto del producto sigue en
Inter. El **ancho** hace la jerarquía que en otros sistemas hacen tres familias:
112–118% expandida para lo monumental, 88–92% condensada para rótulos.

Escala: `.zl-display` → `.zl-title` → `.zl-subtitle` → `.zl-body` → `.zl-label`.

## Layout

Grilla de ancho completo con `--zl-max: 1360px` y `--zl-gutter` fluido. Las
regiones alternan color a sangre completa. La división es **un filete de 1px**
(`--zl-rule`), nunca una sombra ni un borde de tarjeta.

`.zl-head` ancla rótulo + título al borde izquierdo de la grilla, con el cuerpo
o la acción a la derecha alineados por la línea de base inferior.

## Elevation & Depth

**No hay sombras. No hay degradados. No hay blur. Radio 0 en todo.**
La profundidad viene de la superposición de planos llenos y del recorte a
sangre. Un único grano de papel (SVG `feTurbulence`, `mix-blend-mode: multiply`,
opacidad 0.32) fijo sobre toda la página.

## Components

- **Botón:** rectángulo recto, versalitas con tracking 0.16em. Primario =
  bermellón lleno; hover **invierte a tinta**, nunca oscurece.
- **Rótulo (`Rotulo`):** cuadro de color de 10px + versalitas. Aparece una vez
  por región y funciona como clave de color de la página.
- **Figura (`PlaneFigure`):** el componente firma. Lienzo 480×660, 8 planos, 7
  mapeados a escuelas. `activeSlug` enciende un plano y atenúa el resto;
  `revealCount` la arma paso a paso; `fit="bleed"` para el hero.
- **Ficha de curso (`PosterCourseCard`):** cantos vivos, sin sombra. Sin
  portada, la placa se resuelve como composición de planos (3 variantes ×
  espejo = 6 antes de repetir). **No reemplaza a `ui/CourseCard`**, que sigue
  sirviendo al catálogo autenticado.
- **Navegación:** barra sticky con filete inferior y una **última celda de color
  llena que sangra hasta el borde derecho** (la acción primaria). No es una
  píldora flotante.

## Motion

**Un solo momento autorizado en toda la página:** los planos de la figura del
hero entran escalonados (90ms) con salida exponencial, una vez. El estado final
es el de reposo, así que sin JS y con `prefers-reduced-motion` la figura ya está
completa. Todo lo demás son transiciones de color de 0.18–0.28s.

## Do's and Don'ts

### Do
- **Do** dejar que el color tome regiones enteras.
- **Do** dibujar cualquier ícono o motivo nuevo como plano lleno sin contorno.
- **Do** teñir el texto secundario desde el fondo sobre el que se apoya.

### Don't
- **Don't** agregar radio, sombra, degradado ni `backdrop-filter` bajo `.zl` —
  el mundo entero se apoya en que no existan.
- **Don't** reintroducir `Aurora`/`BorderGlow`/`StarBorder` en la landing.
- **Don't** extender `.zl` al producto autenticado sin decisión explícita.
- **Don't** cambiar el bermellón: es `--color-brand`, transversal a Sidebar,
  login y certificados.
