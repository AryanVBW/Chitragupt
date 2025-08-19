import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, Filter, Download, Trash2, Eye, Search } from 'lucide-react';
import { realTimeDataManager, SecurityEvent } from '../utils/realtimeData';

interface FilterOptions {
  severity: 'all' | 'low' | 'medium' | 'high' | 'critical';
  type: 'all' | 'login' | 'logout' | 'face_verification' | 'session_start' | 'session_end' | 'encryption_verified' | 'suspicious_activity' | 'failed_auth';
  timeRange: 'all' | '1h' | '6h' | '24h' | '7d';
}

const SecurityEventsMonitor: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<SecurityEvent[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    severity: 'all',
    type: 'all',
    timeRange: '24h'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    // Subscribe to security events
    const handleSecurityEvents = (newEvents: SecurityEvent[]) => {
      setEvents(newEvents);
      
      // Auto-scroll to bottom if enabled and live
      if (autoScroll && isLive) {
        setTimeout(() => {
          eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    realTimeDataManager.on('securityEvents', handleSecurityEvents);
    
    // Load initial events
    setEvents(realTimeDataManager.getSecurityEvents());

    return () => {
      realTimeDataManager.off('securityEvents', handleSecurityEvents);
    };
  }, [autoScroll, isLive]);

  useEffect(() => {
    // Apply filters whenever events or filters change
    applyFilters();
  }, [events, filters, searchTerm]);

  const applyFilters = () => {
    let filtered = [...events];

    // Apply severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(event => event.severity === filters.severity);
    }

    // Apply type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(event => event.type === filters.type);
    }

    // Apply time range filter
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const timeRangeMs = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
      }[filters.timeRange];
      
      if (timeRangeMs) {
        const cutoffTime = new Date(now.getTime() - timeRangeMs);
        filtered = filtered.filter(event => event.timestamp >= cutoffTime);
      }
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.message.toLowerCase().includes(searchLower) ||
        event.userEmail?.toLowerCase().includes(searchLower) ||
        event.type.toLowerCase().includes(searchLower)
      );
    }

    setFilteredEvents(filtered);
  };

  const getSeverityColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'low':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'high':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getSeverityIcon = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      case 'medium':
        return <Clock className="w-4 h-4" />;
      case 'high':
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'login':
        return '🔐';
      case 'logout':
        return '🚪';
      case 'face_verification':
        return '👤';
      case 'session_start':
        return '▶️';
      case 'session_end':
        return '⏹️';
      case 'encryption_verified':
        return '🔒';
      case 'suspicious_activity':
        return '⚠️';
      case 'failed_auth':
        return '❌';
      default:
        return '🔍';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString();
    }
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-events-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearEvents = () => {
    if (confirm('Are you sure you want to clear all security events? This action cannot be undone.')) {
      // In a real application, you would clear events from the data manager
      setEvents([]);
    }
  };

  const addTestEvent = () => {
    realTimeDataManager.addSecurityEvent({
      type: 'suspicious_activity',
      message: 'Test security event generated by administrator',
      severity: 'medium',
      metadata: { test: true }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <Shield className="w-6 h-6 mr-3" />
              Security Events Monitor
              {isLive && (
                <span className="ml-3 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                  <span className="text-green-400 text-sm">LIVE</span>
                </span>
              )}
            </h1>
            <p className="text-gray-400 mt-1">
              Real-time security events with accurate timestamps • {filteredEvents.length} events
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isLive 
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                  : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
              }`}
            >
              {isLive ? 'Live' : 'Paused'}
            </button>
            <button
              onClick={addTestEvent}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              Add Test Event
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Severity Filter */}
          <select
            value={filters.severity}
            onChange={(e) => setFilters({...filters, severity: e.target.value as FilterOptions['severity']})}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value as FilterOptions['type']})}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="face_verification">Face Verification</option>
            <option value="session_start">Session Start</option>
            <option value="session_end">Session End</option>
            <option value="encryption_verified">Encryption</option>
            <option value="suspicious_activity">Suspicious Activity</option>
            <option value="failed_auth">Failed Auth</option>
          </select>

          {/* Time Range Filter */}
          <select
            value={filters.timeRange}
            onChange={(e) => setFilters({...filters, timeRange: e.target.value as FilterOptions['timeRange']})}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-2 rounded-lg transition-colors ${
                autoScroll 
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                  : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
              }`}
              title="Auto-scroll to new events"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={exportEvents}
              className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
              title="Export events"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={clearEvents}
              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              title="Clear all events"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Security Events
            <span className="ml-2 text-sm text-gray-400">({filteredEvents.length} events)</span>
          </h2>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No security events match the current filters</p>
            </div>
          ) : (
            <div className="space-y-1 p-4">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:bg-white/5 ${
                    getSeverityColor(event.severity)
                  } ${
                    selectedEvent?.id === event.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getTypeIcon(event.type)}</span>
                        {getSeverityIcon(event.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-white capitalize">
                            {event.type.replace('_', ' ')}
                          </span>
                          {event.userEmail && (
                            <span className="text-sm text-gray-400">• {event.userEmail}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300">{event.message}</p>
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            {Object.entries(event.metadata).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">
                        {formatTimestamp(event.timestamp)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {event.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={eventsEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/10 max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <span className="text-2xl mr-3">{getTypeIcon(selectedEvent.type)}</span>
                  Event Details
                </h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Event ID</label>
                  <p className="text-white font-mono text-sm">{selectedEvent.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Timestamp</label>
                  <p className="text-white">{selectedEvent.timestamp.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                  <p className="text-white capitalize">{selectedEvent.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Severity</label>
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-sm ${getSeverityColor(selectedEvent.severity)}`}>
                    {getSeverityIcon(selectedEvent.severity)}
                    <span className="capitalize">{selectedEvent.severity}</span>
                  </span>
                </div>
              </div>
              
              {selectedEvent.userEmail && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">User</label>
                  <p className="text-white">{selectedEvent.userEmail}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Message</label>
                <p className="text-white">{selectedEvent.message}</p>
              </div>
              
              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Metadata</label>
                  <pre className="bg-black/20 p-3 rounded-lg text-sm text-gray-300 overflow-x-auto">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityEventsMonitor;