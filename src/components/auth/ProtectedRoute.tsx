import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { checkTrialStatus } from '../../utils/usageLimits';
import { TrialExpiredBlock } from './TrialExpiredBlock';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [trialStatus, setTrialStatus] = useState<{
    isTrialUser: boolean;
    isExpired: boolean;
    daysRemaining?: number;
  } | null>(null);
  const [checkingTrial, setCheckingTrial] = useState(false);

  // Check trial status when user is authenticated
  useEffect(() => {
    const checkTrial = async () => {
      if (user?.id && !loading) {
        setCheckingTrial(true);
        try {
          const status = await checkTrialStatus(user.id);
          setTrialStatus(status);
        } catch (error) {
          console.error('Error checking trial status:', error);
          setTrialStatus({ isTrialUser: false, isExpired: false });
        } finally {
          setCheckingTrial(false);
        }
      }
    };

    checkTrial();
  }, [user?.id, loading]);

  // Show loading state while checking authentication or trial status
  if (loading || checkingTrial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login page
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // If user is on trial and trial has expired, show trial expired block
  if (trialStatus?.isTrialUser && trialStatus?.isExpired) {
    return (
      <TrialExpiredBlock
        onUpgrade={() => {
          // TODO: Implement upgrade flow
          console.log('Upgrade requested');
        }}
      />
    );
  }

  // If user is authenticated and trial is valid (or not on trial), render the protected component
  return <>{children}</>;
};