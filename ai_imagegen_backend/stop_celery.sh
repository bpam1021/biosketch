#!/bin/bash

# Stop all Celery processes for RNA-seq Platform

echo "Stopping Biosketch AI Platform Celery Services..."

# Kill Celery worker processes
pkill -f "celery.*worker"

# Kill Celery beat processes
pkill -f "celery.*beat"

# Kill Celery flower processes
pkill -f "celery.*flower"

# Wait a moment for processes to terminate
sleep 2

# Force kill if still running
pkill -9 -f "celery"

echo "All Celery services stopped."