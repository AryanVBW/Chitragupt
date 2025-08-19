import React, { useState, useEffect } from 'react';
import { supabase, signUp, signIn, getCurrentUser, getUserProfile } from '../lib/supabase';
import { User, Shield, Mail, Lock, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { runFaceVerificationMigration } from '../utils/runMigration';

interface AdminSetupProps {
  onAdminCreated: () => void;
}

export const AdminSetup: React.FC<AdminSetupProps> = ({ onAdminCreated }) => {
  const [email] = useState(import.meta.env.VITE_ADMIN_EMAIL || '');
  const [password, setPassword] = useState(import.meta.env.VITE_ADMIN_PASSWORD || '');
  const [confirmPassword, setConfirmPassword] = useState(import.meta.env.VITE_ADMIN_PASSWORD || '');
  const [fullName, setFullName] = useState('System Administrator');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [adminExists, setAdminExists] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'running' | 'success' | 'error'>('pending');

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, is_admin')
        .eq('email', email)
        .eq('is_admin', true)
        .single();

      if (data && !error) {
        setAdminExists(true);
        setMessage('Admin account already exists and is configured.');
        setMessageType('success');
      }
    } catch (error) {
      // Admin doesn't exist yet, which is expected
      setAdminExists(false);
    }
  };

  const handleRunMigration = async () => {
    setMigrationStatus('running');
    
    try {
      const result = await runFaceVerificationMigration();
      
      if (result.success) {
        setMigrationStatus('success');
        setMessage('Database migration completed successfully!');
        setMessageType('success');
      } else {
         setMigrationStatus('error');
         setMessage('Migration failed: ' + (result.error ? String(result.error) : 'Unknown error'));
         setMessageType('error');
       }
    } catch (error: any) {
      setMigrationStatus('error');
      setMessage('Migration failed: ' + error.message);
      setMessageType('error');
    }
  };

  const createAdminAccount = async () => {
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('Creating admin account...');
    setMessageType('info');

    try {
      // First, try to sign up the user
      const { data: signUpData, error: signUpError } = await signUp(email, password, fullName);

      if (signUpError) {
        // If user already exists, try to sign in
        if (signUpError.message.includes('already registered')) {
          const { data: signInData, error: signInError } = await signIn(email, password);
          
          if (signInError) {
            throw signInError;
          }

          // Check if user is already admin
          const { data: profile } = await getUserProfile();
          if (profile?.is_admin) {
            setMessage('Admin account already exists and you are now signed in.');
            setMessageType('success');
            setAdminExists(true);
            onAdminCreated();
            return;
          }

          // Promote user to admin
          const { error: promoteError } = await supabase.rpc('promote_to_admin', {
            user_email: email
          });

          if (promoteError) {
            throw promoteError;
          }

          setMessage('Existing user promoted to admin successfully!');
          setMessageType('success');
          setAdminExists(true);
          onAdminCreated();
        } else {
          throw signUpError;
        }
      } else {
        // New user created, they should automatically be promoted to admin via trigger
        setMessage('Admin account created successfully! Please check your email for verification.');
        setMessageType('success');
        setAdminExists(true);
        onAdminCreated();
      }
    } catch (error: any) {
      console.error('Error creating admin account:', error);
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <Shield className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Admin Account Setup</h2>
        <p className="text-gray-600 mt-2">
          {adminExists ? 'Admin account is configured' : 'Create the administrator account for Chitragupt'}
        </p>
        {!adminExists && (
          <p className="text-yellow-600 text-sm mt-2">
            💡 Default password is pre-filled from environment variables (VITE_ADMIN_PASSWORD_HASH)
          </p>
        )}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md flex items-center ${
          messageType === 'success' ? 'bg-green-50 text-green-700' :
          messageType === 'error' ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {messageType === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-2" />
          ) : messageType === 'error' ? (
            <AlertCircle className="h-5 w-5 mr-2" />
          ) : (
            <User className="h-5 w-5 mr-2" />
          )}
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Mail className="inline h-4 w-4 mr-1" />
            Admin Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <User className="inline h-4 w-4 mr-1" />
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={adminExists}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        {!adminExists && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Lock className="inline h-4 w-4 mr-1" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {!adminExists && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Lock className="inline h-4 w-4 mr-1" />
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm admin password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {!adminExists && (
          <button
            onClick={createAdminAccount}
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <User className="h-4 w-4 mr-2" />
                Create Admin Account
              </>
            )}
          </button>
        )}
        
        <button
          onClick={handleRunMigration}
          disabled={migrationStatus === 'running'}
          className={`w-full mt-3 py-2 px-4 rounded-md focus:ring-2 focus:ring-offset-2 flex items-center justify-center ${
            migrationStatus === 'success' 
              ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
              : migrationStatus === 'error'
              ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
              : 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {migrationStatus === 'running' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              {migrationStatus === 'success' ? 'Migration Complete' : 
               migrationStatus === 'error' ? 'Migration Failed - Retry' : 
               'Run Face Verification Migration'}
            </>
          )}
        </button>
      </div>

      <div className="mt-6 text-xs text-gray-500 text-center">
        <p>This admin account will have full access to:</p>
        <ul className="mt-2 space-y-1">
          <li>• User management and monitoring</li>
          <li>• Chat message oversight</li>
          <li>• System notifications and alerts</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminSetup;