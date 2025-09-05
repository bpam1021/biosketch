import os
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.http import HttpResponse, FileResponse
from django.shortcuts import get_object_or_404
from mimetypes import guess_type
from django.utils import timezone
from users.models import Document, SlidePresentation, PresentationExport
from users.tasks import export_presentation_task


class DocumentExportView(APIView):
    """Export documents to various formats (PDF, DOCX, HTML)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, document_id, export_format):
        """Start document export job"""
        try:
            document = get_object_or_404(Document, id=document_id, created_by=request.user)
            
            # Validate export format
            allowed_formats = ['pdf', 'docx', 'html']
            if export_format not in allowed_formats:
                return Response({
                    'error': f'Invalid export format. Allowed: {", ".join(allowed_formats)}'
                }, status=400)
            
            # Get export settings from request
            settings = request.data.get('settings', {})
            
            # Create export job
            export_job = PresentationExport.objects.create(
                document=document,
                created_by=request.user,
                export_format=export_format,
                settings=settings,
                status='queued',
                expires_at=timezone.now() + timezone.timedelta(hours=24)
            )
            
            # Start export task
            export_presentation_task.delay(export_job.id)
            
            return Response({
                'export_job_id': str(export_job.id),
                'status': 'queued',
                'message': f'Document export to {export_format.upper()} started'
            }, status=202)
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class SlidesPresentationExportView(APIView):
    """Export slide presentations to various formats (PDF, PPTX, HTML, MP4)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, presentation_id, export_format):
        """Start slide presentation export job"""
        try:
            presentation = get_object_or_404(SlidePresentation, id=presentation_id, created_by=request.user)
            
            # Validate export format
            allowed_formats = ['pdf', 'pptx', 'html', 'mp4']
            if export_format not in allowed_formats:
                return Response({
                    'error': f'Invalid export format. Allowed: {", ".join(allowed_formats)}'
                }, status=400)
            
            # Get export settings from request
            settings = request.data.get('settings', {})
            
            # Handle slide selection
            selected_slides = request.data.get('selected_slides', None)
            if selected_slides:
                settings['selected_slides'] = selected_slides
            
            # Video-specific settings
            if export_format == 'mp4':
                settings['duration_per_slide'] = request.data.get('duration_per_slide', 5)
                settings['narration_mode'] = request.data.get('narration_mode', 'slide')
            
            # Create export job
            export_job = PresentationExport.objects.create(
                slide_presentation=presentation,
                created_by=request.user,
                export_format=export_format,
                settings=settings,
                status='queued',
                expires_at=timezone.now() + timezone.timedelta(hours=24)
            )
            
            # Start export task
            export_presentation_task.delay(export_job.id)
            
            return Response({
                'export_job_id': str(export_job.id),
                'status': 'queued',
                'message': f'Slide presentation export to {export_format.upper()} started'
            }, status=202)
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_status_view(request, export_job_id):
    """Check export job status"""
    try:
        # Get the export job first
        export_job = get_object_or_404(PresentationExport, id=export_job_id)
        
        # Check if user has access to this export job
        has_access = False
        if export_job.document and export_job.document.created_by == request.user:
            has_access = True
        elif export_job.slide_presentation and export_job.slide_presentation.created_by == request.user:
            has_access = True
        
        if not has_access:
            return Response({'error': 'Access denied'}, status=403)
        
        download_url = None
        if export_job.status == 'completed' and export_job.file_path:
            download_url = request.build_absolute_uri(export_job.file_path.url)
        
        return Response({
            'export_job_id': str(export_job.id),
            'status': export_job.status,
            'export_format': export_job.export_format,
            'created_at': export_job.created_at,
            'completed_at': export_job.completed_at,
            'download_url': download_url,
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_export_view(request, export_job_id):
    """Download exported file"""
    try:
        export_job = get_object_or_404(PresentationExport, id=export_job_id, created_by=request.user)
        
        if export_job.status != 'completed' or not export_job.file_path:
            return Response({'error': 'Export not ready for download'}, status=404)
        
        # Check if expired
        if timezone.now() > export_job.expires_at:
            return Response({'error': 'Export has expired'}, status=410)
        
        file_path = export_job.file_path.path
        filename = os.path.basename(file_path)
        mime_type, _ = guess_type(file_path)
        
        return FileResponse(
            open(file_path, 'rb'),
            as_attachment=True,
            filename=filename,
            content_type=mime_type or "application/octet-stream"
        )
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_export_jobs_view(request):
    """List user's export jobs"""
    try:
        export_jobs = PresentationExport.objects.filter(
            created_by=request.user
        ).order_by('-created_at')[:20]  # Last 20 exports
        
        jobs_data = []
        for job in export_jobs:
            download_url = None
            if job.status == 'completed' and job.file_path:
                download_url = request.build_absolute_uri(job.file_path.url)
            
            jobs_data.append({
                'export_job_id': str(job.id),
                'status': job.status,
                'export_format': job.export_format,
                'created_at': job.created_at,
                'completed_at': job.completed_at,
                'expires_at': job.expires_at,
                'download_url': download_url,
                'document_title': job.document.title if job.document else None,
                'presentation_title': job.slide_presentation.title if job.slide_presentation else None
            })
        
        return Response({
            'export_jobs': jobs_data,
            'count': len(jobs_data)
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)