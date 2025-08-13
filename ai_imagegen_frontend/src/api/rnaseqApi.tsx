import axiosClient from './axiosClient';
import { 
  CreateRNASeqPresentationRequest, MultiSampleUploadRequest, JobStatusUpdateRequest,
  UpstreamProcessRequest, 
  DownstreamAnalysisRequest,
  AIInteractionRequest,
  FastqFilePair
} from '../types/RNASeq';

// Dataset management
export const createRNASeqDataset = (data: FormData) =>
  axiosClient.post('/rnaseq/datasets/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const createMultiSampleDataset = (data: FormData) =>
  axiosClient.post('/rnaseq/datasets/multi-sample/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getRNASeqDatasets = () =>
  axiosClient.get('/rnaseq/datasets/');

export const getRNASeqDataset = (id: string) =>
  axiosClient.get(`/rnaseq/datasets/${id}/`);

export const updateRNASeqDataset = (id: string, data: any) =>
  axiosClient.put(`/rnaseq/datasets/${id}/`, data);

export const deleteRNASeqDataset = (id: string) =>
  axiosClient.delete(`/rnaseq/datasets/${id}/`);

// Job management with enhanced progress tracking
export const getAnalysisJobs = (datasetId?: string) => {
  const url = datasetId ? `/rnaseq/datasets/${datasetId}/jobs/` : '/rnaseq/jobs/';
  return axiosClient.get(url);
};

export const getAnalysisJob = (jobId: string) =>
  axiosClient.get(`/rnaseq/jobs/${jobId}/`);

export const updateJobStatus = (data: JobStatusUpdateRequest) =>
  axiosClient.post(`/rnaseq/jobs/${data.job_id}/status/`, data);

export const getJobRealTimeProgress = (jobId: string) =>
  axiosClient.get(`/rnaseq/jobs/${jobId}/progress/`);

// Pipeline processing
export const startUpstreamProcessing = (data: UpstreamProcessRequest) =>
  axiosClient.post(`/rnaseq/datasets/${data.dataset_id}/upstream/start/`, data);

export const startDownstreamAnalysis = (data: DownstreamAnalysisRequest) =>
  axiosClient.post(`/rnaseq/datasets/${data.dataset_id}/downstream/start/`, data);

// Analysis results
export const getRNASeqResults = (datasetId: string, params?: any) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/results/`, { params });

export const getRNASeqClusters = (datasetId: string) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/clusters/`);

export const getRNASeqPathways = (datasetId: string, params?: any) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/pathways/`, { params });

export const getRNASeqAnalysisStatus = (datasetId: string) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/status/`);

// AI interpretations
export const getAIInterpretations = (datasetId: string) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/ai-interpretations/`);

export const generateAIInterpretation = (datasetId: string) =>
  axiosClient.post(`/rnaseq/datasets/${datasetId}/ai-interpretations/generate/`);

// AI interactions
export const createAIInteraction = (data: AIInteractionRequest) =>
  axiosClient.post('/rnaseq/ai/interact/', data);

export const getAIInteractions = (datasetId: string) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/ai/`);

// Visualizations
export const generateRNASeqVisualization = (datasetId: string, type: string) =>
  axiosClient.post(`/rnaseq/datasets/${datasetId}/visualize/`, { type });

// Downloads
export const downloadRNASeqResults = (datasetId: string, type: string) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/download/`, { params: { type } });

// Pipeline-specific endpoints
export const getBulkRNASeqPipeline = (datasetId: string) =>
  axiosClient.get(`/rnaseq/bulk/${datasetId}/`);

export const getSingleCellRNASeqPipeline = (datasetId: string) =>
  axiosClient.get(`/rnaseq/single-cell/${datasetId}/`);

// Multi-sample specific APIs
export const getMultiSampleProgress = (batchId: string) =>
  axiosClient.get(`/rnaseq/multi-sample/${batchId}/progress/`);

export const pauseMultiSampleProcessing = (batchId: string) =>
  axiosClient.post(`/rnaseq/multi-sample/${batchId}/pause/`);

export const resumeMultiSampleProcessing = (batchId: string) =>
  axiosClient.post(`/rnaseq/multi-sample/${batchId}/resume/`);

// Presentations
export const createPresentationFromRNASeq = (data: CreateRNASeqPresentationRequest) =>
  axiosClient.post('/rnaseq/presentations/create/', data);

export const getRNASeqPresentations = () =>
  axiosClient.get('/rnaseq/presentations/');

// Real-time updates via WebSocket (if implementing)
export const subscribeToJobUpdates = (jobId: string, callback: (update: any) => void) => {
  // WebSocket connection for real-time updates
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/rnaseq/${jobId}/`;
  
  const ws = new WebSocket(wsUrl);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    callback(data);
  };
  
  return () => ws.close();
};