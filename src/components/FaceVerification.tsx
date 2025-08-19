import React, { useState } from 'react';
import { faceVerificationService, FaceVerificationResult } from '../utils/faceVerification';
import { useAuth } from '../contexts/AuthContext';
import FaceCapture from './FaceCapture';

interface FaceVerificationProps {
  mode: 'setup' | 'verify';
  onSuccess?: () => void;
  onFailure?: (error: string) => void;
  onCancel?: () => void;
}

export const FaceVerification: React.FC<FaceVerificationProps> = ({
  mode,
  onSuccess,
  onFailure,
  onCancel
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();



  const handleCapture = async (imageData: string) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (mode === 'setup') {
        // Convert base64 to blob and create video element for processing
        const img = new Image();
        img.src = imageData;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        
        // Create a temporary video element for face detection
        const video = document.createElement('video');
        video.width = canvas.width;
        video.height = canvas.height;
        
        // Use face detection on the canvas to get descriptor
        const detections = await faceVerificationService.detectFace(canvas as any);
        if (!detections || detections.length === 0) {
          throw new Error('No face detected in captured image');
        }
        if (detections.length > 1) {
          throw new Error('Multiple faces detected. Please ensure only one face is visible.');
        }
        
        const descriptor = detections[0].descriptor;
        
        // Create face descriptor object
        const faceDescriptor = {
          id: crypto.randomUUID(),
          userId: user.id,
          descriptor: descriptor,
          timestamp: new Date()
        };
        
        // Store using the captureAndStoreFace method with a temporary video element
        const tempVideo = document.createElement('video');
        tempVideo.width = canvas.width;
        tempVideo.height = canvas.height;
        
        const storedDescriptor = await faceVerificationService.captureAndStoreFace(tempVideo, user.id);
        if (storedDescriptor) {
          await faceVerificationService.setupUserFaceVerification(user.id);
          onSuccess?.();
        }
      } else {
        // Convert base64 to canvas for verification
        const img = new Image();
        img.src = imageData;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        
        // Create a temporary video element for verification
        const tempVideo = document.createElement('video');
        tempVideo.width = canvas.width;
        tempVideo.height = canvas.height;
        
        // Verify using the existing verifyFace method
        const result: FaceVerificationResult = await faceVerificationService.verifyFace(
          tempVideo,
          user.id
        );
        
        if (result.isMatch) {
          onSuccess?.();
        } else {
          const errorMsg = result.error || `Face verification failed (confidence: ${(result.confidence * 100).toFixed(1)}%)`;
          setError(errorMsg);
          onFailure?.(errorMsg);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Face verification failed';
      setError(errorMessage);
      onFailure?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    onFailure?.(errorMessage);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'setup' ? 'Set Up Face Verification' : 'Verify Your Identity'}
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            {mode === 'setup'
              ? 'Position your face in the camera and click capture to set up face verification'
              : 'Look at the camera to verify your identity before accessing chat'
            }
          </p>
        </div>

        <div className="mb-4">
          <FaceCapture
            onCapture={handleCapture}
            isLoading={isLoading}
            enableRealTimeDetection={true}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>Your face data is encrypted and stored securely.</p>
          <p>This verification helps protect your account and conversations.</p>
        </div>
      </div>
    </div>
  );
};

export default FaceVerification;