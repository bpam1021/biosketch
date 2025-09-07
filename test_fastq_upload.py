#!/usr/bin/env python3
"""
Test script to verify FASTQ file upload functionality
"""
import os
import sys
import django
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile

# Add the project root to Python path
project_root = os.path.join(os.path.dirname(__file__), 'ai_imagegen_backend')
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'science_image_gen.settings')
django.setup()

from django.contrib.auth.models import User
from rnaseq.serializers import CreateAnalysisJobSerializer

def test_fastq_upload():
    """Test FASTQ file upload handling in CreateAnalysisJobSerializer"""
    print("Testing FASTQ file upload in CreateAnalysisJobSerializer...")
    
    # Create test user
    user, created = User.objects.get_or_create(username='test_user', defaults={
        'email': 'test@example.com',
        'password': 'test_password'
    })
    
    # Create mock FASTQ files
    fastq1_content = b"@seq1\nACGTACGT\n+\n########\n"
    fastq2_content = b"@seq2\nTGCATGCA\n+\n########\n"
    
    fastq1 = SimpleUploadedFile(
        name="sample_R1.fastq.gz",
        content=fastq1_content,
        content_type='application/gzip'
    )
    
    fastq2 = SimpleUploadedFile(
        name="sample_R2.fastq.gz", 
        content=fastq2_content,
        content_type='application/gzip'
    )
    
    # Test data
    data = {
        'name': 'Test RNA-seq Analysis',
        'description': 'Test description',
        'dataset_type': 'bulk',
        'organism': 'human',
        'selected_pipeline_stage': 'upstream',
        'is_multi_sample': False,
        'sample_count': 1,
        'user_hypothesis': 'Test hypothesis',
        'enable_ai_interpretation': True,
        'processing_config': {},
        'fastq_files': [fastq1, fastq2]
    }
    
    # Test serializer
    try:
        serializer = CreateAnalysisJobSerializer(data=data)
        
        if serializer.is_valid():
            print("✓ Serializer validation passed")
            
            # Test job creation
            job = serializer.save(user=user)
            print(f"✓ Job created successfully with ID: {job.id}")
            print(f"✓ FASTQ files stored: {len(job.fastq_files)} pairs")
            
            # Verify file data
            for pair in job.fastq_files:
                print(f"  - Sample {pair['sample_id']}: R1={pair['r1_file']}, R2={pair['r2_file']}")
                
            print("✓ All tests passed!")
            
            # Cleanup
            job.delete()
            
        else:
            print("✗ Serializer validation failed:")
            for field, errors in serializer.errors.items():
                print(f"  {field}: {errors}")
            
    except Exception as e:
        print(f"✗ Test failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_fastq_upload()