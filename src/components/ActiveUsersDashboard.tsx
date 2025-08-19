import React, { useState, useEffect } from 'react';
import { Users, Globe, Clock, MapPin, Monitor, Smartphone, Wifi, WifiOff, Shield, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { realTimeDataManager, ActiveUser } from '../utils/realtimeData';

interface UserFilters {
  status: 'all' | 'online' | 'idle' | 'away';
  device: 'all' | 'desktop' | 'mobile' | 'tablet';
  location: 'all' | string;
}

const ActiveUsersDashboard: React.FC = () => {
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ActiveUser[]>([]);
  const [filters, setFilters] = useState<UserFilters>({
    status: 'all',
    device: 'all',
    location: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    // Subscribe to active users updates
    const handleActiveUsers = (newUsers: ActiveUser[]) => {
      setUsers(newUsers);
      setLastUpdated(new Date());
    };

    realTimeDataManager.on('activeUsers', handleActiveUsers);
    
    // Load initial users
    setUsers(realTimeDataManager.getActiveUsers());

    return () => {
      realTimeDataManager.off('activeUsers', handleActiveUsers);
    };
  }, []);

  useEffect(() => {
    // Apply filters whenever users or filters change
    applyFilters();
  }, [users, filters, searchTerm]);

  const applyFilters = () => {
    let filtered = [...users];

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(user => user.status === filters.status);
    }

    // Apply device filter
    if (filters.device !== 'all') {
      filtered = filtered.filter(user => {
        const deviceType = user.deviceInfo.os.toLowerCase().includes('mobile') || 
                          user.deviceInfo.browser.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';
        return deviceType === filters.device;
      });
    }

    // Apply location filter
    if (filters.location !== 'all') {
      filtered = filtered.filter(user => user.deviceInfo.location?.includes(filters.location));
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchLower) ||
        user.name?.toLowerCase().includes(searchLower) ||
        user.deviceInfo.location?.toLowerCase().includes(searchLower) ||
        user.deviceInfo.browser.toLowerCase().includes(searchLower) ||
        user.deviceInfo.os.toLowerCase().includes(searchLower)
      );
    }

    setFilteredUsers(filtered);
  };

  const getStatusColor = (status: ActiveUser['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'idle':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'away':
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: ActiveUser['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4" />;
      case 'idle':
        return <Clock className="w-4 h-4" />;
      case 'away':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getDeviceIcon = (deviceInfo: ActiveUser['deviceInfo']) => {
    const osLower = deviceInfo.os.toLowerCase();
    const browserLower = deviceInfo.browser.toLowerCase();
    if (osLower.includes('mobile') || osLower.includes('android') || osLower.includes('ios') || browserLower.includes('mobile')) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const getConnectionIcon = (quality: ActiveUser['connectionQuality']) => {
    if (quality === 'excellent' || quality === 'good') {
      return <Wifi className="w-4 h-4 text-green-400" />;
    }
    return <WifiOff className="w-4 h-4 text-yellow-400" />;
  };

  const formatDuration = (lastActive: Date) => {
    const now = new Date();
    const diff = now.getTime() - lastActive.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
  };

  const refreshUsers = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setUsers(realTimeDataManager.getActiveUsers());
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  const getUniqueLocations = () => {
    const locations = users.map(user => user.deviceInfo.location).filter(Boolean);
    return [...new Set(locations)];
  };

  const getUserStats = () => {
    const online = users.filter(user => user.status === 'online').length;
    const idle = users.filter(user => user.status === 'idle').length;
    const away = users.filter(user => user.status === 'away').length;
    const mobile = users.filter(user => {
      const osLower = user.deviceInfo.os.toLowerCase();
      const browserLower = user.deviceInfo.browser.toLowerCase();
      return osLower.includes('mobile') || osLower.includes('android') || osLower.includes('ios') || browserLower.includes('mobile');
    }).length;
    const desktop = users.length - mobile;
    
    return { online, idle, away, mobile, desktop, total: users.length };
  };

  const stats = getUserStats();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <Users className="w-6 h-6 mr-3" />
              Active Users Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Currently logged-in users with verified session data • Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={refreshUsers}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-black/20 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-black/20 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Online</p>
              <p className="text-2xl font-bold text-green-400">{stats.online}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-black/20 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Idle</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.idle}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-black/20 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Away</p>
              <p className="text-2xl font-bold text-gray-400">{stats.away}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-black/20 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Desktop</p>
              <p className="text-2xl font-bold text-purple-400">{stats.desktop}</p>
            </div>
            <Monitor className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-black/20 backdrop-blur-lg rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Mobile</p>
              <p className="text-2xl font-bold text-orange-400">{stats.mobile}</p>
            </div>
            <Smartphone className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value as UserFilters['status']})}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="idle">Idle</option>
            <option value="away">Away</option>
          </select>

          {/* Device Filter */}
          <select
            value={filters.device}
            onChange={(e) => setFilters({...filters, device: e.target.value as UserFilters['device']})}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Devices</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>

          {/* Location Filter */}
          <select
            value={filters.location}
            onChange={(e) => setFilters({...filters, location: e.target.value})}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Locations</option>
            {getUniqueLocations().map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Active Users
            <span className="ml-2 text-sm text-gray-400">({filteredUsers.length} users)</span>
          </h2>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No users match the current filters</p>
            </div>
          ) : (
            <div className="space-y-1 p-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className="p-4 rounded-lg border border-white/10 cursor-pointer transition-all hover:bg-white/5 hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* User Info */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-white">
                            {user.name || user.email.split('@')[0]}
                          </h3>
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getStatusColor(user.status)}`}>
                            {getStatusIcon(user.status)}
                            <span className="capitalize">{user.status}</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{user.email}</p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            {getDeviceIcon(user.deviceInfo)}
                            <span>{user.deviceInfo.os}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Globe className="w-3 h-3" />
                            <span>{user.deviceInfo.browser}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{user.deviceInfo.location || 'Unknown'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Connection & Time Info */}
                    <div className="text-right">
                      <div className="flex items-center justify-end space-x-2 mb-1">
                        {getConnectionIcon(user.connectionQuality)}
                        <span className="text-xs text-gray-400">{user.connectionQuality}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Last active: {formatDuration(user.lastActive)}
                      </div>
                      <div className="text-xs text-gray-600">
                        Session: {formatDuration(user.sessionStart)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/10 max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : selectedUser.email.charAt(0).toUpperCase()}
                  </div>
                  User Details
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">User ID</label>
                  <p className="text-white font-mono text-sm">{selectedUser.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-sm ${getStatusColor(selectedUser.status)}`}>
                    {getStatusIcon(selectedUser.status)}
                    <span className="capitalize">{selectedUser.status}</span>
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                  <p className="text-white">{selectedUser.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                  <p className="text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Device</label>
                  <p className="text-white flex items-center space-x-2">
                    {getDeviceIcon(selectedUser.deviceInfo)}
                    <span>{selectedUser.deviceInfo.os}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Operating System</label>
                  <p className="text-white">{selectedUser.deviceInfo.os}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Browser</label>
                  <p className="text-white">{selectedUser.deviceInfo.browser}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Connection Quality</label>
                  <p className="text-white flex items-center space-x-2">
                    {getConnectionIcon(selectedUser.connectionQuality)}
                    <span className="capitalize">{selectedUser.connectionQuality}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                  <p className="text-white flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedUser.deviceInfo.location || 'Unknown'}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">IP Address</label>
                  <p className="text-white font-mono">{selectedUser.deviceInfo.ip || 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Session Started</label>
                  <p className="text-white">{selectedUser.sessionStart.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Last Active</label>
                  <p className="text-white">{selectedUser.lastActive.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Verification Status</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${
                    selectedUser.verificationStatus === 'verified' ? 'bg-green-500/20 text-green-400' :
                    selectedUser.verificationStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedUser.verificationStatus === 'verified' ? <CheckCircle className="w-4 h-4 mr-1" /> :
                     selectedUser.verificationStatus === 'pending' ? <Clock className="w-4 h-4 mr-1" /> :
                     <AlertCircle className="w-4 h-4 mr-1" />}
                    <span className="capitalize">{selectedUser.verificationStatus}</span>
                  </span>
                </div>
              </div>
              

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveUsersDashboard;