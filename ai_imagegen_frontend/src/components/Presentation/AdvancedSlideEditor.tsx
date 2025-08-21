import React, { useState, useRef, useEffect } from 'react';
import * as fabric from 'fabric';
import { Presentation, ContentSection, ExportRequest } from '../../types/Presentation';
import { FiPlay, FiPause, FiSkipForward, FiVolume2, FiDownload, FiSettings, FiEye, FiPlus, FiEdit3 } from 'react-icons/fi';
import { toast } from 'react-toastify';

interface AdvancedSlideEditorProps {
  presentation: Presentation;
  sections: ContentSection[];
  onSectionUpdate: (sectionId: string, updates: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionsReorder: (newOrder: ContentSection[]) => Promise<void>;
  onSectionCreate: (data: Partial<ContentSection>) => Promise<ContentSection | undefined>;
  onSectionDelete: (sectionId: string) => Promise<void>;
}

interface VideoExportSettings {
  resolution: '720p' | '1080p' | '4k';
  fps: 24 | 30 | 60;
  duration_per_slide: number;
  include_narration: boolean;
  background_music?: boolean;
  transition_duration: number;
  voice_type?: 'male' | 'female' | 'neutral';
  music_style?: 'none' | 'corporate' | 'inspiring' | 'calm' | 'energetic';
  export_quality: 'draft' | 'standard' | 'high';
}

interface AnimationSettings {
  type: 'fadeIn' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'zoomIn' | 'zoomOut' | 'rotate' | 'bounce';
  duration: number;
  delay: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

const AdvancedSlideEditor: React.FC<AdvancedSlideEditorProps> = ({ 
  presentation,
  sections,
  onSectionUpdate,
  onSectionsReorder,
  onSectionCreate,
  onSectionDelete
}) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
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
    transition_duration: 1,
    voice_type: 'neutral',
    music_style: 'none',
    export_quality: 'standard'
  });
  
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter sections to only show slide-type sections
  const slideableSections = sections.filter(section => 
    section.section_type.includes('slide') || 
    ['heading', 'paragraph', 'image', 'diagram'].includes(section.section_type)
  );

  const currentSection = slideableSections[currentSectionIndex];

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const canvasEl = canvasContainerRef.current.querySelector('canvas');
    if (canvasEl) {
      const canvas = new fabric.Canvas(canvasEl, {
        width: 1024,
        height: 768,
        backgroundColor: presentation.theme_settings?.background_color || '#ffffff',
      });
      canvasRef.current = canvas;

      return () => {
        canvas.dispose();
      };
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current && currentSection) {
      loadSectionToCanvas(currentSection);
    }
  }, [currentSectionIndex, currentSection]);

  const loadSectionToCanvas = async (section: ContentSection) => {
    if (!canvasRef.current) return;

    try {
      canvasRef.current.clear();
      
      if (section.canvas_json) {
        await canvasRef.current.loadFromJSON(section.canvas_json);
      } else {
        // Create default content based on section type
        await createDefaultSlideContent(section);
      }
      
      canvasRef.current.renderAll();
    } catch (error) {
      console.error('Failed to load section to canvas:', error);
    }
  };

  const createDefaultSlideContent = async (section: ContentSection) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Add title
    if (section.title) {
      const title = new fabric.Textbox(section.title, {
        left: 50,
        top: 50,
        width: 900,
        fontSize: 48,
        fontWeight: 'bold',
        fill: presentation.theme_settings?.primary_color || '#000000',
        fontFamily: presentation.theme_settings?.font_family || 'Arial'
      });
      canvas.add(title);
    }

    // Add content based on section type
    if (section.content && section.section_type !== 'title_slide') {
      const content = new fabric.Textbox(section.content, {
        left: 50,
        top: section.title ? 150 : 100,
        width: 900,
        fontSize: 24,
        fill: '#333333',
        fontFamily: presentation.theme_settings?.font_family || 'Arial'
      });
      canvas.add(content);
    }

    // Add image if available
    if (section.image_url) {
      try {
        const img = await fabric.Image.fromURL(section.image_url, { crossOrigin: 'anonymous' });
        img.set({
          left: 600,
          top: section.title ? 200 : 150,
          scaleX: 0.3,
          scaleY: 0.3,
        });
        canvas.add(img);
      } catch (e) {
        console.warn('Failed to load image:', e);
      }
    }

    canvas.renderAll();
  };

  const nextSection = () => {
    if (currentSectionIndex < slideableSections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const prevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const startPreview = () => {
    setIsPlaying(true);
    previewIntervalRef.current = setInterval(() => {
      if (currentSectionIndex < slideableSections.length - 1) {
        setCurrentSectionIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
        setCurrentSectionIndex(0);
      }
    }, videoSettings.duration_per_slide * 1000);
  };

  const stopPreview = () => {
    setIsPlaying(false);
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
  };

  const applyAnimation = () => {
    if (!canvasRef.current || !currentSection) return;

    const objects = canvasRef.current.getObjects();
    const easingMap: Record<string, any> = {
      'linear': fabric.util.ease.easeInSine,
      'ease-in': fabric.util.ease.easeInSine,
      'ease-out': fabric.util.ease.easeOutSine,
      'ease-in-out': fabric.util.ease.easeInOutSine,
    };
    const getEasing = (easing: string) => easingMap[easing] || fabric.util.ease.easeInOutSine;

    objects.forEach((obj, index) => {
      setTimeout(() => {
        switch (animationSettings.type) {
          case 'fadeIn': {
            obj.set('opacity', 0);
            obj.animate('opacity', 1, {
              duration: animationSettings.duration,
              easing: getEasing(animationSettings.easing),
            });
            break;
          }
          case 'slideLeft': {
            const originalLeft = obj.left || 0;
            obj.set('left', originalLeft - 200);
            obj.animate('left', originalLeft, {
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

    // Update section with animation settings
    onSectionUpdate(currentSection.id, {
      animation_config: {
        ...currentSection.animation_config,
        animations: [
          {
            type: animationSettings.type,
            duration: animationSettings.duration,
            delay: animationSettings.delay,
            easing: animationSettings.easing
          }
        ]
      }
    });

    toast.success('Animation applied to slide');
  };

  const saveCurrentSection = async () => {
    if (!canvasRef.current || !currentSection) return;

    try {
      const canvasJSON = JSON.stringify(canvasRef.current.toJSON());
      const dataUrl = canvasRef.current.toDataURL();
      
      await onSectionUpdate(currentSection.id, {
        canvas_json: canvasJSON,
        rendered_image: dataUrl
      });
      toast.success('Slide saved');
    } catch (error) {
      toast.error('Failed to save slide');
    }
  };

  const addNewSection = async () => {
    await onSectionCreate({
      section_type: 'content_slide',
      title: 'New Slide',
      content: 'Slide content...',
      rich_content: 'Slide content...',
      order: slideableSections.length,
      content_data: {},
      layout_config: {},
      style_config: {},
      animation_config: {},
      interaction_config: {},
      ai_generated: false,
      generation_metadata: {},
      comments: [],
      version_history: [],
      media_files: []
    });
  };

  const handleExportVideo = async () => {
    setShowExportModal(false);
    toast.info('Video export started. This may take several minutes...');
    
    try {
      // Simulate video export process
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success('Video exported successfully!');
    } catch (error) {
      toast.error('Failed to export video');
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [estimatedFileSize, setEstimatedFileSize] = useState(0);

  useEffect(() => {
    const totalDuration = (slideableSections.length * videoSettings.duration_per_slide) + 
                         ((slideableSections.length - 1) * videoSettings.transition_duration);
    setEstimatedDuration(totalDuration);
    
    // Rough file size estimation (MB)
    const resolutionMultiplier = {
      '720p': 1,
      '1080p': 2.25,
      '4k': 16
    };
    const qualityMultiplier = {
      'draft': 0.5,
      'standard': 1,
      'high': 2
    };
    
    const baseSize = totalDuration * 0.5; // 0.5MB per second base
    const finalSize = baseSize * 
                      resolutionMultiplier[videoSettings.resolution] * 
                      qualityMultiplier[videoSettings.export_quality] *
                      (videoSettings.fps / 30); // FPS adjustment
    
    setEstimatedFileSize(Math.round(finalSize));
  }, [videoSettings, slideableSections.length]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Slide Timeline */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Slides Timeline</h3>
          <button
            onClick={addNewSection}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Add New Slide"
          >
            <FiPlus size={16} />
          </button>
        </div>
        
        <div className="space-y-2">
          {slideableSections.map((section, index) => (
            <div
              key={section.id}
              onClick={() => setCurrentSectionIndex(index)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                index === currentSectionIndex
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{index + 1}</span>
                {section.animation_config?.animations && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    Animated
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 truncate">{section.title}</p>
              
              {/* Animation indicator */}
              {section.animation_config?.animations && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <span>🎬</span>
                  <span>{section.animation_config.animations[0]?.duration}ms</span>
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
                  onClick={prevSection}
                  disabled={currentSectionIndex === 0}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <FiSkipForward size={16} className="transform rotate-180" />
                </button>
                <span className="text-sm text-gray-600 px-3">
                  {currentSectionIndex + 1} / {slideableSections.length}
                </span>
                <button
                  onClick={nextSection}
                  disabled={currentSectionIndex === slideableSections.length - 1}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <FiSkipForward size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveCurrentSection}
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

            {currentSection && (
              <div className="space-y-4">
                {/* Section Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{currentSection.title}</h4>
                  <p className="text-sm text-gray-600">{currentSection.section_type.replace('_', ' ')}</p>
                </div>

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
                      Auto-advance after: {videoSettings.duration_per_slide}s
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      value={videoSettings.duration_per_slide}
                      onChange={(e) => setVideoSettings(prev => ({ 
                        ...prev, 
                        duration_per_slide: parseInt(e.target.value) 
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Section Content Editor */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Section Content</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={currentSection.title}
                      onChange={(e) => onSectionUpdate(currentSection.id, { title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Slide title..."
                    />
                    <textarea
                      value={currentSection.content}
                      onChange={(e) => onSectionUpdate(currentSection.id, { content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Slide content..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Slide Navigation */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {slideableSections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => setCurrentSectionIndex(index)}
                className={`flex-shrink-0 w-32 h-20 rounded-lg border-2 transition-all ${
                  index === currentSectionIndex
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

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={videoSettings.include_narration}
                  onChange={(e) => setVideoSettings(prev => ({ ...prev, include_narration: e.target.checked }))}
                  className="w-4 h-4 text-blue-600"
                />
                <label className="text-sm text-gray-700">Include AI narration</label>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Export Preview</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <div className="font-semibold">{formatDuration(estimatedDuration)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">File Size:</span>
                    <div className="font-semibold">~{estimatedFileSize}MB</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Slides:</span>
                    <div className="font-semibold">{slideableSections.length}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Resolution:</span>
                    <div className="font-semibold">{videoSettings.resolution}</div>
                  </div>
                </div>
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
                Export Video ({formatDuration(estimatedDuration)})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSlideEditor;