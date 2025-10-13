/**
 * Global error handler for unhandled JavaScript errors
 */

import { supabase } from '../lib/supabase';

interface ErrorLog {
  user_id: string | null;
  error_type: 'javascript_error' | 'api_error';
  error_message: string;
  error_stack: string | undefined;
  component_name: string;
  url: string;
  user_agent: string;
  timestamp: string;
  resolved: boolean;
}

/**
 * Log error to the error_logs table
 */
export const logErrorToDatabase = async (error: Error, errorType: 'javascript_error' | 'api_error' = 'javascript_error', componentName: string = 'Global Error Handler') => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const errorLog: ErrorLog = {
      user_id: user?.id || null,
      error_type: errorType,
      error_message: error.message,
      error_stack: error.stack,
      component_name: componentName,
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    const { error: dbError } = await supabase
      .from('error_logs')
      .insert(errorLog);

    if (dbError) {
      console.error('Failed to log error to database:', dbError);
    } else {
      console.log('Error logged to database successfully');
    }
  } catch (logError) {
    console.error('Error logging to database:', logError);
  }
};

/**
 * Initialize global error handlers
 */
export const initializeErrorHandlers = () => {
  // Handle unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Unhandled JavaScript error:', event.error);
    logErrorToDatabase(event.error, 'javascript_error', 'Global JavaScript Error');
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Convert promise rejection to Error object if it's not already
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    logErrorToDatabase(error, 'javascript_error', 'Unhandled Promise Rejection');
  });

  console.log('Global error handlers initialized');
};

/**
 * API error handler for Supabase and other API calls
 */
export const handleApiError = async (error: any, context: string = 'API Call') => {
  console.error(`API Error in ${context}:`, error);
  
  // Convert to Error object if it's not already
  const errorObj = error instanceof Error 
    ? error 
    : new Error(error?.message || String(error));
  
  await logErrorToDatabase(errorObj, 'api_error', context);
};
