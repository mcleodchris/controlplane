/**
 * Form Validation Utilities
 */

/**
 * Validate that a value is not empty
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 */
export function required(value, fieldName = 'This field') {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Validate minimum length
 * @param {string} value - Value to validate
 * @param {number} min - Minimum length
 * @param {string} fieldName - Name of the field
 */
export function minLength(value, min, fieldName = 'This field') {
  if (value && value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  return null;
}

/**
 * Validate maximum length
 * @param {string} value - Value to validate
 * @param {number} max - Maximum length
 * @param {string} fieldName - Name of the field
 */
export function maxLength(value, max, fieldName = 'This field') {
  if (value && value.length > max) {
    return `${fieldName} must be no more than ${max} characters`;
  }
  return null;
}

/**
 * Validate URL format
 * @param {string} value - Value to validate
 */
export function isUrl(value) {
  if (!value) return null;

  try {
    new URL(value);
    return null;
  } catch {
    return 'Please enter a valid URL';
  }
}

/**
 * Validate email format
 * @param {string} value - Value to validate
 */
export function isEmail(value) {
  if (!value) return null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Please enter a valid email address';
  }
  return null;
}

/**
 * Validate number is within range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Name of the field
 */
export function numberRange(value, min, max, fieldName = 'This field') {
  if (value === null || value === undefined || value === '') return null;

  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a number`;
  }

  if (min !== undefined && num < min) {
    return `${fieldName} must be at least ${min}`;
  }

  if (max !== undefined && num > max) {
    return `${fieldName} must be no more than ${max}`;
  }

  return null;
}

/**
 * Run multiple validators on a value
 * @param {any} value - Value to validate
 * @param {Function[]} validators - Array of validator functions
 */
export function validate(value, validators) {
  for (const validator of validators) {
    const error = validator(value);
    if (error) return error;
  }
  return null;
}

/**
 * Validate an entire form
 * @param {Object} values - Form values
 * @param {Object} rules - Validation rules
 */
export function validateForm(values, rules) {
  const errors = {};

  for (const [field, validators] of Object.entries(rules)) {
    const error = validate(values[field], validators);
    if (error) {
      errors[field] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
