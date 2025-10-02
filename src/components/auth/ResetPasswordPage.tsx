import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Input } from '../webapp-ui/Input';
import { Button } from '../webapp-ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail } from '../../utils/validation';

export const ResetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { loading, error, resetPassword } = useAuth();
  const navigate = useNavigate();

  const validate = (): boolean => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await resetPassword(email);
    if (result) {
      setSuccess(true);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  if (success) {
    return (
      <AuthLayout
        title="Check Your Email"
        subtitle="We've sent password reset instructions"
      >
        <div className="text-center space-y-6">
          <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto glow">
            <Mail className="w-8 h-8 text-green-800" />
          </div>
          
          <div className="space-y-2">
            <p className="text-glass-muted">
              We've sent password reset instructions to:
            </p>
            <p className="font-medium text-glass">{email}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-glass-muted">
              Follow the link in the email to reset your password. 
              The link will expire in 24 hours.
            </p>
            
            <Button
              onClick={() => navigate('/auth/new-password')}
              className="w-full"
            >
              Continue to New Password (Demo)
            </Button>
          </div>

          <div className="text-center">
            <Link
              to="/auth/login"
              className="text-sm text-glass-muted hover:text-glass inline-flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your email to receive reset instructions"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg glass-error text-sm">
            {error}
          </div>
        )}

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={handleEmailChange}
          error={emailError}
          icon={<Mail size={18} />}
          placeholder="Enter your email"
        />

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={loading}
        >
          Send Reset Link
        </Button>

        <div className="text-center">
          <Link
            to="/auth/login"
            className="text-sm text-glass-muted hover:text-glass inline-flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};