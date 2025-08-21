import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Loader2, FileText, Monitor, Upload, Wand2, Sparkles } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { useCredits } from "../../context/CreditsContext";

import { 
  createPresentation, 
  listPresentations,
  listPresentationTemplates,
  uploadImage
} from "../../api/presentationApi";

import { 
  CreatePresentationRequest, 
  PresentationListItem,
  PresentationTemplate 
} from "../../types/Presentation";

const CreatePresentationPage = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [presentationType, setPresentationType] = useState<"document" | "slide">("document");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [loading, setLoading] = useState(false);
  
  // Existing presentations
  const [presentations, setPresentations] = useState<PresentationListItem[]>([]);
  const [loadingPresentations, setLoadingPresentations] = useState(true);
  
  // Templates
  const [templates, setTemplates] = useState<PresentationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Theme settings for slides
  const [themeSettings, setThemeSettings] = useState({
    primary_color: '#3B82F6',
    secondary_color: '#EF4444',
    background_color: '#FFFFFF',
    font_family: 'Inter'
  });
  
  // Document settings
  const [documentSettings, setDocumentSettings] = useState({
    template_style: 'academic' as 'academic' | 'business' | 'creative' | 'technical' | 'medical',
    page_layout: 'single_column' as 'single_column' | 'two_column' | 'three_column',
    include_sections: ['introduction', 'methods', 'results', 'discussion', 'conclusion']
  });
  
  // Brand settings
  const [brandSettings, setBrandSettings] = useState({
    logo_url: '',
    brand_colors: [],
    company_name: ''
  });
  
  // Uploaded images
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string }[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const { credits, fetchCredits } = useCredits();
  const navigate = useNavigate();

  useEffect(() => {
    loadExistingPresentations();
  }, []);

  useEffect(() => {
    if (presentationType) {
      loadTemplates();
    }
  }, [presentationType]);

  const loadExistingPresentations = async () => {
    try {
      const data = await listPresentations({ 
        sort_by: 'updated',
        order: 'desc'
      });
      setPresentations(data.results || []);
    } catch (err) {
      console.error("Failed to load presentations:", err);
    } finally {
      setLoadingPresentations(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await listPresentationTemplates({
        template_type: presentationType
      });
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load templates:", err);
      toast.error("Failed to load templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      try {
        setUploadingImage(true);
        const result = await uploadImage(file);
        setUploadedImages(prev => [...prev, { url: result.url, name: file.name }]);
        toast.success(`${file.name} uploaded successfully!`);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploadingImage(false);
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSectionToggle = (section: string) => {
    setDocumentSettings(prev => ({
      ...prev,
      include_sections: prev.include_sections.includes(section)
        ? prev.include_sections.filter(s => s !== section)
        : [...prev.include_sections, section]
    }));
  };

  const getEstimatedCost = () => {
    const baseCosts = {
      'low': 0.5,
      'medium': 1.5,
      'high': 5.0,
    };
    
    let cost = baseCosts[quality];
    
    // Add cost for premium template
    const template = templates.find(t => t.id === selectedTemplate);
    if (template?.is_premium) {
      cost += 1.0;
    }
    
    return cost;
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error("Content prompt is required");
      return;
    }

    const estimatedCost = getEstimatedCost();
    if (credits !== null && credits < estimatedCost) {
      toast.error("Insufficient credits for this generation");
      navigate("/subscribe");
      return;
    }

    setLoading(true);
    
    try {
      const requestData: CreatePresentationRequest = {
        title: title.trim() || "Untitled Presentation",
        description: description.trim(),
        presentation_type: presentationType,
        original_prompt: prompt.trim(),
        quality,
        template_id: selectedTemplate || undefined,
        theme_settings: presentationType === 'slide' ? themeSettings : undefined,
        document_settings: presentationType === 'document' ? {
          template_style: documentSettings.template_style,
          sections_config: documentSettings.include_sections
        } : undefined,
        page_layout: presentationType === 'document' ? documentSettings.page_layout : undefined,
        brand_settings: Object.keys(brandSettings).some(key => brandSettings[key as keyof typeof brandSettings]) 
          ? brandSettings 
          : undefined,
        sections_config: {
          uploaded_images: uploadedImages.map(img => img.url)
        },
        is_public: false,
        allow_comments: true
      };

      const presentation = await createPresentation(requestData);
      
      // Refresh credits
      await fetchCredits();
      
      toast.success("Presentation creation started! Redirecting...");
      navigate(`/presentation/${presentation.id}`);
      
    } catch (err: any) {
      console.error("Failed to create presentation:", err);
      if (err.response?.status === 402) {
        toast.error("Insufficient credits");
        navigate("/subscribe");
      } else if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error("Failed to create presentation");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-h-screen bg-gray-50 p-6 space-y-10 overflow-y-auto">
        
        {/* Credits Warning */}
        {credits !== null && credits <= 5 && (
          <div className="flex justify-center my-6">
            <button
              onClick={() => navigate("/subscribe")}
              className="relative inline-flex items-center justify-center px-8 py-4 
                 bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900 
                 backdrop-blur-xl border border-amber-400/30 rounded-2xl 
                 text-amber-300 font-semibold text-lg tracking-wide shadow-xl 
                 ring-1 ring-amber-300/20 hover:ring-4 hover:ring-amber-400/50 
                 transition-all duration-300 ease-in-out group overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent 
                       opacity-0 group-hover:opacity-10 transition duration-500 rounded-2xl pointer-events-none" />
              <Sparkles className="mr-3 w-6 h-6 animate-pulse" />
              {credits === 0 ? "Buy Credits Now" : "Buy More Credits"}
            </button>
          </div>
        )}

        {/* Main Creation Form */}
        <div className="bg-white shadow-lg rounded-xl p-8 max-w-5xl mx-auto space-y-8 border border-gray-200">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create AI-Powered Presentation</h1>
            <p className="text-gray-600">Generate professional presentations and documents with AI assistance</p>
          </div>

          {/* Presentation Type Selection */}
          <div className="space-y-4">
            <label className="text-lg font-semibold text-gray-800">Choose Presentation Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                type="button"
                onClick={() => setPresentationType("document")}
                className={`p-6 rounded-xl border-2 transition-all ${
                  presentationType === "document"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center gap-4">
                  <FileText size={40} className={presentationType === "document" ? "text-blue-600" : "text-gray-600"} />
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900">Rich Document</h3>
                    <p className="text-sm text-gray-600 mt-2">
                      Word-like documents with rich content, sections, professional formatting, and academic citations
                    </p>
                    <div className="mt-3 text-xs text-gray-500">
                      ✓ Professional templates ✓ Academic formatting ✓ Export to PDF/Word
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPresentationType("slide")}
                className={`p-6 rounded-xl border-2 transition-all ${
                  presentationType === "slide"
                    ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200 shadow-md"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center gap-4">
                  <Monitor size={40} className={presentationType === "slide" ? "text-purple-600" : "text-gray-600"} />
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900">Slide Presentation</h3>
                    <p className="text-sm text-gray-600 mt-2">
                      PowerPoint-like slides with animations, transitions, canvas editing, and video export
                    </p>
                    <div className="mt-3 text-xs text-gray-500">
                      ✓ Animation effects ✓ Canvas editor ✓ Video export ✓ Interactive elements
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Title (optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter presentation title..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Quality & Cost
              </label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as "low" | "medium" | "high")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="low">Low Quality (0.5 credits) - Basic content</option>
                <option value="medium">Medium Quality (1.5 credits) - Enhanced content</option>
                <option value="high">High Quality (5 credits) - Premium AI generation</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your presentation..."
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-lg font-semibold text-gray-800">Choose Template (optional)</label>
              {loadingTemplates && (
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              )}
            </div>
            
            {templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  onClick={() => setSelectedTemplate("")}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTemplate === "" 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="text-center">
                    <div className="w-full h-24 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                      <span className="text-gray-500">No Template</span>
                    </div>
                    <h4 className="font-medium text-gray-900">Default</h4>
                    <p className="text-xs text-gray-600">Use basic styling</p>
                  </div>
                </div>
                
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTemplate === template.id 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-center">
                      {template.thumbnail_url ? (
                        <img 
                          src={template.thumbnail_url} 
                          alt={template.name}
                          className="w-full h-24 object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="w-full h-24 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                          <span className="text-gray-500">Preview</span>
                        </div>
                      )}
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{template.category}</p>
                      {template.is_premium && (
                        <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                          Premium (+1 credit)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : !loadingTemplates && (
              <div className="text-center py-8 text-gray-500">
                <p>No templates available for {presentationType} type</p>
              </div>
            )}
          </div>

          {/* Type-specific Settings */}
          {presentationType === "document" && (
            <div className="space-y-6 p-6 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <FileText size={20} />
                Document Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Style</label>
                  <select
                    value={documentSettings.template_style}
                    onChange={(e) => setDocumentSettings(prev => ({ 
                      ...prev, 
                      template_style: e.target.value as any 
                    }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    value={documentSettings.page_layout}
                    onChange={(e) => setDocumentSettings(prev => ({ 
                      ...prev, 
                      page_layout: e.target.value as any 
                    }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="single_column">Single Column</option>
                    <option value="two_column">Two Column</option>
                    <option value="three_column">Three Column</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Include Sections</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['introduction', 'methods', 'results', 'discussion', 'conclusion', 'references', 'appendix'].map(section => (
                    <label key={section} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white rounded">
                      <input
                        type="checkbox"
                        checked={documentSettings.include_sections.includes(section)}
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

          {presentationType === "slide" && (
            <div className="space-y-6 p-6 bg-purple-50 rounded-xl border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                <Monitor size={20} />
                Slide Theme Settings
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeSettings.primary_color}
                      onChange={(e) => setThemeSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={themeSettings.primary_color}
                      onChange={(e) => setThemeSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeSettings.secondary_color}
                      onChange={(e) => setThemeSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={themeSettings.secondary_color}
                      onChange={(e) => setThemeSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeSettings.background_color}
                      onChange={(e) => setThemeSettings(prev => ({ ...prev, background_color: e.target.value }))}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={themeSettings.background_color}
                      onChange={(e) => setThemeSettings(prev => ({ ...prev, background_color: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                  <select
                    value={themeSettings.font_family}
                    onChange={(e) => setThemeSettings(prev => ({ ...prev, font_family: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
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

          {/* Brand Settings */}
          <div className="space-y-4 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Brand Settings (optional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company/Organization Name</label>
                <input
                  type="text"
                  value={brandSettings.company_name}
                  onChange={(e) => setBrandSettings(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Your organization name..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                <input
                  type="url"
                  value={brandSettings.logo_url}
                  onChange={(e) => setBrandSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://your-logo-url.com/logo.png"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-lg font-semibold text-gray-800">Upload Reference Images (optional)</label>
              <label className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors">
                {uploadingImage ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Upload size={16} />
                )}
                Add Images
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
            </div>
            
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.url}
                      alt={image.name}
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

          {/* Main Content Prompt */}
          <div className="space-y-3">
            <label className="text-lg font-semibold text-gray-800">
              Content Prompt <span className="text-red-500">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                presentationType === "document" 
                  ? "Describe the document content you want to create (e.g., 'Write a comprehensive research paper on machine learning applications in healthcare, including methodology, case studies, and future implications...')"
                  : "Describe the presentation topic you want to create (e.g., 'Create a professional presentation explaining the history and future of artificial intelligence, including key milestones, current applications, and emerging trends...')"
              }
              className="w-full px-4 py-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none h-32"
            />
            <div className="text-sm text-gray-500">
              Be specific and detailed for better AI results. Include topics, structure, and any specific requirements.
            </div>
          </div>

          {/* Cost Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Estimated Cost</h4>
                <p className="text-sm text-blue-700">
                  Quality: {quality} ({quality === 'low' ? '0.5' : quality === 'medium' ? '1.5' : '5'} credits)
                  {selectedTemplate && templates.find(t => t.id === selectedTemplate)?.is_premium && 
                    " + Premium template (1 credit)"
                  }
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-900">{getEstimatedCost()} credits</div>
                <div className="text-sm text-blue-700">Available: {credits || 0}</div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || !prompt.trim() || (credits !== null && credits < getEstimatedCost())}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold px-6 py-4 rounded-xl transition-all shadow-lg disabled:shadow-none"
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
                  ({getEstimatedCost()} credits)
                </span>
              </>
            )}
          </button>

          {/* Feature Preview */}
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
                    <li>• Academic citation support</li>
                    <li>• Export to PDF/Word formats</li>
                    <li>• Multi-column layouts</li>
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
              <h3 className="font-semibold text-gray-900">🤖 AI Capabilities</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Intelligent content generation</li>
                <li>• Automatic structure organization</li>
                <li>• Smart image selection & placement</li>
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
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Recent Presentations</h2>
          
          {loadingPresentations ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : presentations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No presentations created yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {presentations.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/presentation/${p.id}`)}
                  className="cursor-pointer p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors group"
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
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500 capitalize">{p.status}</span>
                  </div>
                  
                  <h3 className="font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {p.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {p.description || "No description"}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{p.sections_count} sections</span>
                    <span>{new Date(p.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {presentations.length > 6 && (
            <div className="text-center mt-6">
              <button
                onClick={() => navigate('/presentations')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                View all presentations →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePresentationPage;