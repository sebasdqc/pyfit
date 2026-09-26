# Zyfit Performance — Plan maestro del rework

**Estado:** aprobado; Fases 0–1 en implementación

**Horizonte estimado:** 18–24 semanas con un equipo pequeño dedicado

**Documento relacionado:** [ADR-001 — Performance Daily Loop](./ADR-001-performance-daily-loop.md)
**Última actualización:** 2026-09-26

## 1. Resumen ejecutivo

Zyfit Performance dejará de organizarse principalmente como una colección de módulos y pasará a operar como un sistema diario de decisiones para el cuerpo técnico.

El nuevo producto se articula alrededor de un ciclo cerrado:

1. El atleta y el staff registran señales mínimas y confiables.
2. El backend normaliza y cruza disponibilidad, bienestar, carga, lesiones, planificación y calendario.
3. Performance construye un briefing diario trazable.
4. El cuerpo técnico acepta, modifica, delega o descarta recomendaciones.
5. La sesión se publica, ejecuta y registra.
6. Lo planificado se compara con lo ejecutado.
7. Las decisiones humanas y sus resultados alimentan la siguiente recomendación.

La prioridad no es añadir más calculadoras ni un chat abierto. La prioridad es conectar las capacidades existentes y convertirlas en un hábito operativo confiable.

## 2. Resultado de producto

### 2.1 Promesa principal

> Cada mañana, Zyfit Performance convierte los datos disponibles del plantel en un plan de acción revisable por el cuerpo técnico.

### 2.2 Cliente inicial recomendado

- Academia o club de fútbol/futsal con 25–150 atletas.
- Uno a cuatro equipos o categorías.
- Preparador físico como operador diario.
- Director técnico como comprador y consumidor de reportes.
- Fisioterapeuta, psicólogo y analista como colaboradores con permisos acotados.
- Atleta como proveedor de señales y receptor de sesiones, no como usuario del panel B2B completo.

### 2.3 Trabajo principal del usuario

En menos de cinco minutos, el preparador físico debe poder:

- comprobar la cobertura y frescura de los datos;
- detectar quién requiere atención;
- entender por qué se generó cada alerta;
- adaptar la sesión o crear una variante individual;
- publicar la sesión;
- registrar asistencia y carga real al finalizar.

### 2.4 North-star metric

**Atletas activos semanalmente que completan una sesión o intervención validada por su staff.**

Métricas complementarias:

- porcentaje de atletas con check-in diario;
- porcentaje de sesiones con carga planificada y real;
- días activos del staff por semana;
- tiempo mediano desde apertura de “Hoy” hasta sesión publicada;
- recomendaciones revisadas y resueltas;
- porcentaje de decisiones con motivo y responsable;
- reducción de carga manual y hojas de cálculo paralelas;
- retención semanal de centros y staff.

## 3. Diagnóstico del sistema actual

### 3.1 Activos que se conservan

- Django y PostgreSQL como núcleo transaccional.
- `SportsCenter`, membresías, roles y permisos por módulo.
- Plantilla y categorías.
- `PerformanceMetric` y cálculo de carga/forma.
- `WellnessCheckin` e instrumentos psicométricos.
- Lesiones, consentimiento de menores y protección de datos sensibles.
- Planificación macro/meso/micro y `PlannedSession`.
- Calendario y relación opcional sesión–evento.
- Generador de sesiones de equipo.
- Asesor determinista de planificación.
- Celery/Redis para trabajo asíncrono.
- Sentry y audit log como bases de observabilidad.
- Identidad visual navy/teal existente de Performance.

### 3.2 Brechas críticas

| Brecha | Consecuencia | Prioridad |
|---|---|---:|
| Dashboard y vistas de rendimiento usan métricas sintetizadas | El centro no puede confiar en la portada para decidir | P0 |
| Fallos de datos reales pueden terminar mostrando datos demo | Riesgo de exportar o interpretar información incorrecta | P0 |
| Captura de bienestar y sRPE depende demasiado del staff | No hay cobertura diaria suficiente para recomendaciones | P0 |
| El atleta no dispone de un flujo seguro de club | Los datos B2B no cierran el ciclo con la app de consumo | P0 |
| `PlannedSession` termina en “publicada” | No existe ejecución, asistencia ni comparación plan/real | P0 |
| Estado manual del roster y partes de lesión pueden divergir | Disponibilidad inconsistente | P0 |
| Asesor separado de los puntos de decisión | Baja adopción y recomendaciones fuera de contexto | P1 |
| Navegación centrada en módulos | Fragmenta el trabajo real del staff | P1 |
| No hay entidad persistida de recomendación/decisión | No se aprende de la intervención humana | P1 |
| GPS y rendimiento avanzado siguen siendo demostrativos | Amplitud comercial mayor que la capacidad real | P1 |
| Suite frontend limitada a pruebas tipo script | Riesgo alto de regresiones en un rework transversal | P1 |

