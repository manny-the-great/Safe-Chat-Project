# 🛡️ SafeChat — Complete Windows Setup Guide
**Final Year Project | Full-Stack Production Deployment**

---

## 📁 Project Structure

```
safechat/
├── frontend/          ← React app (port 3000)
├── backend/           ← Django API server (port 8000)
├── ml_service/        ← FastAPI ML microservice (port 8001)
└── SETUP.md           ← This file
```

---

## ✅ Step 1 — Install Prerequisites

Install these tools **in order**. Download links provided.

### 1A. Python 3.11
- Download: https://www.python.org/downloads/release/python-3118/
- Click **"Windows installer (64-bit)"**
- ⚠️ On the first screen, check **"Add Python to PATH"** before clicking Install
- Verify: open Command Prompt → type `python --version` → should show `3.11.x`

### 1B. Node.js 20 (LTS)
- Download: https://nodejs.org/en/download
- Choose **"Windows Installer (.msi)" → LTS version**
- Install with default settings
- Verify: `node --version` and `npm --version`

### 1C. MongoDB Community Server
- Download: https://www.mongodb.com/try/download/community
- Choose **Version 7.0**, **Platform: Windows**, **Package: msi**
- Install with **"Complete"** setup type
- ✅ Leave "Install MongoDB as a Service" **checked** — it runs automatically
- Verify: open Command Prompt → `mongosh --version`

### 1D. Redis for Windows
- Download: https://github.com/tporadowski/redis/releases/latest
- Download `Redis-x.x.xxx-Windows-x64-with-Service-installer.msi`
- Install with default settings (installs as Windows service)
- Verify: `redis-cli ping` → should respond `PONG`

### 1E. Git (optional but recommended)
- Download: https://git-scm.com/download/win
- Install with defaults

---

## ✅ Step 2 — Set Up the Backend (Django)

Open **Command Prompt** (press `Win + R`, type `cmd`, press Enter).

### 2A. Navigate to the backend folder
```cmd
cd path\to\safechat\backend
```
> Replace `path\to\safechat` with wherever you saved the project.
> Example: `cd C:\Users\YourName\Desktop\safechat\backend`

### 2B. Create a Python virtual environment
```cmd
python -m venv venv
venv\Scripts\activate
```
> You should see `(venv)` appear at the start of your prompt. This keeps the project's Python packages separate from your system.

### 2C. Install Python dependencies
```cmd
pip install -r requirements.txt
```
> This installs Django, DRF, JWT, Channels, Djongo, etc. May take 2–3 minutes.

### 2D. Create the .env file
```cmd
copy .env.example .env
```
Then open `.env` in Notepad and update the `DJANGO_SECRET_KEY` line:
- Replace `replace-this-with-...` with any long random string, e.g.:
  `DJANGO_SECRET_KEY=mysafechatsecretkey2024projectfinalyear!`

### 2E. Create __init__.py files for Django apps
```cmd
type nul > users\__init__.py
type nul > posts\__init__.py
type nul > moderation\__init__.py
type nul > safechat_project\__init__.py
```

### 2F. Run database migrations
```cmd
python manage.py makemigrations users posts moderation
python manage.py migrate
```

### 2G. Create an admin (superuser) account
```cmd
python manage.py createsuperuser
```
Enter a username, email, and password. Then open the Django shell to give it admin privileges:
```cmd
python manage.py shell
```
In the shell, type:
```python
from users.models import User
u = User.objects.get(username='your_admin_username')
u.is_admin = True
u.is_staff = True
u.is_superuser = True
u.save()
exit()
```

### 2H. Start the Django server
```cmd
daphne -b 0.0.0.0 -p 8000 safechat_project.asgi:application
```
> Keep this window open. Django is now running on http://localhost:8000

---

## ✅ Step 3 — Set Up the ML Microservice (FastAPI)

Open a **NEW** Command Prompt window.

### 3A. Navigate to the ML folder
```cmd
cd path\to\safechat\ml_service
```

### 3B. Create a separate virtual environment
```cmd
python -m venv venv
venv\Scripts\activate
```

### 3C. Install ML dependencies
```cmd
pip install -r requirements.txt
```
> ⚠️ This will download the PyTorch and Detoxify packages. They are large (~1–2 GB). This will take several minutes depending on your internet speed. **Be patient.**
>
> The first time `detoxify` runs, it will also download the RoBERTa model weights (~500 MB). This happens automatically.

