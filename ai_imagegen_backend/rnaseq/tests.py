from django.test import TestCase
from django.contrib.auth.models import User
from .models import RNASeqDataset, RNASeqAnalysisResult

class RNASeqModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_create_rnaseq_dataset(self):
        dataset = RNASeqDataset.objects.create(
            user=self.user,
            name='Test Dataset',
            description='Test description',
            organism='human',
            analysis_type='differential'
        )
        self.assertEqual(dataset.name, 'Test Dataset')
        self.assertEqual(dataset.user, self.user)
        self.assertEqual(dataset.status, 'pending')

    def test_create_analysis_result(self):
        dataset = RNASeqDataset.objects.create(
            user=self.user,
            name='Test Dataset',
            organism='human'
        )
        
        result = RNASeqAnalysisResult.objects.create(
            dataset=dataset,
            gene_id='ENSG00000000003',
            gene_name='TSPAN6',
            log2_fold_change=1.5,
            p_value=0.001,
            adjusted_p_value=0.01
        )
        
        self.assertEqual(result.gene_id, 'ENSG00000000003')
        self.assertEqual(result.dataset, dataset)