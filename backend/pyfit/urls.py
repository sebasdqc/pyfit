from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView
from users import views as user_views
from checkins import views as checkin_views
from workouts import views as workout_views
from ai_workout import views as ai_views


def health(request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('api/health/', health),
    path('admin/', admin.site.urls),

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

    # Competitions
    path('api/competitions/', workout_views.competitions),
    path('api/competitions/<int:pk>/', workout_views.competition_detail),
]
