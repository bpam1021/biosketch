"""
New Presentation URLs - Clean Architecture
Document = Microsoft Word, Slides = PowerPoint
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views.new_presentation_views import (
    DocumentViewSet, DocumentChapterViewSet, DocumentSectionViewSet,
    SlidePresentationViewSet, SlideViewSet, 
    SlideTemplateViewSet, SlideThemeViewSet,
    MediaAssetViewSet, 
    PresentationExportViewSet, PresentationTypeViewSet
)
from users.views.export_views import (
    DocumentExportView, SlidesPresentationExportView,
    export_status_view, download_export_view, list_export_jobs_view
)
# Chart templates will be handled in PresentationTypeViewSet

# Create router for new presentation APIs
router = DefaultRouter()

# Document APIs (Word-like)
router.register('documents', DocumentViewSet, basename='documents')
router.register('document-chapters', DocumentChapterViewSet, basename='document-chapters')
router.register('document-sections', DocumentSectionViewSet, basename='document-sections')

# Slide Presentation APIs (PowerPoint-like)
router.register('slide-presentations', SlidePresentationViewSet, basename='slide-presentations')
router.register('slides', SlideViewSet, basename='slides')
router.register('slide-templates', SlideTemplateViewSet, basename='slide-templates')
router.register('slide-themes', SlideThemeViewSet, basename='slide-themes')

# Shared APIs
router.register('media-assets', MediaAssetViewSet, basename='media-assets')
# Removed: Visual diagram registration
router.register('exports', PresentationExportViewSet, basename='exports')

# Presentation Type Selector API
router.register('presentation-types', PresentationTypeViewSet, basename='presentation-types')

# URL patterns - Include both v2 and legacy endpoints
urlpatterns = [
    # V2 API endpoints (new enhanced system)
    path('v2/', include(router.urls)),
    
    # Legacy endpoints for backward compatibility - redirects to new enhanced system
    path('users/presentations/', PresentationTypeViewSet.as_view({
        'get': 'unified_list',
        'post': 'generate_document_ai'  # Default to document generation for POST
    }), name='legacy-presentations'),
    
    path('users/presentations/generate-document/', PresentationTypeViewSet.as_view({
        'post': 'generate_document_ai'
    }), name='legacy-generate-document'),
    
    path('users/presentations/generate-slides/', PresentationTypeViewSet.as_view({
        'post': 'generate_slides_ai'
    }), name='legacy-generate-slides'),
    
    path('users/presentations/<str:pk>/', PresentationTypeViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'delete': 'destroy'
    }), name='legacy-presentation-detail'),
    
    # Chart templates endpoint for diagram conversion
    path('users/chart-templates/', PresentationTypeViewSet.as_view({
        'get': 'chart_templates'
    }), name='chart-templates-list'),
    
    # AI chart generation endpoint (for ChartGenerator frontend component)
    path('presentations/generate-diagram/', PresentationTypeViewSet.as_view({
        'post': 'convert_text_to_diagram'
    }), name='generate-diagram'),
    
    # Task status endpoint for polling diagram generation
    path('presentations/diagram-task-status/<str:task_id>/', PresentationTypeViewSet.as_view({
        'get': 'diagram_task_status'
    }), name='diagram-task-status'),
    
    # Diagram management endpoints
    path('presentations/<str:presentation_id>/diagrams/', PresentationTypeViewSet.as_view({
        'post': 'create_diagram'
    }), name='create-diagram'),
    
    path('presentations/<str:presentation_id>/diagrams/<str:diagram_id>/', PresentationTypeViewSet.as_view({
        'patch': 'update_diagram',
        'delete': 'delete_diagram'
    }), name='manage-diagram'),
    
    # Image upload endpoint for slide presentations
    path('presentations/upload-image/', PresentationTypeViewSet.as_view({
        'post': 'upload_image'
    }), name='upload-image'),
    
    # Export endpoints
    path('users/presentations/<str:presentation_id>/export/', PresentationTypeViewSet.as_view({
        'post': 'export_presentation'
    }), name='export-presentation'),
    
    path('users/presentations/<str:presentation_id>/export-status/', PresentationTypeViewSet.as_view({
        'get': 'export_status'
    }), name='export-status'),
    
    # Image upload endpoint for frontend compatibility
    path('users/images/upload/', PresentationTypeViewSet.as_view({
        'post': 'simple_image_upload'
    }), name='legacy-image-upload'),
    
    # ============================================================================
    # NEW EXPORT SYSTEM ENDPOINTS
    # ============================================================================
    
    # Document export endpoints (PDF, DOCX, HTML)
    path('documents/<str:document_id>/export/<str:export_format>/', 
         DocumentExportView.as_view(), name='document-export'),
    
    # Slide presentation export endpoints (PDF, PPTX, HTML, MP4)  
    path('presentations/<str:presentation_id>/export/<str:export_format>/', 
         SlidesPresentationExportView.as_view(), name='presentation-export'),
    
    # Export status and download endpoints
    path('exports/<str:export_job_id>/status/', 
         export_status_view, name='export-status'),
    path('exports/<str:export_job_id>/download/', 
         download_export_view, name='export-download'),
    path('exports/jobs/', 
         list_export_jobs_view, name='export-jobs-list'),
    
    # ============================================================================
    # CONTENT REPLACEMENT ENDPOINTS 
    # ============================================================================
    
    # Replace selected content with AI diagram
    path('presentations/replace-content-with-diagram/', PresentationTypeViewSet.as_view({
        'post': 'replace_content_with_diagram'
    }), name='replace-content-with-diagram'),
]