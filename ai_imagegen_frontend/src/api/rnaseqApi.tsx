import axiosClient from './axiosClient';

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

// Analysis results
export const getRNASeqResults = (datasetId: string, params?: any) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/results/`, { params });

export const getRNASeqAnalysisStatus = (datasetId: string) =>
  axiosClient.get(`/rnaseq/datasets/${datasetId}/status/`);

// Visualizations
export const generateRNASeqVisualization = (datasetId: string, type: string) =>
  axiosClient.post(`/rnaseq/datasets/${datasetId}/visualize/`, { type });

// Presentations
export const createPresentationFromRNASeq = (data: {
  dataset_id: string;
  title: string;
  include_methods?: boolean;
  include_results?: boolean;
  include_discussion?: boolean;
  quality?: 'low' | 'medium' | 'high';
}) => axiosClient.post('/rnaseq/presentations/create/', data);

export const getRNASeqPresentations = () =>
  axiosClient.get('/rnaseq/presentations/');