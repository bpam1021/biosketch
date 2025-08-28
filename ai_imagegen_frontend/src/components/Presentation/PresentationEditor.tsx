import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { toast } from "react-toastify";
import { 
  FiMove, 
  FiEdit3, 
  FiTrash2, 
  FiCopy, 
  FiWind, 
  FiImage, 
  FiBarChart,
  FiType,
  FiList,
  FiCode,
  FiMessageSquare,
  FiTable,
  FiVideo,
  FiMusic,
  FiSettings,
  FiEye,
  FiPlus,
  FiFileText
} from "react-icons/fi";

import { Presentation, ContentSection, DiagramElement } from "../../types/Presentation";
import ContentSectionCard from "./ContentSectionCard";
import UnifiedDocumentEditor from "./UnifiedDocumentEditor";

interface PresentationEditorProps {
  presentation: Presentation;
  sections: ContentSection[];
  onSectionCreate: (data: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionUpdate: (sectionId: string, updates: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionDelete: (sectionId: string) => Promise<void>;
  onSectionsReorder: (newOrder: ContentSection[]) => Promise<void>;
  onAIGeneration: (sectionId: string, prompt: string) => Promise<void>;
  selectedSectionIds: string[];
  onSectionSelect: (sectionId: string) => void;
  viewMode: 'edit' | 'preview';
  onPresentationUpdate: (updates: Partial<Presentation>) => Promise<Presentation | undefined>;
  onDiagramCreate: (diagram: Partial<DiagramElement>) => Promise<DiagramElement | undefined>;
}

const PresentationEditor: React.FC<PresentationEditorProps> = ({
  presentation,
  sections,
  onSectionCreate,
  onSectionUpdate,
  onSectionDelete,
  onSectionsReorder,
  onAIGeneration,
  selectedSectionIds,
  onSectionSelect,
  viewMode,
  onPresentationUpdate,
  onDiagramCreate
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const sectionTypes = [
    { 
      type: 'heading', 
      icon: FiType, 
      label: 'Heading', 
      description: 'Add a section heading',
      applicableFor: ['document', 'slide']
    },
    { 
      type: 'paragraph', 
      icon: FiEdit3, 
      label: 'Paragraph', 
      description: 'Add text content',
      applicableFor: ['document', 'slide']
    },
    { 
      type: 'list', 
      icon: FiList, 
      label: 'List', 
      description: 'Bulleted or numbered list',
      applicableFor: ['document', 'slide']
    },
    { 
      type: 'image', 
      icon: FiImage, 
      label: 'Image', 
      description: 'Insert an image',
      applicableFor: ['document', 'slide']
    },
    { 
      type: 'diagram', 
      icon: FiBarChart, 
      label: 'Diagram', 
      description: 'AI-generated chart or diagram',
      applicableFor: ['document', 'slide']
    },
    { 
      type: 'table', 
      icon: FiTable, 
      label: 'Table', 
      description: 'Data table',
      applicableFor: ['document', 'slide']
    },
    { 
      type: 'code', 
      icon: FiCode, 
      label: 'Code Block', 
      description: 'Code snippet',
      applicableFor: ['document']
    },
    { 
      type: 'quote', 
      icon: FiMessageSquare, 
      label: 'Quote', 
      description: 'Block quote',
      applicableFor: ['document']
    },
    { 
      type: 'title_slide', 
      icon: FiType, 
      label: 'Title Slide', 
      description: 'Title slide for presentations',
      applicableFor: ['slide']
    },
    { 
      type: 'content_slide', 
      icon: FiEdit3, 
      label: 'Content Slide', 
      description: 'Regular content slide',
      applicableFor: ['slide']
    },
    { 
      type: 'image_slide', 
      icon: FiImage, 
      label: 'Image Slide', 
      description: 'Image-focused slide',
      applicableFor: ['slide']
    },
    { 
      type: 'chart_slide', 
      icon: FiBarChart, 
      label: 'Chart Slide', 
      description: 'Chart or diagram slide',
      applicableFor: ['slide']
    },
    { 
      type: 'video', 
      icon: FiVideo, 
      label: 'Video', 
      description: 'Embedded video content',
      applicableFor: ['document', 'slide']
    },
    { 
      type: 'audio', 
      icon: FiMusic, 
      label: 'Audio', 
      description: 'Audio content',
      applicableFor: ['document', 'slide']
    }
  ];

  const applicableSectionTypes = sectionTypes.filter(type => 
    type.applicableFor.includes(presentation.presentation_type)
  );

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const newSections = Array.from(sections);
    const [reorderedSection] = newSections.splice(result.source.index, 1);
    newSections.splice(result.destination.index, 0, reorderedSection);

    // Update order property
    const sectionsWithNewOrder = newSections.map((section, index) => ({
      ...section,
      order: index
    }));

    try {
      setIsReordering(true);
      await onSectionsReorder(sectionsWithNewOrder);
      toast.success("Sections reordered successfully");
    } catch (err) {
      toast.error("Failed to reorder sections");
    } finally {
      setIsReordering(false);
    }
  };

  const handleAddSection = async (sectionType: string) => {
    const defaultContent = getDefaultContent(sectionType);
    
    await onSectionCreate({
      section_type: sectionType as ContentSection['section_type'],
      title: defaultContent.title,
      content: defaultContent.content,
      rich_content: defaultContent.content,
      content_data: {},
      layout_config: defaultContent.layout_config || {},
      style_config: defaultContent.style_config || {},
      animation_config: {},
      interaction_config: {},
      ai_generated: false,
      generation_metadata: {},
      comments: [],
      version_history: [],
      media_files: []
    });
    
    setShowAddMenu(false);
  };

  const getDefaultContent = (sectionType: string) => {
    switch (sectionType) {
      case 'heading':
        return { 
          title: 'New Heading', 
          content: 'Section Heading',
          style_config: { fontSize: 28, fontWeight: 'bold' }
        };
      case 'paragraph':
        return { 
          title: 'New Paragraph', 
          content: 'Enter your content here...'
        };
      case 'list':
        return { 
          title: 'New List', 
          content: '• First item\n• Second item\n• Third item'
        };
      case 'image':
        return { 
          title: 'New Image', 
          content: '',
          layout_config: { placeholder: 'Add image URL or upload an image' }
        };
      case 'diagram':
        return { 
          title: 'New Diagram', 
          content: 'Describe the data or process you want to visualize'
        };
      case 'table':
        return { 
          title: 'New Table', 
          content: 'Header 1|Header 2|Header 3\nRow 1|Data|Data\nRow 2|Data|Data'
        };
      case 'code':
        return { 
          title: 'Code Block', 
          content: '// Your code here\nconsole.log("Hello World");',
          style_config: { fontFamily: 'monospace', backgroundColor: '#f8f9fa' }
        };
      case 'quote':
        return { 
          title: 'Quote', 
          content: 'Your quote text here',
          style_config: { fontStyle: 'italic', borderLeft: '4px solid #007bff', paddingLeft: '16px' }
        };
      case 'title_slide':
        return { 
          title: 'Title Slide', 
          content: presentation.title || 'Presentation Title'
        };
      case 'content_slide':
        return { 
          title: 'New Slide', 
          content: 'Slide content goes here...'
        };
      case 'image_slide':
        return { 
          title: 'Image Slide', 
          content: 'Slide description...',
          layout_config: { imagePosition: 'center' }
        };
      case 'chart_slide':
        return { 
          title: 'Chart Slide', 
          content: 'Describe the data you want to visualize'
        };
      case 'video':
        return { 
          title: 'Video Section', 
          content: 'Video description...',
          layout_config: { placeholder: 'Add video URL or upload a video' }
        };
      case 'audio':
        return { 
          title: 'Audio Section', 
          content: 'Audio description...',
          layout_config: { placeholder: 'Add audio URL or upload an audio file' }
        };
      default:
        return { 
          title: 'New Section', 
          content: 'Enter content here...'
        };
    }
  };

  const handleSectionDuplicate = async (section: ContentSection) => {
    await onSectionCreate({
      ...section,
      title: `${section.title} (Copy)`,
      id: undefined, // Remove ID so it creates a new one
      order: section.order + 1
    });
  };

  const handleBulkDelete = async () => {
    if (selectedSectionIds.length === 0) {
      toast.warning("No sections selected");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedSectionIds.length} selected section${selectedSectionIds.length !== 1 ? 's' : ''}?`)) {
      return;
    }

    try {
      for (const sectionId of selectedSectionIds) {
        await onSectionDelete(sectionId);
      }
      toast.success(`Deleted ${selectedSectionIds.length} section${selectedSectionIds.length !== 1 ? 's' : ''}`);
    } catch (err) {
      toast.error("Failed to delete sections");
    }
  };

  // For document types, use the unified document editor
  if (presentation.presentation_type === 'document') {
    return (
      <UnifiedDocumentEditor
        presentation={presentation}
        onPresentationUpdate={onPresentationUpdate}
        onDiagramCreate={onDiagramCreate}
        viewMode={viewMode}
      />
    );
  }

  if (viewMode === 'preview') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
        <div className="space-y-8">
          {sections.map((section) => (
            <ContentSectionCard
              key={section.id}
              section={section}
              presentation={presentation}
              onUpdate={() => Promise.resolve(undefined)} // Read-only in preview mode
              onDelete={() => Promise.resolve(undefined)}
              onDuplicate={() => Promise.resolve(undefined)}
              onAIGeneration={() => Promise.resolve(undefined)}
              isSelected={false}
              onSelect={() => {}}
              viewMode="preview"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            {presentation.presentation_type === 'document' ? 'Document Sections' : 'Presentation Slides'}
          </h2>
          {isReordering && (
            <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full animate-pulse">
              Reordering sections...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {selectedSectionIds.length > 0 && (
            <>
              <span className="text-sm text-gray-600">
                {selectedSectionIds.length} selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <FiTrash2 size={14} />
                Delete Selected
              </button>
            </>
          )}
          
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <FiPlus size={16} />
              Add Section
            </button>
            
            {showAddMenu && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 mb-3">Choose Section Type</h3>
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {applicableSectionTypes.map(({ type, icon: Icon, label, description }) => (
                      <button
                        key={type}
                        onClick={() => handleAddSection(type)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                      >
                        <Icon size={16} className="text-gray-600 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-gray-900">{label}</div>
                          <div className="text-xs text-gray-500">{description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sections List */}
      {sections.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="mb-4">
            {presentation.presentation_type === 'document' ? (
              <FiEdit3 className="mx-auto h-16 w-16 text-gray-400" />
            ) : (
              <FiSettings className="mx-auto h-16 w-16 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {presentation.presentation_type === 'document' ? 'sections' : 'slides'} yet
          </h3>
          <p className="text-gray-600 mb-4">
            Start building your {presentation.presentation_type} by adding your first section
          </p>
          <button
            onClick={() => handleAddSection(presentation.presentation_type === 'document' ? 'paragraph' : 'content_slide')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Add First Section
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections-list">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-6"
              >
                {sections.map((section, index) => (
                  <Draggable
                    key={section.id}
                    draggableId={section.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-white border border-gray-200 rounded-xl shadow-sm transition-all ${
                          snapshot.isDragging ? "ring-2 ring-blue-400 shadow-lg scale-[1.02]" : "hover:shadow-md"
                        } ${selectedSectionIds.includes(section.id) ? "ring-2 ring-blue-500" : ""}`}
                      >
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            {/* Selection Checkbox */}
                            <input
                              type="checkbox"
                              checked={selectedSectionIds.includes(section.id)}
                              onChange={() => onSectionSelect(section.id)}
                              className="mt-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            
                            {/* Drag Handle */}
                            <div 
                              {...provided.dragHandleProps}
                              className="mt-1 p-1 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded transition-colors"
                              title="Drag to reorder"
                            >
                              <FiMove size={16} className="text-gray-400" />
                            </div>
                            
                            {/* Section Content */}
                            <div className="flex-1">
                              <ContentSectionCard
                                section={section}
                                presentation={presentation}
                                onUpdate={(updates) => onSectionUpdate(section.id, updates)}
                                onDelete={() => onSectionDelete(section.id)}
                                onDuplicate={() => handleSectionDuplicate(section)}
                                onAIGeneration={(prompt) => onAIGeneration(section.id, prompt)}
                                isSelected={selectedSectionIds.includes(section.id)}
                                onSelect={() => onSectionSelect(section.id)}
                                viewMode="edit"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
};

export default PresentationEditor;