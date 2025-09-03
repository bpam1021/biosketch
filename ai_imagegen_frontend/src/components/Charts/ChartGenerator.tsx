import React, { useState, useEffect } from 'react';
import { 
  FiBarChart, FiTrendingUp, FiPieChart, FiCircle, FiActivity, 
  FiTarget, FiGrid, FiMap, FiLayers, FiZap, FiBox, FiMaximize2,
  FiImage, FiUpload, FiX, FiMove
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import axios from '../../api/axiosClient';

interface ChartType {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  category: string;
  sampleData: any;
  sampleConfig: any;
  aiPrompt: string;
}

interface ChartGeneratorProps {
  selectedText: string;
  onChartGenerate: (chartType: string, data: any, config: any, aiPrompt: string) => Promise<void>;
  onClose: () => void;
  isVisible: boolean;
  editMode?: boolean;
  existingChart?: {
    id: string;
    title: string;
    chart_type: string;
    data: any;
    config: any;
    styling: any;
  };
  onChartUpdate?: (chartId: string, updatedData: any, updatedConfig: any) => Promise<void>;
}

const ChartGenerator: React.FC<ChartGeneratorProps> = ({
  selectedText,
  onChartGenerate,
  onClose,
  isVisible,
  editMode = false,
  existingChart,
  onChartUpdate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('data_viz');
  const [selectedChart, setSelectedChart] = useState<ChartType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [editData, setEditData] = useState<any>(null);
  const [editConfig, setEditConfig] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageElements, setImageElements] = useState<any[]>([]);

  const chartTypes: ChartType[] = [
    // Data Visualization
    {
      id: 'bar_chart',
      name: 'Bar Chart',
      icon: <FiBarChart size={24} />,
      description: 'Compare categories or show changes over time',
      category: 'data_viz',
      sampleData: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Revenue',
          data: [12000, 19000, 15000, 22000],
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
        }]
      },
      sampleConfig: {
        type: 'bar',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value: any) {
                return '$' + value.toLocaleString();
              }
            }
          }
        }
      },
      aiPrompt: 'Create a bar chart to visualize and compare the data from: '
    },
    {
      id: 'line_chart',
      name: 'Line Chart',
      icon: <FiTrendingUp size={24} />,
      description: 'Show trends and changes over time',
      category: 'data_viz',
      sampleData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Sales Growth',
          data: [10, 20, 15, 30, 25, 40],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      sampleConfig: {
        type: 'line',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        }
      },
      aiPrompt: 'Create a line chart to show trends and patterns in: '
    },
    {
      id: 'pie_chart',
      name: 'Pie Chart',
      icon: <FiPieChart size={24} />,
      description: 'Show proportions and percentages',
      category: 'data_viz',
      sampleData: {
        labels: ['Marketing', 'Sales', 'Development', 'Support'],
        datasets: [{
          data: [30, 25, 35, 10],
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
        }]
      },
      sampleConfig: {
        type: 'pie',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      },
      aiPrompt: 'Create a pie chart to show the proportional breakdown of: '
    },
    {
      id: 'doughnut_chart',
      name: 'Doughnut Chart',
      icon: <FiCircle size={24} />,
      description: 'Modern pie chart with center space',
      category: 'data_viz',
      sampleData: {
        labels: ['Desktop', 'Mobile', 'Tablet'],
        datasets: [{
          data: [55, 35, 10],
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B']
        }]
      },
      sampleConfig: {
        type: 'doughnut',
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%'
      },
      aiPrompt: 'Create a doughnut chart to visualize the distribution of: '
    },
    {
      id: 'scatter_plot',
      name: 'Scatter Plot',
      icon: <FiActivity size={24} />,
      description: 'Show correlations between two variables',
      category: 'data_viz',
      sampleData: {
        datasets: [{
          label: 'Sales vs Marketing Spend',
          data: [
            { x: 1000, y: 5000 },
            { x: 2000, y: 8000 },
            { x: 3000, y: 12000 },
            { x: 4000, y: 15000 }
          ],
          backgroundColor: '#3B82F6'
        }]
      },
      sampleConfig: {
        type: 'scatter',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom'
          }
        }
      },
      aiPrompt: 'Create a scatter plot to show correlations in: '
    },

    // Process & Flow
    {
      id: 'flowchart',
      name: 'Flowchart',
      icon: <FiLayers size={24} />,
      description: 'Show process steps and decision points',
      category: 'process',
      sampleData: {
        nodes: [
          { id: '1', label: 'Start', type: 'start' },
          { id: '2', label: 'Process Data', type: 'process' },
          { id: '3', label: 'Valid?', type: 'decision' },
          { id: '4', label: 'End', type: 'end' }
        ],
        edges: [
          { from: '1', to: '2' },
          { from: '2', to: '3' },
          { from: '3', to: '4', label: 'Yes' },
          { from: '3', to: '2', label: 'No' }
        ]
      },
      sampleConfig: {
        type: 'flowchart',
        responsive: true,
        layout: 'hierarchical'
      },
      aiPrompt: 'Create a flowchart to map out the process described in: '
    },

    // Business & Strategy
    {
      id: 'comparison_table',
      name: 'Comparison Table',
      icon: <FiGrid size={24} />,
      description: 'Compare features, options, or alternatives',
      category: 'business',
      sampleData: {
        columns: ['Feature', 'Plan A', 'Plan B', 'Plan C'],
        rows: [
          ['Price', '$10/month', '$25/month', '$50/month'],
          ['Users', '1', '5', 'Unlimited'],
          ['Storage', '1GB', '10GB', '100GB'],
          ['Support', 'Email', 'Email + Chat', '24/7 Phone']
        ]
      },
      sampleConfig: {
        type: 'comparison_table',
        responsive: true,
        striped: true,
        highlightBest: true
      },
      aiPrompt: 'Create a comparison table to analyze: '
    },

    {
      id: 'funnel',
      name: 'Sales Funnel',
      icon: <FiTarget size={24} />,
      description: 'Visualize conversion rates and stages',
      category: 'business',
      sampleData: {
        stages: [
          { label: 'Awareness', value: 1000, color: '#3B82F6' },
          { label: 'Interest', value: 500, color: '#10B981' },
          { label: 'Consideration', value: 200, color: '#F59E0B' },
          { label: 'Purchase', value: 50, color: '#EF4444' }
        ]
      },
      sampleConfig: {
        type: 'funnel',
        responsive: true,
        showPercentages: true,
        animate: true
      },
      aiPrompt: 'Create a sales/marketing funnel to represent: '
    },

    // Technical  
    {
      id: 'system_diagram',
      name: 'System Diagram',
      icon: <FiMap size={24} />,
      description: 'Show system architecture and components',
      category: 'technical',
      sampleData: {
        components: [
          { id: 'frontend', label: 'Frontend App', type: 'web' },
          { id: 'api', label: 'REST API', type: 'service' },
          { id: 'database', label: 'Database', type: 'database' },
          { id: 'cache', label: 'Redis Cache', type: 'cache' }
        ],
        connections: [
          { from: 'frontend', to: 'api' },
          { from: 'api', to: 'database' },
          { from: 'api', to: 'cache' }
        ]
      },
      sampleConfig: {
        type: 'system_diagram',
        responsive: true,
        layout: 'network'
      },
      aiPrompt: 'Create a system diagram to illustrate the technical architecture described in: '
    },

    // Professional Business Diagrams (Office Word Style)
    {
      id: 'cycle_diagram',
      name: 'Cycle Diagram',
      icon: <FiTarget size={24} />,
      description: 'Show cyclical processes like CRM Selection Cycle',
      category: 'business',
      sampleData: {
        type: 'cycle',
        title: 'Process Cycle',
        steps: [
          { label: 'Identify Needs', color: '#3B82F6', icon: '🎯' },
          { label: 'Evaluate Features', color: '#10B981', icon: '🔍' },
          { label: 'Select Solution', color: '#F59E0B', icon: '✅' },
          { label: 'Implement', color: '#EF4444', icon: '🚀' },
          { label: 'Improve Performance', color: '#8B5CF6', icon: '📈' }
        ]
      },
      sampleConfig: {
        type: 'cycle_diagram',
        responsive: true,
        showArrows: true,
        centerText: true
      },
      aiPrompt: 'Create a cycle diagram to show the circular process described in: '
    },

    {
      id: 'process_funnel',
      name: 'Process Funnel',
      icon: <FiMaximize2 size={24} />,
      description: 'Show step-by-step evaluation processes',
      category: 'business',
      sampleData: {
        type: 'funnel',
        title: 'Evaluation Process',
        stages: [
          { label: 'Research Solutions', value: 100, color: '#3B82F6', icon: '📋' },
          { label: 'Request Demos', value: 60, color: '#10B981', icon: '🎥' },
          { label: 'Trial Period', value: 30, color: '#F59E0B', icon: '⏱️' },
          { label: 'Pricing & Licensing', value: 15, color: '#EF4444', icon: '💰' },
          { label: 'Final Selection', value: 5, color: '#8B5CF6', icon: '🏆' }
        ]
      },
      sampleConfig: {
        type: 'process_funnel',
        responsive: true,
        showPercentages: true,
        animate: true
      },
      aiPrompt: 'Create a process funnel to show the evaluation stages described in: '
    },

    {
      id: 'hierarchy_diagram',
      name: 'Hierarchy Diagram',
      icon: <FiLayers size={24} />,
      description: 'Show organizational or decision hierarchies',
      category: 'business',
      sampleData: {
        type: 'hierarchy',
        title: 'Decision Hierarchy',
        levels: [
          { level: 1, items: [{ label: 'Strategic Decision', color: '#3B82F6' }] },
          { level: 2, items: [
            { label: 'Key Considerations', color: '#10B981' },
            { label: 'Essential Features', color: '#10B981' }
          ]},
          { level: 3, items: [
            { label: 'Implementation', color: '#F59E0B' },
            { label: 'Evaluation', color: '#F59E0B' },
            { label: 'Selection', color: '#F59E0B' }
          ]}
        ]
      },
      sampleConfig: {
        type: 'hierarchy_diagram',
        responsive: true,
        layout: 'tree'
      },
      aiPrompt: 'Create a hierarchy diagram to organize the structure described in: '
    },

    {
      id: 'comparison_matrix',
      name: 'Comparison Matrix',
      icon: <FiGrid size={24} />,
      description: 'Advanced comparison with visual indicators',
      category: 'business',
      sampleData: {
        type: 'matrix',
        title: 'Solution Comparison',
        criteria: ['Feature A', 'Feature B', 'Feature C', 'Cost', 'Support'],
        solutions: ['Solution 1', 'Solution 2', 'Solution 3'],
        scores: [
          [5, 4, 3, 2, 5],  // Solution 1
          [3, 5, 4, 4, 3],  // Solution 2
          [4, 3, 5, 5, 4]   // Solution 3
        ]
      },
      sampleConfig: {
        type: 'comparison_matrix',
        responsive: true,
        colorScale: true,
        showBest: true
      },
      aiPrompt: 'Create a comparison matrix to analyze the options described in: '
    },

    {
      id: 'workflow_diagram',
      name: 'Workflow Diagram',
      icon: <FiBox size={24} />,
      description: 'Show complex workflows with multiple paths',
      category: 'process',
      sampleData: {
        type: 'workflow',
        title: 'Process Workflow',
        nodes: [
          { id: 'start', label: 'Start Process', type: 'start', x: 0, y: 0 },
          { id: 'step1', label: 'Initial Assessment', type: 'process', x: 1, y: 0 },
          { id: 'decision1', label: 'Requirements Met?', type: 'decision', x: 2, y: 0 },
          { id: 'step2a', label: 'Proceed to Next Stage', type: 'process', x: 3, y: -1 },
          { id: 'step2b', label: 'Refine Requirements', type: 'process', x: 3, y: 1 },
          { id: 'end', label: 'Complete Process', type: 'end', x: 4, y: 0 }
        ],
        edges: [
          { from: 'start', to: 'step1', label: '' },
          { from: 'step1', to: 'decision1', label: '' },
          { from: 'decision1', to: 'step2a', label: 'Yes' },
          { from: 'decision1', to: 'step2b', label: 'No' },
          { from: 'step2a', to: 'end', label: '' },
          { from: 'step2b', to: 'step1', label: 'Retry' }
        ]
      },
      sampleConfig: {
        type: 'workflow_diagram',
        responsive: true,
        layout: 'dagre'
      },
      aiPrompt: 'Create a workflow diagram to map out the process described in: '
    },

    {
      id: 'relationship_diagram',
      name: 'Relationship Diagram',
      icon: <FiActivity size={24} />,
      description: 'Show connections and relationships between concepts',
      category: 'business',
      sampleData: {
        type: 'relationship',
        title: 'Concept Relationships',
        nodes: [
          { id: 'central', label: 'Core Concept', type: 'central', size: 40 },
          { id: 'related1', label: 'Related Concept 1', type: 'related', size: 25 },
          { id: 'related2', label: 'Related Concept 2', type: 'related', size: 25 },
          { id: 'related3', label: 'Related Concept 3', type: 'related', size: 25 },
          { id: 'support1', label: 'Supporting Detail', type: 'support', size: 15 }
        ],
        connections: [
          { from: 'central', to: 'related1', strength: 'strong' },
          { from: 'central', to: 'related2', strength: 'medium' },
          { from: 'central', to: 'related3', strength: 'strong' },
          { from: 'related1', to: 'support1', strength: 'medium' }
        ]
      },
      sampleConfig: {
        type: 'relationship_diagram',
        responsive: true,
        physics: true
      },
      aiPrompt: 'Create a relationship diagram to show the connections described in: '
    }
  ];

  const categories = {
    data_viz: 'Data Visualization',
    process: 'Process & Flow',
    business: 'Business & Strategy',
    technical: 'Technical'
  };

  const filteredCharts = chartTypes.filter(chart => chart.category === selectedCategory);

  // Initialize edit mode with existing chart data
  useEffect(() => {
    if (editMode && existingChart) {
      // Find matching chart type
      const matchingChart = chartTypes.find(chart => chart.id === existingChart.chart_type);
      if (matchingChart) {
        setSelectedChart(matchingChart);
        // Set the category that contains this chart
        setSelectedCategory(matchingChart.category);
      }
      
      // Initialize edit data and config
      setEditData(existingChart.data || {});
      setEditConfig(existingChart.config || existingChart.styling || {});
      setCustomPrompt(`Edit: ${existingChart.title || 'Chart'}`);
    }
  }, [editMode, existingChart, chartTypes]);

  const handleChartSelect = (chart: ChartType) => {
    setSelectedChart(chart);
    setCustomPrompt(chart.aiPrompt + (selectedText || 'the provided content'));
    
    // If in edit mode, initialize with existing data
    if (editMode && existingChart) {
      setEditData(existingChart.data || chart.sampleData);
      setEditConfig(existingChart.config || existingChart.styling || chart.sampleConfig);
    }
  };

  const handleUpdateChart = async () => {
    if (!existingChart || !onChartUpdate) return;

    setIsGenerating(true);
    try {
      // Call the chart update API
      const response = await axios.post('/charts/update-data/', {
        diagram_id: existingChart.id,
        chart_data: editData,
        chart_config: editConfig,
        styling: editConfig,
        title: existingChart.title
      });

      console.log('Chart update response:', response.data);
      
      // Call the parent update callback
      await onChartUpdate(existingChart.id, editData, editConfig);
      
      toast.success('Chart updated successfully!');
      onClose();
    } catch (error) {
      console.error('Chart update error:', error);
      toast.error('Failed to update chart');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedChart) return;

    setIsGenerating(true);
    try {
      // Call the AI chart generation API using authenticated axios client
      const response = await axios.post('/presentations/generate-diagram/', {
        text: selectedText,
        chart_type: selectedChart.id,
        generation_prompt: customPrompt || selectedChart.aiPrompt + selectedText,
        ai_enhanced: true
      });

      const result = response.data;
      
      if (result.task_id) {
        // Poll for task completion
        toast.info('Generating chart with AI... This may take a moment.');
        await pollChartGeneration(result.task_id);
      } else if (result.id) {
        // Direct response - use correct field names
        console.log('Direct response received:', result);
        await onChartGenerate(
          selectedChart.id,
          result.data || result.chart_data || selectedChart.sampleData,
          result.config || result.styling || result.chart_config || selectedChart.sampleConfig,
          customPrompt || selectedChart.aiPrompt + selectedText
        );
      }
      
      toast.success(`${selectedChart.name} generated successfully!`);
      onClose();
    } catch (error) {
      console.error('Chart generation error:', error);
      toast.error('Failed to generate chart');
    } finally {
      setIsGenerating(false);
    }
  };

  const pollChartGeneration = async (taskId: string) => {
    const maxAttempts = 120; // 120 seconds max (2 minutes) for AI generation
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`/presentations/diagram-task-status/${taskId}/`);
        const status = response.data;
        
        if (status.status === 'completed') {
            console.log('Chart generation completed, full status:', status);
            
            // Handle different response formats from backend
            let chartData = selectedChart!.sampleData;
            let chartConfig = selectedChart!.sampleConfig;
            let diagramInfo = null;
            let imageUrl = null;
            
            // Handle multiple possible response structures from the backend
            if (status.diagram_data) {
              // Direct diagram_data in response
              diagramInfo = status.diagram_data;
              chartData = status.diagram_data.data || chartData;
              chartConfig = status.diagram_data.config || status.diagram_data.styling || chartConfig;
              imageUrl = status.diagram_data.image_url;
            } else if (status.result && status.result.diagram_data) {
              // Result contains diagram_data
              diagramInfo = status.result.diagram_data;
              chartData = status.result.diagram_data.data || chartData;
              chartConfig = status.result.diagram_data.config || status.result.diagram_data.styling || chartConfig;
              imageUrl = status.result.diagram_data.image_url;
            } else if (status.result && status.result.data) {
              // Result contains data directly
              chartData = status.result.data;
              chartConfig = status.result.config || status.result.styling || chartConfig;
              imageUrl = status.result.image_url;
            } else if (status.diagram) {
              // Legacy diagram field
              diagramInfo = status.diagram;
              chartData = status.diagram.data || chartData;
              chartConfig = status.diagram.config || status.diagram.styling || chartConfig;
              imageUrl = status.diagram.image_url;
            }
            
            console.log('Chart data extracted:', { chartData, chartConfig, imageUrl, diagramInfo });
            
            // Create enhanced chart data with image if available
            const enhancedChartData = {
              ...chartData,
              imageUrl: imageUrl,
              diagramId: status.diagram_id || status.result?.diagram_id,
              confidence: status.confidence || status.result?.confidence
            };
            
            await onChartGenerate(
              selectedChart!.id,
              enhancedChartData,
              chartConfig,
              customPrompt || selectedChart!.aiPrompt + selectedText
            );
            return;
          } else if (status.status === 'failed') {
            throw new Error(status.error || 'Chart generation failed');
          }
        
        // Wait 1 second before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Polling error:', error);
        break;
      }
    }
    
    throw new Error('Chart generation timed out');
  };

  // Image element management functions
  const handleAddImageElement = async () => {
    if (!imageFile || !existingChart) return;
    
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('image_file', imageFile);
      formData.append('diagram_id', existingChart.id);
      formData.append('element_type', 'image');
      formData.append('position', JSON.stringify({x: 0, y: 0, width: 100, height: 100}));
      
      const response = await axios.post('/elements/add-image/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Image element added:', response.data);
      
      // Update local image elements list
      if (response.data.element) {
        setImageElements(prev => [...prev, response.data.element]);
      }
      
      // Clear file input
      setImageFile(null);
      toast.success('Image element added to chart!');
      
    } catch (error) {
      console.error('Failed to add image element:', error);
      toast.error('Failed to add image element');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleUpdateImageElement = async (elementId: string, updates: any) => {
    if (!existingChart) return;
    
    try {
      const response = await axios.patch('/elements/update-image/', {
        diagram_id: existingChart.id,
        element_id: elementId,
        ...updates
      });
      
      console.log('Image element updated:', response.data);
      
      // Update local image elements list
      setImageElements(prev => 
        prev.map(el => el.id === elementId ? { ...el, ...updates } : el)
      );
      
      toast.success('Image element updated!');
      
    } catch (error) {
      console.error('Failed to update image element:', error);
      toast.error('Failed to update image element');
    }
  };
  
  const handleRemoveImageElement = async (elementId: string) => {
    if (!existingChart) return;
    
    try {
      await axios.delete('/elements/remove-image/', {
        data: {
          diagram_id: existingChart.id,
          element_id: elementId
        }
      });
      
      // Remove from local image elements list
      setImageElements(prev => prev.filter(el => el.id !== elementId));
      
      toast.success('Image element removed!');
      
    } catch (error) {
      console.error('Failed to remove image element:', error);
      toast.error('Failed to remove image element');
    }
  };
  
  // Load existing image elements when in edit mode
  useEffect(() => {
    if (editMode && existingChart) {
      const loadImageElements = async () => {
        try {
          const response = await axios.get('/charts/get-elements/', {
            params: {
              diagram_id: existingChart.id
            }
          });
          
          if (response.data.image_elements) {
            setImageElements(response.data.image_elements);
          }
        } catch (error) {
          console.error('Failed to load image elements:', error);
        }
      };
      
      loadImageElements();
    }
  }, [editMode, existingChart]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <FiZap className="text-purple-600" />
            {editMode ? 'Edit Chart' : 'AI Chart Generator'}
          </h2>
          <p className="text-gray-600 mt-1">
            {editMode 
              ? `Edit chart data and configuration for: ${existingChart?.title || 'Chart'}`
              : 'Create professional charts from your content using AI'
            }
          </p>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Category Selection */}
          <div className="w-48 border-r border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Categories</h3>
            <div className="space-y-1">
              {Object.entries(categories).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === key
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Type Selection */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCharts.map((chart) => (
                <button
                  key={chart.id}
                  onClick={() => handleChartSelect(chart)}
                  className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                    selectedChart?.id === chart.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      selectedChart?.id === chart.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {chart.icon}
                    </div>
                    <h4 className="font-medium text-gray-900">{chart.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{chart.description}</p>
                </button>
              ))}
            </div>

            {/* Custom Prompt Section */}
            {selectedChart && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">AI Generation Prompt</h4>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what you want the chart to show..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Tip: Be specific about the data, labels, and insights you want to highlight.
                </p>
              </div>
            )}

            {/* Advanced Edit Mode Interface */}
            {editMode && existingChart && selectedChart && (
              <div className="mt-6 space-y-4">
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <FiGrid size={16} />
                    Chart Editor
                  </h4>
                  
                  {/* Chart Data Editor */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chart Data (JSON)
                      </label>
                      <textarea
                        value={JSON.stringify(editData || existingChart.data, null, 2)}
                        onChange={(e) => {
                          try {
                            setEditData(JSON.parse(e.target.value));
                          } catch (error) {
                            console.warn('Invalid JSON format');
                          }
                        }}
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Chart data in JSON format"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chart Configuration (JSON)
                      </label>
                      <textarea
                        value={JSON.stringify(editConfig || existingChart.config || existingChart.styling, null, 2)}
                        onChange={(e) => {
                          try {
                            setEditConfig(JSON.parse(e.target.value));
                          } catch (error) {
                            console.warn('Invalid JSON format');
                          }
                        }}
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Chart configuration in JSON format"
                      />
                    </div>
                  </div>
                  
                  {/* Quick Edit Controls */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Quick Edit Controls</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <button
                        onClick={() => {
                          const newData = { ...editData };
                          if (newData.datasets && newData.datasets[0]) {
                            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                            newData.datasets[0].backgroundColor = colors.slice(0, newData.datasets[0].data?.length || 4);
                            setEditData(newData);
                          }
                        }}
                        className="px-3 py-2 text-sm bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                      >
                        🎨 Update Colors
                      </button>
                      
                      <button
                        onClick={() => {
                          const newConfig = { ...editConfig };
                          newConfig.responsive = true;
                          newConfig.maintainAspectRatio = false;
                          setEditConfig(newConfig);
                        }}
                        className="px-3 py-2 text-sm bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                      >
                        📱 Responsive
                      </button>
                      
                      <button
                        onClick={() => {
                          const newConfig = { ...editConfig };
                          if (!newConfig.plugins) newConfig.plugins = {};
                          if (!newConfig.plugins.legend) newConfig.plugins.legend = {};
                          newConfig.plugins.legend.display = !newConfig.plugins.legend.display;
                          setEditConfig(newConfig);
                        }}
                        className="px-3 py-2 text-sm bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                      >
                        📊 Toggle Legend
                      </button>
                      
                      <button
                        onClick={() => {
                          if (editData && editData.datasets && editData.datasets[0] && editData.datasets[0].data) {
                            const newData = { ...editData };
                            newData.datasets[0].data = newData.datasets[0].data.map((val: number) => Math.max(0, val + Math.floor((Math.random() - 0.5) * val * 0.3)));
                            setEditData(newData);
                          }
                        }}
                        className="px-3 py-2 text-sm bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                      >
                        🎲 Randomize Data
                      </button>
                    </div>
                  </div>
                  
                  {/* Image Elements Management */}
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <h5 className="font-medium text-green-900 mb-4 flex items-center gap-2">
                      <FiImage size={16} />
                      Image Elements
                    </h5>
                    
                    {/* Add Image Element */}
                    <div className="mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                          />
                        </div>
                        <button
                          onClick={handleAddImageElement}
                          disabled={!imageFile || isGenerating}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center gap-2"
                        >
                          <FiUpload size={16} />
                          Add Image
                        </button>
                      </div>
                    </div>
                    
                    {/* Existing Image Elements List */}
                    {imageElements.length > 0 && (
                      <div className="space-y-2">
                        <h6 className="text-sm font-medium text-green-800">Current Image Elements:</h6>
                        {imageElements.map((element, index) => (
                          <div key={element.id || index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                {element.image_url ? (
                                  <img 
                                    src={element.image_url} 
                                    alt="Element" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <FiImage className="text-gray-400" size={20} />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {element.type || 'Image'} Element
                                </p>
                                <p className="text-xs text-gray-500">
                                  Position: ({element.position?.x || 0}, {element.position?.y || 0})
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const newPosition = {
                                    x: (element.position?.x || 0) + 10,
                                    y: (element.position?.y || 0) + 10,
                                    width: element.position?.width || 100,
                                    height: element.position?.height || 100
                                  };
                                  handleUpdateImageElement(element.id, { position: newPosition });
                                }}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                title="Move element"
                              >
                                <FiMove size={12} />
                              </button>
                              <button
                                onClick={() => handleRemoveImageElement(element.id)}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                title="Remove element"
                              >
                                <FiX size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {editMode ? (
            <button
              onClick={handleUpdateChart}
              disabled={!existingChart || isGenerating}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Updating...
                </>
              ) : (
                <>
                  <FiZap size={16} />
                  Update Chart
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!selectedChart || isGenerating}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Generating...
                </>
              ) : (
                <>
                  <FiZap size={16} />
                  Generate {selectedChart?.name || 'Chart'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartGenerator;