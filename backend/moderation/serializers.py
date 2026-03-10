from rest_framework import serializers
from .models import ModerationLog
from users.serializers import UserMiniSerializer


class ModerationLogSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(source='user', read_only=True)

    class Meta:
        model = ModerationLog
        fields = [
            'id', 'author', 'content', 'cleaned_text', 'content_type',
            'toxicity_score', 'rejection_reason', 'rejection_layer',
            'matched_categories', 'inference_ms', 'status',
            'violation_count', 'auto_banned', 'created_at',
        ]
