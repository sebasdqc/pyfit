Ejecuta un checkpoint del estado actual del proyecto PyFit. Sigue estos pasos exactamente:

1. Corre en paralelo:
   - `git status`
   - `git log --oneline -10`
   - `git diff HEAD --stat`

2. Lee el archivo de checkpoint anterior si existe: `/Users/sebastian/.claude/projects/-Users-sebastian-Documents-pyfit/memory/checkpoint_latest.md`

3. Con toda esa información, escribe un nuevo archivo en `/Users/sebastian/.claude/projects/-Users-sebastian-Documents-pyfit/memory/checkpoint_latest.md` con esta estructura exacta:

```
---
name: checkpoint-latest
description: Checkpoint más reciente del proyecto PyFit — estado, cambios y próximos pasos
metadata:
  type: project
---

## Fecha
[fecha actual]

## Rama y commits recientes
[últimos 5 commits con hash corto y mensaje]

## Estado del working tree
[archivos modificados, staged, untracked — resumido]

## Qué estábamos haciendo
[descripción de la tarea o feature en progreso — 2-4 oraciones]

## Archivos clave tocados en esta sesión
[lista de archivos modificados con una línea de qué cambió]

## Decisiones tomadas
[cualquier decisión de arquitectura, diseño o implementación relevante]

## Próximos pasos
[lista ordenada de qué hacer a continuación]

## Blockers o pendientes
[cualquier problema sin resolver, deuda técnica, o pregunta abierta]
```

4. Actualiza `/Users/sebastian/.claude/projects/-Users-sebastian-Documents-pyfit/memory/MEMORY.md` para que incluya una línea apuntando al checkpoint si no existe ya:
   `- [Checkpoint más reciente](checkpoint_latest.md) — estado, cambios en curso y próximos pasos del proyecto`

5. Confirma al usuario: "Checkpoint guardado. Puedes limpiar la terminal con /clear — en la próxima sesión leeré el checkpoint automáticamente."
