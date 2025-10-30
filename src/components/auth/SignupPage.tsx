import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Building, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Input } from '../webapp-ui/Input';
import { Button } from '../webapp-ui/Button';
import { PasswordStrength } from '../webapp-ui/PasswordStrength';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePhone, validatePassword } from '../../utils/validation';
import { sanitizeText, sanitizeEmail, sanitizePhone } from '../../utils/security';
import { SignupForm } from '../../types/auth';

export const SignupPage: React.FC = () => {
  const [form, setForm] = useState<SignupForm>({
    name: '',
    email: '',
    phone: '',
    propertyCount: 1,
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState(validatePassword(''));
  
  const { loading, error, signup } = useAuth();
  const navigate = useNavigate();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (form.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!form.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!form.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(form.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (form.propertyCount < 1 || form.propertyCount > 15) {
      newErrors.propertyCount = 'Property count must be between 1 and 15';
    }

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

  // ✅ FIXED - Trigger Welcome Email via n8n Webhook (Simpler data structure)
  const triggerWelcomeEmail = async (email: string, name: string, userId: string) => {
    try {
      const response = await fetch('https://primary-production-e3df.up.railway.app/webhook/propertypro-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          email: email,
          userId: userId
        })
      });
      
      if (response.ok) {
        console.log('✅ Welcome email triggered successfully!');
      } else {
        console.log('⚠️ Welcome email API responded with status:', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to trigger welcome email:', error);
      // Don't block signup if email fails
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize form data before validation and submission
    const sanitizedForm = {
      ...form,
      name: sanitizeText(form.name),
      email: sanitizeEmail(form.email),
      phone: sanitizePhone(form.phone),
      propertyCount: form.propertyCount // Numbers don't need sanitization
    };
    
    // Update form with sanitized data
    setForm(sanitizedForm);
    
    if (!validate()) return;

    const success = await signup(sanitizedForm);
    if (success) {
      // ✅ Trigger welcome email via n8n webhook
      triggerWelcomeEmail(
        sanitizedForm.email,
        sanitizedForm.name,
        'new-user'
      );
      
      navigate('/auth/verify', { state: { email: sanitizedForm.email } });
    }
  };

  const handleChange = (field: keyof SignupForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = field === 'propertyCount' ? parseInt(e.target.value) : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    
    if (field === 'password') {
      setPasswordStrength(validatePassword(value as string));
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join PropertyPro to manage your properties"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg glass-error text-sm">
            {error}
          </div>
        )}

        <Input
          label="Full Name"
          type="text"
          value={form.name}
          onChange={handleChange('name')}
          error={errors.name}
          icon={<User size={18} />}
          placeholder="Enter your full name"
        />

        <Input
          label="Email Address"
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          error={errors.email}
          icon={<Mail size={18} />}
          placeholder="Enter your email"
        />

        <Input
          label="Phone Number"
          type="tel"
          value={form.phone}
          onChange={handleChange('phone')}
          error={errors.phone}
          icon={<Phone size={18} />}
          placeholder="+91 9876543210"
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Number of Properties
          </label>
          <div className="relative">
            <Building size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-glass-muted" />
            <select
              value={form.propertyCount}
              onChange={handleChange('propertyCount')}
              className={`
                w-full h-11 pl-10 pr-3 rounded-lg glass-input text-glass
                transition-all duration-200
                ${errors.propertyCount 
                  ? 'border-red-400 focus:border-red-300' 
                  : 'focus:border-white'
                }
                focus:outline-none
              `}
            >
              {[...Array(15)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} {i === 0 ? 'Property' : 'Properties'}
                </option>
              ))}
            </select>
          </div>
          {errors.propertyCount && (
            <p className="text-sm text-red-300">{errors.propertyCount}</p>
          )}
        </div>

        <div className="space-y-2">
          <Input
            label="Password"
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
            label="Confirm Password"
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
          Create Account
        </Button>

        <div className="text-center">
          <span className="text-glass-muted">Already have an account? </span>
          <Link
            to="/auth/login"
            className="text-green-800 hover:text-green-900 font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
