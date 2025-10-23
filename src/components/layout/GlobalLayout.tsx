import React from 'react';

interface GlobalLayoutProps {
  children: React.ReactNode;
}

export const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
};