### 3D. Start the ML service
```cmd
python main.py
```
> You should see: `Uvicorn running on http://0.0.0.0:8001`
>
> The first startup downloads and loads the RoBERTa model — this takes ~30–60 seconds. After that, responses are very fast.
>
> ✅ Verify it's working: open http://localhost:8001/health in your browser.
> You should see: `{"status": "ok", "ml_model_loaded": true}`

---

## ✅ Step 4 — Set Up the Frontend (React)

Open another **NEW** Command Prompt window.

### 4A. Navigate to the frontend folder
```cmd
cd path\to\safechat\frontend
```

### 4B. Install Node.js dependencies
```cmd
npm install
```
> Downloads all React packages (~100 MB). Takes 1–2 minutes.

### 4C. Start the React development server
```cmd
npm start
```
> Your browser should automatically open to **http://localhost:3000** 🎉

---

## ✅ Step 5 — Verify Everything Works

Open your browser and go to **http://localhost:3000**.

You should see the SafeChat login page.

### Quick smoke test:
1. Click "Create one" to register a new account
2. Log in
3. Write a clean post like *"Hello everyone, great to be here!"* → Should post successfully ✅
4. Write a toxic post like *"You are such an idiot"* → Should be blocked 🚫
5. You should see: **"Checking for inappropriate content..."** loader, then the rejection message

---

## 🔴 All Three Services Must Be Running

You need **3 Command Prompt windows** open simultaneously:

| Window | Command | Port |
|--------|---------|------|
| Backend | `daphne -b 0.0.0.0 -p 8000 safechat_project.asgi:application` | 8000 |
| ML Service | `python main.py` | 8001 |
| Frontend | `npm start` | 3000 |

MongoDB and Redis run as Windows services automatically (started at Step 1).

---

## 🐛 Troubleshooting

### "ModuleNotFoundError: No module named 'djongo'"
```cmd
pip install djongo==1.3.6 pymongo==3.12.3
```

### "ECONNREFUSED" on frontend
- Make sure Django is running on port 8000
- Check that `.env` file exists in `backend/`

### ML service shows `"ml_model_loaded": false`
- The model is still loading. Wait 30–60 seconds and refresh `/health`
- If it stays false, run: `pip install detoxify torch --upgrade`

### MongoDB connection error
- Open **Services** (Win + R → `services.msc`) and check that **MongoDB** is Running
- Or start it: `net start MongoDB`

### Redis connection error
- Check Services for **Redis** → should be Running
- Or start it: `net start Redis`

### Port already in use
- Change the port number in the start command, e.g. `-p 8002`
- Update `ML_SERVICE_URL` in `.env` to match

### "makemigrations" creates no changes
- Make sure all `__init__.py` files were created (Step 2E)
- Run `python manage.py makemigrations --empty users` then migrate

---

## 📊 Architecture Summary

```
Browser (React :3000)
    │
    ├── HTTP REST API ──────────────► Django (:8000)
    │                                    │
    ├── WebSocket ──────────────────►    │ (Django Channels + Redis)
    │                                    │
    │                                    ├── MongoDB (database)
    │                                    │
    │                                    └── HTTP POST /classify ──► FastAPI ML (:8001)
    │                                                                     │
    │                                                               Detoxify RoBERTa
    │                                                               (toxicity scoring)
```

---

## 🎓 For Your Project Presentation

Be ready to explain these key technical decisions:

**Why MongoDB?**
Schema flexibility for evolving moderation log structures; stores JSON-like documents naturally.

**Why Django + Channels?**
Django REST Framework is production-battle-tested. Channels adds WebSocket support for real-time updates without a separate server.

**Why a separate FastAPI microservice for ML?**
Python ML libraries (PyTorch, Transformers) are heavy. Separating them into a microservice means the main Django app stays fast and the ML service can be scaled, updated, or retrained independently.

**Why Detoxify / RoBERTa?**
Detoxify is fine-tuned on the Jigsaw Toxic Comment Classification dataset (160,000 comments). It has state-of-the-art performance on toxicity detection across 6 categories. It runs locally — no API key or cost needed.

**Why three layers?**
The dictionary filter catches clear violations in <1ms. The ML model catches nuanced cases the dictionary misses. The sentiment layer catches extreme negativity that the ML model might score just below threshold.

---

## 🚀 Good luck with your project! 🎓
