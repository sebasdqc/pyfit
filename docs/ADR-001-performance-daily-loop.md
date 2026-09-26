# ADR-001: Performance Daily Loop y arquitectura de decisiones

- **Estado:** Aceptado; implementación incremental en curso
- **Fecha:** 2026-09-26
- **Decisores:** Producto, ingeniería y especialistas deportivos de Zyfit
- **Alcance:** Backend Django, Performance Web y canal móvil/web del atleta

## Contexto

Zyfit Performance ya modela centros, staff, atletas, carga, forma, lesiones, tests, bienestar, psicología, planificación, sesiones y calendario. Sin embargo, estas capacidades se consumen mayormente como módulos independientes.

El dashboard principal todavía depende de valores sintetizados para varias métricas, mientras que datos reales existen en endpoints separados. El asesor cruza datos reales, pero vive fuera del flujo diario y no persiste la decisión del profesional. Las sesiones se pueden generar y publicar, pero no poseen un ciclo completo de ejecución, participación y comparación entre carga prevista y real.

Si se continúa agregando pantallas o un chat generalista sobre esta base, aumentará la superficie del producto sin crear una fuente confiable de decisión. También se perderá la oportunidad de aprender de las correcciones del cuerpo técnico.

## Fuerzas de decisión

- La información afecta decisiones deportivas y puede incluir salud o psicología.
- Un centro nunca debe recibir datos inventados o de otro tenant.
- La disponibilidad debe funcionar con cobertura parcial.
- La app de consumo y Performance comparten usuarios, pero no el mismo propósito de tratamiento.
- Los cálculos deben poder auditarse y reproducirse.
- El proveedor LLM puede fallar o cambiar.
- La experiencia debe responder rápido durante el trabajo diario.
- El sistema actual debe migrarse sin reescritura total ni interrupción de módulos existentes.

## Decisión

Adoptaremos **Performance Daily Loop** como arquitectura de producto y aplicación.

El backend Django de `performance` seguirá siendo el propietario de los datos organizacionales. Se añadirá una capa de servicios de aplicación que componga vistas operativas a partir de fuentes canónicas y genere recomendaciones estructuradas. El frontend no volverá a calcular estados operativos a partir de datos sintéticos ni a decidir qué señal prevalece.

La arquitectura separa cuatro tipos de información:

1. **Registros fuente:** check-ins, cargas, lesiones, tests, eventos, planes y ejecuciones.
2. **Derivaciones deterministas:** cobertura, frescura, forma, carga y disponibilidad.
3. **Recomendaciones:** propuestas versionadas con evidencia y expiración.
4. **Decisiones humanas:** aceptación, modificación, descarte o delegación, inmutables y auditables.

## Flujo de referencia

```text
Atleta / staff / dispositivo
            │
            ▼
     Registros canónicos
            │
            ▼
 Normalización + reglas versionadas
            │
            ├──────────────► cobertura / frescura / disponibilidad
            │
            ▼
     Recomendación estructurada
            │
            ├──────────────► LLM: explicación, resumen o contenido
            │
            ▼
       Decisión humana
            │
            ▼
 Publicación / ejecución / resultado
            │
            └──────────────► siguiente ciclo
```

## Fuentes de verdad

| Concepto | Fuente canónica | No canónico |
|---|---|---|
| Identidad y pertenencia | `User`, `SportsCenter`, `CenterAthlete`, `CenterMembership` | overrides locales |
| Bienestar organizacional | `WellnessCheckin` con fuente/consentimiento | valores de `squadSynth` |
| Carga interna | participación/ejecución o `PerformanceMetric` manual identificado | cálculo aislado del navegador |
| Lesión/restricción | último `InjuryReport` válido y decisiones médicas | `CenterAthlete.estado` sin reconciliar |
| Plan | `TrainingPlan` → `Mesocycle` → `Microcycle` → `PlannedSession` | microciclo fijo de UI |
| Ejecución | nuevos `SessionExecution` y `SessionParticipation` | inferencia por fecha |
| Disponibilidad | servicio determinista versionado | score sintetizado o LLM |
| Recomendación | `PerformanceRecommendation` | texto transitorio del frontend |
| Decisión | `RecommendationDecision` | cambio sin autor/motivo |

## Límites de responsabilidad

### Backend

- valida tenant, rol, consentimiento y visibilidad;
- normaliza señales y resuelve precedencias;
- calcula cobertura, frescura y disponibilidad;
- genera recomendaciones idempotentes;
- persiste decisiones;
- publica contratos API adaptados al rol;
- registra auditoría y métricas.

### Frontend Performance

- presenta el briefing y la evidencia;
- permite revisar y ejecutar acciones autorizadas;
- mantiene filtros y estado efímero de interfaz;
- no inventa métricas ni combina reglas clínicas;
- no oculta como “sin resultados” un error de backend.

### Canal del atleta

- captura únicamente señales propias;
- muestra sesiones publicadas propias;
- soporta offline e idempotencia;
- permite revisar y revocar compartición;
- no accede al panel B2B ni a datos de compañeros.

### LLM

- redacta, resume o estructura contenido dentro de un esquema;
- recibe el contexto mínimo autorizado;
- no decide permisos, disponibilidad ni diagnósticos;
- no escribe cambios finales sin acción humana;
- su salida se valida, versiona y puede descartarse.

## Estrategia de composición

La primera implementación usará servicios síncronos de Django para construir “Hoy” a partir de consultas optimizadas y derivaciones puras. Las recomendaciones y decisiones se persisten. Celery se usa para tareas no críticas:

- recordatorios;
- precálculo/invalidez de snapshots;
- reportes programados;
- notificaciones;
- evaluación offline de IA.

