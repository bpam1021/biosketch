# Production Deployment Fix Required - DiagramElement Field Names

## Issue
Production Celery workers are still using old DiagramElement field names, causing this error:
```
[2025-09-02 22:35:43,953: ERROR/ForkPoolWorker-4] Text-to-diagram conversion failed: DiagramElement() got unexpected keyword arguments: 'chart_data', 'style_config', 'source_content'
```

## Root Cause
The DiagramElement model was updated to use new field names:
- `chart_data` → `data`
- `style_config` → `config` 
- `source_content` → `source_text`

However, production Celery workers are still running old cached bytecode.

## Required Actions on Production Server

### 1. Stop Celery Workers
```bash
# Stop all Celery workers
./stop_celery.sh
# OR manually kill processes:
pkill -f celery
```

### 2. Clear Python Cache
```bash
# Remove __pycache__ directories
find . -name "__pycache__" -type d -exec rm -rf {} +
find . -name "*.pyc" -delete
```

### 3. Restart Celery Workers
```bash
# Start Celery workers with fresh code
./start_celery.sh
```

### 4. Verify Fix
Test the text-to-diagram conversion feature to ensure the error is resolved.

## Files Changed
- `users/tasks.py` - DiagramElement.objects.create() uses correct field names
- `users/views/new_presentation_views.py` - Response mapping uses correct field names
- `users/models.py` - DiagramElement model has correct field definitions

## Status
✅ Code fixes completed in repository
❌ Production deployment pending - requires Celery restart

## Notes
This is a deployment issue, not a code issue. The repository contains the correct field names but production workers need to be restarted to load the updated code.