import React, { forwardRef, InputHTMLAttributes } from 'react';
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeNumber, sanitizeSearchQuery } from '../../utils/security';

interface SecureInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  sanitizeType?: 'text' | 'email' | 'phone' | 'number' | 'search' | 'none';
  numberMin?: number;
  numberMax?: number;
}

export const SecureInput = forwardRef<HTMLInputElement, SecureInputProps>(
  ({ 
    label, 
    error, 
    icon, 
    className = '', 
    sanitizeType = 'text',
    numberMin,
    numberMax,
    onChange,
    ...props 
  }, ref) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!onChange) return;
      
      let value = e.target.value;
      
      // Apply sanitization based on type
      switch (sanitizeType) {
        case 'email':
          value = sanitizeEmail(value);
          break;
        case 'phone':
          value = sanitizePhone(value);
          break;
        case 'number':
          const sanitizedNumber = sanitizeNumber(value, numberMin, numberMax);
          value = sanitizedNumber ? sanitizedNumber.toString() : '';
          break;
        case 'search':
          value = sanitizeSearchQuery(value);
          break;
        case 'text':
          value = sanitizeText(value);
          break;
        case 'none':
        default:
          // No sanitization
          break;
      }
      
      // Create a new event with the sanitized value
      const sanitizedEvent = {
        ...e,
        target: {
          ...e.target,
          value
        }
      };
      
      onChange(sanitizedEvent);
    };

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-glass">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-glass-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full h-11 px-3 ${icon ? 'pl-10' : ''} rounded-lg 
              transition-all duration-300 glass-input text-glass placeholder-glass-muted
              ${error 
                ? 'border-red-400 focus:border-red-300 focus:shadow-red' 
                : 'focus:border-white focus:shadow-white'
              }
              focus:outline-none
              ${className}
            `}
            onChange={handleChange}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

SecureInput.displayName = 'SecureInput';
