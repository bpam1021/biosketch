import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { FiVideo, FiSettings, FiDownload, FiX, FiPlay } from 'react-icons/fi';
import { VideoExportSettings } from '../../types/Presentation';

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
    duration_per_slide: 5,
    transition_type: 'fade',
    transition_duration: 1,
    narration_enabled: false,
    resolution: '1080p'
  });

  const [previewMode, setPreviewMode] = useState(false);

  const handleExport = () => {
    onExport(settings);
    onClose();
  };

  const totalDuration = slideCount * settings.duration_per_slide + 
                       (slideCount - 1) * settings.transition_duration;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <FiVideo className="text-2xl text-purple-600" />
              <div>
                <Dialog.Title className="text-xl font-semibold text-gray-900">
                  Export to Video
                </Dialog.Title>
                <p className="text-sm text-gray-600">
                  Convert your presentation to MP4 video
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Video Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration per Slide (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.duration_per_slide}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    duration_per_slide: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transition Type
                </label>
                <select
                  value={settings.transition_type}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    transition_type: e.target.value as any
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="zoom">Zoom</option>
                  <option value="none">None</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transition Duration (seconds)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={settings.transition_duration}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    transition_duration: parseFloat(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Quality
                </label>
                <select
                  value={settings.resolution}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    resolution: e.target.value as any
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="720p">720p (HD)</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="4k">4K (Ultra HD)</option>
                </select>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <FiSettings size={18} />
                Advanced Options
              </h3>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="narration"
                  checked={settings.narration_enabled}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    narration_enabled: e.target.checked
                  }))}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="narration" className="text-sm text-gray-700">
                  Enable AI narration (text-to-speech)
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Video Preview</h4>
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm"
                >
                  <FiPlay size={16} />
                  {previewMode ? 'Stop Preview' : 'Preview'}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Slides:</span>
                  <span className="ml-2 font-medium">{slideCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Video Duration:</span>
                  <span className="ml-2 font-medium">{formatDuration(totalDuration)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Resolution:</span>
                  <span className="ml-2 font-medium">{settings.resolution}</span>
                </div>
                <div>
                  <span className="text-gray-600">File Size (est.):</span>
                  <span className="ml-2 font-medium">
                    {Math.round(totalDuration * (settings.resolution === '4k' ? 8 : settings.resolution === '1080p' ? 4 : 2))} MB
                  </span>
                </div>
              </div>

              {previewMode && (
                <div className="mt-4 bg-white rounded border p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    Preview: Slide transitions with {settings.transition_type} effect
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <div className="text-sm text-gray-600">
              Export will take approximately {Math.ceil(totalDuration / 10)} minutes
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <FiDownload size={16} />
                Export Video
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default VideoExportModal;