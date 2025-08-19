#!/bin/bash

# Celery startup script for RNA-seq Platform
# Make this file executable: chmod +x start_celery.sh

echo "Starting Biosketch AI Platform Celery Services..."

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

# Start Celery worker in the background
echo "Starting Celery worker..."
celery -A science_image_gen worker --loglevel=info --concurrency=4 &
WORKER_PID=$!

# Start Celery beat scheduler (for periodic tasks if needed)
echo "Starting Celery beat scheduler..."
celery -A science_image_gen beat --loglevel=info &
BEAT_PID=$!

# Start Celery flower monitoring (optional)
echo "Starting Celery Flower monitoring on http://localhost:5555"
celery -A ai_imagegen_backend flower --port=5555 &
FLOWER_PID=$!

echo "Celery services started successfully!"
echo "Worker PID: $WORKER_PID"
echo "Beat PID: $BEAT_PID"
echo "Flower PID: $FLOWER_PID"
echo ""
echo "To stop all services, run: ./stop_celery.sh"
echo "To monitor tasks, visit: http://localhost:5555"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for interrupt signal
trap 'echo "Stopping Celery services..."; kill $WORKER_PID $BEAT_PID $FLOWER_PID 2>/dev/null; exit 0' INT

# Keep script running
wait