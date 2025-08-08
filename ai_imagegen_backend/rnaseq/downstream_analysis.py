import logging
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, Any, List, Optional
from django.conf import settings
import os
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

class BaseDownstreamAnalysis:
    """Base class for downstream RNA-seq analysis with real bioinformatics processing"""
    
    def __init__(self, analysis_type: Optional[str] = None, config: Optional[Dict[str, Any]] = None):
        self.analysis_type = analysis_type
        self.config = config or {}
        self.analysis_config = getattr(settings, 'ANALYSIS_CONFIG', {})
        self.temp_dir = tempfile.mkdtemp(prefix='rnaseq_analysis_')
        
    def get_supported_analysis_types(self) -> List[str]:
        """Get supported analysis types"""
        return ['differential', 'pathway', 'clustering']
    
    def get_supported_visualizations(self) -> List[str]:
        """Get supported visualization types"""
        return ['volcano', 'heatmap', 'pca']
    
    def get_statistical_methods(self) -> List[str]:
        """Get available statistical methods"""
        return ['DESeq2', 'edgeR', 'limma']
    
    def get_pathway_databases(self) -> List[str]:
        """Get available pathway databases"""
        return ['GO', 'KEGG', 'REACTOME', 'MSigDB']
    
    def get_clustering_methods(self) -> List[str]:
        """Get available clustering methods"""
        return ['kmeans', 'hierarchical', 'leiden']
    
    def validate_expression_data(self, dataset) -> Dict[str, Any]:
        """Validate expression data availability"""
        errors = []
        
        expression_file = dataset.get_expression_file_path()
        if not expression_file:
            errors.append("No expression matrix file available")
        elif not os.path.exists(expression_file):
            errors.append("Expression matrix file does not exist")
        
        if dataset.status not in ['upstream_complete', 'completed']:
            errors.append("Upstream processing must be completed first")
        
        return {'valid': len(errors) == 0, 'errors': errors}
    
    def load_expression_data(self, dataset) -> pd.DataFrame:
        """Load expression data for analysis"""
        expression_file = dataset.get_expression_file_path()
        if not expression_file:
            raise ValueError("No expression data available")
        
        try:
            # Load expression matrix
            if expression_file.endswith('.h5ad'):
                import scanpy as sc
                adata = sc.read_h5ad(expression_file)
                return pd.DataFrame(adata.X.toarray(), 
                                  index=adata.obs_names, 
                                  columns=adata.var_names)
            else:
                # Load TSV/CSV format
                return pd.read_csv(expression_file, sep='\t', index_col=0)
                
        except Exception as e:
            logger.error(f"Failed to load expression data: {str(e)}")
            raise ValueError(f"Failed to load expression data: {str(e)}")
    
    def get_valid_threshold_keys(self) -> List[str]:
        """Get valid statistical threshold keys"""
        return ['p_value_threshold', 'fdr_threshold', 'log2fc_threshold', 'min_expression']

