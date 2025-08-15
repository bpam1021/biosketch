import React from 'react';
import { AnalysisJob } from '../../types/RNASeq';
import { FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiPlay, FiAlertTriangle } from 'react-icons/fi';

interface JobProgressCardProps {
  job: AnalysisJob;
  onUserInput?: (jobId: string, input: string, continueAnalysis: boolean) => void;
}

const JobProgressCard: React.FC<JobProgressCardProps> = ({ job, onUserInput }) => {
  const [userInput, setUserInput] = React.useState('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <FiCheckCircle className="text-green-600" />;
      case 'failed': return <FiXCircle className="text-red-600" />;
      case 'waiting_for_input': return <FiAlertTriangle className="text-yellow-600" />;
      case 'processing': return <FiPlay className="text-blue-600 animate-pulse" />;
      default: return <FiClock className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200 text-green-800';
      case 'failed': return 'bg-red-50 border-red-200 text-red-800';
      case 'waiting_for_input': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'processing': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getAnalysisTypeDisplay = (type: string) => {
    return type.replace('_', ' ').toUpperCase();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon(job.status)}
          <h3 className="font-semibold text-gray-900">
            {getAnalysisTypeDisplay(job.analysis_type)}
          </h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
          {job.status.replace('_', ' ')}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-3">{job.current_step_name}</p>

      {/* Progress Bar */}
      {job.status === 'processing' && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">Step {job.current_step}/{job.total_steps}</span>
            <span className="text-xs text-gray-500">{job.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${job.progress_percentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* User Input Required */}
      {job.status === 'waiting_for_input' && onUserInput && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800 mb-2">
            This analysis requires your input to continue.
          </p>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter your hypothesis or additional information..."
            className="w-full p-2 border border-gray-300 rounded text-sm"
            rows={3}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onUserInput(job.id, userInput, true)}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Continue Analysis
            </button>
            <button
              onClick={() => onUserInput(job.id, userInput, false)}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Stop Analysis
            </button>
          </div>
        </div>
      )}

      {/* Job Statistics */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {job.num_samples > 0 && (
          <div>
            <span className="text-gray-500">Samples:</span>
            <span className="ml-1 font-medium">{job.num_samples}</span>
          </div>
        )}
        {job.total_reads > 0 && (
          <div>
            <span className="text-gray-500">Total Reads:</span>
            <span className="ml-1 font-medium">{(job.total_reads / 1000000).toFixed(1)}M</span>
          </div>
        )}
        {job.mapped_reads > 0 && (
          <div>
            <span className="text-gray-500">Mapped:</span>
            <span className="ml-1 font-medium">{(job.mapped_reads / 1000000).toFixed(1)}M</span>
          </div>
        )}
        {job.alignment_rate > 0 && (
          <div>
            <span className="text-gray-500">Alignment:</span>
            <span className="ml-1 font-medium">{(job.alignment_rate * 100).toFixed(1)}%</span>
          </div>
        )}
        {job.genes_quantified > 0 && (
          <div>
            <span className="text-gray-500">Genes:</span>
            <span className="ml-1 font-medium">{job.genes_quantified.toLocaleString()}</span>
          </div>
        )}
        {job.cells_detected > 0 && (
          <div>
            <span className="text-gray-500">Cells:</span>
            <span className="ml-1 font-medium">{job.cells_detected.toLocaleString()}</span>
          </div>
        )}
        {job.cell_clusters > 0 && (
          <div>
            <span className="text-gray-500">Clusters:</span>
            <span className="ml-1 font-medium">{job.cell_clusters}</span>
          </div>
        )}
        {job.significant_genes > 0 && (
          <div>
            <span className="text-gray-500">DEGs:</span>
            <span className="ml-1 font-medium">{job.significant_genes.toLocaleString()}</span>
          </div>
        )}
        {job.enriched_pathways > 0 && (
          <div>
            <span className="text-gray-500">Pathways:</span>
            <span className="ml-1 font-medium">{job.enriched_pathways}</span>
          </div>
        )}
        {job.duration_minutes > 0 && (
          <div>
            <span className="text-gray-500">Duration:</span>
            <span className="ml-1 font-medium">{formatDuration(job.duration_minutes)}</span>
          </div>
        )}
      </div>

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

      {/* User Hypothesis */}
      {job.user_hypothesis && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
          <div className="font-medium text-blue-800">User Hypothesis:</div>
          <div className="text-blue-700 mt-1">{job.user_hypothesis}</div>
        </div>
      )}
    </div>
  );
};

export default JobProgressCard;