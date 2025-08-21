import React, { useState, useEffect, useRef } from 'react';
import { 
  FiChevronLeft, FiChevronRight, FiMaximize2, FiMinimize2,
  FiPlay, FiPause, FiSkipBack, FiSkipForward, FiSettings,
  FiShare2, FiBookmark, FiMessageCircle
} from 'react-icons/fi';
import { Presentation, ContentSection } from '../../types/Presentation';

interface MobilePresentationViewerProps {
  presentation: Presentation;
  sections: ContentSection[];
  startIndex?: number;
  autoPlay?: boolean;
  onClose?: () => void;
}

const MobilePresentationViewer: React.FC<MobilePresentationViewerProps> = ({
  presentation,
  sections,
  startIndex = 0,
  autoPlay = false,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout>();
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const currentSection = sections[currentIndex];

  useEffect(() => {
    if (isPlaying && presentation.presentation_type === 'slide') {
      autoPlayRef.current = setTimeout(() => {
        if (currentIndex < sections.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 5000 / playbackSpeed);
    }

    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
      }
    };
  }, [currentIndex, isPlaying, playbackSpeed, sections.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          previousSection();
          break;
        case 'ArrowRight':
          nextSection();
          break;
        case ' ':
          e.preventDefault();
          togglePlayback();
          break;
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          } else if (onClose) {
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const nextSection = () => {
    if (currentIndex < sections.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const previousSection = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const togglePlayback = () => {
    setIsPlaying(prev => !prev);
  };

  const enterFullscreen = () => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isFullscreen) {
        setShowControls(false);
      }
    }, 3000);
  };

  const renderSectionContent = (section: ContentSection) => {
    const baseClasses = "w-full h-full flex items-center justify-center p-4";
    
    switch (section.section_type) {
      case 'title_slide':
      case 'heading':
        return (
          <div className={`${baseClasses} text-center`}>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                {section.title}
              </h1>
              {section.content && (
                <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                  {section.content}
                </p>
              )}
            </div>
          </div>
        );
        
      case 'content_slide':
      case 'paragraph':
        return (
          <div className={`${baseClasses} flex-col text-left max-w-4xl mx-auto`}>
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-6">
              {section.title}
            </h2>
            <div 
              className="text-base md:text-lg text-gray-700 prose max-w-none"
              dangerouslySetInnerHTML={{ __html: section.rich_content || section.content }}
            />
          </div>
        );
        
      case 'image_slide':
      case 'image':
        return (
          <div className={`${baseClasses} flex-col`}>
            {section.title && (
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
                {section.title}
              </h2>
            )}
            {section.image_url && (
              <img
                src={section.image_url}
                alt={section.title}
                className="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
              />
            )}
            {section.content && (
              <p className="text-gray-600 mt-4 text-center max-w-2xl">
                {section.content}
              </p>
            )}
          </div>
        );
        
      default:
        return (
          <div className={`${baseClasses} flex-col`}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
            <p className="text-gray-700">{section.content}</p>
          </div>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isFullscreen ? 'h-screen' : 'h-96 md:h-screen'} bg-white overflow-hidden`}
      onClick={showControlsTemporarily}
      onMouseMove={showControlsTemporarily}
    >
      {/* Main Content */}
      <div className="w-full h-full">
        {currentSection && renderSectionContent(currentSection)}
      </div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
        <div 
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / sections.length) * 100}%` }}
        />
      </div>

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2">
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
                >
                  <FiChevronLeft size={20} />
                </button>
              )}
              <span className="text-white bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {sections.length}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowComments(!showComments)}
                className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
              >
                <FiMessageCircle size={16} />
              </button>
              <button className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70">
                <FiShare2 size={16} />
              </button>
              <button
                onClick={isFullscreen ? exitFullscreen : enterFullscreen}
                className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
              >
                {isFullscreen ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
              </button>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={previousSection}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 disabled:opacity-30 pointer-events-auto"
          >
            <FiChevronLeft size={24} />
          </button>
          
          <button
            onClick={nextSection}
            disabled={currentIndex === sections.length - 1}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 disabled:opacity-30 pointer-events-auto"
          >
            <FiChevronRight size={24} />
          </button>

          {/* Bottom Controls */}
          {presentation.presentation_type === 'slide' && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 pointer-events-auto">
              <button
                onClick={() => setCurrentIndex(0)}
                className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
              >
                <FiSkipBack size={16} />
              </button>
              
              <button
                onClick={togglePlayback}
                className="p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
              >
                {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
              </button>
              
              <button
                onClick={() => setCurrentIndex(sections.length - 1)}
                className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
              >
                <FiSkipForward size={16} />
              </button>
              
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="bg-black bg-opacity-50 text-white text-sm rounded px-2 py-1"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Comments Panel */}
      {showComments && (
        <div className="absolute right-0 top-0 w-80 h-full bg-white shadow-lg border-l border-gray-200 pointer-events-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Comments</h3>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto h-full">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-sm">No comments yet</p>
            ) : (
              comments.map((comment, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-sm">{comment.author}</div>
                  <div className="text-sm text-gray-600 mt-1">{comment.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Section Thumbnails (Mobile) */}
      <div className="md:hidden absolute bottom-4 left-4 right-4 pointer-events-auto">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-16 h-12 rounded border-2 transition-colors ${
                index === currentIndex
                  ? 'border-blue-500 bg-blue-100'
                  : 'border-gray-300 bg-gray-100'
              }`}
            >
              <div className="w-full h-full flex items-center justify-center text-xs">
                {index + 1}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobilePresentationViewer;