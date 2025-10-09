/**
 * Security utility functions for input sanitization and validation
 * Prevents XSS attacks, SQL injection, and other security vulnerabilities
 */

/**
 * Sanitize HTML content by removing potentially dangerous tags and attributes
 * @param input - Raw HTML string
 * @returns Sanitized HTML string
 */
export const sanitizeHTML = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove dangerous event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocols (except safe image types)
  sanitized = sanitized.replace(/data:(?!image\/(png|jpg|jpeg|gif|webp|svg))/gi, '');
  
  // Remove vbscript: protocols
  sanitized = sanitized.replace(/vbscript:/gi, '');
  
  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '');
  
  // Remove object and embed tags
  sanitized = sanitized.replace(/<(object|embed)\b[^>]*>.*?<\/(object|embed)>/gi, '');
  
  // Remove form tags
  sanitized = sanitized.replace(/<form\b[^>]*>.*?<\/form>/gi, '');
  
  // Remove input tags
  sanitized = sanitized.replace(/<input\b[^>]*>/gi, '');
  
  // Remove link tags with dangerous rel attributes
  sanitized = sanitized.replace(/<link\b[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi, '');
  
  // Remove meta tags with dangerous content
  sanitized = sanitized.replace(/<meta\b[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/gi, '');
  
  return sanitized.trim();
};

/**
 * Escape HTML special characters to prevent XSS
 * @param input - Raw string
 * @returns HTML-escaped string
 */
export const escapeHTML = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  const htmlEscapes: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return input.replace(/[&<>"'`=\/]/g, (match) => htmlEscapes[match]);
};

/**
 * Sanitize plain text input by removing HTML tags and escaping special characters
 * @param input - Raw string input
 * @returns Sanitized plain text
 */
export const sanitizeText = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Escape HTML characters
  sanitized = escapeHTML(sanitized);
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
};

/**
 * Sanitize user input for display (allows safe HTML but removes dangerous content)
 * @param input - Raw string input
 * @returns Sanitized string safe for display
 */
export const sanitizeForDisplay = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  // First sanitize HTML
  let sanitized = sanitizeHTML(input);
  
  // Then escape any remaining dangerous characters
  sanitized = escapeHTML(sanitized);
  
  return sanitized.trim();
};

/**
 * Validate and sanitize email input
 * @param email - Email string
 * @returns Sanitized email or empty string if invalid
 */
export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';
  
  // Remove HTML tags and escape characters
  const sanitized = sanitizeText(email);
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    return '';
  }
  
  // Additional security checks
  if (sanitized.length > 254) return ''; // RFC 5321 limit
  if (sanitized.includes('..')) return ''; // Prevent directory traversal
  
  return sanitized.toLowerCase();
};

/**
 * Validate and sanitize phone number input
 * @param phone - Phone number string
 * @returns Sanitized phone number or empty string if invalid
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  
  // Remove all non-digit characters except + at the beginning
  let sanitized = phone.replace(/[^\d+]/g, '');
  
  // Ensure + is only at the beginning
  if (sanitized.includes('+') && !sanitized.startsWith('+')) {
    sanitized = sanitized.replace(/\+/g, '');
  }
  
  // Basic phone validation (7-15 digits)
  const digitsOnly = sanitized.replace(/\+/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return '';
  }
  
  return sanitized;
};

/**
 * Validate and sanitize numeric input
 * @param input - Numeric string
 * @param min - Minimum value (optional)
 * @param max - Maximum value (optional)
 * @returns Sanitized number or null if invalid
 */
export const sanitizeNumber = (input: string, min?: number, max?: number): number | null => {
  if (!input || typeof input !== 'string') return null;
  
  // Remove all non-numeric characters except decimal point and minus sign
  const sanitized = input.replace(/[^\d.-]/g, '');
  
  const num = parseFloat(sanitized);
  
  if (isNaN(num) || !isFinite(num)) return null;
  
  if (min !== undefined && num < min) return null;
  if (max !== undefined && num > max) return null;
  
  return num;
};

