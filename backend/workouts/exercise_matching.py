"""Resolución de nombre de ejercicio (texto libre) -> catálogo Exercise.

Usado al crear filas de SessionExercise (generación IA, regeneración de un
ejercicio, materialización de sesión armada por un coach) para poblar
SessionExercise.exercise. Reutiliza la misma heurística tolerante (match
exacto por nombre en minúsculas, luego substring en cualquier dirección) que
_actualizar_adaptation_profile() usa en workouts/views.py para un propósito
distinto (UserExerciseProfile) — esa copia queda intacta a propósito, no se
toca código que ya funciona.
"""
from .models import Exercise


def resolve_exercise_fk(nombre: str, exercises_map: dict[str, Exercise] | None = None) -> Exercise | None:
    """Busca un Exercise activo cuyo nombre matchee `nombre` (texto libre).

    `exercises_map` permite pasar un mapa {nombre.lower(): Exercise}
    pre-calculado para evitar reconsultar la BD en cada llamada dentro de un
    mismo loop (ver _persist_session_exercises/_materializar_session).
    Si no matchea nada, devuelve None — nunca bloquea la creación de la sesión.
    """
    if not nombre:
        return None
    nombre_lower = nombre.strip().lower()
    if not nombre_lower:
        return None

    if exercises_map is None:
        exercises_map = build_exercises_map()

    db_ex = exercises_map.get(nombre_lower)
    if db_ex is not None:
        return db_ex

    for key, ex in exercises_map.items():
        if nombre_lower in key or key in nombre_lower:
            return ex

    return None


def build_exercises_map() -> dict[str, Exercise]:
    """Mapa {nombre.lower(): Exercise} de todos los ejercicios activos."""
    return {ex.nombre.lower(): ex for ex in Exercise.objects.filter(activo=True)}
