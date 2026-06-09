# Zyfit Academy — Web (e-learning)

Web React (Vite + TypeScript) de **Zyfit Academy**, la plataforma e-learning de
Zyfit. Consume el backend Django existente (app `academy/`, API bajo
`/api/academy/`). Es una app **separada** del panel Performance (`performance-web/`)
y de la app móvil.

## Identidad visual — Manual de marca CONMEBOL

El look & feel sigue el *Official Brand Guidelines* de CONMEBOL:

- **Color:** navy oficial `#1a3e72` (`brand`) + azul flat `#0066b3` (`accent`) sobre
  fondos **blancos** (tema claro institucional). Los fondos oficiales de la marca
  son blanco y azul; el hero/login usa el gradiente navy.
- **Tipografía:** **Ubuntu** (Google Fonts), la tipografía oficial CONMEBOL para
  plataformas digitales. Cargada en `index.html`.
- **Tagline:** *"Cree en grande"*.
- **Emblema:** `src/components/Emblem.tsx` es un **PLACEHOLDER** (escudo + birrete en
  azules de marca) inspirado en el lenguaje CONMEBOL, **sin reproducir el logo
  oficial** (protegido). Se reemplazará por el asset definitivo en próximas
  iteraciones.

## Pantallas

| Ruta | Pantalla | Estado |
|------|----------|--------|
| `/login` | Acceso (hero navy + formulario) | **Funcional** (JWT) |
| `/catalogo` | Catálogo de cursos publicados + filtros | **Funcional** (API) |
| `/cursos/:id` | Detalle del curso (árbol módulos/lecciones) + inscripción | **Funcional** (API) |
| `/aprendizaje` | Mis matrículas + progreso | **Funcional** (API) |
| `/certificados` | Mis certificados + verificador por código | **Funcional** (API) |
| `/instructor` | Mis cursos + crear curso | **Funcional** (API) |
| `/perfil` | Datos de la cuenta (edición de nombre) | **Funcional** (API) |

Pendiente para próximas iteraciones (placeholders por ahora): reproductor de
lecciones (video/texto), rendir quizzes, editor de módulos/lecciones/preguntas,
portadas reales, diseño final del diploma.

## Arranque local

```bash
cd academy-web
cp .env.example .env      # apunta a tu backend (localhost:8000 por defecto)
npm install
npm run dev               # http://localhost:5181
```

> Recordatorio del proyecto: la **visualización** de cambios se hace siempre
> desplegando en DigitalOcean (push a `main`), no en localhost. `npm run build`
> sirve solo para detectar errores de compilación.

## Build

```bash
npm run build             # tsc --noEmit && vite build → dist/
```

## Deploy (DigitalOcean App Platform)

App **Static Site separada** (`zyfit-academy`), spec en `.do/app.yaml`:

```bash
doctl apps create --spec academy-web/.do/app.yaml   # primer deploy
# luego: deploy_on_push a main
```

Tras el primer deploy, añadir la URL `*.ondigitalocean.app` asignada al
`CORS_ALLOWED_ORIGINS` del backend (`sea-lion-app`).
