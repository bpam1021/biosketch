import openai
import os
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class RNASeqAIService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    def interpret_pca_clustering(self, pca_data: Dict[str, Any], clustering_data: Dict[str, Any], 
                                metadata: Dict[str, Any], user_hypothesis: str = "") -> str:
        """Generate AI interpretation for PCA and clustering results"""
        try:
            prompt = f"""
            As a bioinformatics expert, interpret these RNA-seq PCA and clustering results:
            
            PCA Results:
            - PC1 explains {pca_data.get('pc1_variance', 0):.1f}% of variance
            - PC2 explains {pca_data.get('pc2_variance', 0):.1f}% of variance
            - Total samples: {pca_data.get('n_samples', 0)}
            
            Clustering Results:
            - Number of clusters: {clustering_data.get('n_clusters', 0)}
            - Silhouette score: {clustering_data.get('silhouette_score', 0):.2f}
            
            Sample Conditions: {', '.join(metadata.get('conditions', []))}
            
            User Hypothesis: {user_hypothesis or 'No specific hypothesis provided'}
            
            Please provide:
            1. Interpretation of the PCA variance explained
            2. Assessment of sample clustering quality
            3. Biological significance of the clustering pattern
            4. How this relates to the experimental conditions
            5. Validation or refinement of the user's hypothesis
            
            Keep the response scientific but accessible, around 200-300 words.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"AI interpretation failed: {e}")
            return "AI interpretation temporarily unavailable. Please check your results manually."
    
    def interpret_differential_expression(self, deg_data: Dict[str, Any], metadata: Dict[str, Any]) -> str:
        """Generate AI interpretation for differential expression results"""
        try:
            prompt = f"""
            Interpret these differential expression analysis results:
            
            Results Summary:
            - Total genes analyzed: {deg_data.get('total_genes', 0):,}
            - Significantly upregulated: {deg_data.get('upregulated', 0):,}
            - Significantly downregulated: {deg_data.get('downregulated', 0):,}
            
            Top upregulated genes: {', '.join(deg_data.get('top_up_genes', []))}
            Top downregulated genes: {', '.join(deg_data.get('top_down_genes', []))}
            
            Experimental conditions: {', '.join(metadata.get('conditions', []))}
            
            Please provide:
            1. Overall assessment of the differential expression pattern
            2. Biological significance of the number of DEGs
            3. Potential functional implications of top changed genes
            4. Suggestions for follow-up analyses
            5. Quality assessment of the results
            
            Provide a scientific interpretation in 250-350 words.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=600
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"AI interpretation failed: {e}")
            return "AI interpretation temporarily unavailable. Please check your results manually."
    
    def interpret_pathway_enrichment(self, pathway_data: Dict[str, Any], deg_data: Dict[str, Any]) -> str:
        """Generate AI interpretation for pathway enrichment results"""
        try:
            top_pathways_text = "\n".join([
                f"- {p['name']}: {p['genes']} genes, p-value: {p['p_value']:.3f}"
                for p in pathway_data.get('top_pathways', [])
            ])
            
            prompt = f"""
            Interpret these pathway enrichment analysis results:
            
            Enrichment Summary:
            - Total pathways tested: {pathway_data.get('total_pathways', 0)}
            - Significantly enriched pathways: {pathway_data.get('significant_pathways', 0)}
            - Input genes: {deg_data.get('upregulated', 0) + deg_data.get('downregulated', 0)} DEGs
            
            Top enriched pathways:
            {top_pathways_text}
            
            Please provide:
            1. Biological interpretation of the enriched pathways
            2. How these pathways relate to each other
            3. Potential disease or phenotype associations
            4. Mechanistic insights from the pathway analysis
            5. Recommendations for experimental validation
            
            Provide a comprehensive interpretation in 300-400 words.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=700
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"AI interpretation failed: {e}")
            return "AI interpretation temporarily unavailable. Please check your results manually."
    
    def interpret_scrna_clustering(self, clustering_data: Dict[str, Any], metadata: Dict[str, Any]) -> str:
        """Generate AI interpretation for single-cell clustering results"""
        try:
            prompt = f"""
            Interpret these single-cell RNA-seq clustering results:
            
            Clustering Summary:
            - Total cells analyzed: {clustering_data.get('total_cells', 0):,}
            - Number of clusters identified: {clustering_data.get('n_clusters', 0)}
            - Clustering resolution: {clustering_data.get('resolution', 0.5)}
            
            Sample information: {metadata.get('sample_type', 'Unknown')}
            Treatment condition: {metadata.get('treatment', 'Unknown')}
            
            Please provide:
            1. Assessment of clustering quality and cell number
            2. Expected cell types for this tissue/sample type
            3. Biological significance of the cluster number
            4. Recommendations for cell type annotation
            5. Suggestions for downstream analyses
            
            Provide insights in 250-350 words suitable for researchers.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=600
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"AI interpretation failed: {e}")
            return "AI interpretation temporarily unavailable. Please check your results manually."
    
    def suggest_analysis_steps(self, dataset_type: str, current_step: str, results_summary: Dict[str, Any]) -> str:
        """Suggest next analysis steps based on current results"""
        try:
            prompt = f"""
            Based on this {dataset_type} RNA-seq analysis at step '{current_step}', suggest next steps:
            
            Current Results Summary:
            {results_summary}
            
            Provide 3-5 specific, actionable next steps for this analysis, considering:
            1. Standard RNA-seq analysis workflows
            2. Quality of current results
            3. Biological relevance
            4. Statistical rigor
            
            Format as a numbered list with brief explanations.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=400
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"AI suggestion failed: {e}")
            return "AI suggestions temporarily unavailable."
    
    def generate_hypothesis(self, dataset_info: Dict[str, Any], preliminary_results: Dict[str, Any] = None) -> str:
        """Generate research hypotheses based on dataset information"""
        try:
            prompt = f"""
            Generate research hypotheses for this RNA-seq experiment:
            
            Dataset Information:
            - Type: {dataset_info.get('dataset_type', 'Unknown')}
            - Organism: {dataset_info.get('organism', 'Unknown')}
            - Conditions: {dataset_info.get('conditions', [])}
            - Sample description: {dataset_info.get('description', 'No description')}
            
            {f"Preliminary results: {preliminary_results}" if preliminary_results else ""}
            
            Generate 3-4 testable hypotheses that could be addressed with this data:
            1. Focus on biological mechanisms
            2. Consider the experimental design
            3. Suggest specific genes/pathways to investigate
            4. Include both positive and negative controls where applicable
            
            Format as numbered hypotheses with brief rationales.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
                max_tokens=500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Hypothesis generation failed: {e}")
            return "Hypothesis generation temporarily unavailable."

# Global instance
ai_service = RNASeqAIService()