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
  (no "vos" ni "vosotros"). El copy actual de `app/page.tsx` y
  `WaitlistForm.tsx` usa "vos" (voseo argentino, p. ej. "contás",
  "Sumate") — **corrección pendiente** hacia "tú" neutro en cualquier
  trabajo de copy que se haga sobre esta landing.
- Identidad de color: el CLAUDE.md raíz del ecosistema fija azul
  (`#4f8cff`) como identidad de **Zyfit Performance** (panel B2B), morado
  (`#7C5CFF`) para el Portal de Coach, rojo (`#cc1f36`) para Zyfit Academy,
  y 8 paletas seleccionables por el usuario para la app de consumo en sí.
  Esta landing usa hoy azul/violeta como accent — no hay una identidad de
  color propia confirmada para "la landing de la app de consumo" más allá
  de lo heredado; tratar como decisión abierta, no como compromiso de marca
  fijo.

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
