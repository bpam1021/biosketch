import os
import gc
import tempfile
import numpy as np
from PIL import Image
from celery import shared_task
from gtts import gTTS
from django.conf import settings
from django.core.files import File
from moviepy.video.VideoClip import ImageClip
from moviepy.audio.io.AudioFileClip import AudioFileClip
from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
from moviepy.video.fx import resize
from django.core.files.base import ContentFile
from users.models import Presentation, PresentationExportLog
from users.utils.export_helpers import render_pdf, render_pptx
import traceback

def zoom_in_effect(clip, zoom_factor=1.05):
    return clip.fx(resize.resize, lambda t: 1 + (zoom_factor - 1) * (t / clip.duration))

def apply_manual_crossfade(clip, fade_duration):
    clip = clip.set_opacity(1)
    mask = clip.to_mask()

    def fade(t):
        return np.minimum(1, np.maximum(0, t / fade_duration))

    mask = mask.fl(lambda gf, t: gf(t) * fade(t), apply_to=["mask"])
    clip.mask = mask
    return clip

@shared_task
def export_presentation_pdf_task(pres_id, slide_ids=None):
    pres = Presentation.objects.get(pk=pres_id)
    slides = pres.slides.all()
    if slide_ids:
        slides = slides.filter(id__in=slide_ids)

    try:
        pdf_stream = render_pdf(pres, slides=slides.order_by("order"))
        size = pdf_stream.getbuffer().nbytes
        if size < 1000:
            print(f"[PDF Export Error] Exported buffer too small ({size} bytes)")
            return
    except Exception as e:
        print(f"[PDF Export Error] {e}")
        return

    pres.export_format = "pdf"
    pres.is_exported = True
    pres.exported_file.save(f"{pres.title}.pdf", ContentFile(pdf_stream.getvalue()))
    pres.save(update_fields=["export_format", "is_exported", "exported_file"])


@shared_task
def export_presentation_pptx_task(pres_id, slide_ids=None):
    pres = Presentation.objects.get(pk=pres_id)
    slides = pres.slides.all()
    if slide_ids:
        slides = slides.filter(id__in=slide_ids)

    try:
        pptx_stream = render_pptx(pres, slides=slides.order_by("order"))
        size = pptx_stream.getbuffer().nbytes
        if size < 1000:
            print(f"[PPTX Export Error] Exported buffer too small ({size} bytes)")
            return
    except Exception as e:
        print(f"[PPTX Export Error] {e}")
        return

    pres.export_format = "pptx"
    pres.is_exported = True
    pres.exported_file.save(f"{pres.title}.pptx", ContentFile(pptx_stream.getvalue()))
    pres.save(update_fields=["export_format", "is_exported", "exported_file"])


@shared_task
def export_presentation_video_task(pres_id, slide_ids=None, narration_mode="slide"):
    pres = Presentation.objects.prefetch_related("slides").get(pk=pres_id)
    log_entry = PresentationExportLog.objects.create(user=pres.user, presentation=pres, export_format="mp4", success=False)

    slides_qs = pres.slides.all()
    if slide_ids:
        slides_qs = slides_qs.filter(id__in=slide_ids)
    ordered_slides = slides_qs.order_by("order")

    target_size = (1920, 1080)
    default_slide_duration = 2.5
    crossfade_duration = 1.0

    slide_clips = []
    temp_audio_files = []
    audio_clips_to_close = []

    for idx, slide in enumerate(ordered_slides):
        if not slide.rendered_image or not slide.rendered_image.storage.exists(slide.rendered_image.name):
            print(f"[Video Export] Skipping slide {slide.id} (missing image)")
            continue

        try:
            with slide.rendered_image.open("rb") as f:
                img = Image.open(f).convert("RGB").resize(target_size)
                arr = np.array(img)
        except Exception as e:
            print(f"[Video Export] Failed to load image: {e}")
            continue

        slide_text = (slide.description or f"Slide {idx+1}").strip()
        duration = default_slide_duration
        audio_clip = None

        if narration_mode == "slide" and slide_text:
            try:
                tts = gTTS(slide_text)
                temp_audio = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
                tts.save(temp_audio.name)
                audio_clip = AudioFileClip(temp_audio.name)
                duration = audio_clip.duration or default_slide_duration
                audio_clips_to_close.append(audio_clip)
                temp_audio_files.append(temp_audio.name)
            except Exception as e:
                print(f"[Audio Error] Slide {idx+1}: {e}")

        try:
            clip = ImageClip(arr).set_duration(duration).set_opacity(1)
            clip = zoom_in_effect(clip)
            if audio_clip:
                clip = clip.set_audio(audio_clip)
            slide_clips.append({"clip": clip, "duration": duration})
        except Exception as e:
            print(f"[Clip Error] Slide {idx+1}: {e}")

    if narration_mode == "full":
        full_text = " ".join((s.description or f"Slide {i+1}" for i, s in enumerate(ordered_slides))).strip()
        full_audio_clip = None
        if full_text:
            try:
                tts = gTTS(full_text)
                temp_audio = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
                tts.save(temp_audio.name)
                full_audio_clip = AudioFileClip(temp_audio.name)
                audio_clips_to_close.append(full_audio_clip)
                temp_audio_files.append(temp_audio.name)
            except Exception as e:
                print(f"[Full Audio Error] {e}")
                full_audio_clip = None
    else:
        full_audio_clip = None

    if not slide_clips:
        print("[Video Export] No clips to render.")
        log_entry.save()
        return None

    try:
        composite_elements = []
        current_start = 0
        for idx, slide in enumerate(slide_clips):
            clip = slide["clip"]
            duration = slide["duration"]
            if idx > 0:
                clip = apply_manual_crossfade(clip, crossfade_duration)
            clip = clip.set_start(current_start)
            composite_elements.append(clip)
            current_start += duration - crossfade_duration

        final_duration = current_start + crossfade_duration
        video = CompositeVideoClip(composite_elements, size=target_size).set_duration(final_duration)

        if full_audio_clip:
            video = video.set_audio(full_audio_clip)

        output_path = os.path.join(settings.MEDIA_ROOT, "exports", f"{pres.title}.mp4")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        video.write_videofile(
            output_path,
            codec="libx264",
            fps=24,
            audio_codec="aac",
            remove_temp=True,
            logger=None
        )
        video.close()

        with open(output_path, "rb") as f:
            pres.exported_file.save(os.path.basename(output_path), File(f), save=False)

        pres.export_format = "mp4"
        pres.is_exported = True
        pres.save(update_fields=["exported_file", "export_format", "is_exported"])
        log_entry.success = True
        log_entry.save()

    except Exception as e:
        print(f"[Video Export Error] {e}")
        log_entry.success = False
        log_entry.save()

    for ac in audio_clips_to_close:
        try:
            ac.close()
            if hasattr(ac, "reader") and hasattr(ac.reader, "close_proc"):
                ac.reader.close_proc()
        except:
            pass
    for path in temp_audio_files:
        try:
            os.remove(path)
        except:
            pass
    gc.collect()
