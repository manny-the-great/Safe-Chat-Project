from django.db import models
from users.models import User


class ModerationLog(models.Model):
    STATUS_CHOICES = [
        ('rejected', 'Rejected'),
        ('overridden_approved', 'Overridden — Approved'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='violations')
    content = models.TextField()
    cleaned_text = models.TextField(blank=True)
    content_type = models.CharField(max_length=20, default='comment')  # post | comment
    toxicity_score = models.FloatField(default=1.0)
    rejection_reason = models.TextField()
    rejection_layer = models.CharField(max_length=50)
    matched_categories = models.JSONField(default=list)
    inference_ms = models.IntegerField(default=0)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='rejected')
    post_id = models.IntegerField(null=True, blank=True)
    violation_count = models.IntegerField(default=1)
    auto_banned = models.BooleanField(default=False)
    overridden_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='overrides'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'moderation_log'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} — {self.rejection_layer} — {self.created_at.date()}'