## 4. Principios del rework

1. **Datos reales o estado vacío.** Una cuenta real nunca recibe datos sintéticos como sustituto.
2. **Explicación antes que score.** Toda recomendación expone señales, frescura, cobertura y regla aplicada.
3. **Humano al mando.** La IA propone; una persona autorizada decide y queda registrada.
4. **Captura mínima.** Cada interacción diaria del atleta debe completarse en menos de 30 segundos.
5. **Una sola verdad por concepto.** Carga, bienestar, lesión, sesión y disponibilidad tienen propietarios de dominio definidos.
6. **Privacidad por diseño.** El propósito, consentimiento, rol y visibilidad se validan en servidor.
7. **Fallo seguro.** Sin datos o con servicios degradados se reduce la automatización; nunca se inventa una certeza.
8. **IA estructurada.** Los cálculos y límites son deterministas; el LLM redacta, resume y propone contenido dentro de contratos validados.
9. **Flujos antes que módulos.** La interfaz se organiza por el trabajo que se realiza: hoy, plantel, planificación, evaluación e informes.
10. **Entrega incremental.** Cada fase debe producir un incremento usable y reversible.

## 5. Arquitectura de información objetivo

### 5.1 Navegación primaria

1. **Hoy** — briefing, cobertura, disponibilidad, decisiones y sesión del día.
2. **Plantel** — lista operativa y ficha 360° de cada atleta.
3. **Planificar** — calendario, periodización, sesiones y ejecución.
4. **Evaluar** — carga, forma, tests, bienestar y psicología según permisos.
5. **Informes** — reportes operativos, individuales e institucionales.
6. **Administración** — centro, categorías, staff, permisos, consentimientos e integraciones.

Lesiones y psicología se muestran dentro del flujo cuando el rol tiene permiso. El contenido sensible no se resume para roles no autorizados; se expone únicamente el estado operativo mínimo permitido, por ejemplo “requiere revisión médica”.

### 5.2 Superficie “Hoy”

Orden de lectura:

1. Contexto: fecha, equipo/categoría, próximo evento y hora de la sesión.
2. Salud de datos: cuántos atletas respondieron, qué fuentes faltan y cuándo se actualizaron.
3. Disponibilidad: listo, con ajuste, requiere revisión, no disponible y sin datos.
4. Cola de decisiones: atleta, motivo, evidencia, acción, responsable y vencimiento.
5. Sesión del día: objetivo, duración, RPE, variantes y estado de publicación.
6. Cierre post-sesión: asistencia, carga real, incidencias y diferencia plan/real.

### 5.3 Ficha 360°

- Cabecera: identidad, categoría, posición, estado operativo y permisos de datos.
- Resumen: disponibilidad, bienestar, carga, forma y restricciones.
- Línea de tiempo común: check-ins, tests, lesiones, sesiones, decisiones y eventos.
- Plan actual y próximos hitos.
- Historial de recomendaciones y respuesta del staff.
- Acciones rápidas permitidas por rol.

### 5.4 Estados obligatorios de interfaz

Todas las superficies deben diseñarse y probarse para:

- primer uso;
- sin plantilla;
- sin consentimiento;
- sin datos todavía;
- cobertura parcial;
- datos antiguos;
- carga;
- error recuperable;
- error de permisos;
- conflicto de edición;
- servicio de IA no disponible;
- guardado exitoso;
- operación parcial/offline en el canal del atleta;
- 1, 25, 50 y 150 atletas;
- escritorio, tablet y móvil.

## 6. Diseño de dominio y datos

Los nombres finales se confirmarán durante la implementación, pero el plan requiere estas capacidades.

