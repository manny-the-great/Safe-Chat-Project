import os
import django
from pymongo import MongoClient
from django.contrib.auth.hashers import make_password
import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safechat_project.settings')
django.setup()

client = MongoClient("mongodb+srv://leunammejohnson17_db_user:SafeChat2026@cluster0.c8uyt9f.mongodb.net/safechat_db?retryWrites=true&w=majority")
db = client.safechat_db

existing = db.users.find_one()
print("Sample user to check ID format:", existing)

password_hash = make_password('admin123')

user_doc = {
    "password": password_hash,
    "last_login": None,
    "is_superuser": True,
    "username": "admin",
    "first_name": "",
    "last_name": "",
    "email": "admin@example.com",
    "is_staff": True,
    "is_active": True,
    "date_joined": datetime.datetime.utcnow(),
    "display_name": "admin",
    "bio": "",
    "avatar": "",
    "is_admin": True,
    "is_banned": False,
    "ban_reason": "",
    "violation_count": 0,
    "follower_count": 0,
    "following_count": 0,
    "created_at": datetime.datetime.utcnow(),
}

if not db.users.find_one({"username": "admin"}):
    # Just insert it, MongoDB will create an ObjectId
    # but let's see if we need an integer ID if existing user has one
    if existing and isinstance(existing.get('_id'), int):
        user_doc['_id'] = existing['_id'] + 1000  # just a hack to give it an int ID
    elif existing and 'id' in existing and isinstance(existing.get('id'), int):
        user_doc['id'] = existing['id'] + 1000
    
    db.users.insert_one(user_doc)
    print("SUCCESS: Admin user created via PyMongo!")
else:
    # Let's update the password of existing admin
    db.users.update_one({"username": "admin"}, {"$set": {"password": password_hash, "is_admin": True, "is_staff": True, "is_superuser": True}})
    print("SUCCESS: Admin user password reset to 'admin123' via PyMongo!")
