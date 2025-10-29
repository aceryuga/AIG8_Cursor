import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8', 
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  // Using your actual logo from GitHub
  const logoUrl = 'https://raw.githubusercontent.com/aceryuga/AIG8_Cursor/refs/heads/main/newlogo.jpeg';
  
  return (
    <img 
      src={logoUrl}
      alt="PropertyPro Logo"
      className={`${sizeClasses[size]} ${className}`}
      onError={(e) => {
        // Fallback to a simple div if image fails to load
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = `${sizeClasses[size]} bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xs`;
        fallback.textContent = 'PP';
        target.parentNode?.insertBefore(fallback, target);
      }}
    />
  );
};
