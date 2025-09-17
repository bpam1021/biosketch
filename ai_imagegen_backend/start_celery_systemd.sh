#!/bin/bash

# Celery startup script for systemd service
# This version runs in the background without interactive features

set -e  # Exit on error

echo "Starting Biosketch AI Platform Celery Services for systemd..."

# Change to the project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "Working directory: $(pwd)"

# Check if virtual environment exists
if [ -f "venv/bin/activate" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
    echo "Virtual environment activated: $VIRTUAL_ENV"
elif [ -f ".venv/bin/activate" ]; then
    echo "Activating .venv virtual environment..."
    source .venv/bin/activate
    echo "Virtual environment activated: $VIRTUAL_ENV"
else
    echo "Warning: No virtual environment found, proceeding without it..."
fi

# Check if Redis is running
echo "Checking Redis connection..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "Redis is not responding. Starting Redis..."
    sudo systemctl start redis-server
    sleep 3

    # Check again
    if ! redis-cli ping > /dev/null 2>&1; then
        echo "Error: Cannot connect to Redis even after starting it."
        exit 1
    fi
fi

echo "Redis is running"

# Set Django settings module
export DJANGO_SETTINGS_MODULE=science_image_gen.settings

# Create directories if they don't exist
sudo mkdir -p /var/run/celery /var/log/celery
sudo chown root:root /var/run/celery /var/log/celery

# Test Django settings
echo "Testing Django configuration..."
python -c "import django; django.setup(); print('Django configured successfully')" || {
    echo "Error: Django configuration failed"
    exit 1
}

# Start Celery worker
echo "Starting Celery worker..."
celery -A science_image_gen worker \
    --loglevel=info \
    --concurrency=2 \
    --pidfile=/var/run/celery/worker.pid \
    --logfile=/var/log/celery/worker.log \
    --detach || {
    echo "Error: Failed to start Celery worker"
    exit 1
}

# Start Celery beat scheduler
echo "Starting Celery beat scheduler..."
celery -A science_image_gen beat \
    --loglevel=info \
    --pidfile=/var/run/celery/beat.pid \
    --logfile=/var/log/celery/beat.log \
    --detach || {
    echo "Error: Failed to start Celery beat"
    exit 1
}

# Start Celery flower (optional)
echo "Starting Celery Flower monitoring..."
celery -A science_image_gen flower \
    --port=5555 \
    --pidfile=/var/run/celery/flower.pid \
    --logfile=/var/log/celery/flower.log \
    --detach || {
    echo "Warning: Failed to start Celery flower, continuing without it"
}

echo "Celery services started successfully!"
echo "Worker PID: $(cat /var/run/celery/worker.pid 2>/dev/null || echo 'Not found')"
echo "Beat PID: $(cat /var/run/celery/beat.pid 2>/dev/null || echo 'Not found')"
echo "Flower PID: $(cat /var/run/celery/flower.pid 2>/dev/null || echo 'Not found')"
echo "Check logs: sudo tail -f /var/log/celery/*.log"