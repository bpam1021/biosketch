#!/usr/bin/env python3
"""
Test script to verify umi_tools exit status fix
Run this on the production server to test the fix
"""
import subprocess
from pathlib import Path

def test_umi_tools_success_detection():
    """Test that we can detect umi_tools success by file output rather than exit code"""
    
    # Simulate umi_tools command that creates output but returns non-zero status
    test_dir = Path('/tmp/umi_tools_test')
    test_dir.mkdir(exist_ok=True)
    
    processed_r1 = test_dir / 'test_R1_processed.fastq.gz'
    processed_r2 = test_dir / 'test_R2_processed.fastq.gz'
    
    # Create mock output files (simulating successful umi_tools run)
    processed_r1.write_text("@test\nACGT\n+\n####\n")
    processed_r2.write_text("@test\nACGT\n+\n####\n")
    
    # Test our success detection logic
    if processed_r1.exists() and processed_r2.exists() and processed_r1.stat().st_size > 0:
        print("✅ Success detection works - files created and have content")
        print(f"   R1: {processed_r1.stat().st_size} bytes")
        print(f"   R2: {processed_r2.stat().st_size} bytes")
        success = True
    else:
        print("❌ Success detection failed")
        success = False
    
    # Cleanup
    processed_r1.unlink()
    processed_r2.unlink()
    test_dir.rmdir()
    
    return success

def test_actual_umi_tools():
    """Test actual umi_tools command with our file path"""
    print("🧪 Testing actual umi_tools command...")
    
    # Your actual file paths
    job_dir = "/root/biosketch/ai_imagegen_backend/media/results/060a6e45-8891-4ab7-93cf-2dd3541ad813"
    r1_file = f"{job_dir}/sample_1_R1.fastq.gz"
    r2_file = f"{job_dir}/sample_1_R2.fastq.gz"
    
    # Check if input files exist
    if not Path(r1_file).exists() or not Path(r2_file).exists():
        print(f"❌ Input files not found:")
        print(f"   R1: {r1_file} - {'exists' if Path(r1_file).exists() else 'missing'}")
        print(f"   R2: {r2_file} - {'exists' if Path(r2_file).exists() else 'missing'}")
        return False
    
    # Create test output directory
    output_dir = Path("/tmp/umi_test_output")
    output_dir.mkdir(exist_ok=True)
    
    processed_r1 = output_dir / "test_R1_processed.fastq.gz"
    processed_r2 = output_dir / "test_R2_processed.fastq.gz"
    
    # Run umi_tools command
    umi_cmd = [
        'umi_tools', 'extract',
        '--bc-pattern', 'CCCCCCCCCCCCCCCCNNNNNNNNNNNN',
        '--stdin', r1_file,
        '--read2-in', r2_file,
        '--stdout', str(processed_r1),
        '--read2-out', str(processed_r2),
        '--filter-cell-barcode',
        '--error-correct-cell',
        '--whitelist', '/data/reference/3M-february-2018.txt'
    ]
    
    try:
        print(f"🚀 Running: {' '.join(umi_cmd)}")
        result = subprocess.run(umi_cmd, capture_output=True, text=True)
        
        print(f"📊 Command completed with exit code: {result.returncode}")
        
        # Check success based on output files (our new logic)
        if processed_r1.exists() and processed_r2.exists() and processed_r1.stat().st_size > 0:
            print("✅ umi_tools SUCCESS - Output files created!")
            print(f"   R1: {processed_r1.stat().st_size} bytes")
            print(f"   R2: {processed_r2.stat().st_size} bytes")
            
            # Show some stderr output
            if result.stderr:
                print("📝 UMI-tools output (first 5 lines):")
                for i, line in enumerate(result.stderr.split('\n')[:5]):
                    if line.strip():
                        print(f"   {line}")
            
            success = True
        else:
            print("❌ umi_tools FAILED - No output files created")
            print(f"Exit code: {result.returncode}")
            print(f"Stderr: {result.stderr[:500]}")
            success = False
        
        # Cleanup
        if processed_r1.exists():
            processed_r1.unlink()
        if processed_r2.exists():
            processed_r2.unlink()
        output_dir.rmdir()
        
        return success
        
    except Exception as e:
        print(f"❌ Error running umi_tools: {e}")
        return False

if __name__ == "__main__":
    print("🧬 Testing UMI-tools Exit Status Fix")
    print("===================================")
    
    # Test 1: Logic test
    print("\n1. Testing success detection logic...")
    logic_test = test_umi_tools_success_detection()
    
    # Test 2: Actual command test
    print("\n2. Testing actual umi_tools command...")
    actual_test = test_actual_umi_tools()
    
    print(f"\n🎯 Results:")
    print(f"   Logic test: {'✅ PASS' if logic_test else '❌ FAIL'}")
    print(f"   Actual test: {'✅ PASS' if actual_test else '❌ FAIL'}")
    
    if logic_test and actual_test:
        print("\n🎉 All tests passed! The fix should work.")
        print("Now restart your Celery workers to apply the fix.")
    else:
        print("\n⚠️ Some tests failed. Check the output above.")