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

    # Centros
    path('centers/', views.centers_view),
    path('centers/<int:pk>/', views.center_detail),
    path('centers/<int:pk>/staff/', views.center_staff),
    path('centers/<int:pk>/athletes/', views.center_athletes),

    # Módulos del centro (barra lateral del panel)
    path('centers/<int:pk>/rendimiento/', views.module_rendimiento),
    path('centers/<int:pk>/lesiones/', views.module_lesiones),
    path('centers/<int:pk>/test/', views.module_test),
    path('centers/<int:pk>/planificacion/', views.module_planificacion),
    path('centers/<int:pk>/psicologico/', views.module_psicologico),

    # Planificación — periodización (macrociclo → mesociclos → microciclos)
    path('centers/<int:pk>/planificacion/<int:plan_id>/', views.plan_detail),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/', views.plan_mesociclos),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/', views.mesociclo_detail),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/microciclos/', views.meso_microciclos),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/microciclos/<int:micro_id>/', views.microciclo_detail),
]
