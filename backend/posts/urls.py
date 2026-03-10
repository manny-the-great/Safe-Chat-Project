from django.urls import path
from . import views

urlpatterns = [
    path('', views.posts),
    path('<int:pk>/', views.post_detail),
    path('<int:pk>/like/', views.like_post),
    path('<int:pk>/share/', views.share_post),
    path('<int:post_pk>/comments/', views.comments),
]
