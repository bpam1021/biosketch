import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import * as fabric from "fabric";
import { truncate } from "../../helper/utility";

interface LayerPanelProps {
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
}

export interface LayerPanelRef {
  refreshLayers: () => void;
}

const LayerPanel = forwardRef<LayerPanelRef, LayerPanelProps>(({ canvasRef }, ref) => {
  const [layers, setLayers] = useState<fabric.Object[]>([]);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number | null>(null);

  // Label editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Utility to update layers list and selection index
  const updateLayers = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const objs = canvas.getObjects().slice().reverse();

    // Assign default label if not set
    objs.forEach((obj) => {
      if (!("layerLabel" in obj)) {
        if (obj.type === "textbox") {
          const textContent = (obj as any).text || "";
          obj.set({ layerLabel: `Text: ${truncate(textContent, 12)}` });
        } else {
          obj.set({ layerLabel: obj.type?.toUpperCase() });
        }
      }
    });

    setLayers(objs);

    const active = canvas.getActiveObject();
    if (active) {
      const index = objs.indexOf(active);
      setSelectedLayerIndex(index !== -1 ? index : null);
    } else {
      setSelectedLayerIndex(null);
    }
  };

  useImperativeHandle(ref, () => ({
    refreshLayers: updateLayers,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.on("object:added", updateLayers);
    canvas.on("object:removed", updateLayers);
    canvas.on("object:modified", updateLayers);
    canvas.on("selection:created", updateLayers);
    canvas.on("selection:updated", updateLayers);
    canvas.on("selection:cleared", updateLayers);

    return () => {
      canvas.off("object:added", updateLayers);
      canvas.off("object:removed", updateLayers);
      canvas.off("object:modified", updateLayers);
      canvas.off("selection:created", updateLayers);
      canvas.off("selection:updated", updateLayers);
      canvas.off("selection:cleared", updateLayers);
    };
  }, [canvasRef]);

  // Select layer
  const handleSelectLayer = (obj: fabric.Object) => {
    if (editingIndex !== null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setActiveObject(obj);
    canvas.renderAll();
  };

  // Toggle visibility
  const handleToggleVisibility = (obj: fabric.Object) => {
    if (editingIndex !== null) return;
    obj.visible = !obj.visible;
    canvasRef.current?.renderAll();
    updateLayers();
  };

  // Delete layer
  const handleDeleteLayer = (obj: fabric.Object) => {
    if (editingIndex !== null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.remove(obj);
    updateLayers();
  };

  // Reorder layer (move up/down)
  const handleReorderLayer = (sourceIndex: number, targetIndex: number) => {
    if (editingIndex !== null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects().slice().reverse();
    const objToMove = objects[sourceIndex];
    if (!objToMove) return;

    canvas.remove(objToMove);

    const total = canvas.getObjects().length;
    const canvasTargetIndex = total - targetIndex;
    canvas.insertAt(canvasTargetIndex, objToMove);

    canvas.setActiveObject(objToMove);
    canvas.renderAll();
    updateLayers();
  };

  // Start editing a label
  const startEditing = (index: number, obj: fabric.Object) => {
    setEditingIndex(index);
    setEditValue((obj as any).layerLabel || "");
  };

  // Commit label edit
  const commitEdit = (obj: fabric.Object) => {
    const label = editValue.trim();
    if (label) {
      obj.set("layerLabel", label);
    }
    setEditingIndex(null);
    setEditValue("");
    updateLayers();
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg w-60">
      <h3 className="text-lg font-semibold mb-3 text-center">🧱 Layers</h3>
      <ul className="space-y-2 max-h-[400px] overflow-auto">
        {layers.map((obj, index) => (
          <li
            key={index}
            className={`flex items-center justify-between text-sm p-2 rounded-md border border-gray-700 
              ${index === selectedLayerIndex ? "bg-blue-700" : "bg-gray-800 hover:bg-gray-700"}`}
          >
            <div
              className={`cursor-pointer flex-1 min-w-0`}
              title={(obj as any).layerLabel || obj.type?.toUpperCase()}
              onClick={() => handleSelectLayer(obj)}
              tabIndex={editingIndex === null ? 0 : -1}
            >
              {editingIndex === index ? (
                <input
                  type="text"
                  className="bg-gray-700 text-white px-1 py-0.5 rounded w-full outline-none border border-blue-400"
                  value={editValue}
                  autoFocus
                  maxLength={32}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(obj)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(obj);
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
              ) : (
                <span className="truncate">{truncate((obj as any).layerLabel || obj.type?.toUpperCase(), 18)}</span>
              )}
            </div>
            <div className="flex gap-2 items-center ml-2">
              {/* Edit label button */}
              {editingIndex !== index ? (
                <button
                  onClick={() => startEditing(index, obj)}
                  title="Rename Layer"
                  className="text-gray-400 hover:text-blue-300"
                  disabled={editingIndex !== null}
                  tabIndex={editingIndex === null ? 0 : -1}
                >
                  <span role="img" aria-label="edit">✏️</span>
                </button>
              ) : null}
              {/* Visibility */}
              <button
                onClick={() => handleToggleVisibility(obj)}
                title={obj.visible ? "Hide Layer" : "Show Layer"}
                className="text-gray-400 hover:text-yellow-300"
                disabled={editingIndex !== null}
                tabIndex={editingIndex === null ? 0 : -1}
              >
                {obj.visible ? "👁" : "🚫"}
              </button>
              {/* Delete */}
              <button
                onClick={() => handleDeleteLayer(obj)}
                title="Delete Layer"
                className="text-gray-400 hover:text-red-400"
                disabled={editingIndex !== null}
                tabIndex={editingIndex === null ? 0 : -1}
              >
                🗑
              </button>
              {/* Move up */}
              <button
                onClick={() => handleReorderLayer(index, index - 1)}
                disabled={index === 0 || editingIndex !== null}
                title="Move Up"
                className="text-gray-400 hover:text-green-300"
                tabIndex={editingIndex === null ? 0 : -1}
              >
                ↑
              </button>
              {/* Move down */}
              <button
                onClick={() => handleReorderLayer(index, index + 1)}
                disabled={index === layers.length - 1 || editingIndex !== null}
                title="Move Down"
                className="text-gray-400 hover:text-green-300"
                tabIndex={editingIndex === null ? 0 : -1}
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
});

export default LayerPanel;
