FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Run migrations then start Daphne (ASGI server for WebSocket support)
CMD ["sh", "-c", "python manage.py migrate --no-input && daphne -b 0.0.0.0 -p 8000 safechat_project.asgi:application"]
