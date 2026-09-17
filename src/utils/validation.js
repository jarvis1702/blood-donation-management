/**
 * Form validation rules for Blood Donation Management System
 */

/**
 * Validates Full Name (cannot be empty)
 * @param {string} name 
 * @returns {string|null} Error message or null if valid
 */
export const validateName = (name) => {
  if (!name || name.trim() === '') {
    return 'Full Name is required';
  }
  if (name.trim().length < 2) {
    return 'Full Name must be at least 2 characters';
  }
  return null;
};

/**
 * Validates KCT Email (must be format xxx@kct.ac.in)
 * @param {string} email 
 * @returns {string|null} Error message or null if valid
 */
export const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return 'Email address is required';
  }
  
  // Standard email regex check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  
  // KCT email domain check
  const kctDomain = '@kct.ac.in';
  if (!email.toLowerCase().endsWith(kctDomain)) {
    return 'Only KCT email domain (@kct.ac.in) is accepted';
  }
  
  return null;
};

/**
 * Validates Password (minimum length 8 characters)
 * @param {string} password 
 * @returns {string|null} Error message or null if valid
 */
export const validatePassword = (password) => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  
  // Optional but good for professional apps: check for strength
  let hasLetter = /[a-zA-Z]/.test(password);
  let hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return 'Password should contain both letters and numbers';
  }
  
  return null;
};

/**
 * Validates Confirm Password (must match password)
 * @param {string} password 
 * @param {string} confirmPassword 
 * @returns {string|null} Error message or null if valid
 */
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
};
