import { useState, useEffect } from 'react';
import { User, LoginForm, SignupForm } from '../types/auth';
import { supabase } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);

  // Check for existing user session on mount
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // console.log('Initial session check:', session?.user?.email);
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || '',
          phone: session.user.user_metadata?.phone || '',
          propertyCount: session.user.user_metadata?.property_count || 1,
          isVerified: session.user.email_confirmed_at !== null
        };
        // console.log('Setting initial user state:', userData);
        setUser(userData);
      }
      setLoading(false); // Set loading to false after initial check
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        // console.log('Auth state change:', event, session?.user?.email);
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || '',
            phone: session.user.user_metadata?.phone || '',
            propertyCount: session.user.user_metadata?.property_count || 1,
            isVerified: session.user.email_confirmed_at !== null
          };
          // console.log('Setting user state:', userData);
          setUser(userData);
        } else {
          // console.log('Clearing user state');
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
        // console.log('Login successful for user:', {
        //   id: authData.user.id,
        //   email: authData.user.email,
        //   email_confirmed_at: authData.user.email_confirmed_at,
        //   user_metadata: authData.user.user_metadata
        // });

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
          console.log('Inserting user into users table after login:', {
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
            // Don't block login for this error, just log it
          } else {
            console.log('User table insert success');
          }
        }
        
        // User logged in successfully - immediately set user state
        const userData = {
          id: authData.user.id,
          email: authData.user.email || '',
          name: authData.user.user_metadata?.full_name || '',
          phone: authData.user.user_metadata?.phone || '',
          propertyCount: authData.user.user_metadata?.property_count || 1,
          isVerified: authData.user.email_confirmed_at !== null
        };
        // console.log('Login successful - immediately setting user state:', userData);
        setUser(userData);
        
        // Wait a bit to ensure state is updated before returning
        await new Promise(resolve => setTimeout(resolve, 100));
        
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

  const updatePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (!user?.email) {
        throw new Error('User email not found');
      }

      // First, verify the current password by attempting to re-authenticate
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (reauthError) {
        throw new Error('Current password is incorrect');
      }

      // If re-authentication successful, update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password update failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Only call supabase.auth.signOut() - let the onAuthStateChange listener handle the state update
      await supabase.auth.signOut();
      // Remove manual setUser(null) to avoid conflicts with onAuthStateChange
    } catch (err) {
      console.error('Logout error:', err);
      // If signOut fails, manually clear the user state as fallback
      setUser(null);
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
    updatePassword,
    logout
  };
};