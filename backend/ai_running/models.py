# La app ai_running no define modelos propios (espejo de ai_workout, cuyo models.py
# también está vacío). Los modelos de datos de running viven en runs/models.py
# (RunnerProfile, RunningPlan, PlannedRunSession), junto a RunSession/RunPoint.
# Aquí solo vive la INTELIGENCIA: training_science_running.py (ciencia pura),
# adaptive_engine_running.py (motor) y views.py (generación + endpoints).
