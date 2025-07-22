import React, { useEffect, useState } from "react";
import * as fabric from "fabric";

interface ObjectPropertiesSidebarProps {
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
}

const ObjectPropertiesSidebar: React.FC<ObjectPropertiesSidebarProps> = ({ canvasRef }) => {
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSelectedObject = () => {
      const active = canvas.getActiveObject();
      if (active) {
        setSelectedObject(active);
        setPosition({ x: active.left || 0, y: active.top || 0 });
        setSize({
          width: active.width ? active.width * (active.scaleX || 1) : 0,
          height: active.height ? active.height * (active.scaleY || 1) : 0,
        });
        setRotation(active.angle || 0);
      } else {
        setSelectedObject(null);
      }
    };

    canvas.on("selection:created", updateSelectedObject);
    canvas.on("selection:updated", updateSelectedObject);
    canvas.on("selection:cleared", () => setSelectedObject(null));

    return () => {
      canvas.off("selection:created", updateSelectedObject);
      canvas.off("selection:updated", updateSelectedObject);
      canvas.off("selection:cleared", () => setSelectedObject(null));
    };
  }, [canvasRef]);

  const updateObject = (property: string, value: any) => {
    if (!selectedObject || !canvasRef.current) return;
    selectedObject.set(property as any, value);
    canvasRef.current.requestRenderAll();
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-xl shadow-md w-full">
      <h3 className="text-lg font-semibold mb-3">Object Properties</h3>
      {selectedObject ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm">Position (X, Y):</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={position.x}
                onChange={(e) => {
                  const x = parseFloat(e.target.value);
                  setPosition((prev) => ({ ...prev, x }));
                  updateObject("left", x);
                }}
                className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
              />
              <input
                type="number"
                value={position.y}
                onChange={(e) => {
                  const y = parseFloat(e.target.value);
                  setPosition((prev) => ({ ...prev, y }));
                  updateObject("top", y);
                }}
                className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="text-sm">Size (W, H):</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={Math.round(size.width)}
                onChange={(e) => {
                  const width = parseFloat(e.target.value);
                  setSize((prev) => ({ ...prev, width }));
                  const scaleX = width / (selectedObject.width || 1);
                  updateObject("scaleX", scaleX);
                }}
                className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
              />
              <input
                type="number"
                value={Math.round(size.height)}
                onChange={(e) => {
                  const height = parseFloat(e.target.value);
                  setSize((prev) => ({ ...prev, height }));
                  const scaleY = height / (selectedObject.height || 1);
                  updateObject("scaleY", scaleY);
                }}
                className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="text-sm">Rotation (°):</label>
            <input
              type="number"
              value={rotation}
              onChange={(e) => {
                const angle = parseFloat(e.target.value);
                setRotation(angle);
                updateObject("angle", angle);
              }}
              className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => updateObject("flipX", !(selectedObject.flipX || false))}
              className="w-full bg-gray-700 hover:bg-gray-600 rounded p-2 text-sm"
            >
              Flip Horizontal
            </button>
            <button
              onClick={() => updateObject("flipY", !(selectedObject.flipY || false))}
              className="w-full bg-gray-700 hover:bg-gray-600 rounded p-2 text-sm"
            >
              Flip Vertical
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400">Select an object to view and edit properties.</p>
      )}
    </div>
  );
};

export default ObjectPropertiesSidebar;
