from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ('users', '0001_initial'),
    ]
    operations = [
        migrations.CreateModel(
            name='ModerationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content_type', models.CharField(max_length=20)),
                ('content_id', models.IntegerField(blank=True, null=True)),
                ('text_preview', models.TextField()),
                ('toxicity_score', models.FloatField()),
                ('rejection_layer', models.CharField(max_length=50)),
                ('rejection_reason', models.TextField()),
                ('status', models.CharField(choices=[('rejected', 'Rejected'), ('overridden_approved', 'Overridden (Approved)')], default='rejected', max_length=25)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('overridden_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='overrides', to='users.user')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='moderation_logs', to='users.user')),
            ],
            options={
                'db_table': 'moderation_logs',
                'ordering': ['-created_at'],
            },
        ),
    ]
