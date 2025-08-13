import React, { useState, useRef, useEffect } from 'react';
import * as fabric from 'fabric';
import { Slide } from '../../types/Presentation';
import { FiPlay, FiPause, FiSkipForward, FiVolume2, FiDownload, FiSettings, FiEye } from 'react-icons/fi';
import { toast } from 'react-toastify';

interface AdvancedSlideEditorProps {
  slides: Slide[];
  onSlidesUpdate: (slides: Slide[]) => void;
  onExportVideo: (settings: VideoExportSettings) => void;
}

interface VideoExportSettings {
  resolution: '720p' | '1080p' | '4k';
  fps: 24 | 30 | 60;
  duration_per_slide: number;
  include_narration: boolean;
  background_music?: boolean;
  transition_duration: number;
}

interface AnimationSettings {
  type: 'fadeIn' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'zoomIn' | 'zoomOut' | 'rotate' | 'bounce';
  duration: number;
  delay: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

const AdvancedSlideEditor: React.FC<AdvancedSlideEditorProps> = ({ 
  slides, 
  onSlidesUpdate, 
  onExportVideo 
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>({
    type: 'fadeIn',
    duration: 1000,
    delay: 0,
    easing: 'ease-in-out'
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [videoSettings, setVideoSettings] = useState<VideoExportSettings>({
    resolution: '1080p',
    fps: 30,
    duration_per_slide: 5,
    include_narration: true,
    background_music: false,
    transition_duration: 1
  });
  
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentSlide = slides[currentSlideIndex];

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const canvasEl = canvasContainerRef.current.querySelector('canvas');
    if (canvasEl) {
      const canvas = new fabric.Canvas(canvasEl, {
        width: 1024,
        height: 768,
        backgroundColor: '#ffffff',
      });
      canvasRef.current = canvas;

      return () => {
        canvas.dispose();
      };
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current && currentSlide) {
      loadSlideToCanvas(currentSlide);
    }
  }, [currentSlideIndex, currentSlide]);

  const loadSlideToCanvas = async (slide: Slide) => {
    if (!canvasRef.current) return;

    try {
      if (slide.canvas_json) {
        await canvasRef.current.loadFromJSON(slide.canvas_json);
      } else if (slide.image_url) {
        const img = await fabric.Image.fromURL(slide.image_url, { crossOrigin: 'anonymous' });
        canvasRef.current.clear();
        canvasRef.current.add(img);
      }
      canvasRef.current.renderAll();
    } catch (error) {
      console.error('Failed to load slide:', error);
    }
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const startPreview = () => {
    setIsPlaying(true);
    previewIntervalRef.current = setInterval(() => {
      if (currentSlideIndex < slides.length - 1) {
        setCurrentSlideIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
        setCurrentSlideIndex(0);
      }
    }, 5000); // 5 seconds per slide
  };

  const stopPreview = () => {
    setIsPlaying(false);
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
  };

  const applyAnimation = () => {
    if (!canvasRef.current || !currentSlide) return;

    const objects = canvasRef.current.getObjects();
    // Map UI easing options to fabric.util.ease functions
    const easingMap: Record<string, ((t: number, b: number, c: number, d: number) => number)> = {
      'linear': fabric.util.ease.easeInSine,
      'ease-in': fabric.util.ease.easeInSine,
      'ease-out': fabric.util.ease.easeOutSine,
      'ease-in-out': fabric.util.ease.easeInOutSine,
      'bounce': fabric.util.ease.easeInBounce
    };
    const getEasing = (easing: string) => easingMap[easing] || fabric.util.ease.easeInOutSine;

    objects.forEach((obj, index) => {
      setTimeout(() => {
        switch (animationSettings.type) {
          case 'fadeIn': {
            obj.set('opacity', 0);
            obj.animate({ opacity: 1 }, {
              duration: animationSettings.duration,
              easing: getEasing(animationSettings.easing),
            });
            break;
          }
          case 'slideLeft': {
            const originalLeft = obj.left || 0;
            obj.set('left', originalLeft - 200);
            obj.animate({ left: originalLeft }, {
              duration: animationSettings.duration,
              easing: getEasing(animationSettings.easing),
            });
            break;
          }
          case 'zoomIn': {
            obj.set({ scaleX: 0.1, scaleY: 0.1 });
            obj.animate({ scaleX: 1, scaleY: 1 }, {
              duration: animationSettings.duration,
              easing: getEasing(animationSettings.easing),
            });
            break;
          }
          // Add more animation types as needed
          default:
            break;
        }
      }, animationSettings.delay + (index * 200)); // Stagger animations
    });

    // Update slide with animation settings
    const updatedSlides = slides.map(slide =>
      slide.id === currentSlide.id
        ? {
            ...slide,
            animation_type: animationSettings.type,
            animation_duration: animationSettings.duration,
            animation_delay: animationSettings.delay,
          }
        : slide
    );
    onSlidesUpdate(updatedSlides);

    toast.success('Animation applied to slide');
  };

  const saveCurrentSlide = async () => {
    if (!canvasRef.current || !currentSlide) return;

    try {
      const canvasJSON = JSON.stringify(canvasRef.current.toJSON());
      const updatedSlides = slides.map(slide =>
        slide.id === currentSlide.id
          ? { ...slide, canvas_json: canvasJSON }
          : slide
      );
      onSlidesUpdate(updatedSlides);
      toast.success('Slide saved');
    } catch (error) {
      toast.error('Failed to save slide');
    }
  };

  const handleExportVideo = () => {
    onExportVideo(videoSettings);
    setShowExportModal(false);
    toast.info('Video export started. This may take several minutes...');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Slide Timeline */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-4">Slides Timeline</h3>
        <div className="space-y-2">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              onClick={() => setCurrentSlideIndex(index)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                index === currentSlideIndex
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{index + 1}</span>
                {slide.animation_type && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    {slide.animation_type}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 truncate">{slide.title}</p>
              
              {/* Animation indicator */}
              {slide.animation_type && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <span>🎬</span>
                  <span>{slide.animation_duration}ms</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={isPlaying ? stopPreview : startPreview}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isPlaying
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
                {isPlaying ? 'Stop' : 'Preview'}
              </button>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={prevSlide}
                  disabled={currentSlideIndex === 0}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <FiSkipForward size={16} className="transform rotate-180" />
                </button>
                <span className="text-sm text-gray-600 px-3">
                  {currentSlideIndex + 1} / {slides.length}
                </span>
                <button
                  onClick={nextSlide}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <FiSkipForward size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveCurrentSlide}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Save Slide
              </button>
              
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                <FiDownload size={16} />
                Export Video
              </button>
            </div>
          </div>
        </div>

        {/* Canvas and Animation Panel */}
        <div className="flex-1 flex">
          {/* Canvas */}
          <div className="flex-1 p-6 flex items-center justify-center">
            <div
              ref={canvasContainerRef}
              className="bg-white rounded-lg shadow-lg"
              style={{ width: '1024px', height: '768px' }}
            >
              <canvas width={1024} height={768} className="rounded-lg" />
            </div>
          </div>

          {/* Animation Panel */}
          <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiSettings size={16} />
              Animation Settings
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Animation Type</label>
                <select
                  value={animationSettings.type}
                  onChange={(e) => setAnimationSettings(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fadeIn">Fade In</option>
                  <option value="slideLeft">Slide Left</option>
                  <option value="slideRight">Slide Right</option>
                  <option value="slideUp">Slide Up</option>
                  <option value="slideDown">Slide Down</option>
                  <option value="zoomIn">Zoom In</option>
                  <option value="zoomOut">Zoom Out</option>
                  <option value="rotate">Rotate</option>
                  <option value="bounce">Bounce</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration: {animationSettings.duration}ms
                </label>
                <input
                  type="range"
                  min={100}
                  max={3000}
                  step={100}
                  value={animationSettings.duration}
                  onChange={(e) => setAnimationSettings(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delay: {animationSettings.delay}ms
                </label>
                <input
                  type="range"
                  min={0}
                  max={2000}
                  step={100}
                  value={animationSettings.delay}
                  onChange={(e) => setAnimationSettings(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Easing</label>
                <select
                  value={animationSettings.easing}
                  onChange={(e) => setAnimationSettings(prev => ({ ...prev, easing: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="linear">Linear</option>
                  <option value="ease-in">Ease In</option>
                  <option value="ease-out">Ease Out</option>
                  <option value="ease-in-out">Ease In Out</option>
                  <option value="bounce">Bounce</option>
                </select>
              </div>

              <button
                onClick={applyAnimation}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <FiEye size={16} />
                Preview Animation
              </button>

              {/* Slide Timing */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Slide Timing</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-advance after: {currentSlide?.animation_duration || 5}s
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={currentSlide?.animation_duration || 5}
                    onChange={(e) => {
                      const updatedSlides = slides.map(slide =>
                        slide.id === currentSlide.id
                          ? { ...slide, animation_duration: parseInt(e.target.value) }
                          : slide
                      );
                      onSlidesUpdate(updatedSlides);
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Transition Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Transitions</h4>
                <select
                  value={currentSlide?.transition_type || 'fade'}
                  onChange={(e) => {
                    const updatedSlides = slides.map(slide =>
                      slide.id === currentSlide.id
                        ? { ...slide, transition_type: e.target.value as any }
                        : slide
                    );
                    onSlidesUpdate(updatedSlides);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="push">Push</option>
                  <option value="cover">Cover</option>
                  <option value="uncover">Uncover</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Slide Navigation */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlideIndex(index)}
                className={`flex-shrink-0 w-32 h-20 rounded-lg border-2 transition-all ${
                  index === currentSlideIndex
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-xs">
                  Slide {index + 1}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Export Video Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
                <select
                  value={videoSettings.resolution}
                  onChange={(e) => setVideoSettings(prev => ({ ...prev, resolution: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="720p">720p (HD)</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="4k">4K (Ultra HD)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frame Rate</label>
                <select
                  value={videoSettings.fps}
                  onChange={(e) => setVideoSettings(prev => ({ ...prev, fps: parseInt(e.target.value) as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={24}>24 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration per Slide: {videoSettings.duration_per_slide}s
                </label>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={videoSettings.duration_per_slide}
                  onChange={(e) => setVideoSettings(prev => ({ ...prev, duration_per_slide: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transition Duration: {videoSettings.transition_duration}s
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={videoSettings.transition_duration}
                  onChange={(e) => setVideoSettings(prev => ({ ...prev, transition_duration: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={videoSettings.include_narration}
                  onChange={(e) => setVideoSettings(prev => ({ ...prev, include_narration: e.target.checked }))}
                  className="w-4 h-4 text-blue-600"
                />
                <label className="text-sm text-gray-700">Include AI narration</label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={videoSettings.background_music}
                  onChange={(e) => setVideoSettings(prev => ({ ...prev, background_music: e.target.checked }))}
                  className="w-4 h-4 text-blue-600"
                />
                <label className="text-sm text-gray-700">Add background music</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExportVideo}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Export Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSlideEditor;