import React, { useEffect, useState } from 'react';
import { RNASeqDataset, AnalysisJob } from '../../types/RNASeq';
import { getRNASeqAnalysisStatus } from '../../api/rnaseqApi';
import { FiActivity, FiClock, FiTrendingUp, FiDatabase, FiCpu } from 'react-icons/fi';

interface RealTimeProgressPanelProps {
  dataset: RNASeqDataset;
  onStatusUpdate?: (dataset: RNASeqDataset) => void;
}

const RealTimeProgressPanel: React.FC<RealTimeProgressPanelProps> = ({ 
  dataset: initialDataset, 
  onStatusUpdate 
}) => {
  const [dataset, setDataset] = useState(initialDataset);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (dataset.status === 'processing_upstream' || dataset.status === 'processing_downstream') {
      setIsPolling(true);
      const interval = setInterval(async () => {
        try {
          const response = await getRNASeqAnalysisStatus(dataset.id);
          const updatedDataset = response.data;
          setDataset(updatedDataset);
          onStatusUpdate?.(updatedDataset);
          
          // Stop polling when processing is complete
          if (updatedDataset.status === 'completed' || updatedDataset.status === 'failed') {
            setIsPolling(false);
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Failed to fetch status:', error);
        }
      }, 2000); // Poll every 2 seconds

      return () => {
        clearInterval(interval);
        setIsPolling(false);
      };
    }
  }, [dataset.status, dataset.id]);

  const formatTimeRemaining = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 border-green-200';
      case 'processing_upstream':
      case 'processing_downstream': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'upstream_complete': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'failed': return 'text-red-600 bg-red-100 border-red-200';
      case 'waiting_for_input': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStepIcon = (stepName: string) => {
    if (stepName.toLowerCase().includes('qc') || stepName.toLowerCase().includes('quality')) return FiActivity;
    if (stepName.toLowerCase().includes('align')) return FiDatabase;
    if (stepName.toLowerCase().includes('quantif')) return FiTrendingUp;
    return FiCpu;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FiActivity className={isPolling ? 'animate-pulse text-blue-600' : 'text-gray-600'} />
          Real-time Progress
        </h3>
        {isPolling && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            <span>Live updating...</span>
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(dataset.status)}`}>
            {dataset.status.replace('_', ' ').toUpperCase()}
          </span>
          {dataset.job_progress && (
            <span className="text-sm text-gray-500">
              {dataset.job_progress.progress}% complete
            </span>
          )}
        </div>
        
        {dataset.job_progress && dataset.job_progress.progress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
              style={{ width: `${dataset.job_progress.progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            </div>
          </div>
        )}
        
        <p className="text-sm text-gray-600">{dataset.job_progress?.current_step}</p>
      </div>

      {/* Real-time Progress Details */}
      {dataset.real_time_progress && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <FiDatabase size={16} />
              Sample Progress
            </h4>
            <div className="space-y-2 text-sm">
              {dataset.real_time_progress.current_sample && (
                <div>
                  <span className="text-gray-600">Current:</span>
                  <span className="ml-2 font-medium">{dataset.real_time_progress.current_sample}</span>
                </div>
              )}
              {dataset.real_time_progress.samples_completed !== undefined && (
                <div>
                  <span className="text-gray-600">Progress:</span>
                  <span className="ml-2 font-medium">
                    {dataset.real_time_progress.samples_completed} / {dataset.real_time_progress.total_samples} samples
                  </span>
                </div>
              )}
              {dataset.real_time_progress.estimated_time_remaining && (
                <div>
                  <span className="text-gray-600">ETA:</span>
                  <span className="ml-2 font-medium">
                    {formatTimeRemaining(dataset.real_time_progress.estimated_time_remaining)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {dataset.real_time_progress.throughput_stats && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <FiTrendingUp size={16} />
                Throughput
              </h4>
              <div className="space-y-2 text-sm">
                {dataset.real_time_progress.throughput_stats.reads_per_minute && (
                  <div>
                    <span className="text-gray-600">Reads/min:</span>
                    <span className="ml-2 font-medium">
                      {dataset.real_time_progress.throughput_stats.reads_per_minute.toLocaleString()}
                    </span>
                  </div>
                )}
                {dataset.real_time_progress.throughput_stats.samples_per_hour && (
                  <div>
                    <span className="text-gray-600">Samples/hour:</span>
                    <span className="ml-2 font-medium">
                      {dataset.real_time_progress.throughput_stats.samples_per_hour.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Steps */}
      {dataset.current_job?.pipeline_steps && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <FiClock size={16} />
            Pipeline Steps
          </h4>
          <div className="space-y-2">
            {dataset.current_job.pipeline_steps.map((step) => {
              const StepIcon = getStepIcon(step.step_name);
              return (
                <div key={step.step_number} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      step.status === 'completed' ? 'bg-green-500' :
                      step.status === 'running' ? 'bg-blue-500 animate-pulse' :
                      step.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                    }`}></span>
                    <StepIcon size={16} className="text-gray-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">{step.step_name}</span>
                      <span className="text-xs text-gray-500">
                        {step.status === 'completed' && step.duration_minutes > 0 && 
                          `${step.duration_minutes} min`
                        }
                      </span>
                    </div>
                    
                    {/* Step-specific progress */}
                    {step.progress_details && (
                      <div className="text-xs text-gray-600 mt-1">
                        {step.progress_details.current_operation && (
                          <span>{step.progress_details.current_operation}</span>
                        )}
                        {step.progress_details.samples_completed !== undefined && (
                          <span className="ml-2">
                            ({step.progress_details.samples_completed}/{step.progress_details.total_samples})
                          </span>
                        )}
                      </div>
                    )}
                    
                    {step.error_message && (
                      <p className="text-xs text-red-600 mt-1">{step.error_message}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {dataset.current_job && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {dataset.current_job.total_reads > 0 && (
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-600">
                {(dataset.current_job.total_reads / 1000000).toFixed(1)}M
              </div>
              <div className="text-xs text-blue-700">Total Reads</div>
            </div>
          )}
          
          {dataset.current_job.alignment_rate > 0 && (
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-600">
                {(dataset.current_job.alignment_rate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-green-700">Alignment Rate</div>
            </div>
          )}
          
          {dataset.current_job.genes_quantified > 0 && (
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-600">
                {dataset.current_job.genes_quantified.toLocaleString()}
              </div>
              <div className="text-xs text-purple-700">Genes Quantified</div>
            </div>
          )}
          
          {dataset.current_job.duration_minutes > 0 && (
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-lg font-semibold text-orange-600">
                {dataset.current_job.duration_minutes}
              </div>
              <div className="text-xs text-orange-700">Minutes Elapsed</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealTimeProgressPanel;