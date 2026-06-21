from users.models import User
import os

if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123', is_admin=True)
    print("Admin user created successfully!")
else:
    print("Admin user already exists.")
