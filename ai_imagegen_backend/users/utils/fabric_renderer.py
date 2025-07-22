from PIL import Image
import json
import requests
from io import BytesIO

def render_fabric_canvas(canvas_json: str, width=1920, height=1080) -> Image.Image:
    data = json.loads(canvas_json or '{}')
    base = Image.new("RGB", (width, height), "white")

    for obj in data.get("objects", []):
        if obj.get("type", "").lower() == "image":
            url = obj.get("src")
            if not url:
                continue
            try:
                res = requests.get(url)
                res.raise_for_status()
                img = Image.open(BytesIO(res.content)).convert("RGBA")
                img = img.resize((width, height), Image.BICUBIC)

                left = int(obj.get("left", 0))
                top = int(obj.get("top", 0))

                base.paste(img, (left, top), img)
            except Exception as e:
                print(f"[Image Load Error] {url} - {e}")
                continue

    return base