### 6.1 Extender `SportsCenter`

- `timezone` IANA obligatoria para fechas y briefs diarios.
- configuración de días/horarios de check-in;
- configuración de notificaciones;
- política de compartición de datos del atleta;
- deporte y vocabulario operativo validados.

### 6.2 Extender `WellnessCheckin`

- fuente: atleta, staff, dispositivo o importación;
- `submitted_by` separado del atleta evaluado;
- fecha/hora de captura y zona horaria;
- estado de sincronización/origen;
- posibilidad de actualización idempotente del mismo día;
- reglas explícitas de visibilidad;
- registro de consentimiento aplicable.

Se conserva la restricción de un check-in por centro, atleta y fecha. La app de consumo no comparte automáticamente su check-in personal: el atleta debe aceptar el uso organizacional y el backend transforma únicamente los campos autorizados.

### 6.3 Ejecución de sesiones

Crear `SessionExecution`:

- referencia a `PlannedSession`;
- inicio y fin reales;
- estado: programada, publicada, en curso, ejecutada, parcial, cancelada;
- duración y RPE reales del equipo;
- notas e incidencias;
- autor del cierre.

Crear `SessionParticipation`:

- sesión y atleta;
- estado: convocado, presente, parcial, ausente, trabajo alternativo;
- minutos reales;
- RPE real;
- carga real calculada;
- variante aplicada;
- molestia o incidencia operativa;
- fuente y autor del registro.

La carga interna se deriva de participación y ejecución cuando existe. No se debe crear un segundo registro manual duplicado para la misma sesión sin una clave idempotente.

### 6.4 Recomendaciones y decisiones

Crear `PerformanceRecommendation`:

- centro, fecha y alcance: equipo, grupo, sesión o atleta;
- categoría: disponibilidad, carga, bienestar, lesión, planificación o datos faltantes;
- severidad y prioridad;
- título y explicación;
- evidencia estructurada con referencias a registros;
- versión de reglas/prompt;
- confianza y cobertura;
- acción sugerida;
- expiración;
- estado: nueva, vista, resuelta, expirada o invalidada.

Crear `RecommendationDecision`:

- recomendación;
- decisión: aceptar, modificar, descartar, delegar;
- payload aplicado;
- motivo;
- responsable;
- fecha/hora;
- resultado observado opcional.

No se sobrescribe una decisión. Las correcciones se registran como eventos nuevos para conservar trazabilidad.

### 6.5 Briefing diario

Crear un servicio de aplicación `build_daily_brief(center, group, date, user)` que:

- verifica permisos;
- resuelve roster y calendario;
- calcula cobertura y frescura;
- obtiene la última señal válida por atleta;
- cruza carga, forma, lesión, restricciones y planificación;
- genera disponibilidad explicable;
- crea o actualiza recomendaciones idempotentes;
- devuelve una vista adaptada al rol solicitante.

Se puede persistir un `DailyBriefSnapshot` versionado para auditoría y rendimiento, pero los registros fuente siguen siendo la verdad. El snapshot se invalida cuando cambia una fuente relevante.

### 6.6 Disponibilidad

Usar estados discretos, no un score opaco único:

- `ready` — sin señales relevantes y datos suficientes;
- `modified` — puede participar con ajuste;
- `review` — requiere decisión profesional;
- `unavailable` — restricción confirmada;
- `unknown` — cobertura insuficiente o datos antiguos.

Cada estado devuelve `reasons[]`, `evidence[]`, `freshness` y `coverage`. “Unknown” nunca se transforma en “ready”.

## 7. Contratos API propuestos

Mantener los endpoints existentes durante la migración y añadir vistas compuestas v2.

### 7.1 Staff

- `GET /api/performance/v2/centers/{id}/today/?date=&group=`
- `GET /api/performance/v2/centers/{id}/athletes/{athlete_id}/overview/`
- `GET /api/performance/v2/centers/{id}/recommendations/`
- `POST /api/performance/v2/centers/{id}/recommendations/{id}/decision/`
- `POST /api/performance/v2/centers/{id}/sessions/{id}/publish/`
- `POST /api/performance/v2/centers/{id}/sessions/{id}/start/`
- `POST /api/performance/v2/centers/{id}/sessions/{id}/close/`
- `PATCH /api/performance/v2/centers/{id}/sessions/{id}/participations/bulk/`
- `GET /api/performance/v2/centers/{id}/reports/weekly/`

