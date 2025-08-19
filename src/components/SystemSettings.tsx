import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Database, Wifi, Lock, Eye, EyeOff, Save, RefreshCw } from 'lucide-react';
import { realTimeDataManager, SystemStatus, sendPushNotification } from '../utils/realtimeData';
import { useSecurity } from '../contexts/SecurityContext';
import { supabase } from '../lib/supabase';

interface SystemConfig {
  autoLogout: number; // minutes
  sessionTimeout: number; // minutes
  maxFailedAttempts: number;
  encryptionLevel: 'standard' | 'high' | 'maximum';
  faceVerificationRequired: boolean;
  autoClearData: boolean;
  notificationsEnabled: boolean;
  realTimeMonitoring: boolean;
  securityLogging: boolean;
  dataRetentionDays: number;
}

const SystemSettings: React.FC = () => {
  const { isSecureEnvironment, clearSensitiveData, requestNotificationPermission } = useSecurity();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [config, setConfig] = useState<SystemConfig>({
    autoLogout: 30,
    sessionTimeout: 60,
    maxFailedAttempts: 3,
    encryptionLevel: 'high',
    faceVerificationRequired: true,
    autoClearData: true,
    notificationsEnabled: true,
    realTimeMonitoring: true,
    securityLogging: true,
    dataRetentionDays: 30
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Subscribe to system status updates
    const handleSystemStatus = (status: SystemStatus) => {
      setSystemStatus(status);
    };

    realTimeDataManager.on('systemStatus', handleSystemStatus);
    loadSystemConfig();

    return () => {
      realTimeDataManager.off('systemStatus', handleSystemStatus);
    };
  }, []);

  const loadSystemConfig = async () => {
    try {
      // Load configuration from localStorage or database
      const savedConfig = localStorage.getItem('systemConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Error loading system config:', error);
    }
  };

  const saveSystemConfig = async () => {
    setLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem('systemConfig', JSON.stringify(config));
      
      // Apply configuration changes
      await applyConfigChanges();
      
      setMessage({ type: 'success', text: 'System configuration saved successfully' });
      
      // Send notification about config change
      if (config.notificationsEnabled) {
        await sendPushNotification(
          'System Configuration Updated',
          'System settings have been modified by administrator'
        );
      }
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving system config:', error);
      setMessage({ type: 'error', text: 'Failed to save system configuration' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const applyConfigChanges = async () => {
    // Apply notification settings
    if (config.notificationsEnabled) {
      await requestNotificationPermission();
    }
    
    // Apply auto-clear settings
    if (config.autoClearData) {
      // Set up auto-clear timer based on session timeout
      const timeoutMs = config.sessionTimeout * 60 * 1000;
      setTimeout(() => {
        if (document.hidden) {
          clearSensitiveData();
        }
      }, timeoutMs);
    }
  };

  const testNotifications = async () => {
    try {
      const success = await sendPushNotification(
        'Test Notification',
        'This is a test notification from Chitragupt system settings'
      );
      
      if (success) {
        setMessage({ type: 'success', text: 'Test notification sent successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to send test notification. Please check permissions.' });
      }
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error sending test notification' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const resetToDefaults = () => {
    setConfig({
      autoLogout: 30,
      sessionTimeout: 60,
      maxFailedAttempts: 3,
      encryptionLevel: 'high',
      faceVerificationRequired: true,
      autoClearData: true,
      notificationsEnabled: true,
      realTimeMonitoring: true,
      securityLogging: true,
      dataRetentionDays: 30
    });
    setMessage({ type: 'info', text: 'Configuration reset to default values' });
    setTimeout(() => setMessage(null), 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'enabled':
      case 'connected':
        return 'text-green-400';
      case 'inactive':
      case 'disabled':
      case 'disconnected':
        return 'text-red-400';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-yellow-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'enabled':
      case 'connected':
        return '🟢';
      case 'inactive':
      case 'disabled':
      case 'disconnected':
        return '🔴';
      case 'error':
        return '❌';
      default:
        return '🟡';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <Settings className="w-6 h-6 mr-3" />
              System Settings
            </h1>
            <p className="text-gray-400 mt-1">Centralized control panel for all system configurations</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showAdvanced ? 'Hide Advanced' : 'Show Advanced'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
          message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          'bg-blue-500/10 border-blue-500/20 text-blue-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* System Status Overview */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          System Status Overview
        </h2>
        
        {systemStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Encryption</span>
                <div className="flex items-center space-x-2">
                  <span>{getStatusIcon(systemStatus.encryption)}</span>
                  <span className={getStatusColor(systemStatus.encryption)}>
                    {systemStatus.encryption}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Face Recognition</span>
                <div className="flex items-center space-x-2">
                  <span>{getStatusIcon(systemStatus.faceRecognition)}</span>
                  <span className={getStatusColor(systemStatus.faceRecognition)}>
                    {systemStatus.faceRecognition}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Auto-Clear</span>
                <div className="flex items-center space-x-2">
                  <span>{getStatusIcon(systemStatus.autoClear)}</span>
                  <span className={getStatusColor(systemStatus.autoClear)}>
                    {systemStatus.autoClear}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Notifications</span>
                <div className="flex items-center space-x-2">
                  <span>{getStatusIcon(systemStatus.notifications)}</span>
                  <span className={getStatusColor(systemStatus.notifications)}>
                    {systemStatus.notifications}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Database</span>
                <div className="flex items-center space-x-2">
                  <span>{getStatusIcon(systemStatus.database)}</span>
                  <span className={getStatusColor(systemStatus.database)}>
                    {systemStatus.database}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Environment</span>
                <div className="flex items-center space-x-2">
                  <span>{isSecureEnvironment ? '🟢' : '🔴'}</span>
                  <span className={isSecureEnvironment ? 'text-green-400' : 'text-red-400'}>
                    {isSecureEnvironment ? 'Secure' : 'Insecure'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {systemStatus && (
          <div className="mt-4 text-xs text-gray-500">
            Last updated: {systemStatus.lastUpdated.toLocaleString()}
          </div>
        )}
      </div>

      {/* Security Settings */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <Lock className="w-5 h-5 mr-2" />
          Security Configuration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auto Logout */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Auto Logout (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="480"
              value={config.autoLogout}
              onChange={(e) => setConfig({...config, autoLogout: parseInt(e.target.value)})}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Session Timeout */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              min="15"
              max="720"
              value={config.sessionTimeout}
              onChange={(e) => setConfig({...config, sessionTimeout: parseInt(e.target.value)})}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Max Failed Attempts */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Max Failed Login Attempts
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.maxFailedAttempts}
              onChange={(e) => setConfig({...config, maxFailedAttempts: parseInt(e.target.value)})}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Encryption Level */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Encryption Level
            </label>
            <select
              value={config.encryptionLevel}
              onChange={(e) => setConfig({...config, encryptionLevel: e.target.value as 'standard' | 'high' | 'maximum'})}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="standard">Standard</option>
              <option value="high">High</option>
              <option value="maximum">Maximum</option>
            </select>
          </div>
        </div>
        
        {/* Security Toggles */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="font-medium text-white">Face Verification Required</h4>
              <p className="text-sm text-gray-400">Require face verification for sensitive operations</p>
            </div>
            <button
              onClick={() => setConfig({...config, faceVerificationRequired: !config.faceVerificationRequired})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.faceVerificationRequired ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.faceVerificationRequired ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="font-medium text-white">Auto-Clear Sensitive Data</h4>
              <p className="text-sm text-gray-400">Automatically clear data when tab becomes inactive</p>
            </div>
            <button
              onClick={() => setConfig({...config, autoClearData: !config.autoClearData})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.autoClearData ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.autoClearData ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="font-medium text-white">Push Notifications</h4>
              <p className="text-sm text-gray-400">Enable system notifications for all users</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={testNotifications}
                className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
              >
                Test
              </button>
              <button
                onClick={() => setConfig({...config, notificationsEnabled: !config.notificationsEnabled})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.notificationsEnabled ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Advanced Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Data Retention (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={config.dataRetentionDays}
                onChange={(e) => setConfig({...config, dataRetentionDays: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <h4 className="font-medium text-white">Real-Time Monitoring</h4>
                <p className="text-sm text-gray-400">Enable continuous system monitoring</p>
              </div>
              <button
                onClick={() => setConfig({...config, realTimeMonitoring: !config.realTimeMonitoring})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.realTimeMonitoring ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.realTimeMonitoring ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <h4 className="font-medium text-white">Security Logging</h4>
                <p className="text-sm text-gray-400">Log all security events and activities</p>
              </div>
              <button
                onClick={() => setConfig({...config, securityLogging: !config.securityLogging})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.securityLogging ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.securityLogging ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <button
          onClick={resetToDefaults}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset to Defaults</span>
        </button>
        
        <button
          onClick={saveSystemConfig}
          disabled={loading}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{loading ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>
    </div>
  );
};

export default SystemSettings;