import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    FiSettings, FiUsers, FiClock, FiDownload, FiShare2,
    FiEye, FiEdit3, FiSave, FiRefreshCw, FiAlertCircle, FiCheckCircle,
    FiZap, FiBarChart, FiMessageCircle, FiBookmark, FiStar, FiGrid,
    FiMonitor, FiSmartphone, FiTablet, FiMaximize2, FiVolume2, FiMic
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { Presentation, ContentSection, PresentationComment } from '../../types/Presentation';
import { 
  updatePresentation, 
  getPresentationAnalytics, 
  checkAccessibility,
  analyzePresentationPerformance,
} from '../../api/presentationApi';
import { createPresentationWebSocket, WebSocketMessage } from '../../api/webSocketClient';

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

// Auto-save hook
export const useAutoSave = (
  data: any,
  saveFunction: (data: any) => Promise<void>,
  delay: number = 2000
) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastDataRef = useRef(data);

  useEffect(() => {
    // Only save if data has actually changed
    if (JSON.stringify(data) !== JSON.stringify(lastDataRef.current)) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        try {
          setIsSaving(true);
          await saveFunction(data);
          setLastSaved(new Date());
          lastDataRef.current = data;
        } catch (error) {
          console.error('Auto-save failed:', error);
          toast.error('Auto-save failed');
        } finally {
          setIsSaving(false);
        }
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, saveFunction, delay]);

  return { isSaving, lastSaved };
};

// Real-time collaboration hook
export const useCollaboration = (presentationId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const wsRef = useRef<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    wsRef.current = createPresentationWebSocket(presentationId);
    
    wsRef.current.on('connected', () => {
      setIsConnected(true);
      toast.success('Connected to collaboration session');
    });

    wsRef.current.on('disconnected', () => {
      setIsConnected(false);
      toast.warning('Disconnected from collaboration session');
    });

    wsRef.current.on('user_joined', (message: WebSocketMessage) => {
      setActiveUsers(prev => [...prev, message.user]);
      if (message.user) {
        toast.info(`${message.user.name} joined the presentation`);
      }
    });

    wsRef.current.on('user_left', (message: WebSocketMessage) => {
      setActiveUsers(prev => prev.filter(user => message.user && user.id !== message.user.id));
      if (message.user) {
        toast.info(`${message.user.name} left the presentation`);
      }
    });

    wsRef.current.on('section_updated', (message: WebSocketMessage) => {
      setMessages(prev => [...prev, message]);
    });

    wsRef.current.connect(token);

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, [presentationId]);

  const sendMessage = useCallback((type: string, data: any) => {
    if (wsRef.current) {
      wsRef.current.send(type, data);
    }
  }, []);

  return {
    isConnected,
    activeUsers,
    messages,
    sendMessage
  };
};

// Performance monitoring hook
export const usePerformanceMonitor = (presentationId: string) => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    interactionCount: 0,
    memoryUsage: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    // Monitor page load
    window.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, loadTime }));
    });

    // Monitor memory usage
    const checkMemory = () => {
      if ('memory' in performance) {
        const memoryInfo = (performance as any).memory;
        setMetrics(prev => ({ ...prev, memoryUsage: memoryInfo.usedJSHeapSize }));
      }
    };

    const memoryInterval = setInterval(checkMemory, 5000);

    // Monitor interactions
    let interactionCount = 0;
    const handleInteraction = () => {
      interactionCount++;
      setMetrics(prev => ({ ...prev, interactionCount }));
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keypress', handleInteraction);

    return () => {
      clearInterval(memoryInterval);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keypress', handleInteraction);
    };
  }, []);

  return metrics;
};

// Accessibility checker hook
export const useAccessibilityCheck = (presentationId: string) => {
  const [accessibilityReport, setAccessibilityReport] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runAccessibilityCheck = useCallback(async () => {
    try {
      setIsChecking(true);
      const report = await checkAccessibility(presentationId);
      setAccessibilityReport(report);
    } catch (error) {
      console.error('Accessibility check failed:', error);
      toast.error('Failed to run accessibility check');
    } finally {
      setIsChecking(false);
    }
  }, [presentationId]);

  useEffect(() => {
    // Run initial check
    runAccessibilityCheck();
  }, [runAccessibilityCheck]);

  return {
    accessibilityReport,
    isChecking,
    runAccessibilityCheck
  };
};

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

// Presentation Settings Panel
interface PresentationSettingsPanelProps {
  presentation: Presentation;
  onUpdate: (updates: Partial<Presentation>) => void;
  onClose: () => void;
}

