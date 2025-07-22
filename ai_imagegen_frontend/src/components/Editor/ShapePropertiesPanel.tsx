import React, { useEffect, useState } from "react";
import * as fabric from "fabric";
import * as Slider from "@radix-ui/react-slider";
import { FiArrowLeftCircle, FiArrowRightCircle, FiArrowUpCircle, FiArrowDownCircle, FiCrosshair, FiMinusCircle, FiCopy, FiDelete } from "react-icons/fi";

interface ShapePropertiesPanelProps {
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
  layerPanelRef?: React.RefObject<{ refreshLayers: () => void }>;
  selectedObject: fabric.Object | null;
}

function isArrow(obj: fabric.Object | null | undefined): boolean {
  return !!obj && (obj as any).customType === "arrow";
}


function getArrowParts(group: fabric.Group): { line: fabric.Line | null; head: fabric.Triangle | null } {
  let line: fabric.Line | null = null;
  let head: fabric.Triangle | null = null;
  group.getObjects().forEach(child => {
    if (child.type === "line") line = child as fabric.Line;
    if (child.type === "triangle") head = child as fabric.Triangle;
  });
  return { line, head };
}

function rgbToHex(rgb: string): string {
  const result = rgb.match(/\d+/g);
  if (!result || result.length < 3) return "#000000";
  return (
    "#" +
    result
      .slice(0, 3)
      .map((x) => ("0" + parseInt(x).toString(16)).slice(-2))
      .join("")
  );
}

