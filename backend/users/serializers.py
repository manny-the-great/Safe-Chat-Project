from rest_framework import serializers
from .models import User


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'avatar']


class UserProfileSerializer(serializers.ModelSerializer):
    is_followed_by_me = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'display_name', 'bio', 'avatar',
            'follower_count', 'following_count', 'is_admin',
            'created_at', 'is_followed_by_me'
        ]

    def get_is_followed_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.follower_set.filter(follower=request.user).exists()
        return False


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'display_name']

    def validate_username(self, val):
        if User.objects.filter(username__iexact=val).exists():
            raise serializers.ValidationError('Username already taken.')
        if not val.replace('_', '').replace('.', '').isalnum():
            raise serializers.ValidationError('Username can only contain letters, numbers, underscores, and dots.')
        return val.lower()

    def create(self, validated_data):
        display_name = validated_data.pop('display_name', validated_data['username'])
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            display_name=display_name,
        )
        return user