### 7.2 Atleta

Estos endpoints validan identidad, vínculo con el centro, consentimiento y acceso únicamente a los datos propios:

- `GET /api/performance/athlete/centers/`
- `GET /api/performance/athlete/centers/{id}/today/`
- `PUT /api/performance/athlete/centers/{id}/daily-status/{date}/`
- `POST /api/performance/athlete/centers/{id}/sessions/{id}/feedback/`
- `GET /api/performance/athlete/centers/{id}/sharing-preferences/`
- `PATCH /api/performance/athlete/centers/{id}/sharing-preferences/`

### 7.3 Requisitos transversales

- Esquema OpenAPI versionado.
- Idempotency key en capturas móviles y cierres de sesión.
- Paginación y filtros server-side.
- Fechas ISO 8601 y timezone del centro.
- Errores con códigos estables y mensajes localizables.
- `ETag` o versión para evitar sobrescrituras concurrentes.
- Prohibido responder con datos demo desde endpoints reales.

## 8. Estrategia de IA

### 8.1 Jerarquía de decisión

1. Reglas médicas, permisos y restricciones explícitas.
2. Cálculos deterministas y versionados.
3. Reglas operativas configuradas por el centro.
4. LLM para estructurar contenido, explicar y resumir.
5. Aprobación humana antes de cualquier cambio con impacto deportivo.

### 8.2 Casos de uso autorizados

- briefing narrativo del día;
- explicación de señales y datos faltantes;
- propuesta de ajustes de volumen/intensidad dentro de límites;
- generación de contenido de sesión;
- variantes para restricciones conocidas;
- resumen semanal;
- borrador de reporte.

### 8.3 Casos de uso no autorizados

- diagnóstico médico o psicológico;
- predicción presentada como certeza;
- dar de alta una lesión;
- publicar o modificar sesiones automáticamente;
- revelar datos sensibles a un rol no autorizado;
- inventar resultados cuando falta información;
- usar datos de un centro para entrenar o responder a otro sin base legal y anonimización aprobada.

### 8.4 Evaluación

Crear un conjunto de casos dorados con:

- plantel sin datos;
- cobertura parcial;
- carga alta y bienestar normal;
- bienestar bajo y carga normal;
- lesión activa;
- señales contradictorias;
- cambio de última hora;
- datos antiguos;
- menores sin consentimiento;
- múltiples roles consultando el mismo caso.

Para cada versión de reglas o prompt medir:

- exactitud del estado operativo;
- presencia de evidencia;
- respeto de permisos;
- estabilidad del JSON;
- tasa de recomendaciones inválidas;
- divergencia frente a revisión de expertos;
- latencia y costo;
- aceptación/modificación por el staff.

## 9. Seguridad, privacidad y cumplimiento

### 9.1 Antes de pilotos externos

- Definir el responsable y encargado de tratamiento por tipo de cliente.
- Consentimiento explícito para compartir señales del atleta con el centro.
- Consentimiento de tutoría para menores y categorías sensibles.
- Permisos por centro, rol, módulo y campo.
- Registro de lectura/escritura de datos sensibles.
- Política de retención, exportación y borrado.
- Cifrado en tránsito y de secretos/tokens en reposo.
- Revisión de URLs firmadas y expiración de fotografías.
- Pruebas de aislamiento entre centros.
- Rate limiting en login, captura y generación de IA.
- Content Security Policy y endurecimiento de cabeceras.

### 9.2 Autenticación web

Abrir un ADR específico para migrar el JWT del panel desde `localStorage` hacia cookies seguras `httpOnly` o un BFF. Este cambio debe completarse antes de una expansión comercial amplia, aunque puede desplegarse detrás de feature flag durante el piloto controlado.

### 9.3 Privacidad del módulo psicológico

- Un director no recibe automáticamente respuestas psicométricas crudas.
- Roles no clínicos ven únicamente un estado operativo cuando la política lo permite.
- Exportaciones respetan el mismo filtrado del API, no solo ocultamiento visual.
- Logs y Sentry nunca contienen respuestas, notas clínicas, tokens o identificadores innecesarios.

## 10. Analítica y observabilidad

