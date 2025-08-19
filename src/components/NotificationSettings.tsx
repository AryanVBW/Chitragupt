import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Settings, TestTube, Users, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Zap, Eye, Database, Wifi, Volume2, VolumeX, Smartphone, Monitor, Globe } from 'lucide-react';
import { pushNotificationManager, NotificationHistory } from '../utils/pushNotifications';
import { realTimeDataManager } from '../utils/realtimeData';
import { useSecurity } from '../contexts/SecurityContext';

interface NotificationPreferences {
  enabled: boolean;
  securityAlerts: boolean;
  systemNotifications: boolean;
  userActivity: boolean;
  broadcasts: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  severityFilter: {
    critical: boolean;
    high: boolean;
    medium: boolean;
    low: boolean;
  };
}

const NotificationSettings: React.FC = () => {
  const { isSecureEnvironment } = useSecurity();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: false,
    securityAlerts: true,
    systemNotifications: true,
    userActivity: false,
    broadcasts: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    severityFilter: {
      critical: true,
      high: true,
      medium: true,
      low: false
    }
  });
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    clicked: 0,
    dismissed: 0,
    clickRate: 0
  });
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    // Initialize notification settings
    setPermission(pushNotificationManager.getPermission());
    setIsSupported(pushNotificationManager.isNotificationSupported());
    setIsSubscribed(pushNotificationManager.getActiveSubscriptionsCount() > 0);
    
    // Load preferences from localStorage
    loadPreferences();
    
    // Load notification history and stats
    updateNotificationData();
    
    // Set up periodic updates
    const interval = setInterval(updateNotificationData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadPreferences = () => {
    try {
      const stored = localStorage.getItem('notification_preferences');
      if (stored) {
        const storedPrefs = JSON.parse(stored);
        setPreferences(prev => ({ ...prev, ...storedPrefs }));
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const savePreferences = (newPreferences: NotificationPreferences) => {
    try {
      localStorage.setItem('notification_preferences', JSON.stringify(newPreferences));
      setPreferences(newPreferences);
      
      // Log preference change
      realTimeDataManager.addSecurityEvent({
        type: 'suspicious_activity',
        severity: 'low',
        message: 'Notification preferences updated',
        metadata: { preferences: newPreferences }
      });
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  };

  const updateNotificationData = () => {
    setNotificationHistory(pushNotificationManager.getNotificationHistory());
    setStats(pushNotificationManager.getNotificationStats());
  };

  const handleRequestPermission = async () => {
    if (!isSupported) {
      setTestResult('❌ Push notifications are not supported in this browser');
      return;
    }

    setIsLoading(true);
    try {
      const newPermission = await pushNotificationManager.requestPermission();
      setPermission(newPermission);
      
      if (newPermission === 'granted') {
        setTestResult('✅ Notification permission granted successfully');
        // Auto-subscribe if permission granted
        await handleSubscribe();
      } else {
        setTestResult('❌ Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setTestResult('❌ Error requesting notification permission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (permission !== 'granted') {
      await handleRequestPermission();
      return;
    }

    setIsLoading(true);
    try {
      const subscription = await pushNotificationManager.subscribe('current-user', 'user@example.com');
      if (subscription) {
        setIsSubscribed(true);
        setTestResult('✅ Successfully subscribed to push notifications');
        
        // Update preferences to enable notifications
        const newPrefs = { ...preferences, enabled: true };
        savePreferences(newPrefs);
      } else {
        setTestResult('❌ Failed to subscribe to push notifications');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      setTestResult('❌ Error subscribing to push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await pushNotificationManager.unsubscribe();
      if (success) {
        setIsSubscribed(false);
        setTestResult('✅ Successfully unsubscribed from push notifications');
        
        // Update preferences to disable notifications
        const newPrefs = { ...preferences, enabled: false };
        savePreferences(newPrefs);
      } else {
        setTestResult('❌ Failed to unsubscribe from push notifications');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setTestResult('❌ Error unsubscribing from push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!isSubscribed || permission !== 'granted') {
      setTestResult('❌ Please subscribe to notifications first');
      return;
    }

    setIsLoading(true);
    try {
      const success = await pushNotificationManager.testNotification();
      if (success) {
        setTestResult('✅ Test notification sent successfully');
        setTimeout(updateNotificationData, 1000); // Update stats after a delay
      } else {
        setTestResult('❌ Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      setTestResult('❌ Error sending test notification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    pushNotificationManager.clearNotificationHistory();
    updateNotificationData();
    setTestResult('✅ Notification history cleared');
  };

  const handleRemoveOldNotifications = () => {
    pushNotificationManager.removeOldNotifications(7); // Remove notifications older than 7 days
    updateNotificationData();
    setTestResult('✅ Old notifications removed');
  };

  const getPermissionIcon = () => {
    switch (permission) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'denied':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getPermissionColor = () => {
    switch (permission) {
      case 'granted':
        return 'text-green-400';
      case 'denied':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  const isInQuietHours = () => {
    if (!preferences.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = parseInt(preferences.quietHours.start.split(':')[0]) * 60 + parseInt(preferences.quietHours.start.split(':')[1]);
    const endTime = parseInt(preferences.quietHours.end.split(':')[0]) * 60 + parseInt(preferences.quietHours.end.split(':')[1]);
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <Bell className="w-6 h-6 mr-3" />
              Notification Settings
              {isInQuietHours() && (
                <span className="ml-3 flex items-center">
                  <VolumeX className="w-4 h-4 mr-1 text-purple-400" />
                  <span className="text-purple-400 text-sm">QUIET HOURS</span>
                </span>
              )}
            </h1>
            <p className="text-gray-400 mt-1">
              Manage push notification preferences and permissions
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Status</div>
              <div className={`flex items-center space-x-2 ${getPermissionColor()}`}>
                {getPermissionIcon()}
                <span className="font-medium">{permission.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Browser Support & Permission Status */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Browser Support & Permissions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <div className="text-sm text-gray-400">Browser Support</div>
              <div className="text-white font-medium">{isSupported ? 'Supported' : 'Not Supported'}</div>
            </div>
            {isSupported ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <div className="text-sm text-gray-400">Permission Status</div>
              <div className={`font-medium ${getPermissionColor()}`}>{permission}</div>
            </div>
            {getPermissionIcon()}
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <div className="text-sm text-gray-400">Subscription Status</div>
              <div className="text-white font-medium">{isSubscribed ? 'Subscribed' : 'Not Subscribed'}</div>
            </div>
            {isSubscribed ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-6">
          {permission !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              disabled={isLoading || !isSupported}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              <Bell className="w-4 h-4" />
              <span>{isLoading ? 'Requesting...' : 'Request Permission'}</span>
            </button>
          )}
          
          {permission === 'granted' && !isSubscribed && (
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
            >
              <Bell className="w-4 h-4" />
              <span>{isLoading ? 'Subscribing...' : 'Subscribe'}</span>
            </button>
          )}
          
          {isSubscribed && (
            <button
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              <BellOff className="w-4 h-4" />
              <span>{isLoading ? 'Unsubscribing...' : 'Unsubscribe'}</span>
            </button>
          )}
          
          <button
            onClick={handleTestNotification}
            disabled={isLoading || !isSubscribed}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
          >
            <TestTube className="w-4 h-4" />
            <span>{isLoading ? 'Sending...' : 'Test Notification'}</span>
          </button>
        </div>
        
        {testResult && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg">
            <div className="text-sm text-gray-300">{testResult}</div>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Notification Preferences</h2>
        
        <div className="space-y-6">
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Enable Notifications</div>
              <div className="text-sm text-gray-400">Master switch for all notifications</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(e) => savePreferences({ ...preferences, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          {/* Notification Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-white font-medium">Security Alerts</div>
                  <div className="text-sm text-gray-400">Critical security events</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.securityAlerts}
                  onChange={(e) => savePreferences({ ...preferences, securityAlerts: e.target.checked })}
                  disabled={!preferences.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500 peer-disabled:opacity-50"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-white font-medium">System Notifications</div>
                  <div className="text-sm text-gray-400">System status updates</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.systemNotifications}
                  onChange={(e) => savePreferences({ ...preferences, systemNotifications: e.target.checked })}
                  disabled={!preferences.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500 peer-disabled:opacity-50"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-white font-medium">User Activity</div>
                  <div className="text-sm text-gray-400">Login/logout events</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.userActivity}
                  onChange={(e) => savePreferences({ ...preferences, userActivity: e.target.checked })}
                  disabled={!preferences.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 peer-disabled:opacity-50"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="text-white font-medium">Broadcasts</div>
                  <div className="text-sm text-gray-400">System-wide announcements</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.broadcasts}
                  onChange={(e) => savePreferences({ ...preferences, broadcasts: e.target.checked })}
                  disabled={!preferences.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500 peer-disabled:opacity-50"></div>
              </label>
            </div>
          </div>

          {/* Sound and Vibration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                {preferences.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-yellow-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <div className="text-white font-medium">Sound</div>
                  <div className="text-sm text-gray-400">Play notification sounds</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.soundEnabled}
                  onChange={(e) => savePreferences({ ...preferences, soundEnabled: e.target.checked })}
                  disabled={!preferences.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500 peer-disabled:opacity-50"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-5 h-5 text-pink-400" />
                <div>
                  <div className="text-white font-medium">Vibration</div>
                  <div className="text-sm text-gray-400">Vibrate on mobile devices</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.vibrationEnabled}
                  onChange={(e) => savePreferences({ ...preferences, vibrationEnabled: e.target.checked })}
                  disabled={!preferences.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 peer-disabled:opacity-50"></div>
              </label>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <VolumeX className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="text-white font-medium">Quiet Hours</div>
                  <div className="text-sm text-gray-400">Suppress notifications during specified hours</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.quietHours.enabled}
                  onChange={(e) => savePreferences({ 
                    ...preferences, 
                    quietHours: { ...preferences.quietHours, enabled: e.target.checked }
                  })}
                  disabled={!preferences.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500 peer-disabled:opacity-50"></div>
              </label>
            </div>
            
            {preferences.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={preferences.quietHours.start}
                    onChange={(e) => savePreferences({ 
                      ...preferences, 
                      quietHours: { ...preferences.quietHours, start: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">End Time</label>
                  <input
                    type="time"
                    value={preferences.quietHours.end}
                    onChange={(e) => savePreferences({ 
                      ...preferences, 
                      quietHours: { ...preferences.quietHours, end: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Severity Filter */}
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="mb-4">
              <div className="text-white font-medium mb-2">Severity Filter</div>
              <div className="text-sm text-gray-400">Choose which severity levels to receive</div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.severityFilter.critical}
                  onChange={(e) => savePreferences({ 
                    ...preferences, 
                    severityFilter: { ...preferences.severityFilter, critical: e.target.checked }
                  })}
                  disabled={!preferences.enabled}
                  className="rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500 disabled:opacity-50"
                />
                <span className="text-red-400">Critical</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.severityFilter.high}
                  onChange={(e) => savePreferences({ 
                    ...preferences, 
                    severityFilter: { ...preferences.severityFilter, high: e.target.checked }
                  })}
                  disabled={!preferences.enabled}
                  className="rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                />
                <span className="text-orange-400">High</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.severityFilter.medium}
                  onChange={(e) => savePreferences({ 
                    ...preferences, 
                    severityFilter: { ...preferences.severityFilter, medium: e.target.checked }
                  })}
                  disabled={!preferences.enabled}
                  className="rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500 disabled:opacity-50"
                />
                <span className="text-yellow-400">Medium</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.severityFilter.low}
                  onChange={(e) => savePreferences({ 
                    ...preferences, 
                    severityFilter: { ...preferences.severityFilter, low: e.target.checked }
                  })}
                  disabled={!preferences.enabled}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-blue-400">Low</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Statistics */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Notification Statistics</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRemoveOldNotifications}
              className="flex items-center space-x-2 px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors text-sm"
            >
              <Clock className="w-4 h-4" />
              <span>Clean Old</span>
            </button>
            <button
              onClick={handleClearHistory}
              className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
            >
              <XCircle className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
          <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{stats.delivered}</div>
            <div className="text-sm text-gray-400">Delivered</div>
          </div>
          <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">{stats.clicked}</div>
            <div className="text-sm text-gray-400">Clicked</div>
          </div>
          <div className="text-center p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-400">{stats.dismissed}</div>
            <div className="text-sm text-gray-400">Dismissed</div>
          </div>
          <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">{stats.clickRate}%</div>
            <div className="text-sm text-gray-400">Click Rate</div>
          </div>
        </div>
        
        {/* Recent Notifications */}
        <div>
          <h3 className="text-md font-medium text-white mb-3">Recent Notifications</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notificationHistory.slice(0, 10).map((notification, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    notification.type === 'security' ? 'bg-red-400' :
                    notification.type === 'system' ? 'bg-blue-400' :
                    notification.type === 'user' ? 'bg-green-400' : 'bg-purple-400'
                  }`}></div>
                  <div>
                    <div className="text-white text-sm font-medium">{notification.title}</div>
                    <div className="text-gray-400 text-xs">{notification.body}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  {notification.clicked && <CheckCircle className="w-3 h-3 text-green-400" />}
                  {notification.dismissed && <XCircle className="w-3 h-3 text-red-400" />}
                  <span>{new Date(notification.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            {notificationHistory.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                No notifications yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;