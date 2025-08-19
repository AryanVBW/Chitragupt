import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, Loader } from 'lucide-react';

interface FaceCaptureProps {
  onCapture: (faceData: string) => void;
  isLoading?: boolean;
}

const FaceCapture: React.FC<FaceCaptureProps> = ({ onCapture, isLoading = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [detectionActive, setDetectionActive] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

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

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    setDetectionActive(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      // Simulate face detection processing
      setTimeout(() => {
        const imageData = canvas.toDataURL('image/jpeg', 0.3); // Compress for storage
        onCapture(imageData);
        setDetectionActive(false);
        stopCamera();
      }, 2000);
    }
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
            
            {/* Face detection overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-48 h-48 border-2 rounded-lg transition-all duration-300 ${
                detectionActive ? 'border-green-400 shadow-lg shadow-green-400/50' : 'border-blue-400'
              }`}>
                <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-current"></div>
                <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-current"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-current"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-current"></div>
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
        <div className="text-center">
          <button
            onClick={captureFrame}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:transform-none"
          >
            <Camera className="w-5 h-5" />
            <span>{isLoading ? 'Processing...' : 'Capture Face'}</span>
          </button>
          <p className="text-gray-400 text-sm mt-2">
            Position your face within the frame and click capture
          </p>
        </div>
      )}
    </div>
  );
};

export default FaceCapture;