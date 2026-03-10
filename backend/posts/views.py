from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Post, Comment, PostLike, PostShare, CommentLike
from .serializers import PostSerializer, CommentSerializer
from .moderation_service import classify_content, handle_rejection


def push_to_ws(event_type: str, data: dict):
    """Broadcast a real-time event to all connected feed clients."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'feed', {'type': event_type, 'data': data}
        )
    except Exception:
        pass  # WebSocket push is best-effort; don't fail the request


# ── POSTS ──────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def posts(request):
    if request.method == 'GET':
        qs = Post.objects.filter(is_published=True).select_related('author').order_by('-created_at')
        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)
        ser = PostSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(ser.data)

    # POST — create new post
    content = request.data.get('content', '').strip()
    if not content:
        return Response({'error': 'Content cannot be empty.'}, status=400)
    if len(content) > 280:
        return Response({'error': 'Post cannot exceed 280 characters.'}, status=400)
    if request.user.is_banned:
        return Response({'status': 'rejected', 'message': 'Your account has been suspended.'}, status=403)

    # ── CLASSIFY ──
    classification = classify_content(content, request.user)

    if classification['is_toxic']:
        handle_rejection(request.user, content, 'post', classification)
        return Response({
            'status': 'rejected',
            'message': 'Your post violates SafeChat community standards. Please use respectful language.',
            'rejection_layer': classification.get('rejection_layer'),
            'toxicity_score': round(classification.get('toxicity_score', 1.0), 4),
            'violations': request.user.violation_count,
            'auto_banned': request.user.is_banned,
        }, status=400)

    # ── SAFE → SAVE ──
    post = Post.objects.create(
        author=request.user,
        content=content,
        toxicity_score=classification.get('toxicity_score', 0.0),
        classification_result=classification.get('label', 'non-toxic'),
        is_published=True,
    )
    ser = PostSerializer(post, context={'request': request})
    push_to_ws('new_post', ser.data)
    return Response({'status': 'approved', 'post': ser.data}, status=201)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def post_detail(request, pk):
    post = get_object_or_404(Post, pk=pk, is_published=True)
    if request.method == 'GET':
        ser = PostSerializer(post, context={'request': request})
        return Response(ser.data)
    if request.method == 'DELETE':
        if post.author != request.user and not request.user.is_admin:
            return Response({'error': 'Not allowed.'}, status=403)
        post.is_published = False
        post.save()
        return Response(status=204)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_post(request, pk):
    post = get_object_or_404(Post, pk=pk, is_published=True)
    like, created = PostLike.objects.get_or_create(user=request.user, post=post)
    if not created:
        like.delete()
        post.like_count = max(0, post.like_count - 1)
        action = 'unliked'
    else:
        post.like_count += 1
        action = 'liked'
    post.save(update_fields=['like_count'])
    push_to_ws('post_liked', {'post_id': post.id, 'like_count': post.like_count})
    return Response({'action': action, 'like_count': post.like_count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def share_post(request, pk):
    post = get_object_or_404(Post, pk=pk, is_published=True)
    PostShare.objects.create(user=request.user, post=post)
    post.share_count += 1
    post.save(update_fields=['share_count'])
    return Response({'share_count': post.share_count})


# ── COMMENTS ───────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def comments(request, post_pk):
    post = get_object_or_404(Post, pk=post_pk, is_published=True)

    if request.method == 'GET':
        qs = Comment.objects.filter(post=post, parent=None, is_published=True).select_related('author')
        ser = CommentSerializer(qs, many=True, context={'request': request})
        return Response({'results': ser.data})

    content = request.data.get('content', '').strip()
    parent_id = request.data.get('parent_id')
    if not content:
        return Response({'error': 'Content cannot be empty.'}, status=400)
    if request.user.is_banned:
        return Response({'status': 'rejected', 'message': 'Your account has been suspended.'}, status=403)

    # ── CLASSIFY ──
    classification = classify_content(content, request.user)

    if classification['is_toxic']:
        handle_rejection(request.user, content, 'comment', classification, post_id=post.id)
        return Response({
            'status': 'rejected',
            'message': 'Your comment violates SafeChat community standards. Please use respectful language.',
            'rejection_layer': classification.get('rejection_layer'),
            'toxicity_score': round(classification.get('toxicity_score', 1.0), 4),
            'violations': request.user.violation_count,
            'auto_banned': request.user.is_banned,
        }, status=400)

    # ── SAFE → SAVE ──
    parent = None
    if parent_id:
        parent = get_object_or_404(Comment, pk=parent_id, post=post)

    comment = Comment.objects.create(
        post=post, author=request.user, content=content, parent=parent,
        toxicity_score=classification.get('toxicity_score', 0.0),
        classification_result=classification.get('label', 'non-toxic'),
        is_published=True,
    )
    post.comment_count += 1
    post.save(update_fields=['comment_count'])

    ser = CommentSerializer(comment, context={'request': request})
    push_to_ws('new_comment', ser.data)
    return Response({'status': 'approved', 'comment': ser.data}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_comment(request, pk):
    comment = get_object_or_404(Comment, pk=pk, is_published=True)
    like, created = CommentLike.objects.get_or_create(user=request.user, comment=comment)
    if not created:
        like.delete()
        comment.like_count = max(0, comment.like_count - 1)
        action = 'unliked'
    else:
        comment.like_count += 1
        action = 'liked'
    comment.save(update_fields=['like_count'])
    return Response({'action': action, 'like_count': comment.like_count})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comment(request, pk):
    comment = get_object_or_404(Comment, pk=pk)
    if comment.author != request.user and not request.user.is_admin:
        return Response({'error': 'Not allowed.'}, status=403)
    comment.is_published = False
    comment.save()
    return Response(status=204)
