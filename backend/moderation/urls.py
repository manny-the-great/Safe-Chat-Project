from django.urls import path
from . import views

urlpatterns = [
    path('moderation/', views.moderation_log),
    path('moderation/<int:log_id>/override/', views.override_moderation),
    path('users/<int:user_id>/ban/', views.ban_user),
    path('stats/', views.admin_stats),
]
