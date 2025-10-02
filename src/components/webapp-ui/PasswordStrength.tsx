import React from 'react';
import { Check, X } from 'lucide-react';
import { PasswordStrength as PasswordStrengthType } from '../../types/auth';

interface PasswordStrengthProps {
  strength: PasswordStrengthType;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ strength }) => {
  const getStrengthColor = () => {
    if (strength.score <= 1) return 'bg-red-500';
    if (strength.score <= 2) return 'bg-orange-500';
    if (strength.score <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strength.score <= 1) return 'Weak';
    if (strength.score <= 2) return 'Fair';
    if (strength.score <= 3) return 'Good';
    return 'Strong';
  };

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-glass">Password Strength</span>
          <span className={`text-sm font-medium ${
            strength.score <= 1 ? 'text-red-400' :
            strength.score <= 2 ? 'text-orange-500' :
            strength.score <= 3 ? 'text-orange-600' :
            'text-green-800'
          }`}>
            {getStrengthText()}
          </span>
        </div>
        <div className="w-full bg-glass rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${(strength.score / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className={`flex items-center space-x-2 transition-colors ${
            strength.hasMinLength ? 'text-green-800' : 'text-glass-muted'
          }`}>
            {strength.hasMinLength ? (
              <Check size={14} className="text-green-800" />
            ) : (
              <X size={14} className="text-glass-muted" />
            )}
            <span>At least 8 characters</span>
          </div>
          
          <div className={`flex items-center space-x-2 transition-colors ${
            strength.hasUppercase ? 'text-green-800' : 'text-glass-muted'
          }`}>
            {strength.hasUppercase ? (
              <Check size={14} className="text-green-800" />
            ) : (
              <X size={14} className="text-glass-muted" />
            )}
            <span>One uppercase letter</span>
          </div>
          
          <div className={`flex items-center space-x-2 transition-colors ${
            strength.hasLowercase ? 'text-green-800' : 'text-glass-muted'
          }`}>
            {strength.hasLowercase ? (
              <Check size={14} className="text-green-800" />
            ) : (
              <X size={14} className="text-glass-muted" />
            )}
            <span>One lowercase letter</span>
          </div>
          
          <div className={`flex items-center space-x-2 transition-colors ${
            strength.hasNumber ? 'text-green-800' : 'text-glass-muted'
          }`}>
            {strength.hasNumber ? (
              <Check size={14} className="text-green-800" />
            ) : (
              <X size={14} className="text-glass-muted" />
            )}
            <span>One number</span>
          </div>
          
          <div className={`flex items-center space-x-2 transition-colors ${
            strength.hasSpecialChar ? 'text-green-800' : 'text-glass-muted'
          }`}>
            {strength.hasSpecialChar ? (
              <Check size={14} className="text-green-800" />
            ) : (
              <X size={14} className="text-glass-muted" />
            )}
            <span>One special character</span>
          </div>
        </div>
      </div>
    </div>
  );
};