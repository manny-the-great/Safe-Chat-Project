import os
import django

# Set up django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safechat_project.settings')
django.setup()

from users.models import User

try:
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@example.com', 'admin123', is_admin=True)
        print("SUCCESS: Admin user created successfully!")
    else:
        print("SUCCESS: Admin user already exists.")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"ERROR: {repr(e)}")