### 10.1 Eventos de producto

- `center_activated`
- `roster_imported`
- `athlete_invited`
- `daily_status_submitted`
- `daily_brief_viewed`
- `recommendation_reviewed`
- `recommendation_decided`
- `session_generated`
- `session_published`
- `session_closed`
- `weekly_report_generated`

Los eventos analíticos usan IDs internos seudonimizados y no incluyen notas, respuestas psicológicas ni diagnósticos.

### 10.2 Métricas técnicas

- latencia p50/p95 de “Hoy”;
- tasa de error por endpoint;
- cobertura de datos por centro;
- briefs/recomendaciones generados;
- fallos y reintentos de tareas Celery;
- latencia, tokens y error del proveedor LLM;
- sincronizaciones móviles pendientes;
- conflictos de versión;
- exportaciones y fallos de reporte.

### 10.3 Alertas operativas

- fuga o cruce de tenant: alerta crítica inmediata;
- reporte real degradado a demo: condición imposible y testada;
- tasa de error >2% en captura durante 10 minutos;
- generación IA >10% de error durante 15 minutos;
- cola Celery atrasada;
- caída sostenida de cobertura de check-ins en un piloto.

## 11. Estrategia de pruebas y calidad

### 11.1 Backend

- Unit tests para fórmulas, reglas y máquina de estados.
- Tests de permisos por rol, centro y dato sensible.
- Tests de idempotencia y concurrencia.
- Tests de timezone y cambios de fecha.
- Tests de migraciones con datos existentes.
- Tests de contratos API.
- Tests de aislamiento multi-tenant.
- Golden tests del motor de recomendaciones.
- Tests del generador con proveedor LLM simulado.

### 11.2 Frontend web

- Adoptar Vitest + React Testing Library para componentes y flujos.
- Adoptar Playwright para recorridos críticos.
- Tests de estados vacío, parcial, error, permisos y datos antiguos.
- Tests responsive en móvil, tablet y desktop.
- axe automatizado y revisión manual con teclado/lector de pantalla.
- Presupuesto de rendimiento para la portada y ficha 360°.

### 11.3 App/canal del atleta

- Cola offline e idempotencia.
- Reintentos sin duplicación.
- Recordatorios según timezone.
- Consentimiento y revocación.
- Pruebas en iOS/Android reales.
- Accesibilidad, tamaño de toque y finalización del check-in en menos de 30 segundos.

### 11.4 Recorridos E2E obligatorios

1. Crear centro → importar plantilla → invitar atleta.
2. Atleta acepta → comparte datos → completa check-in.
3. Staff abre Hoy → revisa señal → aplica variante.
4. Staff genera → revisa → publica sesión.
5. Atleta consulta sesión → envía feedback.
6. Staff cierra sesión → carga real se actualiza una sola vez.
7. Fisio registra lesión → disponibilidad cambia → el generador respeta restricción.
8. Psicólogo registra dato → un rol no autorizado no puede verlo ni exportarlo.
9. API de un módulo falla → la UI muestra degradación explícita, nunca demo.
10. Un usuario del centro A intenta acceder al centro B → respuesta 404/403 sin fuga.

## 12. Plan por fases

Las estimaciones presuponen un product lead, un backend engineer, un frontend engineer, un mobile/full-stack engineer y soporte compartido de diseño/QA. Con una sola persona, usar la secuencia como orden de entrega y recalibrar duración.

### Estado de implementación al 2026-09-26

Primer incremento de Fases 0–1 completado:

- ADR-001 aceptado y contrato de fuentes/permisos documentado;
- `SportsCenter.timezone` y `daily_loop_enabled` añadidos con migración;
- endpoint agregado `GET /api/performance/centers/:id/today/` con cobertura,
  frescura, cinco estados de disponibilidad, sesiones y próximo evento;
- detalle de bienestar, carga y lesión filtrado por permisos, manteniendo solo
  el mínimo operativo para roles no autorizados;
- dashboard sustituido por un briefing alimentado únicamente por datos reales;
- roster real desacoplado de `squadSynth` y overrides locales;
- fallbacks demo retirados del flujo autenticado y del generador de reportes;
- superficies GPS/rendimiento sin fuente persistida reemplazadas por estados
  explícitos de integración pendiente;
