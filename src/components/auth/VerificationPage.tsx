import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mail, CheckCircle, Clock } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '../webapp-ui/Button';
import { maskEmail } from '../../utils/validation';

export const VerificationPage: React.FC = () => {
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || 'user@example.com';

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    setResending(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setResending(false);
    setResendCooldown(60);
  };

  const handleVerifyDemo = () => {
    setVerified(true);
    setTimeout(() => {
      navigate('/auth/login');
    }, 2000);
  };

  if (verified) {
    return (
      <AuthLayout
        title="Email Verified!"
        subtitle="Your account has been successfully verified"
      >
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <p className="text-gray-600">
            Redirecting you to login page...
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle="We've sent a verification link to your email"
    >
      <div className="text-center space-y-6">
        <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto glow">
          <Mail className="w-8 h-8 text-green-800" />
        </div>

        <div className="space-y-2">
          <p className="text-glass-muted">
            We've sent a verification email to:
          </p>
          <p className="font-medium text-glass">
            {maskEmail(email)}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-glass-muted">
            Click the link in the email to verify your account. 
            If you don't see the email, check your spam folder.
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={handleResend}
              variant="outline"
              className="w-full"
              loading={resending}
              disabled={resendCooldown > 0}
            >
              {resendCooldown > 0 ? (
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  Resend in {resendCooldown}s
                </div>
              ) : (
                'Resend Email'
              )}
            </Button>
            
            <Button
              onClick={handleVerifyDemo}
              variant="primary"
              className="w-full"
            >
              Simulate Verification (Demo)
            </Button>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <p className="text-sm text-glass-muted">
            Need to use a different email address?
          </p>
          <Link
            to="/auth/signup"
            className="text-sm text-green-800 hover:text-green-900 font-medium"
          >
            Change Email Address
          </Link>
        </div>

        <div className="text-center">
          <Link
            to="/auth/login"
            className="text-sm text-glass-muted hover:text-glass"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};