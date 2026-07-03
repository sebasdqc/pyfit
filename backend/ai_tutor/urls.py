"""Rutas del Tutor de Academy. Montadas bajo /api/academy/tutor/ en pyfit/urls.py."""

from django.urls import path

from . import views

urlpatterns = [
    path('chat/', views.tutor_chat),
    path('conversations/', views.tutor_conversations),
    path('conversations/<int:conversation_id>/', views.tutor_conversation_detail),
    path('messages/<int:message_id>/feedback/', views.tutor_message_feedback),
]