- zona horaria editable desde Ajustes;
- pruebas de aislamiento, permisos, cobertura, precedencia e inputs inválidos.

Pendiente para cerrar todos los gates de Fases 0–1:

- instrumentar eventos de analítica y paneles/alertas operativas en Sentry;
- preparar fixtures del piloto y acordar la línea base con un design partner;
- añadir pruebas E2E de navegador para los estados vacío, parcial, error y rol;
- estandarizar el indicador de antigüedad por fuente en el resto de módulos.

### Fase 0 — Alineación, instrumentación y contrato de verdad (1–2 semanas)

**Objetivo:** hacer explícita la arquitectura y medir la línea base.

Entregables:

- aprobar ADR-001;
- mapa de datos y propietarios de dominio;
- inventario de pantallas reales, simuladas y demo;
- eventos de analítica mínimos;
- feature flag por centro para el rework;
- fixtures de un equipo piloto realista;
- prototipo de baja fidelidad de Hoy y ficha 360°;
- acuerdo de métricas del piloto.

Gate de salida:

- cada dato mostrado en la propuesta tiene una fuente, permiso y estado de frescura definido;
- cliente piloto o design partner identificado;
- ninguna decisión abierta bloquea el modelo de datos de Fase 1.

### Fase 1 — Integridad y confianza (2–3 semanas)

**Objetivo:** eliminar cualquier posibilidad de confundir simulación con operación real.

Features:

- retirar `squadSynth` de cuentas reales;
- retirar fallbacks demo en reportes y módulos autenticados;
- componentes estandarizados de sin datos, datos antiguos y error;
- endpoint agregado de cobertura;
- conectar dashboard existente a bienestar, carga, lesiones y planificación reales;
- resolver estado manual vs. lesión con una política canónica;
- añadir timezone del centro;
- logging estructurado y alertas Sentry.

Gate de salida:

- cero datos sintéticos en un centro real;
- errores visibles y recuperables;
- todos los KPIs indican fuente y última actualización;
- pruebas de aislamiento y permisos en verde.

### Fase 2 — Captura del atleta y cierre de sesión (3–4 semanas)

**Objetivo:** crear el flujo de datos diario.

Features:

- invitación/reclamación de cuenta;
- consentimiento de compartición con el centro;
- check-in de club desde la app o web móvil;
- recordatorios configurables;
- feedback post-sesión;
- `SessionExecution` y `SessionParticipation`;
- asistencia y RPE masivos para staff;
- cola offline e idempotency keys;
- cobertura diaria y lista de no respondieron.

Gate de salida:

- ≥80% de atletas del equipo piloto completa datos durante cinco días de prueba interna;
- no existen duplicados al reintentar;
- el staff puede cerrar una sesión de 30 atletas en menos de tres minutos;
- consentimiento y revocación comprobados.

### Fase 3 — Hoy y motor de decisiones (3–4 semanas)

**Objetivo:** convertir señales en acciones trazables.

Features:

- servicio `build_daily_brief`;
- disponibilidad con cinco estados;
- cola priorizada de decisiones;
- evidencia, cobertura y frescura por recomendación;
- aceptar, modificar, descartar y delegar;
- responsable y vencimiento;
- deep links a ficha, sesión o lesión;
- resumen específico por rol;
- notificaciones únicamente accionables.

Gate de salida:

- el preparador resuelve el briefing en menos de cinco minutos;
- 100% de recomendaciones incluyen evidencia;
- ninguna recomendación cruza permisos;
- existe historial completo de decisiones.

### Fase 4 — Planificar → publicar → ejecutar → aprender (4–5 semanas)

**Objetivo:** cerrar el ciclo de entrenamiento.

Features:

- unificar calendario y planificación;
- semana y sesión del día reales en Hoy;
- constructor/revisor de sesión;
- variantes individuales vinculadas a restricciones;
- publicación a atletas;
- inicio y cierre de sesión;
- comparación carga objetivo/real;
- actualización automática de carga y forma;
- adaptación sugerida de la siguiente sesión;
- bloqueo de doble cómputo.

Gate de salida:

- un equipo completa una semana sin hojas de cálculo para planificación/carga;
- ≥90% de sesiones publicadas se cierran con asistencia y carga real;
- la siguiente recomendación refleja la ejecución previa.