const ShapePropertiesPanel: React.FC<ShapePropertiesPanelProps> = ({ canvasRef, layerPanelRef, selectedObject }) => {
  const [borderColor, setBorderColor] = useState("#000000");
  const [arrowHeadColor, setArrowHeadColor] = useState("#000000");
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderStyle, setBorderStyle] = useState("Stroke");
  const [cornerType, setCornerType] = useState("miter");
  const [fillType, setFillType] = useState("solid");
  const [fillColor, setFillColor] = useState("#ff0000");
  const [gradientColor, setGradientColor] = useState("#00ff00");

  const [opacity, setOpacity] = useState(1);
  const [blur, setBlur] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [gamma, setGamma] = useState({ r: 1, g: 1, b: 1 });

  interface EffectSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
  }

  const EffectSlider: React.FC<EffectSliderProps> = ({ label, value, min, max, step, onChange }) => (
    <div className="space-y-1">
      <label className="text-sm block">{label}</label>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([val]) => onChange(val)}
      >
        <Slider.Track className="bg-gray-300 relative grow rounded-full h-1">
          <Slider.Range className="absolute bg-blue-600 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb className="block w-4 h-4 bg-white border border-gray-400 rounded-full shadow" />
      </Slider.Root>
    </div>
  );

  const getDashArray = (label: string) => {
    switch (label) {
      case "Stroke": return [];
      case "Dash-1": return [1, 10];
      case "Dash-2": return [3, 6];
      case "Dash-3": return [5, 5];
      case "Dash-4": return [10, 5];
      case "Dash-5": return [10, 10];
      case "Dash-6": return [15, 10];
      case "Dash-7": return [5, 5, 15, 5];
      case "Dash-8": return [1, 5, 1, 10];
      default: return [];
    }
  };

  useEffect(() => {
    if (!selectedObject) return;
    if (isArrow(selectedObject) && selectedObject instanceof fabric.Group) {
      const { line, head } = getArrowParts(selectedObject);
      setBorderColor((line?.stroke as string) || "#000000");
      setArrowHeadColor((head?.fill as string) || "#000000");
      setBorderWidth(line?.strokeWidth || 1);
      setBorderStyle(line?.strokeDashArray && line.strokeDashArray.length ? "Dash-1" : "Stroke");
      setCornerType((line?.strokeLineJoin as string) || "miter");
      setOpacity(selectedObject.opacity || 1);
    } else {
      const strokeColor = selectedObject.stroke as string | null;
      setBorderColor(strokeColor && strokeColor.startsWith("rgb") ? rgbToHex(strokeColor) : strokeColor || "#000000");
      setBorderWidth(selectedObject.strokeWidth || 1);
      setCornerType((selectedObject.strokeLineJoin as string) || "miter");
      const fill = selectedObject.fill as string | null;
      setFillColor(fill && fill.startsWith("rgb") ? rgbToHex(fill) : fill || "#ff0000");
      setOpacity(selectedObject.opacity || 1);

      if (selectedObject instanceof fabric.Image) {
        const filters = selectedObject.filters || [];
        filters.forEach(filter => {
          if (filter.type === 'Brightness') setBrightness((filter as any).brightness || 0);
          if (filter.type === 'Blur') setBlur((filter as fabric.filters.Blur).blur || 0);
          if (filter.type === 'Saturation') setSaturation((filter as fabric.filters.Saturation).saturation || 0);
          if (filter.type === 'Gamma') {
            const gammaFilter = filter as fabric.filters.Gamma;
            setGamma({ r: gammaFilter.gamma[0] || 1, g: gammaFilter.gamma[1] || 1, b: gammaFilter.gamma[2] || 1 });
          }
        });
      }
    }
  }, [selectedObject]);

  useEffect(() => {
    if (!selectedObject || !canvasRef.current) return;
    if (!(selectedObject instanceof fabric.Image)) return;
    const element = selectedObject.getElement();
    const canApplyFilters = element instanceof HTMLImageElement
      ? element.crossOrigin === "anonymous"
      : element instanceof HTMLCanvasElement;

    if (canApplyFilters) {
      try {

        const filters: fabric.filters.BaseFilter<any, any, any>[] = [];

        filters.push(new fabric.filters.Brightness({ brightness }));
        filters.push(new fabric.filters.Blur({ blur }));

        if (fabric.filters.Saturation) {
          filters.push(new fabric.filters.Saturation({ saturation }));
        }
        if (fabric.filters.Gamma) {
          filters.push(new fabric.filters.Gamma({ gamma: [gamma.r, gamma.g, gamma.b] }));
        }

        selectedObject.filters = filters;
        selectedObject.dirty = true; // Mark as dirty to apply filters
        selectedObject.applyFilters();
        canvasRef.current.requestRenderAll();
      } catch (err) {
        console.warn("Error applying filters:", err);
      }
    }
  }, [brightness, blur, saturation, gamma, selectedObject]);


  const updateShape = (property: string, value: any) => {
    if (!selectedObject || !canvasRef.current) return;

    if (isArrow(selectedObject) && selectedObject instanceof fabric.Group) {
      const { line, head } = getArrowParts(selectedObject);
      switch (property) {
        case "stroke":
          line && line.set("stroke", value);
          break;
        case "arrowHeadColor":
          head && head.set("fill", value);
          break;
        case "strokeWidth":
          line && line.set("strokeWidth", value);
          break;
        case "strokeDashArray":
          line && line.set("strokeDashArray", value);
          break;
        case "strokeLineJoin":
          line && line.set("strokeLineJoin", value);
          break;
        case "opacity":
          selectedObject.set("opacity", value);
          break;
      }
      canvasRef.current.requestRenderAll();
    } else {
      selectedObject.set({
        [property]: value,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
      canvasRef.current.discardActiveObject();
      canvasRef.current.setActiveObject(selectedObject);
      canvasRef.current.requestRenderAll();
    }
  };

  const handleAlignment = (pos: string) => {
    if (!selectedObject || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const shape = selectedObject;
    switch (pos) {
      case "left":
        shape.set("left", 0);
        break;
      case "center":
        shape.set("left", canvas.width! / 2 - shape.getScaledWidth() / 2);
        break;
      case "right":
        shape.set("left", canvas.width! - shape.getScaledWidth());
        break;
      case "top":
        shape.set("top", 0);
        break;
      case "bottom":
        shape.set("top", canvas.height! - shape.getScaledHeight());
        break;
      case "justify":
        shape.set({
          left: canvas.width! / 2 - shape.getScaledWidth() / 2,
          top: canvas.height! / 2 - shape.getScaledHeight() / 2
        });
        break;
    }
    canvas.requestRenderAll();
  };

  const handleDuplicate = async () => {
    if (!selectedObject || !canvasRef.current) return;
    const clone = await selectedObject.clone();
    clone.set({
      left: (selectedObject.left || 0) + canvasRef.current.width / 2,
      top: (selectedObject.top || 0),
      erasable: true,
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    if ((selectedObject as any).customType) (clone as any).customType = (selectedObject as any).customType;
    canvasRef.current.add(clone);
    canvasRef.current.setActiveObject(clone);
    layerPanelRef?.current?.refreshLayers();
    canvasRef.current.requestRenderAll();
  };

  const handleDelete = () => {
    if (!selectedObject || !canvasRef.current) return;
    canvasRef.current.remove(selectedObject);
    canvasRef.current.requestRenderAll();
  };

  const applyGradientFill = () => {
    if (!canvasRef.current || !selectedObject) return;
    const gradient = new fabric.Gradient({
      type: "linear",
      coords: { x1: 0, y1: 0, x2: selectedObject.width || 100, y2: 0 },
      colorStops: [
        { offset: 0, color: fillColor },
        { offset: 1, color: gradientColor },
      ],
    });
    updateShape("fill", gradient);
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-2xl shadow-lg space-y-5 w-full h-[75vh] overflow-y-auto">
      <h3 className="text-xl font-semibold mb-2">Shape Properties</h3>
      <div className="space-y-4">
        <EffectSlider
          label="Opacity"
          value={opacity}
          min={0}
          max={1}
          step={0.1}
          onChange={(val) => {
            setOpacity(val);
            updateShape("opacity", val);
          }}
        />
        {selectedObject instanceof fabric.Image && (
          <>
            <EffectSlider label="Blur" value={blur} min={0} max={1} step={0.1} onChange={setBlur} />
            <EffectSlider label="Brightness" value={brightness} min={0} max={1} step={0.1} onChange={setBrightness} />
            <EffectSlider label="Saturation" value={saturation} min={-1} max={1} step={0.1} onChange={setSaturation} />
            <EffectSlider label="Gamma (Red)" value={gamma.r} min={0} max={2} step={0.1} onChange={(val) => setGamma({ ...gamma, r: val })} />
            <EffectSlider label="Gamma (Green)" value={gamma.g} min={0} max={2} step={0.1} onChange={(val) => setGamma({ ...gamma, g: val })} />
            <EffectSlider label="Gamma (Blue)" value={gamma.b} min={0} max={2} step={0.1} onChange={(val) => setGamma({ ...gamma, b: val })} />
          </>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm">Border Width</label>
        <select value={borderWidth} onChange={(e) => {
          const value = parseInt(e.target.value);
          setBorderWidth(value);
          updateShape("strokeWidth", value);
        }} className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded">
          {[...Array(21).keys()].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        <label className="text-sm">Border Style</label>
        <select value={borderStyle} onChange={(e) => {
          setBorderStyle(e.target.value);
          updateShape("strokeDashArray", getDashArray(e.target.value));
        }} className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded">
          {["Stroke", "Dash-1", "Dash-2", "Dash-3", "Dash-4", "Dash-5", "Dash-6", "Dash-7", "Dash-8"].map((style) => (
            <option key={style} value={style}>{style}</option>
          ))}
        </select>

        <label className="text-sm">Corner Type</label>
        <select value={cornerType} onChange={(e) => {
          setCornerType(e.target.value);
          updateShape("strokeLineJoin", e.target.value);
        }} className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded">
          <option value="miter">Square</option>
          <option value="round">Round</option>
        </select>

        <label className="text-sm">Border Color</label>
        <input type="color" value={borderColor} onChange={(e) => {
          setBorderColor(e.target.value);
          updateShape("stroke", e.target.value);
        }} className="w-full h-10 rounded" />

        {isArrow(selectedObject as fabric.Object) && (
          <>
            <label className="text-sm">Arrow Head Color</label>
            <input type="color" value={arrowHeadColor} onChange={(e) => {
              setArrowHeadColor(e.target.value);
              updateShape("arrowHeadColor", e.target.value);
            }} className="w-full h-10 rounded" />
          </>
        )}
      </div>

      {!isArrow(selectedObject as fabric.Object) && (
        <div className="space-y-2">
          <label className="text-sm">Fill Type</label>
          <select value={fillType} onChange={(e) => setFillType(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded">
            <option value="solid">Color Fill</option>
            <option value="gradient">Gradient Fill</option>
          </select>

          {fillType === "solid" && (
            <>
              <label className="text-sm">Fill Color</label>
              <input type="color" value={fillColor} onChange={(e) => {
                setFillColor(e.target.value);
                updateShape("fill", e.target.value);
              }} className="w-full h-10 rounded" />
            </>
          )}

          {fillType === "gradient" && (
            <>
              <label className="text-sm">Gradient To</label>
              <input type="color" value={gradientColor} onChange={(e) => {
                setGradientColor(e.target.value);
              }} className="w-full h-10 rounded" />
              <button onClick={applyGradientFill} className="w-full mt-1 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">Apply Gradient</button>
            </>
          )}
        </div>
      )}

      {/* Alignment Buttons */}
      <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => handleAlignment("left")} className="p-1 rounded-lg hover:bg-blue-600 focus:bg-blue-700 transition" title="Align Left"><FiArrowLeftCircle size={20} /></button>
          <button onClick={() => handleAlignment("center")} className="p-1 rounded-lg hover:bg-blue-600 focus:bg-blue-700 transition" title="Align Center"><FiMinusCircle size={20} /></button>
          <button onClick={() => handleAlignment("right")} className="p-1 rounded-lg hover:bg-blue-600 focus:bg-blue-700 transition" title="Align Right"><FiArrowRightCircle size={20} /></button>
          <button onClick={() => handleAlignment("top")} className="p-1 rounded-lg hover:bg-blue-600 focus:bg-blue-700 transition" title="Align Top"><FiArrowUpCircle size={20} /></button>
          <button onClick={() => handleAlignment("bottom")} className="p-1 rounded-lg hover:bg-blue-600 focus:bg-blue-700 transition" title="Align Bottom"><FiArrowDownCircle size={20} /></button>
          <button onClick={() => handleAlignment("justify")} className="p-1 rounded-lg hover:bg-blue-600 focus:bg-blue-700 transition" title="Center All"><FiCrosshair size={20} /></button>
      </div>

      <div className="flex justify-center gap-4 mt-4">
        <button onClick={handleDuplicate} className="p-2 rounded-lg hover:bg-blue-600 focus:bg-blue-700 transition" title="Duplicate">
          <FiCopy size={20} />
        </button>
        <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-blue-600 focus:bg-blue-700 transition" title="Delete">
          <FiDelete size={20} />
        </button>
      </div>
    </div>
  );
};

export default ShapePropertiesPanel;
