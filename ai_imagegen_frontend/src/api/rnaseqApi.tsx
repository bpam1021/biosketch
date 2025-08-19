import axiosClient from './axiosClient';
import { 
  CreateRNASeqJobRequest,
  UpstreamProcessRequest, 
  DownstreamAnalysisRequest,
  AIChatRequest,
  CreateRNASeqPresentationRequest
} from '../types/RNASeq';

// Analysis Job management (primary endpoints)
export const createRNASeqJob = (data: FormData) =>
  axiosClient.post('/rnaseq/jobs/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getRNASeqJobs = () =>
  axiosClient.get('/rnaseq/jobs/');

export const getRNASeqJob = (id: string) =>
  axiosClient.get(`/rnaseq/jobs/${id}/`);

export const updateRNASeqJob = (id: string, data: any) =>
  axiosClient.put(`/rnaseq/jobs/${id}/`, data);

export const deleteRNASeqJob = (id: string) =>
  axiosClient.delete(`/rnaseq/jobs/${id}/`);

// Multi-sample job upload
export const createMultiSampleJob = (data: FormData) =>
  axiosClient.post('/rnaseq/jobs/multi-sample/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Pipeline processing
export const startUpstreamProcessing = (jobId: string, data: UpstreamProcessRequest) =>
  axiosClient.post(`/rnaseq/jobs/${jobId}/upstream/start/`, data);

export const startDownstreamAnalysis = (jobId: string, data: DownstreamAnalysisRequest) =>
  axiosClient.post(`/rnaseq/jobs/${jobId}/downstream/start/`, data);

// Continue from upstream to downstream
export const continueToDownstream = (jobId: string) =>
  axiosClient.post(`/rnaseq/jobs/${jobId}/continue-downstream/`);

// Download upstream results
export const downloadUpstreamResults = (jobId: string) =>
  axiosClient.get(`/rnaseq/jobs/${jobId}/download-upstream/`, {
    responseType: 'blob'
  });

// Analysis results
export const getRNASeqResults = (jobId: string, params?: any) =>
  axiosClient.get(`/rnaseq/jobs/${jobId}/results/`, { params });

export const getRNASeqClusters = (jobId: string) =>
  axiosClient.get(`/rnaseq/jobs/${jobId}/clusters/`);

export const getRNASeqPathways = (jobId: string, params?: any) =>
  axiosClient.get(`/rnaseq/jobs/${jobId}/pathways/`, { params });

export const getRNASeqAnalysisStatus = (jobId: string) =>
  axiosClient.get(`/rnaseq/jobs/${jobId}/status/`);

// AI Chat
export const sendAIChat = (data: AIChatRequest) =>
  axiosClient.post(`/rnaseq/ai-chat/`, data);

export const getAIChats = (jobId: string) =>
  axiosClient.get(`/rnaseq/jobs/${jobId}/ai-chat/`);

// Pipeline-specific endpoints
export const getBulkRNASeqPipeline = (jobId: string) =>
  axiosClient.get(`/rnaseq/bulk/${jobId}/`);

export const getSingleCellRNASeqPipeline = (jobId: string) =>
  axiosClient.get(`/rnaseq/single-cell/${jobId}/`);

// Presentations
export const createPresentationFromRNASeq = (data: CreateRNASeqPresentationRequest) =>
  axiosClient.post('/rnaseq/presentations/create/', data);

export const getRNASeqPresentations = () =>
  axiosClient.get('/rnaseq/presentations/');