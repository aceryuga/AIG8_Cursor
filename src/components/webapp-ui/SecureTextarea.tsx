import React, { forwardRef, TextareaHTMLAttributes } from 'react';
import { sanitizeText, sanitizeForDisplay } from '../../utils/security';

interface SecureTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  sanitizeType?: 'text' | 'display' | 'none';
  maxLength?: number;
}

export const SecureTextarea = forwardRef<HTMLTextAreaElement, SecureTextareaProps>(
  ({ 
    label, 
    error, 
    icon, 
    className = '', 
    sanitizeType = 'text',
    maxLength = 1000,
    onChange,
    ...props 
  }, ref) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!onChange) return;
      
      let value = e.target.value;
      
      // Apply sanitization based on type
      switch (sanitizeType) {
        case 'text':
          value = sanitizeText(value);
          break;
        case 'display':
          value = sanitizeForDisplay(value);
          break;
        case 'none':
        default:
          // No sanitization
          break;
      }
      
      // Enforce max length
      if (value.length > maxLength) {
        value = value.substring(0, maxLength);
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
            <div className="absolute left-3 top-3 text-glass-muted">
              {icon}
            </div>
          )}
          <textarea
            ref={ref}
            className={`
              w-full px-3 ${icon ? 'pl-10' : ''} py-3 rounded-lg 
              transition-all duration-300 glass-input text-glass placeholder-glass-muted
              ${error 
                ? 'border-red-400 focus:border-red-300 focus:shadow-red' 
                : 'focus:border-white focus:shadow-white'
              }
              focus:outline-none resize-vertical min-h-[100px]
              ${className}
            `}
            onChange={handleChange}
            maxLength={maxLength}
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

SecureTextarea.displayName = 'SecureTextarea';
