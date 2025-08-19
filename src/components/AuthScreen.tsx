import React, { useState, useRef, useCallback } from 'react';
import { Camera, Key, Shield, Eye, EyeOff, Scan, Mail, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FaceCapture from './FaceCapture';
import AnimatedLogo from './AnimatedLogo';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<'face' | 'code' | 'admin'>('face');
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'email' | 'verification'>('email');
  const [needsVerification, setNeedsVerification] = useState(false);
  
  const { login, register, adminLogin, sendVerificationEmail } = useAuth();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (authMode === 'admin') {
        const success = await adminLogin(email, password);
        if (success) {
          onAuthSuccess();
        } else {
          setError('Admin login failed. Please check your credentials.');
        }
      } else if (loginMode === 'login') {
        const success = await login(email, password);
        if (success) {
          onAuthSuccess();
        } else {
          setError('Login failed. Please check your credentials.');
        }
      } else {
        // Registration mode - proceed to face capture
        setStep('verification');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaceAuth = async (faceData: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      if (loginMode === 'register') {
        const success = await register(email, password, faceData);
        if (success) {
          setNeedsVerification(true);
          setError('Registration successful! Please check your email for verification.');
        } else {
          setError('Registration failed. Please try again.');
        }
      } else {
        const success = await login(email, password, faceData);
        if (success) {
          onAuthSuccess();
        } else {
          setError('Face verification failed. Please try again.');
        }
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      const success = await sendVerificationEmail();
      if (success) {
        setError('Verification email sent! Please check your inbox.');
      } else {
        setError('Failed to send verification email.');
      }
    } catch (err) {
      setError('Failed to send verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // In a real app, this would verify the secret code
      if (secretCode.length >= 6) {
        const success = await login(email, `code:${secretCode}`);
        if (success) {
          onAuthSuccess();
        } else {
          setError('Invalid secret code. Please try again.');
        }
      } else {
        setError('Secret code must be at least 6 characters.');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'email') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-4">
                <AnimatedLogo size="large" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Chitragupt
              </h1>
              <p className="text-gray-400">Ultra-secure messaging platform</p>
            </div>

            {/* Auth Mode Toggle */}
            <div className="flex bg-white/5 rounded-lg p-1 mb-6">
              <button
                onClick={() => setAuthMode('face')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all duration-300 ${
                  authMode === 'face' 
                    ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/20' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Scan className="w-4 h-4" />
                <span>User</span>
              </button>
              <button
                onClick={() => setAuthMode('admin')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all duration-300 ${
                  authMode === 'admin' 
                    ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            </div>

            {authMode !== 'admin' && (
              <div className="flex bg-white/5 rounded-lg p-1 mb-6">
                <button
                  onClick={() => setLoginMode('login')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all duration-300 ${
                    loginMode === 'login' 
                      ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/20' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </button>
                <button
                  onClick={() => setLoginMode('register')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all duration-300 ${
                    loginMode === 'register' 
                      ? 'bg-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/20' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
                </button>
              </div>
            )}

            {needsVerification && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                <p className="text-green-400 text-sm mb-2">Registration successful! Please check your email for verification.</p>
                <button
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  className="text-green-400 hover:text-green-300 text-sm underline"
                >
                  Resend verification email
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-gray-400 transition-all duration-300"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-gray-400 transition-all duration-300 pr-12"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? 'Processing...' : 
                 authMode === 'admin' ? 'Admin Login' :
                 loginMode === 'login' ? 'Continue to Face ID' : 'Register & Continue'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-400">
              <p>Secure • Private • Encrypted</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <button
              onClick={() => setStep('email')}
              className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors duration-300"
            >
              ← Back to login
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">Face ID Verification</h2>
            <p className="text-gray-400">
              {loginMode === 'register' 
                ? 'Set up your Face ID for secure access' 
                : 'Verify your identity with Face ID'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 text-red-400 text-sm">
              {error}
            </div>
          )}

          {needsVerification && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
              <p className="text-green-400 text-sm mb-2">Registration successful! Please check your email for verification.</p>
              <button
                onClick={handleResendVerification}
                disabled={isLoading}
                className="text-green-400 hover:text-green-300 text-sm underline"
              >
                Resend verification email
              </button>
            </div>
          )}

          {/* Face ID Authentication */}
          <div className="space-y-6">
            <FaceCapture
              onCapture={handleFaceAuth}
              isLoading={isLoading}
            />
          </div>

          <div className="mt-6 text-center text-sm text-gray-400">
            <p>Your face data is encrypted and stored securely</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;