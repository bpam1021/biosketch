#!/bin/bash
source /root/miniconda3/etc/profile.d/conda.sh
conda activate ai_imagegen
exec uvicorn science_image_gen.asgi:application --host 0.0.0.0 --port 8000

