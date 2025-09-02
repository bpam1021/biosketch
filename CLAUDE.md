# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a multi-component biosketch and AI image generation system with three main parts:

1. **ai_imagegen_backend** - Django REST API backend with ML/AI capabilities
2. **ai_imagegen_frontend** - React/TypeScript frontend with Vite
3. **sam_segment** - Segment Anything Model (SAM) for image segmentation

### Backend Architecture (ai_imagegen_backend)
- Django 4.2.7 with Django REST Framework
- JWT authentication via django-rest-framework-simplejwt
- Celery for background task processing with Redis broker
- Extensive AI/ML stack: OpenAI, PyTorch, Transformers, Diffusers
- Bioinformatics tools: scanpy, HTSeq, pydeseq2
- WebSocket support via Django Channels
- Main Django project: `science_image_gen`
- Apps include: `users`, `community`, `adminpanel`, `rnaseq`

### Frontend Architecture (ai_imagegen_frontend)
- React 18 with TypeScript
- Vite build system with Tailwind CSS
- Key dependencies: Fabric.js, Chart.js, React Router
- Proxy configuration to backend at http://95.216.89.141:8000
- Multi-page build with main and admin entry points

### SAM Segment Module (sam_segment)
- Meta's Segment Anything Model implementation
- Python package for image segmentation tasks
- Supports multiple model sizes (ViT-B, ViT-L, ViT-H)

## Common Development Commands

### Frontend (ai_imagegen_frontend)
```bash
cd ai_imagegen_frontend
npm run dev          # Start development server on all interfaces
npm run build        # Build for production (TypeScript + Vite)
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend (ai_imagegen_backend)
```bash
cd ai_imagegen_backend

# Django commands
python manage.py runserver          # Start Django development server
python manage.py migrate           # Run database migrations  
python manage.py makemigrations    # Create new migrations
python manage.py collectstatic     # Collect static files
python manage.py createsuperuser   # Create admin user

# Development scripts
./run_dev.sh                       # Start development environment
./start_main_backend.sh           # Start main backend service
./start_sam_backend.sh            # Start SAM backend service
./start_celery.sh                 # Start Celery workers
./stop_celery.sh                  # Stop Celery workers
./check_services.sh               # Check service status
```

### SAM Segment (sam_segment)
```bash
cd sam_segment
pip install -e .                  # Install in development mode
pip install -e .[all]             # Install with all extras (matplotlib, pycocotools, etc.)
pip install -e .[dev]             # Install with development tools (flake8, black, mypy)

# Usage example
python scripts/amg.py --checkpoint <path> --model-type <type> --input <image> --output <path>
```

## Environment Setup

### Backend Dependencies
- Python 3.8+ required
- Install from requirements.txt: `pip install -r requirements.txt`
- System dependencies listed in ai_imagegen_backend/README.md (lines 26-52)
- Virtual environment recommended: use `.venv` directory

### Frontend Dependencies
- Node.js with npm
- Install: `npm install`
- TypeScript ~5.6.2

### SAM Dependencies
- PyTorch >=1.7, torchvision >=0.8 
- CUDA support recommended for performance
- Optional: opencv-python, pycocotools, matplotlib, onnxruntime

## Key Services Integration

- Frontend proxies `/api` and `/media` requests to backend
- Backend uses Redis for Celery task queue and Django Channels
- WebSocket connections supported via Django Channels
- Stripe integration for payments
- Multiple AI model integrations (OpenAI, Hugging Face, local PyTorch models)

## Development Notes

- Backend settings module: `science_image_gen.settings` 
- Frontend supports both main app and admin panel builds
- Extensive bioinformatics and data science capabilities in backend
- Image processing pipeline includes background removal (rembg) and SAM segmentation
- PDF/Excel/PowerPoint generation capabilities for reports