import React, { useState } from 'react';
import { FiDownload, FiSettings, FiVolume2, FiMusic, FiClock } from 'react-icons/fi';

interface VideoExportSettings {
  resolution: '720p' | '1080p' | '4k';
  fps: 24 | 30 | 60;
  duration_per_slide: number;
  include_narration: boolean;
  background_music: boolean;
  transition_duration: number;
  voice_type?: 'male' | 'female' | 'neutral';
  music_style?: 'none' | 'corporate' | 'inspiring' | 'calm' | 'energetic';
  export_quality: 'draft' | 'standard' | 'high';
}

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: VideoExportSettings) => void;
  slideCount: number;
}

const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  slideCount
}) => {
  const [settings, setSettings] = useState<VideoExportSettings>({
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

  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [estimatedFileSize, setEstimatedFileSize] = useState(0);

  React.useEffect(() => {
    const totalDuration = (slideCount * settings.duration_per_slide) + 
                         ((slideCount - 1) * settings.transition_duration);
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
                      resolutionMultiplier[settings.resolution] * 
                      qualityMultiplier[settings.export_quality] *
                      (settings.fps / 30); // FPS adjustment
    
    setEstimatedFileSize(Math.round(finalSize));
  }, [settings, slideCount]);

  const handleExport = () => {
    onExport(settings);
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FiDownload className="text-purple-600" />
            Export Video Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Video Quality Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FiSettings size={16} />
              Video Quality
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
                <select
                  value={settings.resolution}
                  onChange={(e) => setSettings(prev => ({ ...prev, resolution: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="720p">720p (HD)</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="4k">4K (Ultra HD)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frame Rate</label>
                <select
                  value={settings.fps}
                  onChange={(e) => setSettings(prev => ({ ...prev, fps: parseInt(e.target.value) as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={24}>24 FPS (Cinema)</option>
                  <option value={30}>30 FPS (Standard)</option>
                  <option value={60}>60 FPS (Smooth)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Export Quality</label>
                <select
                  value={settings.export_quality}
                  onChange={(e) => setSettings(prev => ({ ...prev, export_quality: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft (Fast)</option>
                  <option value="standard">Standard</option>
                  <option value="high">High Quality</option>
                </select>
              </div>
            </div>
          </div>

          {/* Timing Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FiClock size={16} />
              Timing & Transitions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration per Slide: {settings.duration_per_slide}s
                </label>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={settings.duration_per_slide}
                  onChange={(e) => setSettings(prev => ({ ...prev, duration_per_slide: parseInt(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transition Duration: {settings.transition_duration}s
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={settings.transition_duration}
                  onChange={(e) => setSettings(prev => ({ ...prev, transition_duration: parseFloat(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Audio Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FiVolume2 size={16} />
              Audio Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.include_narration}
                  onChange={(e) => setSettings(prev => ({ ...prev, include_narration: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Include AI Narration</span>
                  <p className="text-sm text-gray-600">Generate spoken audio from slide descriptions</p>
                </div>
              </div>

              {settings.include_narration && (
                <div className="ml-7">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Voice Type</label>
                  <select
                    value={settings.voice_type}
                    onChange={(e) => setSettings(prev => ({ ...prev, voice_type: e.target.value as any }))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="neutral">Neutral</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.background_music}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    background_music: e.target.checked,
                    music_style: e.target.checked ? 'corporate' : 'none'
                  }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900 flex items-center gap-1">
                    <FiMusic size={14} />
                    Background Music
                  </span>
                  <p className="text-sm text-gray-600">Add subtle background music</p>
                </div>
              </div>

              {settings.background_music && (
                <div className="ml-7">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Music Style</label>
                  <select
                    value={settings.music_style}
                    onChange={(e) => setSettings(prev => ({ ...prev, music_style: e.target.value as any }))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="corporate">Corporate</option>
                    <option value="inspiring">Inspiring</option>
                    <option value="calm">Calm</option>
                    <option value="energetic">Energetic</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Preview Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Export Preview</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                <div className="font-semibold">{slideCount}</div>
              </div>
              <div>
                <span className="text-gray-600">Resolution:</span>
                <div className="font-semibold">{settings.resolution}</div>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FiDownload size={16} />
              Export Video ({formatDuration(estimatedDuration)})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoExportModal;