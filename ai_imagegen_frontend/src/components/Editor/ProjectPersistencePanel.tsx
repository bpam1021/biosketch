import React, { useRef } from "react";
import * as fabric from "fabric";
import { toast } from "react-toastify";
import {
  FiSave,
  FiFolderPlus,
  FiTrash2,
  FiDownload,
  FiUpload,
} from "react-icons/fi";
import { LayerPanelRef } from "./LayerPanel"; // <-- import LayerPanelRef type

// Helper to ensure images are always data URLs
async function ensureImagesAreDataURLs(canvas: fabric.Canvas): Promise<void> {
  const images = canvas.getObjects("image") as fabric.Image[];
  const promises = images.map(img => {
    const src = img.getSrc ? img.getSrc() : (img as any).src;
    if (src && src.startsWith("blob:")) {
      return fetch(src)
        .then(res => res.blob())
        .then(blob => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        })
        .then(dataURL => {
          return new Promise<void>(resolve => {
            (img as any).setSrc(dataURL, resolve);
          });
        });
    }
    return Promise.resolve();
  });
  await Promise.all(promises);
}

interface ProjectPersistencePanelProps {
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
  layerPanelRef: React.RefObject<LayerPanelRef>; // <-- add this prop
  projectKey?: string;
}

const DEFAULT_PROJECT_KEY = "fabric_project_data";

const buttonBase =
  "flex items-center gap-2 px-4 py-2 rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 transition-all text-sm";

const ProjectPersistencePanel: React.FC<ProjectPersistencePanelProps> = ({
  canvasRef,
  layerPanelRef,
  projectKey = DEFAULT_PROJECT_KEY,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveProject = async () => {
    if (!canvasRef.current) return;
    await ensureImagesAreDataURLs(canvasRef.current);
    const json = canvasRef.current.toJSON();
    localStorage.setItem(projectKey, JSON.stringify(json));
    toast.success("✅ Project saved.");
  };

  const handleLoadProject = () => {
    if (!canvasRef.current) return;
    const jsonString = localStorage.getItem(projectKey);
    if (!jsonString) {
      toast.warning("⚠️ No saved project.");
      return;
    }

    try {
      const parsed = JSON.parse(jsonString);
      canvasRef.current.loadFromJSON(parsed, () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.getObjects().forEach(obj => obj.setCoords());
        setTimeout(() => {
          canvas.renderAll();
          canvas.requestRenderAll();
          canvas.fire("object:modified");
          const firstObj = canvas.getObjects()[0];
          if (firstObj) canvas.setActiveObject(firstObj);
          layerPanelRef.current?.refreshLayers(); // <-- ensure LayerPanel refresh!
        }, 50);
        toast.success("✅ Project loaded.");
      });
    } catch (err) {
      toast.error("❌ Failed to load project.");
      console.error("Load error:", err);
    }
  };

  const handleClearProject = () => {
    localStorage.removeItem(projectKey);
    toast.info("🗑 Project cleared.");
  };

  const handleExportToFile = async () => {
    if (!canvasRef.current) return;
    await ensureImagesAreDataURLs(canvasRef.current);
    const json = canvasRef.current.toJSON();
    const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fabric_project.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("⬇ Exported as .json");
  };

  const handleImportFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canvasRef.current) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      canvasRef.current.loadFromJSON(json, () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.getObjects().forEach(obj => obj.setCoords());
        setTimeout(() => {
          canvas.renderAll();
          canvas.requestRenderAll();
          canvas.fire("object:modified");
          const firstObj = canvas.getObjects()[0];
          if (firstObj) canvas.setActiveObject(firstObj);
          layerPanelRef.current?.refreshLayers(); // <-- ensure LayerPanel refresh!
        }, 50);
        toast.success("✅ Imported from file.");
      });
    } catch (error) {
      toast.error("❌ Invalid .json file.");
      console.error("Import error:", error);
    }
  };

  return (
    <div className="p-4 bg-gray-850 text-gray-100 rounded-xl shadow w-full">
      <h3 className="text-base font-semibold mb-3">🗂 Project Tools</h3>
      <div className="flex flex-col gap-2">
        <button onClick={handleSaveProject} className={buttonBase}>
          <FiSave size={16} /> Save to Local Storage
        </button>

        <button onClick={handleLoadProject} className={buttonBase}>
          <FiFolderPlus size={16} /> Load from Local Storage
        </button>

        <button onClick={handleClearProject} className={buttonBase}>
          <FiTrash2 size={16} /> Clear Local Storage
        </button>

        <button onClick={handleExportToFile} className={buttonBase}>
          <FiDownload size={16} /> Export as .json
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className={buttonBase}
        >
          <FiUpload size={16} /> Import from .json
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFromFile}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ProjectPersistencePanel;
