export interface RNASeqDataset {
  id: string;
  name: string;
  description: string;
  organism: string;
  analysis_type: 'differential' | 'pathway' | 'clustering' | 'volcano' | 'heatmap';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  counts_file?: string;
  metadata_file?: string;
  results_file?: string;
  visualization_image?: string;
  created_at: string;
  updated_at: string;
  results_count: number;
}

export interface RNASeqAnalysisResult {
  gene_id: string;
  gene_name: string;
  log2_fold_change: number;
  p_value: number;
  adjusted_p_value: number;
  base_mean: number;
  chromosome: string;
  gene_type: string;
  description: string;
}

export interface RNASeqPresentation {
  id: number;
  dataset: string;
  presentation: number;
  slide_order: number;
  dataset_name: string;
  presentation_title: string;
  created_at: string;
}

export interface CreateRNASeqPresentationRequest {
  dataset_id: string;
  title: string;
  include_methods?: boolean;
  include_results?: boolean;
  include_discussion?: boolean;
  quality?: 'low' | 'medium' | 'high';
}