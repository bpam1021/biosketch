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
    sort_by: 'updated',
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
      setPresentations(data.results || []);
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

    return (
      <div 
        className={`group relative border rounded-xl transition-all duration-200 ${
          selectedIds.includes(presentation.id) 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
        }`}
      >
        {/* Selection Checkbox */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <input
            type="checkbox"
            checked={selectedIds.includes(presentation.id)}
            onChange={() => toggleSelection(presentation.id)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>

        {/* Actions Menu */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
            >
              <FiMoreVertical size={16} />
            </button>
            
            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => navigate(`/presentation/${presentation.id}`)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <FiEdit3 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => navigate(`/presentation/${presentation.id}?mode=preview`)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <FiEye size={14} />
                  Preview
                </button>
                <button
                  onClick={() => handleDuplicate(presentation.id)}
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
                  onClick={() => handleDelete(presentation.id)}
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
          {/* Type Badge */}
          <div className="flex items-center gap-2 mb-3">
            {presentation.presentation_type === 'document' ? (
              <FiFileText className="text-blue-600" size={20} />
            ) : (
              <FiMonitor className="text-purple-600" size={20} />
            )}
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              presentation.presentation_type === 'document'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {presentation.presentation_type === 'document' ? 'Document' : 'Slide Deck'}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              presentation.status === 'ready' 
                ? 'bg-green-100 text-green-700'
                : presentation.status === 'generating'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {presentation.status}
            </span>
          </div>

          {/* Title and Description */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {presentation.title}
          </h3>
          
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {presentation.description || 'No description'}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 mb-4">
            <div>
              <span className="font-medium">{presentation.sections_count}</span> sections
            </div>
            <div>
              <span className="font-medium">{presentation.word_count}</span> words
            </div>
            <div>
              <span className="font-medium">{presentation.view_count}</span> views
            </div>
            <div>
              <span className="font-medium">{presentation.estimated_duration}min</span> read
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Updated {formatDate(presentation.updated_at)}</span>
            {presentation.is_public && (
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">Public</span>
            )}
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