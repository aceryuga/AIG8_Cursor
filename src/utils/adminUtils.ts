/**
 * Admin utilities for determining admin access
 */

// List of admin email addresses
const ADMIN_EMAILS = [
  'admin@propertypro.com',
  'rajesh.kumar@example.com', // Demo user for testing
  'dev@propertypro.com',
  'support@propertypro.com'
];

/**
 * Check if the current user is an admin
 */
export const isAdmin = (userEmail?: string | null): boolean => {
  if (!userEmail) return false;
  return ADMIN_EMAILS.includes(userEmail.toLowerCase());
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if testing features should be available
 */
export const canAccessTesting = (userEmail?: string | null): boolean => {
  // Allow in development mode OR for admin users
  return isDevelopment() || isAdmin(userEmail);
};

/**
 * Get admin configuration
 */
export const getAdminConfig = () => {
  return {
    canAccessTesting: canAccessTesting,
    isAdmin: isAdmin,
    isDevelopment: isDevelopment,
    adminEmails: ADMIN_EMAILS
  };
};
