"""Rutas del panel Zyfit Performance. Montadas bajo /api/performance/."""

from django.urls import path

from . import views

urlpatterns = [
    # Auth
    path('auth/login/', views.performance_login),
    path('me/', views.performance_me),

    # Módulo TEST: catálogo de tests y cálculo en vivo (no acotado a un centro)
    path('tests/catalog/', views.tests_catalog),
    path('tests/compute/', views.tests_compute),

    # Módulo PSICOLÓGICO: bienestar + cuestionarios (no acotado a un centro)
    path('psicologico/wellness/compute/', views.wellness_compute),
    path('psicologico/instruments/', views.instruments_catalog),
    path('psicologico/instruments/score/', views.instruments_score),

    # Centros
    path('centers/', views.centers_view),
    path('centers/<int:pk>/', views.center_detail),
    path('centers/<int:pk>/staff/', views.center_staff),
    path('centers/<int:pk>/athletes/', views.center_athletes),
    path('centers/<int:pk>/athletes/<int:athlete_pk>/', views.center_athlete_detail),

    # Módulos del centro (barra lateral del panel)
    path('centers/<int:pk>/rendimiento/', views.module_rendimiento),
    path('centers/<int:pk>/lesiones/', views.module_lesiones),
    path('centers/<int:pk>/test/', views.module_test),
    path('centers/<int:pk>/planificacion/', views.module_planificacion),
    path('centers/<int:pk>/psicologico/', views.module_psicologico),
    path('centers/<int:pk>/psicologico/wellness/', views.psicologico_wellness),

    # Simulador — pizarra táctica (jugadas con coordenadas normalizadas)
    path('centers/<int:pk>/simulador/', views.center_plays),
    path('centers/<int:pk>/simulador/<int:play_id>/', views.play_detail),

    # Calendario — temporadas, torneos, partidos y eventos del centro
    path('centers/<int:pk>/calendario/', views.center_events),
    path('centers/<int:pk>/calendario/<int:event_id>/', views.event_detail),

    # Planificación — periodización (macrociclo → mesociclos → microciclos)
    path('centers/<int:pk>/planificacion/<int:plan_id>/', views.plan_detail),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/', views.plan_mesociclos),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/', views.mesociclo_detail),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/microciclos/', views.meso_microciclos),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/microciclos/<int:micro_id>/', views.microciclo_detail),
]
