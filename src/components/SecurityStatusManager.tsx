import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Zap, Eye, Lock, Database, Wifi, Bell, RefreshCw, TrendingUp, TrendingDown, Activity, Settings } from 'lucide-react';
import { realTimeDataManager, SystemStatus, SecurityEvent } from '../utils/realtimeData';
import { useSecurity } from '../contexts/SecurityContext';

interface SecurityRecommendation {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'encryption' | 'monitoring' | 'network' | 'access';
  action: string;
  actionType: 'setting' | 'external' | 'manual';
  implemented: boolean;
  priority: number;
}

interface SecurityMetric {
  name: string;
  value: number | string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  description: string;
  icon: React.ReactNode;
}

const SecurityStatusManager: React.FC = () => {
  const { isSecureEnvironment } = useSecurity();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [recommendations, setRecommendations] = useState<SecurityRecommendation[]>([]);
  const [securityScore, setSecurityScore] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showImplemented, setShowImplemented] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    // Subscribe to system status updates
    const handleSystemStatus = (status: SystemStatus) => {
      setSystemStatus(status);
      setLastUpdated(new Date());
      generateRecommendations(status);
      calculateSecurityScore(status);
    };

    // Subscribe to security events
    const handleSecurityEvents = (event: SecurityEvent) => {
      setSecurityEvents(prev => [event, ...prev.slice(0, 19)]); // Keep last 20 events
    };

    realTimeDataManager.on('systemStatus', handleSystemStatus);
    realTimeDataManager.on('securityEvent', handleSecurityEvents);
    
    // Load initial data
    const initialStatus = realTimeDataManager.getSystemStatus();
    if (initialStatus) {
      setSystemStatus(initialStatus);
      generateRecommendations(initialStatus);
      calculateSecurityScore(initialStatus);
    }
    
    const initialEvents = realTimeDataManager.getSecurityEvents().slice(0, 20);
    setSecurityEvents(initialEvents);

    return () => {
      realTimeDataManager.off('systemStatus', handleSystemStatus);
      realTimeDataManager.off('securityEvent', handleSecurityEvents);
    };
  }, []);

  const generateRecommendations = (status: SystemStatus) => {
    const newRecommendations: SecurityRecommendation[] = [];

    // Database security
    if (status.database !== 'connected') {
      newRecommendations.push({
        id: 'db-connection',
        title: 'Database Connection Issue',
        description: 'Database connection is not stable. This may affect data integrity and user authentication.',
        severity: 'critical',
        category: 'authentication',
        action: 'Check database configuration and network connectivity',
        actionType: 'manual',
        implemented: false,
        priority: 1
      });
    }

    // HTTPS enforcement
    if (!isSecureEnvironment) {
      newRecommendations.push({
        id: 'https-enforcement',
        title: 'Enable HTTPS',
        description: 'Your connection is not secure. Enable HTTPS to protect data in transit.',
        severity: 'high',
        category: 'network',
        action: 'Configure SSL/TLS certificate and redirect HTTP to HTTPS',
        actionType: 'manual',
        implemented: false,
        priority: 2
      });
    }

    // Face recognition
    if (status.faceRecognition === 'disabled') {
      newRecommendations.push({
        id: 'face-recognition',
        title: 'Enable Face Recognition',
        description: 'Face recognition provides an additional layer of biometric security.',
        severity: 'medium',
        category: 'authentication',
        action: 'Enable face recognition in security settings',
        actionType: 'setting',
        implemented: false,
        priority: 3
      });
    }

    // Auto-clear sensitive data
    if (status.autoClear === 'inactive') {
      newRecommendations.push({
        id: 'auto-clear',
        title: 'Enable Auto-Clear',
        description: 'Automatically clear sensitive data when the tab becomes inactive.',
        severity: 'medium',
        category: 'access',
        action: 'Enable auto-clear in security settings',
        actionType: 'setting',
        implemented: false,
        priority: 4
      });
    }

    // Notifications
    if (status.notifications === 'disabled') {
      newRecommendations.push({
        id: 'notifications',
        title: 'Enable Security Notifications',
        description: 'Get real-time alerts about security events and potential threats.',
        severity: 'low',
        category: 'monitoring',
        action: 'Enable notifications in browser settings',
        actionType: 'external',
        implemented: false,
        priority: 5
      });
    }

    // Encryption status
    if (status.encryption !== 'active') {
      newRecommendations.push({
        id: 'encryption',
        title: 'Enable Data Encryption',
        description: 'Encrypt sensitive data stored locally to prevent unauthorized access.',
        severity: 'high',
        category: 'encryption',
        action: 'Enable encryption in security settings',
        actionType: 'setting',
        implemented: false,
        priority: 2
      });
    }

    // Check for suspicious activity
    const recentHighSeverityEvents = securityEvents.filter(
      event => event.severity === 'high' || event.severity === 'critical'
    ).slice(0, 5);

    if (recentHighSeverityEvents.length > 2) {
      newRecommendations.push({
        id: 'suspicious-activity',
        title: 'Review Recent Security Events',
        description: `${recentHighSeverityEvents.length} high-severity security events detected recently.`,
        severity: 'high',
        category: 'monitoring',
        action: 'Review security events and investigate potential threats',
        actionType: 'manual',
        implemented: false,
        priority: 1
      });
    }

    // Sort by priority and severity
    newRecommendations.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    setRecommendations(newRecommendations);
  };

  const calculateSecurityScore = (status: SystemStatus) => {
    let score = 0;
    const maxScore = 100;

    // Database connection (20 points)
    if (status.database === 'connected') score += 20;
    else if (status.database === 'error') score += 5;

    // HTTPS/Secure environment (20 points)
    if (isSecureEnvironment) score += 20;

    // Encryption (15 points)
    if (status.encryption === 'active') score += 15;
    else if (status.encryption === 'error') score += 5;

    // Face recognition (15 points)
    if (status.faceRecognition === 'enabled') score += 15;
    else if (status.faceRecognition === 'error') score += 5;

    // Auto-clear (10 points)
    if (status.autoClear === 'active') score += 10;

    // Notifications (10 points)
    if (status.notifications === 'enabled') score += 10;

    // Recent security events penalty
    const criticalEvents = securityEvents.filter(e => e.severity === 'critical').length;
    const highEvents = securityEvents.filter(e => e.severity === 'high').length;
    score -= (criticalEvents * 5 + highEvents * 2);

    // Ensure score is within bounds
    score = Math.max(0, Math.min(maxScore, score));
    setSecurityScore(score);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    if (score >= 40) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'enabled':
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'disconnected':
      case 'disabled':
      case 'inactive':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const implementRecommendation = (id: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === id ? { ...rec, implemented: true } : rec
      )
    );

    // Log the action
    realTimeDataManager.addSecurityEvent({
      type: 'suspicious_activity',
      severity: 'low',
      message: `Security recommendation implemented: ${id}`,
      metadata: { recommendationId: id }
    });
  };

  const refreshStatus = async () => {
    setIsRefreshing(true);
    
    // Simulate refresh delay
    setTimeout(() => {
      const currentStatus = realTimeDataManager.getSystemStatus();
      if (currentStatus) {
        setSystemStatus(currentStatus);
        generateRecommendations(currentStatus);
        calculateSecurityScore(currentStatus);
        setLastUpdated(new Date());
      }
      setIsRefreshing(false);
    }, 1500);
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (!showImplemented && rec.implemented) return false;
    if (selectedCategory !== 'all' && rec.category !== selectedCategory) return false;
    return true;
  });

  const securityMetrics: SecurityMetric[] = systemStatus ? [
    {
      name: 'Database',
      value: systemStatus.database,
      status: systemStatus.database === 'connected' ? 'good' : 'critical',
      trend: 'stable',
      description: 'Database connection status',
      icon: <Database className="w-5 h-5" />
    },
    {
      name: 'Encryption',
      value: systemStatus.encryption,
      status: systemStatus.encryption === 'active' ? 'good' : 'warning',
      trend: 'stable',
      description: 'Data encryption status',
      icon: <Lock className="w-5 h-5" />
    },
    {
      name: 'Face Recognition',
      value: systemStatus.faceRecognition,
      status: systemStatus.faceRecognition === 'enabled' ? 'good' : 'warning',
      trend: 'stable',
      description: 'Biometric authentication status',
      icon: <Eye className="w-5 h-5" />
    },
    {
      name: 'Auto Clear',
      value: systemStatus.autoClear,
      status: systemStatus.autoClear === 'active' ? 'good' : 'warning',
      trend: 'stable',
      description: 'Automatic data clearing status',
      icon: <Zap className="w-5 h-5" />
    },
    {
      name: 'Notifications',
      value: systemStatus.notifications,
      status: systemStatus.notifications === 'enabled' ? 'good' : 'warning',
      trend: 'stable',
      description: 'Security notification status',
      icon: <Bell className="w-5 h-5" />
    }
  ] : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <Shield className="w-6 h-6 mr-3" />
              Security Status Manager
              <span className="ml-3 flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                <span className="text-green-400 text-sm">MONITORING</span>
              </span>
            </h1>
            <p className="text-gray-400 mt-1">
              Real-time security status with actionable recommendations • Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Security Score</div>
              <div className={`text-3xl font-bold ${getScoreColor(securityScore)}`}>
                {securityScore}/100
              </div>
            </div>
            <button
              onClick={refreshStatus}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Score Visualization */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Security Score Breakdown</h2>
        <div className="relative">
          <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
            <div 
              className={`h-4 rounded-full bg-gradient-to-r ${getScoreGradient(securityScore)} transition-all duration-1000`}
              style={{ width: `${securityScore}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {securityMetrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className={`flex items-center justify-center mb-2 ${
                  metric.status === 'good' ? 'text-green-400' :
                  metric.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {metric.icon}
                </div>
                <div className="text-sm text-gray-300">{metric.name}</div>
                <div className={`text-xs font-medium ${
                  metric.status === 'good' ? 'text-green-400' :
                  metric.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {typeof metric.value === 'string' ? metric.value.toUpperCase() : metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status Overview */}
      {systemStatus && (
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">System Status Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <div className="text-sm text-gray-400">Database</div>
                <div className="text-white font-medium">{systemStatus.database}</div>
              </div>
              {getStatusIcon(systemStatus.database)}
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <div className="text-sm text-gray-400">Encryption</div>
                <div className="text-white font-medium">{systemStatus.encryption}</div>
              </div>
              {getStatusIcon(systemStatus.encryption)}
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <div className="text-sm text-gray-400">Face Recognition</div>
                <div className="text-white font-medium">{systemStatus.faceRecognition}</div>
              </div>
              {getStatusIcon(systemStatus.faceRecognition)}
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <div className="text-sm text-gray-400">Auto Clear</div>
                <div className="text-white font-medium">{systemStatus.autoClear}</div>
              </div>
              {getStatusIcon(systemStatus.autoClear)}
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <div className="text-sm text-gray-400">Notifications</div>
                <div className="text-white font-medium">{systemStatus.notifications}</div>
              </div>
              {getStatusIcon(systemStatus.notifications)}
            </div>
          </div>
        </div>
      )}

      {/* Security Recommendations */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Security Recommendations</h2>
          <div className="flex items-center space-x-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="authentication">Authentication</option>
              <option value="encryption">Encryption</option>
              <option value="monitoring">Monitoring</option>
              <option value="network">Network</option>
              <option value="access">Access Control</option>
            </select>
            
            <label className="flex items-center space-x-2 text-gray-300">
              <input
                type="checkbox"
                checked={showImplemented}
                onChange={(e) => setShowImplemented(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">Show Implemented</span>
            </label>
          </div>
        </div>
        
        <div className="space-y-4">
          {filteredRecommendations.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <h3 className="text-lg font-medium text-white mb-2">All Good!</h3>
              <p className="text-gray-400">No security recommendations at this time.</p>
            </div>
          ) : (
            filteredRecommendations.map((recommendation) => (
              <div key={recommendation.id} className={`p-4 rounded-lg border ${getSeverityColor(recommendation.severity)} ${recommendation.implemented ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getSeverityIcon(recommendation.severity)}
                      <h3 className="font-medium text-white">{recommendation.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(recommendation.severity)}`}>
                        {recommendation.severity.toUpperCase()}
                      </span>
                      {recommendation.implemented && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                          IMPLEMENTED
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 mb-3">{recommendation.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>Category: {recommendation.category}</span>
                      <span>Priority: {recommendation.priority}</span>
                      <span>Action: {recommendation.actionType}</span>
                    </div>
                  </div>
                  
                  {!recommendation.implemented && (
                    <div className="flex items-center space-x-2">
                      {recommendation.actionType === 'setting' && (
                        <button
                          onClick={() => implementRecommendation(recommendation.id)}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Configure</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => implementRecommendation(recommendation.id)}
                        className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Mark Done</span>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 p-3 bg-white/5 rounded-lg">
                  <div className="text-sm text-gray-300">
                    <strong>Action Required:</strong> {recommendation.action}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Security Events Summary */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Security Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="text-2xl font-bold text-red-400">
              {securityEvents.filter(e => e.severity === 'critical').length}
            </div>
            <div className="text-sm text-gray-400">Critical</div>
          </div>
          <div className="text-center p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-400">
              {securityEvents.filter(e => e.severity === 'high').length}
            </div>
            <div className="text-sm text-gray-400">High</div>
          </div>
          <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">
              {securityEvents.filter(e => e.severity === 'medium').length}
            </div>
            <div className="text-sm text-gray-400">Medium</div>
          </div>
          <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">
              {securityEvents.filter(e => e.severity === 'low').length}
            </div>
            <div className="text-sm text-gray-400">Low</div>
          </div>
        </div>
        
        <div className="space-y-2">
          {securityEvents.slice(0, 5).map((event, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  event.severity === 'critical' ? 'bg-red-400' :
                  event.severity === 'high' ? 'bg-orange-400' :
                  event.severity === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'
                }`}></div>
                <span className="text-white">{event.message}</span>
                {event.userEmail && (
                  <span className="text-gray-400 text-sm">({event.userEmail})</span>
                )}
              </div>
              <span className="text-gray-400 text-sm">
                {event.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))}
          {securityEvents.length === 0 && (
            <div className="text-center py-4 text-gray-400">
              No recent security events
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityStatusManager;