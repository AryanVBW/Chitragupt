import React, { useState } from 'react';
import { X, Shield, CheckCircle } from 'lucide-react';
import FaceCapture from './FaceCapture';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  isEncrypted: boolean;
  requiresFaceVerification: boolean;
  isRead: boolean;
}

interface FaceVerificationModalProps {
  message: Message;
  onSuccess: (faceData: string) => void;
  onClose: () => void;
}

const FaceVerificationModal: React.FC<FaceVerificationModalProps> = ({
  message,
  onSuccess,
  onClose
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'capture' | 'pending' | 'success'>('capture');

  const handleFaceCapture = async (faceData: string) => {
    setIsVerifying(true);
    setVerificationStep('pending');

    // Simulate server verification process
    setTimeout(() => {
      setVerificationStep('success');
      setTimeout(() => {
        onSuccess(faceData);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Face Verification</h3>
              <p className="text-gray-400 text-sm">Required to read message</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors duration-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {verificationStep === 'capture' && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <p className="text-white text-sm font-medium">Message Preview</p>
              </div>
              <p className="text-gray-400 text-sm truncate">
                Encrypted message from sender
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {message.timestamp.toLocaleString()}
              </p>
            </div>

            <FaceCapture
              onCapture={handleFaceCapture}
              isLoading={isVerifying}
            />

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                🔒 Your face verification will be sent to the message sender for approval before you can read the message.
              </p>
            </div>
          </div>
        )}

        {verificationStep === 'pending' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-blue-400 animate-pulse" />
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Verifying Identity</h4>
              <p className="text-gray-400 text-sm mb-4">
                Processing your face verification and sending to message sender for approval...
              </p>
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        {verificationStep === 'success' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Verification Approved!</h4>
              <p className="text-gray-400 text-sm">
                The sender has approved your identity. You can now read the message.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceVerificationModal;