# 🛡️ SafeChat — The Pro-Human Social Platform

SafeChat is a professional social media ecosystem (X/Twitter clone) that utilizes a **strictly enforced zero-tolerance policy** for toxic content. It leverages a cutting-edge, 4-layer asynchronous AI moderation system to ensure every interaction is productive and respectful.

---

### 🧠 4-Layer "AI Shield" Moderation
SafeChat doesn't just moderate; it filters in real-time. Every post and comment is screened through:
1.  **⚡ L1: Profanity Filter** (Instant dictionary & regex block)
2.  **🔫 L2: Threat Detection** (Violence & self-harm intent analysis)
3.  **🧠 L3: ML Model (RoBERTa)** (Deep toxicity scoring ≥ 0.40)
4.  **💭 L4: Sentiment Guard** (Hostile-intent detection)

---

### 🚀 Key Features
- **Real-time Interaction**: Fully integrated WebSockets for instant feed updates.
- **Premium Aesthetics**: Dark mode design with glassmorphism, responsive grid, and fluid animations.
- **Admin Command Center**: Complete oversight of flagged content, toxicity analytics, and user suspension.
- **Social Core**: Profiles, following systems, post likes, shares, and threaded conversations.

---

### 🏗️ Technical Architecture
- **Frontend**: `React 18`, `React Router 6`, `Axios`, `CSS3 Variables`.
- **Backend API**: `Django 4+`, `Django Rest Framework`, `SimpleJWT`.
- **WebSockets**: `Django Channels`, `Redis`.
- **AI Microservice**: `FastAPI`, `HuggingFace Transformers (RoBERTa)`, `Detoxify`.
- **Database**: `MongoDB 6+` (via `Djongo`).

---

### ⚡ Quick Start
**1. Prerequisites**
- Python 3.10+
- Node.js 18+
- MongoDB
- Redis

**2. Setup Services**
- Backend: `pip install -r requirements.txt` → `python manage.py migrate` → `python manage.py runserver`
- ML Service: `cd ml_service` → `pip install -r requirements.txt` → `python main.py`
- Frontend: `cd frontend` → `npm install` → `npm start`

---

*SafeChat — Speak Freely. Stay Respectful.*
