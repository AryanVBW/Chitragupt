import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  MessageSquare, 
  Bell, 
  Shield, 
  Eye, 
  Send, 
  Trash2, 
  UserCheck,
  AlertTriangle,
  Activity
} from 'lucide-react';

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  timestamp: string;
  user_email: string;
}

interface User {
  id: string;
  email: string;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'chats' | 'users' | 'notifications'>('overview');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchAllChats();
      fetchAllUsers();
    }
  }, [user]);

  const fetchAllChats = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          user_id,
          content,
          timestamp,
          users!inner(email)
        `)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching chats:', error);
        return;
      }

      const formattedMessages = data?.map(msg => ({
        id: msg.id,
        user_id: msg.user_id,
        content: msg.content,
        timestamp: msg.timestamp,
        user_email: (msg.users as any).email
      })) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, is_verified, is_admin, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const sendPushNotification = async () => {
    if (!notificationTitle || !notificationMessage) {
      alert('Please fill in both title and message');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          title: notificationTitle,
          message: notificationMessage,
          sent_by: user?.id,
          sent_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error sending notification:', error);
        alert('Failed to send notification');
        return;
      }

      // In a real app, you would integrate with a push notification service
      alert('Notification sent successfully!');
      setNotificationTitle('');
      setNotificationMessage('');
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message:', error);
        return;
      }

      setMessages(messages.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const toggleUserVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user:', error);
        return;
      }

      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_verified: !currentStatus } : u
      ));
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Manage users, monitor chats, and send notifications</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-800/50 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'chats', label: 'Chat Monitor', icon: MessageSquare },
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'notifications', label: 'Push Notifications', icon: Bell }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-white">{users.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Messages</p>
                  <p className="text-2xl font-bold text-white">{messages.length}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Verified Users</p>
                  <p className="text-2xl font-bold text-white">
                    {users.filter(u => u.is_verified).length}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </div>
        )}

        {/* Chat Monitor Tab */}
        {activeTab === 'chats' && (
          <div className="bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Chat Monitor
              </h2>
              <p className="text-gray-400 text-sm mt-1">View and manage all chat messages</p>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map(message => (
                  <div key={message.id} className="flex items-start justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-blue-400 font-medium">{message.user_email}</span>
                        <span className="text-gray-500 text-sm">
                          {new Date(message.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-white">{message.content}</p>
                    </div>
                    <button
                      onClick={() => deleteMessage(message.id)}
                      className="ml-4 p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-gray-400 text-center py-8">No messages found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Users className="w-5 h-5 mr-2" />
                User Management
              </h2>
              <p className="text-gray-400 text-sm mt-1">Manage user accounts and verification status</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${user.is_verified ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div>
                        <p className="text-white font-medium">{user.email}</p>
                        <p className="text-gray-400 text-sm">
                          Joined: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {user.is_admin && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleUserVerification(user.id, user.is_verified)}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${
                        user.is_verified
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{user.is_verified ? 'Unverify' : 'Verify'}</span>
                    </button>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-gray-400 text-center py-8">No users found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Push Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Push Notifications
              </h2>
              <p className="text-gray-400 text-sm mt-1">Send notifications to all users</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Notification Title</label>
                  <input
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter notification title..."
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Message</label>
                  <textarea
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter your message..."
                  />
                </div>
                <button
                  onClick={sendPushNotification}
                  disabled={loading || !notificationTitle || !notificationMessage}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Sending...' : 'Send Notification'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;