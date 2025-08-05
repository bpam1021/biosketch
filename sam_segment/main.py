from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from segment_anything import sam_model_registry, SamAutomaticMaskGenerator
import numpy as np
import uvicorn
import os
import cv2
import torch

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load SAM checkpoint
checkpoint_path = os.path.join(os.path.dirname(__file__), "sam_vit_l_0b3195.pth")
sam = sam_model_registry["vit_l"](checkpoint=checkpoint_path)
sam.to("cpu")

# Configured for reasonable segmentation granularity
mask_generator = SamAutomaticMaskGenerator(
    sam,
    points_per_side=16,
    pred_iou_thresh=0.86,
    stability_score_thresh=0.92,
)

@app.post("/magic-select/")
async def magic_select(image: UploadFile = File(...)):
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    image_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image_np is None:
        return {"error": "Invalid image"}

    # Generate all masks
    all_masks = mask_generator.generate(image_np)

    min_area = 1000
    max_segments = 5
    # Filter out small regions and keep the 2 largest masks
    filtered_masks = sorted(
        [m for m in all_masks if m["area"] > min_area],
        key=lambda x: x["area"],
        reverse=True
    )[:max_segments]

    result = []
    for mask in filtered_masks:
        segmentation = mask["segmentation"]
        contours, _ = cv2.findContours(segmentation.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        polygons = [contour[:, 0, :].tolist() for contour in contours if contour.shape[0] >= 3]

        result.append({
            "bbox": mask["bbox"],
            "area": mask["area"],
            "stability_score": mask["stability_score"],
            "predicted_iou": mask["predicted_iou"],
            "segmentation": polygons,
        })

    return {"masks": result}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001)
