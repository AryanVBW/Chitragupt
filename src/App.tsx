import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SecurityProvider } from './contexts/SecurityContext';
import AuthScreen from './components/AuthScreen';
import ChatInterface from './components/ChatInterface';
import AdminPanel from './components/AdminPanel';
import AdminDashboard from './components/AdminDashboard';
import LoadingScreen from './components/LoadingScreen';
import AdminSetup from './components/AdminSetup';
import AnimatedLogo from './components/AnimatedLogo';
import { Shield, MessageSquareText, Settings, Users, UserCog } from 'lucide-react';

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
              <AnimatedLogo size="small" />
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

          {isAuthenticated && <NavBar />}
          
          <main className={`${isAuthenticated ? 'pt-16 pb-16' : 'pt-0 pb-16'} relative z-10`}>
            {!isAuthenticated ? (
              <AuthScreen onAuthSuccess={handleAuthSuccess} />
            ) : currentView === 'chat' ? (
              <ChatInterface />
            ) : currentView === 'admin' ? (
              <AdminPanel />
            ) : currentView === 'dashboard' ? (
              <AdminDashboard />

            ) : currentView === 'setup' ? (
              <div className="container mx-auto px-4 py-8">
                <AdminSetup onAdminCreated={() => setCurrentView('dashboard')} />
              </div>
            ) : (
              <ChatInterface />
            )}
          </main>
          
          {/* Footer */}
          <footer className="fixed bottom-0 left-0 right-0 z-40 bg-black/20 backdrop-blur-lg border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                <span>© 2024 AryanVBW</span>
                <span>•</span>
                <a 
                  href="https://github.com/AryanVBW" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors duration-300 flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span>GitHub</span>
                </a>
              </div>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </SecurityProvider>
  );
}

export default App;