import React, { useState, useEffect } from 'react';
import { 
  FiUsers, FiUserPlus, FiMail, FiCheck, FiX, FiClock,
  FiMessageCircle, FiEdit3, FiEye, FiShare2, FiCopy
} from 'react-icons/fi';
import { useCollaboration } from '../utils';
import { toast } from 'react-toastify';

interface CollaborationPanelProps {
  presentationId: string;
  isOwner: boolean;
  onClose: () => void;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'online' | 'offline';
  lastSeen?: string;
  isInvited?: boolean;
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  presentationId,
  isOwner,
  onClose
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [linkAccess, setLinkAccess] = useState<'none' | 'viewer' | 'editor'>('none');
  
  const { isConnected, activeUsers, sendMessage } = useCollaboration(presentationId);

  useEffect(() => {
    loadCollaborators();
    generateShareLink();
  }, []);

  const loadCollaborators = async () => {
    try {
      // Mock data - replace with actual API call
      setCollaborators([
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'owner',
          status: 'online'
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'editor',
          status: 'offline',
          lastSeen: '2 hours ago'
        }
      ]);
    } catch (error) {
      console.error('Failed to load collaborators:', error);
    }
  };

  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    setShareLink(`${baseUrl}/presentation/${presentationId}?shared=true`);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsInviting(true);
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newCollaborator: Collaborator = {
        id: Date.now().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: 'offline',
        isInvited: true
      };
      
      setCollaborators(prev => [...prev, newCollaborator]);
      setInviteEmail('');
      toast.success(`Invitation sent to ${inviteEmail}`);
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const updateCollaboratorRole = async (collaboratorId: string, newRole: 'editor' | 'viewer') => {
    try {
      setCollaborators(prev => 
        prev.map(c => c.id === collaboratorId ? { ...c, role: newRole } : c)
      );
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    if (!confirm('Remove this collaborator?')) return;
    
    try {
      setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
      toast.success('Collaborator removed');
    } catch (error) {
      toast.error('Failed to remove collaborator');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copied to clipboard');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700';
      case 'editor': return 'bg-blue-100 text-blue-700';
      case 'viewer': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiUsers size={20} />
              Collaboration
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Connection Status */}
          <div className={`flex items-center gap-2 mb-6 p-3 rounded-lg ${
            isConnected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
              {isConnected ? 'Connected to real-time collaboration' : 'Disconnected from collaboration'}
            </span>
          </div>

          {/* Share Link */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Share Link</h3>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              />
              <button
                onClick={copyShareLink}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                <FiCopy size={14} />
              </button>
            </div>
            
            <select
              value={linkAccess}
              onChange={(e) => setLinkAccess(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={!isOwner}
            >
              <option value="none">No access (invite only)</option>
              <option value="viewer">Anyone with link can view</option>
              <option value="editor">Anyone with link can edit</option>
            </select>
          </div>

          {/* Invite Section */}
          {isOwner && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Invite People</h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={isInviting || !inviteEmail.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium"
                >
                  {isInviting ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <FiUserPlus size={16} />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Collaborators List */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              People with access ({collaborators.length})
            </h3>
            
            <div className="space-y-3">
              {collaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {collaborator.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {collaborator.name}
                        {activeUsers.some(u => u.id === collaborator.id) && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Online now" />
                        )}
                        {collaborator.isInvited && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            Invited
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{collaborator.email}</div>
                      {collaborator.status === 'offline' && collaborator.lastSeen && (
                        <div className="text-xs text-gray-500">Last seen {collaborator.lastSeen}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(collaborator.role)}`}>
                      {collaborator.role}
                    </span>
                    
                    {isOwner && collaborator.role !== 'owner' && (
                      <div className="flex items-center gap-1">
                        <select
                          value={collaborator.role}
                          onChange={(e) => updateCollaboratorRole(collaborator.id, e.target.value as any)}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button
                          onClick={() => removeCollaborator(collaborator.id)}
                          className="p-1 text-red-600 hover:text-red-700"
                          title="Remove"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Permission Levels</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div><strong>Owner:</strong> Full access, can manage collaborators</div>
              <div><strong>Editor:</strong> Can edit content and leave comments</div>
              <div><strong>Viewer:</strong> Can view and leave comments only</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationPanel;