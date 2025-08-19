import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, AlertTriangle, CheckCircle, XCircle, Settings, Bell, Key, Fingerprint, Clock, Database, Wifi, Monitor, RefreshCw, Save, RotateCcw } from 'lucide-react';
import { realTimeDataManager, SecurityEvent, SystemStatus } from '../utils/realtimeData';
import { useSecurity } from '../contexts/SecurityContext';

interface SecurityConfig {
  // Authentication Settings
  maxFailedAttempts: number;
  sessionTimeout: number;
  requireTwoFactor: boolean;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  
  // Access Control
  autoLockScreen: boolean;
  autoLockTimeout: number;
  requireBiometric: boolean;
  allowRememberDevice: boolean;
  
  // Data Protection
  encryptLocalData: boolean;
  encryptionLevel: 'basic' | 'standard' | 'advanced';
  autoClearSensitiveData: boolean;
  dataClearInterval: number;
  
  // Monitoring & Logging
  enableSecurityLogging: boolean;
  logLevel: 'minimal' | 'standard' | 'detailed';
  realTimeMonitoring: boolean;
  alertOnSuspiciousActivity: boolean;
  
  // Network Security
  enforceHttps: boolean;
  blockInsecureConnections: boolean;
  enableCors: boolean;
  allowedOrigins: string[];
  
  // Notifications
  securityAlerts: boolean;
  loginNotifications: boolean;
  failedAttemptAlerts: boolean;
  dataBreachAlerts: boolean;
}

