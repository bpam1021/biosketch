import React, { useState, useRef, useEffect } from 'react';
import { Presentation, ContentSection, DiagramElement } from '../../types/Presentation';
import { 
  FiPlay, FiPause, FiSkipForward, FiSkipBack, FiDownload, FiSettings, FiPlus, 
  FiEdit3, FiZap, FiType, FiImage, FiBarChart, FiList, FiLayers, FiUpload, FiTrash2, FiMove, FiGrid,
  FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify,
  FiSave, FiCopy, FiMoreHorizontal, FiMaximize, FiMinimize, FiEyeOff, FiX, FiAlertCircle
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { generateSectionContent, uploadImage, exportPresentation } from '../../api/presentationApi';

// Complete backend-compatible template types (matches SlideTemplate model + AI generation)
type PowerPointTemplateType = 
  // Core presentation templates
  | 'title' 
  | 'title_content' 
  | 'two_column' 
  | 'image_content' 
  | 'full_image' 
  | 'comparison' 
  | 'agenda' 
  | 'chart' 
  | 'table' 
  | 'quote'
  // AI-specific templates (for Celery AI generation compatibility)
  | 'title_slide'
  | 'agenda_overview'
  | 'section_divider'
  | 'content_image'
  | 'data_visual'
  | 'quote_testimonial'
  | 'conclusion_cta'
  | 'thank_you';

interface PowerPointSlideEditorProps {
  presentation: Presentation;
  sections: ContentSection[];
  onSectionUpdate: (sectionId: string, updates: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionsReorder: (newOrder: ContentSection[]) => Promise<void>;
  onSectionCreate: (data: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionDelete: (sectionId: string) => Promise<void>;
  onDiagramCreate: (diagram: Partial<DiagramElement>, sectionId?: string) => Promise<DiagramElement | undefined>;
  setSections?: (sections: ContentSection[]) => void;
}

interface SlideTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
}

const PowerPointSlideEditor: React.FC<PowerPointSlideEditorProps> = ({
  presentation,
  sections,
  onSectionUpdate,
  onSectionsReorder,
  onSectionCreate,
  onSectionDelete,
  onDiagramCreate,
  setSections
}) => {
  // Main state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState<ContentSection | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Editing state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PowerPointTemplateType>('title_content');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'template' | 'animation'>('content');
  
  // Animation state
  const [animationSettings, setAnimationSettings] = useState({
    transition: 'fade', // fade, slide, zoom, flip, none
    transitionDuration: 1000, // milliseconds
    autoAdvance: false,
    autoAdvanceDelay: 5000, // milliseconds
    showDuration: 5000, // how long slide shows in presentation mode
    entryAnimation: 'fadeIn', // fadeIn, slideIn, zoomIn, none
    exitAnimation: 'fadeOut' // fadeOut, slideOut, zoomOut, none
  });
  
  // Theme state
  const [currentTheme, setCurrentTheme] = useState<SlideTheme>({
    id: 'professional',
    name: 'Professional Blue',
    primaryColor: '#1f4e79',
    secondaryColor: '#70ad47',
    accentColor: '#c55a11',
    backgroundColor: '#ffffff',
    textColor: '#333333',
    fontFamily: 'Segoe UI, system-ui, sans-serif'
  });

  // AI Generation state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiTemplate, setAITemplate] = useState<PowerPointTemplateType>('title_content');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [slideImages, setSlideImages] = useState<{[slideId: string]: string}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-advance timer
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Export status polling timer
  const exportPollingTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Export tracking state
  const [exportStatus, setExportStatus] = useState<{
    isExporting: boolean;
    taskId: string | null;
    status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    error: string | null;
  }>({
    isExporting: false,
    taskId: null,
    status: 'idle',
    progress: 0,
    error: null
  });

  // PowerPoint template definitions
  const templateDefinitions = {
    title: { name: 'Title Slide', icon: '🎯', description: 'Title with subtitle' },
    title_content: { name: 'Title and Content', icon: '📄', description: 'Title with bullet points' },
    two_column: { name: 'Two Content', icon: '📑', description: 'Two column layout' },
    image_content: { name: 'Content with Caption', icon: '🖼️', description: 'Image with content' },
    full_image: { name: 'Picture with Caption', icon: '🖼️', description: 'Full image slide' },
    comparison: { name: 'Comparison', icon: '⚖️', description: 'Compare two items' },
    agenda: { name: 'Content with Title', icon: '📋', description: 'Agenda or list' },
    chart: { name: 'Title and Chart', icon: '📊', description: 'Chart or graph' },
    table: { name: 'Title and Table', icon: '📊', description: 'Data table' },
    quote: { name: 'Quote with Attribution', icon: '💬', description: 'Quote slide' },
    title_slide: { name: 'Title Slide (AI)', icon: '🎯', description: 'AI-generated title' },
    agenda_overview: { name: 'Agenda', icon: '📋', description: 'AI agenda overview' },
    section_divider: { name: 'Section Header', icon: '📑', description: 'Section divider' },
    content_image: { name: 'Content with Picture', icon: '📷', description: 'AI content + image' },
    data_visual: { name: 'Chart', icon: '📊', description: 'Data visualization' },
    quote_testimonial: { name: 'Quote', icon: '💬', description: 'Quote or testimonial' },
    conclusion_cta: { name: 'Closing Slide', icon: '🎬', description: 'Conclusion/CTA' },
    thank_you: { name: 'Thank You', icon: '🙏', description: 'Thank you slide' },
  };

  // Get slides (filter sections that can be slides)
  const slides = sections.filter(section => {
    const sectionType = section.section_type;
    
    // Include all sections that match our PowerPoint template types
    const isSlideSection = sectionType && (
      Object.keys(templateDefinitions).includes(sectionType) ||
      sectionType === 'content_slide' || // Legacy fallback
      sectionType.includes('slide') || // Any slide-related type
      sectionType.includes('title') || // Title-based templates
      sectionType.includes('content') // Content-based templates
    );
    
    console.log(`Section ${section.id}: type="${sectionType}", isSlide=${isSlideSection}`);
    return isSlideSection;
  });

  const currentSlide = slides[currentSlideIndex];

  // Navigation functions
  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlideIndex(index);
    }
  };

  const nextSlide = () => goToSlide(currentSlideIndex + 1);
  const prevSlide = () => goToSlide(currentSlideIndex - 1);

  // Presentation mode functions
  const startPresentation = () => {
    setIsPresenting(true);
    // Request fullscreen
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const exitPresentation = () => {
    setIsPresenting(false);
    if (document.exitFullscreen && isFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
    // Clear any auto-advance timer
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  };

  // Auto-advance effect for presentation mode
  useEffect(() => {
    if (isPresenting) {
      const currentSlide = slides[currentSlideIndex];
      const animationSettings = currentSlide?.content_data?.animation_settings;
      
      if (animationSettings?.autoAdvance && currentSlideIndex < slides.length - 1) {
        // Clear any existing timer
        if (autoAdvanceTimer.current) {
          clearTimeout(autoAdvanceTimer.current);
        }
        
        // Set new timer for auto-advance
        autoAdvanceTimer.current = setTimeout(() => {
          nextSlide();
        }, animationSettings.autoAdvanceDelay || 5000);
      }
    }
    
    // Cleanup timer on unmount or when dependencies change
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }
    };
  }, [isPresenting, currentSlideIndex, slides]);

  // Cleanup effect for timers
  useEffect(() => {
    return () => {
      // Cleanup auto-advance timer
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }
      // Cleanup export polling timer
      if (exportPollingTimer.current) {
        clearTimeout(exportPollingTimer.current);
        exportPollingTimer.current = null;
      }
    };
  }, []);

  // Slide editing functions
  const startEditingSlide = (slide: ContentSection) => {
    setSelectedSlide(slide);
    setEditTitle(slide.title || '');
    setEditContent(slide.content || '');
    setSelectedTemplate(slide.section_type as PowerPointTemplateType || 'title_content');
    
    // Load animation settings if they exist
    if (slide.content_data?.animation_settings) {
      setAnimationSettings(slide.content_data.animation_settings);
    } else {
      // Reset to defaults
      setAnimationSettings({
        transition: 'fade',
        transitionDuration: 1000,
        autoAdvance: false,
        autoAdvanceDelay: 5000,
        showDuration: 5000,
        entryAnimation: 'fadeIn',
        exitAnimation: 'fadeOut'
      });
    }
    
    setActiveTab('content');
    setIsEditingSlide(true);
  };

  const saveSlideChanges = async () => {
    if (!selectedSlide) return;

    try {
      setIsSaving(true);
      
      // Use the new partial_update approach with slide_id
      const response = await fetch(`/api/users/presentations/${presentation.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          slide_id: selectedSlide.id,
          title: editTitle,
          content: editContent,
          rich_content: editContent,
          section_type: selectedTemplate,
          animation_settings: animationSettings,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update only the specific slide that was edited, preserving other slides
      if (result.data && result.data.sections && setSections) {
        const updatedSlide = result.data.sections.find((s: any) => s.id === selectedSlide.id);
        if (updatedSlide) {
          const updatedSections = sections.map(section =>
            section.id === selectedSlide.id ? { ...section, ...updatedSlide } : section
          );
          setSections(updatedSections);
        } else {
          // If the backend doesn't return the updated slide, update with local changes
          const updatedSections = sections.map(section =>
            section.id === selectedSlide.id ? {
              ...section,
              title: editTitle,
              content: editContent,
              rich_content: editContent,
              section_type: selectedTemplate as any,
              animation_settings: animationSettings,
              updated_at: new Date().toISOString()
            } : section
          );
          setSections(updatedSections);
        }
      }
      
      setIsEditingSlide(false);
      setSelectedSlide(null);
      toast.success('Slide updated successfully!');
    } catch (error) {
      console.error('Error saving slide:', error);
      toast.error('Failed to save slide changes');
    } finally {
      setIsSaving(false);
    }
  };

  const addNewSlide = async () => {
    try {
      const newSlideData = {
        section_type: 'content_slide' as any,
        title: 'New Slide',
        content: 'Click to add content',
        rich_content: 'Click to add content',
        ai_generated: false,
        generation_metadata: {},
        comments: [],
        version_history: [],
        media_files: [],
        order: slides.length
      };

      await onSectionCreate(newSlideData);
      toast.success('New slide added!');
    } catch (error) {
      console.error('Error creating slide:', error);
      toast.error('Failed to create new slide');
    }
  };

  // AI-powered slide generation
  const generateAISlide = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt for AI generation');
      return;
    }

    try {
      setIsGeneratingAI(true);
      
      const newSlideData = {
        section_type: aiTemplate.includes('slide') ? aiTemplate as any : 'content_slide' as any,
        title: 'Generating...',
        content: 'AI is generating slide content...',
        rich_content: 'AI is generating slide content...',
        ai_generated: true,
        generation_metadata: {
          prompt: aiPrompt,
          template_type: aiTemplate,
          generation_date: new Date().toISOString()
        },
        comments: [],
        version_history: [],
        media_files: [],
        order: slides.length
      };

      // Create slide first
      const createdSlide = await onSectionCreate(newSlideData);
      if (!createdSlide) throw new Error('Failed to create slide');

      // Generate AI content using backend Celery task
      toast.info('🤖 Generating slide content with AI...');
      
      const aiContent = await generateSectionContent(presentation.id, createdSlide.id, {
        generation_type: 'section_content' as any,
        prompt: `Create a professional PowerPoint slide with layout "${aiTemplate}". Focus on: ${aiPrompt}`,
        content_length: 'medium',
        tone: 'professional'
      });

      toast.success('✅ AI slide generated successfully!');
      setShowAIModal(false);
      setAIPrompt('');
      return aiContent;
    } catch (error) {
      console.error('Error generating AI slide:', error);
      toast.error('Failed to generate AI slide');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Image upload functionality
  const handleImageUpload = async (slideId: string, file: File) => {
    try {
      setIsUploadingImage(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('section_id', slideId);
      
      // Upload image using the API
      const response = await uploadImage(presentation.id, slideId, formData);
      
      // Update slide images state
      setSlideImages(prev => ({
        ...prev,
        [slideId]: response.image_url
      }));
      
      // Use the new partial_update approach to save the image to the slide
      const updateResponse = await fetch(`/api/users/presentations/${presentation.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          slide_id: slideId,
          image_url: response.image_url
        })
      });

      if (!updateResponse.ok) {
        throw new Error(`HTTP error! status: ${updateResponse.status}`);
      }

      const result = await updateResponse.json();
      
      // Update only the specific slide that had the image uploaded, preserving other slides
      if (result.data && result.data.sections && setSections) {
        const updatedSlide = result.data.sections.find((s: any) => s.id === slideId);
        if (updatedSlide) {
          const updatedSections = sections.map(section =>
            section.id === slideId ? { ...section, ...updatedSlide } : section
          );
          setSections(updatedSections);
        } else {
          // If the backend doesn't return the updated slide, update with local image URL
          const updatedSections = sections.map(section =>
            section.id === slideId ? {
              ...section,
              image_url: response.image_url,
              updated_at: new Date().toISOString()
            } : section
          );
          setSections(updatedSections);
        }
      }
      
      toast.success('🖼️ Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const triggerImageUpload = (slideId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-slide-id', slideId);
      fileInputRef.current.click();
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, slideId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      // Validate file size (max 10MB)
      if (imageFile.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }
      handleImageUpload(slideId, imageFile);
    } else {
      toast.error('Please drop an image file');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const slideId = event.target.getAttribute('data-slide-id');
    
    if (file && slideId) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }
      
      handleImageUpload(slideId, file);
    }
    
    // Clear the input
    event.target.value = '';
  };

  // MP4 Export functionality
  const handleMP4Export = async () => {
    try {
      if (slides.length === 0) {
        toast.error('No slides to export');
        return;
      }

      // Set exporting state
      setExportStatus({
        isExporting: true,
        taskId: null,
        status: 'pending',
        progress: 0,
        error: null
      });

      toast.info('🎬 Starting MP4 export... This may take a few minutes.');
      
      const exportResult = await exportPresentation(presentation.id, {
        export_format: 'mp4',
        export_settings: {
          resolution: '1080p',
          fps: 30,
          duration_per_slide: 5, // seconds
          transition_duration: 1,
          include_narration: false,
          background_music: false
        }
      });

      // Update state with job ID and start polling
      if (exportResult.job_id) {
        setExportStatus(prev => ({
          ...prev,
          taskId: exportResult.job_id,
          status: 'processing'
        }));
        pollExportStatus(exportResult.job_id);
      } else {
        throw new Error('No job ID returned from export');
      }
      
    } catch (error) {
      console.error('Error starting MP4 export:', error);
      setExportStatus({
        isExporting: false,
        taskId: null,
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to start MP4 export'
      });
      toast.error('Failed to start MP4 export');
    }
  };

  const pollExportStatus = (taskId: string) => {
    const checkStatus = async () => {
      try {
        // Check export status using the correct endpoint with authentication
        const response = await fetch(`/api/exports/${taskId}/status/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error('Export status check failed:', response.status, response.statusText);
          setExportStatus(prev => ({
            ...prev,
            status: 'failed',
            error: `Status check failed: ${response.status}`,
            isExporting: false
          }));
          toast.error('Failed to check export status');
          return;
        }
        
        const statusData = await response.json();
        console.log('Export status:', statusData);  // Debug log
        
        // Update state with current status
        setExportStatus(prev => ({
          ...prev,
          status: statusData.status,
          progress: statusData.progress || 0
        }));
        
        if (statusData.status === 'completed') {
          // Update final state
          setExportStatus(prev => ({
            ...prev,
            isExporting: false,
            status: 'completed',
            progress: 100
          }));
          
          toast.success('🎉 MP4 export completed! Starting download...');
          
          // Auto-download the file with proper authentication
          try {
            const downloadResponse = await fetch(`/api/exports/${taskId}/download/`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              }
            });
            
            if (downloadResponse.ok) {
              const blob = await downloadResponse.blob();
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${presentation.title}_presentation.mp4`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            } else {
              // Fallback: try direct link
              const link = document.createElement('a');
              link.href = `/api/exports/${taskId}/download/`;
              link.download = `${presentation.title}_presentation.mp4`;
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          } catch (downloadError) {
            console.error('Download failed:', downloadError);
            toast.error('Download failed, but export completed');
          }
          
          // Reset state after short delay
          setTimeout(() => {
            setExportStatus({
              isExporting: false,
              taskId: null,
              status: 'idle',
              progress: 0,
              error: null
            });
          }, 3000);
          
        } else if (statusData.status === 'failed') {
          setExportStatus(prev => ({
            ...prev,
            status: 'failed',
            isExporting: false,
            error: statusData.error || 'Export failed'
          }));
          toast.error(`MP4 export failed: ${statusData.error || 'Unknown error'}`);
          
        } else if (statusData.status === 'processing' || statusData.status === 'pending') {
          // Continue polling
          exportPollingTimer.current = setTimeout(checkStatus, 2000); // Check every 2 seconds
          
        } else {
          // Unknown status, continue polling for a bit
          console.log('Unknown export status:', statusData.status);
          exportPollingTimer.current = setTimeout(checkStatus, 3000);
        }
      } catch (error) {
        console.error('Error checking export status:', error);
        setExportStatus(prev => ({
          ...prev,
          status: 'failed',
          isExporting: false,
          error: error instanceof Error ? error.message : 'Status check failed'
        }));
        toast.error('Failed to check export status');
      }
    };

    // Start polling immediately
    exportPollingTimer.current = setTimeout(checkStatus, 1000);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isPresenting) {
        switch (e.key) {
          case 'ArrowRight':
          case 'ArrowDown':
          case ' ':
            e.preventDefault();
            nextSlide();
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault();
            prevSlide();
            break;
          case 'Escape':
            e.preventDefault();
            exitPresentation();
            break;
          case 'Home':
            e.preventDefault();
            goToSlide(0);
            break;
          case 'End':
            e.preventDefault();
            goToSlide(slides.length - 1);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPresenting, currentSlideIndex, slides.length]);

  // PowerPoint-like slide canvas
  const renderSlideCanvas = () => {
    if (!currentSlide) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-gray-600 text-lg">No slides available</p>
            <button
              onClick={addNewSlide}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Slide
            </button>
          </div>
        </div>
      );
    }

    const template = templateDefinitions[currentSlide.section_type as PowerPointTemplateType] || templateDefinitions.title_content;

    return (
      <div 
        className="w-full h-full bg-white rounded-lg shadow-lg border relative"
        style={{
          fontFamily: currentTheme.fontFamily,
          aspectRatio: '16/9',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      >
        {/* Slide content based on template */}
        <div className="p-8 h-full flex flex-col">
          {(currentSlide.section_type as string) === 'title' || currentSlide.section_type === 'title_slide' ? (
            // Title slide layout
            <div className="flex-1 flex flex-col justify-center text-center">
              <h1 
                className="text-4xl md:text-6xl font-bold mb-6"
                style={{ color: currentTheme.primaryColor }}
              >
                {currentSlide.title || 'Presentation Title'}
              </h1>
              <div 
                className="text-xl md:text-2xl mb-4"
                style={{ color: currentTheme.textColor }}
                dangerouslySetInnerHTML={{ __html: currentSlide.content || 'Subtitle or presenter information' }}
              />
              {/* AI Generated indicator */}
              {currentSlide.ai_generated && (
                <div className="mt-4 px-4 py-2 bg-purple-100 text-purple-800 text-sm rounded-lg inline-block">
                  ✨ AI Generated Content
                </div>
              )}
            </div>
          ) : (currentSlide.section_type as string) === 'two_column' ? (
            // Two column layout
            <div className="h-full flex flex-col">
              <h2 
                className="text-3xl font-bold mb-6"
                style={{ color: currentTheme.primaryColor }}
              >
                {currentSlide.title || 'Slide Title'}
              </h2>
              <div className="flex gap-8 flex-1">
                <div className="flex-1">
                  <div dangerouslySetInnerHTML={{ __html: currentSlide.content?.split('|')[0] || 'Left column content' }} />
                </div>
                <div className="flex-1">
                  <div dangerouslySetInnerHTML={{ __html: currentSlide.content?.split('|')[1] || 'Right column content' }} />
                </div>
              </div>
            </div>
          ) : (currentSlide.section_type as string) === 'image_content' || (currentSlide.section_type as string) === 'content_image' ? (
            // Image + Content layout
            <div className="h-full flex flex-col">
              <h2 
                className="text-3xl font-bold mb-6"
                style={{ color: currentTheme.primaryColor }}
              >
                {currentSlide.title || 'Slide Title'}
              </h2>
              <div className="flex gap-8 flex-1">
                <div className="flex-1">
                  <div 
                    className="text-lg leading-relaxed"
                    style={{ color: currentTheme.textColor }}
                    dangerouslySetInnerHTML={{ __html: currentSlide.content || 'Slide content goes here...' }}
                  />
                </div>
                <div className="flex-1">
                  {(currentSlide.media_files && currentSlide.media_files.length > 0) || slideImages[currentSlide.id] ? (
                    <img
                      src={slideImages[currentSlide.id] || currentSlide.media_files[0]}
                      alt="Slide image"
                      className="w-full h-full object-contain rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <FiImage size={48} className="mx-auto mb-2" />
                        <p>Image placeholder</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (currentSlide.section_type as string) === 'full_image' ? (
            // Full image layout
            <div className="h-full relative">
              {(currentSlide.media_files && currentSlide.media_files.length > 0) || slideImages[currentSlide.id] ? (
                <>
                  <img
                    src={slideImages[currentSlide.id] || currentSlide.media_files[0]}
                    alt="Slide background"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl font-bold mb-4">{currentSlide.title || 'Slide Title'}</h2>
                      <div 
                        className="text-xl"
                        dangerouslySetInnerHTML={{ __html: currentSlide.content || 'Slide content' }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <FiImage size={64} className="mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2" style={{ color: currentTheme.primaryColor }}>
                      {currentSlide.title || 'Full Image Slide'}
                    </h2>
                    <p>Upload an image for this slide</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Standard title + content layout
            <div className="h-full flex flex-col">
              <h2 
                className="text-3xl font-bold mb-6"
                style={{ color: currentTheme.primaryColor }}
              >
                {currentSlide.title || 'Slide Title'}
              </h2>
              <div 
                className="text-lg leading-relaxed flex-1"
                style={{ color: currentTheme.textColor }}
                dangerouslySetInnerHTML={{ __html: currentSlide.content || 'Slide content goes here...' }}
              />
              {/* Show any uploaded image */}
              {((currentSlide.media_files && currentSlide.media_files.length > 0) || slideImages[currentSlide.id]) && (
                <div className="mt-6">
                  <img
                    src={slideImages[currentSlide.id] || currentSlide.media_files[0]}
                    alt="Slide image"
                    className="max-w-full h-48 object-contain rounded-lg border border-gray-200 mx-auto"
                  />
                </div>
              )}
              {/* AI Generated indicator */}
              {currentSlide.ai_generated && (
                <div className="mt-4 px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-lg self-start">
                  ✨ AI Generated
                </div>
              )}
            </div>
          )}
        </div>

        {/* Slide number */}
        <div className="absolute bottom-2 right-4 text-sm text-gray-500">
          {currentSlideIndex + 1} / {slides.length}
        </div>
      </div>
    );
  };

  if (isPresenting) {
    const currentSlide = slides[currentSlideIndex];
    const slideAnimationSettings = currentSlide?.content_data?.animation_settings || {
      transition: 'fade',
      transitionDuration: 1000,
      entryAnimation: 'fadeIn',
      exitAnimation: 'fadeOut',
      autoAdvance: false,
      autoAdvanceDelay: 5000
    };
    
    // Full presentation mode with animations
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div 
          className="w-full h-full flex items-center justify-center p-8"
          style={{
            animation: `presentationSlide-${slideAnimationSettings.entryAnimation} ${slideAnimationSettings.transitionDuration || 1000}ms ease-in-out`
          }}
        >
          <style>{`
            @keyframes presentationSlide-fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes presentationSlide-slideIn {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes presentationSlide-zoomIn {
              from { transform: scale(0.8); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            
            @keyframes presentationSlide-fadeOut {
              from { opacity: 1; }
              to { opacity: 0; }
            }
            
            @keyframes presentationSlide-slideOut {
              from { transform: translateX(0); opacity: 1; }
              to { transform: translateX(-100%); opacity: 0; }
            }
            
            @keyframes presentationSlide-zoomOut {
              from { transform: scale(1); opacity: 1; }
              to { transform: scale(0.8); opacity: 0; }
            }
          `}</style>
          
          {renderSlideCanvas()}
        </div>
        
        {/* Presentation controls */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-sm text-white px-6 py-3 rounded-full">
          <button onClick={prevSlide} disabled={currentSlideIndex === 0} className="p-2 hover:bg-white/20 rounded disabled:opacity-50">
            <FiSkipBack size={20} />
          </button>
          <span className="text-sm font-medium">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <button onClick={nextSlide} disabled={currentSlideIndex >= slides.length - 1} className="p-2 hover:bg-white/20 rounded disabled:opacity-50">
            <FiSkipForward size={20} />
          </button>
          
          {/* Auto-advance indicator */}
          {slideAnimationSettings.autoAdvance && (
            <>
              <div className="h-6 w-px bg-white/30 mx-2"></div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Auto
              </div>
            </>
          )}
          
          <div className="h-6 w-px bg-white/30 mx-2"></div>
          <button onClick={exitPresentation} className="p-2 hover:bg-white/20 rounded">
            <FiMinimize size={20} />
          </button>
        </div>
        
        {/* Auto-advance progress bar */}
        {slideAnimationSettings.autoAdvance && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div 
              className="h-full bg-blue-400 transition-all ease-linear"
              style={{
                width: '0%',
                animation: `autoAdvanceProgress ${slideAnimationSettings.autoAdvanceDelay || 5000}ms linear forwards`
              }}
            />
            <style>{`
              @keyframes autoAdvanceProgress {
                from { width: 0%; }
                to { width: 100%; }
              }
            `}</style>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Slide Navigation */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FiLayers size={18} />
              Slides
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAIModal(true)}
                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                title="Generate AI Slide"
              >
                <FiZap size={16} />
              </button>
              <button
                onClick={addNewSlide}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="New Slide"
              >
                <FiPlus size={16} />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">{slides.length} slides</p>
        </div>

        {/* Slide Thumbnails */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {slides.map((slide, index) => {
            const template = templateDefinitions[slide.section_type as PowerPointTemplateType] || templateDefinitions.title_content;
            const isActive = index === currentSlideIndex;
            
            return (
              <div
                key={slide.id}
                className={`group relative cursor-pointer rounded-lg border-2 transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
                onClick={() => goToSlide(index)}
              >
                {/* Slide thumbnail */}
                <div className="relative">
                  <div className="aspect-video bg-white rounded-lg p-3 text-xs">
                    <div className="font-semibold text-blue-800 mb-2 truncate">
                      {slide.title || `Slide ${index + 1}`}
                    </div>
                    <div className="text-gray-600 line-clamp-3">
                      {slide.content?.replace(/<[^>]*>/g, '').substring(0, 100) || 'No content'}
                    </div>
                  </div>
                  
                  {/* Slide number */}
                  <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </div>
                  
                  {/* Template indicator */}
                  <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {template.icon}
                  </div>

                  {/* Quick actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingSlide(slide);
                      }}
                      className="p-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100"
                      title="Edit slide"
                    >
                      <FiEdit3 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerImageUpload(slide.id);
                      }}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      title="Upload image"
                      disabled={isUploadingImage}
                    >
                      <FiImage size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this slide?')) {
                          onSectionDelete(slide.id);
                        }
                      }}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      title="Delete slide"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Presentation Title */}
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{presentation.title}</h1>
                <p className="text-sm text-gray-600">
                  Slide {currentSlideIndex + 1} of {slides.length} • PowerPoint Mode
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Navigation */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={prevSlide}
                  disabled={currentSlideIndex === 0}
                  className="p-2 hover:bg-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous slide"
                >
                  <FiSkipBack size={16} />
                </button>
                <span className="px-3 py-2 text-sm font-medium text-gray-700">
                  {currentSlideIndex + 1} / {slides.length}
                </span>
                <button
                  onClick={nextSlide}
                  disabled={currentSlideIndex >= slides.length - 1}
                  className="p-2 hover:bg-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next slide"
                >
                  <FiSkipForward size={16} />
                </button>
              </div>

              {/* Present button */}
              <button
                onClick={startPresentation}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <FiPlay size={16} />
                Start Slideshow
              </button>

              {/* Export to MP4 button with dynamic status */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleMP4Export()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    exportStatus.isExporting
                      ? 'bg-blue-600 cursor-not-allowed'
                      : exportStatus.status === 'completed'
                      ? 'bg-green-600 hover:bg-green-700'
                      : exportStatus.status === 'failed'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white`}
                  disabled={slides.length === 0 || exportStatus.isExporting}
                >
                  {exportStatus.isExporting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      {exportStatus.status === 'pending' && 'Starting Export...'}
                      {exportStatus.status === 'processing' && `Exporting... ${exportStatus.progress}%`}
                    </>
                  ) : exportStatus.status === 'completed' ? (
                    <>
                      <FiDownload size={16} />
                      Downloaded!
                    </>
                  ) : exportStatus.status === 'failed' ? (
                    <>
                      <FiX size={16} />
                      Export Failed - Retry
                    </>
                  ) : (
                    <>
                      <FiDownload size={16} />
                      Export MP4
                    </>
                  )}
                </button>
                
                {/* Progress bar when exporting */}
                {exportStatus.isExporting && exportStatus.progress > 0 && (
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mx-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${exportStatus.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{exportStatus.progress}%</span>
                  </div>
                )}
                
                {/* Error message */}
                {exportStatus.status === 'failed' && exportStatus.error && (
                  <div className="flex items-center text-red-600 text-sm">
                    <FiAlertCircle size={16} className="mr-1" />
                    {exportStatus.error}
                  </div>
                )}
              </div>

              {/* More options */}
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <FiMoreHorizontal size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Slide Canvas */}
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="w-full max-w-6xl max-h-full">
            {renderSlideCanvas()}
          </div>
        </div>
      </div>

      {/* Edit Slide Modal */}
      {isEditingSlide && selectedSlide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Edit Slide</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Slide {slides.findIndex(s => s.id === selectedSlide.id) + 1} of {slides.length}
                </p>
              </div>
              <button
                onClick={() => setIsEditingSlide(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiX size={20} />
              </button>
            </div>
            
            {/* PowerPoint-like Formatting Ribbon */}
            <div className="bg-gray-50 border-b border-gray-200 p-4">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Template Selection */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Layout:</span>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value as PowerPointTemplateType)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                  >
                    {Object.entries(templateDefinitions).map(([key, template]) => (
                      <option key={key} value={key}>
                        {template.icon} {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="h-6 w-px bg-gray-300"></div>

                {/* Font Size */}
                <select className="px-2 py-1 border border-gray-300 rounded text-sm bg-white">
                  <option value="18">18</option>
                  <option value="20">20</option>
                  <option value="24">24</option>
                  <option value="28">28</option>
                  <option value="32">32</option>
                  <option value="36">36</option>
                </select>

                {/* Font Formatting */}
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-gray-200 rounded" title="Bold">
                    <FiBold size={16} />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded" title="Italic">
                    <FiItalic size={16} />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded" title="Underline">
                    <FiUnderline size={16} />
                  </button>
                </div>

                <div className="h-6 w-px bg-gray-300"></div>

                {/* Alignment */}
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-gray-200 rounded" title="Align Left">
                    <FiAlignLeft size={16} />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded" title="Center">
                    <FiAlignCenter size={16} />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded" title="Align Right">
                    <FiAlignRight size={16} />
                  </button>
                </div>

                <div className="h-6 w-px bg-gray-300"></div>

                {/* Insert Options */}
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      console.log('Insert Image clicked, selectedSlide:', selectedSlide);
                      if (selectedSlide) {
                        triggerImageUpload(selectedSlide.id);
                      } else {
                        toast.error('No slide selected for image upload');
                      }
                    }}
                    className="p-2 hover:bg-gray-200 rounded" 
                    title="Insert Image"
                    disabled={isUploadingImage}
                  >
                    <FiImage size={16} />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded" title="Insert Chart">
                    <FiBarChart size={16} />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded" title="Bullet List">
                    <FiList size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${
                    activeTab === 'content'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Content
                </button>
                <button
                  onClick={() => setActiveTab('template')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${
                    activeTab === 'template'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Template
                </button>
                <button
                  onClick={() => setActiveTab('animation')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${
                    activeTab === 'animation'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Animation
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'content' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Edit Form */}
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Slide Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      placeholder="Enter slide title..."
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Slide Content</label>
                    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-80 p-6 border-none resize-none focus:ring-0 focus:outline-none text-base leading-relaxed"
                        placeholder="Enter your slide content here..."
                        style={{
                          fontFamily: currentTheme.fontFamily,
                          fontSize: '16px',
                          lineHeight: '1.6'
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Tips: Use bullet points with • or - for lists. For two-column slides, separate content with |
                    </p>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Live Preview</h4>
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="bg-white p-6 aspect-video"
                      style={{ fontFamily: currentTheme.fontFamily }}
                    >
                      {/* Preview based on selected template */}
                      {(selectedTemplate === 'title' || selectedTemplate === 'title_slide') ? (
                        <div className="h-full flex flex-col justify-center text-center">
                          <h1 className="text-2xl font-bold mb-4" style={{ color: currentTheme.primaryColor }}>
                            {editTitle || 'Slide Title'}
                          </h1>
                          <div 
                            className="text-base"
                            style={{ color: currentTheme.textColor }}
                            dangerouslySetInnerHTML={{ __html: editContent || 'Slide content...' }}
                          />
                        </div>
                      ) : selectedTemplate === 'two_column' ? (
                        <div className="h-full">
                          <h2 className="text-xl font-bold mb-4" style={{ color: currentTheme.primaryColor }}>
                            {editTitle || 'Slide Title'}
                          </h2>
                          <div className="flex gap-4">
                            <div className="flex-1 text-sm">
                              <div dangerouslySetInnerHTML={{ __html: editContent?.split('|')[0] || 'Left column' }} />
                            </div>
                            <div className="flex-1 text-sm">
                              <div dangerouslySetInnerHTML={{ __html: editContent?.split('|')[1] || 'Right column' }} />
                            </div>
                          </div>
                        </div>
                      ) : selectedTemplate === 'content_image' || selectedTemplate === 'image_content' ? (
                        <div className="h-full">
                          <h2 className="text-xl font-bold mb-4" style={{ color: currentTheme.primaryColor }}>
                            {editTitle || 'Slide Title'}
                          </h2>
                          <div className="flex gap-4 h-32">
                            {selectedTemplate === 'content_image' ? (
                              <>
                                <div className="flex-1 text-sm">
                                  <div 
                                    style={{ color: currentTheme.textColor }}
                                    dangerouslySetInnerHTML={{ __html: editContent || 'Slide content goes here...' }}
                                  />
                                </div>
                                <div 
                                  className="flex-1 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors relative overflow-hidden"
                                  onClick={() => selectedSlide && triggerImageUpload(selectedSlide.id)}
                                  onDragOver={handleDragOver}
                                  onDragEnter={handleDragEnter}
                                  onDrop={(e) => selectedSlide && handleDrop(e, selectedSlide.id)}
                                  title="Click or drag & drop to upload image"
                                >
                                  {selectedSlide && (slideImages[selectedSlide.id] || (selectedSlide.media_files && selectedSlide.media_files.length > 0)) ? (
                                    <img
                                      src={slideImages[selectedSlide.id] || selectedSlide.media_files[0]}
                                      alt="Slide image"
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (
                                    <div className="text-center text-gray-500">
                                      <FiImage size={24} className="mx-auto mb-2" />
                                      <p className="text-xs">Click or drag image here</p>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <div 
                                  className="flex-1 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors relative overflow-hidden"
                                  onClick={() => selectedSlide && triggerImageUpload(selectedSlide.id)}
                                  onDragOver={handleDragOver}
                                  onDragEnter={handleDragEnter}
                                  onDrop={(e) => selectedSlide && handleDrop(e, selectedSlide.id)}
                                  title="Click or drag & drop to upload image"
                                >
                                  {selectedSlide && (slideImages[selectedSlide.id] || (selectedSlide.media_files && selectedSlide.media_files.length > 0)) ? (
                                    <img
                                      src={slideImages[selectedSlide.id] || selectedSlide.media_files[0]}
                                      alt="Slide image"
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (
                                    <div className="text-center text-gray-500">
                                      <FiImage size={24} className="mx-auto mb-2" />
                                      <p className="text-xs">Click or drag image here</p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 text-sm">
                                  <div 
                                    style={{ color: currentTheme.textColor }}
                                    dangerouslySetInnerHTML={{ __html: editContent || 'Slide content goes here...' }}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : selectedTemplate === 'full_image' ? (
                        <div className="h-full relative">
                          <div 
                            className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors relative overflow-hidden"
                            onClick={() => selectedSlide && triggerImageUpload(selectedSlide.id)}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDrop={(e) => selectedSlide && handleDrop(e, selectedSlide.id)}
                            title="Click or drag & drop to upload background image"
                          >
                            {selectedSlide && (slideImages[selectedSlide.id] || (selectedSlide.media_files && selectedSlide.media_files.length > 0)) ? (
                              <img
                                src={slideImages[selectedSlide.id] || selectedSlide.media_files[0]}
                                alt="Background image"
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <div className="text-center text-gray-500">
                                <FiImage size={48} className="mx-auto mb-3" />
                                <p className="text-sm font-medium">Full Image Background</p>
                                <p className="text-xs">Click or drag image here</p>
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center text-white drop-shadow-lg">
                              <h2 className="text-xl font-bold mb-2">
                                {editTitle || 'Slide Title'}
                              </h2>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full">
                          <h2 className="text-xl font-bold mb-4" style={{ color: currentTheme.primaryColor }}>
                            {editTitle || 'Slide Title'}
                          </h2>
                          <div 
                            className="text-sm leading-relaxed"
                            style={{ color: currentTheme.textColor }}
                            dangerouslySetInnerHTML={{ __html: editContent || 'Slide content goes here...' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Template Tips */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">
                      {templateDefinitions[selectedTemplate]?.name} Layout Tips:
                    </h5>
                    <p className="text-sm text-blue-800">
                      {templateDefinitions[selectedTemplate]?.description || 'Standard slide layout'}
                    </p>
                  </div>
                </div>
              </div>
              )}

              {/* Template Tab */}
              {activeTab === 'template' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Choose Template</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(templateDefinitions).map(([key, template]) => (
                      <div
                        key={key}
                        onClick={() => setSelectedTemplate(key as PowerPointTemplateType)}
                        className={`border-2 rounded-lg p-4 cursor-pointer hover:border-blue-300 ${
                          selectedTemplate === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="aspect-video bg-gray-100 rounded mb-3 flex items-center justify-center">
                          <span className="text-sm text-gray-500">{template.name}</span>
                        </div>
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Template Preview:</h5>
                    <p className="text-sm text-gray-600">
                      {templateDefinitions[selectedTemplate]?.description || 'Standard slide layout'}
                    </p>
                  </div>
                </div>
              )}

              {/* Animation Tab */}
              {activeTab === 'animation' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Animation Settings</h3>
                  
                  {/* Slide Transition */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Slide Transition</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Transition Type
                          </label>
                          <select
                            value={animationSettings.transition}
                            onChange={(e) => setAnimationSettings(prev => ({ ...prev, transition: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                          >
                            <option value="none">None</option>
                            <option value="fade">Fade</option>
                            <option value="slide">Slide</option>
                            <option value="zoom">Zoom</option>
                            <option value="flip">Flip</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Transition Duration: {animationSettings.transitionDuration}ms
                          </label>
                          <input
                            type="range"
                            min="200"
                            max="3000"
                            step="100"
                            value={animationSettings.transitionDuration}
                            onChange={(e) => setAnimationSettings(prev => ({ ...prev, transitionDuration: parseInt(e.target.value) }))}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Content Animation</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Entry Animation
                          </label>
                          <select
                            value={animationSettings.entryAnimation}
                            onChange={(e) => setAnimationSettings(prev => ({ ...prev, entryAnimation: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                          >
                            <option value="none">None</option>
                            <option value="fadeIn">Fade In</option>
                            <option value="slideIn">Slide In</option>
                            <option value="zoomIn">Zoom In</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Exit Animation
                          </label>
                          <select
                            value={animationSettings.exitAnimation}
                            onChange={(e) => setAnimationSettings(prev => ({ ...prev, exitAnimation: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                          >
                            <option value="none">None</option>
                            <option value="fadeOut">Fade Out</option>
                            <option value="slideOut">Slide Out</option>
                            <option value="zoomOut">Zoom Out</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auto-advance Settings */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Auto-advance Settings</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="autoAdvance"
                          checked={animationSettings.autoAdvance}
                          onChange={(e) => setAnimationSettings(prev => ({ ...prev, autoAdvance: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor="autoAdvance" className="ml-2 text-sm font-medium text-gray-900">
                          Auto-advance to next slide
                        </label>
                      </div>
                      
                      {animationSettings.autoAdvance && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Show Duration: {(animationSettings.showDuration / 1000).toFixed(1)}s
                            </label>
                            <input
                              type="range"
                              min="1000"
                              max="30000"
                              step="500"
                              value={animationSettings.showDuration}
                              onChange={(e) => setAnimationSettings(prev => ({ ...prev, showDuration: parseInt(e.target.value) }))}
                              className="w-full"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Auto-advance Delay: {(animationSettings.autoAdvanceDelay / 1000).toFixed(1)}s
                            </label>
                            <input
                              type="range"
                              min="500"
                              max="10000"
                              step="250"
                              value={animationSettings.autoAdvanceDelay}
                              onChange={(e) => setAnimationSettings(prev => ({ ...prev, autoAdvanceDelay: parseInt(e.target.value) }))}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Animation Preview */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Animation Preview:</h5>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• Transition: {animationSettings.transition} ({animationSettings.transitionDuration}ms)</p>
                      <p>• Entry: {animationSettings.entryAnimation}</p>
                      <p>• Exit: {animationSettings.exitAnimation}</p>
                      {animationSettings.autoAdvance && (
                        <p>• Auto-advance after {(animationSettings.showDuration / 1000).toFixed(1)}s</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEditingSlide(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedSlide && triggerImageUpload(selectedSlide.id)}
                  disabled={isUploadingImage}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg"
                  title="Upload Image"
                >
                  {isUploadingImage ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <FiImage size={16} />
                  )}
                  {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>
              
              <button
                onClick={saveSlideChanges}
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
              >
                {isSaving ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <FiSave size={16} />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <FiZap className="text-purple-600" />
                  Generate AI Slide
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Create a professional slide using AI powered by our backend Celery tasks
                </p>
              </div>
              <button
                onClick={() => setShowAIModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                disabled={isGeneratingAI}
              >
                <FiX size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Slide Template</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(templateDefinitions).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => setAITemplate(key as PowerPointTemplateType)}
                      className={`p-3 border-2 rounded-lg transition-all text-left ${
                        aiTemplate === key
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={isGeneratingAI}
                    >
                      <div className="text-lg mb-1">{template.icon}</div>
                      <div className="font-medium text-sm text-gray-900">{template.name}</div>
                      <div className="text-xs text-gray-500">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What should this slide be about?
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAIPrompt(e.target.value)}
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Describe what you want this slide to cover. For example: 'Market analysis showing growth trends in biotechnology sector with key statistics and competitive landscape'"
                  disabled={isGeneratingAI}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Be specific about the content, data, or key points you want to include. Our AI will generate professional content based on your input.
                </p>
              </div>

              {/* Integration Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <FiSettings size={16} />
                  Backend Integration
                </h4>
                <p className="text-sm text-blue-800">
                  This uses our Django backend with Celery AI tasks for professional slide generation. 
                  The AI will match your selected template ({templateDefinitions[aiTemplate]?.name}) with appropriate content structure.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setShowAIModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={isGeneratingAI}
              >
                Cancel
              </button>
              
              <button
                onClick={generateAISlide}
                disabled={isGeneratingAI || !aiPrompt.trim()}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
              >
                {isGeneratingAI ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FiZap size={16} />
                    Generate Slide
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default PowerPointSlideEditor;