#!/bin/bash

# Celery worker shutdown script for Biosketch AI
# This script stops all Celery workers and monitoring services

echo "🛑 Stopping Celery Services for Biosketch AI..."

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file="logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "🔄 Stopping $service_name (PID: $pid)..."
            kill $pid
            
            # Wait for graceful shutdown
            local count=0
            while ps -p $pid > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                echo "⚡ Force killing $service_name..."
                kill -9 $pid
            fi
            
            echo "✅ $service_name stopped"
        else
            echo "⚠️ $service_name was not running"
        fi
        rm -f "$pid_file"
    else
        echo "⚠️ No PID file found for $service_name"
    fi
}

# Stop all services
stop_service "celery-worker"
stop_service "celery-rnaseq"
stop_service "celery-images"
stop_service "celery-beat"
stop_service "flower"

# Clean up any remaining Celery processes
echo "🧹 Cleaning up remaining Celery processes..."
pkill -f "celery.*science_image_gen" || echo "No additional Celery processes found"

# Clean up log files older than 7 days
if [ -d "logs" ]; then
    echo "🗂️ Cleaning old log files..."
    find logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
fi

echo ""
echo "✅ All Celery services stopped successfully!"
echo ""
echo "💡 To restart services, run: ./start_celery.sh"
echo "💡 To start development server, run: ./run_dev.sh"