const SecuritySettings: React.FC = () => {
  const { isSecureEnvironment, requestNotificationPermission } = useSecurity();
  const [config, setConfig] = useState<SecurityConfig>({
    maxFailedAttempts: 5,
    sessionTimeout: 30,
    requireTwoFactor: false,
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    autoLockScreen: true,
    autoLockTimeout: 15,
    requireBiometric: false,
    allowRememberDevice: true,
    encryptLocalData: true,
    encryptionLevel: 'standard',
    autoClearSensitiveData: true,
    dataClearInterval: 30,
    enableSecurityLogging: true,
    logLevel: 'standard',
    realTimeMonitoring: true,
    alertOnSuspiciousActivity: true,
    enforceHttps: true,
    blockInsecureConnections: true,
    enableCors: false,
    allowedOrigins: [],
    securityAlerts: true,
    loginNotifications: true,
    failedAttemptAlerts: true,
    dataBreachAlerts: true
  });
  
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'authentication' | 'access' | 'data' | 'monitoring' | 'network' | 'notifications'>('authentication');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load saved configuration
    const savedConfig = localStorage.getItem('securityConfig');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Failed to load security config:', error);
      }
    }

    // Subscribe to system status updates
    const handleSystemStatus = (status: SystemStatus) => {
      setSystemStatus(status);
    };

    // Subscribe to security events
    const handleSecurityEvents = (event: SecurityEvent) => {
      setSecurityEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
    };

    realTimeDataManager.on('systemStatus', handleSystemStatus);
    realTimeDataManager.on('securityEvent', handleSecurityEvents);
    
    // Load initial data
    const initialStatus = realTimeDataManager.getSystemStatus();
    if (initialStatus) {
      setSystemStatus(initialStatus);
    }
    
    const initialEvents = realTimeDataManager.getSecurityEvents().slice(0, 10);
    setSecurityEvents(initialEvents);

    return () => {
      realTimeDataManager.off('systemStatus', handleSystemStatus);
      realTimeDataManager.off('securityEvent', handleSecurityEvents);
    };
  }, []);

  const updateConfig = (updates: Partial<SecurityConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const saveConfiguration = async () => {
    setIsLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem('securityConfig', JSON.stringify(config));
      
      // Log security configuration change
      realTimeDataManager.addSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        message: 'Security configuration updated',
        metadata: { changedSettings: Object.keys(config) }
      });
      
      setHasUnsavedChanges(false);
      
      // Show success notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Security Settings', {
          body: 'Configuration saved successfully',
          icon: '/favicon.ico'
        });
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = () => {
    setConfig({
      maxFailedAttempts: 5,
      sessionTimeout: 30,
      requireTwoFactor: false,
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      autoLockScreen: true,
      autoLockTimeout: 15,
      requireBiometric: false,
      allowRememberDevice: true,
      encryptLocalData: true,
      encryptionLevel: 'standard',
      autoClearSensitiveData: true,
      dataClearInterval: 30,
      enableSecurityLogging: true,
      logLevel: 'standard',
      realTimeMonitoring: true,
      alertOnSuspiciousActivity: true,
      enforceHttps: true,
      blockInsecureConnections: true,
      enableCors: false,
      allowedOrigins: [],
      securityAlerts: true,
      loginNotifications: true,
      failedAttemptAlerts: true,
      dataBreachAlerts: true
    });
    setHasUnsavedChanges(true);
  };

  const runSecurityTest = async (testType: string) => {
    setTestResults(prev => ({ ...prev, [testType]: false }));
    
    // Simulate security tests
    setTimeout(() => {
      let result = false;
      
      switch (testType) {
        case 'https':
          result = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
          break;
        case 'encryption':
          result = config.encryptLocalData && window.crypto && !!window.crypto.subtle;
          break;
        case 'biometric':
          result = 'credentials' in navigator && 'create' in (navigator as any).credentials;
          break;
        case 'notifications':
          result = 'Notification' in window && Notification.permission === 'granted';
          break;
        case 'storage':
          result = 'localStorage' in window && 'sessionStorage' in window;
          break;
        default:
          result = true;
      }
      
      setTestResults(prev => ({ ...prev, [testType]: result }));
    }, 1000 + Math.random() * 2000);
  };

  const getSecurityScore = () => {
    let score = 0;
    const maxScore = 100;
    
    // Authentication (25 points)
    if (config.requireTwoFactor) score += 10;
    if (config.maxFailedAttempts <= 3) score += 5;
    if (config.passwordMinLength >= 12) score += 5;
    if (config.passwordRequireSpecialChars) score += 5;
    
    // Access Control (20 points)
    if (config.autoLockScreen) score += 5;
    if (config.autoLockTimeout <= 10) score += 5;
    if (config.requireBiometric) score += 10;
    
    // Data Protection (25 points)
    if (config.encryptLocalData) score += 10;
    if (config.encryptionLevel === 'advanced') score += 10;
    else if (config.encryptionLevel === 'standard') score += 5;
    if (config.autoClearSensitiveData) score += 5;
    
    // Monitoring (15 points)
    if (config.enableSecurityLogging) score += 5;
    if (config.realTimeMonitoring) score += 5;
    if (config.alertOnSuspiciousActivity) score += 5;
    
    // Network Security (15 points)
    if (config.enforceHttps) score += 5;
    if (config.blockInsecureConnections) score += 5;
    if (!config.enableCors) score += 5;
    
    return Math.min(score, maxScore);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return <RefreshCw className="w-4 h-4 animate-spin" />;
    return status ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />;
  };

  const tabs = [
    { id: 'authentication', label: 'Authentication', icon: <Key className="w-4 h-4" /> },
    { id: 'access', label: 'Access Control', icon: <Lock className="w-4 h-4" /> },
    { id: 'data', label: 'Data Protection', icon: <Database className="w-4 h-4" /> },
    { id: 'monitoring', label: 'Monitoring', icon: <Monitor className="w-4 h-4" /> },
    { id: 'network', label: 'Network', icon: <Wifi className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <Shield className="w-6 h-6 mr-3" />
              Security Settings
              {!isSecureEnvironment && (
                <span className="ml-3 flex items-center">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mr-1" />
                  <span className="text-yellow-400 text-sm">INSECURE</span>
                </span>
              )}
            </h1>
            <p className="text-gray-400 mt-1">
              Comprehensive security management and real-time monitoring
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Security Score</div>
              <div className={`text-2xl font-bold ${getScoreColor(getSecurityScore())}`}>
                {getSecurityScore()}/100
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={resetToDefaults}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
              <button
                onClick={saveConfiguration}
                disabled={!hasUnsavedChanges || isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security Status Overview */}
      {systemStatus && (
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Security Status Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(systemStatus.database === 'connected')}
              <span className="text-gray-300">Database</span>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusIcon(systemStatus.faceRecognition === 'enabled')}
              <span className="text-gray-300">Face Recognition</span>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusIcon(systemStatus.autoClear === 'active')}
              <span className="text-gray-300">Auto Clear</span>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusIcon(systemStatus.notifications === 'enabled')}
              <span className="text-gray-300">Notifications</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Recent Security Events */}
          <div className="mt-6 bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Recent Events</h3>
            <div className="space-y-2">
              {securityEvents.slice(0, 5).map((event, index) => (
                <div key={index} className="text-xs">
                  <div className={`flex items-center space-x-2 ${
                    event.severity === 'high' ? 'text-red-400' :
                    event.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    <div className="w-1 h-1 rounded-full bg-current"></div>
                    <span className="truncate">{event.message}</span>
                  </div>
                  <div className="text-gray-500 ml-3">
                    {event.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {securityEvents.length === 0 && (
                <div className="text-xs text-gray-500">No recent events</div>
              )}
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
            {/* Authentication Settings */}
            {activeTab === 'authentication' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  Authentication Settings
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Failed Login Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={config.maxFailedAttempts}
                      onChange={(e) => updateConfig({ maxFailedAttempts: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={config.sessionTimeout}
                      onChange={(e) => updateConfig({ sessionTimeout: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      min="6"
                      max="32"
                      value={config.passwordMinLength}
                      onChange={(e) => updateConfig({ passwordMinLength: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Require Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-400">Add an extra layer of security to user accounts</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ requireTwoFactor: !config.requireTwoFactor })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.requireTwoFactor ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.requireTwoFactor ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Require Special Characters</h3>
                      <p className="text-sm text-gray-400">Passwords must contain special characters</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ passwordRequireSpecialChars: !config.passwordRequireSpecialChars })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.passwordRequireSpecialChars ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.passwordRequireSpecialChars ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={() => runSecurityTest('biometric')}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>Test Biometric Support</span>
                    {getStatusIcon(testResults.biometric)}
                  </button>
                </div>
              </div>
            )}

            {/* Access Control Settings */}
            {activeTab === 'access' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Access Control Settings
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Auto-Lock Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={config.autoLockTimeout}
                      onChange={(e) => updateConfig({ autoLockTimeout: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Auto-Lock Screen</h3>
                      <p className="text-sm text-gray-400">Automatically lock screen after inactivity</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ autoLockScreen: !config.autoLockScreen })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.autoLockScreen ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.autoLockScreen ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Require Biometric Authentication</h3>
                      <p className="text-sm text-gray-400">Use fingerprint or face recognition for login</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ requireBiometric: !config.requireBiometric })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.requireBiometric ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.requireBiometric ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Allow Remember Device</h3>
                      <p className="text-sm text-gray-400">Users can mark devices as trusted</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ allowRememberDevice: !config.allowRememberDevice })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.allowRememberDevice ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.allowRememberDevice ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Data Protection Settings */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Data Protection Settings
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Encryption Level
                    </label>
                    <select
                      value={config.encryptionLevel}
                      onChange={(e) => updateConfig({ encryptionLevel: e.target.value as 'basic' | 'standard' | 'advanced' })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="basic">Basic (AES-128)</option>
                      <option value="standard">Standard (AES-256)</option>
                      <option value="advanced">Advanced (AES-256 + RSA)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Data Clear Interval (seconds)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={config.dataClearInterval}
                      onChange={(e) => updateConfig({ dataClearInterval: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Encrypt Local Data</h3>
                      <p className="text-sm text-gray-400">Encrypt sensitive data stored locally</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ encryptLocalData: !config.encryptLocalData })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.encryptLocalData ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.encryptLocalData ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Auto-Clear Sensitive Data</h3>
                      <p className="text-sm text-gray-400">Automatically clear sensitive data on tab visibility change</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ autoClearSensitiveData: !config.autoClearSensitiveData })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.autoClearSensitiveData ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.autoClearSensitiveData ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={() => runSecurityTest('encryption')}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    <Key className="w-4 h-4" />
                    <span>Test Encryption Support</span>
                    {getStatusIcon(testResults.encryption)}
                  </button>
                </div>
              </div>
            )}

            {/* Monitoring Settings */}
            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  Monitoring & Logging Settings
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Log Level
                    </label>
                    <select
                      value={config.logLevel}
                      onChange={(e) => updateConfig({ logLevel: e.target.value as 'minimal' | 'standard' | 'detailed' })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="minimal">Minimal</option>
                      <option value="standard">Standard</option>
                      <option value="detailed">Detailed</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Enable Security Logging</h3>
                      <p className="text-sm text-gray-400">Log security events and authentication attempts</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ enableSecurityLogging: !config.enableSecurityLogging })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.enableSecurityLogging ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enableSecurityLogging ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Real-Time Monitoring</h3>
                      <p className="text-sm text-gray-400">Monitor security events in real-time</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ realTimeMonitoring: !config.realTimeMonitoring })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.realTimeMonitoring ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.realTimeMonitoring ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Alert on Suspicious Activity</h3>
                      <p className="text-sm text-gray-400">Send alerts when suspicious activity is detected</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ alertOnSuspiciousActivity: !config.alertOnSuspiciousActivity })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.alertOnSuspiciousActivity ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.alertOnSuspiciousActivity ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Network Security Settings */}
            {activeTab === 'network' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Wifi className="w-5 h-5 mr-2" />
                  Network Security Settings
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Enforce HTTPS</h3>
                      <p className="text-sm text-gray-400">Require secure HTTPS connections</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ enforceHttps: !config.enforceHttps })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.enforceHttps ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enforceHttps ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Block Insecure Connections</h3>
                      <p className="text-sm text-gray-400">Block HTTP and other insecure protocols</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ blockInsecureConnections: !config.blockInsecureConnections })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.blockInsecureConnections ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.blockInsecureConnections ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Enable CORS</h3>
                      <p className="text-sm text-gray-400">Allow cross-origin resource sharing</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ enableCors: !config.enableCors })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.enableCors ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enableCors ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={() => runSecurityTest('https')}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Test HTTPS Connection</span>
                    {getStatusIcon(testResults.https)}
                  </button>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Notification Settings
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Security Alerts</h3>
                      <p className="text-sm text-gray-400">Receive notifications for security events</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ securityAlerts: !config.securityAlerts })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.securityAlerts ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.securityAlerts ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Login Notifications</h3>
                      <p className="text-sm text-gray-400">Get notified of successful logins</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ loginNotifications: !config.loginNotifications })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.loginNotifications ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.loginNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Failed Attempt Alerts</h3>
                      <p className="text-sm text-gray-400">Alert on failed login attempts</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ failedAttemptAlerts: !config.failedAttemptAlerts })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.failedAttemptAlerts ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.failedAttemptAlerts ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Data Breach Alerts</h3>
                      <p className="text-sm text-gray-400">Critical alerts for potential data breaches</p>
                    </div>
                    <button
                      onClick={() => updateConfig({ dataBreachAlerts: !config.dataBreachAlerts })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.dataBreachAlerts ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.dataBreachAlerts ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-6 space-y-3">
                  <button
                    onClick={requestNotificationPermission}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Request Notification Permission</span>
                  </button>
                  
                  <button
                    onClick={() => runSecurityTest('notifications')}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Test Notification Support</span>
                    {getStatusIcon(testResults.notifications)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;