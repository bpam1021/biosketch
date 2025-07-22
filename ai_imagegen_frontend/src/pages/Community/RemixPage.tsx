import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as fabric from 'fabric';
import Sidebar from '../../components/Sidebar';
import PartialSidebar from '../../components/PartialSidebar';
import LayerPanel, { LayerPanelRef } from '../../components/Editor/LayerPanel';
import axiosClient from '../../api/axiosClient';

const RemixPage = () => {
  const { imageId } = useParams();
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const layerPanelRef = useRef<LayerPanelRef>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [activeTab, setActiveTab] = useState('Templates');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const canvasEl = container.querySelector('#canvas') as HTMLCanvasElement;
    if (!canvasEl) return;

    const canvas = new fabric.Canvas(canvasEl, {
      preserveObjectStacking: true,
      backgroundColor: 'white',
    });
    canvasRef.current = canvas;

    const resizeCanvas = () => {
      const width = container.clientWidth;
      const height = width / (16 / 9);
      canvas.setWidth(width);
      canvas.setHeight(height);
      canvas.renderAll();
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    const loadRemixImage = async () => {
      const res = await axiosClient.get(`/community/images/${imageId}/`);
      const imageUrl = res.data.image_url;
      setTitle(`Remix of ${res.data.image_name}`);
      setOriginalPrompt(res.data.prompt);

      if (canvasRef.current) {
        const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' });
        img.scaleToWidth(canvasRef.current.getWidth() * 0.5);
        img.set({ left: 100, top: 100 });
        canvasRef.current.add(img);
        canvasRef.current.setActiveObject(img);
        canvasRef.current.renderAll();
      }
    };

    if (imageId) loadRemixImage();
  }, [imageId]);

  const handleObjectSelect = (obj: fabric.Object | null) => {
    setSelectedObject(obj);
    if (!obj) return;
    if (obj.type === 'textbox') setActiveTab('Text Styling');
    else if (["rect", "circle", "line", "path"].includes(obj.type)) setActiveTab("Shapes");
    else setActiveTab('Templates');
  };

  const submitRemix = async () => {
    if (!canvasRef.current) return;
  
    const imageBlob = await canvasRef.current.toBlob();
    if (!imageBlob) return;
  
    const formData = new FormData();
    formData.append('image', imageBlob, 'remix.png');
    formData.append('title', title);
    formData.append('prompt', originalPrompt);
    formData.append('parent_id', imageId ?? '');
  
    await axiosClient.post('/community/remix/', formData);
    navigate('/community');
  };
  

  return (
    <div className="flex  bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <PartialSidebar
          activeSection="edit"
          canvasRef={canvasRef}
          layerPanelRef={layerPanelRef}
          disabled={false}
          onObjectSelect={handleObjectSelect}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedObject={selectedObject} setIsInsertingTemplate={function (): void {
            throw new Error('Function not implemented.');
          } } isInsertingTemplate={false}        />

        <div className="flex-1 flex flex-col p-4">
          <h2 className="text-xl font-bold mb-4">🌀 Remix This Image</h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title for your remix"
            className="border p-2 mb-2 w-full rounded"
          />

          <button
            onClick={submitRemix}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded mb-4"
          >
            🚀 Publish Remix
          </button>

          <div ref={canvasContainerRef} className="w-full h-[500px] bg-white border rounded">
            <canvas id="canvas" className="w-full h-full" />
          </div>
        </div>

        <div className="hidden lg:flex flex-col min-w-[240px] max-w-[300px] bg-gray-900 border-l border-gray-700">
          <LayerPanel ref={layerPanelRef} canvasRef={canvasRef} />
        </div>
      </div>
    </div>
  );
};

export default RemixPage;
