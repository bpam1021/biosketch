import axiosClient from './axiosClient';
import { 
  CreateRNASeqPresentationRequest, MultiSampleUploadRequest, JobStatusUpdateRequest,
  UpstreamProcessRequest, 
  DownstreamAnalysisRequest,
  AIInteractionRequest 
} from '../types/RNASeq';

// Dataset management
export const createRNASeqDataset = (data: FormData) =>
  axiosClient.post('/rnaseq/datasets/', data, {
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

// Multi-sample dataset upload
export const createMultiSampleDataset = (data: FormData) => 
  axiosClient.post('/rnaseq/datasets/multi-sample/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Job management
export const getAnalysisJobs = (datasetId?: string) => {
  const url = datasetId ? `/rnaseq/datasets/${datasetId}/jobs/` : '/rnaseq/jobs/';
  return axiosClient.get(url);
};

export const getAnalysisJob = (jobId: string) =>
  axiosClient.get(`/rnaseq/jobs/${jobId}/`);

export const updateJobStatus = (jobId: string, data: JobStatusUpdateRequest) =>
  axiosClient.post(`/rnaseq/jobs/${jobId}/status/`, data);

// Pipeline processing
export const startUpstreamProcessing = (datasetId: string, data: UpstreamProcessRequest) =>
  axiosClient.post(`/rnaseq/datasets/${datasetId}/upstream/start/`, data);

export const startDownstreamAnalysis = (datasetId: string, data: DownstreamAnalysisRequest) =>
  axiosClient.post(`/rnaseq/datasets/${datasetId}/downstream/start/`, data);

export const startMultiSampleProcessing = (datasetId: string, data: any) =>
  axiosClient.post(`/rnaseq/datasets/${datasetId}/multi-sample/start/`, data);

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

// Pipeline status
export const getRNASeqPipelineStatus = (datasetId: string) =>
  axiosClient.get(`/rnaseq/pipeline/${datasetId}/status/`);

// Presentations
export const createPresentationFromRNASeq = (data: CreateRNASeqPresentationRequest) =>
  axiosClient.post('/rnaseq/presentations/create/', data);

export const getRNASeqPresentations = () =>
  axiosClient.get('/rnaseq/presentations/');

// Pipeline validation and configuration
export const validatePipelineConfiguration = (datasetId: string, config: any) =>
  axiosClient.post(`/rnaseq/datasets/${datasetId}/pipeline/validate/`, { config });

export const getAnalysisConfiguration = (datasetType?: string, organism?: string) => {
  const params: any = {};
  if (datasetType) params.dataset_type = datasetType;
  if (organism) params.organism = organism;
  return axiosClient.get('/rnaseq/analysis/configuration/', { params });
};

export const getPipelineStatusDetail = (datasetId: string) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/pipeline/status-detail/`);

// Pipeline health and capabilities
export const getPipelineHealth = () =>
  axiosClient.get('/rnaseq/pipeline/health/');

export const getSupportedOrganisms = () =>
  axiosClient.get('/rnaseq/pipeline/organisms/');

export const getPipelineCapabilities = (datasetType?: string, organism?: string) => {
  const params: any = {};
  if (datasetType) params.dataset_type = datasetType;
  if (organism) params.organism = organism;
  return axiosClient.get('/rnaseq/pipeline/capabilities/', { params });
};

// Enhanced pipeline endpoints
export const validateDatasetForProcessing = (datasetId: string) =>
  axiosClient.post(`/rnaseq/datasets/${datasetId}/pipeline/validate/`);

export const getRecommendedSettings = (datasetType: string, organism: string) =>
  axiosClient.get('/rnaseq/analysis/configuration/', {
    params: { dataset_type: datasetType, organism }
  });