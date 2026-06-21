import os

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView
from pyfit.throttles import RefreshRateThrottle
from users import views as user_views
from users import admin_views as admin_api_views
from users import coach_views
from checkins import views as checkin_views
from workouts import views as workout_views
from workouts import exercise_views
from ai_workout import views as ai_views
from devices.urls import garmin_urlpatterns, apple_health_urlpatterns


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

# Home del admin rediseñada: un único KPI hero (Activation Rate a 7 días).
# Unfold respeta `index_template` en su `AdminSite.index()`, así que apuntamos a
# nuestra plantilla. Al sobrescribir el bloque `content`, desaparecen la lista de
# apps y el panel "Recent actions" del dashboard por defecto de Unfold.
admin.site.index_template = 'admin/zyfit_dashboard.html'


from pyfit.admin_metrics import zyfit_metrics_view
from pyfit.admin_security import otp_verify_view
from pyfit.admin_export import export_hub_view, export_users_csv, export_sessions_csv, export_feedback_csv
from pyfit.admin_broadcast import broadcast_view
from pyfit.admin_user360 import zyfit_user_detail_view

urlpatterns = [
    path('api/health/', health),
    # Vista de verificación 2FA — debe ir ANTES de admin.site.urls para que
    # el middleware pueda redirigir aquí sin caer en la barrera de OTP.
    path(ADMIN_URL_PATH + 'otp-verify/', otp_verify_view, name='zyfit_otp_verify'),
    # Métricas, exportación y broadcast van antes para vivir dentro del prefijo.
    path(ADMIN_URL_PATH + 'metrics/',           zyfit_metrics_view, name='zyfit_metrics'),
    path(ADMIN_URL_PATH + 'user/<int:user_id>/', zyfit_user_detail_view, name='zyfit_user_detail'),
    path(ADMIN_URL_PATH + 'export/',            export_hub_view,    name='zyfit_export_hub'),
    path(ADMIN_URL_PATH + 'export/users/',      export_users_csv,   name='zyfit_export_users'),
    path(ADMIN_URL_PATH + 'export/sessions/',   export_sessions_csv, name='zyfit_export_sessions'),
    path(ADMIN_URL_PATH + 'export/feedback/',   export_feedback_csv, name='zyfit_export_feedback'),
    path(ADMIN_URL_PATH + 'broadcast/',         broadcast_view,     name='zyfit_broadcast'),
    path(ADMIN_URL_PATH, admin.site.urls),

    # Auth
    path('api/auth/register/', user_views.register),
    path('api/auth/login/', user_views.login_view),
    path('api/auth/google/', user_views.google_login),
    path('api/auth/coach/login/', user_views.coach_login_view),
    path('api/auth/refresh/', TokenRefreshView.as_view(throttle_classes=[RefreshRateThrottle])),
    path('api/auth/logout/', user_views.logout_view),
    path('api/auth/account/', user_views.delete_account),
    path('api/auth/reset-password/', user_views.reset_password),
    path('api/auth/confirm-reset/', user_views.confirm_reset),

    # Profile
    path('api/profile/', user_views.profile_view),
    path('api/profile/avatar/', user_views.upload_avatar),

    # Locations
    path('api/locations/', user_views.locations_view),
    path('api/locations/<int:pk>/', user_views.location_detail_view),

    # Injuries
    path('api/injuries/', user_views.injuries_view),
    path('api/injuries/<int:pk>/', user_views.injury_detail_view),
    path('api/menstrual-cycle/', user_views.menstrual_cycle_view),

    # Check-ins
    path('api/checkins/today/', checkin_views.today_checkin),
    path('api/checkins/', checkin_views.create_checkin),

    # Sessions
    path('api/sessions/generate/', ai_views.generate_session),
    path('api/sessions/today/', workout_views.session_today),
    path('api/sessions/assigned-today/', workout_views.session_assigned_today),
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

    # Exercise catalog (coaches)
    path('api/exercises/catalog/', exercise_views.exercise_catalog),
    path('api/exercises/search/', exercise_views.exercise_search),
    path('api/exercises/create/', exercise_views.exercise_create),

    # Stats
    path('api/stats/reset-insight/', workout_views.reset_insight_cache),
    path('api/stats/dashboard/', workout_views.stats_dashboard),
    path('api/stats/profile/', workout_views.stats_profile),
    path('api/stats/rpe-semanal/', workout_views.stats_rpe_semanal),
    path('api/stats/consistencia-mensual/', workout_views.stats_consistencia_mensual),
    path('api/stats/cuerpo-contexto/', workout_views.stats_cuerpo_contexto),
    path('api/stats/ejercicios-top/', workout_views.stats_ejercicios_top),
    path('api/stats/radar/', workout_views.stats_radar),

    # Runs (Free Run + future Planned Run)
    path('api/runs/', include('runs.urls')),

    # Running inteligente (motor de generación de rutinas de carrera)
    path('api/running/', include('ai_running.urls')),

    # Training Cycle (periodization)
    path('api/training-cycle/', workout_views.training_cycle_view),
    path('api/training-cycle/advance/', workout_views.training_cycle_advance),

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

    # Integraciones de dispositivos
    path('api/integrations/garmin/',       include(garmin_urlpatterns)),
    path('api/integrations/apple-health/', include(apple_health_urlpatterns)),

    # Coach API (Portal de Coach — Fase 1: cartera; Fase 2: detalle + historial)
    path('api/coach/me/',        coach_views.coach_me),
    path('api/coach/billing/',   coach_views.coach_billing),
    path('api/coach/atletas/',   coach_views.coach_atletas),
    path('api/coach/gestion/',   coach_views.coach_cartera_gestion),
    path('api/coach/analytics/', coach_views.coach_analytics),
    path('api/coach/atletas/<int:pk>/',          coach_views.coach_atleta_detalle),
    path('api/coach/atletas/<int:pk>/sesiones/', coach_views.coach_atleta_sesiones),
    path('api/coach/atletas/<int:pk>/config/',    coach_views.coach_atleta_config),
    path('api/coach/atletas/<int:pk>/estado/',    coach_views.coach_atleta_estado),
    path('api/coach/atletas/<int:pk>/desvincular/', coach_views.coach_atleta_desvincular),
    path('api/coach/atletas/<int:pk>/directiva/', coach_views.coach_atleta_directiva),
    path('api/coach/atletas/<int:pk>/rutina/',    coach_views.coach_atleta_rutina),
    path('api/coach/atletas/<int:pk>/mensajes/',  coach_views.coach_atleta_mensajes),
    path('api/coach/vincular/',  coach_views.coach_vincular),
    path('api/coach/desvincular/', coach_views.coach_desvincular),
    path('api/coach/chat/unread/', coach_views.coach_chat_unread),
    path('api/coach/chat/',      coach_views.coach_chat),
    path('api/coach/mi-coach/',  coach_views.coach_mi_coach),

    # Zyfit Performance (vertical B2B — panel web de centros deportivos)
    path('api/performance/', include('performance.urls')),

    # Zyfit Academy (vertical e-learning — cursos en línea; web propia, próximamente)
    path('api/academy/', include('academy.urls')),

    # Admin API (Modo Admin en la app móvil — endpoints solo-staff)
    path('api/admin/me/',                       admin_api_views.admin_me),
    path('api/admin/users/',                    admin_api_views.admin_users_list),
    path('api/admin/coaches/',                  admin_api_views.admin_create_coach),
    path('api/admin/users/<int:pk>/set-coach/', admin_api_views.admin_set_coach),
    path('api/admin/impersonate/<int:pk>/',     admin_api_views.admin_impersonate),
    path('api/admin/stop-impersonate/',         admin_api_views.admin_stop_impersonate),
]
