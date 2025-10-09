import React, { Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log error to database
    this.logErrorToDatabase(error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private async logErrorToDatabase(error: Error, errorInfo: ErrorInfo) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const errorLog = {
        user_id: user?.id || null,
        error_type: 'react_error',
        error_message: error.message,
        error_stack: error.stack,
        component_name: errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown',
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
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 text-center mb-4">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 p-4 bg-gray-100 rounded-md">
                <summary className="cursor-pointer font-medium text-gray-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for logging JavaScript errors
export const useErrorLogger = () => {
  const logError = async (error: Error, errorType: 'javascript_error' | 'api_error' = 'javascript_error') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const errorLog = {
        user_id: user?.id || null,
        error_type: errorType,
        error_message: error.message,
        error_stack: error.stack,
        component_name: 'JavaScript Error',
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

  return { logError };
};
