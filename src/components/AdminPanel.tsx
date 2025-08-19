import React, { useState, useEffect } from 'react';
import { Users, Bell, Camera, Shield, Activity, Settings, Send, Trash2, UserPlus, CheckCircle, XCircle, UserX, BarChart3, Eye, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SystemSettings from './SystemSettings';
import SecurityEventsMonitor from './SecurityEventsMonitor';
import ActiveUsersDashboard from './ActiveUsersDashboard';
import SystemStatistics from './SystemStatistics';
import SecuritySettings from './SecuritySettings';
import SecurityStatusManager from './SecurityStatusManager';
import NotificationSettings from './NotificationSettings';

interface User {
  id: string;
  email: string;
  name: string;
  status: 'online' | 'offline' | 'away';
  lastActive: Date;
  deviceCount: number;
  verificationStatus: 'verified' | 'pending' | 'failed';
}

interface NotificationData {
  title: string;
  message: string;
  targetUsers: string[];
  priority: 'low' | 'medium' | 'high';
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'security' | 'events' | 'statistics' | 'notifications' | 'settings' | 'legacy-users' | 'monitoring' | 'legacy-monitoring'>('dashboard');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [showCameraFeed, setShowCameraFeed] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationData>({
    title: '',
    message: '',
    targetUsers: [],
    priority: 'medium'
  });

  // User management functions
  const deleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (error) {
          console.error('Error deleting user:', error);
          alert('Failed to delete user. Please try again.');
        } else {
          // Remove user from local state
          setUsers(users.filter(u => u.id !== userId));
          alert('User deleted successfully.');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. Please try again.');
      }
    }
  };

  const verifyUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', userId);

      if (error) {
        console.error('Error verifying user:', error);
        alert('Failed to verify user. Please try again.');
      } else {
        // Update user in local state
        setUsers(users.map(u => 
          u.id === userId ? { ...u, verificationStatus: 'verified' } : u
        ));
        alert('User verified successfully.');
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      alert('Failed to verify user. Please try again.');
    }
  };

  const unverifyUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: false })
        .eq('id', userId);

      if (error) {
        console.error('Error unverifying user:', error);
        alert('Failed to unverify user. Please try again.');
      } else {
        // Update user in local state
        setUsers(users.map(u => 
          u.id === userId ? { ...u, verificationStatus: 'pending' } : u
        ));
        alert('User unverified successfully.');
      }
    } catch (error) {
      console.error('Error unverifying user:', error);
      alert('Failed to unverify user. Please try again.');
    }
  };

  const createUser = async () => {
    if (newUser.name && newUser.email && newUser.password) {
      try {
        // Create user in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: newUser.email,
          password: newUser.password,
          options: {
            data: {
              full_name: newUser.name
            }
          }
        });

        if (error) {
          console.error('Error creating user:', error);
          alert('Failed to create user. Please try again.');
          return;
        }

        // Reset form and close modal
        setNewUser({ name: '', email: '', password: '' });
        setShowCreateUser(false);
        alert('User created successfully. They will receive a verification email.');
        
        // Refresh user list
        fetchUsers();
      } catch (error) {
        console.error('Error creating user:', error);
        alert('Failed to create user. Please try again.');
      }
    }
  };

  const removeUnverifiedUsers = async () => {
    if (window.confirm('Are you sure you want to remove all unverified users? This action cannot be undone.')) {
      try {
        // Delete all users who are not verified by Supabase
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('is_verified', false);

        if (error) {
          console.error('Error removing unverified users:', error);
          alert('Failed to remove unverified users. Please try again.');
        } else {
          alert('Successfully removed all unverified users.');
          // Refresh the user list
          fetchUsers();
        }
      } catch (error) {
        console.error('Error removing unverified users:', error);
        alert('Failed to remove unverified users. Please try again.');
      }
    }
  };

  // Fetch real users from Supabase
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, is_verified, is_admin, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Transform Supabase data to match our User interface
      const transformedUsers: User[] = data.map(user => ({
        id: user.id,
        email: user.email,
        name: user.full_name || user.email.split('@')[0],
        status: 'offline' as const, // We don't track real-time status yet
        lastActive: new Date(user.updated_at || user.created_at),
        deviceCount: 1, // Default value, could be enhanced later
        verificationStatus: user.is_verified ? 'verified' as const : 'pending' as const
      }));

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSendNotification = async () => {
    if (!notification.title || !notification.message) return;

    // Simulate sending notification
    console.log('Sending notification:', notification);
    
    // Reset form
    setNotification({
      title: '',
      message: '',
      targetUsers: [],
      priority: 'medium'
    });

    // Show success message (in a real app, you'd show this properly)
    alert('Notification sent successfully!');
  };

  const requestCameraPermission = (userId: string) => {
    setSelectedUser(userId);
    setShowCameraFeed(true);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'users', label: 'Active Users', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'events', label: 'Security Events', icon: Eye },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 bg-mesh relative overflow-hidden p-6">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-pink-900/10"></div>
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="glass-card mb-8 p-6">
          <div className="flex items-center space-x-4">
            <img src="/icons/glass-admin.svg" alt="Admin" className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                Admin Control Panel
              </h1>
              <p className="text-gray-400">Manage users, security, and system monitoring</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="glass-card flex space-x-1 rounded-lg p-1 mb-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`nav-item flex-1 flex items-center justify-center space-x-2 py-3 px-4 transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'nav-item-active'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <SecurityStatusManager />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <ActiveUsersDashboard />
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <SecuritySettings />
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            <SecurityEventsMonitor />
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="space-y-6">
            <SystemStatistics />
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <NotificationSettings />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <SystemSettings />
          </div>
        )}

        {/* Legacy User Management - keeping for backward compatibility */}
        {activeTab === 'legacy-users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Users List */}
            <div className="lg:col-span-2 card-glass-hover p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Active Users</h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={removeUnverifiedUsers}
                    className="flex items-center space-x-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors duration-300"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Remove Unverified</span>
                  </button>
                  <button
                    onClick={() => setShowCreateUser(true)}
                    className="flex items-center space-x-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-colors duration-300"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add User</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                    <span className="ml-3 text-gray-400">Loading users...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No users found.
                  </div>
                ) : (
                  users.map(user => (
                  <div key={user.id} className="card-glass p-4 hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${
                            user.status === 'online' ? 'bg-green-400' : 
                            user.status === 'away' ? 'bg-yellow-400' : 'bg-gray-400'
                          }`}></div>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-white">{user.name}</h3>
                          <p className="text-sm text-gray-400">{user.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">
                              {user.deviceCount} device{user.deviceCount !== 1 ? 's' : ''}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              user.verificationStatus === 'verified' ? 'bg-green-500/20 text-green-400' :
                              user.verificationStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {user.verificationStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => requestCameraPermission(user.id)}
                          className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors duration-300"
                          title="Request camera access"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                        {user.verificationStatus === 'pending' && (
                          <button
                            onClick={() => verifyUser(user.id)}
                            className="btn-glass-success p-2"
                            title="Verify user"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {user.verificationStatus === 'verified' && (
                          <button
                            onClick={() => unverifyUser(user.id)}
                            className="btn-glass-secondary p-2 text-yellow-400 border-yellow-500/30"
                            title="Unverify user"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="btn-glass-danger p-2"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>

            {/* User Statistics */}
            <div className="space-y-6">
              <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-4">System Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Users</span>
                    <span className="text-white font-bold">{users.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Online</span>
                    <span className="text-green-400 font-bold">
                      {users.filter(u => u.status === 'online').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Verified</span>
                    <span className="text-blue-400 font-bold">
                      {users.filter(u => u.verificationStatus === 'verified').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Active Devices</span>
                    <span className="text-purple-400 font-bold">
                      {users.reduce((sum, u) => sum + u.deviceCount, 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Security Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Encryption</span>
                    <span className="text-green-400">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Face Recognition</span>
                    <span className="text-green-400">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Auto-clear</span>
                    <span className="text-green-400">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="max-w-4xl">
            <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Send Push Notification</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Notification Title
                    </label>
                    <input
                      type="text"
                      value={notification.title}
                      onChange={(e) => setNotification(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-white placeholder-gray-400"
                      placeholder="Enter notification title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Priority Level
                    </label>
                    <select
                      value={notification.priority}
                      onChange={(e) => setNotification(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-white"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message Content
                  </label>
                  <textarea
                    value={notification.message}
                    onChange={(e) => setNotification(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-white placeholder-gray-400 resize-none"
                    placeholder="Enter your notification message here..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target Users
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {users.map(user => (
                      <label key={user.id} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors duration-300">
                        <input
                          type="checkbox"
                          checked={notification.targetUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNotification(prev => ({
                                ...prev,
                                targetUsers: [...prev.targetUsers, user.id]
                              }));
                            } else {
                              setNotification(prev => ({
                                ...prev,
                                targetUsers: prev.targetUsers.filter(id => id !== user.id)
                              }));
                            }
                          }}
                          className="rounded text-purple-400 focus:ring-purple-400 focus:ring-2"
                        />
                        <span className="text-white text-sm">{user.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSendNotification}
                    disabled={!notification.title || !notification.message || notification.targetUsers.length === 0}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:transform-none"
                  >
                    <Send className="w-5 h-5" />
                    <span>Send Notification</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'legacy-monitoring' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Live Activity Monitor</h2>
              
              <div className="space-y-4">
                {users.filter(u => u.status === 'online').map(user => (
                  <div key={user.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{user.name}</h3>
                        <p className="text-sm text-gray-400">Active now</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-sm">Online</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Security Events</h2>
              
              <div className="space-y-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 text-sm">Successful face verification</span>
                    <span className="text-gray-400 text-xs">2 min ago</span>
                  </div>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400 text-sm">New secure session started</span>
                    <span className="text-gray-400 text-xs">5 min ago</span>
                  </div>
                </div>
                
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400 text-sm">Message encryption verified</span>
                    <span className="text-gray-400 text-xs">8 min ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-4xl">
            <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">System Settings</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Security Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div>
                        <h4 className="font-medium text-white">Auto-clear sensitive data</h4>
                        <p className="text-sm text-gray-400">Clear chat data when tab is inactive</p>
                      </div>
                      <button className="bg-green-500/20 text-green-400 px-3 py-1 rounded text-sm">
                        Enabled
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div>
                        <h4 className="font-medium text-white">Face recognition required</h4>
                        <p className="text-sm text-gray-400">Require face verification for message reading</p>
                      </div>
                      <button className="bg-green-500/20 text-green-400 px-3 py-1 rounded text-sm">
                        Enabled
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Notification Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div>
                        <h4 className="font-medium text-white">Push notifications</h4>
                        <p className="text-sm text-gray-400">Send push notifications to users</p>
                      </div>
                      <button className="bg-green-500/20 text-green-400 px-3 py-1 rounded text-sm">
                        Enabled
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card-glass-hover p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Create New User</h3>
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors duration-300"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    className="input-glass w-full px-4 py-3 text-white placeholder-gray-400"
                    placeholder="Enter full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="input-glass w-full px-4 py-3 text-white placeholder-gray-400"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="input-glass w-full px-4 py-3 text-white placeholder-gray-400"
                    placeholder="Enter password"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 bg-gray-500/20 text-gray-400 py-2 px-4 rounded-lg hover:bg-gray-500/30 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={createUser}
                  className="btn-glass-success flex-1 py-2 px-4"
                >
                  Create User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera Feed Modal */}
        {showCameraFeed && selectedUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Live Camera Feed</h3>
                  <p className="text-gray-400">
                    Monitoring {users.find(u => u.id === selectedUser)?.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowCameraFeed(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors duration-300"
                >
                  ✕
                </button>
              </div>
              
              <div className="bg-black rounded-lg h-96 mb-6 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Camera feed would appear here</p>
                  <p className="text-gray-500 text-sm mt-2">
                    (User permission required)
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCameraFeed(false)}
                  className="flex-1 bg-red-500/20 text-red-400 py-2 px-4 rounded-lg hover:bg-red-500/30 transition-colors duration-300"
                >
                  End Monitoring
                </button>
                <button className="px-6 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors duration-300">
                  Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;