FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy poetry config
COPY pyproject.toml poetry.lock* ./

# Install python dependencies
RUN pip install --no-cache-dir poetry \
    && poetry config virtualenvs.create false \
    && poetry install --no-root --only main

# Copy backend application code
COPY backend/ ./backend/

# Set working directory to the backend directory for executing python commands
WORKDIR /app/backend

# Create log directory and configure supervisor
RUN mkdir -p /var/log/supervisor
COPY backend/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port
EXPOSE 8000

# Run supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
