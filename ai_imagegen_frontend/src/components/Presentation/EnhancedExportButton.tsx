import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { FiLoader, FiDownload, FiChevronDown, FiVideo, FiFileText, FiMonitor } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  exportPresentation,
  exportPresentationVideo,
  checkExportStatus,
} from "../../api/presentationApi";
import VideoExportModal from "./VideoExportModal";
import axiosClient from "../../api/axiosClient";

interface EnhancedExportButtonProps {
  presentationId: number;
  selectedSlideIds?: number[];
  presentationType: 'document' | 'slides';
  slideCount: number;
}

const EnhancedExportButton: React.FC<EnhancedExportButtonProps> = ({
  presentationId,
  selectedSlideIds = [],
  presentationType,
  slideCount
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

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

  const handleExport = async (format: "pptx" | "pdf" | "docx") => {
    setIsExporting(true);
    setIsDropdownOpen(false);
    const query = getQueryParams();

    try {
      await exportPresentation(presentationId, format as any, query);
      toast.info(`Exporting to ${format.toUpperCase()}...`);

      // const downloadUrl = await pollForExport(format);
      await downloadFileWithAuth(format);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleVideoExport = async (settings: any) => {
    setIsExporting(true);
    
    try {
      await exportPresentationVideo(presentationId, settings, selectedSlideIds);
      toast.info("Video export started...");
      
      // Poll for video completion
      const downloadUrl = await pollForExport('mp4', 300000, 5000); // 5 minute timeout
      
      // Open video in new tab
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Video exported successfully!");
    } catch (err) {
      console.error("Video export failed:", err);
      toast.error("Video export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const getExportOptions = () => {
    if (presentationType === 'document') {
      return [
        { format: 'docx', label: 'Word Document', icon: <FiFileText /> },
        { format: 'pdf', label: 'PDF Document', icon: <FiFileText /> }
      ];
    } else {
      return [
        { format: 'pptx', label: 'PowerPoint', icon: <FiMonitor /> },
        { format: 'pdf', label: 'PDF Slides', icon: <FiFileText /> }
      ];
    }
  };

  return (
    <>
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
          <div className="absolute z-10 mt-2 w-48 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="py-1">
              {getExportOptions().map(({ format, label, icon }) => (
                <button
                  key={format}
                  onClick={() => handleExport(format as any)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  {icon}
                  {label}
                </button>
              ))}
              
              {presentationType === 'slides' && (
                <>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => {
                      setShowVideoModal(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <FiVideo />
                    Export as Video
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {isExporting && (
        <Dialog
          open={true}
          onClose={() => {}}
          className="fixed z-50 inset-0 bg-black bg-opacity-40 flex items-center justify-center"
        >
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-4">
            <FiLoader className="animate-spin text-blue-500 text-3xl" />
            <div>
              <p className="text-gray-700 text-lg">Generating export...</p>
              <p className="text-gray-500 text-sm">This may take a few minutes</p>
            </div>
          </div>
        </Dialog>
      )}

      <VideoExportModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onExport={handleVideoExport}
        slideCount={slideCount}
      />
    </>
  );
};

export default EnhancedExportButton;