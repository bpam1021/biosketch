#!/bin/bash

# Stop all Celery processes for RNA-seq Platform

echo "Stopping Biosketch AI Platform Celery Services..."

# Try to stop processes using PID files first (more graceful)
if [ -f /var/run/celery/worker.pid ]; then
    echo "Stopping Celery worker..."
    kill $(cat /var/run/celery/worker.pid) 2>/dev/null
    rm -f /var/run/celery/worker.pid
fi

if [ -f /var/run/celery/beat.pid ]; then
    echo "Stopping Celery beat..."
    kill $(cat /var/run/celery/beat.pid) 2>/dev/null
    rm -f /var/run/celery/beat.pid
fi

if [ -f /var/run/celery/flower.pid ]; then
    echo "Stopping Celery flower..."
    kill $(cat /var/run/celery/flower.pid) 2>/dev/null
    rm -f /var/run/celery/flower.pid
fi

# Wait a moment for processes to terminate gracefully
sleep 3

# Fallback: Kill remaining processes by name
pkill -f "celery.*worker"
pkill -f "celery.*beat"
pkill -f "celery.*flower"

# Wait a moment
sleep 2

# Force kill if still running
pkill -9 -f "celery"

echo "All Celery services stopped."