import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Input } from '../webapp-ui/Input';
import { Button } from '../webapp-ui/Button';
import { PasswordStrength } from '../webapp-ui/PasswordStrength';
import { validatePassword } from '../../utils/validation';
import { NewPasswordForm } from '../../types/auth';

export const NewPasswordPage: React.FC = () => {
  const [form, setForm] = useState<NewPasswordForm>({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState(validatePassword(''));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordStrength.isValid) {
      newErrors.password = 'Password does not meet requirements';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLoading(false);
    setSuccess(true);
    
    // Redirect after success
    setTimeout(() => {
      navigate('/auth/login');
    }, 2000);
  };

  const handleChange = (field: keyof NewPasswordForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    
    if (field === 'password') {
      setPasswordStrength(validatePassword(value));
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Password Updated!"
        subtitle="Your password has been successfully changed"
      >
        <div className="text-center space-y-6">
          <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto glow">
            <CheckCircle className="w-8 h-8 text-green-800" />
          </div>
          
          <p className="text-glass-muted">
            Redirecting you to login page...
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create New Password"
      subtitle="Choose a strong password for your account"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            icon={<Lock size={18} />}
            placeholder="Create a strong password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-11 text-glass-muted hover:text-glass transition-colors"
            style={{ position: 'relative', top: '-40px', right: '12px', float: 'right' }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          
          {form.password && (
            <PasswordStrength strength={passwordStrength} />
          )}
        </div>

        <div className="space-y-2">
          <Input
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={errors.confirmPassword}
            icon={<Lock size={18} />}
            placeholder="Confirm your password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-11 text-glass-muted hover:text-glass transition-colors"
            style={{ position: 'relative', top: '-40px', right: '12px', float: 'right' }}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={loading}
        >
          Update Password
        </Button>
      </form>
    </AuthLayout>
  );
};