import axiosClient from './axiosClient';
import { 
  CreateRNASeqDatasetRequest,
  UpstreamProcessRequest, 
  DownstreamAnalysisRequest,
  AIChatRequest,
  CreateRNASeqPresentationRequest
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

// Pipeline processing
export const startUpstreamProcessing = (datasetId: string, data: UpstreamProcessRequest) =>
  axiosClient.post(`/rnaseq/datasets/${datasetId}/upstream/start/`, data);

export const startDownstreamAnalysis = (data: DownstreamAnalysisRequest) =>
  axiosClient.post(`/rnaseq/datasets/${data.dataset_id}/downstream/start/`, data);

// Continue from upstream to downstream
export const continueToDownstream = (datasetId: string) =>
  axiosClient.post(`/rnaseq/datasets/${datasetId}/continue-downstream/`);

// Download upstream results
export const downloadUpstreamResults = (datasetId: string) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/download-upstream/`, {
    responseType: 'blob'
  });

// Analysis results
export const getRNASeqResults = (datasetId: string, params?: any) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/results/`, { params });

export const getRNASeqClusters = (datasetId: string) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/clusters/`);

export const getRNASeqPathways = (datasetId: string, params?: any) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/pathways/`, { params });

export const getRNASeqAnalysisStatus = (datasetId: string) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/status/`);

// AI Chat
export const sendAIChat = (data: AIChatRequest) =>
  axiosClient.post(`/rnaseq/datasets/${data.dataset_id}/ai-chat/`, data);

export const getAIChats = (datasetId: string) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/ai-chat/`);

// Pipeline-specific endpoints
export const getBulkRNASeqPipeline = (datasetId: string) =>
  axiosClient.get(`/rnaseq/bulk/${datasetId}/`);

export const getSingleCellRNASeqPipeline = (datasetId: string) =>
  axiosClient.get(`/rnaseq/single-cell/${datasetId}/`);

// Presentations
export const createPresentationFromRNASeq = (data: CreateRNASeqPresentationRequest) =>
  axiosClient.post('/rnaseq/presentations/create/', data);

export const getRNASeqPresentations = () =>
  axiosClient.get('/rnaseq/presentations/');