// Security utilities for encryption, decryption, and device fingerprinting

export const encryptData = (data: string): string => {
  // In a real application, use proper encryption like AES
  // This is a simple base64 encoding for demonstration
  try {
    return btoa(unescape(encodeURIComponent(data)));
  } catch (error) {
    console.error('Encryption failed:', error);
    return data;
  }
};

export const decryptData = (encryptedData: string): string => {
  // In a real application, use proper decryption
  try {
    return decodeURIComponent(escape(atob(encryptedData)));
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
};

export const generateDeviceFingerprint = async (): Promise<string> => {
  // Generate a unique device fingerprint
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint test', 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency?.toString() || '0'
  ].join('|');

  // Simple hash function (in production, use a proper crypto hash)
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `device_${Math.abs(hash).toString(16)}`;
};

export const compressImage = (imageData: string, quality: number = 0.3): string => {
  // Create a canvas to compress the image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  return new Promise<string>((resolve) => {
    img.onload = () => {
      // Set canvas dimensions (reduce size for compression)
      canvas.width = Math.min(img.width, 400);
      canvas.height = Math.min(img.height, 400);

      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      // Convert to compressed JPEG
      const compressedData = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedData);
    };

    img.src = imageData;
  }) as any; // Type assertion for demo purposes
};

export const validateSecurityEnvironment = (): boolean => {
  // Check if running in a secure environment
  const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  const hasWebRTC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasNotificationAPI = 'Notification' in window;
  const hasIndexedDB = 'indexedDB' in window;

  return isHttps && hasWebRTC && hasNotificationAPI && hasIndexedDB;
};

export const clearSensitiveMemory = (): void => {
  // Clear sensitive data from memory
  if ('gc' in window && typeof window.gc === 'function') {
    window.gc();
  }

  // Clear any cached canvas data
  const canvases = document.querySelectorAll('canvas');
  canvases.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });

  // Clear temporary storage
  try {
    sessionStorage.clear();
    localStorage.removeItem('tempChatData');
    localStorage.removeItem('tempFaceData');
  } catch (error) {
    console.warn('Failed to clear storage:', error);
  }
};

export const generateSecretCode = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const isValidFaceData = (faceData: string): boolean => {
  // Basic validation for face data format
  return faceData.startsWith('data:image/') && faceData.length > 1000;
};

// Password hashing utilities
export const hashPassword = async (password: string, algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' | 'MD5' = 'SHA-256'): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  if (algorithm === 'MD5') {
    // Simple MD5 implementation for compatibility
    return await md5Hash(password);
  }
  
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${algorithm.toLowerCase()}:${hashHex}`;
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    // Check if hash is in 'algorithm:hash' format
    const colonIndex = hashedPassword.indexOf(':');
    
    if (colonIndex > 0) {
      // New format: 'algorithm:hash'
      const [algorithm, hash] = hashedPassword.split(':');
      
      const algorithmMap: { [key: string]: 'SHA-256' | 'SHA-384' | 'SHA-512' | 'MD5' } = {
        'sha-256': 'SHA-256',
        'sha-384': 'SHA-384',
        'sha-512': 'SHA-512',
        'md5': 'MD5'
      };
      
      const cryptoAlgorithm = algorithmMap[algorithm.toLowerCase()];
      if (!cryptoAlgorithm) {
        console.error('Unsupported hash algorithm:', algorithm);
        return false;
      }
      
      const newHash = await hashPassword(password, cryptoAlgorithm);
      return newHash === hashedPassword;
    } else {
      // Legacy format: plain hex hash (assume SHA-256)
      if (hashedPassword.length === 64 && /^[a-f0-9]+$/i.test(hashedPassword)) {
        // Looks like a SHA-256 hex hash
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return hashHex === hashedPassword;
      }
      
      // Try other algorithms for legacy format
      const algorithms: ('SHA-256' | 'SHA-384' | 'SHA-512')[] = ['SHA-256', 'SHA-384', 'SHA-512'];
      
      for (const algorithm of algorithms) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest(algorithm, data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        if (hashHex === hashedPassword) {
          return true;
        }
      }
      
      // Fallback for plain text passwords (backward compatibility)
      return password === hashedPassword;
    }
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
};

// Simple MD5 implementation for compatibility
const md5Hash = async (input: string): Promise<string> => {
  // This is a simplified MD5 for demo purposes
  // In production, use a proper crypto library
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  
  // Use SHA-256 as fallback since MD5 is not available in Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `md5:${hashHex.substring(0, 32)}`; // Truncate to MD5-like length
};

// Generate hashed password for environment setup
export const generateHashedPassword = async (plainPassword: string, algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' | 'MD5' = 'SHA-256'): Promise<string> => {
  return await hashPassword(plainPassword, algorithm);
};