import React from 'react';
import { AnalysisJob } from '../../types/RNASeq';
import { FiClock, FiCheckCircle, FiXCircle, FiPlay, FiPause, FiAlertTriangle } from 'react-icons/fi';

interface ProgressIndicatorProps {
  job: AnalysisJob;
  showDetails?: boolean;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ job, showDetails = true }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <FiCheckCircle className="text-green-600" size={20} />;
      case 'failed': return <FiXCircle className="text-red-600" size={20} />;
      case 'processing': return <FiPlay className="text-blue-600 animate-pulse" size={20} />;
      case 'pending': return <FiClock className="text-gray-600" size={20} />;
      case 'waiting_for_input': return <FiAlertTriangle className="text-yellow-600" size={20} />;
      default: return <FiPause className="text-gray-600" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'waiting_for_input': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getAnalysisTypeDisplay = (type: string) => {
    return type.replace('_', ' ').toUpperCase();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon(job.status)}
          <span className="font-medium text-gray-900">
            {getAnalysisTypeDisplay(job.analysis_type)}
          </span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
          {job.status.replace('_', ' ')}
        </span>
      </div>

      {/* Current Step */}
      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-1">{job.current_step_name}</p>
        
        {job.status === 'processing' && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">
                Step {job.current_step}/{job.total_steps}
              </span>
              <span className="text-xs text-gray-500">{job.progress_percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${job.progress_percentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Waiting for Input */}
      {job.status === 'waiting_for_input' && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            Analysis is waiting for your input to continue.
          </p>
        </div>
      )}

      {/* Metrics Grid */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {job.num_samples > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Samples:</span>
              <span className="font-medium">{job.num_samples}</span>
            </div>
          )}
          {job.total_reads > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Reads:</span>
              <span className="font-medium">{(job.total_reads / 1000000).toFixed(1)}M</span>
            </div>
          )}
          {job.mapped_reads > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Mapped:</span>
              <span className="font-medium">{(job.mapped_reads / 1000000).toFixed(1)}M</span>
            </div>
          )}
          {job.alignment_rate > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Aligned:</span>
              <span className="font-medium">{(job.alignment_rate * 100).toFixed(1)}%</span>
            </div>
          )}
          {job.genes_quantified > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Genes:</span>
              <span className="font-medium">{job.genes_quantified.toLocaleString()}</span>
            </div>
          )}
          {job.cells_detected > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Cells:</span>
              <span className="font-medium">{job.cells_detected.toLocaleString()}</span>
            </div>
          )}
          {job.cell_clusters > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Clusters:</span>
              <span className="font-medium">{job.cell_clusters}</span>
            </div>
          )}
          {job.significant_genes > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">DEGs:</span>
              <span className="font-medium">{job.significant_genes.toLocaleString()}</span>
            </div>
          )}
          {job.enriched_pathways > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Pathways:</span>
              <span className="font-medium">{job.enriched_pathways}</span>
            </div>
          )}
          {job.duration_minutes > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Duration:</span>
              <span className="font-medium">{formatDuration(job.duration_minutes)}</span>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {job.error_message && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">{job.error_message}</p>
        </div>
      )}

      {/* Pipeline Steps */}
      {job.pipeline_steps && job.pipeline_steps.length > 0 && (
        <div className="mt-3">
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              Pipeline Steps ({job.pipeline_steps.length})
            </summary>
            <div className="mt-2 space-y-1">
              {job.pipeline_steps.map((step) => (
                <div key={step.step_number} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${
                    step.status === 'completed' ? 'bg-green-500' :
                    step.status === 'running' ? 'bg-blue-500' :
                    step.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                  }`}></span>
                  <span className="text-gray-600">{step.step_name}</span>
                  {step.duration_seconds > 0 && (
                    <span className="text-gray-400">({Math.round(step.duration_seconds / 60)} min)</span>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;