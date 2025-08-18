#!/bin/bash

# Service status checker for Biosketch AI
# This script checks the status of all required services

echo "🔍 Checking Biosketch AI Services Status..."
echo ""

# Function to check if a service is running
check_service() {
    local service_name=$1
    local pid_file="logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "✅ $service_name: Running (PID: $pid)"
            return 0
        else
            echo "❌ $service_name: Not running (stale PID file)"
            rm -f "$pid_file"
            return 1
        fi
    else
        echo "❌ $service_name: Not running (no PID file)"
        return 1
    fi
}

# Function to check external services
check_external_service() {
    local service_name=$1
    local check_command=$2
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo "✅ $service_name: Available"
        return 0
    else
        echo "❌ $service_name: Not available"
        return 1
    fi
}

# Check Celery services
echo "📊 Celery Services:"
check_service "celery-worker"
check_service "celery-rnaseq"
check_service "celery-images"
check_service "celery-beat"
check_service "flower"

echo ""
echo "🔧 External Services:"

# Check PostgreSQL
check_external_service "PostgreSQL" "python -c 'import psycopg2; psycopg2.connect(host=\"localhost\", port=5432, database=\"science_image_gen_db\", user=\"postgres\", password=\"biosketch123!\")'"

# Check Redis
check_external_service "Redis" "python -c 'import redis; r = redis.Redis(host=\"localhost\", port=6379, db=0); r.ping()'"

# Check Django server
check_external_service "Django Server" "curl -s http://localhost:8000/api/ -o /dev/null"

echo ""
echo "📁 Directory Status:"

# Check required directories
directories=("media" "logs" "static" "staticfiles")
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir/: Exists"
    else
        echo "❌ $dir/: Missing"
    fi
done

echo ""
echo "🔑 Environment Variables:"

# Check important environment variables
env_vars=("OPENAI_API_KEY" "STRIPE_TEST_SECRET_KEY" "STRIPE_WEBHOOK_SECRET")
for var in "${env_vars[@]}"; do
    if [ -n "${!var}" ]; then
        echo "✅ $var: Set"
    else
        echo "⚠️ $var: Not set"
    fi
done

echo ""
echo "📊 System Resources:"

# Check system resources
echo "💾 Memory Usage: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "💽 Disk Usage: $(df -h . | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"
echo "🖥️ CPU Load: $(uptime | awk -F'load average:' '{print $2}')"

echo ""
echo "🔗 Quick Links:"
echo "  - Django Admin: http://localhost:8000/admin/"
echo "  - API Root: http://localhost:8000/api/"
echo "  - RNA-seq API: http://localhost:8000/api/rnaseq/"
echo "  - Flower Monitor: http://localhost:5555/ (if running)"

echo ""
echo "💡 Commands:"
echo "  - Start development: ./run_dev.sh"
echo "  - Start Celery: ./start_celery.sh"
echo "  - Stop Celery: ./stop_celery.sh"
echo "  - Check status: ./check_services.sh"