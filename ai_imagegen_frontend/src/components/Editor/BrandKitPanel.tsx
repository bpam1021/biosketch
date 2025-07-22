import React, { useState, useEffect } from "react";
import * as fabric from "fabric";

interface BrandKitPanelProps {
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
}

const LOCAL_STORAGE_KEY = "brandKit";

const defaultColors = ["#FF5733", "#4287f5", "#28a745", "#FFC107", "#6f42c1"];
const defaultFonts = ["Arial", "Georgia", "Courier New", "Helvetica", "Times New Roman"];

const BrandKitPanel: React.FC<BrandKitPanelProps> = ({ canvasRef }) => {
  const [savedColors, setSavedColors] = useState<string[]>(defaultColors);
  const [savedFonts, setSavedFonts] = useState<string[]>(defaultFonts);

  useEffect(() => {
    const storedKit = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedKit) {
      try {
        const parsed = JSON.parse(storedKit);
        if (parsed.colors) setSavedColors(parsed.colors);
        if (parsed.fonts) setSavedFonts(parsed.fonts);
      } catch (e) {
        console.error("Failed to load brand kit from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ colors: savedColors, fonts: savedFonts })
    );
  }, [savedColors, savedFonts]);

  const applyColor = (color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active && 'set' in active) {
      active.set("fill", color);
      canvas.requestRenderAll();
    }
  };

  const applyFont = (font: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active && active.type === "textbox") {
      active.set("fontFamily", font);
      canvas.requestRenderAll();
    }
  };

  const addColor = (color: string) => {
    if (!savedColors.includes(color)) {
      setSavedColors([...savedColors, color]);
    }
  };

  const addFont = (font: string) => {
    if (!savedFonts.includes(font)) {
      setSavedFonts([...savedFonts, font]);
    }
  };

  const exportBrandKit = () => {
    const json = JSON.stringify({ colors: savedColors, fonts: savedFonts }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "brand-kit.json";
    link.click();
  };

  const importBrandKit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed.colors && Array.isArray(parsed.colors)) setSavedColors(parsed.colors);
        if (parsed.fonts && Array.isArray(parsed.fonts)) setSavedFonts(parsed.fonts);
      } catch (error) {
        console.error("Invalid brand kit JSON", error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-xl shadow-md w-full">
      <h3 className="text-lg font-semibold mb-4">Brand Kit</h3>

      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Saved Colors:</h4>
        <div className="flex gap-2 flex-wrap">
          {savedColors.map((color, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded cursor-pointer border border-gray-600"
              style={{ backgroundColor: color }}
              onClick={() => applyColor(color)}
              title={color}
            ></div>
          ))}
        </div>
        <input
          type="color"
          onChange={(e) => addColor(e.target.value)}
          className="mt-2 w-full h-10 rounded border border-gray-700 bg-gray-800 cursor-pointer"
        />
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Saved Fonts:</h4>
        <div className="grid grid-cols-2 gap-2">
          {savedFonts.map((font, i) => (
            <button
              key={i}
              onClick={() => applyFont(font)}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm"
              style={{ fontFamily: font }}
            >
              {font}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Add new font (e.g., Roboto)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value.trim()) {
              addFont(e.currentTarget.value.trim());
              e.currentTarget.value = "";
            }
          }}
          className="mt-2 w-full p-2 rounded bg-gray-800 border border-gray-700 text-white"
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={exportBrandKit}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-md"
        >
          Export Brand Kit
        </button>
        <label className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-md cursor-pointer text-center">
          Import Brand Kit
          <input
            type="file"
            accept="application/json"
            onChange={importBrandKit}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
};

export default BrandKitPanel;
