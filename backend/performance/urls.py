"""Rutas del panel Zyfit Performance. Montadas bajo /api/performance/."""

from django.urls import path

from . import views

urlpatterns = [
    # Auth
    path('auth/login/', views.performance_login),
    path('me/', views.performance_me),
    # Wizard de bienvenida del primer inicio de sesión (guardado progresivo).
    path('onboarding/', views.performance_onboarding),

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
    path('centers/<int:pk>/staff/<int:membership_pk>/', views.center_staff_detail),
    # Categorías / cohortes (unidad de trabajo de las instituciones educativas)
    path('centers/<int:pk>/categorias/', views.center_categorias),
    path('centers/<int:pk>/categorias/<int:categoria_id>/', views.categoria_detail),

    path('centers/<int:pk>/athletes/', views.center_athletes),
    path('centers/<int:pk>/athletes/<int:athlete_pk>/', views.center_athlete_detail),
    # Protección de datos de menores: consentimiento de la tutoría y estado
    path('centers/<int:pk>/proteccion/', views.center_proteccion),
    path('centers/<int:pk>/athletes/<int:athlete_pk>/proteccion/', views.athlete_proteccion),
    path('centers/<int:pk>/athletes/<int:athlete_pk>/consentimientos/', views.athlete_consentimientos),
    path('centers/<int:pk>/athletes/<int:athlete_pk>/consentimientos/<int:consentimiento_id>/', views.consentimiento_detail),

    # Módulos del centro (barra lateral del panel)
    path('centers/<int:pk>/rendimiento/', views.module_rendimiento),
    # Carga interna (sRPE → ACWR). Reutiliza PerformanceMetric; gateado por Rendimiento.
    path('centers/<int:pk>/carga/', views.carga_view),
    path('centers/<int:pk>/carga/<int:record_id>/', views.carga_detail),
    # Forma (fitness-fatiga / TSB) — mismo dato de Carga interna, sin POST propio.
    path('centers/<int:pk>/forma/', views.forma_view),
    path('centers/<int:pk>/lesiones/', views.module_lesiones),
    path('centers/<int:pk>/lesiones/<int:record_id>/', views.lesiones_detail),
    path('centers/<int:pk>/test/', views.module_test),
    path('centers/<int:pk>/test/<int:record_id>/', views.test_detail),
    path('centers/<int:pk>/planificacion/', views.module_planificacion),
    path('centers/<int:pk>/psicologico/', views.module_psicologico),
    # `wellness/` antes que `<int:record_id>/` (el converter int no captura "wellness").
    path('centers/<int:pk>/psicologico/wellness/', views.psicologico_wellness),
    path('centers/<int:pk>/psicologico/<int:record_id>/', views.psicologico_detail),

    # Simulador — pizarra táctica (jugadas con coordenadas normalizadas)
    path('centers/<int:pk>/simulador/', views.center_plays),
    path('centers/<int:pk>/simulador/<int:play_id>/', views.play_detail),

    # Calendario — temporadas, torneos, partidos y eventos del centro
    path('centers/<int:pk>/calendario/', views.center_events),
    path('centers/<int:pk>/calendario/<int:event_id>/', views.event_detail),

    # Planificación — periodización (macrociclo → mesociclos → microciclos → sesiones)
    path('centers/<int:pk>/planificacion/<int:plan_id>/', views.plan_detail),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/', views.plan_mesociclos),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/', views.mesociclo_detail),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/microciclos/', views.meso_microciclos),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/microciclos/<int:micro_id>/', views.microciclo_detail),
    # Sesiones (días) del microciclo — granularidad para IA de equipo y el asesor.
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/microciclos/<int:micro_id>/sesiones/', views.micro_sesiones),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/microciclos/<int:micro_id>/sesiones/<int:sesion_id>/', views.sesion_detail),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/microciclos/<int:micro_id>/sesiones/<int:sesion_id>/generar/', views.sesion_generar),
    path('centers/<int:pk>/planificacion/<int:plan_id>/mesociclos/<int:meso_id>/microciclos/<int:micro_id>/advisor/', views.microciclo_advisor),
]
