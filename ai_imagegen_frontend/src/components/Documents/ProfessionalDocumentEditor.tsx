import React, { useState, useRef, useEffect } from 'react';
import {
  FiBookOpen, FiList, FiPlus, FiEdit3, FiTrash2, FiMove,
  FiChevronDown, FiChevronRight, FiType, FiFileText,
  FiTable, FiBarChart, FiImage, FiSettings, FiSave,
  FiDownload, FiSearch, FiToc, FiHash
} from 'react-icons/fi';
import { toast } from 'react-toastify';

interface DocumentChapter {
  id: string;
  number: number;
  title: string;
  content: string;
  sections: DocumentSection[];
  order: number;
}

interface DocumentSection {
  id: string;
  level: number; // 1, 2, 3 for subsection depth
  number: string; // "1.1", "1.1.1", etc.
  title: string;
  content: string;
  parent_section?: string;
  subsections?: DocumentSection[];
  order: number;
}

interface DocumentStructure {
  title: string;
  abstract?: string;
  tableOfContents: boolean;
  chapters: DocumentChapter[];
  formatting: DocumentFormatting;
  pageSettings: PageSettings;
}

interface DocumentFormatting {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  headingStyles: {
    h1: { fontSize: number; color: string; spacing: number };
    h2: { fontSize: number; color: string; spacing: number };
    h3: { fontSize: number; color: string; spacing: number };
  };
  paragraphSpacing: number;
  indentation: number;
}

interface PageSettings {
  size: 'A4' | 'Letter' | 'A3' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  header: boolean;
  footer: boolean;
  pageNumbers: boolean;
}

interface ProfessionalDocumentEditorProps {
  document?: DocumentStructure;
  onDocumentUpdate: (updates: Partial<DocumentStructure>) => Promise<void>;
  readOnly?: boolean;
}

