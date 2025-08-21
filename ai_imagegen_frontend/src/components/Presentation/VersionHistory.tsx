import React, { useState, useEffect } from 'react';
import { 
  FiClock, FiUser, FiGitBranch, FiRefreshCw, FiEye,
  FiRewind, FiCheck, FiX, FiDownload
} from 'react-icons/fi';
import { PresentationVersion } from '../../types/Presentation';
import { toast } from 'react-toastify';

interface VersionHistoryProps {
  presentationId: string;
  onRestore: (versionId: string) => Promise<void>;
  onClose: () => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  presentationId,
  onRestore,
  onClose
}) => {
  const [versions, setVersions] = useState<PresentationVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockVersions: PresentationVersion[] = [
        {
          id: '1',
          version_number: 5,
          changes_summary: 'Added new diagrams and updated conclusion section',
          created_by: 'user-1',
          created_by_name: 'John Doe',
          is_auto_save: false,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          version_number: 4,
          changes_summary: 'Auto-save: Updated methodology section',
          created_by: 'user-1',
          created_by_name: 'John Doe',
          is_auto_save: true,
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '3',
          version_number: 3,
          changes_summary: 'Revised introduction and added references',
          created_by: 'user-2',
          created_by_name: 'Jane Smith',
          is_auto_save: false,
          created_at: new Date(Date.now() - 7200000).toISOString()
        }
      ];
      setVersions(mockVersions);
    } catch (error) {
      console.error('Failed to load versions:', error);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('Are you sure you want to restore this version? Current changes will be lost.')) {
      return;
    }

    try {
      await onRestore(versionId);
      toast.success('Version restored successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to restore version');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiClock size={20} />
              Version History
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            View and restore previous versions of your presentation
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <FiGitBranch className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-500">No version history available</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedVersion === version.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            index === 0 ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <span className="font-medium text-gray-900">
                            Version {version.version_number}
                          </span>
                          {index === 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              Current
                            </span>
                          )}
                          {version.is_auto_save && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              Auto-save
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-800 mb-2">{version.changes_summary}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <FiUser size={14} />
                          {version.created_by_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <FiClock size={14} />
                          {formatTimeAgo(version.created_at)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setSelectedVersion(
                          selectedVersion === version.id ? null : version.id
                        )}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                        title="Preview changes"
                      >
                        <FiEye size={16} />
                      </button>
                      
                      {index !== 0 && (
                        <button
                          onClick={() => handleRestore(version.id)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg"
                          title="Restore this version"
                        >
                          <FiRewind size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {selectedVersion === version.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        <p><strong>Changes made:</strong></p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {version.changes_summary.split(',').map((change, i) => (
                            <li key={i}>{change.trim()}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          View full diff
                        </button>
                        <span className="text-gray-300">|</span>
                        <button className="text-sm text-gray-600 hover:text-gray-700">
                          <FiDownload size={14} className="inline mr-1" />
                          Export this version
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>Versions are automatically created when significant changes are made.</p>
              <p>Auto-saves are created every 5 minutes when editing.</p>
            </div>
            
            <button
              onClick={loadVersions}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <FiRefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionHistory;