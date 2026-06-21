from django.urls import path

from . import views

# Montado bajo /api/running/ (ver pyfit/urls.py).
urlpatterns = [
    # F1 — perfil de corredor + baseline
    path('profile/',             views.runner_profile_view),
    path('baseline/estimate/',   views.estimate_baseline),
    path('baseline/time-trial/', views.start_time_trial),
    # F3 — plan, microciclo y generación de sesiones
    path('plan/',                       views.running_plan_view),
    path('plan/microcycle/',            views.plan_microcycle),
    path('sessions/generate/',          views.generate_run_session),
    path('sessions/today/',             views.run_session_today),
    path('sessions/<int:pk>/complete/', views.complete_planned),
]
