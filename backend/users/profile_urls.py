from django.urls import path
from . import views

urlpatterns = [
    path('<str:username>/', views.get_profile),
    path('<str:username>/posts/', views.get_user_posts),
    path('<str:username>/follow/', views.follow_user),
]
