// Validation utility functions for the CarPooling application

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (India - 10 digits starting with 6-9)
export const validatePhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// Format phone number for display
export const formatPhoneDisplay = (phone) => {
  if (!phone || phone.length !== 10) return phone;
  return `${phone.slice(0, 5)} ${phone.slice(5)}`;
};

// Name validation (letters, spaces, hyphens, apostrophes only)
export const validateName = (name) => {
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  return nameRegex.test(name) && name.trim().length >= 2;
};

// Password strength checker
export const checkPasswordStrength = (password) => {
  const checks = {
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  
  let strength = 'Weak';
  let color = '#F44336'; // Red
  
  if (passedChecks >= 4) {
    strength = 'Strong';
    color = '#4CAF50'; // Green
  } else if (passedChecks >= 3) {
    strength = 'Medium';
    color = '#FF9800'; // Orange
  }

  return {
    ...checks,
    strength,
    color,
    score: passedChecks,
    isValid: checks.hasMinLength && checks.hasUpperCase && checks.hasLowerCase && checks.hasNumber,
  };
};

// Address validation
export const validateAddress = (address) => {
  return address.trim().length <= 200;
};

// Get validation error messages
export const getValidationErrors = {
  name: {
    required: 'Please enter your full name',
    invalid: 'Name must be at least 2 characters and contain only letters',
  },
  email: {
    required: 'Please enter your email address',
    invalid: 'Please enter a valid email address',
    exists: 'This email is already registered. Please login instead.',
  },
  phone: {
    required: 'Please enter your phone number',
    invalid: 'Phone number must be 10 digits starting with 6-9',
    exists: 'This phone number is already registered',
  },
  password: {
    required: 'Please enter a password',
    weak: 'Password must be at least 8 characters with uppercase, lowercase, and number',
    mismatch: 'Passwords do not match',
  },
  general: {
    network: 'Network error. Please check your connection.',
    unknown: 'An error occurred. Please try again.',
  },
};
