import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FiPlus, FiSearch, FiFilter, FiGrid, FiList, FiFileText, 
  FiMonitor, FiCalendar, FiUser, FiDownload, FiEye, FiEdit3,
  FiTrash2, FiCopy, FiShare2, FiMoreVertical
} from 'react-icons/fi';
import Sidebar from '../../components/Sidebar';
import { 
  listPresentations, 
  deletePresentation, 
  duplicatePresentation 
} from '../../api/presentationApi';
import { PresentationListItem, PresentationSearchParams } from '../../types/Presentation';

const PresentationsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [presentations, setPresentations] = useState<PresentationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<PresentationSearchParams>({
    query: '',
    presentation_type: 'all',
    sort_by: 'updated_at',
    order: 'desc'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadPresentations();
  }, [searchParams]);

  const loadPresentations = async () => {
    try {
      setLoading(true);
      const data = await listPresentations(searchParams);
      setPresentations(data.presentations || []);
    } catch (error) {
      toast.error('Failed to load presentations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this presentation?')) return;
    
    try {
      await deletePresentation(id);
      setPresentations(prev => prev.filter(p => p.id !== id));
      toast.success('Presentation deleted successfully');
    } catch (error) {
      toast.error('Failed to delete presentation');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await duplicatePresentation(id);
      await loadPresentations(); // Refresh list
      toast.success('Presentation duplicated successfully');
    } catch (error) {
      toast.error('Failed to duplicate presentation');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(pid => pid !== id)
        : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} presentation(s)?`)) return;

    try {
      await Promise.all(selectedIds.map(id => deletePresentation(id)));
      setPresentations(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
      toast.success(`${selectedIds.length} presentation(s) deleted`);
    } catch (error) {
      toast.error('Failed to delete presentations');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const PresentationCard: React.FC<{ presentation: PresentationListItem }> = ({ presentation }) => {
    const [showActions, setShowActions] = useState(false);

    const isDocument = presentation.type === 'document';
    const isSlidePresentation = presentation.type === 'slide_presentation';

    return (
      <div 
        className={`group relative border rounded-xl transition-all duration-200 ${
          selectedIds.includes(presentation.id) 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg'
        }`}
      >
        {/* Selection Checkbox */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <input
            type="checkbox"
            checked={selectedIds.includes(presentation.id)}
            onChange={() => toggleSelection(presentation.id)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>

        {/* Actions Menu */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-1 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
            >
              <FiMoreVertical size={16} />
            </button>
            
            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/presentation/${presentation.id}`);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <FiEdit3 size={14} />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/presentation/${presentation.id}?mode=preview`);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <FiEye size={14} />
                  Preview
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicate(presentation.id);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <FiCopy size={14} />
                  Duplicate
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm">
                  <FiShare2 size={14} />
                  Share
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm">
                  <FiDownload size={14} />
                  Export
                </button>
                <hr className="my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(presentation.id);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm"
                >
                  <FiTrash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div 
          className="p-6 cursor-pointer"
          onClick={() => navigate(`/presentation/${presentation.id}`)}
        >
          {/* Type Badge and Status */}
          <div className="flex items-center gap-2 mb-3">
            {isDocument ? (
              <FiFileText className="text-blue-600" size={20} />
            ) : (
              <FiMonitor className="text-purple-600" size={20} />
            )}
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              isDocument
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {isDocument ? 'Document' : 'Slides'}
            </span>
            {presentation.completion_status && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                presentation.completion_status === 'Complete'
                  ? 'bg-green-100 text-green-700'
                  : presentation.completion_status === 'Draft'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {presentation.completion_status}
              </span>
            )}
            {presentation.quality_score && (
              <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                {Math.round(presentation.quality_score)}% Quality
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {presentation.title}
          </h3>
          
          {/* Content Preview */}
          {presentation.content_preview && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-3">
              {presentation.content_preview}
            </p>
          )}
          
          {/* Abstract */}
          {presentation.abstract && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2 italic">
              {presentation.abstract}
            </p>
          )}

          {/* Rich Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-4">
            {isDocument ? (
              <>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-blue-600">{presentation.word_count || 0}</span>
                  <span>words</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-blue-600">{presentation.page_count || 0}</span>
                  <span>pages</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-blue-600">{presentation.chapter_count || 0}</span>
                  <span>chapters</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-blue-600">{presentation.reading_time || 0}</span>
                  <span>min read</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-purple-600">{presentation.slide_count || 0}</span>
                  <span>slides</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-purple-600">{presentation.estimated_duration_minutes || 0}</span>
                  <span>min</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-purple-600">{presentation.view_count || 0}</span>
                  <span>views</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-purple-600">{presentation.ai_opportunities || 0}</span>
                  <span>AI ops</span>
                </div>
              </>
            )}
          </div>

          {/* Template and Theme Info */}
          <div className="flex items-center gap-2 mb-3">
            {presentation.template_name && (
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                📝 {presentation.template_name}
              </span>
            )}
            {presentation.theme_name && (
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                🎨 {presentation.theme_name}
              </span>
            )}
          </div>

          {/* Chapter/Slide Structure Preview */}
          {presentation.chapter_structure && presentation.chapter_structure.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">Structure:</div>
              <div className="space-y-1">
                {presentation.chapter_structure.slice(0, 2).map((chapter, idx) => (
                  <div key={idx} className="text-xs text-gray-600">
                    <span className="font-medium">{chapter.number}. {chapter.title}</span>
                    {chapter.sections && chapter.sections.length > 0 && (
                      <span className="text-gray-500 ml-2">
                        ({chapter.section_count} sections)
                      </span>
                    )}
                  </div>
                ))}
                {presentation.chapter_structure.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{presentation.chapter_structure.length - 2} more chapters
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Features */}
          <div className="flex items-center gap-2 mb-3">
            {presentation.ai_opportunities && presentation.ai_opportunities > 0 && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                🤖 {presentation.ai_opportunities} AI suggestions
              </span>
            )}
            {presentation.has_comments && (
              <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                💬 Comments
              </span>
            )}
            {presentation.track_changes_enabled && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                📝 Track changes
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
            <span>Updated {formatDate(presentation.updated_at)}</span>
            <div className="flex items-center gap-2">
              {presentation.is_published && (
                <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full">
                  🌐 Published
                </span>
              )}
              {presentation.version && (
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  v{presentation.version}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Presentations</h1>
            <p className="text-gray-600 mt-1">Manage your AI-generated presentations and documents</p>
          </div>
          
          <button
            onClick={() => navigate('/presentation/create')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <FiPlus size={16} />
            Create New
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search presentations..."
                value={searchParams.query || ''}
                onChange={(e) => setSearchParams(prev => ({ ...prev, query: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Type Filter */}
            <select
              value={searchParams.presentation_type || 'all'}
              onChange={(e) => setSearchParams(prev => ({ 
                ...prev, 
                presentation_type: e.target.value as any 
              }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="document">Documents</option>
              <option value="slide">Slide Decks</option>
            </select>

            {/* Sort */}
            <select
              value={`${searchParams.sort_by}-${searchParams.order}`}
              onChange={(e) => {
                const [sort_by, order] = e.target.value.split('-');
                setSearchParams(prev => ({ ...prev, sort_by: sort_by as any, order: order as any }));
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="updated_at-desc">Recently Updated</option>
              <option value="created_at-desc">Recently Created</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>

            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <FiGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <FiList size={16} />
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-blue-700 font-medium">
                {selectedIds.length} selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                <FiTrash2 size={14} />
                Delete
              </button>
              <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
                <FiDownload size={14} />
                Export
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : presentations.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <FiFileText className="mx-auto h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No presentations found</h3>
            <p className="text-gray-600 mb-6">
              {searchParams.query ? 'Try adjusting your search terms' : 'Get started by creating your first presentation'}
            </p>
            <button
              onClick={() => navigate('/presentation/create')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create First Presentation
            </button>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {presentations.map((presentation) => (
              <PresentationCard key={presentation.id} presentation={presentation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PresentationsListPage;