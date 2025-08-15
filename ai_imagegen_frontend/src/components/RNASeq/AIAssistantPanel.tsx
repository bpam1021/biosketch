import React, { useState, useEffect } from 'react';
import { FiMessageCircle, FiSend, FiBox, FiUser } from 'react-icons/fi';
import { RNASeqAIChat } from '../../types/RNASeq';
import { sendAIChat, getAIChats } from '../../api/rnaseqApi';
import { toast } from 'react-toastify';

interface AIAssistantPanelProps {
  datasetId: string;
  isOpen: boolean;
  onClose: () => void;
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ datasetId, isOpen, onClose }) => {
  const [chats, setChats] = useState<RNASeqAIChat[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextType, setContextType] = useState<'general' | 'results_interpretation' | 'methodology' | 'troubleshooting'>('general');

  useEffect(() => {
    if (isOpen && datasetId) {
      fetchChats();
    }
  }, [isOpen, datasetId]);

  const fetchChats = async () => {
    try {
      const response = await getAIChats(datasetId);
      setChats(response.data);
    } catch (error) {
      console.error('Failed to load AI chats:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      await sendAIChat({
        dataset_id: datasetId,
        user_message: message,
        context_type: contextType
      });
      setMessage('');
      toast.success('Message sent to AI assistant');
      
      // Refresh chats after a delay to allow processing
      setTimeout(fetchChats, 2000);
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FiBox className="text-purple-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">RNA-seq AI Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Context Type Selector */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Type:
          </label>
          <select
            value={contextType}
            onChange={(e) => setContextType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="general">General Question</option>
            <option value="results_interpretation">Results Interpretation</option>
            <option value="methodology">Methodology Question</option>
            <option value="troubleshooting">Troubleshooting</option>
          </select>
        </div>
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiMessageCircle className="mx-auto h-12 w-12 mb-4" />
              <p>No conversations yet. Ask me anything about your RNA-seq analysis!</p>
              <div className="mt-4 text-sm text-gray-400">
                <p>Try asking about:</p>
                <ul className="mt-2 space-y-1">
                  <li>• "What do my results mean?"</li>
                  <li>• "How should I interpret the pathway analysis?"</li>
                  <li>• "What are the next steps for my analysis?"</li>
                  <li>• "Why did my alignment rate seem low?"</li>
                </ul>
              </div>
            </div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} className="space-y-3">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-blue-50 rounded-lg p-3 max-w-[80%]">
                    <div className="flex items-center gap-2 mb-1">
                      <FiUser className="text-blue-600" size={14} />
                      <span className="text-xs text-blue-600 font-medium">You</span>
                    </div>
                    <p className="text-sm text-blue-900">{chat.user_message}</p>
                  </div>
                </div>
                
                {/* AI Response */}
                <div className="flex justify-start">
                  <div className="bg-gray-50 rounded-lg p-3 max-w-[80%]">
                    <div className="flex items-center gap-2 mb-1">
                      <FiBox className="text-purple-600" size={14} />
                      <span className="text-xs text-purple-600 font-medium">AI Assistant</span>
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{chat.ai_response}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Chat Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your analysis, methodology, or results..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
              rows={2}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <FiSend size={16} />
              )}
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPanel;