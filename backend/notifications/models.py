from django.db import models
from users.models import User
from posts.models import Post, Comment


class Notification(models.Model):
    TYPE_CHOICES = [
        ('like_post',    'Liked your post'),
        ('like_comment', 'Liked your comment'),
        ('comment',      'Commented on your post'),
        ('reply',        'Replied to your comment'),
        ('follow',       'Started following you'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    actor     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='actions')
    notif_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    post      = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True)
    comment   = models.ForeignKey(Comment, on_delete=models.CASCADE, null=True, blank=True)
    is_read   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.actor} → {self.recipient} [{self.notif_type}]'
