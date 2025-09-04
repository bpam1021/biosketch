import React from 'react';
import { FiBarChart, FiTrendingUp, FiPieChart, FiCircle, FiLayers, FiUsers, FiMap, FiGrid, FiTarget, FiClock, FiTool, FiZap, FiSettings, FiDatabase, FiMonitor } from 'react-icons/fi';

export interface ChartType {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  category: string;
  sampleData: any;
  sampleConfig: any;
  aiPrompt: string;
}

export const ALL_CHART_TEMPLATES: ChartType[] = [
  // Data Visualization
  {
    id: 'bar_chart',
    name: 'Bar Chart',
    icon: React.createElement(FiBarChart, { size: 24 }),
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
    icon: React.createElement(FiTrendingUp, { size: 24 }),
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
    icon: React.createElement(FiPieChart, { size: 24 }),
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
    id: 'scatter_plot',
    name: 'Scatter Plot',
    icon: React.createElement(FiCircle, { size: 24 }),
    description: 'Show relationships between variables',
    category: 'data_viz',
    sampleData: {
      datasets: [{
        label: 'Data Points',
        data: [
          {x: 10, y: 20}, {x: 15, y: 25}, {x: 20, y: 30}, 
          {x: 25, y: 35}, {x: 30, y: 40}
        ],
        backgroundColor: '#3B82F6'
      }]
    },
    sampleConfig: {
      type: 'scatter',
      responsive: true,
      maintainAspectRatio: false
    },
    aiPrompt: 'Create a scatter plot to show correlations in: '
  },
  {
    id: 'histogram',
    name: 'Histogram',
    icon: React.createElement(FiBarChart, { size: 24 }),
    description: 'Show frequency distribution',
    category: 'data_viz',
    sampleData: {
      labels: ['0-10', '10-20', '20-30', '30-40', '40-50'],
      datasets: [{
        label: 'Frequency',
        data: [5, 12, 18, 8, 3],
        backgroundColor: '#3B82F6'
      }]
    },
    sampleConfig: {
      type: 'bar',
      responsive: true,
      maintainAspectRatio: false
    },
    aiPrompt: 'Create a histogram to show the distribution of: '
  },
  {
    id: 'heatmap',
    name: 'Heat Map',
    icon: React.createElement(FiGrid, { size: 24 }),
    description: 'Show data density or intensity',
    category: 'data_viz',
    sampleData: {
      matrix: [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12]
      ],
      labels: {
        x: ['A', 'B', 'C', 'D'],
        y: ['X', 'Y', 'Z']
      }
    },
    sampleConfig: {
      type: 'heatmap',
      responsive: true
    },
    aiPrompt: 'Create a heatmap to visualize the intensity of: '
  },
  {
    id: 'treemap',
    name: 'Tree Map',
    icon: React.createElement(FiGrid, { size: 24 }),
    description: 'Show hierarchical data as nested rectangles',
    category: 'data_viz',
    sampleData: {
      children: [
        { name: 'Marketing', value: 100 },
        { name: 'Sales', value: 80 },
        { name: 'Development', value: 120 },
        { name: 'Support', value: 60 }
      ]
    },
    sampleConfig: {
      type: 'treemap',
      responsive: true
    },
    aiPrompt: 'Create a treemap to show the hierarchical structure of: '
  },
  {
    id: 'bubble_chart',
    name: 'Bubble Chart',
    icon: React.createElement(FiCircle, { size: 24 }),
    description: 'Show three dimensions of data',
    category: 'data_viz',
    sampleData: {
      datasets: [{
        label: 'Companies',
        data: [
          {x: 20, y: 30, r: 10},
          {x: 40, y: 20, r: 15},
          {x: 35, y: 45, r: 20}
        ],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B']
      }]
    },
    sampleConfig: {
      type: 'bubble',
      responsive: true,
      maintainAspectRatio: false
    },
    aiPrompt: 'Create a bubble chart to show multi-dimensional relationships in: '
  },

  // Process & Flow
  {
    id: 'flowchart',
    name: 'Flowchart',
    icon: React.createElement(FiLayers, { size: 24 }),
    description: 'Show process steps and decision points',
    category: 'process',
    sampleData: {
      nodes: [
        { id: 0, label: 'Start', type: 'start' },
        { id: 1, label: 'Process Data', type: 'process' },
        { id: 2, label: 'Valid?', type: 'decision' },
        { id: 3, label: 'End', type: 'end' }
      ],
      connections: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 }
      ]
    },
    sampleConfig: {
      type: 'flowchart',
      responsive: true,
      layout: 'hierarchical'
    },
    aiPrompt: 'Create a flowchart to map out the process described in: '
  },
  {
    id: 'process_flow',
    name: 'Process Flow',
    icon: React.createElement(FiZap, { size: 24 }),
    description: 'Detailed process workflow',
    category: 'process',
    sampleData: {
      steps: [
        { name: 'Input', description: 'Data entry' },
        { name: 'Validation', description: 'Check data' },
        { name: 'Processing', description: 'Transform data' },
        { name: 'Output', description: 'Results' }
      ]
    },
    sampleConfig: {
      type: 'process_flow',
      responsive: true
    },
    aiPrompt: 'Create a process flow diagram for: '
  },
  {
    id: 'user_journey',
    name: 'User Journey',
    icon: React.createElement(FiMap, { size: 24 }),
    description: 'Map user interactions and experiences',
    category: 'process',
    sampleData: {
      touchpoints: [
        { stage: 'Awareness', actions: ['See ad', 'Visit website'] },
        { stage: 'Consideration', actions: ['Read reviews', 'Compare prices'] },
        { stage: 'Purchase', actions: ['Add to cart', 'Checkout'] },
        { stage: 'Support', actions: ['Contact support', 'Get help'] }
      ]
    },
    sampleConfig: {
      type: 'user_journey',
      responsive: true
    },
    aiPrompt: 'Create a user journey map for: '
  },
  {
    id: 'workflow',
    name: 'Workflow Diagram',
    icon: React.createElement(FiSettings, { size: 24 }),
    description: 'Show workflow and task dependencies',
    category: 'process',
    sampleData: {
      tasks: [
        { id: 1, name: 'Research', duration: 2, dependencies: [] },
        { id: 2, name: 'Design', duration: 3, dependencies: [1] },
        { id: 3, name: 'Development', duration: 5, dependencies: [2] },
        { id: 4, name: 'Testing', duration: 2, dependencies: [3] }
      ]
    },
    sampleConfig: {
      type: 'workflow',
      responsive: true
    },
    aiPrompt: 'Create a workflow diagram for: '
  },
  {
    id: 'swimlane',
    name: 'Swimlane Diagram',
    icon: React.createElement(FiLayers, { size: 24 }),
    description: 'Show process across departments/roles',
    category: 'process',
    sampleData: {
      lanes: [
        { name: 'Customer', tasks: ['Request', 'Review', 'Approve'] },
        { name: 'Sales', tasks: ['Quote', 'Follow-up', 'Close'] },
        { name: 'Delivery', tasks: ['Ship', 'Install', 'Support'] }
      ]
    },
    sampleConfig: {
      type: 'swimlane',
      responsive: true
    },
    aiPrompt: 'Create a swimlane diagram for: '
  },

  // Organizational & Structure
  {
    id: 'org_chart',
    name: 'Organizational Chart',
    icon: React.createElement(FiUsers, { size: 24 }),
    description: 'Show organizational hierarchy',
    category: 'organization',
    sampleData: {
      nodes: [
        { id: 1, name: 'CEO', title: 'Chief Executive Officer', level: 0 },
        { id: 2, name: 'CTO', title: 'Chief Technology Officer', level: 1, parent: 1 },
        { id: 3, name: 'CFO', title: 'Chief Financial Officer', level: 1, parent: 1 },
        { id: 4, name: 'Dev Manager', title: 'Development Manager', level: 2, parent: 2 }
      ]
    },
    sampleConfig: {
      type: 'org_chart',
      responsive: true
    },
    aiPrompt: 'Create an organizational chart for: '
  },
  {
    id: 'hierarchy',
    name: 'Hierarchy Diagram',
    icon: React.createElement(FiLayers, { size: 24 }),
    description: 'Show hierarchical relationships',
    category: 'organization',
    sampleData: {
      root: 'Main Topic',
      children: [
        { name: 'Subtopic 1', children: ['Item A', 'Item B'] },
        { name: 'Subtopic 2', children: ['Item C', 'Item D'] }
      ]
    },
    sampleConfig: {
      type: 'hierarchy',
      responsive: true
    },
    aiPrompt: 'Create a hierarchy diagram for: '
  },
  {
    id: 'mind_map',
    name: 'Mind Map',
    icon: React.createElement(FiTarget, { size: 24 }),
    description: 'Show ideas and connections',
    category: 'organization',
    sampleData: {
      center: 'Central Idea',
      branches: [
        { name: 'Branch 1', items: ['Sub 1', 'Sub 2'] },
        { name: 'Branch 2', items: ['Sub 3', 'Sub 4'] },
        { name: 'Branch 3', items: ['Sub 5', 'Sub 6'] }
      ]
    },
    sampleConfig: {
      type: 'mind_map',
      responsive: true
    },
    aiPrompt: 'Create a mind map for: '
  },
  {
    id: 'concept_map',
    name: 'Concept Map',
    icon: React.createElement(FiTarget, { size: 24 }),
    description: 'Show relationships between concepts',
    category: 'organization',
    sampleData: {
      concepts: [
        { id: 1, name: 'Concept A' },
        { id: 2, name: 'Concept B' },
        { id: 3, name: 'Concept C' }
      ],
      relationships: [
        { from: 1, to: 2, label: 'influences' },
        { from: 2, to: 3, label: 'leads to' }
      ]
    },
    sampleConfig: {
      type: 'concept_map',
      responsive: true
    },
    aiPrompt: 'Create a concept map for: '
  },
  {
    id: 'network_diagram',
    name: 'Network Diagram',
    icon: React.createElement(FiTarget, { size: 24 }),
    description: 'Show network connections and topology',
    category: 'organization',
    sampleData: {
      nodes: [
        { id: 1, label: 'Server', type: 'server' },
        { id: 2, label: 'Router', type: 'router' },
        { id: 3, label: 'Client 1', type: 'client' },
        { id: 4, label: 'Client 2', type: 'client' }
      ],
      edges: [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 2, to: 4 }
      ]
    },
    sampleConfig: {
      type: 'network_diagram',
      responsive: true
    },
    aiPrompt: 'Create a network diagram for: '
  },

  // Comparison & Analysis
  {
    id: 'comparison_table',
    name: 'Comparison Table',
    icon: React.createElement(FiGrid, { size: 24 }),
    description: 'Compare features, options, or alternatives',
    category: 'analysis',
    sampleData: {
      headers: ['Feature', 'Option A', 'Option B', 'Option C'],
      rows: [
        ['Price', '$10', '$25', '$50'],
        ['Users', '1', '5', 'Unlimited'],
        ['Storage', '1GB', '10GB', '100GB'],
        ['Support', 'Email', 'Chat', 'Phone']
      ]
    },
    sampleConfig: {
      type: 'comparison_table',
      responsive: true,
      striped: true
    },
    aiPrompt: 'Create a comparison table to analyze: '
  },
  {
    id: 'pros_cons',
    name: 'Pros & Cons',
    icon: React.createElement(FiGrid, { size: 24 }),
    description: 'Show advantages and disadvantages',
    category: 'analysis',
    sampleData: {
      pros: [
        'Cost effective',
        'Easy to use',
        'Good support',
        'Scalable'
      ],
      cons: [
        'Limited features',
        'Learning curve',
        'Integration issues'
      ]
    },
    sampleConfig: {
      type: 'pros_cons',
      responsive: true
    },
    aiPrompt: 'Create a pros and cons analysis for: '
  },
  {
    id: 'swot_analysis',
    name: 'SWOT Analysis',
    icon: React.createElement(FiTarget, { size: 24 }),
    description: 'Analyze strengths, weaknesses, opportunities, threats',
    category: 'analysis',
    sampleData: {
      strengths: ['Strong brand', 'Good team', 'Technology'],
      weaknesses: ['Limited budget', 'Small market share'],
      opportunities: ['New market', 'Partnerships', 'Growth'],
      threats: ['Competition', 'Economic downturn', 'Regulation']
    },
    sampleConfig: {
      type: 'swot_analysis',
      responsive: true
    },
    aiPrompt: 'Create a SWOT analysis for: '
  },
  {
    id: 'matrix',
    name: 'Decision Matrix',
    icon: React.createElement(FiGrid, { size: 24 }),
    description: 'Evaluate options against criteria',
    category: 'analysis',
    sampleData: {
      criteria: ['Cost', 'Quality', 'Speed', 'Reliability'],
      options: ['Option A', 'Option B', 'Option C'],
      scores: [
        [8, 6, 9, 7],  // Option A scores
        [6, 9, 7, 8],  // Option B scores
        [9, 7, 6, 9]   // Option C scores
      ]
    },
    sampleConfig: {
      type: 'matrix',
      responsive: true
    },
    aiPrompt: 'Create a decision matrix for: '
  },
  {
    id: 'venn_diagram',
    name: 'Venn Diagram',
    icon: React.createElement(FiCircle, { size: 24 }),
    description: 'Show overlaps and relationships',
    category: 'analysis',
    sampleData: {
      sets: [
        { name: 'Set A', items: ['Item 1', 'Item 2', 'Item 3'] },
        { name: 'Set B', items: ['Item 3', 'Item 4', 'Item 5'] },
        { name: 'Set C', items: ['Item 5', 'Item 6', 'Item 7'] }
      ],
      overlaps: [
        { sets: ['Set A', 'Set B'], items: ['Item 3'] },
        { sets: ['Set B', 'Set C'], items: ['Item 5'] }
      ]
    },
    sampleConfig: {
      type: 'venn_diagram',
      responsive: true
    },
    aiPrompt: 'Create a Venn diagram to show overlaps in: '
  },

  // Timeline & Planning
  {
    id: 'timeline',
    name: 'Timeline',
    icon: React.createElement(FiClock, { size: 24 }),
    description: 'Show events over time',
    category: 'timeline',
    sampleData: {
      events: [
        { date: '2024-01', title: 'Project Start', description: 'Initial planning phase' },
        { date: '2024-03', title: 'Development', description: 'Core development begins' },
        { date: '2024-06', title: 'Testing', description: 'Quality assurance phase' },
        { date: '2024-08', title: 'Launch', description: 'Product launch' }
      ]
    },
    sampleConfig: {
      type: 'timeline',
      responsive: true
    },
    aiPrompt: 'Create a timeline for: '
  },
  {
    id: 'gantt_chart',
    name: 'Gantt Chart',
    icon: React.createElement(FiClock, { size: 24 }),
    description: 'Show project schedule and dependencies',
    category: 'timeline',
    sampleData: {
      tasks: [
        { id: 1, name: 'Planning', start: '2024-01-01', end: '2024-01-15', progress: 100 },
        { id: 2, name: 'Design', start: '2024-01-10', end: '2024-02-01', progress: 80 },
        { id: 3, name: 'Development', start: '2024-02-01', end: '2024-04-01', progress: 40 },
        { id: 4, name: 'Testing', start: '2024-03-15', end: '2024-04-15', progress: 0 }
      ]
    },
    sampleConfig: {
      type: 'gantt_chart',
      responsive: true
    },
    aiPrompt: 'Create a Gantt chart for: '
  },
  {
    id: 'roadmap',
    name: 'Roadmap',
    icon: React.createElement(FiMap, { size: 24 }),
    description: 'Show strategic planning over time',
    category: 'timeline',
    sampleData: {
      quarters: [
        { name: 'Q1 2024', initiatives: ['Feature A', 'Bug fixes'] },
        { name: 'Q2 2024', initiatives: ['Feature B', 'Performance'] },
        { name: 'Q3 2024', initiatives: ['Feature C', 'Mobile app'] },
        { name: 'Q4 2024', initiatives: ['Feature D', 'Analytics'] }
      ]
    },
    sampleConfig: {
      type: 'roadmap',
      responsive: true
    },
    aiPrompt: 'Create a roadmap for: '
  },
  {
    id: 'milestones',
    name: 'Milestones',
    icon: React.createElement(FiTarget, { size: 24 }),
    description: 'Show key achievements and goals',
    category: 'timeline',
    sampleData: {
      milestones: [
        { name: 'MVP Complete', date: '2024-03-01', status: 'completed' },
        { name: 'Beta Launch', date: '2024-06-01', status: 'in-progress' },
        { name: 'Public Launch', date: '2024-09-01', status: 'planned' },
        { name: '1M Users', date: '2024-12-01', status: 'planned' }
      ]
    },
    sampleConfig: {
      type: 'milestones',
      responsive: true
    },
    aiPrompt: 'Create milestones for: '
  },

  // Business & Strategy
  {
    id: 'business_model_canvas',
    name: 'Business Model Canvas',
    icon: React.createElement(FiGrid, { size: 24 }),
    description: 'Strategic business model visualization',
    category: 'business',
    sampleData: {
      keyPartners: ['Suppliers', 'Vendors', 'Partners'],
      keyActivities: ['Development', 'Marketing', 'Support'],
      keyResources: ['Team', 'Technology', 'Brand'],
      valuePropositions: ['Quality', 'Speed', 'Cost-effective'],
      customerRelationships: ['Personal', 'Automated', 'Community'],
      channels: ['Website', 'Mobile', 'Retail'],
      customerSegments: ['SMBs', 'Enterprise', 'Consumers'],
      costStructure: ['Development', 'Marketing', 'Operations'],
      revenueStreams: ['Subscriptions', 'Licensing', 'Services']
    },
    sampleConfig: {
      type: 'business_model_canvas',
      responsive: true
    },
    aiPrompt: 'Create a business model canvas for: '
  },
  {
    id: 'value_proposition',
    name: 'Value Proposition Canvas',
    icon: React.createElement(FiTarget, { size: 24 }),
    description: 'Customer value proposition analysis',
    category: 'business',
    sampleData: {
      customerJobs: ['Get work done', 'Save time', 'Reduce costs'],
      pains: ['Too expensive', 'Too slow', 'Too complex'],
      gains: ['Efficiency', 'Savings', 'Simplicity'],
      products: ['Software', 'Service', 'Support'],
      painRelievers: ['Lower cost', 'Faster', 'Simpler'],
      gainCreators: ['Automation', 'Analytics', 'Integration']
    },
    sampleConfig: {
      type: 'value_proposition',
      responsive: true
    },
    aiPrompt: 'Create a value proposition canvas for: '
  },
  {
    id: 'customer_journey',
    name: 'Customer Journey Map',
    icon: React.createElement(FiMap, { size: 24 }),
    description: 'Map customer experience touchpoints',
    category: 'business',
    sampleData: {
      stages: ['Awareness', 'Consideration', 'Purchase', 'Onboarding', 'Support'],
      touchpoints: {
        'Awareness': ['Social media', 'Search', 'Referral'],
        'Consideration': ['Website', 'Demo', 'Reviews'],
        'Purchase': ['Checkout', 'Payment', 'Confirmation'],
        'Onboarding': ['Welcome email', 'Setup', 'Training'],
        'Support': ['Help desk', 'Documentation', 'Community']
      },
      emotions: {
        'Awareness': 'Curious',
        'Consideration': 'Interested',
        'Purchase': 'Excited',
        'Onboarding': 'Optimistic',
        'Support': 'Satisfied'
      }
    },
    sampleConfig: {
      type: 'customer_journey',
      responsive: true
    },
    aiPrompt: 'Create a customer journey map for: '
  },
  {
    id: 'funnel',
    name: 'Sales/Marketing Funnel',
    icon: React.createElement(FiTarget, { size: 24 }),
    description: 'Show conversion stages',
    category: 'business',
    sampleData: {
      stages: [
        { name: 'Awareness', count: 10000, rate: 100 },
        { name: 'Interest', count: 5000, rate: 50 },
        { name: 'Consideration', count: 2500, rate: 25 },
        { name: 'Purchase', count: 500, rate: 5 }
      ]
    },
    sampleConfig: {
      type: 'funnel',
      responsive: true
    },
    aiPrompt: 'Create a funnel analysis for: '
  },

  // Technical
  {
    id: 'architecture_diagram',
    name: 'Architecture Diagram',
    icon: React.createElement(FiTool, { size: 24 }),
    description: 'Show system architecture and components',
    category: 'technical',
    sampleData: {
      components: [
        { name: 'Frontend', type: 'ui', connections: ['API Gateway'] },
        { name: 'API Gateway', type: 'service', connections: ['Backend', 'Database'] },
        { name: 'Backend', type: 'service', connections: ['Database', 'Cache'] },
        { name: 'Database', type: 'storage', connections: [] },
        { name: 'Cache', type: 'storage', connections: [] }
      ]
    },
    sampleConfig: {
      type: 'architecture_diagram',
      responsive: true
    },
    aiPrompt: 'Create an architecture diagram for: '
  },
  {
    id: 'database_schema',
    name: 'Database Schema',
    icon: React.createElement(FiDatabase, { size: 24 }),
    description: 'Show database structure and relationships',
    category: 'technical',
    sampleData: {
      tables: [
        { 
          name: 'users',
          fields: ['id (PK)', 'username', 'email', 'created_at'],
          relationships: [{ table: 'orders', type: 'one-to-many' }]
        },
        {
          name: 'orders',
          fields: ['id (PK)', 'user_id (FK)', 'amount', 'status'],
          relationships: [{ table: 'users', type: 'many-to-one' }]
        }
      ]
    },
    sampleConfig: {
      type: 'database_schema',
      responsive: true
    },
    aiPrompt: 'Create a database schema for: '
  },
  {
    id: 'wireframe',
    name: 'Wireframe',
    icon: React.createElement(FiMonitor, { size: 24 }),
    description: 'Show UI/UX layout and structure',
    category: 'technical',
    sampleData: {
      components: [
        { type: 'header', content: 'Navigation Bar' },
        { type: 'sidebar', content: 'Menu Items' },
        { type: 'main', content: 'Main Content Area' },
        { type: 'footer', content: 'Footer Links' }
      ]
    },
    sampleConfig: {
      type: 'wireframe',
      responsive: true
    },
    aiPrompt: 'Create a wireframe for: '
  },
  {
    id: 'system_diagram',
    name: 'System Diagram',
    icon: React.createElement(FiSettings, { size: 24 }),
    description: 'Show system components and data flow',
    category: 'technical',
    sampleData: {
      systems: [
        { name: 'Web App', type: 'application' },
        { name: 'API Server', type: 'service' },
        { name: 'Database', type: 'storage' },
        { name: 'File Storage', type: 'storage' }
      ],
      dataFlow: [
        { from: 'Web App', to: 'API Server', data: 'HTTP Requests' },
        { from: 'API Server', to: 'Database', data: 'SQL Queries' },
        { from: 'API Server', to: 'File Storage', data: 'File Operations' }
      ]
    },
    sampleConfig: {
      type: 'system_diagram',
      responsive: true
    },
    aiPrompt: 'Create a system diagram for: '
  }
];

// Group charts by category
export const CHART_CATEGORIES = {
  data_viz: 'Data Visualization',
  process: 'Process & Flow',
  organization: 'Organizational',
  analysis: 'Comparison & Analysis',
  timeline: 'Timeline & Planning',
  business: 'Business & Strategy',
  technical: 'Technical'
};

// Get charts by category
export const getChartsByCategory = (category: string): ChartType[] => {
  return ALL_CHART_TEMPLATES.filter(chart => chart.category === category);
};

// Get chart by ID
export const getChartById = (id: string): ChartType | undefined => {
  return ALL_CHART_TEMPLATES.find(chart => chart.id === id);
};