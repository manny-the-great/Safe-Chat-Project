from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import Notification
from .serializers import NotificationSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_list(request):
    """Return the logged-in user's notifications, newest first."""
    qs = (
        Notification.objects
        .filter(recipient=request.user)
        .select_related('actor', 'post', 'comment')
        .order_by('-created_at')
    )
    paginator = PageNumberPagination()
    paginator.page_size = 30
    page = paginator.paginate_queryset(qs, request)
    ser = NotificationSerializer(page, many=True)
    return paginator.get_paginated_response(ser.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """Mark all of the logged-in user's notifications as read."""
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_read(request, pk):
    """Mark a single notification as read."""
    Notification.objects.filter(pk=pk, recipient=request.user).update(is_read=True)
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """Quick unread badge count."""
    count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return Response({'unread': count})
