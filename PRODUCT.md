# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas de LatAm hispanohablante interesadas en entrenar fuerza y/o running con
un plan que se adapta a ellas. Llegan a esta landing (root `app/`, proyecto
Next.js "zyfit-landing" en Vercel) antes de que la app móvil de consumo esté
publicada, para sumarse a una lista de espera.

## Product Purpose

Zyfit es una app móvil de fitness con IA adaptativa (fuerza + running). Antes
de cada sesión el usuario hace un check-in diario (sueño, ánimo, tiempo
disponible, molestias); el motor de IA genera la rutina del día a partir de
perfil + historial + check-in; el usuario entrena y da feedback (peso, reps,
RPE, sensación); ese feedback ajusta la sesión siguiente. Esta landing existe
para explicar esa propuesta y capturar emails en una lista de espera — no
vende ni permite descargar la app todavía.

## Positioning

Una sola app unifica fuerza y running bajo un mismo motor adaptativo que
ajusta sesión a sesión según feedback real (no plantillas fijas). El Zyfit
Score resume cinco señales (consistencia, rendimiento, adherencia,
recuperación, momentum) en un número de 0 a 100. Coach opcional: quien
entrena solo puede hacerlo de forma completamente autónoma, y quien tiene
coach puede vincularlo vía el Portal de Coach.

## Operating Context

- La landing es un proyecto Next.js separado en la raíz del monorepo
  (`app/`), deploy en Vercel — no en DigitalOcean, y no comparte deploy con
  Zyfit Performance/Academy (esos sí están en DO).
- La app móvil de consumo (el producto que esta landing promociona) **aún no
  está publicada** en Play Store / App Store; se prueba solo con Expo
  dev-client y builds internas de EAS. La landing no debe implicar que ya se
  puede descargar.
- Backend compartido en Django (`sea-lion-app`), pero esta landing en sí no
  llama a ese backend: el formulario de waitlist (`WaitlistForm.tsx`) hoy
  solo maneja estado local de React y **no persiste el email en ningún
  lado** — brecha funcional conocida, fuera de alcance del trabajo de diseño
  salvo que se pida explícitamente conectarlo.
- Único idioma actual: español. Sin i18n en esta landing (a diferencia de
  Zyfit Academy, que sí tiene inglés).

## Capabilities and Constraints

- Sin testimonios, casos de uso o prensa reales — no inventar ninguno.
- Sin fecha de lanzamiento confirmada para stores; el copy debe seguir
  comunicando "etapa final de pruebas / anotate y avisamos" sin prometer
  fecha.
- El formulario de waitlist no está conectado a un backend (ver arriba):
  cualquier copy o estado de UI debe seguir siendo honesto sobre esto (no
  agregar analytics o confirmaciones que impliquen persistencia real).

## Brand Commitments

- Nombre del producto: **Zyfit**. Logo actual: `/logo-zyfit-blanco.png`.
  Contacto: `privacidad@zyfit.app`.
- Voz confirmada: **español latinoamericano neutro, tratamiento de "tú"**
  (no "vos" ni "vosotros"). Ya corregido en `app/page.tsx`, `Hero.tsx`,
  `WaitlistForm.tsx` y metadata de `layout.tsx` (2026-07-24).
- Identidad visual confirmada de esta landing (2026-07-25, tras probar y
  descartar una alternativa): **dark glassmorphism** — fondo casi negro con
  auroras azul/violeta/cian, superficies `.glass`/`.glass-strong` con
  `backdrop-filter`, texto en gradiente azul→violeta como énfasis. Se
  probó una identidad alternativa ("Barra Cargada", código de color de
  discos olímpicos, superficies mate sin glass) y el usuario pidió
  explícitamente revertirla: "prefiero los colores de la versión
  anterior... me gustaban las gradientes y el glass." Lo único de esa
  prueba que **sí** se mantuvo: la tipografía Big Shoulders Display
  (titulares/numerales) + Public Sans (cuerpo). Ver `DESIGN.md` para el
  sistema completo — no volver a proponer quitar glass/gradientes sin que
  el usuario lo pida de nuevo. El azul de esta landing es un accent propio
  de la app de consumo, no reutiliza ni reemplaza el azul de Zyfit
  Performance (`#4f8cff` es coincidencia de valor, no el mismo token/uso),
  el morado del Portal de Coach (`#7C5CFF`) ni el rojo de Zyfit Academy
  (`#cc1f36`).

## Evidence on Hand

Ninguna. No hay testimonios, datos de usuarios reales, capturas de la app
en producción (no publicada aún) ni prensa. El copy actual (pasos de "Cómo
funciona", features, FAQ) es la única fuente de verdad de producto
disponible; tratarlo como hechos del producto, no como marketing a
descartar.

## Product Principles

1. Adaptativo, no plantillas: cada sesión depende de la anterior + el
   check-in del día.
2. Un solo producto para fuerza y running — no dos apps separadas.
3. Coach es opcional, nunca obligatorio.
4. Privacidad como diferenciador explícito: sin venta de datos, sin
   publicidad dirigida.
5. Honestidad de etapa: es una lista de espera pre-lanzamiento, no una app
   descargable — el copy y el diseño no deben insinuar lo contrario.

## Accessibility & Inclusion

Sin requisito específico de producto más allá de lo ya implementado en
`globals.css` (soporte de `prefers-reduced-motion` para auroras, reveals y
marquee).
