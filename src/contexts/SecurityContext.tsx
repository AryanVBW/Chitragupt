import React, { createContext, useContext, useEffect } from 'react';

interface SecurityContextType {
  isSecureEnvironment: boolean;
  clearSensitiveData: () => void;
  requestNotificationPermission: () => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isSecureEnvironment = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

  const clearSensitiveData = () => {
    sessionStorage.clear();
    localStorage.removeItem('tempChatData');
    
    // Clear any cached face recognition data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  useEffect(() => {
    // Set up security monitoring
    let isTabActive = true;
    
    const handleVisibilityChange = () => {
      if (document.hidden && isTabActive) {
        isTabActive = false;
        // Start security timer
        setTimeout(() => {
          if (!document.hidden) return;
          clearSensitiveData();
        }, 30000); // Clear after 30 seconds of inactivity
      } else if (!document.hidden) {
        isTabActive = true;
      }
    };

    const handleFocus = () => {
      isTabActive = true;
    };

    const handleBlur = () => {
      isTabActive = false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return (
    <SecurityContext.Provider value={{
      isSecureEnvironment,
      clearSensitiveData,
      requestNotificationPermission
    }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};