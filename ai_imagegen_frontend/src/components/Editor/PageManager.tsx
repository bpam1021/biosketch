import React, { useState, useEffect, useRef } from "react";
import * as fabric from "fabric";
import { PageCanvas } from "../../types/PageCanvas";

interface PageManagerProps {
  mainCanvasRef: React.MutableRefObject<fabric.Canvas | null>;
  pages: PageCanvas[];
  setPages: React.Dispatch<React.SetStateAction<PageCanvas[]>>;
}

const PageManager: React.FC<PageManagerProps> = ({ mainCanvasRef, pages, setPages }) => {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pages.length === 0) {
      const canvas = new fabric.Canvas(`page-canvas-0`, {
        width: 800,
        height: 600,
        backgroundColor: "#ffffff",
      });
      mainCanvasRef.current = canvas;
      setPages([{ id: 0, canvas }]);
    }
  }, []);

  const addNewPage = () => {
    const newId = pages.length;
    const newCanvas = new fabric.Canvas(`page-canvas-${newId}`, {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
    });
    setPages([...pages, { id: newId, canvas: newCanvas }]);
    setActivePageIndex(newId);
    mainCanvasRef.current = newCanvas;
  };

  const switchToPage = (index: number) => {
    setActivePageIndex(index);
    mainCanvasRef.current = pages[index].canvas;
  };

  const deletePage = (index: number) => {
    if (pages.length === 1) return;
    const updated = pages.filter((_, i) => i !== index);
    setPages(updated);
    const newActive = index === 0 ? 0 : index - 1;
    setActivePageIndex(newActive);
    mainCanvasRef.current = updated[newActive].canvas;
  };

  return (
    <div className="w-full p-4 bg-gray-900 text-white rounded-xl shadow-md">
      <h3 className="text-lg font-semibold mb-4">Page Manager</h3>

      <div className="flex gap-3 mb-4">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className={`cursor-pointer border p-2 rounded-md text-sm ${index === activePageIndex ? "bg-blue-600 border-blue-500" : "bg-gray-800 border-gray-600"}`}
            onClick={() => switchToPage(index)}
          >
            Page {index + 1}
            <button
              onClick={(e) => {
                e.stopPropagation();
                deletePage(index);
              }}
              className="ml-2 text-red-400 hover:text-red-600"
              title="Delete Page"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addNewPage}
          className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-md"
        >
          + Add Page
        </button>
      </div>

      <div
        ref={canvasContainerRef}
        className="border border-gray-700 bg-white flex items-center justify-center"
        style={{ height: 600 }}
      >
        {pages.map((page, index) => (
          <canvas
            key={page.id}
            id={`page-canvas-${page.id}`}
            style={{ display: index === activePageIndex ? "block" : "none" }}
          ></canvas>
        ))}
      </div>
    </div>
  );
};

export default PageManager;
