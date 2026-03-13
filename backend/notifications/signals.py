"""
Django signals to auto-create Notification records when:
  - A PostLike is created
  - A CommentLike is created
  - A Comment is created (comment on a post / reply to a comment)
  - A Follow is created
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from posts.models import PostLike, CommentLike, Comment
from users.models import Follow
from .models import Notification


def _make(recipient, actor, notif_type, post=None, comment=None):
    """Create a notification only when the actor is not the recipient."""
    if recipient == actor:
        return
    Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notif_type=notif_type,
        post=post,
        comment=comment,
    )


@receiver(post_save, sender=PostLike)
def on_post_like(sender, instance, created, **kwargs):
    if created:
        _make(
            recipient=instance.post.author,
            actor=instance.user,
            notif_type='like_post',
            post=instance.post,
        )


@receiver(post_save, sender=CommentLike)
def on_comment_like(sender, instance, created, **kwargs):
    if created:
        _make(
            recipient=instance.comment.author,
            actor=instance.user,
            notif_type='like_comment',
            post=instance.comment.post,
            comment=instance.comment,
        )


@receiver(post_save, sender=Comment)
def on_comment(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.parent:
        # Reply to a comment
        _make(
            recipient=instance.parent.author,
            actor=instance.author,
            notif_type='reply',
            post=instance.post,
            comment=instance,
        )
    else:
        # Top-level comment on a post
        _make(
            recipient=instance.post.author,
            actor=instance.author,
            notif_type='comment',
            post=instance.post,
            comment=instance,
        )


@receiver(post_save, sender=Follow)
def on_follow(sender, instance, created, **kwargs):
    if created:
        _make(
            recipient=instance.following,
            actor=instance.follower,
            notif_type='follow',
        )
