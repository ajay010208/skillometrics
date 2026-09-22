# SkilloMetrics AI service (Python FastAPI) — production image
# Build from the monorepo ROOT:  docker build -f apps/ai/Dockerfile -t skillometrics-ai .
FROM python:3.11-slim
WORKDIR /app

COPY apps/ai/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/ai/app/ app/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Production start: uvicorn WITHOUT --reload; workers configurable via AI_WORKERS
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${AI_PORT:-8000} --workers ${AI_WORKERS:-1}"]
