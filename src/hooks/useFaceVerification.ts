import { useState, useCallback, useRef } from 'react';
import { faceVerificationService, FaceVerificationResult } from '../utils/faceVerification';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface FaceVerificationState {
  isInitialized: boolean;
  isCapturing: boolean;
  isVerifying: boolean;
  hasStoredFace: boolean;
  error: string | null;
  lastVerification: Date | null;
}

export interface FaceVerificationHook {
  state: FaceVerificationState;
  initializeCamera: () => Promise<MediaStream | null>;
  captureAndStoreFace: () => Promise<boolean>;
  verifyFace: () => Promise<FaceVerificationResult>;
  enableFaceVerification: () => Promise<boolean>;
  disableFaceVerification: () => Promise<boolean>;
  checkFaceVerificationStatus: () => Promise<boolean>;
  startRealTimeVerification: (onVerificationResult: (result: FaceVerificationResult) => void) => void;
  stopRealTimeVerification: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const useFaceVerification = (): FaceVerificationHook => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const verificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<FaceVerificationState>({
    isInitialized: false,
    isCapturing: false,
    isVerifying: false,
    hasStoredFace: false,
    error: null,
    lastVerification: null
  });

  const updateState = useCallback((updates: Partial<FaceVerificationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const initializeCamera = useCallback(async (): Promise<MediaStream | null> => {
    try {
      updateState({ error: null });
      
      // Initialize face verification service
      await faceVerificationService.initialize();
      
      // Get camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      updateState({ isInitialized: true });
      return stream;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize camera';
      updateState({ error: errorMessage, isInitialized: false });
      return null;
    }
  }, [updateState]);

  const captureAndStoreFace = useCallback(async (): Promise<boolean> => {
    if (!videoRef.current || !user) {
      updateState({ error: 'Camera not ready or user not authenticated' });
      return false;
    }

    try {
      updateState({ isCapturing: true, error: null });
      
      const faceDescriptor = await faceVerificationService.captureAndStoreFace(
        videoRef.current,
        user.id
      );
      
      if (faceDescriptor) {
        await faceVerificationService.setupUserFaceVerification(user.id);
        updateState({ 
          isCapturing: false, 
          hasStoredFace: true,
          lastVerification: new Date()
        });
        return true;
      }
      
      updateState({ isCapturing: false, error: 'Failed to capture face' });
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Face capture failed';
      updateState({ isCapturing: false, error: errorMessage });
      return false;
    }
  }, [user, updateState]);

  const verifyFace = useCallback(async (): Promise<FaceVerificationResult> => {
    if (!videoRef.current || !user) {
      const result = { isMatch: false, confidence: 0, error: 'Camera not ready or user not authenticated' };
      updateState({ error: result.error });
      return result;
    }

    try {
      updateState({ isVerifying: true, error: null });
      
      const result = await faceVerificationService.verifyFace(
        videoRef.current,
        user.id
      );
      
      updateState({ 
        isVerifying: false,
        lastVerification: result.isMatch ? new Date() : state.lastVerification,
        error: result.error || null
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Face verification failed';
      const result = { isMatch: false, confidence: 0, error: errorMessage };
      updateState({ isVerifying: false, error: errorMessage });
      return result;
    }
  }, [user, updateState, state.lastVerification]);

  const enableFaceVerification = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.rpc('enable_face_verification', {
        p_user_id: user.id
      });
      
      if (error) {
        updateState({ error: error.message });
        return false;
      }
      
      updateState({ hasStoredFace: true });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to enable face verification';
      updateState({ error: errorMessage });
      return false;
    }
  }, [user, updateState]);

  const disableFaceVerification = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.rpc('disable_face_verification', {
        p_user_id: user.id
      });
      
      if (error) {
        updateState({ error: error.message });
        return false;
      }
      
      updateState({ hasStoredFace: false, lastVerification: null });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disable face verification';
      updateState({ error: errorMessage });
      return false;
    }
  }, [user, updateState]);

  const checkFaceVerificationStatus = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('requires_face_verification, face_data')
        .eq('id', user.id)
        .single();
      
      if (error) {
        updateState({ error: error.message });
        return false;
      }
      
      const hasStoredFace = data?.requires_face_verification && data?.face_data;
      updateState({ hasStoredFace });
      return hasStoredFace;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check face verification status';
      updateState({ error: errorMessage });
      return false;
    }
  }, [user, updateState]);

  const startRealTimeVerification = useCallback((onVerificationResult: (result: FaceVerificationResult) => void) => {
    if (verificationIntervalRef.current) {
      clearInterval(verificationIntervalRef.current);
    }
    
    verificationIntervalRef.current = setInterval(async () => {
      if (!state.isVerifying && videoRef.current && user) {
        const result = await verifyFace();
        onVerificationResult(result);
      }
    }, 5000); // Verify every 5 seconds
  }, [verifyFace, state.isVerifying, user]);

  const stopRealTimeVerification = useCallback(() => {
    if (verificationIntervalRef.current) {
      clearInterval(verificationIntervalRef.current);
      verificationIntervalRef.current = null;
    }
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    updateState({ isInitialized: false });
  }, [updateState]);

  return {
    state,
    initializeCamera,
    captureAndStoreFace,
    verifyFace,
    enableFaceVerification,
    disableFaceVerification,
    checkFaceVerificationStatus,
    startRealTimeVerification,
    stopRealTimeVerification,
    videoRef
  };
};

export default useFaceVerification;