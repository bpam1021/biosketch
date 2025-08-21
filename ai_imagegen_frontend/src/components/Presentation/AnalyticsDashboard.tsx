import React, { useState, useEffect } from 'react';
import { 
  FiEye, FiUsers, FiClock, FiDownload, FiMessageCircle,
  FiTrendingUp, FiCalendar, FiGlobe
} from 'react-icons/fi';
import { getPresentationAnalytics } from '../../api/presentationApi';

interface AnalyticsDashboardProps {
  presentationId: string;
  onClose: () => void;
}

interface AnalyticsData {
  views_count: number;
  unique_viewers: number;
  average_time_spent: number;
  export_count: number;
  comment_count: number;
  collaboration_stats: {
    collaborators_count: number;
    active_collaborators: number;
  };
  section_engagement: any[];
  word_count: number;
  estimated_duration: number;
  credits_used: number;
  geographic_data?: any[];
  device_data?: any[];
  time_series_data?: any[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  presentationId,
  onClose
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getPresentationAnalytics(presentationId);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const StatCard: React.FC<{
    icon: React.ComponentType<any>;
    title: string;
    value: string | number;
    change?: string;
    color?: string;
  }> = ({ icon: Icon, title, value, change, color = 'blue' }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-full`}>
          <Icon size={20} className={`text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 bg-white border-b border-gray-200 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
              <p className="text-gray-600">Insights and performance metrics</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={FiEye}
              title="Total Views"
              value={analytics.views_count.toLocaleString()}
              change="+12%"
              color="blue"
            />
            <StatCard
              icon={FiUsers}
              title="Unique Viewers"
              value={analytics.unique_viewers.toLocaleString()}
              change="+8%"
              color="green"
            />
            <StatCard
              icon={FiClock}
              title="Avg. Time Spent"
              value={formatDuration(analytics.average_time_spent)}
              change="+15%"
              color="purple"
            />
            <StatCard
              icon={FiDownload}
              title="Exports"
              value={analytics.export_count}
              change="+5%"
              color="orange"
            />
          </div>

          {/* Content Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Word Count</span>
                  <span className="font-semibold">{analytics.word_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Estimated Reading Time</span>
                  <span className="font-semibold">{Math.ceil(analytics.estimated_duration / 60)} min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Comments</span>
                  <span className="font-semibold">{analytics.comment_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Credits Used</span>
                  <span className="font-semibold">{analytics.credits_used}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Collaboration</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Collaborators</span>
                  <span className="font-semibold">{analytics.collaboration_stats.collaborators_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active This Week</span>
                  <span className="font-semibold">{analytics.collaboration_stats.active_collaborators}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ 
                      width: `${(analytics.collaboration_stats.active_collaborators / analytics.collaboration_stats.collaborators_count) * 100}%` 
                    }}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  {Math.round((analytics.collaboration_stats.active_collaborators / analytics.collaboration_stats.collaborators_count) * 100)}% active rate
                </p>
              </div>
            </div>
          </div>

          {/* Section Engagement */}
          {analytics.section_engagement && analytics.section_engagement.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Engagement</h3>
              <div className="space-y-3">
                {analytics.section_engagement.map((section, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {section.title || `Section ${index + 1}`}
                        </span>
                        <span className="text-sm text-gray-600">
                          {section.views} views
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(section.views / analytics.views_count) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Geographic and Device Data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analytics.geographic_data && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiGlobe size={18} />
                  Geographic Distribution
                </h3>
                <div className="space-y-3">
                  {analytics.geographic_data.slice(0, 5).map((location, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-700">{location.country}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${location.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">
                          {location.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics.device_data && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiTrendingUp size={18} />
                  Device Breakdown
                </h3>
                <div className="space-y-3">
                  {analytics.device_data.map((device, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-700 capitalize">{device.type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${device.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">
                          {device.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export Options */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Analytics</h3>
            <p className="text-gray-600 mb-4">
              Download detailed analytics data for further analysis
            </p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                Export CSV
              </button>
              <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium">
                Export PDF Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;