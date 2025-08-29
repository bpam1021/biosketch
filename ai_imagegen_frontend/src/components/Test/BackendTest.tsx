import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

interface BackendTestProps {}

const BackendTest: React.FC<BackendTestProps> = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runTest = async (testName: string, url: string, method: string = 'GET', data?: any) => {
    setResults(prev => [...prev, { test: testName, status: 'running', url }]);
    
    try {
      const config: any = { method, url };
      if (data) config.data = data;
      
      const response = await axiosClient(config);
      
      setResults(prev => prev.map(r => 
        r.test === testName && r.status === 'running' 
          ? { ...r, status: 'success', data: response.data, statusCode: response.status }
          : r
      ));
    } catch (error: any) {
      setResults(prev => prev.map(r => 
        r.test === testName && r.status === 'running' 
          ? { 
              ...r, 
              status: 'error', 
              error: error.message, 
              statusCode: error.response?.status,
              details: error.response?.data 
            }
          : r
      ));
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults([]);

    // Test 1: Basic Django server
    await runTest('Django Server Health', 'users/');

    // Test 2: Templates endpoint
    await runTest('Templates Endpoint', 'v2/presentation-types/templates/');

    // Test 3: Create document endpoint 
    await runTest('Create Document Test', 'v2/presentation-types/create_document/', 'POST', {
      title: 'Test Document',
      formatting: { fontSize: 16 }
    });

    // Test 4: AI Generation endpoint
    await runTest('AI Generation Test', 'v2/presentation-types/generate_document_ai/', 'POST', {
      prompt: 'Create a simple business report about market trends',
      document_type: 'business'
    });

    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Backend Connectivity Test</h1>
      
      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md mr-4 disabled:opacity-50"
        >
          {loading ? 'Running Tests...' : 'Run All Tests'}
        </button>
        
        <button
          onClick={clearResults}
          className="bg-gray-500 text-white px-4 py-2 rounded-md"
        >
          Clear Results
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div 
            key={index}
            className={`p-4 border rounded-lg ${
              result.status === 'success' ? 'border-green-500 bg-green-50' :
              result.status === 'error' ? 'border-red-500 bg-red-50' :
              'border-yellow-500 bg-yellow-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{result.test}</h3>
              <div className="flex items-center gap-2">
                {result.status === 'success' && (
                  <span className="text-green-600 font-medium">✓ Success</span>
                )}
                {result.status === 'error' && (
                  <span className="text-red-600 font-medium">✗ Failed</span>
                )}
                {result.status === 'running' && (
                  <span className="text-yellow-600 font-medium">⏳ Running</span>
                )}
                {result.statusCode && (
                  <span className="text-gray-500 text-sm">({result.statusCode})</span>
                )}
              </div>
            </div>
            
            <div className="text-sm text-gray-600 mb-2">
              URL: <code className="bg-gray-100 px-1 rounded">{result.url}</code>
            </div>
            
            {result.error && (
              <div className="text-red-600 text-sm">
                <strong>Error:</strong> {result.error}
              </div>
            )}
            
            {result.details && (
              <div className="mt-2">
                <strong>Response Details:</strong>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mt-1">
                  {typeof result.details === 'string' ? result.details : JSON.stringify(result.details, null, 2)}
                </pre>
              </div>
            )}
            
            {result.data && (
              <div className="mt-2">
                <strong>Response Data:</strong>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mt-1 max-h-48">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {results.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          Click "Run All Tests" to check backend connectivity
        </div>
      )}
    </div>
  );
};

export default BackendTest;