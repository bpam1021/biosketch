import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Loader2, FileText, Monitor, Upload, Wand2, Sparkles, Brain, Zap } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { useCredits } from "../../context/CreditsContext";
import TemplateSelector from '../../components/Presentation/TemplateSelector';

import { 
  createPresentation, 
  listPresentations,
  listPresentationTemplates,
  listChartTemplates,
  uploadImage,
  generateAIContent
} from "../../api/presentationApi";

import { 
  CreatePresentationRequest, 
  PresentationListItem,
  PresentationTemplate,
  ChartTemplate,
  AIGenerationRequest
} from "../../types/Presentation";

const CreatePresentationPage = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [presentationType, setPresentationType] = useState<"document" | "slide">("document");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [loading, setLoading] = useState(false);
  
  // AI Enhancement
  const [useAIOutline, setUseAIOutline] = useState(true);
  const [aiGeneratedOutline, setAiGeneratedOutline] = useState<any>(null);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  
  // Existing presentations
  const [presentations, setPresentations] = useState<PresentationListItem[]>([]);
  const [loadingPresentations, setLoadingPresentations] = useState(true);
  
  // Templates
  const [templates, setTemplates] = useState<PresentationTemplate[]>([]);
  const [chartTemplates, setChartTemplates] = useState<ChartTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Theme settings for slides
  const [themeSettings, setThemeSettings] = useState({
    primary_color: '#3B82F6',
    secondary_color: '#EF4444',
    background_color: '#FFFFFF',
    font_family: 'Inter',
    accent_color: '#10B981',
    text_color: '#1F2937'
  });
  
  // Document settings
  const [documentSettings, setDocumentSettings] = useState({
    template_style: 'academic' as 'academic' | 'business' | 'creative' | 'technical' | 'medical',
    page_layout: 'single_column' as 'single_column' | 'two_column' | 'three_column',
    include_sections: ['introduction', 'methods', 'results', 'discussion', 'conclusion'],
    citation_style: 'apa' as 'apa' | 'mla' | 'chicago' | 'ieee',
    include_toc: true,
    include_references: true
  });
  
  // Brand settings
  const [brandSettings, setBrandSettings] = useState({
    logo_url: '',
    brand_colors: [] as string[],
    company_name: '',
    brand_voice: 'professional' as 'professional' | 'casual' | 'academic' | 'creative' | 'technical'
  });
  
  // Advanced settings
  const [advancedSettings, setAdvancedSettings] = useState({
    target_audience: 'general' as 'general' | 'technical' | 'academic' | 'business' | 'students',
    content_depth: 'medium' as 'shallow' | 'medium' | 'deep',
    include_examples: true,
    include_statistics: false,
    include_case_studies: false,
    auto_generate_images: true,
    auto_generate_charts: true
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
      loadChartTemplates();
    }
  }, [presentationType]);

  const loadExistingPresentations = async () => {
    try {
      const data = await listPresentations({ 
        sort_by: 'updated_at',
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

  const loadChartTemplates = async () => {
    try {
      const data = await listChartTemplates();
      setChartTemplates(data);
    } catch (err) {
      console.error("Failed to load chart templates:", err);
    }
  };

  const generateOutline = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a content prompt first");
      return;
    }

    setGeneratingOutline(true);
    try {
      const outlineRequest: AIGenerationRequest = {
        generation_type: 'presentation_outline',
        prompt: `Create a detailed outline for a ${presentationType} about: ${prompt}`,
        content_length: 'medium',
        tone: brandSettings.brand_voice || 'professional'
      };

      const outline = await generateAIContent(outlineRequest);
      setAiGeneratedOutline(outline);
      toast.success("AI outline generated successfully!");
    } catch (err) {
      toast.error("Failed to generate outline");
    } finally {
      setGeneratingOutline(false);
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

  const addBrandColor = (color: string) => {
    if (!brandSettings.brand_colors.includes(color)) {
      setBrandSettings(prev => ({
        ...prev,
        brand_colors: [...prev.brand_colors, color]
      }));
    }
  };

  const removeBrandColor = (index: number) => {
    setBrandSettings(prev => ({
      ...prev,
      brand_colors: prev.brand_colors.filter((_, i) => i !== index)
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

    // Add cost for AI features
    if (useAIOutline) cost += 0.5;
    if (advancedSettings.auto_generate_images) cost += 1.0;
    if (advancedSettings.auto_generate_charts) cost += 0.5;
    if (advancedSettings.include_case_studies) cost += 1.0;
    
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
          sections_config: documentSettings.include_sections,
          citation_style: documentSettings.citation_style,
          include_toc: documentSettings.include_toc,
          include_references: documentSettings.include_references
        } : undefined,
        page_layout: presentationType === 'document' ? documentSettings.page_layout : undefined,
        brand_settings: Object.keys(brandSettings).some(key => 
          key !== 'brand_colors' ? brandSettings[key as keyof typeof brandSettings] : brandSettings.brand_colors.length > 0
        ) ? brandSettings : undefined,
        sections_config: {
          uploaded_images: uploadedImages.map(img => img.url),
          target_audience: advancedSettings.target_audience,
          content_depth: advancedSettings.content_depth,
          include_examples: advancedSettings.include_examples,
          include_statistics: advancedSettings.include_statistics,
          include_case_studies: advancedSettings.include_case_studies,
          auto_generate_images: advancedSettings.auto_generate_images,
          auto_generate_charts: advancedSettings.auto_generate_charts,
          ai_outline: useAIOutline && aiGeneratedOutline ? aiGeneratedOutline : undefined
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

        {/* AI Quick Start */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl p-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Brain size={24} />
            <h2 className="text-xl font-semibold">AI-Powered Creation</h2>
          </div>
          <p className="text-purple-100 mb-4">
            Get started instantly with our AI assistant. Describe what you want to create and let AI handle the structure and content.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Smart Outlines</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Auto Content</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Dynamic Charts</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Professional Templates</span>
          </div>
        </div>

        {/* Main Creation Form */}
        <div className="bg-white shadow-lg rounded-xl p-8 max-w-5xl mx-auto space-y-8 border border-gray-200">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create AI-Powered Presentation</h1>
            <p className="text-gray-600">Generate professional presentations and documents with advanced AI assistance</p>
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
                      ✓ Professional templates ✓ Academic formatting ✓ Export to PDF/Word ✓ Citations
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

          {/* Main Content Prompt */}
          <div className="space-y-4">
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
            
            {/* AI Outline Generation */}
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={useAIOutline}
                  onChange={(e) => setUseAIOutline(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div>
                  <span className="font-medium text-purple-900">Generate AI Outline First</span>
                  <p className="text-sm text-purple-700">Let AI create a structured outline before content generation (+0.5 credits)</p>
                </div>
              </div>
              
              {useAIOutline && prompt.trim() && (
                <button
                  onClick={generateOutline}
                  disabled={generatingOutline}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors"
                >
                  {generatingOutline ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Zap size={16} />
                  )}
                  Generate Outline
                </button>
              )}
            </div>

            {aiGeneratedOutline && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">AI Generated Outline:</h4>
                <div className="text-sm text-green-800 whitespace-pre-wrap">
                  {JSON.stringify(aiGeneratedOutline, null, 2)}
                </div>
              </div>
            )}
          </div>

          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <label className="text-sm font-medium text-gray-700">Quality & Cost</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Target Audience</label>
              <select
                value={advancedSettings.target_audience}
                onChange={(e) => setAdvancedSettings(prev => ({ 
                  ...prev, 
                  target_audience: e.target.value as any 
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="general">General Audience</option>
                <option value="technical">Technical Professionals</option>
                <option value="academic">Academic/Research</option>
                <option value="business">Business Executives</option>
                <option value="students">Students/Educational</option>
              </select>
            </div>
          </div>

          {/* Advanced AI Settings */}
          <div className="space-y-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Brain size={20} />
              AI Enhancement Options
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={advancedSettings.include_examples}
                    onChange={(e) => setAdvancedSettings(prev => ({ 
                      ...prev, 
                      include_examples: e.target.checked 
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include practical examples</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={advancedSettings.include_statistics}
                    onChange={(e) => setAdvancedSettings(prev => ({ 
                      ...prev, 
                      include_statistics: e.target.checked 
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include relevant statistics</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={advancedSettings.include_case_studies}
                    onChange={(e) => setAdvancedSettings(prev => ({ 
                      ...prev, 
                      include_case_studies: e.target.checked 
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include case studies (+1 credit)</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={advancedSettings.auto_generate_images}
                    onChange={(e) => setAdvancedSettings(prev => ({ 
                      ...prev, 
                      auto_generate_images: e.target.checked 
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Auto-generate images (+1 credit)</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={advancedSettings.auto_generate_charts}
                    onChange={(e) => setAdvancedSettings(prev => ({ 
                      ...prev, 
                      auto_generate_charts: e.target.checked 
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Auto-generate charts/diagrams (+0.5 credits)</span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content Depth</label>
                  <select
                    value={advancedSettings.content_depth}
                    onChange={(e) => setAdvancedSettings(prev => ({ 
                      ...prev, 
                      content_depth: e.target.value as any 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="shallow">Shallow - Brief overview</option>
                    <option value="medium">Medium - Balanced detail</option>
                    <option value="deep">Deep - Comprehensive analysis</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-4">
            <TemplateSelector
              presentationType={presentationType}
              selectedTemplate={selectedTemplate}
              onTemplateSelect={setSelectedTemplate}
            />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Citation Style</label>
                  <select
                    value={documentSettings.citation_style}
                    onChange={(e) => setDocumentSettings(prev => ({ 
                      ...prev, 
                      citation_style: e.target.value as any 
                    }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="apa">APA Style</option>
                    <option value="mla">MLA Style</option>
                    <option value="chicago">Chicago Style</option>
                    <option value="ieee">IEEE Style</option>
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

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={documentSettings.include_toc}
                      onChange={(e) => setDocumentSettings(prev => ({ 
                        ...prev, 
                        include_toc: e.target.checked 
                      }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Include Table of Contents</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={documentSettings.include_references}
                      onChange={(e) => setDocumentSettings(prev => ({ 
                        ...prev, 
                        include_references: e.target.checked 
                      }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Include References Section</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Include Sections</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['introduction', 'methodology', 'results', 'discussion', 'conclusion', 'references', 'appendix', 'abstract'].map(section => (
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
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                    <option value="Montserrat">Montserrat</option>
                    <option value="Open Sans">Open Sans</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeSettings.accent_color}
                      onChange={(e) => setThemeSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={themeSettings.accent_color}
                      onChange={(e) => setThemeSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeSettings.text_color}
                      onChange={(e) => setThemeSettings(prev => ({ ...prev, text_color: e.target.value }))}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={themeSettings.text_color}
                      onChange={(e) => setThemeSettings(prev => ({ ...prev, text_color: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Brand Settings */}
          <div className="space-y-4 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Brand Settings (optional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand Voice</label>
                <select
                  value={brandSettings.brand_voice}
                  onChange={(e) => setBrandSettings(prev => ({ ...prev, brand_voice: e.target.value as any }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual & Friendly</option>
                  <option value="academic">Academic & Formal</option>
                  <option value="creative">Creative & Innovative</option>
                  <option value="technical">Technical & Precise</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                <input
                  type="url"
                  value={brandSettings.logo_url}
                  onChange={(e) => setBrandSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://your-logo-url.com/logo.png"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand Colors</label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {brandSettings.brand_colors.map((color, index) => (
                    <div key={index} className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-2">
                      <div 
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm">{color}</span>
                      <button
                        onClick={() => removeBrandColor(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <input
                    type="color"
                    onChange={(e) => addBrandColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300"
                    title="Add brand color"
                  />
                </div>
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

          {/* Cost Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Estimated Cost</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>Quality: {quality} ({quality === 'low' ? '0.5' : quality === 'medium' ? '1.5' : '5'} credits)</div>
                  {selectedTemplate && templates.find(t => t.id === selectedTemplate)?.is_premium && 
                    <div>Premium template: +1 credit</div>
                  }
                  {useAIOutline && <div>AI outline generation: +0.5 credits</div>}
                  {advancedSettings.auto_generate_images && <div>Auto-generate images: +1 credit</div>}
                  {advancedSettings.auto_generate_charts && <div>Auto-generate charts: +0.5 credits</div>}
                  {advancedSettings.include_case_studies && <div>Case studies: +1 credit</div>}
                </div>
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
                    <li>• Table of contents generation</li>
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
                    <li>• Real-time collaboration</li>
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
                <li>• Context-aware content optimization</li>
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
                  className="cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group border border-gray-200"
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
                onClick={() => navigate('/presentation')}
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