const ProfessionalDocumentEditor: React.FC<ProfessionalDocumentEditorProps> = ({
  document,
  onDocumentUpdate,
  readOnly = false
}) => {
  // Initialize with a default structure if document is undefined or incomplete
  const getDefaultDocument = (): DocumentStructure => ({
    title: 'New Document',
    abstract: '',
    tableOfContents: true,
    chapters: [],
    formatting: {
      fontSize: 16,
      fontFamily: 'Georgia, serif',
      lineHeight: 1.6,
      headingStyles: {
        h1: { fontSize: 28, color: '#111827', spacing: 24 },
        h2: { fontSize: 22, color: '#374151', spacing: 20 },
        h3: { fontSize: 18, color: '#4B5563', spacing: 16 }
      },
      paragraphSpacing: 16,
      indentation: 0
    },
    pageSettings: {
      size: 'A4',
      orientation: 'portrait',
      margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
      header: false,
      footer: false,
      pageNumbers: true
    }
  });

  const [currentDocument, setCurrentDocument] = useState<DocumentStructure>(document || getDefaultDocument());
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showOutline, setShowOutline] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoSave, setAutoSave] = useState(true);

  const editorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Update document when prop changes
  useEffect(() => {
    if (document) {
      setCurrentDocument(document);
    }
  }, [document]);

  // Generate automatic numbering for chapters and sections
  const generateSectionNumber = (chapterNum: number, sectionPath: number[]): string => {
    return `${chapterNum}.${sectionPath.join('.')}`;
  };

  // Calculate document statistics
  const getDocumentStats = () => {
    if (!currentDocument) return { wordCount: 0, charCount: 0, pageCount: 1 };
    
    const allContent = [
      currentDocument.abstract || '',
      ...(currentDocument.chapters || []).flatMap(chapter => [
        chapter?.content || '',
        ...(chapter?.sections || []).map(section => section?.content || '')
      ])
    ].join(' ');
    
    const wordCount = allContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
    const charCount = allContent.replace(/<[^>]*>/g, '').length;
    const pageCount = Math.max(1, Math.ceil(wordCount / 250)); // Approximate pages
    
    return { wordCount, charCount, pageCount };
  };

  // Add new chapter
  const addChapter = () => {
    const newChapter: DocumentChapter = {
      id: `chapter-${Date.now()}`,
      number: currentDocument.chapters.length + 1,
      title: `Chapter ${currentDocument.chapters.length + 1}`,
      content: '',
      sections: [],
      order: currentDocument.chapters.length
    };
    
    const updated = {
      ...currentDocument,
      chapters: [...currentDocument.chapters, newChapter]
    };
    
    setCurrentDocument(updated);
    setSelectedChapter(newChapter.id);
    if (autoSave) onDocumentUpdate(updated);
  };

  // Add new section to chapter
  const addSection = (chapterId: string, parentSectionId?: string) => {
    const chapterIndex = currentDocument.chapters.findIndex(c => c.id === chapterId);
    if (chapterIndex === -1) return;

    const chapter = currentDocument.chapters[chapterIndex];
    let sections = [...chapter.sections];
    let level = 1;
    let sectionNumber = '';

    if (parentSectionId) {
      const parentSection = sections.find(s => s.id === parentSectionId);
      if (parentSection) {
        level = parentSection.level + 1;
        const siblingCount = sections.filter(s => s.parent_section === parentSectionId).length;
        sectionNumber = `${parentSection.number}.${siblingCount + 1}`;
      }
    } else {
      const topLevelSections = sections.filter(s => s.level === 1).length;
      sectionNumber = `${chapter.number}.${topLevelSections + 1}`;
    }

    const newSection: DocumentSection = {
      id: `section-${Date.now()}`,
      level,
      number: sectionNumber,
      title: `Section ${sectionNumber}`,
      content: '',
      parent_section: parentSectionId,
      order: sections.length
    };

    sections.push(newSection);

    const updatedChapters = [...currentDocument.chapters];
    updatedChapters[chapterIndex] = { ...chapter, sections };

    const updated = { ...currentDocument, chapters: updatedChapters };
    setCurrentDocument(updated);
    setSelectedSection(newSection.id);
    if (autoSave) onDocumentUpdate(updated);
  };

  // Update chapter content
  const updateChapter = (chapterId: string, updates: Partial<DocumentChapter>) => {
    const chapterIndex = currentDocument.chapters.findIndex(c => c.id === chapterId);
    if (chapterIndex === -1) return;

    const updatedChapters = [...currentDocument.chapters];
    updatedChapters[chapterIndex] = { ...updatedChapters[chapterIndex], ...updates };

    const updated = { ...currentDocument, chapters: updatedChapters };
    setCurrentDocument(updated);
    if (autoSave) onDocumentUpdate(updated);
  };

  // Update section content
  const updateSection = (chapterId: string, sectionId: string, updates: Partial<DocumentSection>) => {
    const chapterIndex = currentDocument.chapters.findIndex(c => c.id === chapterId);
    if (chapterIndex === -1) return;

    const chapter = currentDocument.chapters[chapterIndex];
    const sectionIndex = chapter.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const updatedSections = [...chapter.sections];
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], ...updates };

    const updatedChapters = [...currentDocument.chapters];
    updatedChapters[chapterIndex] = { ...chapter, sections: updatedSections };

    const updated = { ...currentDocument, chapters: updatedChapters };
    setCurrentDocument(updated);
    if (autoSave) onDocumentUpdate(updated);
  };

  // Generate table of contents
  const generateTableOfContents = () => {
    return currentDocument.chapters.map(chapter => ({
      type: 'chapter',
      number: chapter.number,
      title: chapter.title,
      page: Math.floor(Math.random() * 50) + 1, // Mock page numbers
      sections: chapter.sections.map(section => ({
        type: 'section',
        number: section.number,
        title: section.title,
        page: Math.floor(Math.random() * 50) + 1,
        level: section.level
      }))
    }));
  };

  // Render outline tree
  const renderOutlineTree = () => {
    const filteredChapters = searchTerm
      ? currentDocument.chapters.filter(chapter =>
          chapter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          chapter.sections.some(section =>
            section.title.toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      : currentDocument.chapters;

    return (
      <div className="space-y-2">
        {filteredChapters.map(chapter => (
          <OutlineChapterNode
            key={chapter.id}
            chapter={chapter}
            isSelected={selectedChapter === chapter.id}
            selectedSection={selectedSection}
            onChapterSelect={setSelectedChapter}
            onSectionSelect={setSelectedSection}
            onAddSection={addSection}
            onUpdateChapter={updateChapter}
            onUpdateSection={updateSection}
            readOnly={readOnly}
          />
        ))}
      </div>
    );
  };

  // Get current editing content
  const getCurrentContent = () => {
    if (selectedSection) {
      const chapter = currentDocument.chapters.find(c => c.id === selectedChapter);
      const section = chapter?.sections.find(s => s.id === selectedSection);
      return section;
    } else if (selectedChapter) {
      return currentDocument.chapters.find(c => c.id === selectedChapter);
    }
    return null;
  };

  const currentContent = getCurrentContent();
  const stats = getDocumentStats();

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Document Outline Sidebar */}
      {showOutline && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FiBookOpen size={18} />
                Document Outline
              </h3>
              <button
                onClick={() => setShowOutline(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <FiList size={16} />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search outline..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Add Chapter Button */}
            {!readOnly && (
              <button
                onClick={addChapter}
                className="w-full mt-3 flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
              >
                <FiPlus size={16} />
                Add Chapter
              </button>
            )}
          </div>
          
          {/* Outline Tree */}
          <div className="flex-1 overflow-y-auto p-4">
            {currentDocument.chapters.length === 0 ? (
              <div className="text-center py-8">
                <FiBookOpen className="mx-auto text-gray-400 mb-3" size={32} />
                <p className="text-gray-600">No chapters yet</p>
                <p className="text-sm text-gray-500">Click "Add Chapter" to start</p>
              </div>
            ) : (
              renderOutlineTree()
            )}
          </div>

          {/* Document Stats */}
          <div className="p-4 border-t border-gray-200 text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Words:</span>
              <span>{stats.wordCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Characters:</span>
              <span>{stats.charCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Pages:</span>
              <span>{stats.pageCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Chapters:</span>
              <span>{currentDocument.chapters.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">{currentDocument.title}</h1>
              
              <div className="flex items-center gap-2">
                {!showOutline && (
                  <button
                    onClick={() => setShowOutline(true)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    title="Show Outline"
                  >
                    <FiList size={18} />
                  </button>
                )}
                
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-lg transition-colors ${
                    showSettings ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Document Settings"
                >
                  <FiSettings size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!readOnly && (
                <button
                  onClick={() => onDocumentUpdate(currentDocument)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  <FiSave size={16} />
                  Save
                </button>
              )}
              
              <button
                onClick={() => toast.info('Export functionality coming soon')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium"
              >
                <FiDownload size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Content Editor */}
        <div className="flex-1 overflow-auto bg-gray-100 p-8">
          <div 
            className="mx-auto bg-white rounded-lg shadow-sm"
            style={{
              maxWidth: '794px', // A4 width
              minHeight: '1123px', // A4 height
              padding: `${currentDocument.formatting?.paragraphSpacing || 40}px`,
              fontFamily: currentDocument.formatting?.fontFamily || 'Georgia, serif',
              fontSize: currentDocument.formatting?.fontSize || 16,
              lineHeight: currentDocument.formatting?.lineHeight || 1.6
            }}
          >
            {currentContent ? (
              <ContentEditor
                content={currentContent}
                type={selectedSection ? 'section' : 'chapter'}
                onUpdate={(updates) => {
                  if (selectedSection && selectedChapter) {
                    updateSection(selectedChapter, selectedSection, updates);
                  } else if (selectedChapter) {
                    updateChapter(selectedChapter, updates);
                  }
                }}
                formatting={currentDocument.formatting}
                readOnly={readOnly}
              />
            ) : (
              <div className="text-center py-16">
                <FiFileText className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select Content to Edit</h3>
                <p className="text-gray-600">Choose a chapter or section from the outline to start editing</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Outline Chapter Node Component
interface OutlineChapterNodeProps {
  chapter: DocumentChapter;
  isSelected: boolean;
  selectedSection: string | null;
  onChapterSelect: (id: string) => void;
  onSectionSelect: (id: string) => void;
  onAddSection: (chapterId: string, parentSectionId?: string) => void;
  onUpdateChapter: (id: string, updates: Partial<DocumentChapter>) => void;
  onUpdateSection: (chapterId: string, sectionId: string, updates: Partial<DocumentSection>) => void;
  readOnly: boolean;
}

const OutlineChapterNode: React.FC<OutlineChapterNodeProps> = ({
  chapter,
  isSelected,
  selectedSection,
  onChapterSelect,
  onSectionSelect,
  onAddSection,
  readOnly
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(chapter.title);

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'
        }`}
        onClick={() => onChapterSelect(chapter.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-1"
        >
          {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
        </button>
        
        <FiHash size={14} className="text-blue-600" />
        
        <div className="flex-1 flex items-center gap-2">
          <span className="font-medium text-sm">
            {chapter.number}. {chapter.title}
          </span>
        </div>
        
        {!readOnly && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddSection(chapter.id);
            }}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-blue-100 rounded"
            title="Add Section"
          >
            <FiPlus size={12} />
          </button>
        )}
      </div>
      
      {isExpanded && chapter.sections.length > 0 && (
        <div className="ml-6 mt-1 space-y-1">
          {chapter.sections.map(section => (
            <div
              key={section.id}
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                selectedSection === section.id ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'
              }`}
              onClick={() => onSectionSelect(section.id)}
            >
              <div className="w-4" /> {/* Spacer */}
              <FiType size={12} className="text-green-600" />
              <span className="text-sm">
                {section.number} {section.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Content Editor Component
interface ContentEditorProps {
  content: DocumentChapter | DocumentSection;
  type: 'chapter' | 'section';
  onUpdate: (updates: any) => void;
  formatting: DocumentFormatting;
  readOnly: boolean;
}

const ContentEditor: React.FC<ContentEditorProps> = ({
  content,
  type,
  onUpdate,
  formatting,
  readOnly
}) => {
  const [title, setTitle] = useState(content.title);
  const [text, setText] = useState(content.content);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onUpdate({ title: newTitle });
  };

  const handleContentChange = (newContent: string) => {
    setText(newContent);
    onUpdate({ content: newContent });
  };

  const headingStyle = type === 'chapter' 
    ? formatting.headingStyles?.h1 || { fontSize: 28, color: '#111827', spacing: 24 }
    : formatting.headingStyles?.h2 || { fontSize: 22, color: '#374151', spacing: 20 };

  return (
    <div>
      {/* Title Editor */}
      <input
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        className="w-full border-none outline-none bg-transparent font-bold mb-6"
        style={{
          fontSize: headingStyle.fontSize,
          color: headingStyle.color,
          marginBottom: headingStyle.spacing
        }}
        placeholder={`Enter ${type} title...`}
        readOnly={readOnly}
      />
      
      {/* Content Editor */}
      <textarea
        value={text}
        onChange={(e) => handleContentChange(e.target.value)}
        className="w-full h-96 border-none outline-none resize-none bg-transparent"
        placeholder={`Write your ${type} content here...`}
        readOnly={readOnly}
        style={{
          fontSize: formatting.fontSize || 16,
          lineHeight: formatting.lineHeight || 1.6,
          fontFamily: formatting.fontFamily || 'Georgia, serif'
        }}
      />
    </div>
  );
};

export default ProfessionalDocumentEditor;