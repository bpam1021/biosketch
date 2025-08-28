import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiMonitor, FiChevronRight, FiBook, FiPresentation } from 'react-icons/fi';

interface PresentationTypeProps {
  onClose?: () => void;
}

const PresentationTypeSelector: React.FC<PresentationTypeProps> = ({ onClose }) => {
  const [selectedType, setSelectedType] = useState<'document' | 'slide' | null>(null);
  const navigate = useNavigate();

  const handleTypeSelect = (type: 'document' | 'slide') => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (selectedType === 'document') {
      navigate('/document/new');
    } else if (selectedType === 'slide') {
      navigate('/slides/new');
    }
  };

  const presentationTypes = [
    {
      id: 'document',
      name: 'Document',
      description: 'Create professional documents like Microsoft Word',
      features: [
        'Chapter and section structure',
        'Professional formatting',
        'Table of contents',
        'Rich text editing',
        'Academic templates'
      ],
      icon: FiFileText,
      color: 'blue',
      preview: '/api/placeholder/400/300'
    },
    {
      id: 'slide',
      name: 'Slide Presentation',
      description: 'Create slide presentations like Microsoft PowerPoint',
      features: [
        'Professional themes',
        'Slide templates',
        'Zone-based layouts',
        'Transitions & animations',
        'Media integration'
      ],
      icon: FiMonitor,
      color: 'purple',
      preview: '/api/placeholder/400/300'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiBook className="text-blue-600" />
                Choose Presentation Type
              </h2>
              <p className="text-gray-600 mt-1">
                Select the type of presentation you want to create
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {presentationTypes.map((type) => {
              const IconComponent = type.icon;
              const isSelected = selectedType === type.id;
              
              return (
                <div
                  key={type.id}
                  onClick={() => handleTypeSelect(type.id as 'document' | 'slide')}
                  className={`
                    relative cursor-pointer rounded-xl border-2 transition-all duration-200 p-6
                    ${isSelected 
                      ? type.color === 'blue' 
                        ? 'border-blue-500 bg-blue-50 shadow-lg' 
                        : 'border-purple-500 bg-purple-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }
                  `}
                >
                  {isSelected && (
                    <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center
                      ${type.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg
                      ${type.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      <IconComponent className={`w-8 h-8
                        ${type.color === 'blue' ? 'text-blue-600' : 'text-purple-600'}`} />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {type.name}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {type.description}
                      </p>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-800">Key Features:</h4>
                        <ul className="space-y-1">
                          {type.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                              <div className={`w-1.5 h-1.5 rounded-full
                                ${type.color === 'blue' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center">
                      {type.id === 'document' ? (
                        <div className="w-full h-full bg-white border-2 border-gray-200 p-4 text-xs">
                          <div className="h-2 bg-gray-800 mb-2 w-3/4" />
                          <div className="h-1 bg-gray-400 mb-1 w-full" />
                          <div className="h-1 bg-gray-400 mb-1 w-5/6" />
                          <div className="h-1 bg-gray-400 mb-2 w-4/5" />
                          <div className="h-1.5 bg-gray-600 mb-1 w-2/3" />
                          <div className="h-1 bg-gray-400 mb-1 w-full" />
                          <div className="h-1 bg-gray-400 w-3/4" />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 p-4 text-white text-xs">
                          <div className="h-3 bg-white bg-opacity-90 mb-3 w-3/4 rounded" />
                          <div className="flex gap-2 mb-2">
                            <div className="w-12 h-8 bg-white bg-opacity-70 rounded" />
                            <div className="flex-1">
                              <div className="h-1 bg-white bg-opacity-70 mb-1 rounded" />
                              <div className="h-1 bg-white bg-opacity-70 rounded" />
                            </div>
                          </div>
                          <div className="h-1 bg-white bg-opacity-50 mb-1 w-full rounded" />
                          <div className="h-1 bg-white bg-opacity-50 w-4/5 rounded" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedType && (
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiPresentation className="w-4 h-4" />
                {selectedType === 'document' ? 'Document' : 'Slide Presentation'} selected
              </div>
              <button
                onClick={handleContinue}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors
                  ${selectedType === 'document'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }
                `}
              >
                Continue
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresentationTypeSelector;