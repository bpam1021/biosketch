import React, { useState, useEffect } from 'react';
import {
  getTemplateLibraryTree,
  searchTemplateImages,
  submitTemplateRequest,
  getUserTemplateRequests,
} from '../../api/templateApi';
import { toast } from 'react-toastify';
import { FiSearch, FiImage, FiSend, FiChevronRight, FiChevronDown, FiFolder } from 'react-icons/fi';
import * as fabric from 'fabric';

interface TemplateImageNode {
  id: number;
  name: string;
  image: string;
  source: string;
  type: string | null;
}

interface TreeNode {
  label: string;
  children?: TreeNode[];
  image?: TemplateImageNode;
}

interface TemplateLibraryPanelProps {
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
  layerPanelRef?: React.RefObject<{ refreshLayers: () => void }>;
  setIsInsertingTemplate: React.Dispatch<React.SetStateAction<boolean>>;
}

const TemplateLibraryPanel: React.FC<TemplateLibraryPanelProps> = ({
  canvasRef,
  layerPanelRef,
  setIsInsertingTemplate,
}) => {
  const [tab, setTab] = useState<'browse' | 'request'>('browse');
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = useState<TemplateImageNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TemplateImageNode[] | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [userRequests, setUserRequests] = useState([]);

  useEffect(() => {
    if (tab === 'browse') fetchTree();
  }, [tab]);

  const fetchTree = async () => {
    try {
      const res = await getTemplateLibraryTree();
      setTree(res.data);
    } catch {
      toast.error('Failed to load templates');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return setSearchResults(null);
    try {
      const res = await searchTemplateImages(searchQuery.trim());
      if (Array.isArray(res.data)) {
        setSearchResults(res.data);
      } else {
        console.error('Invalid response:', res.data);
        setSearchResults(null);
      }
    } catch {
      toast.error('Search failed');
    }
  };

  const handleInsert = async () => {
    if (!selectedImage) return;
    try {
      setIsInsertingTemplate(true);
      const img = await fabric.Image.fromURL(`${selectedImage.image}?_ts=${Date.now()}`, {
        crossOrigin: 'anonymous',
      });
      img.scaleToHeight(canvasRef.current?.getHeight()! / 3);
      img.scaleToWidth(canvasRef.current?.getWidth()! / 3);
      img.set({
        left: canvasRef.current?.getWidth()! / 2 - img.getScaledWidth()! / 2,
        top: canvasRef.current?.getHeight()! / 2 - img.getScaledHeight()! / 2,
        selectable: true,
        erasable: true,
        layerLabel: 'Template',
      });
      canvasRef.current?.add(img);
      canvasRef.current?.setActiveObject(img);
      canvasRef.current?.renderAll();
      layerPanelRef?.current?.refreshLayers();
    } catch {
      toast.error('Failed to insert image');
    } finally {
      setIsInsertingTemplate(false);
      setSelectedImage(null);
    }
  };

  const toggleNode = (label: string) => {
    setExpandedNodes(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderTree = (nodes: TreeNode[], depth = 0): JSX.Element[] => {
    return nodes.map((node, i) => {
      const isExpanded = expandedNodes[node.label];
      const hasChildren = node.children && node.children.length > 0;
      const isSelected = selectedImage?.id === node.image?.id;

      return (
        <div key={node.label + i} className={`ml-[${depth * 12}px]`}>
          <div
            className={`flex items-center gap-2 pl-${depth * 2} py-1 rounded cursor-pointer transition
            ${isSelected ? ' text-white' : 'hover:bg-gray-700'}
          `}
            onClick={() =>
              hasChildren
                ? toggleNode(node.label)
                : node.image && setSelectedImage(node.image)
            }
          >
            {hasChildren ? (
              isExpanded ? <FiChevronDown /> : <FiChevronRight />
            ) : (
              <FiImage />
            )}
            {hasChildren ? <FiFolder className="text-yellow-400" /> : null}
            <span className="text-sm">{node.label}</span>
          </div>

          {hasChildren && isExpanded && (
            <div className="pl-4 border-l border-gray-600 ml-3">
              {renderTree(node.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const handleRequestSubmit = async () => {
    try {
      await submitTemplateRequest(requestMessage);
      toast.success('Request submitted');
      setRequestMessage('');
      const res = await getUserTemplateRequests();
      setUserRequests(res.data);
    } catch {
      toast.error('Failed to send request');
    }
  };

  const loadUserRequests = async () => {
    try {
      const res = await getUserTemplateRequests();
      setUserRequests(res.data);
    } catch {
      toast.error('Could not load your past requests');
    }
  };

  return (
    <div className="p-2 text-white bg-gray-900 h-[80vh] overflow-y-auto rounded-lg text-sm">
      <div className="flex justify-center mb-4">
        <div className="inline-flex bg-gray-800 rounded-full p-1">
          <button className={`px-5 py-2 rounded-full ${tab === 'browse' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`} onClick={() => setTab('browse')}>Browse</button>
          <button className={`px-5 py-2 rounded-full ${tab === 'request' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`} onClick={() => { setTab('request'); loadUserRequests(); }}>Request</button>
        </div>
      </div>

      {tab === 'browse' && (
        <>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-600"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={handleSearch} className="px-3 py-2 bg-blue-600 rounded hover:bg-blue-700">
              <FiSearch />
            </button>
          </div>

          <div className="overflow-y-auto h-[50vh] pr-1">
            {searchResults ? (
              <>
                <h4 className="mb-2 font-semibold text-gray-300">Search Results</h4>
                <ul className="space-y-2">
                  {Array.isArray(searchResults) && searchResults.map(img => (
                    <li key={img.id} className="cursor-pointer hover:text-blue-400" onClick={() => setSelectedImage(img)}>
                      <FiImage className="inline mr-1" />
                      {img.name} <span className="text-xs text-gray-400">({img.source}/{img.type || 'N/A'})</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>{renderTree(tree)}</>
            )}
          </div>

          {selectedImage && (
            <div className="border-t border-gray-700 pt-3">
              <h4 className="font-semibold text-gray-300 mb-2">Preview</h4>
              <img src={selectedImage.image} alt={selectedImage.name} className="w-full h-40 object-contain bg-black mb-2 rounded" />
              <div className="text-sm mb-1">Name: {selectedImage.name}</div>
              <div className="text-sm mb-2 text-gray-400">Source: {selectedImage.source} / {selectedImage.type || 'N/A'}</div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedImage(null)} className="flex-1 py-1 bg-gray-700 rounded hover:bg-gray-600">No</button>
                <button onClick={handleInsert} className="flex-1 py-1 bg-green-600 rounded hover:bg-green-700">Yes</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'request' && (
        <div>
          <textarea
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            rows={4}
            className="w-full p-3 rounded-lg border border-gray-600 bg-gray-800 text-white mb-4 resize-none"
            placeholder="Describe the template you want us to create for you..."
          />
          <button
            onClick={handleRequestSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition mb-6"
          >
            <FiSend /> Submit Request
          </button>
          <h3 className="text-lg font-semibold mb-3">Your Previous Requests</h3>
          <ul className="space-y-4">
            {userRequests.map((req: any) => (
              <li
                key={req.id}
                className="border border-gray-700 bg-gray-800 p-4 rounded-lg shadow-sm"
              >
                <p className="text-white">{req.message}</p>
                <p className="mt-1 text-sm text-gray-400">
                  Status: <span className="capitalize text-blue-400 font-medium">{req.status}</span>
                  {req.admin_response && <span> — <em className="text-gray-300">{req.admin_response}</em></span>}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TemplateLibraryPanel;