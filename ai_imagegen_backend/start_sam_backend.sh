#!/bin/bash
cd /var/www/biosketch/main_app/ai_imagegen_backend/sam_segment
source sam-env/bin/activate
exec uvicorn main:app --host 0.0.0.0 --port 8001

