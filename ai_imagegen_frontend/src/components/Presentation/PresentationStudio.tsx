import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiFileText, FiMonitor, FiSave, FiShare2, FiSettings, FiUsers,
  FiEye, FiEdit3, FiGrid, FiZap, FiDownload, FiPlus, FiLayers, FiImage
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { Presentation, Slide } from '../../types/Presentation';
import { 
  getPresentation, 
  updateSlide, 
  deleteSlide, 
  duplicateSlide,
  getImportableContent,
  updateDocumentSettings
} from '../../api/presentationApi';
import EnhancedDocumentEditor from './EnhancedDocumentEditor';
import EnhancedSlideEditor from './EnhancedSlideEditor';
import ContentImportPanel from './ContentImportPanel';
import Sidebar from '../Sidebar';

const PresentationStudio: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'present'>('edit');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [userImages, setUserImages] = useState<string[]>([]);
  const [userDiagrams, setUserDiagrams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPresentation();
      loadUserContent();
    }
  }, [id]);

  const loadPresentation = async () => {
    try {
      const data = await getPresentation(Number(id));
      setPresentation(data);
      if (data.slides.length > 0) {
        setCurrentSlide(data.slides[0]);
      }
    } catch (error) {
      toast.error('Failed to load presentation');
      navigate('/presentation/create');
    } finally {
      setLoading(false);
    }
  };

  const loadUserContent = async () => {
    try {
      const importableContent = await getImportableContent();
      setUserImages(importableContent.images.map(img => img.image_url));
      setUserDiagrams(importableContent.diagrams);
    } catch (error) {
      console.error('Failed to load user content:', error);
    }
  };

  const handleSlideUpdate = async (updatedSlide: Slide) => {
    try {
      const updated = await updateSlide(updatedSlide.id, updatedSlide);
      setCurrentSlide(updated);
      
      if (presentation) {
        setPresentation({
          ...presentation,
          slides: presentation.slides.map(s => s.id === updated.id ? updated : s)
        });
      }
      
      toast.success('Slide updated successfully');
    } catch (error) {
      toast.error('Failed to update slide');
    }
  };

  const handleDocumentContentChange = (content: string) => {
    if (presentation && presentation.presentation_type === 'document') {
      // Update document content
      onContentChange(content);
    }
  };

  const addNewSlide = () => {
    if (!presentation) return;
    
    const newSlideOrder = presentation.slides.length;
    const newSlide: Partial<Slide> = {
      presentation: presentation.id,
      order: newSlideOrder,
      title: `Slide ${newSlideOrder + 1}`,
      description: '',
      content_type: 'slide',
      canvas_json: '',
      image_prompt: '',
      image_url: ''
    };

    // This would typically be an API call
    toast.info('Adding new slide...');
  };

  const duplicateCurrentSlide = async () => {
    if (!currentSlide) return;
    
    try {
      const duplicated = await duplicateSlide(currentSlide.id);
      if (presentation) {
        setPresentation({
          ...presentation,
          slides: [...presentation.slides, duplicated]
        });
      }
      toast.success('Slide duplicated');
    } catch (error) {
      toast.error('Failed to duplicate slide');
    }
  };

  const sharePresentation = () => {
    if (!presentation) return;
    
    const shareUrl = `${window.location.origin}/presentation/${presentation.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

  const handleDocumentSettingsUpdate = async (settings: any) => {
    if (!presentation) return;
    
    try {
      await updateDocumentSettings(presentation.id, settings);
      setPresentation(prev => prev ? {
        ...prev,
        document_settings: { ...prev.document_settings, ...settings }
      } : null);
      toast.success('Document settings updated');
    } catch (error) {
      toast.error('Failed to update document settings');
    }
  };
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading presentation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Presentation not found</p>
          </div>
        </div>
      </div>
    );
  }

  const isDocumentType = presentation.presentation_type === 'document';

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isDocumentType ? (
                  <FiFileText className="text-blue-600" size={24} />
                ) : (
                  <FiMonitor className="text-purple-600" size={24} />
                )}
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {presentation.title}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {isDocumentType ? 'Rich Document' : 'Slide Presentation'}
                  </p>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <FiEdit3 className="inline mr-1" size={14} />
                  Edit
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <FiEye className="inline mr-1" size={14} />
                  Preview
                </button>
                {!isDocumentType && (
                  <button
                    onClick={() => setViewMode('present')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      viewMode === 'present' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <FiMonitor className="inline mr-1" size={14} />
                    Present
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {!isDocumentType && (
                <button
                  onClick={addNewSlide}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <FiPlus size={16} />
                  Add Slide
                </button>
              )}
              
              <button
                onClick={() => setShowImportPanel(true)}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <FiImage size={16} />
                Import
              </button>
              
              <button
                onClick={sharePresentation}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FiShare2 size={16} />
                Share
              </button>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              >
                <FiSettings size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Slide Navigation (for presentations) */}
          {!isDocumentType && !sidebarCollapsed && (
            <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Slides</h3>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  ←
                </button>
              </div>
              
              <div className="space-y-2">
                {presentation.slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    onClick={() => setCurrentSlide(slide)}
                    className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                      currentSlide?.id === slide.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center">
                      {slide.rendered_image ? (
                        <img
                          src={slide.rendered_image}
                          alt={slide.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">Slide {index + 1}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {slide.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 flex flex-col">
            {isDocumentType ? (
              <EnhancedDocumentEditor
                content={presentation.document_content || ''}
                onContentChange={handleDocumentContentChange}
                onSave={() => toast.success('Document saved!')}
                presentationId={presentation.id}
                userImages={userImages}
                userDiagrams={userDiagrams}
                isReadOnly={viewMode === 'preview'}
              />
            ) : currentSlide ? (
              <EnhancedSlideEditor
                slide={currentSlide}
                onSlideUpdate={handleSlideUpdate}
                userImages={userImages}
                userDiagrams={userDiagrams}
                isReadOnly={viewMode === 'preview'}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FiMonitor className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">No slide selected</p>
                  <button
                    onClick={addNewSlide}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Create First Slide
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Import Panel Modal */}
        {showImportPanel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Import Content</h2>
                <button
                  onClick={() => setShowImportPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <ContentImportPanel
                  presentationId={presentation.id}
                  onContentImported={(importedContent) => {
                    // Refresh presentation data
                    loadPresentation();
                    setShowImportPanel(false);
                  }}
                  targetPosition={{
                    slideIndex: currentSlide?.order,
                    sectionId: undefined
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Presentation Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Presentation Title
                  </label>
                  <input
                    type="text"
                    value={presentation.title}
                    onChange={(e) => setPresentation(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Document-specific settings */}
                {isDocumentType && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Document Settings</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
                        <select
                          value={presentation.document_settings?.page_size || 'A4'}
                          onChange={(e) => handleDocumentSettingsUpdate({ page_size: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="A4">A4</option>
                          <option value="Letter">Letter</option>
                          <option value="Legal">Legal</option>
                          <option value="Custom">Custom</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                        <select
                          value={presentation.document_settings?.theme || 'default'}
                          onChange={(e) => handleDocumentSettingsUpdate({ theme: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="default">Default</option>
                          <option value="professional">Professional</option>
                          <option value="academic">Academic</option>
                          <option value="creative">Creative</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="page_numbers"
                        checked={presentation.document_settings?.page_numbers || false}
                        onChange={(e) => handleDocumentSettingsUpdate({ page_numbers: e.target.checked })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label htmlFor="page_numbers" className="text-sm text-gray-700">
                        Show page numbers
                      </label>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={presentation.is_public}
                    onChange={(e) => setPresentation(prev => prev ? { ...prev, is_public: e.target.checked } : null)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="isPublic" className="text-sm text-gray-700">
                    Make this presentation public
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="allowComments"
                    checked={presentation.allow_comments}
                    onChange={(e) => setPresentation(prev => prev ? { ...prev, allow_comments: e.target.checked } : null)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="allowComments" className="text-sm text-gray-700">
                    Allow comments from viewers
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Save settings
                      setShowSettings(false);
                      toast.success('Settings saved');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function onContentChange(content: string) {
    if (presentation) {
      setPresentation({
        ...presentation,
        document_content: content
      });
    }
  }
};

export default PresentationStudio;