from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('username', models.CharField(max_length=150, unique=True)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('display_name', models.CharField(max_length=100)),
                ('bio', models.TextField(blank=True, max_length=160)),
                ('avatar', models.CharField(blank=True, max_length=255)),
                ('is_admin', models.BooleanField(default=False)),
                ('is_staff', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('is_banned', models.BooleanField(default=False)),
                ('ban_reason', models.TextField(blank=True)),
                ('violation_count', models.IntegerField(default=0)),
                ('follower_count', models.IntegerField(default=0)),
                ('following_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'db_table': 'users',
            },
        ),
        migrations.CreateModel(
            name='Follow',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('follower', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='following_set', to='users.user')),
                ('following', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='follower_set', to='users.user')),
            ],
            options={
                'db_table': 'follows',
                'unique_together': {('follower', 'following')},
            },
        ),
    ]
