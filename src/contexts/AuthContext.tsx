import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, type User as SupabaseUser } from '../lib/supabase';
import { encryptData, decryptData, generateDeviceFingerprint, verifyPassword } from '../utils/security';

interface User {
  id: string;
  email: string;
  faceData?: string;
  deviceId: string;
  isVerified: boolean;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, faceData?: string) => Promise<boolean>;
  register: (email: string, password: string, faceData: string) => Promise<boolean>;
  adminLogin: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  verifyFace: (faceData: string) => Promise<boolean>;
  requiresFaceVerification: boolean;
  setRequiresFaceVerification: (value: boolean) => void;
  sendVerificationEmail: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requiresFaceVerification, setRequiresFaceVerification] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = sessionStorage.getItem('secureUser');
    if (storedUser) {
      try {
        const decryptedUser = decryptData(storedUser);
        setUser(JSON.parse(decryptedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to restore session:', error);
        sessionStorage.removeItem('secureUser');
      }
    }
  }, []);

  const login = async (email: string, password: string, faceData?: string): Promise<boolean> => {
    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (data.user) {
        // Get user profile from database
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          return false;
        }

        const deviceId = await generateDeviceFingerprint();
        
        const newUser: User = {
          id: data.user.id,
          email: data.user.email!,
          faceData: profile?.face_data ? encryptData(profile.face_data) : undefined,
          deviceId,
          isVerified: profile?.is_verified || false,
          isAdmin: profile?.is_admin || false
        };

        const encryptedUser = encryptData(JSON.stringify(newUser));
        sessionStorage.setItem('secureUser', encryptedUser);
        
        setUser(newUser);
        setIsAuthenticated(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, faceData: string): Promise<boolean> => {
    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Registration error:', error);
        return false;
      }

      if (data.user) {
        const deviceId = await generateDeviceFingerprint();
        
        // Create user profile in database
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            face_data: faceData,
            device_id: deviceId,
            is_verified: false,
            is_admin: false
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          return false;
        }

        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const adminLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@chitragupt.com';
      const adminPasswordHash = import.meta.env.VITE_ADMIN_PASSWORD_HASH || import.meta.env.VITE_ADMIN_PASSWORD;
      
      if (email !== adminEmail) {
        return false;
      }

      // Verify admin password using hash comparison
      const isPasswordValid = await verifyPassword(password, adminPasswordHash);
      if (!isPasswordValid) {
        console.error('Admin password verification failed');
        return false;
      }

      // Try to sign in with Supabase (fallback to environment credentials)
      let supabaseUser = null;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.user) {
          // Verify admin status in database
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (!profileError && profile?.is_admin) {
            supabaseUser = data.user;
          }
        }
      } catch (supabaseError) {
        console.log('Supabase authentication failed, using environment-based auth');
      }

      // Only create admin user session if authenticated through Supabase
      if (!supabaseUser) {
        console.error('Admin authentication failed - no valid Supabase user');
        return false;
      }

      const deviceId = await generateDeviceFingerprint();
      
      const newUser: User = {
        id: supabaseUser.id,
        email: adminEmail,
        deviceId,
        isVerified: true,
        isAdmin: true
      };

      const encryptedUser = encryptData(JSON.stringify(newUser));
      sessionStorage.setItem('secureUser', encryptedUser);
      
      setUser(newUser);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Admin login failed:', error);
      return false;
    }
  };

  const sendVerificationEmail = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user?.email || ''
      });

      if (error) {
        console.error('Email verification error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Send verification email failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    sessionStorage.clear();
    localStorage.removeItem('tempChatData');
  };

  const verifyFace = async (faceData: string): Promise<boolean> => {
    if (!user || !user.faceData) return false;
    
    try {
      const storedFaceData = decryptData(user.faceData);
      // In a real app, this would use proper face comparison algorithms
      return faceData.length > 0 && storedFaceData.length > 0;
    } catch (error) {
      console.error('Face verification failed:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      register,
      adminLogin,
      logout,
      verifyFace,
      requiresFaceVerification,
      setRequiresFaceVerification,
      sendVerificationEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};