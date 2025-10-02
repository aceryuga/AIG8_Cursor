export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyCount: number;
  isVerified: boolean;
}

export interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface SignupForm {
  name: string;
  email: string;
  phone: string;
  propertyCount: number;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordForm {
  email: string;
}

export interface NewPasswordForm {
  password: string;
  confirmPassword: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PasswordStrength {
  score: number;
  feedback: string[];
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}