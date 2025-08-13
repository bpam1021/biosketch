import React, { useState, useCallback } from 'react';
import { FiUpload, FiX, FiImage, FiCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImagesSelected: (images: { file: File; preview: string }[]) => void;
  maxImages?: number;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ 
  isOpen, 
  onClose, 
  onImagesSelected,
  maxImages = 10 
}) => {
  const [selectedImages, setSelectedImages] = useState<{ file: File; preview: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newImages: { file: File; preview: string }[] = [];
    const remainingSlots = maxImages - selectedImages.length;
    
    Array.from(files).slice(0, remainingSlots).forEach(file => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newImages.push({ file, preview });
      }
    });
    
    if (newImages.length !== files.length) {
      toast.warning(`Only ${newImages.length} images were added (limit: ${maxImages})`);
    }
    
    setSelectedImages(prev => [...prev, ...newImages]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [selectedImages.length, maxImages]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeImage = (index: number) => {
    const imageToRemove = selectedImages[index];
    URL.revokeObjectURL(imageToRemove.preview);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    onImagesSelected(selectedImages);
    onClose();
    setSelectedImages([]);
  };

  const handleCancel = () => {
    // Clean up object URLs
    selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
    setSelectedImages([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FiImage className="text-blue-600" />
            Upload Images for Presentation
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <FiUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-600">
                PNG, JPG, GIF up to 10MB each • Max {maxImages} images
              </p>
            </label>
          </div>

          {/* Selected Images Preview */}
          {selectedImages.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Selected Images ({selectedImages.length}/{maxImages})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-96 overflow-y-auto">
                {selectedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.preview}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiX size={12} />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
                      {(image.file.size / 1024 / 1024).toFixed(1)}MB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
            <div className="text-sm text-gray-600">
              {selectedImages.length > 0 && (
                <span>
                  {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected • 
                  Total size: {(selectedImages.reduce((sum, img) => sum + img.file.size, 0) / 1024 / 1024).toFixed(1)}MB
                </span>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedImages.length === 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <FiCheck size={16} />
                Add {selectedImages.length} Image{selectedImages.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;