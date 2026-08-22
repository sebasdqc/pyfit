from django.urls import path
from . import views

urlpatterns = [
    path('', views.RideSessionListCreateView.as_view(), name='ride-list-create'),
    path('<int:pk>/', views.RideSessionDetailView.as_view(), name='ride-detail'),
    path('<int:pk>/feedback/', views.ride_feedback, name='ride-feedback'),
]
