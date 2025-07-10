/**
 * Input Validation and Sanitization Module
 * 
 * This module provides comprehensive input validation and sanitization utilities
 * to ensure all data is properly validated before DOM operations.
 * 
 * Security Note: This extension has been audited for DOM security. All DOM operations
 * use safe methods (createElement, textContent, setAttribute) and avoid innerHTML
 * for user-generated content. No HTML insertion occurs, making DOMPurify unnecessary.
 */

// Valid mode values for state validation
const VALID_MODES = new Set([
  'ALL', 'EMAIL', 'CALENDAR', 'ATTACH', 'FAVOURITES',
  'IMAGE', 'PDF', 'DOCUMENT', 'SPREADSHEET', 'PRESENTATION'
]);

/**
 * Validates and sanitizes a filter mode value
 * @param {any} mode - The mode value to validate
 * @param {string} defaultMode - The default mode to return if validation fails
 * @returns {string} A valid, sanitized mode value
 */
export function validateMode(mode, defaultMode = 'ALL') {
  if (typeof mode !== 'string') {
    console.warn('Invalid mode type received:', typeof mode);
    return defaultMode;
  }
  
  const sanitizedMode = mode.trim().toUpperCase();
  
  if (!VALID_MODES.has(sanitizedMode)) {
    console.warn('Invalid mode value received:', mode);
    return defaultMode;
  }
  
  return sanitizedMode;
}

/**
 * Validates a boolean value from storage
 * @param {any} value - The value to validate
 * @param {boolean} defaultValue - The default value to return if validation fails
 * @returns {boolean} A valid boolean value
 */
export function validateBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    if (lowerValue === 'true') return true;
    if (lowerValue === 'false') return false;
  }
  
  if (typeof value === 'number') {
    return Boolean(value);
  }
  
  console.warn('Invalid boolean value received:', value);
  return defaultValue;
}

/**
 * Validates storage data structure
 * @param {object} data - The storage data to validate
 * @returns {object} Validated and sanitized storage data
 */
export function validateStorageData(data) {
  if (!data || typeof data !== 'object') {
    console.warn('Invalid storage data received:', data);
    return {
      gmailCalMode: 'ALL',
      gmailCalDebug: false,
      showButtonText: true
    };
  }
  
  return {
    gmailCalMode: validateMode(data.gmailCalMode, 'ALL'),
    gmailCalDebug: validateBoolean(data.gmailCalDebug, false),
    showButtonText: validateBoolean(data.showButtonText, true)
  };
}

/**
 * Sanitizes text content before DOM insertion
 * @param {any} text - The text to sanitize
 * @param {string} defaultText - Default text if validation fails
 * @returns {string} Sanitized text safe for DOM insertion
 */
export function sanitizeTextContent(text, defaultText = '') {
  if (text === null || text === undefined) {
    return defaultText;
  }
  
  if (typeof text !== 'string') {
    // Convert to string and warn
    console.warn('Non-string text content received:', typeof text);
    text = String(text);
  }
  
  // Remove any potential script-like content (additional security layer)
  const sanitized = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:\s*[^;\s]*/gi, '')
    .replace(/on\w+\s*=\s*[^;\s]*/gi, '');
  
  return sanitized.trim();
}

/**
 * Validates dataset attributes before setting
 * @param {string} key - The dataset key
 * @param {any} value - The value to set
 * @returns {string} Sanitized attribute value
 */
export function validateDatasetAttribute(key, value) {
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('Invalid dataset key');
  }
  
  if (value === null || value === undefined) {
    return '';
  }
  
  // Convert to string and sanitize
  const stringValue = String(value);
  
  // Remove potentially dangerous characters
  return stringValue
    .replace(/[<>"'&]/g, '')
    .replace(/javascript:\s*[^;\s]*/gi, '')
    .trim();
}

/**
 * Validates Chrome i18n message keys
 * @param {string} key - The message key to validate
 * @returns {boolean} Whether the key is valid
 */
export function validateI18nKey(key) {
  if (typeof key !== 'string') {
    return false;
  }
  
  // Valid i18n keys should match this pattern
  const validKeyPattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  return validKeyPattern.test(key);
}

/**
 * Safely gets Chrome i18n message with validation
 * @param {string} key - The message key
 * @param {string} fallback - Fallback text if key is invalid
 * @returns {string} The localized message or fallback
 */
export function safeGetI18nMessage(key, fallback = '') {
  if (!validateI18nKey(key)) {
    console.warn('Invalid i18n key:', key);
    return fallback;
  }
  
  try {
    const message = chrome.i18n.getMessage(key);
    // If message is empty or just whitespace, use fallback
    if (!message || !message.trim()) {
      return fallback;
    }
    return sanitizeTextContent(message, fallback);
  } catch (error) {
    console.error('Error getting i18n message:', error);
    return fallback;
  }
}

/**
 * Validates Chrome storage error objects
 * @param {any} error - The error object to validate
 * @returns {string} Safe error message
 */
export function validateStorageError(error) {
  if (!error) {
    return 'Unknown storage error';
  }
  
  if (typeof error === 'string') {
    return sanitizeTextContent(error, 'Storage error occurred');
  }
  
  if (error.message) {
    return sanitizeTextContent(error.message, 'Storage error occurred');
  }
  
  return 'Storage error occurred';
}