import React, { useState } from "react";
import * as fabric from "fabric";

interface ExportModalProps {
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ canvasRef, onClose }) => {
  const [format, setFormat] = useState("png");
  const [quality, setQuality] = useState(1);
  const [multiplier, setMultiplier] = useState(1);
  const [transparentBg, setTransparentBg] = useState(false);

  const handleExport = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const originalBg = canvas.backgroundColor as string | fabric.TFiller | null;

    if (transparentBg) {
      canvas.backgroundColor = "";
      canvas.requestRenderAll();
    }

    const dataUrl = canvas.toDataURL({
      format: format as "png" | "jpeg",
      quality: format === "jpeg" ? quality : undefined,
      multiplier,
      enableRetinaScaling: true
    });

    if (transparentBg) {
      canvas.backgroundColor = originalBg || "";
      canvas.requestRenderAll();
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `exported-image.${format}`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Export Settings</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Format:</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
        </div>

        {format === "jpeg" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">JPEG Quality:</label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Size Multiplier:</label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={multiplier}
            onChange={(e) => setMultiplier(parseFloat(e.target.value))}
            className="w-full border rounded p-2"
          />
        </div>

        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={transparentBg}
            onChange={(e) => setTransparentBg(e.target.checked)}
          />
          <label className="text-sm">Export with Transparent Background</label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
