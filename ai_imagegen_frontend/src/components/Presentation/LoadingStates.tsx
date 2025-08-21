import React from 'react';
import { FiLoader, FiFileText, FiMonitor } from 'react-icons/fi';

export const PresentationSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="grid grid-cols-4 gap-4">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

export const SectionSkeleton: React.FC = () => (
  <div className="animate-pulse bg-white rounded-xl border border-gray-200 p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-5 h-5 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </div>
    <div className="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
  </div>
);

export const GeneratingLoader: React.FC<{ type: 'document' | 'slide'; stage?: string }> = ({ 
  type, 
  stage = 'Generating content...' 
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 text-center">
      <div className="relative mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          {type === 'document' ? (
            <FiFileText className="w-8 h-8 text-blue-600" />
          ) : (
            <FiMonitor className="w-8 h-8 text-blue-600" />
          )}
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-spin border-t-blue-600"></div>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Creating {type === 'document' ? 'Document' : 'Presentation'}
      </h3>
      
      <p className="text-gray-600 mb-4">{stage}</p>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
      </div>
      
      <p className="text-xs text-gray-500 mt-3">
        This may take a few moments. Please don't close this window.
      </p>
    </div>
  </div>
);