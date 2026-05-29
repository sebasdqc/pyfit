"""
URLs de dispositivos — se incluyen con prefijos distintos desde pyfit/urls.py:
  /api/integrations/garmin/        → garmin_urlpatterns
  /api/integrations/apple-health/  → apple_health_urlpatterns
"""
from django.urls import path
from devices import views

garmin_urlpatterns = [
    path('auth-url/', views.garmin_auth_url,    name='garmin_auth_url'),
    path('callback/', views.garmin_callback,    name='garmin_callback'),
    path('status/',   views.garmin_status,      name='garmin_status'),
    path('',          views.garmin_disconnect,  name='garmin_disconnect'),
]

apple_health_urlpatterns = [
    path('connect/', views.apple_health_connect,    name='apple_health_connect'),
    path('sync/',    views.apple_health_sync,        name='apple_health_sync'),
    path('status/',  views.apple_health_status,      name='apple_health_status'),
    path('',         views.apple_health_disconnect,  name='apple_health_disconnect'),
]
