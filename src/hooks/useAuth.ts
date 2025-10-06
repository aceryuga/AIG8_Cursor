import { useState, useEffect } from 'react';
import { User, LoginForm, SignupForm } from '../types/auth';
import { supabase } from '../lib/supabase';
import { triggerN8nWebhook } from '../lib/utils';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing user session on mount
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || '',
          phone: session.user.user_metadata?.phone || '',
          propertyCount: session.user.user_metadata?.property_count || 1,
          isVerified: session.user.email_confirmed_at !== null
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || '',
            phone: session.user.user_metadata?.phone || '',
            propertyCount: session.user.user_metadata?.property_count || 1,
            isVerified: session.user.email_confirmed_at !== null
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (credentials: LoginForm): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // Only proceed if email is confirmed
        if (authData.user.email_confirmed_at) {
          // Check if user exists in custom users table
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', authData.user.id)
            .single();
          if (checkError && checkError.code !== 'PGRST116') { // PGRST116: No rows found
            console.error('Error checking user in users table:', checkError);
          }
          if (!existingUser) {
            // Insert into custom users table
            console.log('Inserting user into users table after verified login:', {
              id: authData.user.id,
              name: authData.user.user_metadata?.full_name || '',
              email: authData.user.email,
              phone: authData.user.user_metadata?.phone || '',
              role: 'owner',
            });
            const { error: userTableError } = await supabase.from('users').insert({
              id: authData.user.id,
              name: authData.user.user_metadata?.full_name || '',
              email: authData.user.email,
              phone: authData.user.user_metadata?.phone || '',
              role: 'owner',
            });
            if (userTableError) {
              console.error('User table insert failed:', userTableError);
              setError(userTableError.message || 'Failed to create user profile');
              // Don't return false, allow login to proceed
            } else {
              console.log('User table insert success');
              // First verified login → send welcome message via n8n
              triggerN8nWebhook('user_verified', {
                id: authData.user.id,
                email: authData.user.email,
                name: authData.user.user_metadata?.full_name || '',
                phone: authData.user.user_metadata?.phone || '',
                verifiedAt: authData.user.email_confirmed_at,
              });
            }
          }
        }
        // User logged in successfully - the auth state change listener will update the user state
        return true;
      }

      throw new Error('Login failed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: SignupForm): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/#/auth/login`,
          data: {
            full_name: data.name,
            phone: data.phone,
            property_count: data.propertyCount
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // User created successfully, but do NOT insert into users table yet
        // Fire-and-forget webhook to n8n for post-signup automation
        triggerN8nWebhook('user_signup', {
          id: authData.user.id,
          email: data.email,
          name: data.name,
          phone: data.phone,
          propertyCount: data.propertyCount,
          createdAt: new Date().toISOString()
        });
        return true;
      }

      throw new Error('Failed to create user');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/new-password`
      });

      if (resetError) {
        throw resetError;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password reset failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
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