export const PresentationSettingsPanel: React.FC<PresentationSettingsPanelProps> = ({
  presentation,
  onUpdate,
  onClose
}) => {
  const [settings, setSettings] = useState({
    title: presentation.title,
    description: presentation.description,
    is_public: presentation.is_public,
    allow_comments: presentation.allow_comments,
    theme_settings: presentation.theme_settings || {},
    auto_save: true,
    version_control: true
  });

  const handleSave = () => {
    onUpdate(settings);
    onClose();
    toast.success('Settings updated successfully!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiSettings size={20} />
              Presentation Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Settings */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={settings.title}
                    onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={settings.description}
                    onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Privacy & Sharing</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.is_public}
                    onChange={(e) => setSettings(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-gray-700">Make presentation public</label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.allow_comments}
                    onChange={(e) => setSettings(prev => ({ ...prev, allow_comments: e.target.checked }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-gray-700">Allow comments</label>
                </div>
              </div>
            </div>

            {/* Theme Settings */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Theme Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                  <input
                    type="color"
                    value={settings.theme_settings.primary_color || '#3B82F6'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      theme_settings: { ...prev.theme_settings, primary_color: e.target.value }
                    }))}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                  <input
                    type="color"
                    value={settings.theme_settings.background_color || '#FFFFFF'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      theme_settings: { ...prev.theme_settings, background_color: e.target.value }
                    }))}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Advanced</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.auto_save}
                    onChange={(e) => setSettings(prev => ({ ...prev, auto_save: e.target.checked }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-gray-700">Enable auto-save</label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.version_control}
                    onChange={(e) => setSettings(prev => ({ ...prev, version_control: e.target.checked }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label className="text-sm text-gray-700">Enable version control</label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Collaboration Toolbar
interface CollaborationToolbarProps {
  presentationId: string;
  isOwner: boolean;
}

export const CollaborationToolbar: React.FC<CollaborationToolbarProps> = ({
  presentationId,
  isOwner
}) => {
  const { isConnected, activeUsers, sendMessage } = useCollaboration(presentationId);
  const [showUsersList, setShowUsersList] = useState(false);

  return (
    <div className="flex items-center gap-3 p-3 bg-white border-b border-gray-200">
      {/* Connection Status */}
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
        isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      {/* Active Users */}
      <div className="relative">
        <button
          onClick={() => setShowUsersList(!showUsersList)}
          className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200"
        >
          <FiUsers size={14} />
          {activeUsers.length} online
        </button>

        {showUsersList && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <div className="p-3">
              <h4 className="font-medium text-gray-900 mb-2">Active Users</h4>
              <div className="space-y-2">
                {activeUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Button */}
      {isOwner && (
        <button className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200">
          <FiShare2 size={14} />
          Invite
        </button>
      )}
    </div>
  );
};

// Performance Monitor Component
interface PerformanceMonitorProps {
  presentationId: string;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  presentationId
}) => {
  const metrics = usePerformanceMonitor(presentationId);
  const [showDetails, setShowDetails] = useState(false);
  const [performanceReport, setPerformanceReport] = useState<any>(null);

  const loadPerformanceReport = async () => {
    try {
      const report = await analyzePresentationPerformance(presentationId);
      setPerformanceReport(report);
    } catch (error) {
      console.error('Failed to load performance report:', error);
    }
  };

  useEffect(() => {
    loadPerformanceReport();
  }, [presentationId]);

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <FiBarChart size={16} />
          Performance Monitor
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Performance Score */}
      {performanceReport && (
        <div className="flex items-center gap-3 mb-4">
          <div className={`text-2xl font-bold ${getPerformanceColor(performanceReport.performance_score)}`}>
            {performanceReport.performance_score}
          </div>
          <div className="text-sm text-gray-600">Performance Score</div>
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-600">Load Time:</span>
          <span className="font-medium ml-1">{Math.round(metrics.loadTime)}ms</span>
        </div>
        <div>
          <span className="text-gray-600">Interactions:</span>
          <span className="font-medium ml-1">{metrics.interactionCount}</span>
        </div>
      </div>

      {/* Detailed Report */}
      {showDetails && performanceReport && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Issues & Suggestions</h4>
          <div className="space-y-2">
            {performanceReport.issues.map((issue: any, index: number) => (
              <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                <div className={`font-medium ${
                  issue.severity === 'high' ? 'text-red-600' : 
                  issue.severity === 'medium' ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  {issue.description}
                </div>
                <div className="text-gray-600 mt-1">{issue.fix}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Accessibility Panel
interface AccessibilityPanelProps {
  presentationId: string;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  presentationId
}) => {
  const { accessibilityReport, isChecking, runAccessibilityCheck } = useAccessibilityCheck(presentationId);

  const getAccessibilityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Accessibility Check</h3>
        <button
          onClick={runAccessibilityCheck}
          disabled={isChecking}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
        >
          <FiRefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
          {isChecking ? 'Checking...' : 'Recheck'}
        </button>
      </div>

      {accessibilityReport && (
        <div className="space-y-4">
          {/* Accessibility Score */}
          <div className="flex items-center gap-3">
            <div className={`text-2xl font-bold ${getAccessibilityColor(accessibilityReport.accessibility_score)}`}>
              {accessibilityReport.accessibility_score}%
            </div>
            <div className="text-sm text-gray-600">Accessibility Score</div>
          </div>

          {/* Compliance Standards */}
          <div className="flex gap-4 text-sm">
            <div className={`flex items-center gap-1 ${
              accessibilityReport.compliance_standards.wcag_aa ? 'text-green-600' : 'text-red-600'
            }`}>
              {accessibilityReport.compliance_standards.wcag_aa ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
              WCAG AA
            </div>
            <div className={`flex items-center gap-1 ${
              accessibilityReport.compliance_standards.section_508 ? 'text-green-600' : 'text-red-600'
            }`}>
              {accessibilityReport.compliance_standards.section_508 ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
              Section 508
            </div>
          </div>

          {/* Issues */}
          {accessibilityReport.issues.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Issues Found</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {accessibilityReport.issues.map((issue: any, index: number) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                    <div className={`font-medium ${
                      issue.severity === 'high' ? 'text-red-600' : 
                      issue.severity === 'medium' ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      {issue.description}
                    </div>
                    <div className="text-gray-600 mt-1">{issue.fix}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Preview Mode Selector
interface PreviewModeSelectorProps {
  onModeChange: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  currentMode: 'desktop' | 'tablet' | 'mobile';
}

export const PreviewModeSelector: React.FC<PreviewModeSelectorProps> = ({
  onModeChange,
  currentMode
}) => {
  const modes = [
    { key: 'desktop' as const, icon: FiMonitor, label: 'Desktop' },
    { key: 'tablet' as const, icon: FiTablet, label: 'Tablet' },
    { key: 'mobile' as const, icon: FiSmartphone, label: 'Mobile' }
  ];

  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      {modes.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => onModeChange(key)}
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
            currentMode === key
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title={label}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
};

// Status Indicator
interface StatusIndicatorProps {
  status: 'saving' | 'saved' | 'error' | 'offline';
  lastSaved?: Date;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  lastSaved
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          icon: FiClock,
          text: 'Saving...'
        };
      case 'saved':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: FiCheckCircle,
          text: lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Saved'
        };
      case 'error':
        return {
          color: 'text-red-600',
          bg: 'bg-red-100',
          icon: FiAlertCircle,
          text: 'Save failed'
        };
      case 'offline':
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          icon: FiAlertCircle,
          text: 'Offline'
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          icon: FiClock,
          text: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${config.bg} ${config.color}`}>
      <Icon size={14} />
      {config.text}
    </div>
  );
};

// Quick Actions Toolbar
interface QuickActionsToolbarProps {
  onSave: () => void;
  onPreview: () => void;
  onShare: () => void;
  onExport: () => void;
  isSaving?: boolean;
}

export const QuickActionsToolbar: React.FC<QuickActionsToolbarProps> = ({
  onSave,
  onPreview,
  onShare,
  onExport,
  isSaving = false
}) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
      <button
        onClick={onSave}
        disabled={isSaving}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
      >
        <FiSave size={16} />
        {isSaving ? 'Saving...' : 'Save'}
      </button>
      
      <button
        onClick={onPreview}
        className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
      >
        <FiEye size={16} />
        Preview
      </button>
      
      <button
        onClick={onShare}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
      >
        <FiShare2 size={16} />
        Share
      </button>
      
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
      >
        <FiDownload size={16} />
        Export
      </button>
    </div>
  );
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    toast.error('Failed to copy to clipboard');
    return false;
  }
};

export const downloadFile = (data: string, filename: string, type: string): void => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const calculateReadingTime = (text: string, wordsPerMinute: number = 200): number => {
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

export const extractTextFromHTML = (html: string): string => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

export const truncateText = (text: string, maxLength: number, ellipsis: string = '...'): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
};

// Export all components and utilities
export default {
  // Hooks
  useAutoSave,
  useCollaboration,
  usePerformanceMonitor,
  useAccessibilityCheck,
  
  // Components
  PresentationSettingsPanel,
  CollaborationToolbar,
  PerformanceMonitor,
  AccessibilityPanel,
  PreviewModeSelector,
  StatusIndicator,
  QuickActionsToolbar,
  
  // Utilities
  formatFileSize,
  formatDuration,
  debounce,
  throttle,
  generateUniqueId,
  copyToClipboard,
  downloadFile,
  validateEmail,
  isValidUrl,
  calculateReadingTime,
  extractTextFromHTML,
  truncateText
};