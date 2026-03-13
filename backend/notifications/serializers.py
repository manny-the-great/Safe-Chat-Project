from rest_framework import serializers
from .models import Notification


class ActorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    display_name = serializers.CharField()


class NotificationSerializer(serializers.ModelSerializer):
    actor = ActorSerializer(read_only=True)
    post_id = serializers.IntegerField(source='post.id', read_only=True, allow_null=True)
    comment_id = serializers.IntegerField(source='comment.id', read_only=True, allow_null=True)
    post_content = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'actor', 'notif_type', 'post_id', 'comment_id',
            'post_content', 'is_read', 'created_at',
        ]

    def get_post_content(self, obj):
        if obj.post:
            return obj.post.content[:80]
        return None
