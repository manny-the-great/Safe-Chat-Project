from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ('users', '0001_initial'),
    ]
    operations = [
        migrations.CreateModel(
            name='Post',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField(max_length=280)),
                ('like_count', models.IntegerField(default=0)),
                ('comment_count', models.IntegerField(default=0)),
                ('share_count', models.IntegerField(default=0)),
                ('is_published', models.BooleanField(default=True)),
                ('toxicity_score', models.FloatField(default=0.0)),
                ('classification_result', models.CharField(max_length=50, default='non-toxic')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='posts', to='users.user')),
            ],
            options={
                'db_table': 'posts',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Comment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField(max_length=280)),
                ('original_text', models.TextField(blank=True, default='')),
                ('like_count', models.IntegerField(default=0)),
                ('is_published', models.BooleanField(default=True)),
                ('toxicity_score', models.FloatField(default=0.0)),
                ('classification_result', models.CharField(max_length=50, default='non-toxic')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('author', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='comments', to='users.user')),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.CASCADE, related_name='replies', to='posts.comment')),
                ('post', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='comments', to='posts.post')),
            ],
            options={
                'db_table': 'comments',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PostLike',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('post', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='likes', to='posts.post')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, to='users.user')),
            ],
            options={
                'db_table': 'post_likes',
                'unique_together': {('user', 'post')},
            },
        ),
        migrations.CreateModel(
            name='PostShare',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('post', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='shares', to='posts.post')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, to='users.user')),
            ],
            options={
                'db_table': 'post_shares',
            },
        ),
        migrations.CreateModel(
            name='CommentLike',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('comment', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='likes', to='posts.comment')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, to='users.user')),
            ],
            options={
                'db_table': 'comment_likes',
                'unique_together': {('user', 'comment')},
            },
        ),
    ]
