#!/bin/bash

# Celery worker startup script for Biosketch AI
# This script starts Celery workers and monitoring services

set -e  # Exit on any error

echo "🔄 Starting Celery Services for Biosketch AI..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "🔧 Activating virtual environment..."
    source venv/bin/activate
fi

# Check if Redis is running
echo "🔴 Checking Redis connection..."
python -c "import redis; r = redis.Redis(host='localhost', port=6379, db=0); r.ping()" || {
    echo "❌ Redis is not running. Please start Redis server first:"
    echo "  Ubuntu/Debian: sudo systemctl start redis"
    echo "  macOS: brew services start redis"
    echo "  Docker: docker run -d -p 6379:6379 redis:alpine"
    exit 1
}

# Create log directory
mkdir -p logs

# Function to start a service in background
start_service() {
    local service_name=$1
    local command=$2
    local log_file="logs/${service_name}.log"
    local pid_file="logs/${service_name}.pid"
    
    echo "🚀 Starting $service_name..."
    nohup $command > "$log_file" 2>&1 &
    echo $! > "$pid_file"
    echo "✅ $service_name started (PID: $(cat $pid_file))"
}

# Start Celery worker for general tasks
start_service "celery-worker" "celery -A science_image_gen worker --loglevel=info --concurrency=4"

# Start Celery worker specifically for RNA-seq analysis (CPU intensive)
start_service "celery-rnaseq" "celery -A science_image_gen worker --loglevel=info --concurrency=2 --queues=rnaseq"

# Start Celery worker for image processing tasks
start_service "celery-images" "celery -A science_image_gen worker --loglevel=info --concurrency=2 --queues=images"

# Start Celery beat scheduler (for periodic tasks)
start_service "celery-beat" "celery -A science_image_gen beat --loglevel=info"

# Start Flower monitoring (optional)
if command -v flower &> /dev/null; then
    start_service "flower" "celery -A science_image_gen flower --port=5555"
    echo "🌸 Flower monitoring available at: http://localhost:5555"
else
    echo "⚠️ Flower not installed. Install with: pip install flower"
fi

echo ""
echo "✅ All Celery services started successfully!"
echo ""
echo "📊 Service Status:"
echo "  - Celery Worker (General): PID $(cat logs/celery-worker.pid)"
echo "  - Celery Worker (RNA-seq): PID $(cat logs/celery-rnaseq.pid)"
echo "  - Celery Worker (Images): PID $(cat logs/celery-images.pid)"
echo "  - Celery Beat: PID $(cat logs/celery-beat.pid)"
if [ -f "logs/flower.pid" ]; then
    echo "  - Flower Monitor: PID $(cat logs/flower.pid)"
fi
echo ""
echo "📝 Logs are available in the logs/ directory"
echo "🛑 To stop all services, run: ./stop_celery.sh"
echo ""
echo "💡 Monitor tasks with:"
echo "  - Flower: http://localhost:5555 (if installed)"
echo "  - Logs: tail -f logs/celery-worker.log"