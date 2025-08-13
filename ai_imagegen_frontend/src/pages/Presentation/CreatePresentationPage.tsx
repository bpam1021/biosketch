import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPresentation, listPresentations } from "../../api/presentationApi";
import { toast } from "react-toastify";
import { Loader2, FileText, Monitor, Upload, Wand2 } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { Presentation } from "../../types/Presentation";
import { useCredits } from "../../context/CreditsContext";
import { FiUpload } from "react-icons/fi";

const CreatePresentationPage = () => {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [presentationType, setPresentationType] = useState<"document" | "slide">("document");
  const [loading, setLoading] = useState(false);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [templateStyle, setTemplateStyle] = useState<"academic" | "business" | "creative" | "technical" | "medical">("academic");
  const [pageLayout, setPageLayout] = useState<"single_column" | "two_column" | "three_column">("single_column");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [documentSections, setDocumentSections] = useState<string[]>(['introduction', 'methods', 'results', 'discussion', 'conclusion']);
  const [slideTheme, setSlideTheme] = useState({
    primary_color: '#3B82F6',
    secondary_color: '#EF4444',
    background_color: '#FFFFFF',
    font_family: 'Inter'
  });
  
  const { credits, fetchCredits } = useCredits();
  const navigate = useNavigate();

  useEffect(() => {
    const loadPresentations = async () => {
      try {
        const data = await listPresentations();
        setPresentations(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load previous presentations");
      }
    };
    loadPresentations();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedImages(prev => [...prev, ...files]);
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSectionToggle = (section: string) => {
    setDocumentSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error("Prompt is required");
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        title: title || "Untitled",
        prompt,
        quality,
        presentation_type: presentationType,
        ...(presentationType === 'document' && {
          template_style: templateStyle,
          page_layout: pageLayout,
          sections: documentSections,
        }),
        ...(presentationType === 'slide' && {
          theme: slideTheme,
        }),
      };

      const presentation = await createPresentation(requestData as any);
      fetchCredits();
      navigate(`/presentation/${presentation.id}`);
    } catch (err) {
      toast.error("Failed to create presentation.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (credits === 0) {
      toast.info("You've run out of credits. Redirecting to subscription...");
      navigate("/subscribe");
    }
  }, [credits]);

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-h-screen bg-gray-50 p-6 space-y-10 overflow-y-auto">
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
              <span className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent 
                       opacity-0 group-hover:opacity-10 transition duration-500 rounded-2xl pointer-events-none" />
              <span className="mr-3 text-2xl animate-credit-bounce">💳</span>
              {credits === 0 ? "Buy Credits Now" : "Buy More Credits"}
            </button>
          </div>
        )}

        <div className="bg-white shadow-lg rounded-xl p-8 max-w-4xl mx-auto space-y-8 border border-gray-200">
          <h1 className="text-3xl font-semibold text-gray-800 text-center">Create AI-Powered Presentation</h1>

          {/* Presentation Type Selection */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-gray-700">Presentation Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPresentationType("document")}
                className={`p-6 rounded-xl border-2 transition-all ${
                  presentationType === "document"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <FileText size={32} className={presentationType === "document" ? "text-blue-600" : "text-gray-600"} />
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-900">Document</h3>
                    <p className="text-sm text-gray-600">Word-like document with rich content, sections, and professional formatting</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPresentationType("slide")}
                className={`p-6 rounded-xl border-2 transition-all ${
                  presentationType === "slide"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <Monitor size={32} className={presentationType === "slide" ? "text-blue-600" : "text-gray-600"} />
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-900">Slide Deck</h3>
                    <p className="text-sm text-gray-600">PowerPoint-like slides with animations, transitions, and video export</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Title (optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Quality</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as "low" | "medium" | "high")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="low">Low (0.5 credits) - Basic content</option>
                <option value="medium">Medium (1.5 credits) - Enhanced content</option>
                <option value="high">High (5 credits) - Premium quality</option>
              </select>
            </div>
          </div>

          {/* Document-specific settings */}
          {presentationType === "document" && (
            <div className="space-y-6 p-6 bg-blue-50 rounded-xl">
              <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <FileText size={20} />
                Document Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template Style</label>
                  <select
                    value={templateStyle}
                    onChange={(e) => setTemplateStyle(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="academic">Academic Research Paper</option>
                    <option value="business">Business Report</option>
                    <option value="technical">Technical Documentation</option>
                    <option value="medical">Medical Case Study</option>
                    <option value="creative">Creative Article</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Page Layout</label>
                  <select
                    value={pageLayout}
                    onChange={(e) => setPageLayout(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="single_column">Single Column</option>
                    <option value="two_column">Two Column</option>
                    <option value="three_column">Three Column</option>
                  </select>
                </div>
              </div>

              {/* Document Sections */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Include Sections</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['introduction', 'methods', 'results', 'discussion', 'conclusion', 'references', 'appendix'].map(section => (
                    <label key={section} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={documentSections.includes(section)}
                        onChange={() => handleSectionToggle(section)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm capitalize">{section}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Slide-specific settings */}
          {presentationType === "slide" && (
            <div className="space-y-6 p-6 bg-purple-50 rounded-xl">
              <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                <Monitor size={20} />
                Slide Settings
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <input
                    type="color"
                    value={slideTheme.primary_color}
                    onChange={(e) => setSlideTheme(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                  <input
                    type="color"
                    value={slideTheme.secondary_color}
                    onChange={(e) => setSlideTheme(prev => ({ ...prev, secondary_color: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Background</label>
                  <input
                    type="color"
                    value={slideTheme.background_color}
                    onChange={(e) => setSlideTheme(prev => ({ ...prev, background_color: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                  <select
                    value={slideTheme.font_family}
                    onChange={(e) => setSlideTheme(prev => ({ ...prev, font_family: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Image Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-lg font-medium text-gray-700">Upload Images (optional)</label>
              <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors">
                <Upload size={16} />
                Add Images
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={() => removeUploadedImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <p className="text-xs text-gray-600 mt-1 truncate">{image.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main Prompt */}
          <div className="space-y-2">
            <label className="text-lg font-medium text-gray-700">Content Prompt <span className="text-red-500">*</span></label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                presentationType === "document" 
                  ? "Describe the document content you want to create (e.g., 'Write a comprehensive research paper on machine learning applications in healthcare...')"
                  : "Describe the presentation topic you want to create (e.g., 'Explain the history of artificial intelligence...')"
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none h-32"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium px-6 py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                Generating {presentationType === "document" ? "Document" : "Presentation"}...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate {presentationType === "document" ? "Document" : "Presentation"}
                <span className="text-sm opacity-90">
                  ({quality === 'low' ? '0.5' : quality === 'medium' ? '1.5' : '5'} credits)
                </span>
              </>
            )}
          </button>

          {/* Preview Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">
                {presentationType === "document" ? "📄 Document Features" : "🎬 Slide Features"}
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                {presentationType === "document" ? (
                  <>
                    <li>• Professional document formatting</li>
                    <li>• Drag-and-drop section management</li>
                    <li>• AI-powered content generation</li>
                    <li>• Rich text editing capabilities</li>
                    <li>• Template-based styling</li>
                    <li>• Export to PDF/Word formats</li>
                    <li>• Citation and reference management</li>
                  </>
                ) : (
                  <>
                    <li>• PowerPoint-like slide editor</li>
                    <li>• Animation and transition effects</li>
                    <li>• Video export with narration</li>
                    <li>• Advanced canvas editing tools</li>
                    <li>• Theme customization</li>
                    <li>• Interactive elements</li>
                    <li>• Presenter notes and timing</li>
                  </>
                )}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">💡 AI Capabilities</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Content generation from prompts</li>
                <li>• Automatic image selection and placement</li>
                <li>• Section structuring and organization</li>
                <li>• Style consistency maintenance</li>
                <li>• Interactive diagram creation</li>
                <li>• Real-time content suggestions</li>
                <li>• Quality enhancement recommendations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Previous Presentations */}
        <div className="bg-white shadow-md rounded-xl p-6 max-w-5xl mx-auto border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Presentations</h2>
          {presentations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No presentations created yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {presentations.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/presentation/${p.id}`)}
                  className="cursor-pointer p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {p.presentation_type === 'document' ? (
                      <FileText size={16} className="text-blue-600" />
                    ) : (
                      <Monitor size={16} className="text-purple-600" />
                    )}
                    <span className="text-xs uppercase font-medium text-gray-500">
                      {p.presentation_type}
                    </span>
                  </div>
                  <p className="font-medium text-gray-700 mb-1">{p.title}</p>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">{p.original_prompt}</p>
                  <div className="mt-auto flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-sm text-blue-600">View →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePresentationPage;