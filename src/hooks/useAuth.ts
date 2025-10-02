import { useState } from 'react';
import { useEffect } from 'react';
import { User, LoginForm, SignupForm } from '../types/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('propertypro_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        localStorage.removeItem('propertypro_user');
      }
    }
  }, []);

  const login = async (credentials: LoginForm): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Demo login check
      if (credentials.email === 'rajesh.kumar@example.com' && credentials.password === 'Demo123!') {
        const demoUser: User = {
          id: '1',
          name: 'Rajesh Kumar',
          email: 'rajesh.kumar@example.com',
          phone: '+91 9876543210',
          propertyCount: 5,
          isVerified: true
        };
        setUser(demoUser);
        localStorage.setItem('propertypro_user', JSON.stringify(demoUser));
        return true;
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: SignupForm): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('propertypro_user');
  };

  return {
    user,
    loading,
    error,
    login,
    signup,
    resetPassword,
    logout
  };
};