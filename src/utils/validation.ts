import { ValidationError, PasswordStrength } from '../types/auth';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validatePassword = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;
  let hasMinLength = false;
  let hasUppercase = false;
  let hasLowercase = false;
  let hasNumber = false;
  let hasSpecialChar = false;

  if (password.length >= 8) {
    score += 1;
    hasMinLength = true;
  } else {
    feedback.push('At least 8 characters');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
    hasLowercase = true;
  } else {
    feedback.push('One lowercase letter');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
    hasUppercase = true;
  } else {
    feedback.push('One uppercase letter');
  }

  if (/\d/.test(password)) {
    score += 1;
    hasNumber = true;
  } else {
    feedback.push('One number');
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
    hasSpecialChar = true;
  } else {
    feedback.push('One special character');
  }

  return {
    score,
    feedback,
    isValid: score >= 4,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar
  };
};

export const validateForm = (data: any, rules: Record<string, (value: any) => string | null>): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  Object.entries(rules).forEach(([field, validator]) => {
    const error = validator(data[field]);
    if (error) {
      errors.push({ field, message: error });
    }
  });

  return errors;
};

export const maskEmail = (email: string): string => {
  const [username, domain] = email.split('@');
  if (username.length <= 2) return email;
  
  const maskedUsername = username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
  return `${maskedUsername}@${domain}`;
};

// Numeric validation utilities
export interface NumericValidationResult {
  isValid: boolean;
  value: number;
  error?: string;
}

export const validateNumericInput = (
  input: string, 
  options: {
    min?: number;
    max?: number;
    allowDecimals?: boolean;
    required?: boolean;
    fieldName?: string;
  } = {}
): NumericValidationResult => {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, allowDecimals = true, required = false, fieldName = 'Field' } = options;
  
  // Handle empty input
  if (!input.trim()) {
    if (required) {
      return { isValid: false, value: 0, error: `${fieldName} is required` };
    }
    return { isValid: true, value: 0 };
  }
  
  // Check for invalid characters
  const invalidChars = /[^0-9.-]/;
  if (invalidChars.test(input)) {
    return { isValid: false, value: 0, error: `${fieldName} can only contain numbers${allowDecimals ? ' and one decimal point' : ''}` };
  }
  
  // Check for multiple decimal points
  const decimalCount = (input.match(/\./g) || []).length;
  if (decimalCount > 1) {
    return { isValid: false, value: 0, error: `${fieldName} can only have one decimal point` };
  }
  
  // Check for scientific notation (e, E)
  if (/[eE]/.test(input)) {
    return { isValid: false, value: 0, error: `${fieldName} cannot use scientific notation` };
  }
  
  // Check for leading/trailing decimal points
  if (input.startsWith('.') || input.endsWith('.')) {
    return { isValid: false, value: 0, error: `${fieldName} cannot start or end with a decimal point` };
  }
  
  // For integer-only fields, check for decimal point
  if (!allowDecimals && input.includes('.')) {
    return { isValid: false, value: 0, error: `${fieldName} must be a whole number` };
  }
  
  // Parse the number
  const numValue = parseFloat(input);
  
  // Check if parsing resulted in NaN
  if (isNaN(numValue)) {
    return { isValid: false, value: 0, error: `${fieldName} must be a valid number` };
  }
  
  // Check if value is within bounds
  if (numValue < min) {
    return { isValid: false, value: numValue, error: `${fieldName} must be at least ${min}` };
  }
  
  if (numValue > max) {
    return { isValid: false, value: numValue, error: `${fieldName} cannot exceed ${max.toLocaleString()}` };
  }
  
  // Check decimal places for monetary values
  if (allowDecimals && input.includes('.')) {
    const decimalPlaces = input.split('.')[1].length;
    if (decimalPlaces > 2) {
      return { isValid: false, value: numValue, error: `${fieldName} can have at most 2 decimal places` };
    }
  }
  
  return { isValid: true, value: numValue };
};

export const validateIntegerInput = (
  input: string,
  options: {
    min?: number;
    max?: number;
    required?: boolean;
    fieldName?: string;
  } = {}
): NumericValidationResult => {
  return validateNumericInput(input, { ...options, allowDecimals: false });
};

export const validateMonetaryInput = (
  input: string,
  options: {
    min?: number;
    max?: number;
    required?: boolean;
    fieldName?: string;
  } = {}
): NumericValidationResult => {
  return validateNumericInput(input, { ...options, allowDecimals: true });
};

// Real-time input sanitization
export const sanitizeNumericInput = (input: string, allowDecimals: boolean = true): string => {
  // Remove all non-numeric characters except decimal point and minus
  let sanitized = input.replace(/[^0-9.-]/g, '');
  
  // For integer-only fields, remove decimal point
  if (!allowDecimals) {
    sanitized = sanitized.replace(/\./g, '');
  }
  
  // Ensure only one decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Remove leading zeros except for "0." or "0"
  if (sanitized.length > 1 && sanitized.startsWith('0') && sanitized[1] !== '.') {
    sanitized = sanitized.replace(/^0+/, '') || '0';
  }
  
  return sanitized;
};