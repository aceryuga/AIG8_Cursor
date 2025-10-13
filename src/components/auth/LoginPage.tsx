import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Input } from '../webapp-ui/Input';
import { Button } from '../webapp-ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail } from '../../utils/validation';
import { sanitizeEmail } from '../../utils/security';
import { LoginForm } from '../../types/auth';

export const LoginPage: React.FC = () => {
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { loading, error, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDemoLogin = () => {
    setForm({
      email: 'rajesh.kumar@example.com',
      password: 'Demo123!',
      rememberMe: false
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize email before validation and submission
    const sanitizedForm = {
      ...form,
      email: sanitizeEmail(form.email)
    };
    
    // Update form with sanitized email
    setForm(sanitizedForm);
    
    if (!validate()) return;

    const success = await login(sanitizedForm);
    if (success) {
      // Check if this is a first-time user (you can implement this logic based on your needs)
      //const isFirstTime = !localStorage.getItem('propertypro_onboarded');
      //if (isFirstTime) {
       // navigate('/onboarding');
      //} else {
      
      // Redirect to the intended destination or dashboard
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
      //}
    }
  };

  const handleChange = (field: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your PropertyPro account"
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
          value={form.email}
          onChange={handleChange('email')}
          error={errors.email}
          icon={<Mail size={18} />}
          placeholder="Enter your email"
        />

        <div className="space-y-2">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            icon={<Lock size={18} />}
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-11 text-glass-muted hover:text-glass transition-colors"
            style={{ position: 'relative', top: '-40px', right: '12px', float: 'right' }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.rememberMe}
              onChange={handleChange('rememberMe')}
              className="rounded border-white border-opacity-30 bg-white bg-opacity-10 text-green-400 focus:ring-green-400 focus:ring-2"
            />
            <span className="text-sm text-glass-muted">Remember me</span>
          </label>
          
          <Link
            to="/auth/reset"
            className="text-sm text-green-800 hover:text-green-900 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Display authentication errors */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={loading}
          >
            Sign In
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleDemoLogin}
          >
            Try Demo Login
          </Button>
        </div>

        <div className="text-center">
          <span className="text-glass-muted">Don't have an account? </span>
          <Link
            to="/auth/signup"
            className="text-green-800 hover:text-green-900 font-medium transition-colors"
          >
            Sign up
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};