"""Rutas de Zyfit Academy. Montadas bajo /api/academy/ en pyfit/urls.py."""

from django.urls import path

from . import (
    admin_users_views, anon_views, blog_views, community_views, library_views, subscription_views,
    support_views, views,
)

urlpatterns = [
    # Onboarding sin registro (visitante anónimo — probar antes de registrarse)
    path('anon/sesion/', anon_views.anon_session),  # POST crea / GET estado
    path('anon/catalogo/', anon_views.anon_catalogo),
    path('anon/cursos/<int:pk>/', anon_views.anon_curso_detail),
    path('anon/lecciones/<int:lesson_id>/', anon_views.anon_leccion_detail),
    path('anon/lecciones/<int:lesson_id>/completar/', anon_views.anon_leccion_completar),
    path('anon/sweep/', anon_views.anon_sweep),

    # Config pública del tenant (sin auth — llamada antes del login para el branding)
    path('tenant/config/', views.tenant_config),

    # Auth
    path('auth/login/', views.academy_login),
    path('me/', views.academy_me),

    # Escuelas (catálogo agrupado)
    path('schools/', views.schools_view),

    # Cursos (catálogo + autoría)
    path('courses/', views.courses_view),
    path('courses/<int:pk>/', views.course_detail),
    path('courses/<int:pk>/modules/', views.course_modules),
    path('courses/<int:pk>/modules/<int:module_id>/', views.module_detail),
    path('courses/<int:pk>/modules/<int:module_id>/lessons/', views.module_lessons),
    path('courses/<int:pk>/modules/<int:module_id>/lessons/<int:lesson_id>/', views.lesson_detail),

    # Quiz y preguntas (colgados de la lección / del quiz, scope resuelto en la vista)
    path('lessons/<int:lesson_id>/quiz/', views.lesson_quiz),
    path('quizzes/<int:quiz_id>/questions/', views.quiz_questions),
    path('quizzes/<int:quiz_id>/questions/<int:question_id>/', views.question_detail),

    # Inscripción
    path('courses/<int:pk>/enroll/', views.course_enroll),
    path('courses/<int:pk>/enrollments/', views.course_enrollments),

    # Racha de estudio (gamificación de retención)
    path('streak/', views.streak_view),
    # Barrido diario (cron externo con secreto compartido)
    path('streak/sweep/', views.streak_sweep),
    # Bootstrap manual de una cuenta admin de producto (mismo secreto compartido)
    path('admin-bootstrap/', views.bootstrap_admin),

    # Panel de administración de usuarios (crear/listar admin/profesor/estudiante) — SOLO admin
    path('admin/usuarios/', admin_users_views.admin_users_view),

    # Home del estudiante (progreso por escuela/curso, racha, insignias, continuar)
    path('dashboard/', views.dashboard_view),

    # Insignias de identidad (escuela completada, racha, inicio de recorrido)
    path('badges/', views.badges_view),

    # Biblioteca de recursos (documentos, plantillas, videos, guías, herramientas)
    path('library/', library_views.library_view),
    path('library/<int:pk>/favorito/', library_views.library_favorite_view),
    path('library/<int:pk>/abrir/', library_views.library_open_view),

    # Blog editorial (público, sin cuenta — autoría de instructor vía /mias/)
    path('blog/', blog_views.blog_list_view),
    path('blog/mias/', blog_views.blog_mine_view),
    path('blog/mias/<int:pk>/', blog_views.blog_manage_detail_view),
    path('blog/<slug:slug>/', blog_views.blog_detail_view),

    # Simulador de carga interna (sRPE → ACWR) — mismo motor que Zyfit Performance,
    # expuesto para práctica pedagógica de la escuela Analítica y Rendimiento Deportivo.
    path('simulador/carga/catalog/', views.simulador_carga_catalog),
    path('simulador/carga/compute/', views.simulador_carga_compute),

    # Simulador de planificación de sesión — escuela Ciencia del Entrenamiento.
    path('simulador/sesion/casos/', views.simulador_sesion_casos),
    path('simulador/sesion/evaluar/', views.simulador_sesion_evaluar),

    # Simulador de Return-to-Play — escuela Recuperación, Prevención y Wellness.
    path('simulador/prevencion/casos/', views.simulador_prevencion_casos),
    path('simulador/prevencion/evaluar/', views.simulador_prevencion_evaluar),

    # Aprendizaje (estudiante)
    path('enrollments/', views.my_enrollments),
    path('enrollments/<int:enrollment_id>/', views.enrollment_detail),
    path('enrollments/<int:enrollment_id>/lessons/<int:lesson_id>/complete/', views.lesson_complete),
    path('enrollments/<int:enrollment_id>/quizzes/<int:quiz_id>/attempt/', views.quiz_attempt),
    path('enrollments/<int:enrollment_id>/certificate/', views.enrollment_certificate),

    # Entregables del Programa Evolución 360° (hitos con revisión del instructor)
    path('enrollments/<int:enrollment_id>/lessons/<int:lesson_id>/submission/', views.lesson_submission),
    path('courses/<int:pk>/submissions/', views.course_submissions),
    path('submissions/<int:submission_id>/review/', views.submission_review),

    # Verificación pública de certificados (por código)
    path('certificates/verify/<str:codigo>/', views.certificate_verify),

    # Suscripción "Zyfit Academy Pro" (paquete separado de la suscripción del
    # entrenador principal — ver academy.access_service/academy.payments)
    path('subscription/', subscription_views.subscription_status),
    path('subscription/cancelar/', subscription_views.subscription_cancel),
    path('subscription/webhook/', subscription_views.subscription_webhook),

    # Comunidad (foro Q&A asíncrono entre alumnos — capa de engagement opcional,
    # ver academy.community_service para la moderación automática vía IA)
    path('community/posts/', community_views.community_posts_view),
    path('community/posts/<int:post_id>/', community_views.community_post_detail_view),
    path('community/posts/<int:post_id>/respuestas/', community_views.community_replies_view),
    path('community/respuestas/<int:reply_id>/votar/', community_views.community_vote_view),
    path('community/posts/<int:post_id>/mejor-respuesta/', community_views.community_best_answer_view),
    path('community/reportes/', community_views.community_report_view),

    # Soporte: FAQ estática + chat estudiante↔staff (REST + polling, sin
    # WebSockets — mismo criterio que el chat coach↔atleta de la app móvil).
    path('support/faq/', support_views.support_faq_view),
    path('support/chat/', support_views.support_chat_view),
    path('support/chat/no-leidos/', support_views.support_chat_unread_view),
    path('support/admin/hilos/', support_views.support_admin_hilos_view),
    path('support/admin/hilos/<int:student_id>/', support_views.support_admin_hilo_detail_view),
]
