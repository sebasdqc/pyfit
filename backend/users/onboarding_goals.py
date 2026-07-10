"""Espejo backend de `mapObjetivoToGoal()` (mobile/app/(auth)/onboarding.tsx).

`Profile.goal` (GOAL_CHOICES) es el campo estructurado que usa el motor de
rutinas, pero se escribe "fire and forget" al terminar el onboarding
(POST /api/training-cycle/, sin reintento) y puede quedar vacío para
siempre si esa llamada falla. `Profile.objetivo` en cambio se guarda de
forma síncrona en el mismo request que completa el onboarding y es
requisito de `Profile.is_onboarding_complete` — más confiable como señal,
aunque es un CharField libre sin `choices=` a nivel de modelo/serializer.

Por eso el Zyfit Score usa esta tabla como fallback estricto: solo se
acepta un id exactamente igual a uno de los conocidos en el onboarding.
Cualquier otro valor (vacío, legado, basura de QA) se trata como no
resuelto — nunca fuzzy-match, a diferencia del matching de nombres de
ejercicio (ver workouts/exercise_matching.py), porque acá una
clasificación equivocada implica comparar al atleta con el sub-modelo
equivocado (rendimiento vs. salud general).
"""

# Debe mantenerse en sync con OBJETIVOS/mapObjetivoToGoal en
# mobile/app/(auth)/onboarding.tsx — si se agrega/cambia un id ahí, replicar acá.
OBJETIVO_ID_TO_GOAL = {
    'verse_mejor': 'perdida_grasa',
    'sentirse_fuerte': 'hipertrofia',
    'rendimiento': 'potencia',
    'energia': 'salud',
    'salud': 'salud',
    'mantener': 'hipertrofia',
}


def resolve_goal_from_objetivo(objetivo: str) -> str | None:
    """Mapea el id crudo de onboarding (Profile.objetivo) a un Profile.goal
    válido, solo si matchea EXACTO uno de los ids conocidos. None si no."""
    if not objetivo:
        return None
    return OBJETIVO_ID_TO_GOAL.get(objetivo.strip())
