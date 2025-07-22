import { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Sidebar from "../components/Sidebar";
import PartialSidebar from "../components/PartialSidebar";
import { LayerPanelRef } from "../components/Editor/LayerPanel";
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { toast } from 'react-toastify';
import { useCredits } from "../context/CreditsContext";
import { generateImage, generateDescription, saveImageDescription } from "../api/imageApi";
import { publishImageToCommunity, getFieldCategories } from "../api/communityApi";
import html2pdf from "html2pdf.js";
import MDEditor from "@uiw/react-md-editor";
import 'github-markdown-css/github-markdown-light.css';

const ImageGenerator = () => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageDescription, ] = useState<string>("");
  const { generatData, canvasRef, setCanvasImportImages } = useGlobal();
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [imageTitle, setImageTitle] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const { credits, fetchCredits } = useCredits();
  const [parsedDescription, setParsedDescription] = useState<string>("");
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [promptKey, setPromptKey] = useState<string>("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editableDescription, setEditableDescription] = useState('');

  const navigate = useNavigate();
  const layerPanelRef = useRef<LayerPanelRef>(null);
  const handleObjectSelect = () => { };
  useEffect(() => {
    if (generatData) {
      handleGenerate(generatData);
      fetchCredits();
    }
  }, [generatData]);


  useEffect(() => {
    if (credits === 0) {
      toast.info("You’ve run out of credits. Redirecting to subscription...");
      navigate("/subscribe");
    }
  }, [credits]);

  useEffect(() => {
    const parseMarkdown = async () => {
      if (imageDescription) {
        const rawHtml = await marked.parse(imageDescription);
        const safeHtml = DOMPurify.sanitize(rawHtml);
        setParsedDescription(safeHtml);
      } else {
        setParsedDescription("");
      }
    };
    parseMarkdown();
  }, [imageDescription]);

  const handleGenerate = async (data: any, forceRegenerate = false) => {
    if (!selectedField) return;

    setLoading(true);
    setImageUrls([]);
    setParsedDescription("");
    setSelectedImages([]);

    try {
      const requestData = { ...data, field: selectedField, forceRegenerate };
      const response = await generateImage(requestData);
      if (response.data.image_urls && response.data.image_urls.length > 0) {
        setImageUrls([...response.data.image_urls].sort(() => Math.random() - 0.5));
        setPromptKey(response.data.prompt_key);
        setImagePrompt(data.prompt);
      } else {
        console.warn("No images returned from the API");
      }
    } catch (error) {
      console.error("Error generating image", error);
    }

    setLoading(false);
  };


  const handleGenerateDescription = async () => {
    try {
      const response = await generateDescription({ prompt: imagePrompt, prompt_key: promptKey });
      const explanation = response.data.explanation || "No description available.";
      const rawHtml = await marked.parse(explanation);
      const safeHtml = DOMPurify.sanitize(rawHtml);
      setParsedDescription(safeHtml);
      setEditableDescription(explanation);
      setShowDescriptionModal(true);
    } catch (error) {
      console.error("Error generating description", error);
      toast.error("Failed to generate description.");
    }
  };

  const handleSaveEditedDescription = async () => {
    if (!promptKey) {
      toast.error("Missing prompt key.");
      return;
    }

    try {
      const response = await saveImageDescription({
        prompt_key: promptKey,
        description: editableDescription,
      });

      if (response.status === 200) {
        const html = await marked.parse(editableDescription);
        setParsedDescription(DOMPurify.sanitize(html));
        toast.success("Description saved successfully.");
        setIsEditingDescription(false);
      } else {
        toast.error("Failed to save description.");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("An error occurred while saving.");
    }
  };

  const handleExportDescription = () => {
    const container = document.createElement("div");
    container.className = "markdown-body";
    container.innerHTML = DOMPurify.sanitize(parsedDescription); // use parsed HTML from Markdown

    html2pdf()
      .set({
        margin: 10,
        filename: `${imagePrompt?.replace(/\s+/g, "_") || "description"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(container)
      .save();
  };

  const handleSendToCanvas = () => {
    if (selectedImages.length === 0) return;
    setCanvasImportImages(selectedImages);
    navigate("/ImageEdit");
  }
  const handleSelectImage = (url: string) => {
    setSelectedImages((prev) =>
      prev.includes(url) ? prev.filter((img) => img !== url) : [...prev, url]
    );
  };

  const handleDownload = async () => {
    if (selectedImages.length === 0) return;

    for (const url of selectedImages) {
      try {
        const response = await fetch(url, { mode: "cors" });
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = url.split("/").pop() || "image.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("Error downloading image:", error);
      }
    }
  };

  const handleSelectField = (field: string) => {
    setSelectedField(field); // Enable TextToImage with the selected field
  };

  const handleBack = () => {
    setSelectedField(null); // Reset selection, disabling TextToImage
    setImageUrls([]); // Clear generated images
  };

  useEffect(() => {
    getFieldCategories().then((res) => {
      const fields = Array.isArray(res.data) ? res.data : res.data.results || [];
      const options = fields.map((field: any) => ({
        value: field.id,
        label: field.name,
      }));
      setCategories(options);
    });

  }, []);

  const handlePublishToCommunity = async () => {
    if (selectedImages.length === 0) return;
    if (!selectedCategory) {
      toast.warning("Please select a field before publishing.");
      return;
    }

    try {
      for (const url of selectedImages) {
        await publishImageToCommunity({
          image_url: url,
          image_name: imageTitle || "Untitled Image",
          prompt: imagePrompt || "No prompt provided",
          field: selectedCategory, // 👈 Add selected field here
        });
      }

      toast.success("✅ Image(s) published to community!");
      setShowPublishForm(false);
      setImageTitle('');
      setImagePrompt('');
      setSelectedCategory(null);
    } catch (error) {
      console.error("❌ Failed to publish:", error);
      alert("Something went wrong. Try again.");
    }
  };

  const fieldImages = [
    { name: "Immunology", src: "/images/immunology.jpg" },
    { name: "Neurology", src: "/images/neurology.jpg" },
    { name: "Veterinary", src: "/images/veterinary.jpg" },
    { name: "Biology", src: "/images/biology.jpg" },
    { name: "Chemistry", src: "/images/chemistry.jpg" },
    { name: "Clinical Science", src: "/images/clinical.jpg" },
  ];

  return (
    <div className="flex  bg-gray-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {selectedField && (
          <PartialSidebar
            activeSection="textToImage"
            canvasRef={canvasRef}
            layerPanelRef={layerPanelRef}
            selectedObject={null}
            disabled={!selectedField}
            onObjectSelect={handleObjectSelect}
            activeTab={''}
            setActiveTab={() => { }}
            initialCollapsed={false}
            setIsInsertingTemplate={() => { }}
            isInsertingTemplate={false}
          />
        )}
        {/* Main Content */}
        <div className="flex-1 p-6">
          <h2 className="text-3xl font-extrabold text-gray-800 text-center mb-6">
            AI-Generated Images
          </h2>
          {credits !== null && credits <= 5 && (
            <div className="flex justify-center my-10">
              <button
                onClick={() => navigate("/subscribe")}
                className="relative inline-flex items-center justify-center px-8 py-4 
                 bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900 
                 backdrop-blur-xl border border-amber-400/30 rounded-2xl 
                 text-amber-300 font-semibold text-lg tracking-wide shadow-xl 
                 ring-1 ring-amber-300/20 hover:ring-4 hover:ring-amber-400/50 
                 transition-all duration-300 ease-in-out group overflow-hidden glow-pulse"
              >
                {/* Reflection shimmer */}
                <span className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent 
                       opacity-0 group-hover:opacity-10 transition duration-500 rounded-2xl pointer-events-none" />

                {/* Animated Icon */}
                <span className="mr-3 text-2xl animate-credit-bounce">💳</span>
                {credits === 0 ? "Buy Credits Now" : "Buy More Credits"}
              </button>
            </div>
          )}

          {!selectedField ? (
            <div className="grid grid-cols-1 p-2 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:p-24">
              {fieldImages.map((field) => (
                <button
                  key={field.name}
                  className="group relative flex flex-col items-center border-2 rounded-xl overflow-hidden shadow-lg bg-white hover:shadow-2xl transition-all duration-300 w-full h-80"
                  onClick={() => handleSelectField(field.name)}
                >
                  {/* Image */}
                  <img src={field.src} alt={field.name} className="w-full h-5/6 object-cover group-hover:scale-105 transition-transform duration-300" />

                  {/* Label */}
                  <span className="absolute bottom-4 bg-black bg-opacity-80 text-white px-5 py-3 rounded-lg text-xl font-semibold shadow-md">
                    {field.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Back Button with Modern Design */}
              <button
                onClick={handleBack}
                className="relative group inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gray-900 via-gray-700 to-gray-600 text-white font-semibold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <span className="transform group-hover:-translate-x-1 transition-transform duration-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </span>

                <span className="tracking-wide">Back</span>
              </button>

            </>
          )}

          {/* Loading Indicator */}
          {loading && <p className="text-center text-lg text-blue-600 font-semibold">Generating images...</p>}

          {/* Generated Images Display */}
          {imageUrls.length > 0 && (
            <>
              <div className="mt-4 grid grid-cols-1 gap-6">
                {imageUrls.map((url, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <img
                      src={url}
                      alt={`Generated ${idx + 1}`}
                      className="w-full h-auto max-h-[400px] object-contain rounded-lg border"
                      onClick={() => handleSelectImage(url)}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={handleGenerateDescription}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-all"
                >
                  Generate Description
                </button>
                <button
                  onClick={() => handleGenerate({
                    prompt: imagePrompt,
                    style: generatData?.style,
                    aspectRatio: generatData?.aspectRatio,
                    numImages: generatData?.numImages,
                    quality: generatData?.quality,
                    model: generatData?.model,
                  }, true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-all"
                >
                  Try Again
                </button>
              </div>
            </>
          )}

          {showDescriptionModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
              <div className="bg-white p-6 sm:p-8 rounded-2xl w-[90%] max-w-2xl shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">🧠 Scientific Explanation</h2>
                  <button
                    onClick={() => setShowDescriptionModal(false)}
                    className="text-2xl text-gray-500 hover:text-gray-800"
                  >
                    ×
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto pr-1" style={{ maxHeight: "60vh" }}>
                  {isEditingDescription ? (
                    <MDEditor
                      value={editableDescription}
                      onChange={(val = "") => setEditableDescription(val)}
                      height={400}
                    />
                  ) : (
                    <div className="markdown-body">
                      <MDEditor.Markdown
                        source={editableDescription}
                        style={{
                          whiteSpace: "pre-wrap",
                          backgroundColor: "white",
                          padding: 16,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setIsEditingDescription((prev) => !prev)}
                    className="px-4 py-2 text-sm bg-yellow-400 text-white rounded hover:bg-yellow-500 transition"
                  >
                    {isEditingDescription ? "Preview" : "Edit"}
                  </button>

                  {isEditingDescription && (
                    <button
                      onClick={handleSaveEditedDescription}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                    >
                      Save
                    </button>
                  )}

                  <button
                    onClick={handleExportDescription}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  >
                    Export
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Download Button */}
          {imageUrls.length > 0 && (
            <div className="mt-8 flex flex-col sm:flex-row sm:justify-center sm:items-center gap-4">
              {/* Download Button */}
              <div className="w-full sm:w-[220px]">
                <button
                  onClick={handleDownload}
                  disabled={selectedImages.length === 0}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-lg text-base font-medium shadow-md hover:scale-105 transition-all duration-300 disabled:bg-gray-400 disabled:scale-100"
                >
                  {selectedImages.length > 0
                    ? `Download ${selectedImages.length} Image(s)`
                    : "Download"}
                </button>
              </div>

              {/* Send to Editor Button */}
              <div className="w-full sm:w-[220px]">
                <button
                  onClick={handleSendToCanvas}
                  disabled={selectedImages.length === 0}
                  className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-700 text-white rounded-lg text-base font-medium shadow-md hover:scale-105 transition-all duration-300 disabled:bg-gray-400 disabled:scale-100"
                >
                  Send to Editor
                </button>
              </div>
              <div className="w-full sm:w-[220px]">
                <button
                  onClick={() => setShowPublishForm(true)}
                  disabled={selectedImages.length === 0}
                  className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-red-600 text-white rounded-lg text-base font-medium shadow-md hover:scale-105 transition-all duration-300 disabled:bg-gray-400 disabled:scale-100"
                >
                  Publish to Community
                </button>
              </div>
            </div>
          )}
          {showPublishForm && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
              <div className="bg-white p-6 sm:p-8 rounded-2xl w-[90%] max-w-md shadow-2xl border border-gray-200">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <span>🖼️</span> Publish to Community
                  </h2>
                  <button
                    onClick={() => setShowPublishForm(false)}
                    className="text-gray-500 hover:text-gray-800 text-xl"
                    title="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Image Title"
                    value={imageTitle}
                    onChange={(e) => setImageTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <textarea
                    placeholder="Prompt or description..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />

                  <Select
                    options={categories}
                    value={categories.find((f) => Number(f.value) === selectedCategory)}
                    onChange={(option) => setSelectedCategory(option?.value ? Number(option.value) : null)}
                    placeholder="Select a Field"
                    className="react-select-container"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowPublishForm(false)}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublishToCommunity}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;