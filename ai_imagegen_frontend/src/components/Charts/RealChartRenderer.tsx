import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { FiEdit3, FiSave, FiX, FiPlus, FiTrash2, FiMove } from 'react-icons/fi';
import { toast } from 'react-toastify';

ChartJS.register(...registerables);

interface RealChartRendererProps {
  chartType: string;
  title: string;
  data: any;
  config: any;
  styling: any;
  editable?: boolean;
  onDataUpdate?: (newData: any) => Promise<void>;
  onConfigUpdate?: (newConfig: any) => Promise<void>;
}

const RealChartRenderer: React.FC<RealChartRendererProps> = ({
  chartType,
  title,
  data,
  config,
  styling,
  editable = false,
  onDataUpdate,
  onConfigUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);
  const [isLoading, setIsLoading] = useState(false);
  const chartRef = useRef<ChartJS>(null);

  useEffect(() => {
    setEditData(data);
  }, [data]);

  const handleSaveChanges = async () => {
    try {
      setIsLoading(true);
      if (onDataUpdate) {
        await onDataUpdate(editData);
      }
      setIsEditing(false);
      toast.success('Chart updated successfully!');
    } catch (error) {
      toast.error('Failed to update chart');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData(data);
    setIsEditing(false);
  };

  // Chart.js compatible charts with full functionality
  const renderChartJS = () => {
    if (!editData || !editData.labels || !editData.datasets) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No chart data available</p>
        </div>
      );
    }

    const chartJSType = chartType === 'bar_chart' ? 'bar' : 
                        chartType === 'line_chart' ? 'line' :
                        chartType === 'pie_chart' ? 'pie' :
                        chartType === 'doughnut_chart' ? 'doughnut' :
                        chartType === 'scatter_plot' ? 'scatter' :
                        chartType === 'bubble_chart' ? 'bubble' :
                        chartType === 'histogram' ? 'bar' :
                        'bar';

    return (
      <div className="h-full">
        {isEditing && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Edit Chart Data</h4>
            <div className="space-y-3">
              {/* Edit Labels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Labels</label>
                <input
                  type="text"
                  value={editData.labels?.join(', ') || ''}
                  onChange={(e) => setEditData({
                    ...editData,
                    labels: e.target.value.split(', ').filter(label => label.trim())
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Enter labels separated by commas"
                />
              </div>
              
              {/* Edit Datasets */}
              {editData.datasets?.map((dataset: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Dataset {index + 1}</label>
                    {editData.datasets.length > 1 && (
                      <button
                        onClick={() => {
                          const newDatasets = [...editData.datasets];
                          newDatasets.splice(index, 1);
                          setEditData({ ...editData, datasets: newDatasets });
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={dataset.label || ''}
                      onChange={(e) => {
                        const newDatasets = [...editData.datasets];
                        newDatasets[index] = { ...dataset, label: e.target.value };
                        setEditData({ ...editData, datasets: newDatasets });
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Dataset label"
                    />
                    <input
                      type="color"
                      value={dataset.backgroundColor || '#3B82F6'}
                      onChange={(e) => {
                        const newDatasets = [...editData.datasets];
                        newDatasets[index] = { ...dataset, backgroundColor: e.target.value, borderColor: e.target.value };
                        setEditData({ ...editData, datasets: newDatasets });
                      }}
                      className="w-full h-8 border border-gray-300 rounded"
                    />
                  </div>
                  <input
                    type="text"
                    value={dataset.data?.join(', ') || ''}
                    onChange={(e) => {
                      const newDatasets = [...editData.datasets];
                      newDatasets[index] = { 
                        ...dataset, 
                        data: e.target.value.split(', ').map(v => parseFloat(v) || 0)
                      };
                      setEditData({ ...editData, datasets: newDatasets });
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Enter data separated by commas"
                  />
                </div>
              ))}
              
              <button
                onClick={() => {
                  const newDatasets = [...(editData.datasets || []), {
                    label: 'New Dataset',
                    data: editData.labels?.map(() => 0) || [0],
                    backgroundColor: '#10B981',
                    borderColor: '#10B981'
                  }];
                  setEditData({ ...editData, datasets: newDatasets });
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <FiPlus size={14} />
                Add Dataset
              </button>
            </div>
          </div>
        )}
        
        <Chart
          ref={chartRef}
          type={chartJSType as any}
          data={editData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top'
              }
            },
            ...config
          }}
        />
      </div>
    );
  };

  // Real Cycle Diagram with backend data structure: { steps: [{ label, color, icon }] }
  const renderCycleDiagram = () => {
    // Handle nested data structure from backend
    const steps = editData?.steps || editData?.data?.steps;
    
    if (!steps || steps.length === 0) {
      return <div className="p-8 text-center text-gray-500">No cycle data available</div>;
    }

    const centerX = 200;
    const centerY = 150;
    const radius = 80;

    return (
      <div className="h-full">
        {isEditing && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Edit Cycle Steps</h4>
            <div className="space-y-3">
              {editData.steps?.map((step: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                  <input
                    type="text"
                    value={step.label || ''}
                    onChange={(e) => {
                      const newSteps = [...editData.steps];
                      newSteps[index] = { ...step, label: e.target.value };
                      setEditData({ ...editData, steps: newSteps });
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Step label"
                  />
                  <input
                    type="text"
                    value={step.icon || ''}
                    onChange={(e) => {
                      const newSteps = [...editData.steps];
                      newSteps[index] = { ...step, icon: e.target.value };
                      setEditData({ ...editData, steps: newSteps });
                    }}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                    placeholder="🎯"
                  />
                  <input
                    type="color"
                    value={step.color || '#3B82F6'}
                    onChange={(e) => {
                      const newSteps = [...editData.steps];
                      newSteps[index] = { ...step, color: e.target.value };
                      setEditData({ ...editData, steps: newSteps });
                    }}
                    className="w-12 h-8 border border-gray-300 rounded"
                  />
                  <button
                    onClick={() => {
                      const newSteps = [...editData.steps];
                      newSteps.splice(index, 1);
                      setEditData({ ...editData, steps: newSteps });
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newSteps = [...editData.steps, { label: 'New Step', color: '#3B82F6', icon: '⭐' }];
                  setEditData({ ...editData, steps: newSteps });
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <FiPlus size={14} />
                Add Step
              </button>
            </div>
          </div>
        )}

        <div className="relative p-4 bg-gray-50 rounded-lg h-full">
          <svg width="100%" height="300" className="border border-gray-200 rounded">
            {/* Draw cycle steps */}
            {steps.map((step: any, index: number) => {
              const angle = (index * 2 * Math.PI) / steps.length - Math.PI / 2;
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);
              
              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r={30}
                    fill={step.color || '#3B82F6'}
                    stroke="#1F2937"
                    strokeWidth={2}
                  />
                  <text
                    x={x}
                    y={y - 5}
                    textAnchor="middle"
                    fontSize="16"
                  >
                    {step.icon || '⭐'}
                  </text>
                  <text
                    x={x}
                    y={y + 10}
                    textAnchor="middle"
                    fontSize="8"
                    fill="white"
                    fontWeight="500"
                  >
                    {step.label}
                  </text>
                </g>
              );
            })}
            
            {/* Draw arrows between steps */}
            {steps.map((_: any, index: number) => {
              const angle1 = (index * 2 * Math.PI) / steps.length - Math.PI / 2;
              const angle2 = ((index + 1) * 2 * Math.PI) / steps.length - Math.PI / 2;
              
              const x1 = centerX + (radius - 35) * Math.cos(angle1);
              const y1 = centerY + (radius - 35) * Math.sin(angle1);
              const x2 = centerX + (radius - 35) * Math.cos(angle2);
              const y2 = centerY + (radius - 35) * Math.sin(angle2);
              
              return (
                <line
                  key={`arrow-${index}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#6B7280"
                  strokeWidth={2}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#6B7280" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>
    );
  };

  // Real Process Funnel with backend data structure: { stages: [{ label, value, color, icon }] }
  const renderProcessFunnel = () => {
    // Handle nested data structure from backend
    const stages = editData?.stages || editData?.data?.stages;
    
    if (!stages || stages.length === 0) {
      return <div className="p-8 text-center text-gray-500">No funnel data available</div>;
    }

    const maxValue = Math.max(...stages.map((stage: any) => stage.value));

    return (
      <div className="h-full">
        {isEditing && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Edit Funnel Stages</h4>
            <div className="space-y-3">
              {editData.stages?.map((stage: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                  <input
                    type="text"
                    value={stage.label || ''}
                    onChange={(e) => {
                      const newStages = [...editData.stages];
                      newStages[index] = { ...stage, label: e.target.value };
                      setEditData({ ...editData, stages: newStages });
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Stage label"
                  />
                  <input
                    type="number"
                    value={stage.value || 0}
                    onChange={(e) => {
                      const newStages = [...editData.stages];
                      newStages[index] = { ...stage, value: parseInt(e.target.value) || 0 };
                      setEditData({ ...editData, stages: newStages });
                    }}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Value"
                  />
                  <input
                    type="text"
                    value={stage.icon || ''}
                    onChange={(e) => {
                      const newStages = [...editData.stages];
                      newStages[index] = { ...stage, icon: e.target.value };
                      setEditData({ ...editData, stages: newStages });
                    }}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                    placeholder="📋"
                  />
                  <input
                    type="color"
                    value={stage.color || '#3B82F6'}
                    onChange={(e) => {
                      const newStages = [...editData.stages];
                      newStages[index] = { ...stage, color: e.target.value };
                      setEditData({ ...editData, stages: newStages });
                    }}
                    className="w-12 h-8 border border-gray-300 rounded"
                  />
                  <button
                    onClick={() => {
                      const newStages = [...editData.stages];
                      newStages.splice(index, 1);
                      setEditData({ ...editData, stages: newStages });
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newStages = [...editData.stages, { label: 'New Stage', value: 50, color: '#3B82F6', icon: '📋' }];
                  setEditData({ ...editData, stages: newStages });
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <FiPlus size={14} />
                Add Stage
              </button>
            </div>
          </div>
        )}

        <div className="h-full flex flex-col justify-center items-center p-4">
          <div className="space-y-3 w-full max-w-lg">
            {stages.map((stage: any, index: number) => {
              const percentage = (stage.value / maxValue) * 100;
              const width = Math.max(percentage, 25);
              
              return (
                <div key={index} className="flex flex-col items-center">
                  <div
                    className="relative flex items-center justify-center text-white font-medium text-sm h-14 rounded-lg shadow-md transition-all hover:shadow-lg"
                    style={{
                      backgroundColor: stage.color || '#3B82F6',
                      width: `${width}%`
                    }}
                  >
                    <span className="text-lg mr-2">{stage.icon || '📋'}</span>
                    <span className="z-10">{stage.label}</span>
                    <span className="absolute right-3 text-xs opacity-90">
                      {stage.value}
                    </span>
                  </div>
                  {index < stages.length - 1 && (
                    <div className="w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-gray-400 mt-2"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Real Hierarchy Diagram with backend data structure: { levels: [{ level, items: [{ label, color }] }] }
  const renderHierarchyDiagram = () => {
    // Handle nested data structure from backend
    const levels = editData?.levels || editData?.data?.levels;
    
    if (!levels || levels.length === 0) {
      return <div className="p-8 text-center text-gray-500">No hierarchy data available</div>;
    }

    return (
      <div className="h-full">
        {isEditing && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
            <h4 className="font-medium text-gray-900 mb-3">Edit Hierarchy Levels</h4>
            <div className="space-y-4">
              {editData.levels?.map((level: any, levelIndex: number) => (
                <div key={levelIndex} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Level {level.level}</label>
                    <button
                      onClick={() => {
                        const newLevels = [...editData.levels];
                        newLevels.splice(levelIndex, 1);
                        setEditData({ ...editData, levels: newLevels });
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {level.items?.map((item: any, itemIndex: number) => (
                      <div key={itemIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.label || ''}
                          onChange={(e) => {
                            const newLevels = [...editData.levels];
                            newLevels[levelIndex].items[itemIndex] = { ...item, label: e.target.value };
                            setEditData({ ...editData, levels: newLevels });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Item label"
                        />
                        <input
                          type="color"
                          value={item.color || '#3B82F6'}
                          onChange={(e) => {
                            const newLevels = [...editData.levels];
                            newLevels[levelIndex].items[itemIndex] = { ...item, color: e.target.value };
                            setEditData({ ...editData, levels: newLevels });
                          }}
                          className="w-12 h-8 border border-gray-300 rounded"
                        />
                        <button
                          onClick={() => {
                            const newLevels = [...editData.levels];
                            newLevels[levelIndex].items.splice(itemIndex, 1);
                            setEditData({ ...editData, levels: newLevels });
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newLevels = [...editData.levels];
                        newLevels[levelIndex].items.push({ label: 'New Item', color: '#3B82F6' });
                        setEditData({ ...editData, levels: newLevels });
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const newLevels = [...editData.levels, {
                    level: editData.levels.length + 1,
                    items: [{ label: 'New Level Item', color: '#3B82F6' }]
                  }];
                  setEditData({ ...editData, levels: newLevels });
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <FiPlus size={14} />
                Add Level
              </button>
            </div>
          </div>
        )}

        <div className="h-full flex flex-col justify-center items-center p-4 space-y-6 overflow-y-auto">
          {levels.map((level: any, levelIndex: number) => (
            <div key={levelIndex} className="flex justify-center items-center space-x-4 flex-wrap">
              {level.items.map((item: any, itemIndex: number) => (
                <div
                  key={itemIndex}
                  className="px-6 py-3 rounded-lg text-center font-medium text-white shadow-md m-1"
                  style={{ backgroundColor: item.color || '#3B82F6' }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Real Comparison Table with backend data structure: { columns: [], rows: [[]] }
  const renderComparisonTable = () => {
    // Handle nested data structure from backend
    const columns = editData?.columns || editData?.data?.columns;
    const rows = editData?.rows || editData?.data?.rows;
    
    if (!columns || !rows || columns.length === 0 || rows.length === 0) {
      return <div className="p-8 text-center text-gray-500">No comparison data available</div>;
    }

    return (
      <div className="h-full">
        {isEditing && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
            <h4 className="font-medium text-gray-900 mb-3">Edit Comparison Table</h4>
            
            {/* Edit Columns */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Columns</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editData.columns.map((column: string, index: number) => (
                  <div key={index} className="flex items-center gap-1">
                    <input
                      type="text"
                      value={column}
                      onChange={(e) => {
                        const newColumns = [...editData.columns];
                        newColumns[index] = e.target.value;
                        setEditData({ ...editData, columns: newColumns });
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={() => {
                        const newColumns = [...editData.columns];
                        const newRows = editData.rows.map((row: string[]) => row.filter((_: any, i: number) => i !== index));
                        newColumns.splice(index, 1);
                        setEditData({ ...editData, columns: newColumns, rows: newRows });
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newColumns = [...editData.columns, 'New Column'];
                    const newRows = editData.rows.map((row: string[]) => [...row, '']);
                    setEditData({ ...editData, columns: newColumns, rows: newRows });
                  }}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  <FiPlus size={12} />
                </button>
              </div>
            </div>

            {/* Edit Rows */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rows</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {editData.rows.map((row: string[], rowIndex: number) => (
                  <div key={rowIndex} className="flex items-center gap-1">
                    {row.map((cell: string, cellIndex: number) => (
                      <input
                        key={cellIndex}
                        type="text"
                        value={cell}
                        onChange={(e) => {
                          const newRows = [...editData.rows];
                          newRows[rowIndex][cellIndex] = e.target.value;
                          setEditData({ ...editData, rows: newRows });
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ))}
                    <button
                      onClick={() => {
                        const newRows = [...editData.rows];
                        newRows.splice(rowIndex, 1);
                        setEditData({ ...editData, rows: newRows });
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newRows = [...editData.rows, new Array(editData.columns.length).fill('')];
                    setEditData({ ...editData, rows: newRows });
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  <FiPlus size={12} />
                  Add Row
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto h-full">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-blue-50">
                {columns.map((column: string, index: number) => (
                  <th key={index} className="border border-gray-300 px-4 py-3 text-left font-semibold text-blue-900">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: string[], rowIndex: number) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.map((cell: string, cellIndex: number) => (
                    <td key={cellIndex} className="border border-gray-300 px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Real Flowchart with backend data structure: { nodes: [{ id, label, type }], edges: [{ from, to }] }
  const renderFlowchart = () => {
    // Debug: log the actual data structure (can be removed in production)
    // console.log('Flowchart editData:', editData);
    
    // Handle different possible data structures
    let nodes = editData?.nodes || editData?.data?.nodes;
    let edges = editData?.edges || editData?.data?.edges;
    
    // If no nodes found but edges exist, generate nodes from edges
    if (!nodes && edges && edges.length > 0) {
      const nodeIds = new Set<string>();
      edges.forEach((edge: any) => {
        nodeIds.add(edge.from);
        nodeIds.add(edge.to);
      });
      
      nodes = Array.from(nodeIds).map((id: string, index: number) => ({
        id: id,
        label: `Step ${id}`,
        type: index === 0 ? 'start' : index === nodeIds.size - 1 ? 'end' : 'process'
      }));
    }
    
    // If no nodes found, try to create from basic structure
    if (!nodes && editData) {
      // Check if data has a different structure
      if (editData.labels && editData.datasets) {
        // Convert Chart.js-like data to flowchart nodes
        nodes = editData.labels.map((label: string, index: number) => ({
          id: `node_${index}`,
          label: label,
          type: index === 0 ? 'start' : index === editData.labels.length - 1 ? 'end' : 'process'
        }));
      }
    }
    
    if (!nodes || nodes.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <div>No flowchart data available</div>
          <details className="mt-2 text-left bg-gray-100 p-2 rounded text-xs">
            <summary className="cursor-pointer">Debug Data Structure</summary>
            <pre>{JSON.stringify(editData, null, 2)}</pre>
          </details>
        </div>
      );
    }

    return (
      <div className="h-full">
        {isEditing && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
            <h4 className="font-medium text-gray-900 mb-3">Edit Flowchart</h4>
            
            {/* Edit Nodes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nodes</label>
              <div className="space-y-2">
                {editData.nodes?.map((node: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                    <input
                      type="text"
                      value={node.label || ''}
                      onChange={(e) => {
                        const newNodes = [...editData.nodes];
                        newNodes[index] = { ...node, label: e.target.value };
                        setEditData({ ...editData, nodes: newNodes });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Node label"
                    />
                    <select
                      value={node.type || 'process'}
                      onChange={(e) => {
                        const newNodes = [...editData.nodes];
                        newNodes[index] = { ...node, type: e.target.value };
                        setEditData({ ...editData, nodes: newNodes });
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="start">Start</option>
                      <option value="process">Process</option>
                      <option value="decision">Decision</option>
                      <option value="end">End</option>
                    </select>
                    <button
                      onClick={() => {
                        const newNodes = [...editData.nodes];
                        const newEdges = editData.edges?.filter((edge: any) => edge.from !== node.id && edge.to !== node.id) || [];
                        newNodes.splice(index, 1);
                        setEditData({ ...editData, nodes: newNodes, edges: newEdges });
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newId = `node_${Date.now()}`;
                    const newNodes = [...editData.nodes, { id: newId, label: 'New Node', type: 'process' }];
                    setEditData({ ...editData, nodes: newNodes });
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  <FiPlus size={14} />
                  Add Node
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="h-full flex flex-wrap justify-center items-center p-4 gap-4">
          {nodes.map((node: any, index: number) => {
            const getNodeShape = (type: string) => {
              switch (type) {
                case 'start': return 'rounded-full';
                case 'end': return 'rounded-full';
                case 'decision': return 'transform rotate-45';
                case 'process': 
                default: return 'rounded-lg';
              }
            };

            const getNodeColor = (type: string) => {
              switch (type) {
                case 'start': return 'bg-green-500';
                case 'end': return 'bg-red-500';
                case 'decision': return 'bg-yellow-500';
                case 'process':
                default: return 'bg-blue-500';
              }
            };

            return (
              <div key={index} className="relative">
                <div
                  className={`${getNodeShape(node.type)} ${getNodeColor(node.type)} text-white text-center p-4 min-w-24 min-h-12 flex items-center justify-center font-medium text-sm shadow-lg`}
                  style={{
                    transform: node.type === 'decision' ? 'rotate(45deg)' : 'none'
                  }}
                >
                  <span style={{ transform: node.type === 'decision' ? 'rotate(-45deg)' : 'none' }}>
                    {node.label}
                  </span>
                </div>
                {index < nodes.length - 1 && (
                  <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 text-gray-400">
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Real System Diagram with backend data structure: { components: [{ id, label, type }], connections: [{ from, to }] }
  const renderSystemDiagram = () => {
    // Handle nested data structure from backend
    const components = editData?.components || editData?.data?.components;
    const connections = editData?.connections || editData?.data?.connections;
    
    if (!components || components.length === 0) {
      return <div className="p-8 text-center text-gray-500">No system diagram data available</div>;
    }

    return (
      <div className="h-full">
        {isEditing && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
            <h4 className="font-medium text-gray-900 mb-3">Edit System Components</h4>
            <div className="space-y-2">
              {editData.components?.map((component: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                  <input
                    type="text"
                    value={component.label || ''}
                    onChange={(e) => {
                      const newComponents = [...editData.components];
                      newComponents[index] = { ...component, label: e.target.value };
                      setEditData({ ...editData, components: newComponents });
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Component name"
                  />
                  <select
                    value={component.type || 'service'}
                    onChange={(e) => {
                      const newComponents = [...editData.components];
                      newComponents[index] = { ...component, type: e.target.value };
                      setEditData({ ...editData, components: newComponents });
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="web">Web</option>
                    <option value="service">Service</option>
                    <option value="database">Database</option>
                    <option value="api">API</option>
                    <option value="cache">Cache</option>
                  </select>
                  <button
                    onClick={() => {
                      const newComponents = [...editData.components];
                      const newConnections = editData.connections?.filter((conn: any) => conn.from !== component.id && conn.to !== component.id) || [];
                      newComponents.splice(index, 1);
                      setEditData({ ...editData, components: newComponents, connections: newConnections });
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newId = `comp_${Date.now()}`;
                  const newComponents = [...editData.components, { id: newId, label: 'New Component', type: 'service' }];
                  setEditData({ ...editData, components: newComponents });
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <FiPlus size={14} />
                Add Component
              </button>
            </div>
          </div>
        )}

        <div className="h-full p-4">
          <svg width="100%" height="400" className="border border-gray-200 rounded bg-gray-50">
            {components.map((component: any, index: number) => {
              // Create a better layout - arrange components in a grid pattern
              const cols = Math.ceil(Math.sqrt(components.length));
              const row = Math.floor(index / cols);
              const col = index % cols;
              const x = 100 + col * 150;
              const y = 100 + row * 120;
            const getComponentIcon = (type: string) => {
              switch (type) {
                case 'web': return '🌐';
                case 'database': return '🗄️';
                case 'api': return '🔌';
                case 'cache': return '⚡';
                case 'service':
                default: return '⚙️';
              }
            };

            const getComponentColor = (type: string) => {
              switch (type) {
                case 'web': return 'bg-green-500';
                case 'database': return 'bg-purple-500';
                case 'api': return 'bg-orange-500';
                case 'cache': return 'bg-yellow-500';
                case 'service':
                default: return 'bg-blue-500';
              }
            };

              return (
                <g key={index}>
                  {/* Component rectangle */}
                  <rect
                    x={x - 60}
                    y={y - 30}
                    width="120"
                    height="60"
                    rx="8"
                    fill={getComponentColor(component.type)}
                    stroke="#1F2937"
                    strokeWidth="2"
                  />
                  
                  {/* Component icon */}
                  <text
                    x={x}
                    y={y - 8}
                    textAnchor="middle"
                    fontSize="20"
                  >
                    {getComponentIcon(component.type)}
                  </text>
                  
                  {/* Component label */}
                  <text
                    x={x}
                    y={y + 8}
                    textAnchor="middle"
                    fontSize="12"
                    fill="white"
                    fontWeight="500"
                  >
                    {component.label}
                  </text>
                  
                  {/* Component type */}
                  <text
                    x={x}
                    y={y + 22}
                    textAnchor="middle"
                    fontSize="10"
                    fill="white"
                    opacity="0.8"
                    style={{ textTransform: 'capitalize' }}
                  >
                    {component.type}
                  </text>
                </g>
              );
            })}
            
            {/* Render connections if available */}
            {connections && connections.map((connection: any, index: number) => {
              const fromComponent = components.find((c: any) => c.id === connection.from);
              const toComponent = components.find((c: any) => c.id === connection.to);
              
              if (!fromComponent || !toComponent) return null;
              
              const fromIndex = components.findIndex((c: any) => c.id === connection.from);
              const toIndex = components.findIndex((c: any) => c.id === connection.to);
              
              // Calculate positions (same logic as above)
              const cols = Math.ceil(Math.sqrt(components.length));
              
              const fromRow = Math.floor(fromIndex / cols);
              const fromCol = fromIndex % cols;
              const fromX = 100 + fromCol * 150;
              const fromY = 100 + fromRow * 120;
              
              const toRow = Math.floor(toIndex / cols);
              const toCol = toIndex % cols;
              const toX = 100 + toCol * 150;
              const toY = 100 + toRow * 120;
              
              return (
                <line
                  key={`connection-${index}`}
                  x1={fromX + 60}
                  y1={fromY}
                  x2={toX - 60}
                  y2={toY}
                  stroke="#6B7280"
                  strokeWidth="2"
                  markerEnd="url(#systemArrow)"
                />
              );
            })}
            
            <defs>
              <marker
                id="systemArrow"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#6B7280" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>
    );
  };

  // Real Workflow Diagram with backend data structure: { nodes: [{ id, label, type, x, y }], edges: [{ from, to }] }
  const renderWorkflowDiagram = () => {
    // Handle nested data structure from backend
    let nodes = editData?.nodes || editData?.data?.nodes;
    let edges = editData?.edges || editData?.data?.edges;
    
    // If no nodes but edges exist, generate nodes from edges (like in the backend data structure)
    if (!nodes && edges && edges.length > 0) {
      const nodeIds = new Set<string>();
      edges.forEach((edge: any) => {
        nodeIds.add(edge.from);
        nodeIds.add(edge.to);
      });
      
      nodes = Array.from(nodeIds).map((id: string, index: number) => ({
        id: id,
        label: `Step ${id}`,
        type: index === 0 ? 'start' : id.includes('decision') ? 'decision' : index === nodeIds.size - 1 ? 'end' : 'process'
      }));
    }
    
    if (!nodes || nodes.length === 0) {
      return <div className="p-8 text-center text-gray-500">No workflow data available</div>;
    }

    return (
      <div className="h-full">
        {isEditing && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
            <h4 className="font-medium text-gray-900 mb-3">Edit Workflow Steps</h4>
            <div className="space-y-2">
              {editData.nodes?.map((node: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                  <input
                    type="text"
                    value={node.label || ''}
                    onChange={(e) => {
                      const newNodes = [...editData.nodes];
                      newNodes[index] = { ...node, label: e.target.value };
                      setEditData({ ...editData, nodes: newNodes });
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Step name"
                  />
                  <select
                    value={node.type || 'process'}
                    onChange={(e) => {
                      const newNodes = [...editData.nodes];
                      newNodes[index] = { ...node, type: e.target.value };
                      setEditData({ ...editData, nodes: newNodes });
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="start">Start</option>
                    <option value="process">Process</option>
                    <option value="decision">Decision</option>
                    <option value="end">End</option>
                  </select>
                  <button
                    onClick={() => {
                      const newNodes = [...editData.nodes];
                      newNodes.splice(index, 1);
                      setEditData({ ...editData, nodes: newNodes });
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newId = `step_${Date.now()}`;
                  const newNodes = [...editData.nodes, { id: newId, label: 'New Step', type: 'process', x: 0, y: 0 }];
                  setEditData({ ...editData, nodes: newNodes });
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <FiPlus size={14} />
                Add Step
              </button>
            </div>
          </div>
        )}

        <div className="h-full p-4">
          <svg width="100%" height="400" className="border border-gray-200 rounded bg-gray-50">
            {/* Render workflow nodes */}
            {nodes.map((node: any, index: number) => {
              const x = 100 + (index % 4) * 150;
              const y = 100 + Math.floor(index / 4) * 100;
              
              const getNodeColor = (type: string) => {
                switch (type) {
                  case 'start': return '#10B981';
                  case 'end': return '#EF4444';
                  case 'decision': return '#F59E0B';
                  case 'process':
                  default: return '#3B82F6';
                }
              };

              return (
                <g key={index}>
                  {node.type === 'decision' ? (
                    <polygon
                      points={`${x-30},${y} ${x},${y-20} ${x+30},${y} ${x},${y+20}`}
                      fill={getNodeColor(node.type)}
                      stroke="#1F2937"
                      strokeWidth="2"
                    />
                  ) : (
                    <rect
                      x={x - 40}
                      y={y - 15}
                      width="80"
                      height="30"
                      rx={node.type === 'start' || node.type === 'end' ? '15' : '5'}
                      fill={getNodeColor(node.type)}
                      stroke="#1F2937"
                      strokeWidth="2"
                    />
                  )}
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fill="white"
                    fontWeight="500"
                  >
                    {node.label}
                  </text>
                  
                  {/* Arrow to next node */}
                  {index < nodes.length - 1 && (
                    <line
                      x1={x + 40}
                      y1={y}
                      x2={x + 110}
                      y2={y}
                      stroke="#6B7280"
                      strokeWidth="2"
                      markerEnd="url(#workflowArrow)"
                    />
                  )}
                </g>
              );
            })}
            
            <defs>
              <marker
                id="workflowArrow"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#6B7280" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>
    );
  };

  // Real Comparison Matrix with backend data structure: { criteria: [], solutions: [], scores: [[]] }
  const renderComparisonMatrix = () => {
    // Handle nested data structure from backend
    const criteria = editData?.criteria || editData?.data?.criteria;
    const solutions = editData?.solutions || editData?.data?.solutions;
    const scores = editData?.scores || editData?.data?.scores;
    
    if (!criteria || !solutions || !scores || criteria.length === 0 || solutions.length === 0) {
      return <div className="p-8 text-center text-gray-500">No comparison matrix data available</div>;
    }

    const maxScore = 5; // Assuming 1-5 scale

    return (
      <div className="h-full">
        {isEditing && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
            <h4 className="font-medium text-gray-900 mb-3">Edit Comparison Matrix</h4>
            
            {/* Edit Criteria */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Criteria</label>
              <div className="space-y-1">
                {editData.criteria.map((criterion: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={criterion}
                      onChange={(e) => {
                        const newCriteria = [...editData.criteria];
                        newCriteria[index] = e.target.value;
                        setEditData({ ...editData, criteria: newCriteria });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={() => {
                        const newCriteria = [...editData.criteria];
                        const newScores = editData.scores.map((row: number[]) => row.filter((_: any, i: number) => i !== index));
                        newCriteria.splice(index, 1);
                        setEditData({ ...editData, criteria: newCriteria, scores: newScores });
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newCriteria = [...editData.criteria, 'New Criteria'];
                    const newScores = editData.scores.map((row: number[]) => [...row, 3]);
                    setEditData({ ...editData, criteria: newCriteria, scores: newScores });
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  + Add Criteria
                </button>
              </div>
            </div>

            {/* Edit Solutions */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Solutions</label>
              <div className="space-y-1">
                {editData.solutions.map((solution: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={solution}
                      onChange={(e) => {
                        const newSolutions = [...editData.solutions];
                        newSolutions[index] = e.target.value;
                        setEditData({ ...editData, solutions: newSolutions });
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={() => {
                        const newSolutions = [...editData.solutions];
                        const newScores = [...editData.scores];
                        newSolutions.splice(index, 1);
                        newScores.splice(index, 1);
                        setEditData({ ...editData, solutions: newSolutions, scores: newScores });
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newSolutions = [...editData.solutions, 'New Solution'];
                    const newScores = [...editData.scores, new Array(editData.criteria.length).fill(3)];
                    setEditData({ ...editData, solutions: newSolutions, scores: newScores });
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  + Add Solution
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-auto h-full p-4">
          <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-lg">
            <thead>
              <tr>
                <th className="bg-gray-800 text-white p-3 text-left font-semibold">Solutions / Criteria</th>
                {criteria.map((criterion: string, index: number) => (
                  <th key={index} className="bg-gray-700 text-white p-3 text-center font-semibold text-sm">
                    {criterion}
                  </th>
                ))}
                <th className="bg-gray-800 text-white p-3 text-center font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {solutions.map((solution: string, rowIndex: number) => {
                const total = scores[rowIndex]?.reduce((sum: number, score: number) => sum + score, 0) || 0;
                return (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="p-3 font-medium text-gray-900 border-r border-gray-200">
                      {solution}
                    </td>
                    {scores[rowIndex]?.map((score: number, colIndex: number) => (
                      <td key={colIndex} className="p-3 text-center border-r border-gray-200">
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={score}
                            onChange={(e) => {
                              const newScores = [...editData.scores];
                              newScores[rowIndex][colIndex] = parseInt(e.target.value) || 1;
                              setEditData({ ...editData, scores: newScores });
                            }}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                        ) : (
                          <div className="flex items-center justify-center">
                            <div
                              className="px-3 py-1 rounded-full text-white font-medium text-sm"
                              style={{
                                backgroundColor: score >= 4 ? '#10B981' : score >= 3 ? '#F59E0B' : '#EF4444'
                              }}
                            >
                              {score}
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="p-3 text-center font-bold text-lg text-blue-600">
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Real Relationship Diagram with backend data structure: { nodes: [{ id, label, type, size }], connections: [{ from, to, strength }] }
  const renderRelationshipDiagram = () => {
    // Handle nested data structure from backend
    const nodes = editData?.nodes || editData?.data?.nodes;
    const connections = editData?.connections || editData?.data?.connections;
    
    if (!nodes || nodes.length === 0) {
      return <div className="p-8 text-center text-gray-500">No relationship data available</div>;
    }

    return (
      <div className="h-full">
        {isEditing && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
            <h4 className="font-medium text-gray-900 mb-3">Edit Relationship Nodes</h4>
            <div className="space-y-2">
              {editData.nodes?.map((node: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                  <input
                    type="text"
                    value={node.label || ''}
                    onChange={(e) => {
                      const newNodes = [...editData.nodes];
                      newNodes[index] = { ...node, label: e.target.value };
                      setEditData({ ...editData, nodes: newNodes });
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Node label"
                  />
                  <select
                    value={node.type || 'related'}
                    onChange={(e) => {
                      const newNodes = [...editData.nodes];
                      newNodes[index] = { ...node, type: e.target.value };
                      setEditData({ ...editData, nodes: newNodes });
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="central">Central</option>
                    <option value="related">Related</option>
                    <option value="secondary">Secondary</option>
                  </select>
                  <input
                    type="number"
                    min="20"
                    max="60"
                    value={node.size || 25}
                    onChange={(e) => {
                      const newNodes = [...editData.nodes];
                      newNodes[index] = { ...node, size: parseInt(e.target.value) || 25 };
                      setEditData({ ...editData, nodes: newNodes });
                    }}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Size"
                  />
                  <button
                    onClick={() => {
                      const newNodes = [...editData.nodes];
                      const newConnections = editData.connections?.filter((conn: any) => conn.from !== node.id && conn.to !== node.id) || [];
                      newNodes.splice(index, 1);
                      setEditData({ ...editData, nodes: newNodes, connections: newConnections });
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newId = `node_${Date.now()}`;
                  const newNodes = [...editData.nodes, { id: newId, label: 'New Node', type: 'related', size: 25 }];
                  setEditData({ ...editData, nodes: newNodes });
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <FiPlus size={14} />
                Add Node
              </button>
            </div>
          </div>
        )}

        <div className="h-full p-4">
          <svg width="100%" height="400" className="border border-gray-200 rounded bg-gray-50">
            {/* Render relationship nodes */}
            {nodes.map((node: any, index: number) => {
              // Position nodes in a circular layout
              const centerNode = nodes.find((n: any) => n.type === 'central');
              const isCentral = node.type === 'central';
              
              let x, y;
              if (isCentral) {
                x = 300;
                y = 200;
              } else {
                const nonCentralNodes = nodes.filter((n: any) => n.type !== 'central');
                const nodeIndex = nonCentralNodes.findIndex((n: any) => n.id === node.id);
                const totalNonCentral = nonCentralNodes.length;
                const angle = (nodeIndex * 2 * Math.PI) / totalNonCentral;
                const radius = 120;
                x = 300 + radius * Math.cos(angle);
                y = 200 + radius * Math.sin(angle);
              }
              
              const getNodeColor = (type: string) => {
                switch (type) {
                  case 'central': return '#DC2626';
                  case 'related': return '#2563EB';
                  case 'secondary': return '#059669';
                  default: return '#6B7280';
                }
              };

              const nodeSize = node.size || 25;

              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r={nodeSize}
                    fill={getNodeColor(node.type)}
                    stroke="#1F2937"
                    strokeWidth="2"
                    opacity="0.8"
                  />
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize={nodeSize > 30 ? "12" : "10"}
                    fill="white"
                    fontWeight="500"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
            
            {/* Render connections */}
            {connections?.map((connection: any, index: number) => {
              const fromNode = nodes.find((n: any) => n.id === connection.from);
              const toNode = nodes.find((n: any) => n.id === connection.to);
              
              if (!fromNode || !toNode) return null;
              
              // Calculate positions (same logic as above)
              const getNodePosition = (node: any) => {
                const isCentral = node.type === 'central';
                if (isCentral) {
                  return { x: 300, y: 200 };
                } else {
                  const nonCentralNodes = nodes.filter((n: any) => n.type !== 'central');
                  const nodeIndex = nonCentralNodes.findIndex((n: any) => n.id === node.id);
                  const totalNonCentral = nonCentralNodes.length;
                  const angle = (nodeIndex * 2 * Math.PI) / totalNonCentral;
                  const radius = 120;
                  return {
                    x: 300 + radius * Math.cos(angle),
                    y: 200 + radius * Math.sin(angle)
                  };
                }
              };
              
              const fromPos = getNodePosition(fromNode);
              const toPos = getNodePosition(toNode);
              
              const getConnectionStyle = (strength: string) => {
                switch (strength) {
                  case 'strong': return { strokeWidth: '3', stroke: '#DC2626', opacity: '0.8' };
                  case 'medium': return { strokeWidth: '2', stroke: '#F59E0B', opacity: '0.6' };
                  case 'weak': return { strokeWidth: '1', stroke: '#6B7280', opacity: '0.4' };
                  default: return { strokeWidth: '2', stroke: '#6B7280', opacity: '0.6' };
                }
              };
              
              const style = getConnectionStyle(connection.strength);
              
              return (
                <line
                  key={`connection-${index}`}
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  {...style}
                />
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  // Main render function
  // Real Scatter Plot renderer
  const renderScatterPlot = () => {
    const data = editData?.data || editData;
    const points = data?.points || data?.datasets?.[0]?.data || [];
    
    return (
      <div className="h-full">
        {isEditing && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Edit Scatter Points</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {points.map((point: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="number"
                    value={point.x || 0}
                    onChange={(e) => {
                      const newPoints = [...points];
                      newPoints[index] = { ...point, x: parseFloat(e.target.value) };
                      setEditData({ ...editData, points: newPoints });
                    }}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="X"
                  />
                  <input
                    type="number"
                    value={point.y || 0}
                    onChange={(e) => {
                      const newPoints = [...points];
                      newPoints[index] = { ...point, y: parseFloat(e.target.value) };
                      setEditData({ ...editData, points: newPoints });
                    }}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Y"
                  />
                  <button
                    onClick={() => {
                      const newPoints = [...points];
                      newPoints.splice(index, 1);
                      setEditData({ ...editData, points: newPoints });
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="h-full p-4">
          <div className="w-full h-80 border border-gray-200 rounded bg-white overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 600 300" className="max-w-full max-h-full">
            {/* Axes */}
            <line x1="50" y1="250" x2="550" y2="250" stroke="#6B7280" strokeWidth="2" />
            <line x1="50" y1="250" x2="50" y2="50" stroke="#6B7280" strokeWidth="2" />
            
            {/* Plot points */}
            {points.map((point: any, index: number) => (
              <circle
                key={index}
                cx={50 + (point.x || 0) * 10}
                cy={250 - (point.y || 0) * 10}
                r="4"
                fill="#3B82F6"
                stroke="#1F2937"
                strokeWidth="1"
              />
            ))}
            </svg>
          </div>
        </div>
      </div>
    );
  };

  // Real Timeline Chart renderer
  const renderTimelineChart = () => {
    const events = editData?.events || editData?.data?.events || [];
    
    return (
      <div className="h-full">
        {isEditing && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
            <h4 className="font-medium text-gray-900 mb-3">Edit Timeline Events</h4>
            {/* Event editing controls */}
          </div>
        )}
        
        <div className="h-full p-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-600"></div>
            
            {/* Timeline events */}
            {events.map((event: any, index: number) => (
              <div key={index} className="relative flex items-center mb-6">
                <div className="w-4 h-4 bg-blue-600 rounded-full z-10"></div>
                <div className="ml-4 bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                  <h5 className="font-medium text-gray-900">{event.title || `Event ${index + 1}`}</h5>
                  <p className="text-sm text-gray-600">{event.date || 'Date'}</p>
                  <p className="text-sm text-gray-700 mt-1">{event.description || 'Description'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Real Gantt Chart renderer
  const renderGanttChart = () => {
    const tasks = editData?.tasks || editData?.data?.tasks || [];
    
    return (
      <div className="h-full">
        <div className="h-full p-4">
          <div className="space-y-2">
            {tasks.map((task: any, index: number) => (
              <div key={index} className="flex items-center">
                <div className="w-32 text-sm font-medium text-gray-700 truncate">
                  {task.name || `Task ${index + 1}`}
                </div>
                <div className="flex-1 relative h-6 bg-gray-100 rounded">
                  <div
                    className="absolute top-0 h-6 bg-blue-600 rounded"
                    style={{
                      left: `${(task.start || 0) * 10}%`,
                      width: `${(task.duration || 10) * 2}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Real Network Diagram renderer
  const renderNetworkDiagram = () => {
    const nodes = editData?.nodes || [];
    const connections = editData?.connections || [];
    
    return (
      <div className="h-full p-4">
        <div className="w-full h-96 border border-gray-200 rounded bg-gray-50 overflow-hidden">
          <svg width="100%" height="100%" viewBox="0 0 600 400" className="max-w-full max-h-full">
          {/* Network connections */}
          {connections.map((connection: any, index: number) => (
            <line
              key={index}
              x1={connection.x1 || 100}
              y1={connection.y1 || 100}
              x2={connection.x2 || 200}
              y2={connection.y2 || 200}
              stroke="#6B7280"
              strokeWidth="2"
            />
          ))}
          
          {/* Network nodes */}
          {nodes.map((node: any, index: number) => (
            <g key={index}>
              <circle
                cx={node.x || 100 + index * 50}
                cy={node.y || 100}
                r="20"
                fill="#3B82F6"
                stroke="#1F2937"
                strokeWidth="2"
              />
              <text
                x={node.x || 100 + index * 50}
                y={node.y || 105}
                textAnchor="middle"
                fontSize="10"
                fill="white"
                fontWeight="500"
              >
                {node.label || `N${index + 1}`}
              </text>
            </g>
          ))}
          </svg>
        </div>
      </div>
    );
  };

  // Real Tree Diagram renderer
  const renderTreeDiagram = () => {
    const root = editData?.root || { label: 'Root', children: [] };
    
    return (
      <div className="h-full p-4">
        <div className="w-full h-96 border border-gray-200 rounded bg-white overflow-hidden">
          <svg width="100%" height="100%" viewBox="0 0 600 400" className="max-w-full max-h-full">
          {/* Tree structure rendering */}
          <g>
            <rect x="250" y="50" width="80" height="30" rx="5" fill="#3B82F6" stroke="#1F2937" strokeWidth="2" />
            <text x="290" y="70" textAnchor="middle" fontSize="12" fill="white" fontWeight="500">
              {root.label}
            </text>
          </g>
          </svg>
        </div>
      </div>
    );
  };

  // Real Venn Diagram renderer
  const renderVennDiagram = () => {
    const sets = editData?.sets || [];
    
    return (
      <div className="h-full p-4">
        <div className="w-full h-96 border border-gray-200 rounded bg-white overflow-hidden">
          <svg width="100%" height="100%" viewBox="0 0 600 400" className="max-w-full max-h-full">
          {/* Venn diagram circles */}
          <circle cx="200" cy="200" r="80" fill="rgba(59, 130, 246, 0.5)" stroke="#3B82F6" strokeWidth="2" />
          <circle cx="280" cy="200" r="80" fill="rgba(239, 68, 68, 0.5)" stroke="#EF4444" strokeWidth="2" />
          
          {/* Labels */}
          <text x="150" y="150" textAnchor="middle" fontSize="14" fontWeight="500">Set A</text>
          <text x="330" y="150" textAnchor="middle" fontSize="14" fontWeight="500">Set B</text>
          <text x="240" y="205" textAnchor="middle" fontSize="12" fontWeight="500">Overlap</text>
          </svg>
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      // Chart.js compatible charts with full editing
      case 'bar_chart':
      case 'line_chart':
      case 'pie_chart':
      case 'doughnut_chart':
      case 'scatter_plot':
      case 'bubble_chart':
      case 'histogram':
        return renderChartJS();
      
      // Real functional chart renderers
      case 'cycle_diagram':
        return renderCycleDiagram();
      
      case 'process_funnel':
      case 'funnel':
        return renderProcessFunnel();
        
      case 'hierarchy_diagram':
      case 'hierarchy':
      case 'org_chart':
        return renderHierarchyDiagram();
        
      case 'comparison_table':
        return renderComparisonTable();

      case 'flowchart':
        return renderFlowchart();

      case 'system_diagram':
        return renderSystemDiagram();

      case 'workflow_diagram':
      case 'process_workflow':
        return renderWorkflowDiagram();

      case 'comparison_matrix':
        return renderComparisonMatrix();

      case 'relationship_diagram':
        return renderRelationshipDiagram();

      // Additional real chart renderers
      case 'scatter_plot':
        return renderScatterPlot();

      case 'timeline_chart':
        return renderTimelineChart();

      case 'gantt_chart':
        return renderGanttChart();

      case 'network_diagram':
        return renderNetworkDiagram();

      case 'tree_diagram':
        return renderTreeDiagram();

      case 'venn_diagram':
        return renderVennDiagram();
      
      // For other types, show the structure but indicate they need implementation
      default:
        return (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {chartType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            <p className="text-gray-600 mb-4">Real functional renderer needed</p>
            {editData && Object.keys(editData).length > 0 && (
              <details className="mt-4 text-left bg-gray-50 p-4 rounded-lg max-w-md">
                <summary className="cursor-pointer font-medium text-gray-700">View Backend Data Structure</summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-32">
                  {JSON.stringify(editData, null, 2)}
                </pre>
              </details>
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full bg-white rounded-lg border border-gray-200 relative overflow-hidden">
      {/* Edit Controls */}
      {editable && (
        <div className="absolute top-2 right-2 z-20 flex gap-1">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
              title="Edit chart"
            >
              <FiEdit3 size={14} className="text-gray-600" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={handleSaveChanges}
                disabled={isLoading}
                className="p-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                title="Save changes"
              >
                <FiSave size={14} />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-2 bg-gray-500 text-white rounded-md shadow-sm hover:bg-gray-600 transition-colors"
                title="Cancel"
              >
                <FiX size={14} />
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-30 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-gray-600">Updating chart...</span>
          </div>
        </div>
      )}
      
      {/* Chart Content */}
      <div className="h-full flex flex-col min-h-0">
        <div className="flex-1 p-4 overflow-auto">
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default RealChartRenderer;