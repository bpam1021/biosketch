import React, { useState, useEffect } from 'react';
import { FiImage, FiBarChart, FiMonitor, FiSearch, FiFilter, FiDownload } from 'react-icons/fi';
import { getImportableContent, importContentToPresentation } from '../../api/presentationApi';
import { ImportableContent, GeneratedImage } from '../../types/Presentation';
import { toast } from 'react-toastify';

interface ContentImportPanelProps {
  presentationId: number;
  onContentImported: (content: any) => void;
  targetPosition?: { slideIndex?: number; sectionId?: string };
}

const ContentImportPanel: React.FC<ContentImportPanelProps> = ({
  presentationId,
  onContentImported,
  targetPosition
}) => {
  const [content, setContent] = useState<ImportableContent | null>(null);
  const [activeTab, setActiveTab] = useState<'images' | 'diagrams' | 'presentations'>('images');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadImportableContent();
  }, []);

  const loadImportableContent = async () => {
    try {
      const data = await getImportableContent();
      setContent(data);
    } catch (error) {
      toast.error('Failed to load importable content');
      console.error('Import content error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (contentType: 'image' | 'diagram' | 'slide', contentId: string) => {
    try {
      await importContentToPresentation(presentationId, contentType, contentId, targetPosition);
      onContentImported({ type: contentType, id: contentId });
      toast.success('Content imported successfully!');
    } catch (error) {
      toast.error('Failed to import content');
      console.error('Import error:', error);
    }
  };

  const handleBulkImport = async () => {
    if (selectedItems.size === 0) {
      toast.warning('Please select items to import');
      return;
    }

    try {
      for (const itemId of selectedItems) {
        await importContentToPresentation(presentationId, activeTab.slice(0, -1) as any, itemId, targetPosition);
      }
      onContentImported({ type: 'bulk', items: Array.from(selectedItems) });
      setSelectedItems(new Set());
      toast.success(`Imported ${selectedItems.size} items successfully!`);
    } catch (error) {
      toast.error('Failed to import some items');
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getFilteredContent = () => {
    if (!content) return [];

    let items: any[] = [];
    switch (activeTab) {
      case 'images':
        items = content.images || [];
        break;
      case 'diagrams':
        items = content.diagrams || [];
        break;
      case 'presentations':
        items = content.presentations || [];
        break;
    }

    // Apply search filter
    if (searchQuery) {
      items = items.filter(item => 
        (item.image_name || item.title || item.name || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (item.prompt || item.description || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }

    // Apply field filter for images
    if (filterField && activeTab === 'images') {
      items = items.filter(item => item.field === filterField);
    }

    return items;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading content...</span>
      </div>
    );
  }

  const filteredContent = getFilteredContent();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Import Content</h3>
        {selectedItems.size > 0 && (
          <button
            onClick={handleBulkImport}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <FiDownload size={16} />
            Import Selected ({selectedItems.size})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { key: 'images', label: 'Images', icon: <FiImage /> },
          { key: 'diagrams', label: 'Diagrams', icon: <FiBarChart /> },
          { key: 'presentations', label: 'Slides', icon: <FiMonitor /> }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {activeTab === 'images' && (
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Fields</option>
              <option value="biology">Biology</option>
              <option value="chemistry">Chemistry</option>
              <option value="physics">Physics</option>
              <option value="medicine">Medicine</option>
            </select>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
        {filteredContent.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            <p>No {activeTab} found</p>
            {searchQuery && (
              <p className="text-sm mt-1">Try adjusting your search terms</p>
            )}
          </div>
        ) : (
          filteredContent.map((item) => (
            <div
              key={item.id}
              className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                selectedItems.has(item.id) 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Selection Checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => toggleItemSelection(item.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>

              {/* Content Preview */}
              <div onClick={() => handleImport(activeTab.slice(0, -1) as any, item.id)}>
                {activeTab === 'images' && (
                  <div>
                    <img
                      src={item.image_url}
                      alt={item.image_name}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-3">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {item.image_name}
                      </h4>
                      <p className="text-xs text-gray-600 truncate">
                        {item.prompt}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'diagrams' && (
                  <div>
                    <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                      <FiBarChart className="text-3xl text-gray-400" />
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {item.name || `${item.type} Diagram`}
                      </h4>
                      <p className="text-xs text-gray-600 capitalize">
                        {item.type}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'presentations' && (
                  <div>
                    <div className="w-full h-32 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                      <FiMonitor className="text-3xl text-purple-600" />
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {item.slides?.length || 0} slides
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Import Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Import Instructions</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Click on any item to import it immediately</p>
          <p>• Use checkboxes to select multiple items for bulk import</p>
          <p>• Images will be inserted at current cursor position</p>
          <p>• Diagrams will be converted to editable elements</p>
          <p>• Slides will be added to the end of your presentation</p>
        </div>
      </div>
    </div>
  );
};

export default ContentImportPanel;