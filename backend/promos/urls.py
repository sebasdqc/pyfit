"""Rutas de códigos de descuento / solicitudes de suscripción. Montadas bajo
/api/promos/ en pyfit/urls.py."""

from django.urls import path

from . import views

urlpatterns = [
    path('validar/', views.validar_codigo),
    path('solicitudes/', views.crear_solicitud),
    path('solicitudes/mias/', views.mi_solicitud),
    path('gestion-suscripcion/', views.crear_solicitud_gestion),
]
