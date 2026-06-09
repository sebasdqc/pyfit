"""Rutas de Zyfit Academy. Montadas bajo /api/academy/ en pyfit/urls.py."""

from django.urls import path

from . import views

urlpatterns = [
    # Auth
    path('auth/login/', views.academy_login),
    path('me/', views.academy_me),

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

    # Aprendizaje (estudiante)
    path('enrollments/', views.my_enrollments),
    path('enrollments/<int:enrollment_id>/', views.enrollment_detail),
    path('enrollments/<int:enrollment_id>/lessons/<int:lesson_id>/complete/', views.lesson_complete),
    path('enrollments/<int:enrollment_id>/quizzes/<int:quiz_id>/attempt/', views.quiz_attempt),
    path('enrollments/<int:enrollment_id>/certificate/', views.enrollment_certificate),

    # Verificación pública de certificados (por código)
    path('certificates/verify/<str:codigo>/', views.certificate_verify),
]
