import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SecurityProvider } from './contexts/SecurityContext';
import AuthScreen from './components/AuthScreen';
import ChatInterface from './components/ChatInterface';
import AdminPanel from './components/AdminPanel';
import AdminDashboard from './components/AdminDashboard';
import LoadingScreen from './components/LoadingScreen';
import AdminSetup from './components/AdminSetup';
import { Shield, MessageSquareText, Settings, Users, ShoppingCart, UserCog } from 'lucide-react';
import LalThingStore from './components/LalThingStore';

function App() {
  const [currentView, setCurrentView] = useState<'auth' | 'chat' | 'admin' | 'dashboard' | 'store' | 'setup'>('auth');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize security measures
    const initializeApp = async () => {
      // Clear any existing sensitive data on app start
      sessionStorage.clear();
      
      // Set up tab close detection
      const handleBeforeUnload = () => {
        sessionStorage.clear();
        localStorage.removeItem('tempChatData');
      };
      
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Clear sensitive data when tab becomes hidden
          sessionStorage.clear();
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      setIsLoading(false);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    };

    initializeApp();
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setCurrentView('chat');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('auth');
    sessionStorage.clear();
    localStorage.removeItem('tempChatData');
  };

  const NavBar = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-blue-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Chitragupt
              </span>
            </div>
          </div>
          
          {isAuthenticated && (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('chat')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  currentView === 'chat' 
                    ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <MessageSquareText className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  currentView === 'admin' 
                    ? 'bg-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  currentView === 'dashboard' 
                    ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView('store')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  currentView === 'store' 
                    ? 'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView('setup')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  currentView === 'setup' 
                    ? 'bg-orange-500/20 text-orange-400 shadow-lg shadow-orange-500/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <UserCog className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all duration-300 border border-red-500/20"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SecurityProvider>
      <AuthProvider>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
          {/* Animated background */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -inset-10 opacity-30">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
              <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
              <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
            </div>
          </div>

          <NavBar />
          
          <main className="pt-16 relative z-10">
            {!isAuthenticated ? (
              <AuthScreen onAuthSuccess={handleAuthSuccess} />
            ) : currentView === 'chat' ? (
              <ChatInterface />
            ) : currentView === 'admin' ? (
              <AdminPanel />
            ) : currentView === 'dashboard' ? (
              <AdminDashboard />
            ) : currentView === 'store' ? (
              <LalThingStore />
            ) : currentView === 'setup' ? (
              <div className="container mx-auto px-4 py-8">
                <AdminSetup onAdminCreated={() => setCurrentView('dashboard')} />
              </div>
            ) : (
              <ChatInterface />
            )}
          </main>
        </div>
      </AuthProvider>
    </SecurityProvider>
  );
}

export default App;