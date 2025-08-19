export interface AnalysisJob {
  id: string;
  user: number;
  
  // Dataset information (consolidated from RNASeqDataset)
  name: string;
  description: string;
  dataset_type: 'bulk' | 'single_cell';
  organism: string;
  selected_pipeline_stage: 'upstream' | 'downstream';
  
  // Multi-sample support
  is_multi_sample: boolean;
  sample_count: number;
  
  // File management
  fastq_files: FastqFilePair[];
  metadata_file?: string;
  expression_matrix?: string;
  expression_matrix_output?: string;
  
  // Analysis status and progress
  status: 'pending' | 'processing_upstream' | 'upstream_complete' | 'processing_downstream' | 'completed' | 'failed' | 'waiting_for_input';
  current_step: number;
  current_step_name: string;
  progress_percentage: number;
  total_steps: number;
  
  // Job configuration
  job_config: Record<string, any>;
  processing_config: Record<string, any>;
  
  // Analysis metrics
  num_samples: number;
  total_reads: number;
  mapped_reads: number;
  alignment_rate: number;
  genes_quantified: number;
  cells_detected: number;
  cell_clusters: number;
  significant_genes: number;
  enriched_pathways: number;
  
  // Results and outputs
  results_file?: string;
  visualization_image?: string;
  qc_report?: string;
  
  // AI features
  ai_chat_history: AIChatMessage[];
  user_hypothesis: string;
  current_user_input: string;
  waiting_for_input: boolean;
  enable_ai_interpretation: boolean;
  
  // Error handling
  error_message: string;
  
  // Timestamps
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
  
  // Computed properties
  duration_minutes: number;
  results_count: number;
  clusters_count: number;
  pathways_count: number;
}

export interface FastqFilePair {
  sample_id: string;
  r1_file: string;
  r2_file: string;
  r1_size?: number;
  r2_size?: number;
  condition?: string;
  batch?: string;
}

export interface AIChatMessage {
  id: number;
  user_message: string;
  ai_response: string;
  context_data: Record<string, any>;
  created_at: string;
}

export interface RNASeqAnalysisResult {
  gene_id: string;
  gene_name: string;
  log2_fold_change?: number;
  p_value?: number;
  adjusted_p_value?: number;
  base_mean?: number;
  chromosome: string;
  gene_type: string;
  description: string;
  
  // Single-cell specific
  cluster?: string;
  cell_type?: string;
  avg_log2fc?: number;
  pct_1?: number;
  pct_2?: number;
}

export interface RNASeqCluster {
  cluster_id: string;
  cluster_name: string;
  cell_type: string;
  cell_count: number;
  marker_genes: string[];
  coordinates: {
    umap_1?: number[];
    umap_2?: number[];
    tsne_1?: number[];
    tsne_2?: number[];
  };
}

export interface RNASeqPathwayResult {
  pathway_id: string;
  pathway_name: string;
  database: 'GO' | 'KEGG' | 'REACTOME' | 'HALLMARK';
  p_value: number;
  adjusted_p_value: number;
  gene_count: number;
  gene_list: string[];
  enrichment_score?: number;
}

export interface RNASeqAIChat {
  id: number;
  user_message: string;
  ai_response: string;
  context_data: Record<string, any>;
  created_at: string;
}

export interface CreateRNASeqJobRequest {
  name: string;
  description?: string;
  dataset_type: 'bulk' | 'single_cell';
  organism: string;
  selected_pipeline_stage: 'upstream' | 'downstream';
  is_multi_sample?: boolean;
  user_hypothesis?: string;
  enable_ai_interpretation?: boolean;
}

export interface UpstreamProcessRequest {
  reference_genome?: string;
  processing_threads?: number;
  memory_limit?: string;
}

export interface DownstreamAnalysisRequest {
  comparison_groups?: Record<string, any>;
  statistical_thresholds?: Record<string, any>;
}

export interface AIChatRequest {
  job_id: string;
  user_message: string;
  context_type: 'general' | 'results_interpretation' | 'methodology' | 'troubleshooting';
}

export interface CreateRNASeqPresentationRequest {
  job_id: string;
  title: string;
  include_methods?: boolean;
  include_results?: boolean;
  include_discussion?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

// Legacy type for backward compatibility - now maps to AnalysisJob
export type RNASeqDataset = AnalysisJob;