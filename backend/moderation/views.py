from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from .models import ModerationLog
from .serializers import ModerationLogSerializer
from users.models import User


class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and (request.user.is_admin or request.user.is_staff)


@api_view(['GET'])
@permission_classes([IsAdmin])
def moderation_log(request):
    status_filter = request.query_params.get('status', 'all')
    qs = ModerationLog.objects.select_related('user').order_by('-created_at')
    if status_filter != 'all':
        qs = qs.filter(status=status_filter)

    paginator = PageNumberPagination()
    paginator.page_size = 20
    page = paginator.paginate_queryset(qs, request)
    ser = ModerationLogSerializer(page, many=True)
    return paginator.get_paginated_response(ser.data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def override_moderation(request, log_id):
    entry = get_object_or_404(ModerationLog, pk=log_id)
    action = request.data.get('action')
    if action == 'approve':
        entry.status = 'overridden_approved'
        entry.overridden_by = request.user
        entry.save()
        return Response({'status': 'overridden_approved'})
    return Response({'error': 'Invalid action.'}, status=400)


@api_view(['POST'])
@permission_classes([IsAdmin])
def ban_user(request, user_id):
    user = get_object_or_404(User, pk=user_id)
    reason = request.data.get('reason', 'Manually banned by admin')
    user.is_banned = True
    user.ban_reason = reason
    user.save(update_fields=['is_banned', 'ban_reason'])
    return Response({'banned': True, 'username': user.username})


@api_view(['POST'])
@permission_classes([IsAdmin])
def unban_user(request, user_id):
    user = get_object_or_404(User, pk=user_id)
    user.is_banned = False
    user.ban_reason = ''
    user.violation_count = 0
    user.save(update_fields=['is_banned', 'ban_reason', 'violation_count'])
    return Response({'unbanned': True, 'username': user.username})


@api_view(['GET'])
@permission_classes([IsAdmin])
def top_offenders(request):
    """Return the top 10 users by violation count with recent rejection details."""
    from django.db.models import Max
    users = (
        User.objects.filter(violation_count__gt=0)
        .order_by('-violation_count')[:10]
    )
    result = []
    for u in users:
        last_log = ModerationLog.objects.filter(user=u).order_by('-created_at').first()
        result.append({
            'id': u.id,
            'username': u.username,
            'display_name': u.display_name,
            'violation_count': u.violation_count,
            'is_banned': u.is_banned,
            'last_violation': {
                'reason': last_log.rejection_reason if last_log else None,
                'layer': last_log.rejection_layer if last_log else None,
                'content': last_log.content[:80] if last_log else None,
                'at': last_log.created_at.isoformat() if last_log else None,
            },
        })
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_stats(request):
    from posts.models import Post, Comment
    from django.utils import timezone
    from datetime import timedelta

    today = timezone.now().date()
    yesterday = today - timedelta(days=1)

    total_posts = Post.objects.filter(is_published=True).count()
    total_comments = Comment.objects.filter(is_published=True).count()
    total_users = User.objects.filter(is_active=True).count()
    banned_users = User.objects.filter(is_banned=True).count()
    active_today = User.objects.filter(last_login__date=today).count()

    log_qs = ModerationLog.objects.all()
    total_blocked = log_qs.filter(status='rejected').count()

    # By layer — keys match classifier.py rejection_layer values exactly
    layer_counts = {
        'layer1': log_qs.filter(rejection_layer='LAYER_1_PROFANITY').count(),
        'layer2': log_qs.filter(rejection_layer='LAYER_2_THREAT').count(),
        'layer3': log_qs.filter(rejection_layer='LAYER_3_ML_MODEL').count(),
        'layer4': log_qs.filter(rejection_layer='LAYER_4_SENTIMENT').count(),
    }

    # Most common flagged terms across recent rejections
    from django.db.models import Count as DCount
    common_terms_qs = (
        ModerationLog.objects
        .filter(status='rejected')
        .values('matched_categories')
        .annotate(count=DCount('id'))
        .order_by('-count')[:10]
    )

    total_content = total_posts + total_comments + total_blocked
    toxicity_rate = round((total_blocked / total_content * 100), 1) if total_content > 0 else 0

    return Response({
        'total_posts': total_posts,
        'total_comments': total_comments,
        'total_users': total_users,
        'banned_users': banned_users,
        'active_today': active_today,
        'total_blocked': total_blocked,
        'toxicity_rate': toxicity_rate,
        'blocked_by_layer': layer_counts,
    })
