# Zyfit Performance — Integración de dashboards GPS

## Contexto de arquitectura

Zyfit Performance es una aplicación React web independiente que consume la API Django existente. No es parte del proyecto React Native de la app móvil. Comparte el mismo backend Django/DRF corriendo en Digital Ocean, pero es un proyecto de frontend separado con su propia carpeta, su propio build, y su propio despliegue.

Los cuatro dashboards GPS que se integran en esta instrucción son:

- `zyfit_01_match_day.html` — Monitoreo en tiempo real durante partido o sesión
- `zyfit_02_post_session.html` — Análisis completo post-sesión
- `zyfit_03_weekly_load.html` — Gestión de carga semanal y ACWR
- `zyfit_04_player_profile.html` — Perfil longitudinal individual

Estos archivos HTML son prototipos de referencia visual. Claude Code debe convertirlos en componentes React integrados a la arquitectura existente del proyecto Zyfit Performance, no copiarlos como páginas estáticas.

---

## Reglas que Claude Code debe respetar

Antes de escribir una sola línea de código, Claude Code debe leer la estructura de carpetas del proyecto Zyfit Performance para entender cómo están organizados los componentes, las rutas, el sistema de autenticación, y los llamados a la API. No debe asumir nombres de carpetas ni patrones de importación — debe inspeccionarlos.

Las siguientes restricciones son no negociables:

**No crear archivos fuera del proyecto Zyfit Performance.** Todo el código nuevo vive dentro de la carpeta del proyecto React web, no dentro del proyecto React Native.

**No tocar el backend Django hasta que se indique.** Esta instrucción cubre solo el frontend. Los endpoints de la API GPS se definirán en una instrucción separada.

**No instalar librerías sin verificar primero si ya existen en `package.json`.** Chart.js y Recharts no deben coexistir — usar la que ya esté instalada.

**No reemplazar el sistema de diseño existente.** Los dashboards HTML usan una paleta oscura propia (`#0d0f12`, `#131720`, etc.) y la fuente Inter. Claude Code debe verificar si Zyfit Performance tiene un sistema de tokens de color o variables CSS global antes de aplicar colores. Si existe, adaptar los dashboards a ese sistema. Si no existe, usar las variables CSS definidas en los HTMLs como punto de partida y centralizarlas en un archivo de tokens.

**No hardcodear datos.** Los datos simulados en los archivos HTML (`players`, `acwrData`, `seasonData`, etc.) son exclusivamente para referencia visual. En los componentes React, esos valores deben venir de props o de llamados a la API mediante hooks.

---

## Paso 1 — Leer la estructura del proyecto

Antes de crear cualquier archivo, Claude Code debe correr `ls` y leer los siguientes niveles del proyecto Zyfit Performance:

- La raíz del proyecto — para ver si usa Vite o Create React App, y cómo está organizado el `src/`
- La carpeta de rutas o páginas — para saber dónde viven las vistas principales
- La carpeta de componentes — para ver si hay componentes reutilizables existentes (cards, sidebar, tablas)
- El archivo de estilos global — para extraer la paleta y tipografía ya definida
- El archivo de configuración de la API — para entender cómo se hacen los llamados a Django (si usa axios, fetch, o React Query)

Solo después de leer esto debe proceder.

---

## Paso 2 — Crear la estructura de carpetas GPS

Dentro de `src/`, crear la siguiente estructura sin escribir contenido en los archivos todavía:

```
src/
└── features/
    └── gps/
        ├── components/
        │   ├── MatchDayDashboard/
        │   │   ├── index.jsx
        │   │   ├── PlayerRow.jsx
        │   │   ├── AlertsPanel.jsx
        │   │   └── LiveTimer.jsx
        │   ├── PostSessionDashboard/
        │   │   ├── index.jsx
        │   │   ├── SpeedZones.jsx
        │   │   ├── PositionLoad.jsx
        │   │   └── PlayerDetailTable.jsx
        │   ├── WeeklyLoadDashboard/
        │   │   ├── index.jsx
        │   │   ├── AcwrTable.jsx
        │   │   ├── AcwrZoneBar.jsx
        │   │   └── WeeklyChart.jsx
        │   └── PlayerProfile/
        │       ├── index.jsx
        │       ├── PlayerHeader.jsx
        │       ├── SeasonChart.jsx
        │       ├── RadarChart.jsx
        │       ├── BenchmarkList.jsx
        │       ├── HistoryChart.jsx
        │       └── ReturnToPlay.jsx
        ├── hooks/
        │   ├── useMatchSession.js
        │   ├── usePostSession.js
        │   ├── useWeeklyLoad.js
        │   └── usePlayerProfile.js
        ├── utils/
        │   ├── acwr.js
        │   ├── barColor.js
        │   └── formatters.js
        └── constants/
            └── zones.js
```