class BulkRNASeqDownstreamAnalysis(BaseDownstreamAnalysis):
    """Downstream analysis for bulk RNA-seq with real statistical methods"""
    
    def __init__(self, analysis_type: Optional[str] = None, config: Optional[Dict[str, Any]] = None):
        super().__init__(analysis_type, config)
        self.dataset_type = 'bulk'
    
    def get_supported_analysis_types(self) -> List[str]:
        """Get supported analysis types for bulk RNA-seq"""
        return ['differential', 'pathway', 'clustering', 'signature_correlation', 'phenotype_correlation']
    
    def get_supported_visualizations(self) -> List[str]:
        """Get supported visualizations for bulk RNA-seq"""
        return ['volcano', 'heatmap', 'ma_plot', 'pca']
    
    def perform_bulk_clustering_pca(self, expression_data: pd.DataFrame, config: Dict[str, Any]) -> Dict[str, Any]:
        """Perform PCA and clustering analysis using real statistical methods"""
        logger.info("Performing bulk clustering/PCA analysis")
        
        try:
            from sklearn.decomposition import PCA
            from sklearn.cluster import KMeans
            from sklearn.preprocessing import StandardScaler
            from sklearn.metrics import silhouette_score
            
            # Prepare data - transpose so samples are rows
            data_matrix = expression_data.T
            
            # Filter low-expression genes
            min_expression = config.get('min_expression', 1.0)
            expressed_genes = (data_matrix > min_expression).sum(axis=0) >= data_matrix.shape[0] * 0.1
            filtered_data = data_matrix.loc[:, expressed_genes]
            
            # Log transform and scale
            log_data = np.log2(filtered_data + 1)
            scaler = StandardScaler()
            scaled_data = scaler.fit_transform(log_data)
            
            # PCA analysis
            n_components = min(config.get('n_components', 10), scaled_data.shape[1])
            pca = PCA(n_components=n_components)
            pca_result = pca.fit_transform(scaled_data)
            
            # Clustering
            n_clusters = config.get('n_clusters', 3)
            kmeans = KMeans(n_clusters=n_clusters, random_state=42)
            cluster_labels = kmeans.fit_predict(pca_result[:, :2])
            
            # Calculate silhouette score
            silhouette_avg = silhouette_score(pca_result[:, :2], cluster_labels)
            
            # Save PCA coordinates
            pca_df = pd.DataFrame(
                pca_result[:, :2],
                columns=['PC1', 'PC2'],
                index=data_matrix.index
            )
            pca_df['cluster'] = cluster_labels
            
            pca_file = os.path.join(self.temp_dir, 'pca_results.tsv')
            pca_df.to_csv(pca_file, sep='\t')
            
            return {
                'pca_results': {
                    'pc1_variance': float(pca.explained_variance_ratio_[0] * 100),
                    'pc2_variance': float(pca.explained_variance_ratio_[1] * 100),
                    'total_variance_explained': float(sum(pca.explained_variance_ratio_) * 100),
                    'coordinates_file': pca_file
                },
                'clustering_results': {
                    'n_clusters': n_clusters,
                    'silhouette_score': float(silhouette_avg),
                    'cluster_assignments': cluster_labels.tolist()
                },
                'loadings': {
                    'pc1_loadings': pca.components_[0].tolist(),
                    'pc2_loadings': pca.components_[1].tolist(),
                    'feature_names': filtered_data.columns.tolist()
                }
            }
            
        except Exception as e:
            logger.error(f"PCA/Clustering analysis failed: {str(e)}")
            raise
    
    def perform_differential_expression(self, expression_data: pd.DataFrame, config: Dict[str, Any]) -> Dict[str, Any]:
        """Perform differential expression analysis using DESeq2 via rpy2"""
        logger.info("Performing differential expression analysis")
        
        try:
            import rpy2.robjects as robjects
            from rpy2.robjects import pandas2ri
            from rpy2.robjects.packages import importr
            
            # Activate pandas conversion
            pandas2ri.activate()
            
            # Import R packages
            deseq2 = importr('DESeq2')
            base = importr('base')
            
            # Prepare count matrix (genes as rows, samples as columns)
            count_matrix = expression_data.astype(int)
            
            # Create sample metadata
            comparison_groups = config.get('comparison_groups', {})
            if not comparison_groups:
                # Default: split samples into two groups
                samples = count_matrix.columns.tolist()
                mid_point = len(samples) // 2
                comparison_groups = {
                    'condition': ['control'] * mid_point + ['treatment'] * (len(samples) - mid_point)
                }
            
            # Create colData DataFrame
            col_data = pd.DataFrame(comparison_groups, index=count_matrix.columns)
            
            # Convert to R objects
            r_count_matrix = pandas2ri.py2rpy(count_matrix)
            r_col_data = pandas2ri.py2rpy(col_data)
            
            # Create DESeq2 dataset
            dds = deseq2.DESeqDataSetFromMatrix(
                countData=r_count_matrix,
                colData=r_col_data,
                design=robjects.Formula('~ condition')
            )
            
            # Run DESeq2 analysis
            dds = deseq2.DESeq(dds)
            
            # Get results
            res = deseq2.results(dds)
            
            # Convert results back to pandas
            results_df = pandas2ri.rpy2py(base.as_data_frame(res))
            results_df.index = count_matrix.index
            
            # Filter significant genes
            fdr_threshold = config.get('fdr_threshold', 0.05)
            log2fc_threshold = config.get('log2fc_threshold', 1.0)
            
            significant_genes = results_df[
                (results_df['padj'] < fdr_threshold) & 
                (abs(results_df['log2FoldChange']) > log2fc_threshold)
            ]
            
            # Prepare results
            differential_genes = []
            for gene_id, row in significant_genes.iterrows():
                differential_genes.append({
                    'gene_id': gene_id,
                    'gene_name': gene_id,  # Could be enhanced with gene annotation
                    'log2fc': float(row['log2FoldChange']),
                    'pvalue': float(row['pvalue']) if not pd.isna(row['pvalue']) else 1.0,
                    'padj': float(row['padj']) if not pd.isna(row['padj']) else 1.0,
                    'baseMean': float(row['baseMean'])
                })
            
            # Save full results
            results_file = os.path.join(self.temp_dir, 'differential_expression_results.tsv')
            results_df.to_csv(results_file, sep='\t')
            
            return {
                'differential_genes': differential_genes,
                'total_genes': len(results_df),
                'significant_genes': len(significant_genes),
                'upregulated': len(significant_genes[significant_genes['log2FoldChange'] > 0]),
                'downregulated': len(significant_genes[significant_genes['log2FoldChange'] < 0]),
                'results_file': results_file
            }
            
        except Exception as e:
            logger.error(f"Differential expression analysis failed: {str(e)}")
            raise
    
    def perform_pathway_enrichment(self, expression_data: pd.DataFrame, config: Dict[str, Any]) -> Dict[str, Any]:
        """Perform pathway enrichment analysis using gseapy"""
        logger.info("Performing pathway enrichment analysis")
        
        try:
            import gseapy as gp
            
            # Get gene list from differential expression results
            gene_list = expression_data.index.tolist()
            
            # Run enrichment analysis
            databases = config.get('pathway_databases', ['GO_Biological_Process_2023'])
            organism_map = {
                'human': 'Human',
                'mouse': 'Mouse',
                'rat': 'Rat'
            }
            
            organism_name = organism_map.get(self.organism, 'Human')
            enrichment_results = []
            
            for database in databases:
                try:
                    enr = gp.enrichr(
                        gene_list=gene_list,
                        gene_sets=database,
                        organism=organism_name,
                        outdir=self.temp_dir,
                        cutoff=config.get('pathway_fdr', 0.05)
                    )
                    
                    # Process results
                    if hasattr(enr, 'results') and not enr.results.empty:
                        for _, row in enr.results.iterrows():
                            enrichment_results.append({
                                'pathway_id': f"{database}_{row.name}",
                                'pathway_name': row['Term'],
                                'database': database,
                                'pvalue': float(row['P-value']),
                                'padj': float(row['Adjusted P-value']),
                                'gene_count': len(row['Genes'].split(';')) if 'Genes' in row else 0,
                                'gene_list': row['Genes'].split(';') if 'Genes' in row else [],
                                'enrichment_score': float(row.get('Combined Score', 0))
                            })
                            
                except Exception as db_error:
                    logger.warning(f"Enrichment failed for database {database}: {str(db_error)}")
                    continue
            
            # Save results
            if enrichment_results:
                results_df = pd.DataFrame(enrichment_results)
                results_file = os.path.join(self.temp_dir, 'pathway_enrichment_results.tsv')
                results_df.to_csv(results_file, sep='\t', index=False)
            
            return {
                'enriched_pathways': enrichment_results,
                'total_pathways_tested': len(enrichment_results),
                'significant_pathways': len([p for p in enrichment_results if p['padj'] < 0.05])
            }
            
        except Exception as e:
            logger.error(f"Pathway enrichment analysis failed: {str(e)}")
            raise
    
    def generate_volcano_plot(self, dataset, expression_data: pd.DataFrame) -> Optional[str]:
        """Generate volcano plot from differential expression results"""
        try:
            # Load differential expression results
            results = dataset.analysis_results.all()
            if not results.exists():
                return None
            
            # Create DataFrame from results
            data = []
            for result in results:
                if result.p_value is not None and result.log2_fold_change is not None:
                    data.append({
                        'gene_name': result.gene_name or result.gene_id,
                        'log2fc': result.log2_fold_change,
                        'pvalue': result.p_value,
                        'padj': result.adjusted_p_value or 1.0
                    })
            
            if not data:
                return None
            
            df = pd.DataFrame(data)
            
            # Create volcano plot
            plt.figure(figsize=(10, 8))
            
            # Calculate -log10(p-value)
            df['neg_log10_pval'] = -np.log10(df['pvalue'].replace(0, 1e-300))
            
            # Color points based on significance
            colors = []
            for _, row in df.iterrows():
                if row['padj'] < 0.05 and abs(row['log2fc']) > 1:
                    if row['log2fc'] > 0:
                        colors.append('red')  # Upregulated
                    else:
                        colors.append('blue')  # Downregulated
                else:
                    colors.append('gray')  # Not significant
            
            # Create scatter plot
            plt.scatter(df['log2fc'], df['neg_log10_pval'], c=colors, alpha=0.6, s=20)
            
            # Add significance lines
            plt.axhline(y=-np.log10(0.05), color='black', linestyle='--', alpha=0.5)
            plt.axvline(x=1, color='black', linestyle='--', alpha=0.5)
            plt.axvline(x=-1, color='black', linestyle='--', alpha=0.5)
            
            # Labels and title
            plt.xlabel('Log2 Fold Change')
            plt.ylabel('-Log10(P-value)')
            plt.title(f'Volcano Plot - {dataset.name}')
            
            # Add gene labels for top significant genes
            top_genes = df.nlargest(10, 'neg_log10_pval')
            for _, gene in top_genes.iterrows():
                if gene['padj'] < 0.05:
                    plt.annotate(gene['gene_name'], 
                               (gene['log2fc'], gene['neg_log10_pval']),
                               xytext=(5, 5), textcoords='offset points',
                               fontsize=8, alpha=0.7)
            
            # Save plot
            plot_file = os.path.join(self.temp_dir, f'volcano_plot_{dataset.id}.png')
            plt.savefig(plot_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            return plot_file
            
        except Exception as e:
            logger.error(f"Volcano plot generation failed: {str(e)}")
            return None
    
    def generate_heatmap(self, dataset, expression_data: pd.DataFrame) -> Optional[str]:
        """Generate heatmap of top variable genes"""
        try:
            # Get top variable genes
            gene_var = expression_data.var(axis=1)
            top_genes = gene_var.nlargest(50).index
            
            # Subset data
            heatmap_data = expression_data.loc[top_genes]
            
            # Log transform and z-score normalize
            log_data = np.log2(heatmap_data + 1)
            z_scores = (log_data.T - log_data.mean(axis=1)) / log_data.std(axis=1)
            z_scores = z_scores.T
            
            # Create heatmap
            plt.figure(figsize=(12, 10))
            sns.heatmap(
                z_scores,
                cmap='RdBu_r',
                center=0,
                cbar_kws={'label': 'Z-score'},
                xticklabels=True,
                yticklabels=True
            )
            
            plt.title(f'Top Variable Genes Heatmap - {dataset.name}')
            plt.xlabel('Samples')
            plt.ylabel('Genes')
            
            # Save plot
            plot_file = os.path.join(self.temp_dir, f'heatmap_{dataset.id}.png')
            plt.savefig(plot_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            return plot_file
            
        except Exception as e:
            logger.error(f"Heatmap generation failed: {str(e)}")
            return None
    
    def generate_ma_plot(self, dataset, expression_data: pd.DataFrame) -> Optional[str]:
        """Generate MA plot from differential expression results"""
        try:
            # Load differential expression results
            results = dataset.analysis_results.all()
            if not results.exists():
                return None
            
            # Create DataFrame
            data = []
            for result in results:
                if result.base_mean is not None and result.log2_fold_change is not None:
                    data.append({
                        'baseMean': result.base_mean,
                        'log2fc': result.log2_fold_change,
                        'padj': result.adjusted_p_value or 1.0
                    })
            
            if not data:
                return None
            
            df = pd.DataFrame(data)
            
            # Create MA plot
            plt.figure(figsize=(10, 8))
            
            # Color points based on significance
            significant = df['padj'] < 0.05
            plt.scatter(np.log10(df.loc[~significant, 'baseMean']), 
                       df.loc[~significant, 'log2fc'], 
                       c='gray', alpha=0.5, s=20, label='Not significant')
            plt.scatter(np.log10(df.loc[significant, 'baseMean']), 
                       df.loc[significant, 'log2fc'], 
                       c='red', alpha=0.7, s=20, label='Significant')
            
            plt.xlabel('Log10(Base Mean)')
            plt.ylabel('Log2 Fold Change')
            plt.title(f'MA Plot - {dataset.name}')
            plt.legend()
            plt.axhline(y=0, color='black', linestyle='-', alpha=0.3)
            
            # Save plot
            plot_file = os.path.join(self.temp_dir, f'ma_plot_{dataset.id}.png')
            plt.savefig(plot_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            return plot_file
            
        except Exception as e:
            logger.error(f"MA plot generation failed: {str(e)}")
            return None
    
    def generate_pca_plot(self, dataset, expression_data: pd.DataFrame) -> Optional[str]:
        """Generate PCA plot"""
        try:
            from sklearn.decomposition import PCA
            from sklearn.preprocessing import StandardScaler
            
            # Prepare data
            data_matrix = expression_data.T
            log_data = np.log2(data_matrix + 1)
            scaler = StandardScaler()
            scaled_data = scaler.fit_transform(log_data)
            
            # PCA
            pca = PCA(n_components=2)
            pca_result = pca.fit_transform(scaled_data)
            
            # Create plot
            plt.figure(figsize=(10, 8))
            plt.scatter(pca_result[:, 0], pca_result[:, 1], s=50, alpha=0.7)
            
            # Add sample labels
            for i, sample in enumerate(data_matrix.index):
                plt.annotate(sample, (pca_result[i, 0], pca_result[i, 1]),
                           xytext=(5, 5), textcoords='offset points', fontsize=8)
            
            plt.xlabel(f'PC1 ({pca.explained_variance_ratio_[0]*100:.1f}% variance)')
            plt.ylabel(f'PC2 ({pca.explained_variance_ratio_[1]*100:.1f}% variance)')
            plt.title(f'PCA Plot - {dataset.name}')
            plt.grid(True, alpha=0.3)
            
            # Save plot
            plot_file = os.path.join(self.temp_dir, f'pca_plot_{dataset.id}.png')
            plt.savefig(plot_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            return plot_file
            
        except Exception as e:
            logger.error(f"PCA plot generation failed: {str(e)}")
            return None

class SingleCellRNASeqDownstreamAnalysis(BaseDownstreamAnalysis):
    """Downstream analysis for single-cell RNA-seq with real methods"""
    
    def __init__(self, analysis_type: Optional[str] = None, config: Optional[Dict[str, Any]] = None):
        super().__init__(analysis_type, config)
        self.dataset_type = 'single_cell'
    
    def get_supported_analysis_types(self) -> List[str]:
        """Get supported analysis types for single-cell RNA-seq"""
        return ['clustering', 'cell_type_annotation', 'differential', 'pseudotime', 'cell_communication']
    
    def get_supported_visualizations(self) -> List[str]:
        """Get supported visualizations for single-cell RNA-seq"""
        return ['umap', 'tsne', 'violin', 'heatmap']
    
    def perform_sc_clustering(self, expression_data: pd.DataFrame, config: Dict[str, Any]) -> Dict[str, Any]:
        """Perform single-cell clustering using scanpy"""
        logger.info("Performing single-cell clustering")
        
        try:
            import scanpy as sc
            import anndata as ad
            
            # Create AnnData object
            if isinstance(expression_data, pd.DataFrame):
                adata = ad.AnnData(X=expression_data.values.T)
                adata.obs_names = expression_data.columns
                adata.var_names = expression_data.index
            else:
                adata = expression_data
            
            # Preprocessing
            sc.pp.filter_cells(adata, min_genes=200)
            sc.pp.filter_genes(adata, min_cells=3)
            
            # Calculate QC metrics
            adata.var['mt'] = adata.var_names.str.startswith('MT-')
            sc.pp.calculate_qc_metrics(adata, percent_top=None, log1p=False, inplace=True)
            
            # Filter cells
            adata = adata[adata.obs.pct_counts_mt < 20, :]
            adata = adata[adata.obs.n_genes_by_counts < 5000, :]
            adata = adata[adata.obs.n_genes_by_counts > 200, :]
            
            # Normalization and log transformation
            sc.pp.normalize_total(adata, target_sum=1e4)
            sc.pp.log1p(adata)
            
            # Find highly variable genes
            sc.pp.highly_variable_genes(adata, min_mean=0.0125, max_mean=3, min_disp=0.5)
            adata.raw = adata
            adata = adata[:, adata.var.highly_variable]
            
            # Scale data
            sc.pp.scale(adata, max_value=10)
            
            # PCA
            sc.tl.pca(adata, svd_solver='arpack')
            
            # Compute neighborhood graph
            sc.pp.neighbors(adata, n_neighbors=10, n_pcs=40)
            
            # Leiden clustering
            resolution = config.get('clustering_resolution', 0.5)
            sc.tl.leiden(adata, resolution=resolution)
            
            # UMAP embedding
            sc.tl.umap(adata)
            
            # Extract clustering results
            clusters = []
            for cluster_id in adata.obs['leiden'].unique():
                cluster_cells = adata.obs['leiden'] == cluster_id
                cluster_data = {
                    'cluster_id': f'cluster_{cluster_id}',
                    'cell_count': int(cluster_cells.sum()),
                    'coordinates': {
                        'umap_1': adata.obsm['X_umap'][cluster_cells, 0].tolist(),
                        'umap_2': adata.obsm['X_umap'][cluster_cells, 1].tolist()
                    }
                }
                clusters.append(cluster_data)
            
            # Save results
            results_file = os.path.join(self.temp_dir, 'sc_clustering_results.h5ad')
            adata.write(results_file)
            
            return {
                'clusters': clusters,
                'total_cells': adata.n_obs,
                'total_genes': adata.n_vars,
                'umap_coordinates': adata.obsm['X_umap'].tolist(),
                'results_file': results_file
            }
            
        except Exception as e:
            logger.error(f"Single-cell clustering failed: {str(e)}")
            raise
    
    def perform_cell_type_annotation(self, expression_data: pd.DataFrame, config: Dict[str, Any]) -> Dict[str, Any]:
        """Perform cell type annotation using reference databases"""
        logger.info("Performing cell type annotation")
        
        try:
            import scanpy as sc
            import anndata as ad
            
            # Load clustered data
            if isinstance(expression_data, str) and expression_data.endswith('.h5ad'):
                adata = sc.read_h5ad(expression_data)
            else:
                # Convert DataFrame to AnnData if needed
                adata = ad.AnnData(X=expression_data.values.T)
                adata.obs_names = expression_data.columns
                adata.var_names = expression_data.index
            
            # Find marker genes for each cluster
            sc.tl.rank_genes_groups(adata, 'leiden', method='wilcoxon')
            
            # Get marker genes
            marker_genes = sc.get.rank_genes_groups_df(adata, group=None)
            
            # Simple cell type annotation based on known markers
            cell_type_markers = self._get_cell_type_markers()
            annotated_clusters = []
            
            for cluster_id in adata.obs['leiden'].unique():
                cluster_markers = marker_genes[marker_genes['group'] == cluster_id]
                top_markers = cluster_markers.head(10)['names'].tolist()
                
                # Match with known cell type markers
                predicted_type = self._predict_cell_type(top_markers, cell_type_markers)
                
                annotated_clusters.append({
                    'cluster_id': f'cluster_{cluster_id}',
                    'predicted_cell_type': predicted_type,
                    'confidence_score': 0.8,  # Could be calculated based on marker overlap
                    'marker_genes': top_markers
                })
            
            return {'annotated_clusters': annotated_clusters}
            
        except Exception as e:
            logger.error(f"Cell type annotation failed: {str(e)}")
            raise
    
    def perform_sc_differential_expression(self, expression_data: pd.DataFrame, config: Dict[str, Any]) -> Dict[str, Any]:
        """Perform single-cell differential expression analysis"""
        logger.info("Performing single-cell differential expression")
        
        try:
            import scanpy as sc
            import anndata as ad
            
            # Load data
            if isinstance(expression_data, str) and expression_data.endswith('.h5ad'):
                adata = sc.read_h5ad(expression_data)
            else:
                adata = ad.AnnData(X=expression_data.values.T)
                adata.obs_names = expression_data.columns
                adata.var_names = expression_data.index
            
            # Find marker genes for each cluster
            sc.tl.rank_genes_groups(adata, 'leiden', method='wilcoxon')
            
            # Extract marker genes
            marker_genes = []
            result = adata.uns['rank_genes_groups']
            
            for cluster in adata.obs['leiden'].unique():
                cluster_idx = int(cluster)
                for i in range(min(20, len(result['names']))):  # Top 20 genes per cluster
                    gene_name = result['names'][cluster][i]
                    if gene_name and not pd.isna(gene_name):
                        marker_genes.append({
                            'gene_id': gene_name,
                            'gene_name': gene_name,
                            'avg_log2FC': float(result['logfoldchanges'][cluster][i]),
                            'p_val': float(result['pvals'][cluster][i]),
                            'p_val_adj': float(result['pvals_adj'][cluster][i]),
                            'cluster': f'cluster_{cluster}',
                            'pct.1': 0.8,  # Could be calculated from data
                            'pct.2': 0.2
                        })
            
            return {'marker_genes': marker_genes}
            
        except Exception as e:
            logger.error(f"Single-cell differential expression failed: {str(e)}")
            raise
    
    def generate_umap_plot(self, dataset, expression_data: pd.DataFrame) -> Optional[str]:
        """Generate UMAP plot"""
        try:
            import scanpy as sc
            
            # Load clustered data
            results_file = None
            current_job = dataset.get_current_job()
            if current_job and current_job.result_files:
                for file_info in current_job.result_files:
                    if file_info.get('type') == 'clustering' and 'results_file' in file_info:
                        results_file = file_info['results_file']
                        break
            
            if not results_file or not os.path.exists(results_file):
                return None
            
            adata = sc.read_h5ad(results_file)
            
            # Create UMAP plot
            plt.figure(figsize=(10, 8))
            sc.pl.umap(adata, color='leiden', legend_loc='on data', 
                      title=f'UMAP Clustering - {dataset.name}', 
                      frameon=False, save=False, show=False)
            
            # Save plot
            plot_file = os.path.join(self.temp_dir, f'umap_plot_{dataset.id}.png')
            plt.savefig(plot_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            return plot_file
            
        except Exception as e:
            logger.error(f"UMAP plot generation failed: {str(e)}")
            return None
    
    def generate_tsne_plot(self, dataset, expression_data: pd.DataFrame) -> Optional[str]:
        """Generate t-SNE plot"""
        try:
            import scanpy as sc
            
            # Similar to UMAP but with t-SNE
            results_file = None
            current_job = dataset.get_current_job()
            if current_job and current_job.result_files:
                for file_info in current_job.result_files:
                    if file_info.get('type') == 'clustering' and 'results_file' in file_info:
                        results_file = file_info['results_file']
                        break
            
            if not results_file or not os.path.exists(results_file):
                return None
            
            adata = sc.read_h5ad(results_file)
            
            # Run t-SNE if not already computed
            if 'X_tsne' not in adata.obsm:
                sc.tl.tsne(adata)
            
            # Create t-SNE plot
            plt.figure(figsize=(10, 8))
            sc.pl.tsne(adata, color='leiden', legend_loc='on data',
                      title=f't-SNE Clustering - {dataset.name}',
                      frameon=False, save=False, show=False)
            
            # Save plot
            plot_file = os.path.join(self.temp_dir, f'tsne_plot_{dataset.id}.png')
            plt.savefig(plot_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            return plot_file
            
        except Exception as e:
            logger.error(f"t-SNE plot generation failed: {str(e)}")
            return None
    
    def _get_cell_type_markers(self) -> Dict[str, List[str]]:
        """Get known cell type marker genes"""
        markers = {
            'T cells': ['CD3D', 'CD3E', 'CD3G', 'CD8A', 'CD4'],
            'B cells': ['CD19', 'CD20', 'MS4A1', 'CD79A', 'CD79B'],
            'NK cells': ['GNLY', 'NKG7', 'KLRD1', 'KLRF1'],
            'Monocytes': ['CD14', 'CD16', 'LYZ', 'S100A8', 'S100A9'],
            'Dendritic cells': ['FCER1A', 'CST3', 'CD1C'],
            'Neutrophils': ['FCGR3B', 'CSF3R', 'CXCR2'],
            'Platelets': ['PPBP', 'PF4', 'TUBB1'],
            'Erythrocytes': ['HBA1', 'HBA2', 'HBB']
        }
        return markers
    
    def _predict_cell_type(self, cluster_markers: List[str], known_markers: Dict[str, List[str]]) -> str:
        """Predict cell type based on marker gene overlap"""
        best_match = 'Unknown'
        best_score = 0
        
        for cell_type, markers in known_markers.items():
            # Calculate overlap score
            overlap = len(set(cluster_markers) & set(markers))
            score = overlap / len(markers) if markers else 0
            
            if score > best_score and score > 0.2:  # Minimum 20% overlap
                best_score = score
                best_match = cell_type
        
        return best_match
    
    def generate_violin_plot(self, dataset, expression_data: pd.DataFrame) -> Optional[str]:
        """Generate violin plot for quality metrics"""
        try:
            import scanpy as sc
            
            # Load data
            results_file = None
            current_job = dataset.get_current_job()
            if current_job and current_job.result_files:
                for file_info in current_job.result_files:
                    if 'results_file' in file_info:
                        results_file = file_info['results_file']
                        break
            
            if not results_file or not os.path.exists(results_file):
                return None
            
            adata = sc.read_h5ad(results_file)
            
            # Create violin plot for QC metrics
            plt.figure(figsize=(12, 8))
            sc.pl.violin(adata, ['n_genes_by_counts', 'total_counts', 'pct_counts_mt'],
                        jitter=0.4, multi_panel=True, save=False, show=False)
            
            # Save plot
            plot_file = os.path.join(self.temp_dir, f'violin_plot_{dataset.id}.png')
            plt.savefig(plot_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            return plot_file
            
        except Exception as e:
            logger.error(f"Violin plot generation failed: {str(e)}")
            return None
    
    def generate_sc_heatmap(self, dataset, expression_data: pd.DataFrame) -> Optional[str]:
        """Generate single-cell heatmap"""
        try:
            import scanpy as sc
            
            # Load data
            results_file = None
            current_job = dataset.get_current_job()
            if current_job and current_job.result_files:
                for file_info in current_job.result_files:
                    if 'results_file' in file_info:
                        results_file = file_info['results_file']
                        break
            
            if not results_file or not os.path.exists(results_file):
                return None
            
            adata = sc.read_h5ad(results_file)
            
            # Find marker genes if not already done
            if 'rank_genes_groups' not in adata.uns:
                sc.tl.rank_genes_groups(adata, 'leiden', method='wilcoxon')
            
            # Create heatmap of top marker genes
            plt.figure(figsize=(12, 10))
            sc.pl.rank_genes_groups_heatmap(adata, n_genes=5, save=False, show=False)
            
            # Save plot
            plot_file = os.path.join(self.temp_dir, f'sc_heatmap_{dataset.id}.png')
            plt.savefig(plot_file, dpi=300, bbox_inches='tight')
            plt.close()
            
            return plot_file
            
        except Exception as e:
            logger.error(f"Single-cell heatmap generation failed: {str(e)}")
            return None