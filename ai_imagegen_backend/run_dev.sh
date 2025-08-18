#!/bin/bash

# Development server startup script for Biosketch AI
# This script starts the Django development server with all necessary services

set -e  # Exit on any error

echo "🚀 Starting Biosketch AI Development Environment..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Check if PostgreSQL is running
echo "🗄️ Checking PostgreSQL connection..."
python manage.py check --database default || {
    echo "❌ PostgreSQL connection failed. Please ensure PostgreSQL is running and configured correctly."
    echo "Database settings in settings.py:"
    echo "  - Database: science_image_gen_db"
    echo "  - User: postgres"
    echo "  - Password: biosketch123!"
    echo "  - Host: localhost"
    echo "  - Port: 5432"
    exit 1
}

# Run migrations
echo "🔄 Running database migrations..."
python manage.py makemigrations
python manage.py migrate

# Check if Redis is running (for Celery)
echo "🔴 Checking Redis connection..."
python -c "import redis; r = redis.Redis(host='localhost', port=6379, db=0); r.ping()" || {
    echo "⚠️ Redis connection failed. Celery workers may not function properly."
    echo "Please install and start Redis server:"
    echo "  Ubuntu/Debian: sudo apt install redis-server && sudo systemctl start redis"
    echo "  macOS: brew install redis && brew services start redis"
    echo "  Or run Redis in Docker: docker run -d -p 6379:6379 redis:alpine"
}

# Create media directories if they don't exist
echo "📁 Creating media directories..."
mkdir -p media/generated_images
mkdir -p media/generated_slides
mkdir -p media/profile_pics
mkdir -p media/challenge_entries
mkdir -p media/community_images
mkdir -p media/chat_media
mkdir -p media/templates
mkdir -p media/exports
mkdir -p media/rnaseq/fastq
mkdir -p media/rnaseq/counts
mkdir -p media/rnaseq/metadata
mkdir -p media/rnaseq/results
mkdir -p media/rnaseq/visualizations

# Create static directories
echo "📁 Creating static directories..."
mkdir -p static
mkdir -p staticfiles

# Collect static files
echo "🎨 Collecting static files..."
python manage.py collectstatic --noinput

# Check environment variables
echo "🔍 Checking environment variables..."
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️ Warning: OPENAI_API_KEY not set. Image generation may not work."
fi

if [ -z "$STRIPE_TEST_SECRET_KEY" ]; then
    echo "⚠️ Warning: STRIPE_TEST_SECRET_KEY not set. Payments may not work."
fi

# Start the development server
echo "🌐 Starting Django development server..."
echo "📍 Server will be available at: http://localhost:8000"
echo "📍 Admin panel: http://localhost:8000/admin/"
echo "📍 API endpoints: http://localhost:8000/api/"
echo ""
echo "💡 To start Celery workers, run: ./start_celery.sh"
echo "💡 To stop Celery workers, run: ./stop_celery.sh"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Run the development server with auto-reload
python manage.py runserver 0.0.0.0:8000