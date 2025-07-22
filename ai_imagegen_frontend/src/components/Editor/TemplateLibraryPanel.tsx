import React, { useState, useEffect } from 'react';
import {
  getTemplateCategories,
  submitTemplateRequest,
  getUserTemplateRequests,
} from '../../api/templateApi';
import { toast } from 'react-toastify';
import { FiSearch, FiSend } from 'react-icons/fi';
import * as fabric from 'fabric';

interface TemplateImage {
  id: number;
  name: string;
  image: string;
}

interface TemplateCategory {
  id: number;
  name: string;
  description: string;
  images: TemplateImage[];
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
  const [imageType, setImageType] = useState<'2d' | '3d'>('2d');
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [userRequests, setUserRequests] = useState([]);

  useEffect(() => {
    if (tab === 'browse') fetchCategories();
  }, [tab, imageType]);

  const fetchCategories = async (query = '', type = imageType) => {
    try {
      const res = await getTemplateCategories(query, type);
      setCategories(res.data);
    } catch {
      toast.error('Failed to load templates');
    }
  };

  const triggerLayerRefresh = () => {
    layerPanelRef?.current?.refreshLayers();
  };

  const handleSearch = () => {
    fetchCategories(searchQuery, imageType);
  };

  const insertImageToCanvas = async (url: string) => {
    try {
      setIsInsertingTemplate(true);
      const safeUrl = `${url}?_ts=${Date.now()}`;
      const img = await fabric.Image.fromURL(safeUrl, {
        crossOrigin: 'anonymous',
      });
      img.scaleToHeight(canvasRef.current?.getHeight()! / 3);
      img.scaleToWidth(canvasRef.current?.getWidth()! / 3);
      img.set({
        crossOrigin: 'anonymous',
        left: canvasRef.current?.getWidth()! / 2 - img.getScaledWidth()! / 2,
        top: canvasRef.current?.getHeight()! / 2 - img.getScaledHeight()! / 2,
        selectable: true,
        erasable: true,
        layerLabel: 'Template',
      });

      canvasRef.current?.add(img);
      canvasRef.current?.setActiveObject(img);
      canvasRef.current?.renderAll();
      triggerLayerRefresh();
    } catch (error) {
      console.error('Failed to load image:', error);
      toast.error('Failed to insert image');
    } finally {
      setIsInsertingTemplate(false);
    }
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
    <div className="p-2 text-white bg-gray-900 h-[80vh] overflow-y-auto rounded-lg">
      {/* Top Tab: Browse / Request */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-gray-800 rounded-full p-1">
          <button
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${tab === 'browse'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-300 hover:bg-gray-700'
              }`}
            onClick={() => setTab('browse')}
          >
            Browse
          </button>
          <button
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${tab === 'request'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-300 hover:bg-gray-700'
              }`}
            onClick={() => {
              setTab('request');
              loadUserRequests();
            }}
          >
            Request
          </button>
        </div>
      </div>

      {/* Browse Tab */}
      {tab === 'browse' && (
        <div className="flex">
          {/* Vertical Sidebar Tabs */}
          <div className="flex flex-col gap-2 mr-4">
            {['2d', '3d'].map((type) => (
              <button
                key={type}
                className={`w-8 h-32 flex items-center justify-center rounded-l-lg border-l-4 transition-all ${imageType === type
                  ? 'bg-gray-800 border-blue-500 text-white font-semibold'
                  : 'bg-gray-700 border-transparent text-gray-300 hover:bg-gray-600'
                  }`}
                onClick={() => {
                  setImageType(type as '2d' | '3d');
                  fetchCategories(searchQuery, type as '2d' | '3d');
                }}
              >
                <span className="text-center leading-tight">
                  {type[0].toUpperCase()}<br />{type[1].toUpperCase()}
                </span>
              </button>
            ))}
          </div>



          {/* Main Content */}
          <div className="flex-1">
            {/* Search */}
            <div className="flex items-center gap-2 mb-6">
              <input
                type="text"
                placeholder={`Search ${imageType.toUpperCase()} images...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg"
              />
              <button
                onClick={handleSearch}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <FiSearch size={18} />
              </button>
            </div>

            {/* Category Grid */}
            {categories.map((cat) => (
              <div key={cat.id} className="mb-8">
                <h3 className="text-xl font-semibold mb-1">{cat.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{cat.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-2">
                  {cat.images.map((img) => (
                    <div
                      key={img.id}
                      className="relative w-full pb-[75%] bg-gray-900 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all shadow-sm"
                      onClick={() => insertImageToCanvas(img.image)}
                    >
                      <img
                        src={img.image}
                        alt={img.name}
                        className="w-full h-full object-contain absolute top-0 left-0"
                      />
                      <div className="absolute bottom-0 w-full bg-black/60 text-xs text-white text-center py-0.5 px-1 truncate">
                        {img.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Tab */}
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
                  Status:{' '}
                  <span className="capitalize text-blue-400 font-medium">{req.status}</span>
                  {req.admin_response && (
                    <span> — <em className="text-gray-300">{req.admin_response}</em></span>
                  )}
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