### Fase 5 — Plantel 360°, evaluación e informes (3–4 semanas)

**Objetivo:** consolidar comprensión longitudinal y comunicación institucional.

Features:

- ficha 360° y línea de tiempo;
- captura masiva de tests;
- comparaciones con el propio historial;
- flujo return-to-play con responsables y hitos;
- informe semanal del staff;
- informe individual compartible con permisos;
- exportación server-side o verificada;
- trazabilidad desde cada frase del reporte a su fuente.

Gate de salida:

- un informe semanal se genera sin corrección manual de datos;
- datos psicológicos y médicos respetan permisos también en exportación;
- no existen discrepancias conocidas entre ficha, Hoy e informes.

### Fase 6 — Copiloto y evaluación de IA (3–4 semanas)

**Objetivo:** ampliar la asistencia sin perder control profesional.

Features:

- briefing narrativo;
- explicación contextual de recomendaciones;
- propuestas de ajuste;
- generación de sesiones con contrato JSON validado;
- resumen semanal;
- prompt/rule registry versionado;
- golden dataset y panel de evaluaciones;
- fallback determinista;
- registro de aceptación y edición humana.

Gate de salida:

- 100% de salidas estructuradas valida esquema;
- cero acciones automáticas sin aprobación;
- casos críticos del dataset dorado superados;
- costo y latencia dentro del presupuesto acordado.

### Fase 7 — Piloto, hardening y lanzamiento (3–4 semanas)

**Objetivo:** probar valor y preparar operación comercial.

Features:

- onboarding asistido del primer centro;
- importación CSV robusta;
- runbook de soporte e incidentes;
- backups y prueba de restauración;
- pentest/revisión de seguridad;
- SLOs y alertas;
- centro de ayuda y recorridos guiados;
- medición de adopción;
- contrato y paquete comercial del piloto;
- migración gradual del menú antiguo.

Gate de lanzamiento:

- cuatro semanas de uso estable;
- ≥70% de atletas con cobertura semanal;
- staff activo ≥4 días por semana;
- ≥90% de sesiones cerradas;
- cero incidentes de permisos o mezcla de tenant;
- flujo crítico E2E en verde;
- design partner confirma ahorro de tiempo y continuidad de uso.

## 13. Backlog priorizado por épica

| Épica | Prioridad | Dependencias | Resultado |
|---|---:|---|---|
| E0 Fuentes reales y estados de datos | P0 | Ninguna | Producto confiable |
| E1 Timezone, cobertura y frescura | P0 | E0 | Brief correcto por día |
| E2 Consentimiento y canal del atleta | P0 | E1 | Captura diaria |
| E3 Ejecución y participación | P0 | E1 | Plan/real cerrado |
| E4 Briefing “Hoy” | P0 | E0–E3 | Hábito del staff |
| E5 Recomendaciones y decisiones | P0 | E4 | Trazabilidad y aprendizaje |
| E6 Planificación integrada | P0 | E3–E5 | Adaptación diaria |
| E7 Ficha 360° | P1 | E0–E5 | Contexto longitudinal |
| E8 Evaluación masiva | P1 | E2, E7 | Menos carga manual |
| E9 Reportes confiables | P1 | E7 | Valor institucional |
| E10 Copiloto contextual | P1 | E4–E9 | Escala de asistencia |
| E11 Integraciones GPS/wearables | P2 | E1–E3 | Automatización de captura |
| E12 Benchmarks anonimizados | P3 | Volumen y base legal | Ventaja de datos |

## 14. Migración y compatibilidad

- Mantener rutas y endpoints antiguos durante al menos una versión estable.
- Introducir el nuevo menú mediante feature flag por centro.
- Migrar primero lectura, luego escritura.
- Backfill de timezone con confirmación del centro; no inferir silenciosamente si afecta fechas.
- Crear participaciones solamente para sesiones futuras; históricos siguen legibles sin inventar asistencia.
- Los registros manuales de carga existentes permanecen válidos.
- Cuando una ejecución genera carga, usar referencia de origen e idempotencia para evitar duplicados.
- No convertir datos sintéticos o overrides locales en datos reales.
- Instrumentar adopción antes de retirar cada ruta antigua.
- Publicar guía de cambios y ventana de rollback por fase.

