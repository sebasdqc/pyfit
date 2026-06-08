from django.urls import path
from . import views

urlpatterns = [
    path('', views.RunSessionListCreateView.as_view(), name='run-list-create'),
    path('<int:pk>/', views.RunSessionDetailView.as_view(), name='run-detail'),
    path('<int:pk>/points/', views.add_run_points, name='run-add-points'),
    path('<int:pk>/feedback/', views.run_feedback, name='run-feedback'),
]
