import React, { useState } from 'react';
import { 
  FiBarChart, FiTrendingUp, FiPieChart, FiCircle, FiActivity, 
  FiTarget, FiGrid, FiMap, FiLayers, FiZap, FiBox, FiMaximize2
} from 'react-icons/fi';
import { toast } from 'react-toastify';

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
}

const ChartGenerator: React.FC<ChartGeneratorProps> = ({
  selectedText,
  onChartGenerate,
  onClose,
  isVisible
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('data_viz');
  const [selectedChart, setSelectedChart] = useState<ChartType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

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
    }
  ];

  const categories = {
    data_viz: 'Data Visualization',
    process: 'Process & Flow',
    business: 'Business & Strategy',
    technical: 'Technical'
  };

  const filteredCharts = chartTypes.filter(chart => chart.category === selectedCategory);

  const handleChartSelect = (chart: ChartType) => {
    setSelectedChart(chart);
    setCustomPrompt(chart.aiPrompt + (selectedText || 'the provided content'));
  };

  const handleGenerate = async () => {
    if (!selectedChart) return;

    setIsGenerating(true);
    try {
      // Call the AI chart generation API
      const response = await fetch('/api/presentations/generate-diagram/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          text: selectedText,
          chart_type: selectedChart.id,
          generation_prompt: customPrompt || selectedChart.aiPrompt + selectedText,
          ai_enhanced: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate chart');
      }

      const result = await response.json();
      
      if (result.task_id) {
        // Poll for task completion
        toast.info('Generating chart with AI... This may take a moment.');
        await pollChartGeneration(result.task_id);
      } else if (result.id) {
        // Direct response
        await onChartGenerate(
          selectedChart.id,
          result.chart_data || selectedChart.sampleData,
          result.chart_config || selectedChart.sampleConfig,
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
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/presentations/diagram-task-status/${taskId}/`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const status = await response.json();
          
          if (status.status === 'completed') {
            // Handle different response formats from backend
            let chartData = selectedChart!.sampleData;
            let chartConfig = selectedChart!.sampleConfig;
            
            // If we have a diagram object from the backend
            if (status.diagram && status.diagram.chart_data) {
              chartData = status.diagram.chart_data;
              chartConfig = status.diagram.style_config || chartConfig;
            }
            // If we have direct result data from the AI task
            else if (status.result && status.result.diagram_data) {
              chartData = status.result.diagram_data.data || status.result.diagram_data;
              chartConfig = status.result.diagram_data.config || chartConfig;
            }
            // If we have the result as chart data directly
            else if (status.result && (status.result.data || status.result.chart_data)) {
              chartData = status.result.data || status.result.chart_data;
              chartConfig = status.result.config || status.result.style_config || chartConfig;
            }
            
            await onChartGenerate(
              selectedChart!.id,
              chartData,
              chartConfig,
              customPrompt || selectedChart!.aiPrompt + selectedText
            );
            return;
          } else if (status.status === 'failed') {
            throw new Error(status.error || 'Chart generation failed');
          }
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

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <FiZap className="text-purple-600" />
            AI Chart Generator
          </h2>
          <p className="text-gray-600 mt-1">Create professional charts from your content using AI</p>
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
        </div>
      </div>
    </div>
  );
};

export default ChartGenerator;