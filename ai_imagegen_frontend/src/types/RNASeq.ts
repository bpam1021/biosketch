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
  analysis_type: 'differential' | 'pathway' | 'clustering' | 'pca' | 'signature_correlation' | 'phenotype_correlation' | 'cell_type_annotation' | 'pseudotime' | 'cell_communication';
  status: 'pending' | 'processing_upstream' | 'upstream_complete' | 'processing_downstream' | 'completed' | 'failed';
  start_from_upstream: boolean;
  is_multi_sample: boolean;
  sample_files_mapping: Record<string, any>;
  fastq_files: string[];
  batch_id: string;
  
  // File fields
  fastq_r1_file?: string;
  fastq_r2_file?: string;
  counts_file?: string;
  metadata_file?: string;
  sample_sheet?: string;
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
  skip_qc?: boolean;
  skip_trimming?: boolean;
  reference_genome?: string;
  quality_thresholds?: Record<string, any>;
  processing_threads?: number;
  memory_limit?: string;
}

export interface DownstreamAnalysisRequest {
  dataset_id: string;
  analysis_type: string;
  user_hypothesis?: string;
  gene_signatures?: string[];
  phenotype_columns?: string[];
  comparison_groups?: Record<string, any>;
  clustering_resolution?: number;
  enable_ai_interpretation?: boolean;
  statistical_thresholds?: Record<string, any>;
}

export interface AIInteractionRequest {
  dataset_id: string;
  interaction_type: 'hypothesis_request' | 'result_interpretation' | 'signature_analysis' | 'pathway_interpretation' | 'cell_type_suggestion';
  user_input: string;
  context_data?: Record<string, any>;
}

export interface JobStatusUpdateRequest {
  user_input?: string;
  continue_analysis?: boolean;
}

export interface PipelineValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimated_runtime: string;
  resource_requirements: {
    memory: string;
    cpu_cores: number;
    disk_space: string;
  };
}

export interface AnalysisConfiguration {
  supported_analysis_types: string[];
  supported_organisms: string[];
  default_thresholds: Record<string, any>;
  supported_visualizations: string[];
  parameter_ranges: Record<string, any>;
  recommended_settings: Record<string, any>;
}

export interface PipelineHealth {
  bulk_pipeline_available: boolean;
  scrna_pipeline_available: boolean;
  bulk_downstream_available: boolean;
  scrna_downstream_available: boolean;
  ai_service_available: boolean;
  supported_organisms: string[];
  supported_dataset_types: string[];
  pipeline_tools_status: Record<string, any>;
  bulk_analysis_types?: string[];
  scrna_analysis_types?: string[];
  pipeline_core_error?: string;
  downstream_analysis_error?: string;
  ai_service_error?: string;
}

export interface PipelineCapabilities {
  upstream_capabilities: {
    supported_file_formats: string[];
    quality_control_tools: string[];
    alignment_tools: string[];
    quantification_methods: string[];
    reference_genomes: string[];
  };
  downstream_capabilities: {
    analysis_types: string[];
    visualization_types: string[];
    statistical_methods: string[];
    pathway_databases: string[];
    clustering_methods: string[];
  };
  ai_capabilities: {
    interpretation_types: string[];
    supported_interactions: string[];
  };
}

export interface DetailedPipelineStatus {
  pipeline_steps: {
    step_name: string;
    status: string;
    progress: number;
    estimated_time_remaining: string;
    resource_usage: Record<string, any>;
  }[];
  quality_metrics: Record<string, any>;
  intermediate_files: string[];
  error_logs: string[];
  performance_stats: Record<string, any>;
}

export interface MultiSampleUploadRequest {
  name: string;
  description?: string;
  dataset_type: 'bulk' | 'single_cell';
  organism: string;
  sample_sheet: File;
  fastq_r1_files?: File[];
  fastq_r2_files?: File[];
  start_from_upstream?: boolean;
  processing_config?: Record<string, any>;
  quality_thresholds?: Record<string, any>;
}

export interface PipelineStatus {
  dataset: RNASeqDataset;
  upstream_status: {
    // Bulk RNA-seq specific
    qc_complete?: boolean;
    trimming_complete?: boolean;
    alignment_complete?: boolean;
    quantification_complete?: boolean;
    // Single-cell RNA-seq specific
    barcode_processing_complete?: boolean;
    filtering_complete?: boolean;
    umi_matrix_complete?: boolean;
  };
  downstream_options: string[];
  clusters?: RNASeqCluster[];
  ai_interactions: RNASeqAIInteraction[];
  current_job?: AnalysisJob;
  job_progress: {
    status: string;
    progress: number;
    current_step: string;
    step_number: number;
  };
  sample_info: {
    is_multi_sample: boolean;
    num_samples: number;
    batch_id?: string;
  };
}

export interface FastqPair {
  sample_id: string;
  r1_file: File;
  r2_file: File;
  r1_path?: string;
  r2_path?: string;
  metadata?: Record<string, any>;
}

export interface SampleFileMapping {
  [sample_id: string]: {
    r1_path: string;
    r2_path: string;
    r1_original_name: string;
    r2_original_name: string;
    metadata: Record<string, any>;
  };
}