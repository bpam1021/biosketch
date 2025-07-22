import React, { useEffect, useState } from "react";
import * as fabric from "fabric";

interface AnimationPanelProps {
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
}

const AnimationPanel: React.FC<AnimationPanelProps> = ({ canvasRef }) => {
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [animationType, setAnimationType] = useState("fadeIn");
  const [duration, setDuration] = useState(1000);
  const [delay, setDelay] = useState(0);

  const animationOptions = [
    { label: "Fade In", value: "fadeIn" },
    { label: "Slide In Left", value: "slideInLeft" },
    { label: "Slide In Right", value: "slideInRight" },
    { label: "Zoom In", value: "zoomIn" },
    { label: "Bounce In", value: "bounceIn" },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleSelection = () => {
      const active = canvas.getActiveObject();
      if (active) {
        setSelectedObject(active);
      } else {
        setSelectedObject(null);
      }
    };

    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", () => setSelectedObject(null));

    return () => {
      canvas.off("selection:created", handleSelection);
      canvas.off("selection:updated", handleSelection);
      canvas.off("selection:cleared", () => setSelectedObject(null));
    };
  }, [canvasRef]);

  const applyAnimation = () => {
    if (!selectedObject || !canvasRef.current) return;

    const el = selectedObject;
    const canvas = canvasRef.current;

    const originalOpacity = el.opacity || 1;
    const start = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - start - delay;
      if (elapsed < 0) {
        requestAnimationFrame(animate);
        return;
      }

      switch (animationType) {
        case "fadeIn":
          el.set("opacity", 0);
          el.animate(
            { opacity: originalOpacity },
            {
              duration,
              onChange: canvas.renderAll.bind(canvas),
            }
          );
          break;

        case "slideInLeft":
          const originalLeft = el.left || 0;
          el.set("left", originalLeft - 200);
          el.animate(
            { left: originalLeft },
            {
              duration,
              onChange: canvas.renderAll.bind(canvas),
            }
          );
          break;

        case "slideInRight":
          const originalRight = el.left || 0;
          el.set("left", originalRight + 200);
          el.animate(
            { left: originalRight },
            {
              duration,
              onChange: canvas.renderAll.bind(canvas),
            }
          );
          break;

        case "zoomIn":
          el.set({ scaleX: 0.1, scaleY: 0.1 });
          el.animate(
            { scaleX: 1, scaleY: 1 },
            {
              duration,
              onChange: canvas.renderAll.bind(canvas),
            }
          );
          break;

        case "bounceIn":
          const bounceStart = (el.top || 0) - 50;
          el.set("top", bounceStart);
          el.animate(
            { top: bounceStart + 50 },
            {
              duration: duration / 2,
              easing: fabric.util.ease.easeOutBounce,
              onChange: canvas.renderAll.bind(canvas),
              onComplete: () => {
                el.animate(
                  { top: bounceStart + 25 },
                  {
                    duration: duration / 2,
                    onChange: canvas.renderAll.bind(canvas),
                  }
                );
              },
            }
          );
          break;

        default:
          break;
      }
    };

    animate();
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-xl shadow-md w-full">
      <h3 className="text-lg font-semibold mb-3">Object Animation</h3>
      {selectedObject ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm">Animation Type:</label>
            <select
              value={animationType}
              onChange={(e) => setAnimationType(e.target.value)}
              className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
            >
              {animationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm">Duration (ms):</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
            />
          </div>

          <div>
            <label className="text-sm">Delay (ms):</label>
            <input
              type="number"
              value={delay}
              onChange={(e) => setDelay(parseInt(e.target.value))}
              className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
            />
          </div>

          <button
            onClick={applyAnimation}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 py-2 text-white rounded-lg"
          >
            Apply Animation
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-400">Select an object to animate.</p>
      )}
    </div>
  );
};

export default AnimationPanel;