#!/bin/bash
set -e

echo "==> Starting Celery worker in background..."
cd backend
celery -A celery_app worker --loglevel=info --concurrency=1 &

echo "==> Starting Uvicorn API server..."
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
