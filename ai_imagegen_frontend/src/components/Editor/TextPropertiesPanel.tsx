import React, { useEffect, useState } from "react";
import * as fabric from "fabric";
import { FiArrowLeftCircle, FiArrowRightCircle, FiArrowUpCircle, FiArrowDownCircle, FiCrosshair, FiMinusCircle, FiCopy, FiDelete, FiBold, FiItalic, FiUnderline, FiMinus } from "react-icons/fi";

interface TextPropertiesPanelProps {
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
  selectedObject: fabric.Object | null;
}

const fontFamilies = [
  "Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Verdana", "Roboto", "Montserrat"
];

const TextPropertiesPanel: React.FC<TextPropertiesPanelProps> = ({ canvasRef, selectedObject }) => {
  const [selectedText, setSelectedText] = useState<fabric.Textbox | null>(null);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(20);
  const [fontColor, setFontColor] = useState("#000000");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isLinethrough, setIsLinethrough] = useState(false);
  const [lineHeight, setLineHeight] = useState(1.2);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [textAlign, setTextAlign] = useState("left");
  const [borderColor, setBorderColor] = useState("#000000");
  const [borderWidth, setBorderWidth] = useState(0);
  const [borderStyle, setBorderStyle] = useState("Stroke");
  const [cornerType, setCornerType] = useState("miter");

  useEffect(() => {
    if (!selectedObject || selectedObject.type !== "textbox") {
      setSelectedText(null);
      return;
    }

    const textbox = selectedObject as fabric.Textbox;
    setSelectedText(textbox);
    setFontFamily(textbox.fontFamily || "Arial");
    setFontSize(textbox.fontSize || 20);
    setFontColor(textbox.fill?.toString() || "#000000");
    setIsBold(textbox.fontWeight === "bold");
    setIsItalic(textbox.fontStyle === "italic");
    setIsUnderline(textbox.underline || false);
    setIsLinethrough(textbox.linethrough || false);
    setLineHeight(textbox.lineHeight || 1.2);
    setLetterSpacing(textbox.charSpacing ? textbox.charSpacing / 10 : 0);
    setTextAlign(textbox.textAlign || "left");
    setBorderColor((textbox.stroke as string) || "#000000");
    setBorderWidth(textbox.strokeWidth || 0);
    setCornerType((textbox.strokeLineJoin as string) || "miter");
  }, [selectedObject]);

  const updateText = (property: string, value: any) => {
    if (!selectedText || !canvasRef.current) return;
    selectedText.set(property as any, value);
    canvasRef.current.setActiveObject(selectedText);
    canvasRef.current.requestRenderAll();
  };

  const handleAlignment = (pos: string) => {
    if (!selectedText || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const shape = selectedText;
    switch (pos) {
      case "left": shape.set("left", 0); break;
      case "center": shape.set("left", canvas.width! / 2 - shape.getScaledWidth() / 2); break;
      case "right": shape.set("left", canvas.width! - shape.getScaledWidth()); break;
      case "top": shape.set("top", 0); break;
      case "bottom": shape.set("top", canvas.height! - shape.getScaledHeight()); break;
      case "justify": shape.set({ left: canvas.width! / 2 - shape.getScaledWidth() / 2, top: canvas.height! / 2 - shape.getScaledHeight() / 2 }); break;
    }
    canvas.setActiveObject(shape);
    canvas.requestRenderAll();
  };

  const handleDuplicate = async () => {
    if (!selectedText || !canvasRef.current) return;
    const clone = await selectedText.clone();
    clone.set({ left: (selectedText.left || 0) + canvasRef.current.width / 2, top: (selectedText.top || 0) });
    canvasRef.current.add(clone);
    canvasRef.current.setActiveObject(clone);
    canvasRef.current.requestRenderAll();
  };

  const handleDelete = () => {
    if (!selectedText || !canvasRef.current) return;
    canvasRef.current.remove(selectedText);
    canvasRef.current.requestRenderAll();
  };

  const getDashArray = (style: string) => {
    switch (style) {
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

  return (
    <div className="p-4 bg-gray-900 text-white rounded-2xl shadow-md space-y-4 w-full h-[75vh] overflow-y-auto">
      <h3 className="text-xl font-semibold">Text Properties</h3>

      <div className="space-y-2">
        <label className="text-sm">Font Family</label>
        <select value={fontFamily} onChange={(e) => { setFontFamily(e.target.value); updateText("fontFamily", e.target.value); }} className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded">
          {fontFamilies.map((font) => <option key={font} value={font}>{font}</option>)}
        </select>

        <label className="text-sm">Font Size</label>
        <input type="number" min={8} value={fontSize} onChange={(e) => { const size = parseInt(e.target.value); setFontSize(size); updateText("fontSize", size); }} className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded" />

        <label className="text-sm">Line Height</label>
        <input type="number" step={0.1} value={lineHeight} onChange={(e) => { const val = parseFloat(e.target.value); setLineHeight(val); updateText("lineHeight", val); }} className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded" />

        <label className="text-sm">Letter Spacing</label>
        <input type="number" value={letterSpacing} onChange={(e) => { const val = parseFloat(e.target.value); setLetterSpacing(val); updateText("charSpacing", val * 10); }} className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded" />

        <label className="text-sm">Text Color</label>
        <input type="color" value={fontColor} onChange={(e) => { setFontColor(e.target.value); updateText("fill", e.target.value); }} className="w-full h-10 rounded" />

        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => {
              setIsBold(!isBold);
              updateText("fontWeight", !isBold ? "bold" : "normal");
            }}
            className={`p-2 rounded-lg transition ${isBold ? "bg-blue-600" : "bg-gray-700"} hover:bg-blue-500`}
            title="Bold"
          >
            <FiBold size={18} />
          </button>

          <button
            onClick={() => {
              setIsItalic(!isItalic);
              updateText("fontStyle", !isItalic ? "italic" : "normal");
            }}
            className={`p-2 rounded-lg transition ${isItalic ? "bg-blue-600" : "bg-gray-700"} hover:bg-blue-500`}
            title="Italic"
          >
            <FiItalic size={18} />
          </button>

          <button
            onClick={() => {
              setIsUnderline(!isUnderline);
              updateText("underline", !isUnderline);
            }}
            className={`p-2 rounded-lg transition ${isUnderline ? "bg-blue-600" : "bg-gray-700"} hover:bg-blue-500`}
            title="Underline"
          >
            <FiUnderline size={18} />
          </button>

          <button
            onClick={() => {
              setIsLinethrough(!isLinethrough);
              updateText("linethrough", !isLinethrough);
            }}
            className={`p-2 rounded-lg transition ${isLinethrough ? "bg-blue-600" : "bg-gray-700"} hover:bg-blue-500`}
            title="Strikethrough"
          >
            <FiMinus size={18} />
          </button>
        </div>


        <label className="text-sm">Text Align</label>
        <select value={textAlign} onChange={(e) => { setTextAlign(e.target.value); updateText("textAlign", e.target.value); }} className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded">
          {['left', 'center', 'right', 'justify'].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <label className="text-sm">Border Width</label>
        <select value={borderWidth} onChange={(e) => { const val = parseInt(e.target.value); setBorderWidth(val); updateText("strokeWidth", val); }} className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded">
          {[...Array(21).keys()].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>

        <label className="text-sm">Border Style</label>
        <select value={borderStyle} onChange={(e) => { setBorderStyle(e.target.value); updateText("strokeDashArray", getDashArray(e.target.value)); }} className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded">
          {["Stroke", "Dash-1", "Dash-2", "Dash-3", "Dash-4", "Dash-5", "Dash-6", "Dash-7", "Dash-8"].map((style) => <option key={style} value={style}>{style}</option>)}
        </select>

        <label className="text-sm">Corner Type</label>
        <select value={cornerType} onChange={(e) => { setCornerType(e.target.value); updateText("strokeLineJoin", e.target.value); }} className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded">
          <option value="miter">Square</option>
          <option value="round">Round</option>
        </select>

        <label className="text-sm">Border Color</label>
        <input type="color" value={borderColor} onChange={(e) => { setBorderColor(e.target.value); updateText("stroke", e.target.value); }} className="w-full h-10 rounded" />

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
    </div>
  );
};

export default TextPropertiesPanel;
