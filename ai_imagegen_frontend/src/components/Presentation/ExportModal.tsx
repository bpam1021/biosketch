import React, { useState } from 'react';
import { FiDownload, FiSettings, FiFile, FiFilm, FiImage } from 'react-icons/fi';
import { Presentation, ExportRequest } from '../../types/Presentation';

interface ExportModalProps {
  presentation: Presentation;
  selectedSections: string[];
  onExport: (data: ExportRequest) => void;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({
  presentation,
  selectedSections,
  onExport,
  onClose
}) => {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'pptx' | 'html' | 'mp4'>('pdf');
  const [exportSettings, setExportSettings] = useState({
    resolution: '1080p' as '720p' | '1080p' | '4k',
    fps: 30 as 24 | 30 | 60,
    duration_per_slide: 5,
    include_narration: false,
    background_music: false,
    transition_duration: 1,
    voice_type: 'neutral' as 'male' | 'female' | 'neutral',
    music_style: 'none' as 'none' | 'corporate' | 'inspiring' | 'calm' | 'energetic',
    export_quality: 'standard' as 'draft' | 'standard' | 'high'
  });

  const formatOptions = [
    {
      format: 'pdf' as const,
      icon: FiFile,
      label: 'PDF Document',
      description: 'Best for sharing and printing',
      supportedTypes: ['document', 'slide']
    },
    {
      format: 'docx' as const,
      icon: FiFile,
      label: 'Word Document',
      description: 'Editable Microsoft Word format',
      supportedTypes: ['document']
    },
    {
      format: 'pptx' as const,
      icon: FiFile,
      label: 'PowerPoint',
      description: 'Editable PowerPoint presentation',
      supportedTypes: ['slide']
    },
    {
      format: 'html' as const,
      icon: FiImage,
      label: 'HTML Page',
      description: 'Web-friendly format',
      supportedTypes: ['document', 'slide']
    },
    {
      format: 'mp4' as const,
      icon: FiFilm,
      label: 'Video (MP4)',
      description: 'Animated video with narration',
      supportedTypes: ['slide']
    }
  ];

  const availableFormats = formatOptions.filter(option =>
    option.supportedTypes.includes(presentation.presentation_type)
  );

  const estimatedDuration = selectedSections.length > 0 
    ? selectedSections.length * exportSettings.duration_per_slide
    : presentation.sections.length * exportSettings.duration_per_slide;

  const estimatedFileSize = () => {
    const baseSize = selectedSections.length || presentation.sections.length;
    
    switch (exportFormat) {
      case 'pdf': return `${Math.round(baseSize * 0.5)}MB`;
      case 'docx': return `${Math.round(baseSize * 0.3)}MB`;
      case 'pptx': return `${Math.round(baseSize * 1.2)}MB`;
      case 'html': return `${Math.round(baseSize * 0.1)}MB`;
      case 'mp4': 
        const videoDuration = estimatedDuration;
        const resolutionMultiplier = exportSettings.resolution === '4k' ? 4 : exportSettings.resolution === '1080p' ? 2 : 1;
        return `${Math.round(videoDuration * 2 * resolutionMultiplier)}MB`;
      default: return '0MB';
    }
  };

  const handleExport = () => {
    const exportData: ExportRequest = {
      export_format: exportFormat,
      selected_sections: selectedSections.length > 0 ? selectedSections : undefined,
      export_settings: exportFormat === 'mp4' ? exportSettings : undefined
    };
    
    onExport(exportData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiDownload size={20} />
              Export Presentation
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Choose Export Format</h3>
              <div className="grid grid-cols-1 gap-3">
                {availableFormats.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <label
                      key={option.format}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        exportFormat === option.format
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={option.format}
                        checked={exportFormat === option.format}
                        onChange={(e) => setExportFormat(e.target.value as any)}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-4 w-full">
                        <div className={`p-2 rounded-lg ${
                          exportFormat === option.format ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <IconComponent size={20} className={
                            exportFormat === option.format ? 'text-blue-600' : 'text-gray-600'
                          } />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Video Settings */}
            {exportFormat === 'mp4' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <FiSettings size={16} />
                  Video Settings
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
                    <select
                      value={exportSettings.resolution}
                      onChange={(e) => setExportSettings(prev => ({ 
                        ...prev, 
                        resolution: e.target.value as any 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="720p">720p (HD)</option>
                      <option value="1080p">1080p (Full HD)</option>
                      <option value="4k">4K (Ultra HD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frame Rate</label>
                    <select
                      value={exportSettings.fps}
                      onChange={(e) => setExportSettings(prev => ({ 
                        ...prev, 
                        fps: parseInt(e.target.value) as any 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={24}>24 FPS</option>
                      <option value={30}>30 FPS</option>
                      <option value={60}>60 FPS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration per Slide: {exportSettings.duration_per_slide}s
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      value={exportSettings.duration_per_slide}
                      onChange={(e) => setExportSettings(prev => ({ 
                        ...prev, 
                        duration_per_slide: parseInt(e.target.value) 
                      }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
                    <select
                      value={exportSettings.export_quality}
                      onChange={(e) => setExportSettings(prev => ({ 
                        ...prev, 
                        export_quality: e.target.value as any 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="draft">Draft (Faster)</option>
                      <option value="standard">Standard</option>
                      <option value="high">High Quality</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="narration"
                      checked={exportSettings.include_narration}
                      onChange={(e) => setExportSettings(prev => ({ 
                        ...prev, 
                        include_narration: e.target.checked 
                      }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="narration" className="text-sm text-gray-700">
                      Include AI narration (+1 credit)
                    </label>
                  </div>

                  {exportSettings.include_narration && (
                    <div className="ml-7">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Voice Type</label>
                      <select
                        value={exportSettings.voice_type}
                        onChange={(e) => setExportSettings(prev => ({ 
                          ...prev, 
                          voice_type: e.target.value as any 
                        }))}
                        className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      id="music"
                      checked={exportSettings.background_music}
                      onChange={(e) => setExportSettings(prev => ({ 
                        ...prev, 
                        background_music: e.target.checked 
                      }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="music" className="text-sm text-gray-700">
                      Add background music
                    </label>
                  </div>

                  {exportSettings.background_music && (
                    <div className="ml-7">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Music Style</label>
                      <select
                        value={exportSettings.music_style}
                        onChange={(e) => setExportSettings(prev => ({ 
                          ...prev, 
                          music_style: e.target.value as any 
                        }))}
                        className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="none">None</option>
                        <option value="corporate">Corporate</option>
                        <option value="inspiring">Inspiring</option>
                        <option value="calm">Calm</option>
                        <option value="energetic">Energetic</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Export Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Export Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Format:</span>
                  <div className="font-medium text-blue-900">{exportFormat.toUpperCase()}</div>
                </div>
                <div>
                  <span className="text-blue-700">File Size:</span>
                  <div className="font-medium text-blue-900">~{estimatedFileSize()}</div>
                </div>
                <div>
                  <span className="text-blue-700">Sections:</span>
                  <div className="font-medium text-blue-900">
                    {selectedSections.length > 0 
                      ? `${selectedSections.length} selected` 
                      : `All ${presentation.sections.length}`
                    }
                  </div>
                </div>
                {exportFormat === 'mp4' && (
                  <div>
                    <span className="text-blue-700">Duration:</span>
                    <div className="font-medium text-blue-900">
                      {Math.floor(estimatedDuration / 60)}:{(estimatedDuration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium"
              >
                Export {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ExportModal };