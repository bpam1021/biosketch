import { useState, useRef, useEffect, useCallback } from "react";
import * as fabric from "fabric";
import Sidebar from "../components/Sidebar";
import LayerPanel, { LayerPanelRef } from "../components/Editor/LayerPanel";
import PartialSidebar from "../components/PartialSidebar";
import ImageEdit from "../components/ImageEdit";
import { FiUpload, FiDownload, FiCornerUpLeft, FiCornerUpRight, FiZoomIn, FiZoomOut } from "react-icons/fi";
import { useGlobal } from "../context/GlobalContext";
import { magicSegment } from "../api/segmentApi";
import { editImageWithPrompt } from "../api/imageEditApi";
import { removeBackground } from "../api/imageApi";

const ImageEditingTool = () => {
  const [, setUploadedImage] = useState<string | null>(null);
  const [, setUploadedFileName] = useState<string | null>(null);
  const [isEditDisabled, setIsEditDisabled] = useState<boolean>(true);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const [, forceRender] = useState(false);
  const [activeTab, setActiveTab] = useState("Templates");
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const { canvasImportImages, setCanvasImportImages } = useGlobal();
  const clipboard = useRef<fabric.Object | null>(null);
  const layerPanelRef = useRef<LayerPanelRef>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const origDimensions = useRef<{ width: number, height: number } | null>(null);
  const [zoomPercentage, setZoomPercentage] = useState(100);
  const [fabricImgRef, setFabricImgRef] = useState<fabric.Image | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [isInsertingTemplate, setIsInsertingTemplate] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [, setIsRemovingBackground] = useState(false);

  const triggerLayerRefresh = () => {
    layerPanelRef?.current?.refreshLayers();
  };

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    left: number;
    top: number;
    object: fabric.Object | null;
  }>({
    visible: false,
    left: 0,
    top: 0,
    object: null,
  });

  useEffect(() => {
    const hideMenu = () => {
      setContextMenu(prev => ({ ...prev, visible: false }));
    };
    document.addEventListener("click", hideMenu);
    return () => document.removeEventListener("click", hideMenu);
  }, []);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const canvasEl = container.querySelector("#canvas") as HTMLCanvasElement;
    if (!canvasEl) return;

    const canvas = new fabric.Canvas(canvasEl, {
      backgroundColor: "",
      preserveObjectStacking: true,
      selection: true,
      erasable: true,
      fireRightClick: true,
    });


    if (!origDimensions.current) {
      origDimensions.current = { width: canvas.getWidth(), height: canvas.getHeight() };
    }

    canvasRef.current = canvas;
    // ✅ Suppress default browser menu at all levels
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    canvas.getElement().addEventListener("contextmenu", preventContextMenu);
    container.addEventListener("contextmenu", preventContextMenu);

    canvas.on("mouse:down", (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.button === 2) {
        const target = opt.target;

        setContextMenu({
          visible: true,
          left: evt.clientX,
          top: evt.clientY,
          object: target ?? null,
        });

        if (target) {
          canvas.setActiveObject(target);
        }
      }
    });

    const resizeCanvas = () => {
      const { clientWidth } = container;
      const width = clientWidth;
      const height = width / 1.5; // Maintain aspect ratio
      canvas.setWidth(width);
      canvas.setHeight(height);
      canvas.renderAll();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.getElement().removeEventListener("contextmenu", preventContextMenu);
      container.removeEventListener("contextmenu", preventContextMenu);
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isCtrlOrCmd && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (isCtrlOrCmd && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (isCtrlOrCmd && key === "c") {
        e.preventDefault();
        const active = canvas.getActiveObject();
        if (active) clipboard.current = await active.clone();
      } else if (isCtrlOrCmd && key === "x") {
        e.preventDefault();
        const active = canvas.getActiveObject();
        if (active) {
          clipboard.current = await active.clone();
          canvas.remove(active);
          canvas.requestRenderAll();
          triggerLayerRefresh();
        }
      } else if (isCtrlOrCmd && key === "v") {
        e.preventDefault();
        if (clipboard.current) {
          const clonedObj = await clipboard.current.clone();
          clonedObj.set({
            left: (clonedObj.left || 0) + 15,
            top: (clonedObj.top || 0) + 15,
          });
          if (clonedObj.type === "activeSelection") {
            (clonedObj as fabric.ActiveSelection).forEachObject((obj) =>
              canvas.add(obj)
            );
          } else {
            canvas.add(clonedObj);
          }
          canvas.setActiveObject(clonedObj);
          canvas.renderAll();
          triggerLayerRefresh();
        }
      } else if (e.key === "Delete") {
        const obj = canvas.getActiveObject();
        if (obj) {
          canvas.remove(obj);
          canvas.discardActiveObject();
          canvas.renderAll();
          triggerLayerRefresh();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasImportImages.length === 0) return;

    const loadImagesToCanvas = async () => {
      for (const url of canvasImportImages) {
        setIsImageLoading(true);
        try {
          const img = await fabric.Image.fromURL(url, { crossOrigin: "anonymous" });
          img.scaleToWidth(canvas.getWidth() * 0.4);
          img.scaleToHeight(canvas.getHeight() * 0.4);
          img.set({
            left: Math.random() * canvas.getWidth() * 0.6,
            top: Math.random() * canvas.getHeight() * 0.6,
            selectable: true,
            erasable: true,
            layerLabel: "Imported Image",
          });

          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.fire("object:added", { target: img });
          canvas.renderAll();
          handleObjectSelect(img);
          triggerLayerRefresh();
          setIsEditDisabled(false);
        } catch (error) {
          console.error("Error loading image to canvas:", url, error);
        } finally {
          setIsImageLoading(false);
        }
      }
      setCanvasImportImages([]); // clear context
    };

    loadImagesToCanvas();
  }, [canvasImportImages]);

  const removeBackgroundFromImage = async (image: fabric.Image) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const dataURL = image.toDataURL({ format: "png", multiplier: 1 });
    const blob = await (await fetch(dataURL)).blob();

    try {
      setIsRemovingBackground(true);
      const response = await removeBackground(blob);
      const imageBlob = response.data;
      const imageUrl = URL.createObjectURL(imageBlob);
      const origWidth = image.getScaledWidth();
      const origHeight = image.getScaledHeight();

      const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: "anonymous" });

      const scaleToMatch = Math.min(
        origWidth / img.width!,
        origHeight / img.height!
      );
      img.scale(scaleToMatch);

      img.set({
        left: image.left ?? 100,
        top: image.top ?? 100,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        customType: "mainImage",
      });

      canvas.remove(image);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    } catch (error) {
      console.error("❌ Background removal failed:", error);
    } finally {
      setIsRemovingBackground(false);
    }
  };

  const handleEditImageWithPrompt = async () => {
    if (!selectedObject || selectedObject.type !== "image" || !editPrompt) return;

    setIsEditingImage(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // ✅ Safely convert fabric image to File
      const imageObj = selectedObject as fabric.Image;
      const dataUrl = imageObj.toDataURL({ format: "png" });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "input.png", { type: "image/png" });

      // ✅ Use centralized API function
      const base64 = await editImageWithPrompt(file, editPrompt);
      const editedDataUrl = `data:image/png;base64,${base64}`;

      const editedImage = await fabric.Image.fromURL(editedDataUrl, { crossOrigin: "anonymous" });
      editedImage.set({
        left: imageObj.left,
        top: imageObj.top,
        scaleX: imageObj.scaleX,
        scaleY: imageObj.scaleY,
        selectable: true,
        layerLabel: "AI Edited Image",
      } as any);

      canvas.add(editedImage);
      canvas.setActiveObject(editedImage);
      canvas.renderAll();
      await removeBackgroundFromImage(editedImage);
    } catch (err) {
      console.error("❌ OpenAI image edit failed:", err);
      alert("Failed to edit image with AI.");
    } finally {
      setIsEditingImage(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!e.target?.result || !canvasRef.current) return;

      const canvas = canvasRef.current;
      setUploadedImage(e.target.result as string);
      setUploadedFileName(file.name);

      try {
        const fabricImg = await fabric.Image.fromURL(e.target.result as string, {
          crossOrigin: "anonymous",
        });

        const maxWidth = canvas.getWidth() * 0.4;
        const maxHeight = canvas.getHeight() * 0.4;
        const scale = Math.min(
          maxWidth / fabricImg.width!,
          maxHeight / fabricImg.height!
        );

        fabricImg.scale(scale);
        const offsetX = canvas.getWidth() / 2 - fabricImg.getScaledWidth() / 2;
        const offsetY = canvas.getHeight() / 2 - fabricImg.getScaledHeight() / 2;

        fabricImg.set({
          left: offsetX,
          top: offsetY,
          erasable: true,
          selectable: true,
          layerLabel: "Image Layer",
        } as any);

        canvas.add(fabricImg);
        canvas.setActiveObject(fabricImg);
        canvas.fire("object:added", { target: fabricImg });
        canvas.renderAll();
        handleObjectSelect(fabricImg);
        triggerLayerRefresh();
        setIsEditDisabled(false);
        setFabricImgRef(fabricImg); // Save for segmentation step

      } catch (error) {
        console.error("❌ Error loading image:", error);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSegmentImage = async () => {
    const canvas = canvasRef.current;
    const selected = canvas?.getActiveObject();

    if (!canvas || !selected || selected.type !== "image") {
      alert("Please select an image layer to segment.");
      return;
    }

    setIsSegmenting(true);

    try {
      const imageObj = selected as fabric.Image;
      const scaleX = imageObj.scaleX ?? 1;
      const scaleY = imageObj.scaleY ?? 1;
      const offsetX = imageObj.left ?? 0;
      const offsetY = imageObj.top ?? 0;

      // 🔄 Convert Fabric image to Blob for SAM API
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = imageObj.width!;
      tempCanvas.height = imageObj.height!;
      const tempCtx = tempCanvas.getContext("2d");
      const tempImg = new Image();
      tempImg.crossOrigin = "anonymous";
      tempImg.src = imageObj.getSrc();

      await new Promise((resolve) => {
        tempImg.onload = () => {
          tempCtx?.drawImage(tempImg, 0, 0);
          resolve(null);
        };
      });

      const blob = await new Promise<Blob>((resolve) =>
        tempCanvas.toBlob((b) => resolve(b!), "image/png")
      );
      const file = new File([blob], "canvas-image.png", { type: "image/png" });

      // 🧠 Segment the image via backend
      const { masks } = await magicSegment(file);
      const seenBoxes: { x: number; y: number; w: number; h: number }[] = [];

      const iou = (a: any, b: any) => {
        const xA = Math.max(a.x, b.x);
        const yA = Math.max(a.y, b.y);
        const xB = Math.min(a.x + a.w, b.x + b.w);
        const yB = Math.min(a.y + a.h, b.y + b.h);
        const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
        const boxAArea = a.w * a.h;
        const boxBArea = b.w * b.h;
        return interArea / (boxAArea + boxBArea - interArea);
      };

      let addedCount = 0;

      for (let idx = 0; idx < masks.length; idx++) {
        const mask = masks[idx];
        const [x, y, w, h] = mask.bbox;
        const currentBox = { x, y, w, h };

        if (w >= 0.9 * tempCanvas.width && h >= 0.9 * tempCanvas.height) continue;
        if (seenBoxes.some((box) => iou(box, currentBox) > 0.9)) continue;
        if (!Array.isArray(mask.segmentation) || !Array.isArray(mask.segmentation[0])) continue;

        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = tempCanvas.width;
        maskCanvas.height = tempCanvas.height;
        const ctx = maskCanvas.getContext("2d");
        if (!ctx) continue;

        ctx.drawImage(tempImg, 0, 0);
        ctx.globalCompositeOperation = "destination-in";
        ctx.beginPath();
        mask.segmentation[0].forEach(([px, py], i) => {
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();

        const dataUrl = maskCanvas.toDataURL("image/png");
        const partImg = await fabric.Image.fromURL(dataUrl, { crossOrigin: "anonymous" });

        partImg.set({
          left: x * scaleX + offsetX,
          top: y * scaleY + offsetY,
          scaleX: scaleX,
          scaleY: scaleY,
          selectable: true,
          layerLabel: `Segment ${addedCount + 1}`,
        } as any);

        canvas.add(partImg);
        seenBoxes.push(currentBox);
        addedCount++;
      }

      canvas.renderAll();
    } catch (error) {
      console.error("Segmentation failed:", error);
    } finally {
      setIsSegmenting(false);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataURL = canvasRef.current.toDataURL({ format: "png", multiplier: 1 });
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "edited-image.png";
    link.click();
  };

  const saveCanvasState = useCallback(() => {
    if (!canvasRef.current) return;
    const currentState = JSON.stringify(canvasRef.current.toJSON());

    undoStackRef.current.push(currentState);
    redoStackRef.current = []; // clear redo on new action
  }, []);

  const removeCanvasListeners = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.off("object:added", saveCanvasState);
      canvasRef.current.off("object:modified", saveCanvasState);
      canvasRef.current.off("object:removed", saveCanvasState);

      triggerLayerRefresh();
    }
  }, [canvasRef]);

  const addCanvasListeners = () => {
    if (canvasRef.current) {
      canvasRef.current.on("object:added", saveCanvasState);
      canvasRef.current.on("object:modified", saveCanvasState);
      canvasRef.current.on("object:removed", saveCanvasState);
      triggerLayerRefresh();
    }
  };

  const undo = () => {
    const stack = undoStackRef.current;
    if (stack.length < 2 || !canvasRef.current) return;

    const currentState = stack.pop(); // remove current
    if (currentState) redoStackRef.current.unshift(currentState); // save for redo

    const prevState = stack[stack.length - 1];
    removeCanvasListeners();
    canvasRef.current.loadFromJSON(JSON.parse(prevState));
    setTimeout(() => {
      canvasRef.current?.renderAll();
      addCanvasListeners();
      triggerLayerRefresh();
      forceRender((prev) => !prev); // trigger UI update
    }, 0);
  };

  const redo = () => {
    const stack = redoStackRef.current;
    if (stack.length === 0 || !canvasRef.current) return;

    const nextState = stack.shift();
    if (nextState) {
      undoStackRef.current.push(nextState);
      removeCanvasListeners();
      canvasRef.current.loadFromJSON(JSON.parse(nextState));
      setTimeout(() => {
        canvasRef.current?.renderAll();
        addCanvasListeners();
        triggerLayerRefresh();
        forceRender((prev) => !prev);
      }, 0);
    }
  };

  // Listen for changes and save canvas state when object is added, removed, or modified
  useEffect(() => {
    addCanvasListeners();
    return () => removeCanvasListeners(); // Cleanup on unmount
  }, []);

  const handleObjectSelect = (obj: fabric.Object | null) => {
    setSelectedObject(obj);
    if (isInsertingTemplate) return;
    if (!obj) return;

    const type = (obj as any).customType || obj.type;

    if (obj.type === "textbox") {
      setActiveTab("Text");
    } else if (["rect", "circle", "line", "path", "arrow"].includes(type)) {
      setActiveTab("Shapes");
    } else if (type === "image") {
      setActiveTab("Shapes");
    } else {
      setActiveTab("Templates");
    }
  };

  const bringForward = () => {
    const canvas = canvasRef.current;
    if (!canvas || !contextMenu.object) return;

    const obj = contextMenu.object;
    const index = canvas.getObjects().indexOf(obj);
    if (index < canvas.getObjects().length - 1) {
      canvas.remove(obj);
      canvas.insertAt(index + 1, obj);
      canvas.setActiveObject(obj);
      canvas.renderAll();
      layerPanelRef.current?.refreshLayers();
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const sendBackward = () => {
    const canvas = canvasRef.current;
    if (!canvas || !contextMenu.object) return;

    const obj = contextMenu.object;
    const index = canvas.getObjects().indexOf(obj);
    if (index > 0) {
      canvas.remove(obj);
      canvas.insertAt(index - 1, obj);
      canvas.setActiveObject(obj);
      canvas.renderAll();
      layerPanelRef.current?.refreshLayers();
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleZoom = (zoomFactor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let zoom = canvas.getZoom() * zoomFactor;
    zoom = Math.max(0.1, Math.min(zoom, 5));
    canvas.setZoom(zoom);

    // Center the zoom based on the current viewport
    const center = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, zoom);
    setZoomPercentage(Math.round(zoom * 100));
    // Ensure scrollbars are available via container's overflow
    const container = canvas.wrapperEl.parentNode as HTMLElement | null;
    if (container) {
      container.style.overflow = 'auto';  // Set to auto to show scrollbars when necessary
    }
  };

  /** useEffect modified to add zoom-related scrolling */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (opt: any) => {
      const evt = opt.e as WheelEvent;
      evt.preventDefault();
      evt.stopPropagation();

      let zoom = canvas.getZoom();
      zoom *= evt.deltaY > 0 ? 0.9 : 1.1;
      zoom = Math.max(0.1, Math.min(zoom, 5));
      setZoomPercentage(Math.round(zoom * 100));
      // Get the center point for consistent zoom behavior
      const center = canvas.getCenter();
      const point = new fabric.Point(center.left, center.top);

      canvas.zoomToPoint(point, zoom);

      // Adjust CSS styles to create scrolling effect when zoomed
      if (zoom > 1) {
        canvas.wrapperEl.style.overflow = 'auto';
        canvas.wrapperEl.style.width = '100%';
        canvas.wrapperEl.style.height = '100%';
      } else {
        canvas.wrapperEl.style.overflow = 'hidden';
      }
    };

    canvas.on('mouse:wheel', handleWheel);

    return () => {
      canvas.off('mouse:wheel', handleWheel);
    };
  }, []);

  return (
    <div className="flex  bg-gray-100 overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <PartialSidebar
          activeSection="edit"
          canvasRef={canvasRef}
          layerPanelRef={layerPanelRef}
          disabled={isEditDisabled}
          onObjectSelect={handleObjectSelect}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedObject={selectedObject}
          setIsInsertingTemplate={setIsInsertingTemplate}
          isInsertingTemplate={isInsertingTemplate}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-800 text-white shadow-md">
            {/* File Upload Button */}
            <label className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer border border-gray-600">
              <FiUpload />
              <span className="hidden sm:inline">Upload</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>

            {/* Download & Undo/Redo Buttons */}
            <div className="flex items-center gap-2">
              <button onClick={handleDownload} className="toolbar-btn"><FiDownload /></button>
              <button onClick={undo} className="toolbar-btn"><FiCornerUpLeft /></button>
              <button onClick={redo} className="toolbar-btn"><FiCornerUpRight /></button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 border-l border-gray-600 pl-2">
              <button onClick={() => handleZoom(1.1)} className="toolbar-btn"><FiZoomIn /></button>
              <button onClick={() => handleZoom(0.9)} className="toolbar-btn"><FiZoomOut /></button>
              <span className="text-sm text-gray-300">Zoom: {zoomPercentage}%</span>
            </div>

            {/* AI Prompt Input */}
            <div className="flex items-center gap-2 border-l border-gray-600 pl-2 flex-wrap">
              <input
                type="text"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Describe AI edit (e.g., remove antibody)"
                className="w-72 sm:w-96 px-3 py-1 rounded bg-gray-700 border border-gray-600 text-sm text-white"
              />
              <button
                onClick={handleEditImageWithPrompt}
                disabled={!selectedObject || selectedObject.type !== "image" || !editPrompt || isEditingImage}
                className="px-4 py-2 rounded bg-purple-700 hover:bg-purple-600 border border-purple-500 text-sm font-medium disabled:opacity-50"
              >
                {isEditingImage ? "Editing..." : "AI Edit"}
              </button>
            </div>

            {/* Segment Button */}
            <div className="border-l border-gray-600 pl-2">
              <button
                onClick={handleSegmentImage}
                disabled={!fabricImgRef || isSegmenting}
                className="px-4 py-2 rounded bg-green-700 hover:bg-green-600 border border-green-600 text-sm font-medium disabled:opacity-50"
              >
                {isSegmenting ? "Separating..." : "Segment"}
              </button>
            </div>
          </div>
          {isSegmenting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md  w-screen">
              <div className="text-white text-xl font-semibold animate-pulse">Separating image...</div>
            </div>
          )}
          <div className="flex justify-between items-center p-2 bg-gray-800 text-white">
            <ImageEdit canvasRef={canvasRef} layerPanelRef={layerPanelRef} onObjectSelect={handleObjectSelect} />
          </div>
          {isImageLoading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md  w-screen">
              <div className="flex flex-col items-center gap-4">
                {/* Glowing Pulse Ring */}
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 animate-ping opacity-50"></div>
                  <div className="absolute inset-1 rounded-full bg-gray-900 flex items-center justify-center shadow-inner shadow-black">
                    <svg
                      className="h-6 w-6 text-white animate-pulse"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 4v4m0 8v4m8-8h-4M4 12H0m4-4l2.828 2.828M16 16l2.828 2.828M4 16l2.828-2.828M16 8l2.828-2.828"
                      />
                    </svg>
                  </div>
                </div>

                {/* Fancy Text */}
                <p className="text-white text-lg font-semibold tracking-wide animate-pulse">
                  Uploading Image...
                </p>
              </div>
            </div>
          )}
          <div className="relative">
            <div className="absolute top-2 left-2 bg-gray-800 text-white px-3 py-1 rounded-md z-10">
              Zoom: {zoomPercentage}%
            </div>
            <div ref={canvasContainerRef} className="flex-1 relative left-[10px] top-[10px] w-23/24  bg-white overflow-auto">
              <canvas id="canvas" className="block border border-gray-900" />
            </div>
          </div>


        </div>

        <div className="hidden lg:flex flex-col min-w-[240px] max-w-[300px] bg-gray-900 border-l border-gray-700">
          <LayerPanel ref={layerPanelRef} canvasRef={canvasRef} />
        </div>
      </div>
      {contextMenu.visible && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.top,
            left: contextMenu.left,
            zIndex: 9999,
            backgroundColor: "#1f2937", // Tailwind: gray-800
            color: "white",
            padding: "0.5rem",
            borderRadius: "0.25rem",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
          }}
          onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        >
          <button onClick={bringForward}>⬆ Bring Forward</button>
          <br />
          <button onClick={sendBackward}>⬇ Send Backward</button>
        </div>
      )}
    </div>
  );
};

export default ImageEditingTool;