## 15. Estrategia de rollout

1. Desarrollo local con fixtures y golden dataset.
2. Entorno de staging con datos sintéticos claramente aislados.
3. Dogfooding con un centro interno.
4. Design partner único con feature flag.
5. Segundo centro para validar que no se codificó el flujo del primero.
6. Cohorte de 3–5 centros.
7. Disponibilidad general solo después de seguridad, soporte y métricas.

Cada fase debe poder desactivarse por centro sin eliminar datos. Las migraciones destructivas se posponen hasta después de dos ciclos estables.

## 16. Equipo y responsabilidades

| Responsabilidad | Dueño sugerido |
|---|---|
| Priorización, research y piloto | Product lead/fundador |
| Dominio, APIs, permisos, migraciones | Backend engineer |
| Hoy, ficha, planificación y design system | Frontend engineer |
| Check-in, feedback, offline y push | Mobile/full-stack engineer |
| Reglas de carga y revisión metodológica | Preparador físico asesor |
| Lesiones y RTP | Fisioterapeuta/médico asesor |
| Psicología y visibilidad de datos | Psicólogo deportivo asesor |
| Test plan, E2E y release gates | QA compartido |
| Privacidad, consentimiento y contratos | Asesor legal local |

No se debe publicar una regla sensible únicamente porque “suena razonable”. Cada regla necesita dueño metodológico, fuente, versión, casos límite y fecha de revisión.

## 17. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Baja respuesta de atletas | Captura <30 s, recordatorios, feedback de cumplimiento y captura masiva |
| Demasiadas alertas | Priorización, expiración, agrupación y límites por rol |
| Confianza excesiva en un score | Estados explicables y evidencia visible |
| Staff continúa en Excel | Importación inicial, flujo más rápido y reportes que reemplacen su salida actual |
| Datos sensibles visibles de más | Permisos server-side y pruebas por campo/exportación |
| Recomendaciones erróneas | Reglas versionadas, aprobación humana y golden dataset |
| Dependencia del proveedor LLM | Contratos estructurados, fallback determinista y adapter de proveedor |
| Rework demasiado amplio | Gates por fase y prohibición de empezar P2 antes de cerrar P0/P1 |
| Complejidad multi-deporte | Fútbol/futsal primero; vocabulario configurable sin generalizar reglas prematuramente |
| Duplicidad con la app B2C | Consentimiento y adaptadores de señales; no compartir automáticamente |

## 18. Decisiones que requieren ADR adicional

1. Autenticación del panel: cookies `httpOnly`/BFF frente a JWT en almacenamiento local.
2. Modelo de consentimiento y compartición entre app de consumo y organización.
3. Proveedor y política de analítica de producto.
4. Estrategia de importación GPS y propiedad del dato externo.
5. Exportación de reportes: cliente, servidor o servicio dedicado.
6. Retención y anonimización para benchmarks agregados.

## 19. Definition of Done del rework

El rework no está terminado cuando las pantallas nuevas existen. Está terminado cuando:

- una organización puede activarse sin intervención técnica en datos;
- un atleta puede consentir y enviar señales de forma confiable;
- el dashboard usa exclusivamente información real o muestra ausencia explícita;
- el staff puede pasar de briefing a sesión publicada y cerrada;
- cada recomendación se explica y cada decisión se audita;
- permisos y exportaciones respetan privacidad y tenant;
- el producto funciona con datos parciales y servicios degradados;
- los recorridos críticos tienen pruebas E2E;
- existe observabilidad y runbook de incidentes;
- un piloto demuestra uso recurrente y ahorro operativo medible.

## 20. Primer bloque ejecutable

El primer incremento recomendado abarca Fases 0 y 1:

1. Aprobar ADR-001 y fuentes canónicas.
2. Añadir timezone y semántica de frescura.
3. Crear el endpoint de cobertura real.
4. Sustituir la portada sintética por una portada real mínima.
5. Eliminar fallbacks demo en entornos autenticados.
6. Añadir estados confiables de vacío/error/parcial.
7. Incorporar pruebas de permisos, tenant y no-demo.
8. Instrumentar `daily_brief_viewed` y cobertura.

Solo después debe comenzar la captura del atleta. Esto evita construir recomendaciones sobre una base cuya integridad todavía no está garantizada.
