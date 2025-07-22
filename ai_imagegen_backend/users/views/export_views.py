import os
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.http import HttpResponse, FileResponse
from django.shortcuts import get_object_or_404
from mimetypes import guess_type
from users.models import Presentation, PresentationExportLog
from users.tasks import (
    export_presentation_video_task,
    export_presentation_pdf_task,
    export_presentation_pptx_task,
)


class ExportPresentationVideoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        pres = Presentation.objects.prefetch_related("slides").filter(user=request.user, pk=pk).first()
        if not pres:
            return Response({"error": "Presentation not found"}, status=404)

        log_entry = PresentationExportLog.objects.create(
            user=request.user, presentation=pres, export_format="mp4", success=False
        )

        slide_ids_str = request.query_params.get("slide_ids")
        slide_ids = None
        if slide_ids_str:
            try:
                slide_ids = [int(sid) for sid in slide_ids_str.split(",")]
            except Exception:
                log_entry.success = False
                log_entry.save()
                return Response({"error": "Invalid slide_ids"}, status=400)

        narration_mode = request.query_params.get("narration_mode", "slide")

        # Reset export state
        pres.is_exported = False
        pres.export_format = "mp4"
        pres.exported_file.delete(save=False)
        pres.save(update_fields=["is_exported", "export_format"])

        export_presentation_video_task.delay(
            pres_id=pres.id,
            slide_ids=slide_ids,
            narration_mode=narration_mode
        )

        log_entry.success = True
        log_entry.save()
        return Response({"detail": "Video export started. You will be notified when it is ready."}, status=202)


class ExportPresentationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, export_format):
        pres = get_object_or_404(Presentation, pk=pk, user=request.user)

        log_entry = PresentationExportLog.objects.create(
            user=request.user, presentation=pres, export_format=export_format, success=False
        )

        slide_ids_str = request.GET.get("slide_ids")
        slide_ids = None
        if slide_ids_str:
            try:
                slide_ids = [int(sid) for sid in slide_ids_str.split(",")]
            except Exception:
                log_entry.success = False
                log_entry.save()
                return HttpResponse("Invalid slide_ids", status=400)

        if export_format == "pptx":
            pres.is_exported = False
            pres.export_format = "pptx"
            pres.exported_file.delete(save=False)
            pres.save(update_fields=["is_exported", "export_format"])
            export_presentation_pptx_task.delay(pres_id=pres.id, slide_ids=slide_ids)

        elif export_format == "pdf":
            pres.is_exported = False
            pres.export_format = "pdf"
            pres.exported_file.delete(save=False)
            pres.save(update_fields=["is_exported", "export_format"])
            export_presentation_pdf_task.delay(pres_id=pres.id, slide_ids=slide_ids)

        else:
            log_entry.success = False
            log_entry.save()
            return HttpResponse("Invalid format", status=400)

        log_entry.success = True
        log_entry.save()
        return Response({"detail": f"{export_format.upper()} export started. You will be notified when it is ready."}, status=202)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_status_view(request, pk):
    pres = get_object_or_404(Presentation, pk=pk, user=request.user)

    download_url = None
    if pres.is_exported and pres.exported_file:
        download_url = request.build_absolute_uri(pres.exported_file.url)

    return Response({
        "is_exported": pres.is_exported,
        "export_format": pres.export_format,
        "download_url": download_url
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def force_download_view(request, pk):
    pres = get_object_or_404(Presentation, pk=pk, user=request.user)

    if not pres.is_exported or not pres.exported_file:
        return Response({"error": "No exported file found"}, status=404)

    file_path = pres.exported_file.path
    filename = os.path.basename(file_path)
    mime_type, _ = guess_type(file_path)

    return FileResponse(
        open(file_path, 'rb'),
        as_attachment=True,
        filename=filename,
        content_type=mime_type or "application/octet-stream"
    )