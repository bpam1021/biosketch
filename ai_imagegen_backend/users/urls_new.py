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
    MediaAssetViewSet, DiagramElementViewSet, 
    PresentationExportViewSet, PresentationTypeViewSet
)

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
router.register('diagrams', DiagramElementViewSet, basename='diagrams')
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
]