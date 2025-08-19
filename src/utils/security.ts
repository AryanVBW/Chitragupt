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