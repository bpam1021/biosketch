#!/bin/bash

# Celery startup script for systemd service
# This version runs in the background without interactive features

echo "Starting Biosketch AI Platform Celery Services for systemd..."

# Change to the project directory
cd /root/biosketch/ai_imagegen_backend

# Activate virtual environment
source venv/bin/activate

# Check if Redis is running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "Redis is not running. Starting Redis..."
    sudo systemctl start redis-server
    sleep 2
fi

# Check Redis connection
redis-cli ping > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: Cannot connect to Redis. Please check Redis installation."
    exit 1
fi

# Set Django settings module
export DJANGO_SETTINGS_MODULE=science_image_gen.settings

# Create PID directory if it doesn't exist
mkdir -p /var/run/celery

# Start Celery worker in the background
echo "Starting Celery worker..."
celery -A science_image_gen worker \
    --loglevel=info \
    --concurrency=4 \
    --pidfile=/var/run/celery/worker.pid \
    --logfile=/var/log/celery/worker.log \
    --detach

# Start Celery beat scheduler (for periodic tasks)
echo "Starting Celery beat scheduler..."
celery -A science_image_gen beat \
    --loglevel=info \
    --pidfile=/var/run/celery/beat.pid \
    --logfile=/var/log/celery/beat.log \
    --detach

# Start Celery flower monitoring (optional)
echo "Starting Celery Flower monitoring on port 5555..."
celery -A science_image_gen flower \
    --port=5555 \
    --pidfile=/var/run/celery/flower.pid \
    --logfile=/var/log/celery/flower.log \
    --detach

echo "Celery services started successfully!"
echo "Check logs in /var/log/celery/"
echo "Monitor tasks at http://localhost:5555"