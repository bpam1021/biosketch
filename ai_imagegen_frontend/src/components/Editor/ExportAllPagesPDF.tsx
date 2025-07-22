import React from "react";
import jsPDF from "jspdf";
import * as fabric from "fabric";

interface ExportAllPagesPDFProps {
  pages: fabric.Canvas[];
}

const ExportAllPagesPDF: React.FC<ExportAllPagesPDFProps> = ({ pages }) => {
  const handleExportAllPagesAsPDF = () => {
    if (!pages || pages.length === 0) return;

    const firstCanvas = pages[0];
    const pdf = new jsPDF({
      orientation: firstCanvas.width! > firstCanvas.height! ? "landscape" : "portrait",
      unit: "px",
      format: [firstCanvas.width!, firstCanvas.height!]
    });

    pages.forEach((canvas, index) => {
      const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });

      if (index > 0) pdf.addPage([canvas.width!, canvas.height!], canvas.width! > canvas.height! ? "landscape" : "portrait");

      pdf.addImage(dataUrl, "PNG", 0, 0, canvas.width!, canvas.height!);
    });

    pdf.save("multi-page-export.pdf");
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleExportAllPagesAsPDF}
        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg shadow-md"
      >
        Export All Pages as PDF
      </button>
    </div>
  );
};

export default ExportAllPagesPDF;
