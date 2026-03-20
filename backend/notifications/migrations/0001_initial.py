from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ('users', '0001_initial'),
    ]
    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('like', 'Like'), ('comment', 'Comment'), ('follow', 'Follow'), ('reply', 'Reply')], max_length=20)),
                ('target_id', models.IntegerField(blank=True, null=True)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='actions', to='users.user')),
                ('recipient', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='notifications', to='users.user')),
            ],
            options={
                'db_table': 'notifications',
                'ordering': ['-created_at'],
            },
        ),
    ]
