export interface AnalysisJob {
  id: string;
  analysis_type: 'bulk_rnaseq' | 'scrna_seq';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'waiting_for_input';
  current_step: number;
  current_step_name: string;
  progress_percentage: number;
  num_samples: number;
  total_reads: number;
  mapped_reads: number;
  alignment_rate: number;
  genes_quantified: number;
  cells_detected: number;
  cell_clusters: number;
  significant_genes: number;
  enriched_pathways: number;
  user_hypothesis: string;
  waiting_for_input: boolean;
  enable_ai_interpretation: boolean;
  result_files: string[];
  error_message: string;
  created_at: string;
  started_at: string;
  completed_at: string;
  duration_minutes: number;
  pipeline_steps: PipelineStep[];
  ai_interpretations: AIInterpretation[];
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
  duration_minutes: number;
  error_message: string;
  retry_count: number;
}

export interface AIInterpretation {
  id: number;
  analysis_type: 'pca_clustering' | 'differential_expression' | 'pathway_enrichment' | 'cell_clustering' | 'cell_type_annotation' | 'quality_control';
  user_input: string;
  ai_response: string;
  context_data: Record<string, any>;
  confidence_score: number;
  created_at: string;
}

export interface RNASeqDataset {
  id: string;
  name: string;
  description: string;
  dataset_type: 'bulk' | 'single_cell';
  organism: string;
  analysis_type: 'comprehensive';
  status: 'pending' | 'processing_upstream' | 'upstream_complete' | 'processing_downstream' | 'completed' | 'failed';
  start_from_upstream: boolean;
  is_multi_sample: boolean;
  batch_id: string;
  
  // File fields
  fastq_r1_file?: string;
  fastq_r2_file?: string;
  counts_file?: string;
  metadata_file?: string;
  expression_matrix_tpm?: string;
  expression_matrix_counts?: string;
  results_file?: string;
  visualization_image?: string;
  
  // Analysis data
  ai_interpretation?: string;
  user_hypothesis?: string;
  gene_signatures?: string[];
  phenotype_data?: Record<string, any>;
  generated_metadata?: Record<string, any>;
  processing_config?: Record<string, any>;
  quality_thresholds?: Record<string, any>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Counts
  results_count: number;
  clusters_count: number;
  pathways_count: number;
  
  // Job information
  current_job?: AnalysisJob;
  job_progress: {
    status: string;
    progress: number;
    current_step: string;
    step_number: number;
  };
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
  database: 'GO' | 'KEGG' | 'REACTOME';
  p_value: number;
  adjusted_p_value: number;
  gene_count: number;
  gene_list: string[];
  enrichment_score?: number;
}

export interface RNASeqAIInteraction {
  id: number;
  interaction_type: 'hypothesis_request' | 'result_interpretation' | 'signature_analysis' | 'pathway_interpretation' | 'cell_type_suggestion';
  user_input: string;
  ai_response: string;
  context_data: Record<string, any>;
  created_at: string;
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

export interface UpstreamProcessRequest {
  dataset_id: string;
  skip_qc?: boolean;
  skip_trimming?: boolean;
  reference_genome?: string;
  quality_thresholds?: Record<string, any>;
  processing_threads?: number;
  memory_limit?: string;
}

export interface DownstreamAnalysisRequest {
  dataset_id: string;
  analysis_type: 'comprehensive';
  user_hypothesis?: string;
  enable_ai_interpretation?: boolean;
}

export interface AIInteractionRequest {
  dataset_id: string;
  interaction_type: 'hypothesis_request' | 'result_interpretation' | 'signature_analysis' | 'pathway_interpretation' | 'cell_type_suggestion';
  user_input: string;
  context_data?: Record<string, any>;
}
export interface JobStatusUpdateRequest {
  job_id: string;
  user_input?: string;
  continue_analysis?: boolean;
}

export interface MultiSampleUploadRequest {
  name: string;
  description?: string;
  dataset_type: 'bulk' | 'single_cell';
  organism: string;
  fastq_files?: File[];
  start_from_upstream?: boolean;
  processing_config?: Record<string, any>;
}

export interface PipelineStatus {
  dataset: RNASeqDataset;
  upstream_status: {
    qc_complete?: boolean;
    trimming_complete?: boolean;
    alignment_complete?: boolean;
    quantification_complete?: boolean;
    barcode_processing_complete?: boolean;
    filtering_complete?: boolean;
    umi_matrix_complete?: boolean;
  };
  downstream_options: ['comprehensive'];
  clusters?: RNASeqCluster[];
  ai_interactions: RNASeqAIInteraction[];
  current_job?: AnalysisJob;
  job_progress: {
    status: string;
    progress: number;
    current_step: string;
    step_number: number;
  };
}