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

# URL patterns
urlpatterns = [
    path('api/v2/', include(router.urls)),
]