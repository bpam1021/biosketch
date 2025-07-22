import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { FiLoader, FiDownload, FiChevronDown } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  exportPresentation,
  checkExportStatus,
} from "../../api/presentationApi";
import axiosClient from "../../api/axiosClient";

interface ExportButtonProps {
  presentationId: number;
  selectedSlideIds?: number[];
}

const ExportButton: React.FC<ExportButtonProps> = ({
  presentationId,
  selectedSlideIds = [],
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const getQueryParams = () =>
    selectedSlideIds.length ? `?slide_ids=${selectedSlideIds.join(",")}` : "";

  const pollForExport = async (
    _format: string,
    timeout = 180000,
    interval = 4000
  ): Promise<string> => {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      try {
        const res = await checkExportStatus(presentationId);
        if (res.is_exported && res.download_url) {
          return res.download_url;
        }
      } catch (e) {
        console.warn("Export status check failed:", e);
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error("Export timeout");
  };

  const downloadFileWithAuth = async (format: string) => {
    try {
      const response = await axiosClient.get(
        `users/presentations/${presentationId}/export/force-download/`,
        {
          responseType: "blob",
          withCredentials: true,
        }
      );

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `presentation.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Download failed");
    }
  };

  const handleExport = async (format: "pptx" | "pdf" | "mp4") => {
    setIsExporting(true);
    setIsDropdownOpen(false);
    const query = getQueryParams();

    try {
      await exportPresentation(presentationId, format, query);
      toast.info(`Exporting to ${format.toUpperCase()}...`);

      const downloadUrl = await pollForExport(format);

      if (format === "mp4") {
        // Open in new tab
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        await downloadFileWithAuth(format);
      }

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
        disabled={isExporting}
      >
        <FiDownload />
        Export
        <FiChevronDown />
      </button>

      {isDropdownOpen && (
        <div className="absolute z-10 mt-2 w-36 bg-white rounded shadow ring-1 ring-black ring-opacity-5">
          {["pptx", "pdf", "mp4"].map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format as "pptx" | "pdf" | "mp4")}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              Export {format.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {isExporting && (
        <Dialog
          open={true}
          onClose={() => {}}
          className="fixed z-50 inset-0 bg-black bg-opacity-40 flex items-center justify-center"
        >
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-4">
            <FiLoader className="animate-spin text-blue-500 text-3xl" />
            <p className="text-gray-700 text-lg">Generating, please wait...</p>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default ExportButton;
