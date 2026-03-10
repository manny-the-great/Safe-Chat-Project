from rest_framework import serializers
from .models import Post, Comment
from users.serializers import UserMiniSerializer


class CommentSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    is_liked_by_me = serializers.SerializerMethodField()
    post_id = serializers.IntegerField(source='post.id', read_only=True)

    class Meta:
        model = Comment
        fields = [
            'id', 'post_id', 'author', 'content', 'parent_id',
            'like_count', 'is_liked_by_me', 'replies',
            'toxicity_score', 'created_at'
        ]

    def get_replies(self, obj):
        if obj.parent_id:  # Don't recurse on replies
            return []
        replies = obj.replies.filter(is_published=True).order_by('created_at')
        return CommentSerializer(replies, many=True, context=self.context).data

    def get_is_liked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False


class PostSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)
    is_liked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'content',
            'like_count', 'comment_count', 'share_count',
            'is_liked_by_me', 'toxicity_score',
            'classification_result', 'created_at'
        ]

    def get_is_liked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
