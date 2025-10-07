/**
 * Timezone utility functions for consistent date/time handling
 */

/**
 * Get user's timezone offset in minutes
 */
export const getUserTimezoneOffset = (): number => {
  return new Date().getTimezoneOffset();
};

/**
 * Get user's timezone name (e.g., "Asia/Kolkata", "America/New_York")
 */
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Convert local date to UTC for Supabase storage
 * @param localDate - Date object in local timezone
 * @returns ISO string in UTC format
 */
export const toUTC = (localDate: Date): string => {
  return localDate.toISOString();
};

/**
 * Convert UTC date from Supabase to local timezone
 * @param utcDateString - ISO string from Supabase (UTC)
 * @returns Date object in local timezone
 */
export const fromUTC = (utcDateString: string): Date => {
  return new Date(utcDateString);
};

/**
 * Get current date/time in user's timezone as UTC string for Supabase
 * @returns ISO string in UTC format
 */
export const getCurrentUTC = (): string => {
  return new Date().toISOString();
};

/**
 * Format date for display in user's local timezone
 * @param utcDateString - ISO string from Supabase
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatLocalDate = (
  utcDateString: string, 
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const date = fromUTC(utcDateString);
  return date.toLocaleDateString(undefined, options);
};

/**
 * Format time for display in user's local timezone
 * @param utcDateString - ISO string from Supabase
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted time string
 */
export const formatLocalTime = (
  utcDateString: string, 
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const date = fromUTC(utcDateString);
  return date.toLocaleTimeString(undefined, options);
};

/**
 * Get relative time (e.g., "2 hours ago") in user's timezone
 * @param dateString - Date string from Supabase
 * @returns Relative time string
 */
export const getRelativeTime = (dateString: string): string => {
  // Parse the date string - handle both UTC and local timezone formats
  const date = new Date(dateString);
  const now = new Date();
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.error('Invalid date in getRelativeTime:', dateString);
    return 'Invalid date';
  }
  
  const diffInMs = now.getTime() - date.getTime();
  
  // Debug logging (can be removed in production)
  // console.log('getRelativeTime debug:', {
  //   dateString,
  //   parsedDate: date,
  //   diffInMs,
  //   diffInHours: Math.floor(diffInMs / (1000 * 60 * 60))
  // });
  
  // Handle future dates
  if (diffInMs < 0) {
    const futureDays = Math.ceil(Math.abs(diffInMs) / (1000 * 60 * 60 * 24));
    return `In ${futureDays} day${futureDays > 1 ? 's' : ''}`;
  }
  
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Format date in DD/MM/YYYY format for display
 * @param dateString - Date string (ISO or any valid date format)
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatDateDDMMYYYY = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    console.error('Invalid date in formatDateDDMMYYYY:', dateString);
    return 'Invalid date';
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Create a date input value for HTML date inputs (YYYY-MM-DD format)
 * @param utcDateString - ISO string from Supabase
 * @returns Date string in YYYY-MM-DD format
 */
export const toDateInputValue = (utcDateString: string): string => {
  const date = fromUTC(utcDateString);
  return date.toISOString().split('T')[0];
};

/**
 * Create a datetime input value for HTML datetime-local inputs
 * @param utcDateString - ISO string from Supabase
 * @returns Date string in YYYY-MM-DDTHH:MM format
 */
export const toDateTimeInputValue = (utcDateString: string): string => {
  const date = fromUTC(utcDateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Convert HTML date input value to UTC for Supabase
 * @param dateInputValue - Value from HTML date input (YYYY-MM-DD)
 * @returns ISO string in UTC format
 */
export const fromDateInput = (dateInputValue: string): string => {
  const localDate = new Date(dateInputValue + 'T00:00:00');
  return toUTC(localDate);
};

/**
 * Convert HTML datetime input value to UTC for Supabase
 * @param datetimeInputValue - Value from HTML datetime-local input
 * @returns ISO string in UTC format
 */
export const fromDateTimeInput = (datetimeInputValue: string): string => {
  const localDate = new Date(datetimeInputValue);
  return toUTC(localDate);
};
