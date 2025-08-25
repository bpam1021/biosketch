import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Sidebar from "../../components/Sidebar";
import { 
  FiFileText, 
  FiMonitor, 
  FiEdit3, 
  FiEye, 
  FiUsers, 
  FiDownload,
  FiSettings,
  FiPlus,
  FiSave
} from "react-icons/fi";

import { 
  Presentation, 
  ContentSection,
  ExportRequest
} from "../../types/Presentation";
import PresentationErrorBoundary from '../../components/Presentation/PresentationErrorBoundary';
import { ExportModal } from '../../components/Presentation/ExportModal';
import {
  getPresentation,
  updatePresentation,
  listSections,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  exportPresentation,
  getExportStatus,
  enhanceContent,
  generateSectionContent,
  createDiagram
} from "../../api/presentationApi";

import PresentationEditor from "../../components/Presentation/PresentationEditor";
import DocumentEditor from "../../components/Presentation/DocumentEditor";
import AdvancedSlideEditor from "../../components/Presentation/AdvancedSlideEditor";

export default function PresentationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState<'simple' | 'advanced'>('simple');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (!id) {
      toast.error("Invalid presentation ID.");
      navigate('/presentation');
      return;
    }

    loadPresentation();
  }, [id]);

  const loadPresentation = async () => {
    try {
      setLoading(true);
      const data = await getPresentation(id!);
      setPresentation(data);
      setSections(data.sections || []);
    } catch (err) {
      toast.error("Failed to load presentation.");
      console.error(err);
      navigate('/presentation');
    } finally {
      setLoading(false);
    }
  };

  const handlePresentationUpdate = async (updates: Partial<Presentation>) => {
    if (!presentation) return;
    
    try {
      const updated = await updatePresentation(presentation.id, updates);
      setPresentation(updated);
      toast.success("Presentation updated successfully!");
    } catch (err) {
      toast.error("Failed to update presentation.");
      console.error(err);
    }
  };

  const handleSectionCreate = async (data: Partial<ContentSection>) => {
    if (!presentation) return;

    try {
      const newSection = await createSection(presentation.id, {
        ...data,
        order: sections.length
      });
      setSections(prev => [...prev, newSection]);
      toast.success("Section created successfully!");
      return newSection;
    } catch (err) {
      toast.error("Failed to create section.");
      console.error(err);
    }
  };

  const handleSectionUpdate = async (sectionId: string, updates: Partial<ContentSection>) => {
    if (!presentation) return;

    try {
      const updated = await updateSection(presentation.id, sectionId, updates);
      setSections(prev => prev.map(s => s.id === sectionId ? updated : s));
      return updated;
    } catch (err) {
      toast.error("Failed to update section.");
      console.error(err);
    }
  };

  const handleSectionDelete = async (sectionId: string) => {
    if (!presentation) return;
    
    if (!confirm("Are you sure you want to delete this section?")) return;

    try {
      await deleteSection(presentation.id, sectionId);
      setSections(prev => prev.filter(s => s.id !== sectionId));
      toast.success("Section deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete section.");
      console.error(err);
    }
  };

  const handleSectionsReorder = async (newOrder: ContentSection[]) => {
    setSections(newOrder);
    
    try {
      const sectionOrders = newOrder.map((section, index) => ({
        id: section.id,
        order: index
      }));
      await reorderSections(presentation!.id, sectionOrders);
    } catch (err) {
      toast.error("Failed to reorder sections.");
      // Revert on error
      loadPresentation();
    }
  };

  const handleAIGeneration = async (sectionId: string, prompt: string) => {
    try {
      const updated = await generateSectionContent(sectionId, {
        generation_type: 'section_content',
        prompt,
        content_length: 'medium',
        tone: 'professional'
      });
      setSections(prev => prev.map(s => s.id === sectionId ? updated : s));
      toast.success("AI content generated successfully!");
    } catch (err) {
      toast.error("Failed to generate AI content.");
      console.error(err);
    }
  };

  const handleContentEnhancement = async (sectionId: string, enhancementType: string) => {
    try {
      const updated = await enhanceContent(sectionId, {
        enhancement_type: enhancementType as any,
        target_audience: 'general'
      });
      setSections(prev => prev.map(s => s.id === sectionId ? updated : s));
      toast.success("Content enhanced successfully!");
    } catch (err) {
      toast.error("Failed to enhance content.");
      console.error(err);
    }
  };

  const handleExport = async (exportData: ExportRequest) => {
    if (!presentation) return;

    try {
      setIsExporting(true);
      const result = await exportPresentation(presentation.id, {
        ...exportData,
        selected_sections: selectedSectionIds.length > 0 ? selectedSectionIds : undefined
      });
      
      toast.info("Export started. You'll be notified when it's ready.");
      
      // Poll for export status
      const checkStatus = async () => {
        try {
          const status = await getExportStatus(presentation.id);
          const latestJob = status.jobs[0];
          
          if (latestJob?.status === 'completed') {
            toast.success("Export completed successfully!");
            if (latestJob.output_file_url) {
              window.open(latestJob.output_file_url, '_blank');
            }
          } else if (latestJob?.status === 'failed') {
            toast.error(`Export failed: ${latestJob.error_message || 'Unknown error'}`);
          } else {
            // Still processing, check again in 5 seconds
            setTimeout(checkStatus, 5000);
          }
        } catch (err) {
          console.error("Failed to check export status:", err);
        }
      };
      
      setTimeout(checkStatus, 5000);
      
    } catch (err) {
      toast.error("Failed to start export.");
      console.error(err);
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

  const toggleSectionSelection = (sectionId: string) => {
    setSelectedSectionIds(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const addNewSection = async () => {
    const sectionType = presentation?.presentation_type === 'document' ? 'paragraph' : 'content_slide';
    
    await handleSectionCreate({
      section_type: sectionType,
      title: 'New Section',
      content: 'Enter your content here...',
      rich_content: 'Enter your content here...',
      content_data: {},
      layout_config: {},
      style_config: {},
      animation_config: {},
      interaction_config: {},
      ai_generated: false,
      generation_metadata: {},
      comments: [],
      version_history: [],
      media_files: []
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading presentation...</p>
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
            <p className="text-gray-600">Presentation not found.</p>
            <button
              onClick={() => navigate('/presentation')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Presentations
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PresentationErrorBoundary>
        <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                {presentation.presentation_type === 'document' ? (
                    <FiFileText className="text-blue-600" size={24} />
                ) : (
                    <FiMonitor className="text-purple-600" size={24} />
                )}
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">
                    {presentation.title}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                        {presentation.presentation_type === 'document' ? 'Document' : 'Slide Deck'} • 
                        {sections.length} {sections.length === 1 ? 'section' : 'sections'}
                    </span>
                    <span>Status: {presentation.status}</span>
                    {presentation.collaborators.length > 0 && (
                        <span className="flex items-center gap-1">
                        <FiUsers size={14} />
                        {presentation.collaborators.length} collaborator{presentation.collaborators.length !== 1 ? 's' : ''}
                        </span>
                    )}
                    </div>
                </div>
                </div>
                
                <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                    onClick={() => setViewMode('edit')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        viewMode === 'edit' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    >
                    <FiEdit3 size={14} className="inline mr-1" />
                    Edit
                    </button>
                    <button
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        viewMode === 'preview' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    >
                    <FiEye size={14} className="inline mr-1" />
                    Preview
                    </button>
                </div>

                {/* Editor Mode Toggle (for slides) */}
                {presentation.presentation_type === 'slide' && viewMode === 'edit' && (
                    <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setEditMode('simple')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        editMode === 'simple' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Simple
                    </button>
                    <button
                        onClick={() => setEditMode('advanced')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        editMode === 'advanced' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Advanced
                    </button>
                    </div>
                )}
                
                {/* Add Section Button */}
                {viewMode === 'edit' && (
                    <button
                    onClick={addNewSection}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                    <FiPlus size={16} />
                    Add Section
                    </button>
                )}

                {/* Save Button */}
                <button
                    onClick={() => handlePresentationUpdate({})}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    <FiSave size={16} />
                    Save
                </button>
                
                {/* Export Button */}
                <button
                    onClick={() => setShowExportModal(true)}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                    <FiDownload size={16} />
                    {isExporting ? 'Exporting...' : 'Export'}
                </button>

                {/* Settings */}
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                    <FiSettings size={20} />
                </button>
                </div>
            </div>
            </div>

            {/* Content Area */}
            <div className="flex-1">
            {presentation.presentation_type === 'document' ? (
                <DocumentEditor
                presentation={presentation}
                sections={sections}
                onSectionCreate={handleSectionCreate}
                onSectionUpdate={handleSectionUpdate}
                onSectionDelete={handleSectionDelete}
                onSectionsReorder={handleSectionsReorder}
                onAIGeneration={handleAIGeneration}
                onContentEnhancement={handleContentEnhancement}
                viewMode={viewMode}
                selectedSectionIds={selectedSectionIds}
                onSectionSelect={toggleSectionSelection}
                />
            ) : editMode === 'advanced' ? (
                <AdvancedSlideEditor
                presentation={presentation}
                sections={sections}
                onSectionUpdate={handleSectionUpdate}
                onSectionsReorder={handleSectionsReorder}
                onSectionCreate={handleSectionCreate}
                onSectionDelete={handleSectionDelete}
                />
            ) : (
                <PresentationEditor
                presentation={presentation}
                sections={sections}
                onSectionCreate={handleSectionCreate}
                onSectionUpdate={handleSectionUpdate}
                onSectionDelete={handleSectionDelete}
                onSectionsReorder={handleSectionsReorder}
                onAIGeneration={handleAIGeneration}
                selectedSectionIds={selectedSectionIds}
                onSectionSelect={toggleSectionSelection}
                viewMode={viewMode}
                />
            )}
            </div>

            {/* Export Modal */}
            {showExportModal && (
            <ExportModal
                presentation={presentation}
                selectedSections={selectedSectionIds}
                onExport={handleExport}
                onClose={() => setShowExportModal(false)}
            />
            )}
        </div>
        </div>
    </PresentationErrorBoundary>
  );
};

// Simple Export Modal Component
// const ExportModal: React.FC<{
//   presentation: Presentation;
//   selectedSections: string[];
//   onExport: (data: ExportRequest) => void;
//   onClose: () => void;
// }> = ({ presentation, selectedSections, onExport, onClose }) => {
//   const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'pptx' | 'html' | 'mp4'>('pdf');
//   const [exportSettings, setExportSettings] = useState({
//     resolution: '1080p' as '720p' | '1080p' | '4k',
//     fps: 30 as 24 | 30 | 60,
//     duration_per_slide: 5,
//     include_narration: false,
//     background_music: false,
//     transition_duration: 1
//   });

//   const handleExport = () => {
//     onExport({
//       export_format: exportFormat,
//       selected_sections: selectedSections,
//       export_settings: exportFormat === 'mp4' ? exportSettings : undefined
//     });
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
//         <div className="p-6">
//           <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Presentation</h3>
          
//           <div className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
//               <select
//                 value={exportFormat}
//                 onChange={(e) => setExportFormat(e.target.value as any)}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="pdf">PDF Document</option>
//                 <option value="docx">Word Document</option>
//                 {presentation.presentation_type === 'slide' && <option value="pptx">PowerPoint</option>}
//                 <option value="html">HTML</option>
//                 {presentation.presentation_type === 'slide' && <option value="mp4">Video (MP4)</option>}
//               </select>
//             </div>

//             {exportFormat === 'mp4' && (
//               <div className="space-y-3">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
//                   <select
//                     value={exportSettings.resolution}
//                     onChange={(e) => setExportSettings(prev => ({ ...prev, resolution: e.target.value as any }))}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                   >
//                     <option value="720p">720p</option>
//                     <option value="1080p">1080p</option>
//                     <option value="4k">4K</option>
//                   </select>
//                 </div>
                
//                 <div className="flex items-center gap-3">
//                   <input
//                     type="checkbox"
//                     checked={exportSettings.include_narration}
//                     onChange={(e) => setExportSettings(prev => ({ ...prev, include_narration: e.target.checked }))}
//                     className="w-4 h-4 text-blue-600"
//                   />
//                   <label className="text-sm text-gray-700">Include AI narration</label>
//                 </div>
//               </div>
//             )}

//             {selectedSections.length > 0 && (
//               <div className="text-sm text-gray-600">
//                 Exporting {selectedSections.length} selected section{selectedSections.length !== 1 ? 's' : ''}
//               </div>
//             )}
//           </div>

//           <div className="flex gap-3 mt-6">
//             <button
//               onClick={onClose}
//               className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={handleExport}
//               className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
//             >
//               Export
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
