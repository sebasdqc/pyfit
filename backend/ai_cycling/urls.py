from django.urls import path

from . import views

# Montado bajo /api/cycling/ (ver pyfit/urls.py).
urlpatterns = [
    # Perfil de ciclista + baseline
    path('profile/',             views.cyclist_profile_view),
    path('baseline/estimate/',   views.estimate_baseline),
    path('baseline/test/',       views.start_test),
    # Plan, microciclo y generación de sesiones
    path('plan/',                       views.ride_plan_view),
    path('plan/microcycle/',            views.plan_microcycle),
    path('sessions/generate/',          views.generate_ride_session),
    path('sessions/today/',             views.ride_session_today),
    path('sessions/<int:pk>/complete/', views.complete_planned),
]
