import { useEffect, useState, useCallback, useRef } from "react";
import * as fabric from "fabric";
import { EraserBrush } from "@erase2d/fabric";
import { FiMove, FiEdit3, FiSquare, FiCircle, FiType, FiSliders, FiStar, FiBook, FiTrash, FiTrash2, FiDroplet, FiMinus, FiChevronDown, FiCrop, FiShieldOff, FiTool, FiSettings, FiArrowRight, FiLink, FiLink2 } from "react-icons/fi";
import { truncate } from "../helper/utility";
import { removeBackground, removeText } from "../api/imageApi";

interface ImageEditProps {
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
  layerPanelRef?: React.RefObject<{ refreshLayers: () => void }>;
  onObjectSelect: (selectedObject: fabric.Object | null) => void;
}

const ImageEdit: React.FC<ImageEditProps> = ({ canvasRef, layerPanelRef, onObjectSelect }) => {
  const [selectedTool, setSelectedTool] = useState<string>("select");
  const [foregroundColor, setForegroundColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [isBucketMenuOpen, setIsBucketMenuOpen] = useState(false);
  const [isRemoveMenuOpen, setIsRemoveMenuOpen] = useState(false);
  const [cropRect, setCropRect] = useState<fabric.Rect | null>(null);
  const [rectangleCount, setRectangleCount] = useState(1);
  const [circleCount, setCircleCount] = useState(1);
  const [arrowCount, setArrowCount] = useState(1);
  const [lineCount, setLineCount] = useState(1);
  const [, setTextCount] = useState(1);
  const [eraserWidth, setEraserWidth] = useState(25);
  const [showEraserOptions, setShowEraserOptions] = useState(false);
  const [brushWidth, setBrushWidth] = useState(5);
  const [showBrushOptions, setShowBrushOptions] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [isRemovingText, setIsRemovingText] = useState(false);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const lastActiveSelectionRef = useRef<fabric.ActiveSelection | null>(null);

  const toggleShapesMenu = () => {
    setIsShapesMenuOpen((prev) => !prev);
    setIsBucketMenuOpen(false);
    setIsRemoveMenuOpen(false);
    setShowEraserOptions(false);
    setShowBrushOptions(false);
  };

  const toggleBucketMenu = () => {
    setIsBucketMenuOpen((prev) => !prev);
    setIsShapesMenuOpen(false);
    setIsRemoveMenuOpen(false);
    setShowEraserOptions(false);
    setShowBrushOptions(false);
  };

  const toggleRemoveMenu = () => {
    setIsRemoveMenuOpen((prev) => !prev);
    setIsShapesMenuOpen(false);
    setIsBucketMenuOpen(false);
    setShowEraserOptions(false);
    setShowBrushOptions(false);
  };


  const triggerLayerRefresh = () => {
    layerPanelRef?.current?.refreshLayers();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canvasRef.current) return;
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (isCtrlOrCmd && key === "g" && !e.shiftKey) {
        e.preventDefault();
        groupSelectedObjects();
      } else if (isCtrlOrCmd && key === "g" && e.shiftKey) {
        e.preventDefault();
        ungroupSelectedGroup();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line
  }, [canvasRef, selectedObject]);


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".shapes-menu") &&
        !target.closest(".bucket-menu") &&
        !target.closest(".remove-menu") &&
        !target.closest(".menu-root") &&
        !target.closest(".eraser-scroll") &&
        !target.closest(".eraser-btn") &&
        !target.closest(".brush-scroll") &&
        !target.closest(".brush-btn")
      ) {
        setIsShapesMenuOpen(false);
        setIsBucketMenuOpen(false);
        setIsRemoveMenuOpen(false);
        setShowEraserOptions(false);
        setShowBrushOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside); // 👈 Add this

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside); // 👈 Cleanup
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || selectedTool !== "arrow") return;

    let arrowLine: fabric.Line | null = null;
    let arrowHead: fabric.Triangle | null = null;

    const onMouseDown = (opt: fabric.TEvent) => {
      const pointer = canvas.getPointer(opt.e);
      const points: [number, number, number, number] = [pointer.x, pointer.y, pointer.x, pointer.y];
      arrowLine = new fabric.Line(points, {
        stroke: foregroundColor,
        strokeWidth: 3,
        selectable: false,
        evented: false,
        erasable: true,
      });
      canvas.add(arrowLine);
    };

    const onMouseMove = (opt: fabric.TEvent) => {
      if (!arrowLine) return;
      const pointer = canvas.getPointer(opt.e);
      arrowLine.set({ x2: pointer.x, y2: pointer.y });

      if (arrowHead) {
        canvas.remove(arrowHead);
        arrowHead = null;
      }

      const dx = pointer.x - (arrowLine.x1 ?? 0);
      const dy = pointer.y - (arrowLine.y1 ?? 0);
      const angle = Math.atan2(dy, dx);
      arrowHead = new fabric.Triangle({
        width: 12,
        height: 12,
        fill: foregroundColor,
        left: pointer.x,
        top: pointer.y,
        originX: "center",
        originY: "center",
        angle: angle * (180 / Math.PI) + 90,
        selectable: false,
        evented: false,
        erasable: true,
      });
      canvas.add(arrowHead);
      canvas.requestRenderAll();
    };

    const onMouseUp = () => {
      if (arrowLine && arrowHead) {
        const arrowGroup = new fabric.Group([arrowLine, arrowHead], {
          selectable: true,
          evented: true,
          erasable: true,
        });
        arrowGroup.set({ layerLabel: `Arrow ${arrowCount}` });
        (arrowGroup as any).customType = "arrow";
        setArrowCount(prev => prev + 1);
        canvas.add(arrowGroup);
        canvas.setActiveObject(arrowGroup);
        canvas.remove(arrowLine);
        canvas.remove(arrowHead);
        canvas.requestRenderAll();
        triggerLayerRefresh();
      }
      arrowLine = null;
      arrowHead = null;
      setSelectedTool("select");
    };

    canvas.on("mouse:down", onMouseDown);
    canvas.on("mouse:move", onMouseMove);
    canvas.on("mouse:up", onMouseUp);

    return () => {
      canvas.off("mouse:down", onMouseDown);
      canvas.off("mouse:move", onMouseMove);
      canvas.off("mouse:up", onMouseUp);
    };
  }, [selectedTool, foregroundColor]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const handleObjectSelection = () => {
      const activeObject = canvas.getActiveObject();
      setSelectedObject(activeObject || null);
      if (onObjectSelect) onObjectSelect(activeObject || null);
      if (activeObject && activeObject.type === "activeSelection") {
        lastActiveSelectionRef.current = activeObject as fabric.ActiveSelection;
      } else {
        lastActiveSelectionRef.current = null;
      }
    };

    canvas.on("selection:created", handleObjectSelection);
    canvas.on("selection:updated", handleObjectSelection);
    canvas.on("selection:cleared", () => {
      setSelectedObject(null);
      lastActiveSelectionRef.current = null;
    });

    return () => {
      canvas.off("selection:created", handleObjectSelection);
      canvas.off("selection:updated", handleObjectSelection);
      canvas.off("selection:cleared");
    };
  }, [canvasRef, onObjectSelect]);


  const groupSelectedObjects = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();

    if (activeObjects.length < 2) {
      alert("Select at least two objects to group.");
      return;
    }

    
    const group = new fabric.Group(activeObjects);
    
    canvas.discardActiveObject();
    activeObjects.forEach((obj) => canvas.remove(obj));
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    triggerLayerRefresh();
    setSelectedObject(group);
  }, [canvasRef]);


  const ungroupSelectedGroup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const active = canvas.getActiveObject();
    if (!active || active.type !== "group") return;

    const group = active as fabric.Group;
    const groupMatrix = group.calcTransformMatrix();
    const groupAngle = group.angle ?? 0;

    const items = group.getObjects();
    canvas.remove(group);

    const ungroupedObjects: fabric.Object[] = [];

    (async () => {
      for (const obj of items) {
        // Apply transformation
        const originalCenter = obj.getCenterPoint();
        const transformed = fabric.util.transformPoint(originalCenter, groupMatrix);

        const cloned: fabric.Object = await obj.clone();
        cloned.set({
          left: transformed.x,
          top: transformed.y,
          originX: 'center',
          originY: 'center',
          angle: (obj.angle ?? 0) + groupAngle,
          scaleX: (obj.scaleX ?? 1) * (group.scaleX ?? 1),
          scaleY: (obj.scaleY ?? 1) * (group.scaleY ?? 1),
        });
        cloned.setCoords();
        canvas.add(cloned);
        ungroupedObjects.push(cloned);
      }

      if (ungroupedObjects.length === items.length) {
        const selection = new fabric.ActiveSelection(ungroupedObjects, { canvas });
        canvas.setActiveObject(selection);
        canvas.requestRenderAll();
        setSelectedObject(selection);
        triggerLayerRefresh();
      }
    })();

    canvas.discardActiveObject();
  }, [canvasRef]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // Clean up any previous brush listeners
    canvas.off("path:created");

    switch (selectedTool) {
      case "brush":
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = foregroundColor;
        canvas.freeDrawingBrush.width = brushWidth;

        // Make all new brush strokes erasable
        canvas.on("path:created", (e) => {
          if (e.path) {
            e.path.set({ erasable: true });
          }
        });
        break;

      case "eraser":
        const eraserBrush = new EraserBrush(canvas);
        eraserBrush.width = eraserWidth;
        canvas.freeDrawingBrush = eraserBrush;
        canvas.isDrawingMode = true;
        break;

      default:
        canvas.isDrawingMode = false;
        break;
    }

    canvas.renderAll();

    if (selectedTool === "crop") {
      startCrop();
    } else {
      cancelCrop();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelCrop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      canvas.off("path:created"); // important to avoid multiple bindings
    };
  }, [brushWidth, eraserWidth, selectedTool, foregroundColor, canvasRef]);


  const startCrop = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    if (cropRect) {
      canvas.remove(cropRect);
    }

    const rect = new fabric.Rect({
      left: 50,
      top: 50,
      width: 200,
      height: 150,
      fill: "rgba(255,255,255,0.3)",
      selectable: true,
      hasBorders: true,
      hasControls: true,
    });

    setCropRect(rect);
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  const cancelCrop = () => {
    if (!canvasRef.current || !cropRect) return;
    const canvas = canvasRef.current;

    canvas.remove(cropRect);
    setCropRect(null);
    setSelectedTool("select");
    canvas.renderAll();
  };

  const applyCrop = async () => {
    if (!canvasRef.current || !cropRect) return;
    const canvas = canvasRef.current;

    const activeCropRect = canvas.getActiveObject() as fabric.Rect | null;
    if (!activeCropRect) {
      console.warn("No crop rectangle selected.");
      return;
    }

    const cropLeft = activeCropRect.left!;
    const cropTop = activeCropRect.top!;
    const cropWidth = activeCropRect.width! * (activeCropRect.scaleX || 1);
    const cropHeight = activeCropRect.height! * (activeCropRect.scaleY || 1);

    const croppedDataUrl = canvas.toDataURL({
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight,
      format: "png",
      multiplier: 1,
    });

    canvas.clear();
    canvas.setDimensions({ width: cropWidth, height: cropHeight });

    try {
      const croppedImage = await fabric.Image.fromURL(croppedDataUrl, { crossOrigin: "anonymous" });

      croppedImage.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
      });

      canvas.backgroundImage = croppedImage;
      canvas.requestRenderAll();
    } catch (error) {
      console.error("Error applying cropped canvas:", error);
    }

    setCropRect(null);
  };

  const addText = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const text = new fabric.Textbox("Sample Text", {
      left: canvas.getWidth() * 0.1,
      top: canvas.getHeight() * 0.1,
      fontSize: canvas.getWidth() * 0.025, // Scale font size to width
      fill: foregroundColor,
      erasable: true,
    });
    text.set({ layerLabel: `Text: ${truncate("Sample Text", 12)}` });
    setTextCount(prev => prev + 1);
    canvas.add(text);
    canvas.setActiveObject(text);
    onObjectSelect(text);
    triggerLayerRefresh();
  };


  const addRectangle = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = new fabric.Rect({
      left: canvas.getWidth() * 0.2,
      top: canvas.getHeight() * 0.2,
      width: canvas.getWidth() * 0.2,
      height: canvas.getHeight() * 0.2,
      fill: foregroundColor,
      erasable: true,
    });
    rect.set({ layerLabel: `Rectangle ${rectangleCount}` });
    setRectangleCount(prev => prev + 1);
    canvas.add(rect);
    canvas.setActiveObject(rect);
    onObjectSelect(rect);
    triggerLayerRefresh();
  };

  const addCircle = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const radius = Math.min(canvas.getWidth(), canvas.getHeight()) * 0.1;

    const circle = new fabric.Circle({
      left: canvas.getWidth() * 0.3,
      top: canvas.getHeight() * 0.3,
      radius: radius,
      fill: foregroundColor,
      erasable: true,
    });
    circle.set({ layerLabel: `Circle ${circleCount}` });
    setCircleCount(prev => prev + 1);
    canvas.add(circle);
    canvas.setActiveObject(circle);
    onObjectSelect(circle);
    triggerLayerRefresh();
  };

  const addLine = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.getWidth();
    const height = canvas.getHeight();

    const line = new fabric.Line(
      [width * 0.1, height * 0.5, width * 0.5, height * 0.5],
      {
        stroke: foregroundColor,
        strokeWidth: Math.max(2, width * 0.002),
        erasable: true,
      }
    );
    line.set({ layerLabel: `Line ${lineCount}` });
    setLineCount(prev => prev + 1);
    canvas.add(line);
    canvas.setActiveObject(line);
    onObjectSelect(line);
    triggerLayerRefresh();
  };

  const deleteSelected = () => {
    if (!canvasRef.current) return;
    const activeObject = canvasRef.current.getActiveObject();
    if (activeObject) {
      canvasRef.current.remove(activeObject);
      triggerLayerRefresh();
    }
  };

  const getOrCreateBackground = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    let backgroundObj = canvas.getObjects().find(
      (obj) => obj.get("customType") === "background"
    ) as fabric.Rect | undefined;

    if (!backgroundObj) {
      backgroundObj = new fabric.Rect({
        left: 0,
        top: 0,
        width: canvas.width!,
        height: canvas.height!,
        fill: backgroundColor,
        selectable: false,
        evented: false,
        erasable: true,
      });

      backgroundObj.set("customType", "background");

      canvas.add(backgroundObj);

      canvas._objects = [backgroundObj, ...canvas._objects.filter(obj => obj !== backgroundObj)];
    } else {
      backgroundObj.set("erasable", true);
    }

    return backgroundObj;
  };

  const fillCanvasBackground = () => {
    const backgroundObj = getOrCreateBackground();
    if (backgroundObj) {
      backgroundObj.set({
        fill: foregroundColor,
        erasable: true,
      });
      canvasRef.current?.renderAll();
    }
  };

  const applyGradientBackground = () => {
    const backgroundObj = getOrCreateBackground();
    if (!backgroundObj) return;

    const gradient = new fabric.Gradient({
      type: "linear",
      coords: { x1: 0, y1: 0, x2: canvasRef.current!.width!, y2: 0 },
      colorStops: [
        { offset: 0, color: foregroundColor },
        { offset: 1, color: backgroundColor },
      ],
    });

    backgroundObj.set({
      fill: gradient,
      erasable: true,
    });
    canvasRef.current?.renderAll();
  };

  const handleRemoveBackground = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const selectedObject = canvas.getActiveObject();
    if (!selectedObject) {
      console.warn("No image selected for background removal.");
      return;
    }

    const dataURL = selectedObject.toDataURL({ format: "png", multiplier: 1 });
    const blob = await (await fetch(dataURL)).blob();
    const formData = new FormData();
    formData.append("image", blob, "uploaded-image.png");

    try {
      setIsRemovingBackground(true);
      const response = await removeBackground(blob);
      const imageBlob = response.data;
      const imageUrl = URL.createObjectURL(imageBlob);
      const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: "anonymous" });
      img.set({
        left: selectedObject.left ?? 100,
        top: selectedObject.top ?? 100,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        customType: "mainImage",
      });
      canvas.remove(selectedObject);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    } catch (error) {
      console.error("❌ Background removal failed:", error);
    }
  };

  const handleRemoveText = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const selectedObject = canvas.getActiveObject();
    if (!selectedObject) {
      console.warn("⚠️ No image selected for text removal.");
      return;
    }

    const dataURL = selectedObject.toDataURL({ format: "png", multiplier: 1 });
    const blob = await (await fetch(dataURL)).blob();
    const formData = new FormData();
    formData.append("image", blob, "uploaded-image.png");

    try {
      setIsRemovingText(true);
      const response = await removeText(blob);
      const imageBlob = response.data;
      const imageUrl = URL.createObjectURL(imageBlob);
      const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: "anonymous" });
      img.set({
        left: selectedObject.left ?? 100,
        top: selectedObject.top ?? 100,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        customType: "cleanedImage",
      });
      canvas.remove(selectedObject);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    } catch (error) {
      console.error("❌ Text removal failed:", error);
    } finally {
      setIsRemovingText(false);
    }
  };

  return (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 p-2 z-10">
      {/* Move Button */}
      <button
        onClick={() => setSelectedTool("select")}
        className={`flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white text-xs font-medium shadow-md
          ${selectedTool === "select" ? "bg-blue-600 border-blue-400 shadow-blue-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500"}`}
      >
        <FiMove size={20} />
      </button>

      {/* Text Button */}
      <button
        onClick={addText}
        className={`flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white text-xs font-medium shadow-md
          ${selectedTool === "text" ? "bg-blue-600 border-blue-400 shadow-blue-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500"}`}
      >
        <FiType size={20} />
      </button>

      <div className="relative">
        <button
          onClick={toggleShapesMenu}
          className={`flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white text-xs font-medium
            ${selectedTool === "shapes" ? "bg-blue-600 border-blue-400 shadow-blue-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500"}`}
        >
          <FiStar size={20} />
          <FiChevronDown size={12} className="ml-1" />
        </button>
        {isShapesMenuOpen && (
          <div className="absolute left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-1 flex flex-col z-10 shapes-menu">
            <button onClick={addRectangle} className="dropdown-btn flex flex-row gap-4 p-2">
              <FiSquare size={20} /> Rectangle
            </button>
            <button onClick={addCircle} className="dropdown-btn flex flex-row gap-4 p-2">
              <FiCircle size={20} /> Circle
            </button>
            <button onClick={addLine} className="dropdown-btn flex flex-row gap-4 p-2">
              <FiMinus size={20} /> Line
            </button>
          </div>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => setSelectedTool("arrow")}
          className={`flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white text-xs font-medium shadow-md
    ${selectedTool === "arrow" ? "bg-blue-600 border-blue-400 shadow-blue-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500"}`}
        >
          <FiArrowRight size={20} />
        </button>
      </div>
      {/* Brush Tool Button */}
      <div className="relative">
        <button
          onClick={() => {
            setSelectedTool("brush");
            setShowBrushOptions(true);
          }}
          className={`brush-btn flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white text-xs font-medium shadow-md
      ${selectedTool === "brush" ? "bg-blue-600 border-blue-400 shadow-blue-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500"}`}
        >
          <FiEdit3 size={20} />
        </button>

        {showBrushOptions && (
          <div className="brush-scroll absolute top-14 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-md px-2 py-1 z-20 shadow-lg w-36 transition duration-300 ease-in-out">
            <label className="text-xs text-gray-300">Brush Size: {brushWidth}</label>
            <input
              type="range"
              min={1}
              max={100}
              value={brushWidth}
              onChange={(e) => setBrushWidth(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        )}
      </div>


      {/* Crop Tool Button */}
      <button
        onClick={() => setSelectedTool("crop")}
        className={`flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white text-xs font-medium shadow-md
          ${selectedTool === "crop" ? "bg-blue-600 border-blue-400 shadow-blue-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500"}`}
      >
        <FiCrop size={20} />
      </button>

      <div className="relative">
        <button
          onClick={toggleBucketMenu}
          className={`flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white text-xs font-medium shadow-md
            ${selectedTool === "bucket" ? "bg-blue-600 border-blue-400 shadow-blue-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500"}`}
        >
          <FiDroplet size={20} />
          <FiChevronDown size={12} className="ml-1" />
        </button>
        {isBucketMenuOpen && (
          <div className="absolute left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-1 flex flex-col z-10 bucket-menu">
            <button onClick={fillCanvasBackground} className="dropdown-btn flex flex-row gap-4 p-2">
              <FiTrash size={20} /> Bucket
            </button>
            <button onClick={applyGradientBackground} className="dropdown-btn flex flex-row gap-4 p-2">
              <FiSliders size={20} /> Gradient
            </button>
          </div>
        )}
      </div>

      {/* Eraser Tool Button */}
      <div className="relative">
        {/* Eraser Button */}
        <button
          onClick={() => { setSelectedTool("eraser"); setShowEraserOptions(true); }}
          className={`eraser-btn flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white text-xs font-medium shadow-md
      ${selectedTool === "eraser" ? "bg-blue-600 border-blue-400 shadow-blue-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500"}`}
        >
          <FiBook size={20} />
        </button>

        {showEraserOptions && (
          <div className="eraser-scroll absolute top-14 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-md px-2 py-1 z-20 shadow-lg w-36 transition duration-300 ease-in-out">
            <label className="text-xs text-gray-300">Eraser Size: {eraserWidth}</label>
            <input
              type="range"
              min={5}
              max={100}
              value={eraserWidth}
              onChange={(e) => setEraserWidth(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        )}
      </div>


      {/* Delete Selected Object Button */}
      <button
        onClick={deleteSelected}
        className="flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white text-xs font-medium shadow-md
          bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500"
      >
        <FiTrash2 size={20} />
      </button>

      <div className="relative">
        <button
          onClick={toggleRemoveMenu}
          className={`flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white text-xs font-medium shadow-md
            ${selectedTool === "removes" ? "bg-blue-600 border-blue-400 shadow-blue-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500"}`}
        >
          <FiSettings size={20} />
          <FiChevronDown size={12} className="ml-1" />
        </button>
        {isRemoveMenuOpen && (
          <div className="absolute left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-1 flex flex-col z-10 remove-menu">
            <button onClick={handleRemoveBackground} className="dropdown-btn flex flex-row gap-4 p-2" disabled={isRemovingBackground}>
              <FiShieldOff size={20} /> {isRemovingBackground ? "Removing..." : "Remove_Background"}
            </button>
            <button onClick={handleRemoveText} className="dropdown-btn flex flex-row gap-4 p-2" disabled={isRemovingText}>
              <FiTool size={20} /> {isRemovingText ? "Removing..." : "Remove_Text"}
            </button>
          </div>
        )}
      </div>
      {/* {selectedObject && selectedObject.type === "activeSelection" && ( */}
      <button
        onClick={groupSelectedObjects}
        className="flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white bg-gray-800 border-gray-700 hover:bg-blue-600 hover:border-blue-400"
        title="Group selected"
      >
        <FiLink size={20} />
      </button>
      {/* )} */}
      {/* {selectedObject && selectedObject.type === "group" && ( */}
      <button
        onClick={ungroupSelectedGroup}
        className="flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white bg-gray-800 border-gray-700 hover:bg-blue-600 hover:border-blue-400"
        title="Ungroup"
      >
        <FiLink2 size={20} />
      </button>
      {/* )} */}
      {/* Color Pickers */}
      <div className="flex items-center">
        <input
          type="color"
          value={foregroundColor}
          onChange={(e) => setForegroundColor(e.target.value)}
          className="w-8 h-8 cursor-pointer"
        />
      </div>
      <div className="flex items-center">
        <input
          type="color"
          value={backgroundColor}
          onChange={(e) => setBackgroundColor(e.target.value)}
          className="w-8 h-8 cursor-pointer"
        />
      </div>

      {/* Apply Crop Button */}
      {selectedTool === "crop" && (
        <button
          onClick={applyCrop}
          className="flex items-center justify-center w-12 h-12 rounded-lg border transition-all text-white text-xs font-medium shadow-md
            bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500"
        >
          Apply Crop
        </button>
      )}
    </div>
  );

};

export default ImageEdit;
