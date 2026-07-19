#!/bin/bash
set -e

# Move into the backend directory for both processes
cd backend

echo "==> Starting Celery worker in background..."
celery -A celery_app worker --loglevel=info --pool=threads --concurrency=10 &

echo "==> Starting Uvicorn API server..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
