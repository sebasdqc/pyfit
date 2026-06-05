"""Rutas del panel Zyfit Performance. Montadas bajo /api/performance/."""

from django.urls import path

from . import views

urlpatterns = [
    # Auth
    path('auth/login/', views.performance_login),
    path('me/', views.performance_me),

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
]