/**
 * Validate and sanitize file name
 * @param filename - File name string
 * @returns Sanitized file name or empty string if invalid
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename || typeof filename !== 'string') return '';
  
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[\/\\]/g, '');
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 255 - (ext ? ext.length + 1 : 0));
    sanitized = ext ? `${name}.${ext}` : name;
  }
  
  return sanitized.trim();
};

/**
 * Validate file type for uploads
 * @param filename - File name
 * @param allowedTypes - Array of allowed MIME types or file extensions
 * @returns True if file type is allowed
 */
export const validateFileType = (filename: string, allowedTypes: string[]): boolean => {
  if (!filename || !allowedTypes || allowedTypes.length === 0) return false;
  
  const extension = filename.toLowerCase().split('.').pop();
  if (!extension) return false;
  
  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return type.toLowerCase() === `.${extension}`;
    }
    // Handle MIME types
    const mimeMap: { [key: string]: string[] } = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
      'image/svg+xml': ['svg'],
      'application/pdf': ['pdf'],
      'text/plain': ['txt'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx']
    };
    
    return mimeMap[type]?.includes(extension) || false;
  });
};

/**
 * Validate file size
 * @param fileSize - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @returns True if file size is within limits
 */
export const validateFileSize = (fileSize: number, maxSize: number): boolean => {
  return fileSize > 0 && fileSize <= maxSize;
};

/**
 * Sanitize search query input
 * @param query - Search query string
 * @returns Sanitized search query
 */
export const sanitizeSearchQuery = (query: string): string => {
  if (!query || typeof query !== 'string') return '';
  
  // Remove HTML tags
  let sanitized = sanitizeText(query);
  
  // Remove SQL injection patterns
  sanitized = sanitized.replace(/['";\\]/g, '');
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  return sanitized;
};

/**
 * Validate and sanitize URL input
 * @param url - URL string
 * @returns Sanitized URL or empty string if invalid
 */
export const sanitizeURL = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '';
    }
    
    return urlObj.toString();
  } catch {
    return '';
  }
};

/**
 * Sanitize JSON input to prevent prototype pollution
 * @param jsonString - JSON string
 * @returns Sanitized JSON string or null if invalid
 */
export const sanitizeJSON = (jsonString: string): string | null => {
  if (!jsonString || typeof jsonString !== 'string') return null;
  
  try {
    const parsed = JSON.parse(jsonString);
    
    // Remove __proto__ and constructor properties
    const sanitized = JSON.parse(JSON.stringify(parsed, (key, value) => {
      if (key === '__proto__' || key === 'constructor') {
        return undefined;
      }
      return value;
    }));
    
    return JSON.stringify(sanitized);
  } catch {
    return null;
  }
};

/**
 * Rate limiting helper (client-side basic protection)
 * @param key - Unique key for rate limiting
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns True if request is allowed
 */
export const checkRateLimit = (key: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const storageKey = `rate_limit_${key}`;
  
  try {
    const stored = localStorage.getItem(storageKey);
    const requests = stored ? JSON.parse(stored) : [];
    
    // Remove old requests outside the time window
    const validRequests = requests.filter((timestamp: number) => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    localStorage.setItem(storageKey, JSON.stringify(validRequests));
    
    return true;
  } catch {
    return true; // If localStorage fails, allow the request
  }
};

/**
 * Security constants
 */
export const SECURITY_CONSTANTS = {
  MAX_TEXT_LENGTH: 1000,
  MAX_EMAIL_LENGTH: 254,
  MAX_PHONE_LENGTH: 15,
  MAX_FILENAME_LENGTH: 255,
  MAX_SEARCH_QUERY_LENGTH: 100,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALLOWED_FILE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.txt', '.doc', '.docx']
} as const;
