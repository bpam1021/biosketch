import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { EraserBrush } from "@erase2d/fabric";
import { ToolButton } from "./ToolButton";
import {
    FiMove, FiEdit3, FiSquare, FiCircle, FiType, FiSave,
    FiTrash, FiTrash2, FiMinus, FiArrowRight, FiLoader
} from "react-icons/fi";
import { Slide } from "../../types/Presentation";
import { Dialog } from "@headlessui/react";

interface SlideCanvasEditorProps {
    slide: Slide;
    onCanvasSave: (json: string, data_url: string) => void;
    onInteractionChange?: (isEditing: boolean) => void;
}

const CANVAS_WIDTH = 768;
const CANVAS_HEIGHT = 512;

const SlideCanvasEditor: React.FC<SlideCanvasEditorProps> = ({ slide, onCanvasSave, onInteractionChange }) => {
    const canvasRef = useRef<fabric.Canvas | null>(null);
    const canvasElRef = useRef<HTMLCanvasElement | null>(null);
    const canvasIdRef = useRef(0);
    const isLoadingRef = useRef(false);

    const [selectedTool, setSelectedTool] = useState("select");
    const [foregroundColor, setForegroundColor] = useState("#000000");
    const [brushWidth, ] = useState(5);
    const [eraserWidth, ] = useState(25);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const prevCanvas = canvasRef.current;
        if (prevCanvas) {
            try {
                prevCanvas.dispose();
            } catch (err) {
                console.warn("[dispose] Failed to dispose previous canvas:", err);
            }
            canvasRef.current = null;
        }

        if (canvasElRef.current && (canvasElRef.current as any).__fabricObject) {
            try {
                (canvasElRef.current as any).__fabricObject.dispose();
                delete (canvasElRef.current as any).__fabricObject;
            } catch (e) {
                console.warn("[dispose] Failed to delete __fabricObject:", e);
            }
        }

        if (!canvasElRef.current) return;

        const canvas = new fabric.Canvas(canvasElRef.current, {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            backgroundColor: "#fff",
        });

        canvas.preserveObjectStacking = true;
        canvasRef.current = canvas;
        isLoadingRef.current = true;

        const loadCanvasContent = async () => {
            const current = canvasRef.current;
            const loadId = canvasIdRef.current;

            if (!slide.canvas_json || !current || !current.getElement()) return;

            try {
                await current.loadFromJSON(slide.canvas_json);

                if (!isMounted || canvasIdRef.current !== loadId || !canvasRef.current || !canvasRef.current.getElement()) {
                    console.warn("[loadCanvasContent] Skipped render: canvas is unmounted or stale");
                    return;
                }
                canvasRef.current.renderAll();
            } catch (e) {
                console.warn("[loadCanvasContent] Failed to load JSON:", e);
            } finally {
                isLoadingRef.current = false;
            }
        };

        loadCanvasContent();

        return () => {
            isMounted = false;
            const tryDispose = () => {
                if (isLoadingRef.current) {
                    setTimeout(tryDispose, 100);
                } else if (canvas) {
                    try {
                        canvas.dispose();
                    } catch (e) {
                        console.warn("[dispose] Failed on unmount:", e);
                    } finally {
                        if (canvasRef.current === canvas) {
                            canvasRef.current = null;
                        }
                    }
                }
            };
            tryDispose();
        };
    }, [slide.id]);

    useEffect(() => {
        if (selectedTool === "brush" || selectedTool === "arrow" || selectedTool === "eraser") {
            onInteractionChange?.(true); // Start editing
        } else {
            onInteractionChange?.(false); // Allow dragging
        }
    }, [selectedTool]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.getElement()) return;

        if (selectedTool === "brush") {
            canvas.isDrawingMode = true;
            const brush = new fabric.PencilBrush(canvas);
            brush.color = foregroundColor;
            brush.width = brushWidth;
            canvas.freeDrawingBrush = brush;
        } else if (selectedTool === "eraser") {
            canvas.isDrawingMode = true;
            const eraser = new EraserBrush(canvas);
            eraser.width = eraserWidth;
            canvas.freeDrawingBrush = eraser;
        } else {
            canvas.isDrawingMode = false;
        }
    }, [selectedTool, brushWidth, eraserWidth, foregroundColor]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.getElement() || selectedTool !== "arrow") return;

        let arrowLine: fabric.Line | null = null;
        let arrowHead: fabric.Triangle | null = null;

        const onMouseDown = (opt: fabric.TEvent) => {
            const pointer = canvas.getPointer(opt.e);
            arrowLine = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
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
                const group = new fabric.Group([arrowLine, arrowHead], {
                    selectable: true,
                    evented: true,
                    erasable: true,
                });
                canvas.add(group);
                canvas.setActiveObject(group);
                canvas.remove(arrowLine);
                canvas.remove(arrowHead);
                canvas.requestRenderAll();
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

    const addText = () => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.getElement()) return;
        const text = new fabric.Textbox("Text", {
            left: 100,
            top: 100,
            fontSize: 24,
            fill: foregroundColor,
            erasable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.requestRenderAll();
    };

    const addShape = (type: "rect" | "circle" | "line") => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.getElement()) return;

        let shape: fabric.Object;
        const size = 100;

        if (type === "rect") {
            shape = new fabric.Rect({
                width: size,
                height: size,
                fill: foregroundColor,
                left: 150,
                top: 150,
                erasable: true,
            });
        } else if (type === "circle") {
            shape = new fabric.Circle({
                radius: size / 2,
                fill: foregroundColor,
                left: 150,
                top: 150,
                erasable: true,
            });
        } else {
            shape = new fabric.Line([50, 50, 150, 50], {
                stroke: foregroundColor,
                strokeWidth: 4,
                erasable: true,
            });
        }

        canvas.add(shape);
        canvas.setActiveObject(shape);
        canvas.requestRenderAll();
    };

    const deleteSelected = () => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.getElement()) return;
        const active = canvas.getActiveObject();
        if (active) {
            canvas.remove(active);
            canvas.requestRenderAll();
        }
    };

    const saveCanvas = async () => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.getElement()) return;

        setIsSaving(true);

        try {
            const json = JSON.stringify(canvas.toJSON());
            const dataUrl = canvas.toDataURL({
                format: "png",
                quality: 1.0,
                multiplier: 1,
            });

            // 🧠 Await the parent's save function
            await onCanvasSave(json, dataUrl);
        } catch (e) {
            console.warn("Failed to save canvas:", e);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="w-full flex justify-center">
            <div className="flex flex-col items-center space-y-4 max-w-full">
                <div className="flex flex-wrap gap-2 justify-center bg-gray-100 p-3 rounded shadow-sm">
                    <ToolButton onClick={() => setSelectedTool("select")} label="Select" icon={<FiMove />} />
                    <ToolButton onClick={() => setSelectedTool("brush")} label="Brush" icon={<FiEdit3 />} />
                    <ToolButton onClick={() => setSelectedTool("eraser")} label="Eraser" icon={<FiTrash2 />} />
                    <ToolButton onClick={addText} label="Text" icon={<FiType />} />
                    <ToolButton onClick={() => addShape("rect")} label="Rectangle" icon={<FiSquare />} />
                    <ToolButton onClick={() => addShape("circle")} label="Circle" icon={<FiCircle />} />
                    <ToolButton onClick={() => addShape("line")} label="Line" icon={<FiMinus />} />
                    <ToolButton onClick={() => setSelectedTool("arrow")} label="Arrow" icon={<FiArrowRight />} />
                    <ToolButton onClick={deleteSelected} label="Delete Selected" icon={<FiTrash />} />
                    <ToolButton
                        onClick={saveCanvas}
                        label={isSaving ? "Saving..." : "Save"}
                        icon={isSaving ? (
                            <svg className="animate-spin h-5 w-5 text-gray-600" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        ) : (
                            <FiSave />
                        )}
                        disabled={isSaving}
                    />
                    {isSaving && (
                        <Dialog open={true} onClose={() => { }} className="fixed z-50 inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                            <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-4">
                                <FiLoader className="animate-spin text-blue-500 text-3xl" />
                                <p className="text-gray-700 text-lg">Saving...</p>
                            </div>
                        </Dialog>
                    )}
                    <input
                        type="color"
                        value={foregroundColor}
                        onChange={(e) => setForegroundColor(e.target.value)}
                        title="Color Picker"
                        className="w-10 h-10 p-1 border rounded cursor-pointer"
                    />
                </div>
                <canvas
                    ref={canvasElRef}
                    key={slide.id}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="border border-gray-300 rounded shadow-md"
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        onInteractionChange?.(true);
                    }}
                    onMouseUp={() => onInteractionChange?.(false)}
                    onTouchStart={(e) => {
                        e.stopPropagation();
                        onInteractionChange?.(true);
                    }}
                    onTouchEnd={() => onInteractionChange?.(false)}
                />
            </div>
        </div>
    );
};

export default SlideCanvasEditor;
