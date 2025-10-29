import React from 'react';
import { Logo } from '../ui/Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden floating-orbs">
      <div className="w-full max-w-md relative z-10">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 glass rounded-2xl mb-4 glow">
            <Logo size="lg" className="text-green-800" />
          </div>
          <h1 className="text-2xl font-bold text-glass mb-2">PropertyPro</h1>
          <p className="text-glass-muted">Professional Property Management</p>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-2xl p-8 backdrop-blur-xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-glass mb-2">{title}</h2>
            <p className="text-glass-muted">{subtitle}</p>
          </div>
          
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-glass-muted">
          © 2025 PropertyPro. All rights reserved.
        </div>
      </div>
    </div>
  );
};