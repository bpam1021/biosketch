export interface RNASeqDataset {
  id: string;
  name: string;
  description: string;
  dataset_type: 'bulk' | 'single_cell';
  organism: string;
  selected_pipeline_stage: 'upstream' | 'downstream';
  status: 'pending' | 'processing_upstream' | 'upstream_complete' | 'processing_downstream' | 'completed' | 'failed';
  is_multi_sample: boolean;
  sample_count: number;
  
  // File fields
  fastq_files: FastqFilePair[];
  metadata_file?: string;
  expression_matrix?: string;
  expression_matrix_output?: string;
  
  // Results
  upstream_results: UpstreamResults;
  downstream_results: DownstreamResults;
  analysis_plots: AnalysisPlot[];
  ai_chat_history: AIChatMessage[];
  
  // Metadata
  processing_config: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Counts
  results_count: number;
  clusters_count: number;
  pathways_count: number;
  
  // Current job
  current_job?: AnalysisJob;
}

export interface FastqFilePair {
  sample_id: string;
  r1_file: string;
  r2_file: string;
  r1_size: number;
  r2_size: number;
}

export interface UpstreamResults {
  total_reads?: number;
  mapped_reads?: number;
  mapping_rate?: number;
  genes_detected?: number;
  samples_processed?: number;
  // scRNA-seq specific
  total_cells_detected?: number;
  cells_passed_qc?: number;
  median_genes_per_cell?: number;
  median_umis_per_cell?: number;
}

export interface DownstreamResults {
  analysis_type: string;
  results_summary: Record<string, any>;
  ai_interpretation: string;
}

export interface AnalysisPlot {
  type: string;
  title: string;
  file_path: string;
}

export interface AIChatMessage {
  id: number;
  user_message: string;
  ai_response: string;
  timestamp: string;
}

export interface AnalysisJob {
  id: string;
  analysis_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'waiting_for_input';
  current_step: number;
  current_step_name: string;
  progress_percentage: number;
  total_steps: number;
  job_config: Record<string, any>;
  
  // Analysis-specific metrics
  num_samples: number;
  total_reads: number;
  mapped_reads: number;
  alignment_rate: number;
  genes_quantified: number;
  cells_detected: number;
  cell_clusters: number;
  significant_genes: number;
  enriched_pathways: number;
  duration_minutes: number;
  
  // User interaction fields
  user_hypothesis: string;
  current_user_input: string;
  waiting_for_input: boolean;
  enable_ai_interpretation: boolean;
  
  error_message: string;
  created_at: string;
  started_at: string;
  completed_at: string;
  updated_at: string;
  pipeline_steps: PipelineStep[];
}

export interface PipelineStep {
  step_number: number;
  step_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input_files: string[];
  output_files: string[];
  parameters: Record<string, any>;
  metrics: Record<string, any>;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  error_message: string;
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

export interface CreateRNASeqDatasetRequest {
  name: string;
  description?: string;
  dataset_type: 'bulk' | 'single_cell';
  organism: string;
  selected_pipeline_stage: 'upstream' | 'downstream';
  is_multi_sample?: boolean;
  fastq_files?: File[];
  expression_matrix?: File;
  metadata_file?: File;
}

export interface UpstreamProcessRequest {
  reference_genome?: string;
  processing_threads?: number;
  memory_limit?: string;
}

export interface DownstreamAnalysisRequest {
  dataset_id: string;
  analysis_type: 'differential_expression' | 'clustering_pca' | 'pathway_enrichment' | 'cell_type_annotation' | 'trajectory_analysis';
  comparison_groups?: Record<string, any>;
  statistical_thresholds?: Record<string, any>;
}

export interface AIChatRequest {
  dataset_id: string;
  user_message: string;
  context_type: 'general' | 'results_interpretation' | 'methodology' | 'troubleshooting';
}

export interface CreateRNASeqPresentationRequest {
  dataset_id: string;
  title: string;
  include_methods?: boolean;
  include_results?: boolean;
  include_discussion?: boolean;
  quality?: 'low' | 'medium' | 'high';
}