No se requiere una arquitectura event-driven completa ni un microservicio de IA en esta fase. Si el volumen demuestra que el briefing síncrono no cumple el SLO, se añadirá un `DailyBriefSnapshot` invalidable sin cambiar el contrato del cliente.

## Política de disponibilidad

La salida mínima por atleta será:

```json
{
  "status": "ready | modified | review | unavailable | unknown",
  "reasons": [],
  "evidence": [],
  "coverage": {},
  "freshness": {},
  "rule_version": "string"
}
```

Reglas obligatorias:

- una lesión/restricción confirmada prevalece sobre señales de bienestar favorables;
- `unknown` nunca se transforma en `ready` por ausencia de información;
- datos vencidos no se tratan como actuales;
- señales psicológicas crudas no se filtran a roles no autorizados;
- el LLM no puede cambiar `status`;
- toda salida contiene versión y evidencia.

## Política de recomendaciones

- Una recomendación posee fecha de expiración.
- La misma regla y la misma evidencia producen una clave idempotente.
- Si cambia una fuente relevante, la recomendación se invalida o recalcula.
- Aceptar una recomendación no modifica silenciosamente otras entidades: ejecuta una acción explícita y auditable.
- Modificar conserva propuesta original y valor aplicado.
- Descartar exige motivo corto cuando la severidad es alta.
- Recomendaciones médicas son derivaciones de restricciones existentes, no diagnósticos nuevos.

## Política de datos demo

- Demo y producción son contextos separados.
- Un centro real jamás cae a datos demo ante error.
- Los fixtures demo no se exportan como informe real.
- No se migran valores de `squadSynth`, mocks u overrides locales a registros productivos.
- Los tests incluyen una aserción de que ninguna respuesta autenticada contiene identificadores de demo.

## API y compatibilidad

- Los endpoints existentes permanecen durante la migración.
- Las vistas compuestas se publican bajo `/api/performance/v2/`.
- El contrato v2 devuelve estados de dato explícitos.
- Las mutaciones móviles aceptan idempotency keys.
- Los recursos mutables incluyen versión para concurrencia optimista.
- La retirada de endpoints antiguos requiere telemetría de cero uso y una versión de transición.

## Alternativas consideradas

### A. Agregar todo en React

**Rechazada.** Duplicaría reglas, permisos y precedencias en clientes distintos; además hace difícil auditar por qué se produjo una decisión.

### B. Construir un chatbot generalista primero

**Rechazada.** Un chat no resuelve captura, integridad, permisos ni ejecución. Aumenta el riesgo de respuestas no trazables.

### C. Crear un microservicio de IA independiente

**Rechazada por ahora.** Añade operación distribuida sin necesidad demostrada. Se mantendrá un adapter de proveedor para permitir separación futura.

### D. Migrar inmediatamente a event sourcing completo

**Rechazada por ahora.** La trazabilidad se obtiene con registros fuente, recomendaciones y decisiones inmutables. Event sourcing completo elevaría el costo antes de validar el flujo.

### E. Entrenar un modelo propio desde el inicio

**Rechazada.** No existe todavía el volumen ni el dataset de decisiones humanas necesario. Primero se recopilarán correcciones y resultados bajo consentimiento.

## Consecuencias positivas

- La portada se convierte en una herramienta confiable.
- El producto aprende de decisiones reales, no solo de datos brutos.
- Las reglas se prueban independientemente del LLM.
- Se reduce el acoplamiento entre frontend y lógica sensible.
- El sistema puede degradarse sin inventar datos.
- La arquitectura permite sumar dispositivos o deportes mediante adaptadores.

## Costos y consecuencias negativas

- Se añaden modelos y estados que aumentan la complejidad del dominio.
- La integración con la app exige consentimiento y trabajo cross-product.
- Mantener endpoints antiguos y v2 implica un período de duplicidad.
- La trazabilidad aumenta almacenamiento y necesidades de soporte.
- Algunos dashboards actuales perderán densidad visual hasta disponer de datos reales.

Estos costos son aceptados porque la alternativa mantiene una experiencia vistosa pero no confiable.

## Requisitos de adopción

Este ADR se considera implementado cuando:

- el dashboard real no depende de `squadSynth`;
- existe un briefing compuesto en servidor;
- existen ejecución y participación de sesión;
- el atleta puede capturar señales propias con consentimiento;
- recomendaciones y decisiones se persisten;
- todos los estados incluyen evidencia y frescura;
- no hay fallback demo en contextos autenticados;
- los recorridos críticos tienen pruebas E2E;
- un centro piloto completa cuatro semanas usando el Daily Loop.

## Plan de reversión

- Los workflows nuevos de recomendación, decisión y ejecución se activan por el
  feature flag de centro `daily_loop_enabled`.
- Las garantías de integridad de Fase 1 no se revierten a datos sintéticos: ante
  un rollback, una fuente ausente vuelve a un estado vacío explícito.
- Las tablas nuevas son aditivas.
- Los endpoints existentes no se eliminan durante el piloto.
- Desactivar el flag devuelve el centro al panel anterior sin borrar capturas nuevas.
- Las cargas derivadas mantienen referencia a su origen para poder excluirlas si se detecta un error.
- Los cambios de regla conservan versión anterior para reconstrucción y auditoría.

## ADRs posteriores

- ADR-002: autenticación segura del panel web.
- ADR-003: consentimiento y compartición App ↔ Performance.
- ADR-004: estrategia de analítica y privacidad.
- ADR-005: integración de GPS/wearables y propiedad de datos.
- ADR-006: generación y almacenamiento de reportes.
