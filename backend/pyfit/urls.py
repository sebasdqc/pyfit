import os

from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView
from users import views as user_views
from users import admin_views as admin_api_views
from checkins import views as checkin_views
from workouts import views as workout_views
from ai_workout import views as ai_views


def health(request):
    return JsonResponse({'status': 'ok'})


# Admin lives at a configurable path so production can hide it behind an obscure
# URL that bots won't probe. Default keeps local dev predictable but already
# avoids the `/admin/` path that every credential-stuffer hits first.
ADMIN_URL_PATH = os.environ.get('ADMIN_URL_PATH', 'zyfit-admin').strip('/') + '/'

# Branding for the admin site — surfaces in the page header and tab title.
admin.site.site_header = 'Zyfit Control'
admin.site.site_title  = 'Zyfit Control'
admin.site.index_title = 'Panel de administración'


from pyfit.admin_metrics import zyfit_metrics_view
from pyfit.admin_security import otp_verify_view

urlpatterns = [
    path('api/health/', health),
    # Vista de verificación 2FA — debe ir ANTES de admin.site.urls para que
    # el middleware pueda redirigir aquí sin caer en la barrera de OTP.
    path(ADMIN_URL_PATH + 'otp-verify/', otp_verify_view, name='zyfit_otp_verify'),
    # Métricas también van antes para vivir dentro del prefijo del admin.
    path(ADMIN_URL_PATH + 'metrics/', zyfit_metrics_view, name='zyfit_metrics'),
    path(ADMIN_URL_PATH, admin.site.urls),

    # Auth
    path('api/auth/register/', user_views.register),
    path('api/auth/login/', user_views.login_view),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/logout/', user_views.logout_view),
    path('api/auth/reset-password/', user_views.reset_password),
    path('api/auth/confirm-reset/', user_views.confirm_reset),

    # Profile
    path('api/profile/', user_views.profile_view),

    # Locations
    path('api/locations/', user_views.locations_view),
    path('api/locations/<int:pk>/', user_views.location_detail_view),

    # Injuries
    path('api/injuries/', user_views.injuries_view),
    path('api/injuries/<int:pk>/', user_views.injury_detail_view),

    # Check-ins
    path('api/checkins/today/', checkin_views.today_checkin),
    path('api/checkins/', checkin_views.create_checkin),

    # Sessions
    path('api/sessions/generate/', ai_views.generate_session),
    path('api/sessions/', workout_views.session_list),
    path('api/sessions/<int:pk>/', workout_views.session_detail),
    path('api/sessions/<int:pk>/feedback/', workout_views.session_feedback),
    path('api/sessions/<int:pk>/resumen/', workout_views.session_resumen),
    path('api/sessions/<int:pk>/logro/', workout_views.session_logro),
    path('api/sessions/<int:pk>/sustituir/', workout_views.session_sustituir),
    path('api/sessions/<int:pk>/iniciar/',   workout_views.session_iniciar),
    path('api/sessions/<int:pk>/ajustar/',   ai_views.session_ajustar),
    path('api/sessions/<int:pk>/series-log/', workout_views.save_series_log),

    # AI extras
    path('api/ejercicio-demo/', ai_views.ejercicio_demo),
    path('api/ejercicios/regenerar/', ai_views.regenerar_ejercicio),

    # Stats
    path('api/stats/dashboard/', workout_views.stats_dashboard),
    path('api/stats/full/', workout_views.stats_full),
    path('api/stats/profile/', workout_views.stats_profile),
    path('api/stats/rpe-semanal/', workout_views.stats_rpe_semanal),
    path('api/stats/consistencia-mensual/', workout_views.stats_consistencia_mensual),
    path('api/stats/cuerpo-contexto/', workout_views.stats_cuerpo_contexto),
    path('api/stats/ejercicios-top/', workout_views.stats_ejercicios_top),
    path('api/stats/radar/', workout_views.stats_radar),

    # Calendar events
    path('api/eventos/',           workout_views.calendar_eventos),
    path('api/eventos/<int:pk>/',  workout_views.calendar_evento_delete),

    # Notifications
    path('api/notificaciones/',              user_views.notifications_list),
    path('api/notificaciones/<int:pk>/leer/', user_views.notification_leer),
    path('api/notificaciones/preferencias/', user_views.notification_prefs_view),

    # Competitions
    path('api/competitions/', workout_views.competitions),
    path('api/competitions/<int:pk>/', workout_views.competition_detail),

    # Admin API (Modo Admin en la app móvil — endpoints solo-staff)
    path('api/admin/me/',                       admin_api_views.admin_me),
    path('api/admin/users/',                    admin_api_views.admin_users_list),
    path('api/admin/impersonate/<int:pk>/',     admin_api_views.admin_impersonate),
    path('api/admin/stop-impersonate/',         admin_api_views.admin_stop_impersonate),
]