Esta estructura sigue el patrón de features que es estándar en proyectos React con cierta escala. Si el proyecto Zyfit Performance ya tiene una convención diferente (por ejemplo, todos los componentes en un solo `components/` flat), Claude Code debe adaptarse a esa convención en lugar de imponer la suya.

---

## Paso 3 — Centralizar tokens visuales

Revisar si el proyecto ya tiene un archivo de variables CSS globales o un tema centralizado (puede llamarse `theme.js`, `tokens.css`, `variables.css`, o similar).

Si existe, agregar las variables de color del dashboard GPS dentro de ese archivo existente, respetando la nomenclatura ya establecida. No crear un segundo archivo de variables.

Si no existe, crear `src/styles/gps-tokens.css` con el siguiente contenido como punto de partida:

```css
:root {
  --gps-bg:         #0d0f12;
  --gps-bg2:        #131720;
  --gps-bg3:        #1a2030;
  --gps-border:     rgba(255, 255, 255, 0.07);
  --gps-text:       #e8ecf4;
  --gps-text2:      #8b93a8;
  --gps-text3:      #545d72;
  --gps-green:      #00d68f;
  --gps-amber:      #ffb020;
  --gps-red:        #ff4d4d;
  --gps-blue:       #4d8ef7;
  --gps-purple:     #9b87f5;
}
```

Todos los componentes GPS deben referenciar estas variables, no colores hardcodeados en hex.

---

## Paso 4 — Implementar los hooks de datos

Antes de construir ningún componente visual, crear los cuatro hooks en `src/features/gps/hooks/`. Cada hook encapsula la lógica de llamado a la API para su dashboard.

Los hooks deben seguir el mismo patrón de llamados a la API que ya usa el resto del proyecto Zyfit Performance. Si el proyecto usa React Query, los hooks deben usar `useQuery`. Si usa axios directo con `useEffect`, replicar ese patrón. No mezclar patrones.

**`useMatchSession(sessionId)`** debe exponer: lista de jugadores con sus métricas en tiempo real, función para refrescar manualmente, y estado de carga/error. En la implementación inicial puede devolver los datos hardcodeados del HTML como fallback mientras el endpoint no existe — pero la estructura del hook debe estar preparada para recibir datos reales.

**`usePostSession(sessionId)`** debe exponer: métricas agregadas del equipo, distribución por zonas de velocidad, detalle individual de cada jugador, y comparativa con la sesión anterior.

**`useWeeklyLoad(teamId, weekNumber)`** debe exponer: carga aguda y crónica del equipo, ACWR individual de cada jugador, distribución de carga por día, y las 8 semanas de histórico para el gráfico.

**`usePlayerProfile(playerId)`** debe exponer: datos del perfil del jugador, métricas de temporada completa por cada tipo de métrica, datos del radar comparado con benchmark de posición, historial de carga por semana, y pasos del protocolo de return to play si aplica.

---

## Paso 5 — Implementar los componentes, dashboard por dashboard

Implementar en este orden: primero Player Profile, luego Weekly Load, luego Post-Session, y por último Match Day. El orden es de menor a mayor complejidad de estado reactivo — Player Profile es casi estático, Match Day requiere actualización periódica.

### Dashboard 4 — Player Profile

El componente raíz `PlayerProfile/index.jsx` recibe `playerId` como prop y usa `usePlayerProfile(playerId)` para obtener los datos.

La estructura visual del HTML de referencia (`zyfit_04_player_profile.html`) define la jerarquía de componentes: encabezado del jugador con avatar, métricas clave y tags; strip de resumen de temporada con cuatro cifras; fila con gráfico de temporada y benchmarks; fila con radar, historial de carga, y protocolo return to play.

El gráfico de temporada debe tener el toggle de métrica funcionando en React — al hacer clic en Player Load / Distancia / Vel. máx / Sprints, el gráfico actualiza sin recargar datos. Esto se maneja con `useState` local dentro del componente `SeasonChart`, no con el hook global.

El protocolo return to play solo debe renderizarse si el jugador tiene un protocolo activo en los datos. Si no tiene, esa sección no aparece.

### Dashboard 3 — Weekly Load

El componente raíz `WeeklyLoadDashboard/index.jsx` recibe `teamId` y `weekNumber` como props.

El indicador de zona ACWR (la barra con el needle) muestra el ACWR del equipo calculado en el cliente a partir de `(cargaAguda / cargaCronica)`. Este cálculo debe vivir en `src/features/gps/utils/acwr.js` como una función pura exportable, no inline en el componente.

