import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { FiEdit3, FiSettings, FiDownload, FiRefreshCw, FiCheck, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

// Register Chart.js components
ChartJS.register(...registerables);

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
    [key: string]: any;
  }>;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'bubble' | 'polarArea' | 'radar';
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins?: {
    title?: {
      display: boolean;
      text: string;
      font?: {
        size: number;
        weight: string;
      };
    };
    legend?: {
      display: boolean;
      position: 'top' | 'bottom' | 'left' | 'right';
    };
  };
  scales?: any;
}

interface InteractiveChartProps {
  diagramId: string;
  title: string;
  chartType: string;
  data: ChartData;
  config: ChartConfig;
  styling: any;
  editable?: boolean;
  onDataUpdate?: (data: ChartData) => Promise<void>;
  onConfigUpdate?: (config: ChartConfig) => Promise<void>;
  onStylingUpdate?: (styling: any) => Promise<void>;
}

const InteractiveChart: React.FC<InteractiveChartProps> = ({
  diagramId,
  title,
  chartType,
  data: initialData,
  config: initialConfig,
  styling: initialStyling,
  editable = false,
  onDataUpdate,
  onConfigUpdate,
  onStylingUpdate
}) => {
  const [chartData, setChartData] = useState<ChartData>(initialData);
  const [chartConfig, setChartConfig] = useState<ChartConfig>(initialConfig);
  const [chartStyling, setChartStyling] = useState(initialStyling);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const chartRef = useRef<ChartJS>(null);

  // Color palettes for different chart types
  const colorPalettes = {
    professional: [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
    ],
    pastel: [
      '#93C5FD', '#86EFAC', '#FDE68A', '#FCA5A5', '#C4B5FD', '#67E8F9', '#BEF264', '#FDBA74'
    ],
    vibrant: [
      '#1D4ED8', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#65A30D', '#EA580C'
    ]
  };

  // Initialize editing data
  useEffect(() => {
    if (isEditing) {
      setEditingData(JSON.stringify(chartData, null, 2));
    }
  }, [isEditing, chartData]);

  // Convert diagram type to Chart.js type
  const getChartJSType = (diagramType: string): ChartConfig['type'] => {
    const typeMap: Record<string, ChartConfig['type']> = {
      'bar_chart': 'bar',
      'line_chart': 'line',
      'pie_chart': 'pie',
      'doughnut_chart': 'doughnut',
      'scatter_plot': 'scatter',
      'bubble_chart': 'bubble',
      'polar_chart': 'polarArea',
      'radar_chart': 'radar'
    };
    return typeMap[diagramType] || 'bar';
  };

  // Apply color palette to chart data
  const applyColorPalette = (data: ChartData, palette: string[]): ChartData => {
    return {
      ...data,
      datasets: data.datasets.map((dataset, index) => ({
        ...dataset,
        backgroundColor: Array.isArray(dataset.backgroundColor) 
          ? palette.slice(0, dataset.data.length)
          : palette[index % palette.length],
        borderColor: Array.isArray(dataset.borderColor)
          ? palette.slice(0, dataset.data.length).map(color => color.replace('0.8', '1'))
          : palette[index % palette.length]
      }))
    };
  };

  // Handle data editing
  const handleDataSave = async () => {
    try {
      const newData = JSON.parse(editingData);
      setChartData(newData);
      setIsEditing(false);
      
      if (onDataUpdate) {
        setIsLoading(true);
        await onDataUpdate(newData);
        setIsLoading(false);
        toast.success('Chart data updated successfully!');
      }
    } catch (error) {
      toast.error('Invalid JSON format. Please check your data.');
    }
  };

  const handleDataCancel = () => {
    setIsEditing(false);
    setEditingData('');
  };

  // Handle chart type change
  const handleChartTypeChange = async (newType: ChartConfig['type']) => {
    const newConfig = { ...chartConfig, type: newType };
    setChartConfig(newConfig);
    
    if (onConfigUpdate) {
      setIsLoading(true);
      await onConfigUpdate(newConfig);
      setIsLoading(false);
      toast.success('Chart type updated successfully!');
    }
  };

  // Handle color palette change
  const handleColorPaletteChange = async (paletteName: keyof typeof colorPalettes) => {
    const palette = colorPalettes[paletteName];
    const newData = applyColorPalette(chartData, palette);
    const newStyling = { ...chartStyling, palette: paletteName };
    
    setChartData(newData);
    setChartStyling(newStyling);
    
    if (onDataUpdate) await onDataUpdate(newData);
    if (onStylingUpdate) await onStylingUpdate(newStyling);
    toast.success('Color palette updated successfully!');
  };

  // Export chart as image
  const handleExportChart = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.canvas;
      const link = document.createElement('a');
      link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast.success('Chart exported successfully!');
    }
  };

  // Regenerate chart with AI
  const handleRegenerateChart = async () => {
    if (onConfigUpdate) {
      setIsLoading(true);
      try {
        // Trigger AI regeneration (you would call your AI generation endpoint here)
        toast.info('Regenerating chart with AI...');
        // Simulate AI regeneration delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('Chart regenerated successfully!');
      } catch (error) {
        toast.error('Failed to regenerate chart');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const chartJSType = getChartJSType(chartType);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        
        {editable && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit chart data"
            >
              <FiEdit3 size={16} />
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Chart settings"
            >
              <FiSettings size={16} />
            </button>
            
            <button
              onClick={handleRegenerateChart}
              disabled={isLoading}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
              title="Regenerate with AI"
            >
              <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            
            <button
              onClick={handleExportChart}
              className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="Export chart"
            >
              <FiDownload size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && editable && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
            <select
              value={chartJSType}
              onChange={(e) => handleChartTypeChange(e.target.value as ChartConfig['type'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="doughnut">Doughnut Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="bubble">Bubble Chart</option>
              <option value="polarArea">Polar Area</option>
              <option value="radar">Radar Chart</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color Palette</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(colorPalettes).map(([name, colors]) => (
                <button
                  key={name}
                  onClick={() => handleColorPaletteChange(name as keyof typeof colorPalettes)}
                  className={`p-2 border rounded-lg hover:bg-gray-50 transition-colors ${
                    chartStyling.palette === name ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex gap-1 mb-1">
                    {colors.slice(0, 4).map((color, index) => (
                      <div
                        key={index}
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium capitalize">{name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Editing Panel */}
      {isEditing && editable && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Edit Chart Data</h4>
            <div className="flex gap-2">
              <button
                onClick={handleDataSave}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                <FiCheck size={12} />
                Save
              </button>
              <button
                onClick={handleDataCancel}
                className="flex items-center gap-2 px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                <FiX size={12} />
                Cancel
              </button>
            </div>
          </div>
          
          <textarea
            value={editingData}
            onChange={(e) => setEditingData(e.target.value)}
            className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter chart data in JSON format..."
          />
          
          <div className="mt-2 text-xs text-gray-500">
            <strong>Tip:</strong> Edit the data in JSON format. Make sure to maintain the structure: 
            <code className="bg-gray-200 px-1 rounded">{"{ labels: [...], datasets: [...] }"}</code>
          </div>
        </div>
      )}

      {/* Chart Display */}
      <div className="relative" style={{ height: '400px' }}>
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="flex items-center gap-3">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span className="text-gray-600">Updating chart...</span>
            </div>
          </div>
        )}
        
        <Chart
          ref={chartRef}
          type={chartJSType}
          data={chartData}
          options={{
            ...chartConfig,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: title,
                font: {
                  size: 16,
                  weight: 'bold' as const
                }
              },
              legend: {
                display: true,
                position: 'top'
              },
              ...chartConfig.plugins
            }
          }}
        />
      </div>

      {/* Chart Info */}
      <div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
        <span>Chart ID: {diagramId}</span>
        <span>Type: {chartType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
      </div>
    </div>
  );
};

export default InteractiveChart;