import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, Camera, Shield, Eye, UserCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FaceVerification from './FaceVerification';
import { useFaceVerification } from '../hooks/useFaceVerification';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  isEncrypted: boolean;
  requiresFaceVerification: boolean;
  isRead: boolean;
  senderApproval?: boolean;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [showFaceSetup, setShowFaceSetup] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null);
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [faceVerificationRequired, setFaceVerificationRequired] = useState(true);
  const [lastVerificationTime, setLastVerificationTime] = useState<Date | null>(null);
  const { user, verifyFace } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const faceVerification = useFaceVerification();

  const contacts = [
    { id: 'contact1', name: 'Alice Johnson', status: 'online', avatar: '👩‍💼' },
    { id: 'contact2', name: 'Bob Smith', status: 'away', avatar: '👨‍💻' },
    { id: 'contact3', name: 'Carol Davis', status: 'online', avatar: '👩‍🔬' }
  ];

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Check if user has face verification enabled
    if (user) {
      faceVerification.checkFaceVerificationStatus().then(hasStoredFace => {
        if (!hasStoredFace) {
          setShowFaceSetup(true);
        }
      });
    }
  }, [user, faceVerification]);

  useEffect(() => {
    // Start real-time face verification when chat is active
    if (selectedContact && faceVerification.state.hasStoredFace) {
      faceVerification.initializeCamera().then(() => {
        faceVerification.startRealTimeVerification((result) => {
          if (result.isMatch) {
            setLastVerificationTime(new Date());
            setFaceVerificationRequired(false);
          } else {
            setFaceVerificationRequired(true);
          }
        });
      });
    }

    return () => {
      faceVerification.stopRealTimeVerification();
    };
  }, [selectedContact, faceVerification]);

  useEffect(() => {
    // Simulate receiving encrypted messages
    const demoMessages: Message[] = [
      {
        id: '1',
        content: 'Hey! How are you doing?',
        sender: 'contact1',
        timestamp: new Date(Date.now() - 3600000),
        isEncrypted: true,
        requiresFaceVerification: true,
        isRead: false
      },
      {
        id: '2',
        content: 'The project documents are ready for review.',
        sender: 'contact2',
        timestamp: new Date(Date.now() - 1800000),
        isEncrypted: true,
        requiresFaceVerification: true,
        isRead: false
      }
    ];
    setMessages(demoMessages);
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedContact) return;

    // Check if face verification is required and valid
    if (faceVerificationRequired || !lastVerificationTime || 
        (Date.now() - lastVerificationTime.getTime()) > 300000) { // 5 minutes
      setShowFaceVerification(true);
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: user?.id || 'current-user',
      timestamp: new Date(),
      isEncrypted: true,
      requiresFaceVerification: true,
      isRead: false,
      senderApproval: true // Verified by face recognition
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');

    // Simulate notification to receiver
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Secure Message', {
        body: 'You have received a new encrypted message',
        icon: '/favicon.ico'
      });
    }
  };

  const handleMessageRead = (message: Message) => {
    if (message.requiresFaceVerification && !message.isRead) {
      setPendingMessage(message);
      setShowFaceVerification(true);
    }
  };

  const handleFaceVerificationSuccess = () => {
    setShowFaceVerification(false);
    setFaceVerificationRequired(false);
    setLastVerificationTime(new Date());
    
    if (pendingMessage) {
      // Mark message as read
      setMessages(prev => 
        prev.map(msg => 
          msg.id === pendingMessage.id 
            ? { ...msg, isRead: true, senderApproval: true }
            : msg
        )
      );
      setPendingMessage(null);
    }
    
    // Retry sending message if it was blocked
     if (inputMessage.trim()) {
       sendMessage();
     }
   };

   const handleFaceSetupSuccess = () => {
     setShowFaceSetup(false);
     faceVerification.checkFaceVerificationStatus();
   };

  const toggleLiveCamera = () => {
    setIsLiveCameraActive(!isLiveCameraActive);
  };

  const getContactName = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact?.name || 'Unknown';
  };

  const getContactAvatar = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact?.avatar || '👤';
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-gray-900 via-black to-gray-900 bg-mesh relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-pink-900/10"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      
      {/* Contacts Sidebar */}
      <div className="w-80 sidebar-glass relative z-10">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-6">Secure Contacts</h2>
          
          <div className="space-y-3">
            {contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact.id)}
                className={`contact-card-glass cursor-pointer transition-all duration-300 ${
                  selectedContact === contact.id
                    ? 'contact-card-active'
                    : 'hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="text-2xl">{contact.avatar}</div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${
                      contact.status === 'online' ? 'bg-green-400' : 'bg-yellow-400'
                    }`}></div>
                  </div>
                  <div>
                    <p className="font-semibold text-white">{contact.name}</p>
                    <p className="text-sm text-gray-400 capitalize">{contact.status}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="chat-header-glass p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{getContactAvatar(selectedContact)}</div>
                  <div>
                    <h3 className="font-bold text-white">{getContactName(selectedContact)}</h3>
                    <p className="text-sm text-gray-400 flex items-center">
                      <Shield className="w-3 h-3 mr-1" />
                      End-to-end encrypted
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleLiveCamera}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      isLiveCameraActive
                        ? 'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20'
                        : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  
                  {faceVerificationRequired && (
                    <div className="flex items-center space-x-1 text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs">Verification Required</span>
                    </div>
                  )}
                  
                  {lastVerificationTime && (
                    <div className="flex items-center space-x-1 text-green-400">
                      <UserCheck className="w-4 h-4" />
                      <span className="text-xs">
                        Verified {Math.floor((Date.now() - lastVerificationTime.getTime()) / 60000)}m ago
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.filter(msg => msg.sender === selectedContact || msg.sender === user?.id).map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`message-glass max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      message.sender === user?.id
                        ? 'ml-auto border-blue-400/30 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white'
                        : message.isRead
                        ? 'border-white/20 bg-white/10 text-white'
                        : 'bg-red-500/10 border border-red-500/20 text-red-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {message.isEncrypted && <Lock className="w-3 h-3" />}
                      {message.requiresFaceVerification && !message.isRead && (
                        <Eye className="w-3 h-3 text-yellow-400" />
                      )}
                    </div>
                    
                    {message.isRead || message.sender === user?.id ? (
                      <p className="text-sm">{message.content}</p>
                    ) : (
                      <div className="text-center">
                        <Lock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-xs text-gray-400 mb-2">Face verification required</p>
                        <button
                          onClick={() => handleMessageRead(message)}
                          className="btn-glass-success px-3 py-1 text-xs"
                        >
                          Verify & Read
                        </button>
                      </div>
                    )}
                    
                    <p className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="glass-card border-t border-white/10 p-6 relative z-10">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a secure message..."
                    className="input-glass w-full px-4 py-3 pr-12 text-white placeholder-gray-400"
                  />
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim()}
                  className="btn-glass-primary p-3 disabled:opacity-50 disabled:transform-none"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-white mb-2">Select a Contact</h3>
              <p className="text-gray-400">Choose someone to start a secure conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Face Verification Modal */}
      {showFaceVerification && (
        <FaceVerification
          mode="verify"
          onSuccess={handleFaceVerificationSuccess}
          onFailure={(error: string) => {
             console.error('Face verification failed:', error);
             setShowFaceVerification(false);
           }}
          onCancel={() => setShowFaceVerification(false)}
        />
      )}
      
      {showFaceSetup && (
        <FaceVerification
          mode="setup"
          onSuccess={handleFaceSetupSuccess}
          onFailure={(error: string) => {
             console.error('Face setup failed:', error);
             setShowFaceSetup(false);
           }}
          onCancel={() => setShowFaceSetup(false)}
        />
      )}

      {/* Live Camera Feed Modal */}
      {isLiveCameraActive && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6 max-w-md w-full mx-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-white mb-2">Live Camera Feed</h3>
              <p className="text-gray-400 text-sm">Sharing camera with {getContactName(selectedContact)}</p>
            </div>
            
            <div className="bg-black rounded-lg h-64 mb-4 flex items-center justify-center">
              <Camera className="w-16 h-16 text-gray-400" />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={toggleLiveCamera}
                className="flex-1 btn-glass-danger py-2 px-4"
              >
                Stop Sharing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;