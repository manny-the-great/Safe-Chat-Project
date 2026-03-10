from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from .models import User, Follow
from .serializers import RegisterSerializer, UserProfileSerializer
from posts.models import Post
from posts.serializers import PostSerializer


def get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    ser = RegisterSerializer(data=request.data)
    if ser.is_valid():
        user = ser.save()
        tokens = get_tokens(user)
        return Response({
            'token': tokens['access'],
            'refresh': tokens['refresh'],
            'user': {
                'id': user.id,
                'username': user.username,
                'display_name': user.display_name,
                'is_admin': user.is_admin,
            }
        }, status=status.HTTP_201_CREATED)
    return Response({'error': list(ser.errors.values())[0][0]}, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    from django.contrib.auth import authenticate
    username = request.data.get('username', '').lower()
    password = request.data.get('password', '')
    user = authenticate(username=username, password=password)
    if not user:
        return Response({'error': 'Invalid username or password.'}, status=401)
    if user.is_banned:
        return Response({'error': 'Your account has been suspended for violating community guidelines.'}, status=403)
    tokens = get_tokens(user)
    return Response({
        'token': tokens['access'],
        'refresh': tokens['refresh'],
        'user': {
            'id': user.id,
            'username': user.username,
            'display_name': user.display_name,
            'is_admin': user.is_admin,
        }
    })


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def my_profile(request):
    if request.method == 'GET':
        ser = UserProfileSerializer(request.user, context={'request': request})
        return Response(ser.data)
    # PATCH — update bio, display_name
    allowed = {k: v for k, v in request.data.items() if k in ['display_name', 'bio']}
    for k, v in allowed.items():
        setattr(request.user, k, v)
    request.user.save()
    ser = UserProfileSerializer(request.user, context={'request': request})
    return Response(ser.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request, username):
    user = get_object_or_404(User, username=username)
    ser = UserProfileSerializer(user, context={'request': request})
    return Response(ser.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_posts(request, username):
    user = get_object_or_404(User, username=username)
    posts = Post.objects.filter(author=user, is_published=True).order_by('-created_at')
    ser = PostSerializer(posts, many=True, context={'request': request})
    return Response({'results': ser.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def follow_user(request, username):
    target = get_object_or_404(User, username=username)
    if target == request.user:
        return Response({'error': 'Cannot follow yourself.'}, status=400)

    follow_obj = Follow.objects.filter(follower=request.user, following=target)
    if follow_obj.exists():
        follow_obj.delete()
        target.follower_count = max(0, target.follower_count - 1)
        request.user.following_count = max(0, request.user.following_count - 1)
        action = 'unfollowed'
    else:
        Follow.objects.create(follower=request.user, following=target)
        target.follower_count += 1
        request.user.following_count += 1
        action = 'followed'

    target.save()
    request.user.save()
    return Response({'action': action, 'follower_count': target.follower_count})
