import React, { InputHTMLAttributes, forwardRef, useState, useEffect } from 'react';
import { validateNumericInput, validateIntegerInput, validateMonetaryInput, sanitizeNumericInput, NumericValidationResult } from '../../utils/validation';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  numericType?: 'integer' | 'decimal' | 'monetary';
  min?: number;
  max?: number;
  required?: boolean;
  onValidationChange?: (isValid: boolean, value: number) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', numericType, min, max, required, onValidationChange, ...props }, ref) => {
    const [internalError, setInternalError] = useState<string>('');
    const [inputValue, setInputValue] = useState<string>(props.value?.toString() || '');

    // Update internal value when external value changes
    useEffect(() => {
      setInputValue(props.value?.toString() || '');
    }, [props.value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      
      // For numeric inputs, sanitize in real-time
      if (numericType && props.type === 'number') {
        const allowDecimals = numericType === 'decimal' || numericType === 'monetary';
        const sanitizedValue = sanitizeNumericInput(rawValue, allowDecimals);
        
        // Update the input value with sanitized version
        setInputValue(sanitizedValue);
        
        // Validate the sanitized input
        let validationResult: NumericValidationResult;
        
        if (numericType === 'integer') {
          validationResult = validateIntegerInput(sanitizedValue, {
            min,
            max,
            required,
            fieldName: label
          });
        } else if (numericType === 'monetary') {
          validationResult = validateMonetaryInput(sanitizedValue, {
            min,
            max,
            required,
            fieldName: label
          });
        } else {
          validationResult = validateNumericInput(sanitizedValue, {
            min,
            max,
            required,
            fieldName: label,
            allowDecimals: true
          });
        }
        
        // Set internal error if validation fails
        if (!validationResult.isValid) {
          setInternalError(validationResult.error || 'Invalid input');
        } else {
          setInternalError('');
        }
        
        // Notify parent component about validation status
        if (onValidationChange) {
          onValidationChange(validationResult.isValid, validationResult.value);
        }
        
        // Call the original onChange with the sanitized value
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: sanitizedValue }
        };
        
        if (props.onChange) {
          props.onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
        }
      } else {
        // For non-numeric inputs, use original behavior
        setInputValue(rawValue);
        if (props.onChange) {
          props.onChange(e);
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // For numeric inputs, prevent invalid characters
      if (numericType && props.type === 'number') {
        const allowDecimals = numericType === 'decimal' || numericType === 'monetary';
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        
        if (allowedKeys.includes(e.key)) {
          return; // Allow navigation and editing keys
        }
        
        // Allow digits
        if (/[0-9]/.test(e.key)) {
          return;
        }
        
        // Allow decimal point for decimal/monetary fields
        if (e.key === '.' && allowDecimals && !inputValue.includes('.')) {
          return;
        }
        
        // Allow minus sign at the beginning
        if (e.key === '-' && inputValue.length === 0) {
          return;
        }
        
        // Block all other characters
        e.preventDefault();
      }
      
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };

    const displayError = error || internalError;
    const isNumeric = numericType && props.type === 'number';

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-glass">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-glass-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            {...props}
            value={isNumeric ? inputValue : props.value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className={`
              w-full h-11 px-3 ${icon ? 'pl-10' : ''} rounded-lg 
              transition-all duration-300 glass-input text-glass placeholder-glass-muted
              ${displayError 
                ? 'border-red-400 focus:border-red-300 focus:shadow-red' 
                : 'focus:border-white focus:shadow-white'
              }
              focus:outline-none
              ${className}
            `}
          />
        </div>
        {displayError && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{displayError}</span>
          </p>
        )}
        {isNumeric && !displayError && inputValue && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <svg className="w-3 h-3 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Valid input</span>
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';