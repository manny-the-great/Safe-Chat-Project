from django.urls import path
from . import views

urlpatterns = [
    path('<int:pk>/like/', views.like_comment),
    path('<int:pk>/', views.delete_comment),
]