La tabla de ACWR individual debe resaltar automáticamente las filas con ACWR mayor a 1.4 con fondo rojo suave y las mayores a 1.3 con fondo ámbar. La lógica de clasificación de riesgo también debe vivir en `acwr.js`.

### Dashboard 2 — Post-Session

El componente raíz `PostSessionDashboard/index.jsx` recibe `sessionId` como prop.

La sección de comparativa vs sesión anterior requiere que el hook traiga datos de dos sesiones: la actual y la inmediatamente anterior del mismo equipo. Esto puede ser una sola llamada al endpoint o dos llamadas en paralelo, según cómo se defina el endpoint Django más adelante.

Las pills de recomendaciones de recuperación en el HTML son texto estático. En la implementación React, estas recomendaciones deben venir de los datos de la API. Si el backend no las genera todavía, el hook puede devolver un array vacío y el componente simplemente no renderiza esa sección.

### Dashboard 1 — Match Day

Este es el componente más complejo porque requiere actualización periódica simulando datos en tiempo real.

El componente raíz `MatchDayDashboard/index.jsx` recibe `sessionId` como prop.

El componente `LiveTimer` es un reloj que corre localmente en el cliente usando `setInterval` — no depende de la API. Recibe el timestamp de inicio de la sesión como prop y calcula el tiempo transcurrido en el cliente.

La actualización de métricas de los jugadores debe hacerse con polling a la API cada 5 segundos usando el mecanismo que el proyecto ya tenga (React Query tiene `refetchInterval`, axios puede combinarse con `setInterval`). No implementar WebSockets en esta instrucción — el polling es suficiente para la primera versión.

La función `barColor` que determina el color de la barra de Player Load según el porcentaje debe extraerse a `src/features/gps/utils/barColor.js` como función pura exportable.

---

## Paso 6 — Agregar las rutas

Agregar cuatro rutas nuevas al sistema de rutas del proyecto Zyfit Performance. Claude Code debe revisar cómo están definidas las rutas existentes antes de escribir las nuevas — si el proyecto usa React Router v6, `TanStack Router`, o cualquier otra librería, las nuevas rutas deben seguir exactamente el mismo patrón.

Las rutas propuestas son:

- `/performance/match/:sessionId` → `MatchDayDashboard`
- `/performance/post-session/:sessionId` → `PostSessionDashboard`
- `/performance/weekly-load/:teamId` → `WeeklyLoadDashboard`
- `/performance/player/:playerId` → `PlayerProfile`

Todas estas rutas deben estar protegidas con el mismo guard de autenticación que protege el resto del panel. No debe ser posible acceder sin un token válido.

---

## Paso 7 — Conectar la navegación

Revisar el sidebar o la navegación principal del panel Zyfit Performance. Agregar una sección llamada "GPS Performance" o equivalente con acceso a los dashboards.

No rediseñar el sidebar. Solo agregar los ítems de navegación necesarios respetando el componente existente.

Si el sidebar ya tiene una sección de "Rendimiento" o "Monitoreo", los ítems GPS deben ir dentro de esa sección, no crear una nueva.

---

## Paso 8 — Verificación final

Antes de terminar, Claude Code debe verificar que:

- Los cuatro dashboards renderizan sin errores en consola con los datos de fallback hardcodeados
- El toggle de métrica en Player Profile funciona correctamente
- El timer en Match Day corre en tiempo real sin memory leaks (el `setInterval` debe limpiarse en el `cleanup` del `useEffect`)
- Las rutas están protegidas y redirigen al login si no hay sesión activa
- No hay imports de rutas absolutas que rompan en producción — usar aliases o rutas relativas según lo que ya use el proyecto

---

## Referencia de los archivos HTML

Los cuatro archivos HTML de referencia están disponibles localmente. Su función es exclusivamente visual — muestran la jerarquía de elementos, la paleta de colores, los tipos de gráficos usados (Chart.js con tipos `bar`, `line`, `doughnut`, `radar`), y la lógica de coloreado condicional por umbrales.

Claude Code no debe copiar el CSS de los HTML directamente a los componentes React. Debe leer la intención visual y traducirla al sistema de estilos que ya use el proyecto (CSS Modules, Tailwind, styled-components, o lo que corresponda).

Los datos simulados dentro de cada HTML (`const players = [...]`, `const acwrData = [...]`, etc.) son válidos como datos de fallback temporales mientras no existen los endpoints reales, pero deben vivir en el hook correspondiente, no dentro del componente.

---

## Lo que esta instrucción no cubre

Los siguientes puntos se abordarán en instrucciones separadas:

- Creación de los endpoints Django para datos GPS
- Integración con el hardware de sensores real
- Autenticación por rol dentro del panel (qué dashboards ve cada rol del staff)
- Exportación de reportes en PDF
- WebSockets para Match Day en tiempo real a escala de producción
