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

### 2B. Create a Python virtual environment
```cmd
python -m venv venv
venv\Scripts\activate
```
> You should see `(venv)` appear at the start of your prompt.

### 2C. Install Python dependencies
```cmd
pip install -r requirements.txt
```

### 2D. Create the .env file
```cmd
copy .env.example .env
```
Then open `.env` in Notepad and update the `DJANGO_SECRET_KEY` line:
- Replace `replace-this-with-...` with any long random string.

### 2E. Create __init__.py files
```cmd
type nul > users\__init__.py
type nul > posts\__init__.py
type nul > moderation\__init__.py
type nul > safechat_project\__init__.py
```

### 2F. Run database migrations
```cmd
python manage.py makemigrations users posts moderation notifications
python manage.py migrate
```

### 2G. Create an admin (superuser) account
```cmd
python manage.py createsuperuser
```
Enter details, then open the Django shell to give it admin privileges:
```cmd
python manage.py shell
```
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
> **Note:** Real-time notifications for followers, likes, and comments are now active.

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
> ⚠️ Downloads large packages (~1–2 GB). Be patient.

### 3D. Start the ML service
```cmd
python main.py
```
> First startup takes ~30–60s to load the RoBERTa model.
> ✅ Verify: http://localhost:8001/health

---

## ✅ Step 4 — Set Up the Frontend (React)

Open another **NEW** Command Prompt window.

### 4A. Navigate to the frontend folder
```cmd
cd path\to\safechat\frontend
```

### 4B. Install dependencies
```cmd
npm install
```

### 4C. Start the server
```cmd
npm start
```
> Browser opens to **http://localhost:3000** 🎉

---

## 🐳 Step 5 — (Optional) One-Click Docker Setup

If you have **Docker Desktop** installed:
1. Open a terminal in the project root.
2. Run: `docker-compose up --build`
3. Wait for startup, then open: http://localhost:3000

---

## ✅ Step 6 — Verify Everything Works

### Quick smoke test:
1. Register a new account & log in.
2. Healthy post: *"Hello, great to be here!"* → Approved ✅
3. Toxic post: *"You are an idiot"* → Blocked 🚫
4. Check **Notifications** tab — likes/follows trigger real-time alerts.
5. Check **Admin Panel** → see **"Major Violation Archetypes"** and "Detection Breakdown."

---

## 🔴 Manual Services Checklist

Total of **3 Command Prompt windows** open:

| Window | Command | Port |
|--------|---------|------|
| Backend | `daphne -b 0.0.0.0 -p 8000 safechat_project.asgi:application` | 8000 |
| ML Service | `python main.py` | 8001 |
| Frontend | `npm start` | 3000 |

---

## 📊 Architecture Summary

```
Browser (React :3000)
    │
    ├── HTTP REST API ──────────────► Django (:8000)
    │                                    │
    ├── WebSocket ──────────────────►    │ (Django Channels + Redis)
    │                                    │
    │                                    ├── MongoDB (Database)
    │                                    │
    │                                    └── HTTP POST /classify ──► FastAPI ML (:8001)
    │                                                                     │
    │                                                               Detoxify RoBERTa
```

---

## 🎓 Technical Justification

**Four-Layer Moderation System:**
1. **L1 Profanity Filter:** Instant dictionary block.
2. **L2 Threat Detection:** Violence/self-harm proximity scan.
3. **L3 ML Model (RoBERTa):** Nuanced abuse/toxicity scoring.
4. **L4 Sentiment Guard:** Hostile-intent detection.

**Microservice Architecture:**
Offloading ML calculation to FastAPI keeps the API responsive and handles the heavy RoBERTa model (~2GB RAM) independently.

---

## 🚀 Good luck with your project! 🎓
