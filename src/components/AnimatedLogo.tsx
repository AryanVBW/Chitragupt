import React from 'react';

interface AnimatedLogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  rotationType?: '3d' | 'continuous' | 'both';
}

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ size = 'medium', className = '', rotationType = 'both' }) => {
  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-24 h-24'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* 3D Container */}
      <div className="logo-3d-container w-full h-full">
        {/* Main logo with 3D effects */}
        <div className={`logo-3d-wrapper relative w-full h-full ${
          rotationType === '3d' ? 'logo-3d-only' :
          rotationType === 'continuous' ? 'logo-continuous-only' :
          'logo-both-animations'
        }`}>
          <img
            src="/logo.png"
            alt="Chitragupt Logo"
            className="logo-3d w-full h-full object-contain"
          />
          
          {/* Glow effect layers */}
          <div className="absolute inset-0 logo-glow-1 opacity-30"></div>
          <div className="absolute inset-0 logo-glow-2 opacity-20"></div>
          <div className="absolute inset-0 logo-glow-3 opacity-10"></div>
        </div>
      </div>
      
      {/* Floating particles around logo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="particle particle-4"></div>
      </div>
    </div>
  );
};

export default AnimatedLogo;