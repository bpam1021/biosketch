import React, { useState } from 'react';
import { FiPlay, FiPause, FiSettings, FiZap } from 'react-icons/fi';
import { AnimationConfig } from '../../types/Presentation';

interface SlideAnimationPanelProps {
  animations: AnimationConfig[];
  onAnimationsChange: (animations: AnimationConfig[]) => void;
  onPreview: () => void;
}

const SlideAnimationPanel: React.FC<SlideAnimationPanelProps> = ({
  animations,
  onAnimationsChange,
  onPreview
}) => {
  const [selectedElement, setSelectedElement] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);

  const animationTypes = [
    { value: 'fadeIn', label: 'Fade In', description: 'Gradually appear' },
    { value: 'slideIn', label: 'Slide In', description: 'Slide from edge' },
    { value: 'zoomIn', label: 'Zoom In', description: 'Scale up from center' },
    { value: 'bounce', label: 'Bounce', description: 'Bouncy entrance' }
  ];

  const easingOptions = [
    { value: 'ease', label: 'Ease' },
    { value: 'ease-in', label: 'Ease In' },
    { value: 'ease-out', label: 'Ease Out' },
    { value: 'ease-in-out', label: 'Ease In Out' },
    { value: 'linear', label: 'Linear' }
  ];

  const addAnimation = () => {
    if (!selectedElement) return;

    const newAnimation: AnimationConfig = {
      element_id: selectedElement,
      type: 'fadeIn',
      duration: 1000,
      delay: 0,
      easing: 'ease'
    };

    onAnimationsChange([...animations, newAnimation]);
  };

  const updateAnimation = (index: number, updates: Partial<AnimationConfig>) => {
    const updated = animations.map((anim, i) => 
      i === index ? { ...anim, ...updates } : anim
    );
    onAnimationsChange(updated);
  };

  const removeAnimation = (index: number) => {
    const filtered = animations.filter((_, i) => i !== index);
    onAnimationsChange(filtered);
  };

  const handlePreview = () => {
    setIsPlaying(!isPlaying);
    onPreview();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FiZap className="text-yellow-500" />
          Slide Animations
        </h3>
        <button
          onClick={handlePreview}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
          {isPlaying ? 'Stop' : 'Preview'}
        </button>
      </div>

      {/* Add Animation */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Add New Animation</h4>
        <div className="flex gap-3">
          <select
            value={selectedElement}
            onChange={(e) => setSelectedElement(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Element</option>
            <option value="title">Title</option>
            <option value="content">Content</option>
            <option value="image">Image</option>
            <option value="diagram">Diagram</option>
          </select>
          <button
            onClick={addAnimation}
            disabled={!selectedElement}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Animation
          </button>
        </div>
      </div>

      {/* Animation List */}
      <div className="space-y-4">
        {animations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FiSettings className="mx-auto text-3xl mb-2 opacity-50" />
            <p>No animations added yet</p>
            <p className="text-sm">Select an element above to get started</p>
          </div>
        ) : (
          animations.map((animation, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900 capitalize">
                  {animation.element_id} Animation
                </h5>
                <button
                  onClick={() => removeAnimation(index)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Animation Type
                  </label>
                  <select
                    value={animation.type}
                    onChange={(e) => updateAnimation(index, { type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {animationTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Easing
                  </label>
                  <select
                    value={animation.easing}
                    onChange={(e) => updateAnimation(index, { easing: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {easingOptions.map((easing) => (
                      <option key={easing.value} value={easing.value}>
                        {easing.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (ms)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    step="100"
                    value={animation.duration}
                    onChange={(e) => updateAnimation(index, { duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delay (ms)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="100"
                    value={animation.delay}
                    onChange={(e) => updateAnimation(index, { delay: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Animation Preview */}
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-600">
                  Preview: {animationTypes.find(t => t.value === animation.type)?.description} 
                  after {animation.delay}ms delay, lasting {animation.duration}ms
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Timeline View */}
      {animations.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Animation Timeline</h4>
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full"></div>
            {animations.map((animation, index) => {
              const startPercent = (animation.delay / 10000) * 100;
              const durationPercent = (animation.duration / 10000) * 100;
              
              return (
                <div
                  key={index}
                  className="absolute h-2 bg-blue-500 rounded-full"
                  style={{
                    left: `${startPercent}%`,
                    width: `${durationPercent}%`,
                    top: 0
                  }}
                  title={`${animation.element_id}: ${animation.type}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0s</span>
            <span>5s</span>
            <span>10s</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlideAnimationPanel;