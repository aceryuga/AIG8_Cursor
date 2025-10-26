import { useEffect } from 'react';

/**
 * Cleans up malformed URLs caused by HashRouter hash duplication
 * e.g., converts "auth/login#/dashboard" to "auth/login"
 */
export const cleanupMalformedUrl = (): void => {
  const currentHash = window.location.hash;
  
  // Check if we have a malformed URL with nested hash
  // e.g., #/auth/login#/dashboard or similar patterns
  if (currentHash.includes('#/') && currentHash.lastIndexOf('#/') !== currentHash.indexOf('#/')) {
    console.warn('Detected malformed URL, cleaning up:', currentHash);
    
    // Extract the first valid path (before the second hash)
    const firstHashIndex = currentHash.indexOf('#/');
    const secondHashIndex = currentHash.lastIndexOf('#/');
    
    if (firstHashIndex !== secondHashIndex) {
      const cleanPath = currentHash.substring(0, secondHashIndex);
      window.history.replaceState(null, '', cleanPath || '#/');
    }
  }
};

/**
 * Clears all authentication-related data from storage
 * Use this when auth state gets corrupted
 */
export const clearAuthData = (): boolean => {
  try {
    // Clear localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('supabase.') || 
        key.startsWith('sb-') ||
        key.includes('auth')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('supabase.') || 
        key.startsWith('sb-') ||
        key.includes('auth')
      )) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
    
    console.log('Auth data cleared successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear auth data:', error);
    return false;
  }
};

/**
 * Hook to detect and recover from stuck loading state
 * @param isLoading - Current loading state
 * @param timeout - Timeout in milliseconds (default: 15000)
 */
export const useLoadingRecovery = (isLoading: boolean, timeout: number = 15000): void => {
  useEffect(() => {
    if (!isLoading) return;
    
    const timeoutId = setTimeout(() => {
      console.error('App stuck in loading state - attempting recovery');
      const cleared = clearAuthData();
      if (cleared) {
        // Redirect to landing page after clearing
        window.location.href = '/';
      }
    }, timeout);
    
    return () => clearTimeout(timeoutId);
  }, [isLoading, timeout]);
};

/**
 * Manually trigger auth recovery
 * Useful for adding a "Clear Auth Data" button in error states
 */
export const recoverAuth = (): void => {
  console.log('Manual auth recovery triggered');
  const cleared = clearAuthData();
  if (cleared) {
    window.location.href = '/';
  }
};

