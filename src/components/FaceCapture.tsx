import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Loader, CheckCircle, AlertTriangle } from 'lucide-react';
import { faceVerificationService } from '../utils/faceVerification';

interface FaceCaptureProps {
  onCapture: (faceData: string) => void;
  isLoading?: boolean;
  enableRealTimeDetection?: boolean;
}

interface FaceDetectionState {
  faceCount: number;
  confidence: number;
  isDetecting: boolean;
  lastDetection: Date | null;
}

const FaceCapture: React.FC<FaceCaptureProps> = ({ 
  onCapture, 
  isLoading = false, 
  enableRealTimeDetection = true 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [detectionActive, setDetectionActive] = useState(false);
  const [faceDetectionState, setFaceDetectionState] = useState<FaceDetectionState>({
    faceCount: 0,
    confidence: 0,
    isDetecting: false,
    lastDetection: null
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeAndStartCamera();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isStreaming && enableRealTimeDetection && isInitialized) {
      startRealTimeDetection();
    } else {
      stopRealTimeDetection();
    }
    
    return () => {
      stopRealTimeDetection();
    };
  }, [isStreaming, enableRealTimeDetection, isInitialized]);

  const initializeAndStartCamera = async (retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      setError('');
      setIsStreaming(false);
      
      // Initialize face verification service with retry logic
      try {
        await faceVerificationService.initialize();
        setIsInitialized(true);
      } catch (initError) {
        console.error('Face verification service initialization failed:', initError);
        if (retryCount < maxRetries) {
          console.log(`Retrying initialization (${retryCount + 1}/${maxRetries})...`);
          setTimeout(() => initializeAndStartCamera(retryCount + 1), 2000);
          return;
        }
        throw new Error('Failed to initialize face detection models. Please refresh the page.');
      }
      
      // Get camera access with fallback options
      let stream: MediaStream;
      try {
        // Try high quality first
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });
      } catch (highQualityError) {
        console.warn('High quality camera access failed, trying lower quality:', highQualityError);
        try {
          // Fallback to lower quality
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 320 },
              height: { ideal: 240 },
              facingMode: 'user'
            }
          });
        } catch (lowQualityError) {
          console.warn('Low quality camera access failed, trying basic:', lowQualityError);
          // Final fallback - basic video
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsStreaming(true);
        };
        
        // Add error handling for video element
        videoRef.current.onerror = (e) => {
          console.error('Video element error:', e);
          setError('Video playback error. Please try again.');
          setIsStreaming(false);
        };
      }
    } catch (err) {
      console.error('Camera initialization failed:', err);
      
      let errorMessage = 'Failed to access camera.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera permissions and refresh the page.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please connect a camera and try again.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is being used by another application. Please close other apps and try again.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera constraints not supported. Trying with basic settings...';
          if (retryCount < maxRetries) {
            setTimeout(() => initializeAndStartCamera(retryCount + 1), 1000);
            return;
          }
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setIsInitialized(false);
    }
  };

  const startRealTimeDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;

    detectionIntervalRef.current = setInterval(async () => {
      if (videoRef.current && isStreaming && !detectionActive) {
        try {
          setFaceDetectionState(prev => ({ ...prev, isDetecting: true }));
          
          const detections = await faceVerificationService.detectFaceRealTime(
            videoRef.current,
            (detections) => {
              const faceCount = detections.length;
              const confidence = detections.length > 0 ? detections[0].detection.score : 0;
              
              setFaceDetectionState({
                faceCount,
                confidence,
                isDetecting: false,
                lastDetection: new Date()
              });
            }
          );
          
          // Reset error counter on successful detection
          consecutiveErrors = 0;
        } catch (error) {
          consecutiveErrors++;
          console.error(`Real-time detection error (${consecutiveErrors}/${maxConsecutiveErrors}):`, error);
          
          setFaceDetectionState(prev => ({
            ...prev,
            isDetecting: false,
            faceCount: 0,
            confidence: 0
          }));
          
          // If too many consecutive errors, stop detection and show error
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.error('Too many consecutive detection errors, stopping real-time detection');
            stopRealTimeDetection();
            setError('Face detection temporarily unavailable. Please try capturing manually.');
            
            // Attempt to reinitialize after a delay
            setTimeout(async () => {
              try {
                await faceVerificationService.initialize();
                if (isStreaming && enableRealTimeDetection) {
                  startRealTimeDetection();
                  setError('');
                }
              } catch (reinitError) {
                console.error('Failed to reinitialize face detection:', reinitError);
              }
            }, 5000);
          }
        }
      }
    }, 1000); // Check every second
  }, [isStreaming, detectionActive, enableRealTimeDetection]);

  const stopRealTimeDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  const cleanup = () => {
    stopRealTimeDetection();
    stopCamera();
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError('');
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming || !isInitialized) return;

    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptCapture = async (): Promise<void> => {
      try {
        setDetectionActive(true);
        setError('');
        
        // Stop real-time detection during capture
        if (enableRealTimeDetection) {
          stopRealTimeDetection();
        }
        
        // Verify video is still streaming
        if (!videoRef.current || videoRef.current.readyState < 2) {
          throw new Error('Video stream not ready');
        }
        
        // Perform high-quality face detection with timeout
        const detectionPromise = faceVerificationService.detectFace(videoRef.current, {
          inputSize: 512,
          scoreThreshold: 0.4
        });
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Detection timeout')), 10000);
        });
        
        const detections = await Promise.race([detectionPromise, timeoutPromise]);
        
        if (detections.length === 0) {
          throw new Error('No face detected. Please position your face clearly in the frame.');
        }
        
        if (detections.length > 1) {
          throw new Error('Multiple faces detected. Please ensure only one face is visible.');
        }
        
        // Verify detection quality
        const detection = detections[0];
        if (detection.detection.score < 0.4) {
          throw new Error('Face detection quality too low. Please improve lighting and face positioning.');
        }
        
        // Small delay for better user experience
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Capture the frame
         const canvas = canvasRef.current;
         const video = videoRef.current;
         
         if (!canvas) {
           throw new Error('Canvas not available');
         }
         
         const ctx = canvas.getContext('2d');
         
         if (!ctx) {
           throw new Error('Canvas context not available');
         }
         
         canvas.width = video.videoWidth;
         canvas.height = video.videoHeight;
         ctx.drawImage(video, 0, 0);
         
         const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Verify image data
        if (!imageData || imageData.length < 1000) {
          throw new Error('Invalid image data captured');
        }
        
        // Add a small delay for user feedback
        setTimeout(() => {
          onCapture(imageData);
          setDetectionActive(false);
          cleanup();
        }, 1000);
      } catch (error) {
        console.error(`Capture attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          setError(`Capture failed, retrying... (${retryCount}/${maxRetries})`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if we need to reinitialize camera
          if (error instanceof Error && error.message.includes('Video stream not ready')) {
            try {
              await initializeAndStartCamera();
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for stream to stabilize
            } catch (reinitError) {
              console.error('Failed to reinitialize camera:', reinitError);
            }
          }
          
          return attemptCapture();
        } else {
          // All retries failed
          const errorMessage = error instanceof Error ? error.message : 'Failed to capture image after multiple attempts.';
          setError(errorMessage + ' Please check your camera and try again.');
          setDetectionActive(false);
          if (enableRealTimeDetection) startRealTimeDetection();
        }
      }
    };
    
    await attemptCapture();
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-black/30 rounded-lg overflow-hidden border border-white/10">
        {isStreaming ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
            
            {/* Enhanced face detection overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-48 h-48 border-2 rounded-lg transition-all duration-300 ${
                detectionActive 
                  ? 'border-green-400 shadow-lg shadow-green-400/50' 
                  : faceDetectionState.faceCount === 1 
                    ? 'border-green-400 shadow-md shadow-green-400/30'
                    : faceDetectionState.faceCount > 1
                      ? 'border-yellow-400 shadow-md shadow-yellow-400/30'
                      : 'border-blue-400'
              }`}>
                <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-current"></div>
                <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-current"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-current"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-current"></div>
                
                {/* Real-time detection status */}
                {enableRealTimeDetection && !detectionActive && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
                    {faceDetectionState.faceCount === 1 ? (
                      <div className="flex items-center space-x-1 bg-green-500/20 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-green-400">Face detected</span>
                      </div>
                    ) : faceDetectionState.faceCount > 1 ? (
                      <div className="flex items-center space-x-1 bg-yellow-500/20 px-2 py-1 rounded-full">
                        <AlertTriangle className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-yellow-400">{faceDetectionState.faceCount} faces</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 bg-blue-500/20 px-2 py-1 rounded-full">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-blue-400">Looking for face...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {detectionActive && (
              <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                <div className="bg-black/50 rounded-lg p-4 text-center">
                  <Loader className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                  <p className="text-white text-sm">Analyzing face...</p>
                </div>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <CameraOff className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={startCamera}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors duration-300"
              >
                Retry Camera
              </button>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <Loader className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {isStreaming && !detectionActive && (
        <div className="text-center space-y-3">
          {/* Face detection status info */}
          {enableRealTimeDetection && (
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  faceDetectionState.faceCount === 1 ? 'bg-green-400' : 'bg-gray-400'
                }`}></div>
                <span className="text-gray-300">Face: {faceDetectionState.faceCount === 1 ? 'Ready' : 'Not detected'}</span>
              </div>
              {faceDetectionState.confidence > 0 && (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    faceDetectionState.confidence > 0.7 ? 'bg-green-400' : 
                    faceDetectionState.confidence > 0.5 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-gray-300">Quality: {(faceDetectionState.confidence * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={captureFrame}
            disabled={isLoading || !isInitialized || (enableRealTimeDetection && faceDetectionState.faceCount !== 1)}
            className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transform transition-all duration-300 shadow-lg ${
              isLoading || !isInitialized || (enableRealTimeDetection && faceDetectionState.faceCount !== 1)
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-blue-500/25'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>
              {isLoading ? 'Processing...' : 
               !isInitialized ? 'Initializing...' :
               enableRealTimeDetection && faceDetectionState.faceCount === 0 ? 'Position your face' :
               enableRealTimeDetection && faceDetectionState.faceCount > 1 ? 'Multiple faces detected' :
               'Capture Face'}
            </span>
          </button>
          
          <p className="text-gray-400 text-sm">
            {enableRealTimeDetection 
              ? 'Position your face clearly in the frame. The button will activate when ready.'
              : 'Position your face within the frame and click capture'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default FaceCapture;