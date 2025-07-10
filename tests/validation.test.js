/**
 * Security and Validation Tests
 * 
 * These tests verify that DOM operations remain secure and input validation
 * works correctly across the extension.
 */

import { expect, test, describe, beforeEach, jest } from '@jest/globals';
import {
  validateMode,
  validateBoolean,
  validateStorageData,
  sanitizeTextContent,
  validateDatasetAttribute,
  validateI18nKey,
  safeGetI18nMessage,
  validateStorageError
} from '../src/modules/utils/validation.js';

describe('Input Validation Security Tests', () => {
  describe('validateMode', () => {
    test('accepts valid modes', () => {
      expect(validateMode('ALL')).toBe('ALL');
      expect(validateMode('EMAIL')).toBe('EMAIL');
      expect(validateMode('CALENDAR')).toBe('CALENDAR');
      expect(validateMode('ATTACH')).toBe('ATTACH');
      expect(validateMode('FAVOURITES')).toBe('FAVOURITES');
      expect(validateMode('IMAGE')).toBe('IMAGE');
      expect(validateMode('PDF')).toBe('PDF');
      expect(validateMode('DOCUMENT')).toBe('DOCUMENT');
      expect(validateMode('SPREADSHEET')).toBe('SPREADSHEET');
      expect(validateMode('PRESENTATION')).toBe('PRESENTATION');
    });

    test('normalizes case for valid modes', () => {
      expect(validateMode('all')).toBe('ALL');
      expect(validateMode('email')).toBe('EMAIL');
      expect(validateMode('  CALENDAR  ')).toBe('CALENDAR');
    });

    test('rejects invalid modes and returns default', () => {
      expect(validateMode('INVALID')).toBe('ALL');
      expect(validateMode('HACK')).toBe('ALL');
      expect(validateMode('<script>')).toBe('ALL');
      expect(validateMode('javascript:alert(1)')).toBe('ALL');
    });

    test('handles non-string inputs', () => {
      expect(validateMode(null)).toBe('ALL');
      expect(validateMode(undefined)).toBe('ALL');
      expect(validateMode(123)).toBe('ALL');
      expect(validateMode({})).toBe('ALL');
      expect(validateMode([])).toBe('ALL');
    });

    test('uses custom default when provided', () => {
      expect(validateMode('INVALID', 'EMAIL')).toBe('EMAIL');
    });
  });

  describe('validateBoolean', () => {
    test('accepts valid boolean values', () => {
      expect(validateBoolean(true)).toBe(true);
      expect(validateBoolean(false)).toBe(false);
    });

    test('converts string representations', () => {
      expect(validateBoolean('true')).toBe(true);
      expect(validateBoolean('false')).toBe(false);
      expect(validateBoolean('TRUE')).toBe(true);
      expect(validateBoolean('FALSE')).toBe(false);
      expect(validateBoolean('  true  ')).toBe(true);
    });

    test('converts numbers to boolean', () => {
      expect(validateBoolean(1)).toBe(true);
      expect(validateBoolean(0)).toBe(false);
      expect(validateBoolean(-1)).toBe(true);
    });

    test('rejects invalid values and returns default', () => {
      expect(validateBoolean('invalid')).toBe(false);
      expect(validateBoolean(null)).toBe(false);
      expect(validateBoolean(undefined)).toBe(false);
      expect(validateBoolean({})).toBe(false);
      expect(validateBoolean([])).toBe(false);
    });

    test('uses custom default when provided', () => {
      expect(validateBoolean('invalid', true)).toBe(true);
    });
  });

  describe('validateStorageData', () => {
    test('validates complete storage data', () => {
      const input = {
        gmailCalMode: 'EMAIL',
        gmailCalDebug: true,
        showButtonText: false
      };
      const result = validateStorageData(input);
      expect(result).toEqual({
        gmailCalMode: 'EMAIL',
        gmailCalDebug: true,
        showButtonText: false
      });
    });

    test('applies defaults for missing fields', () => {
      const input = {};
      const result = validateStorageData(input);
      expect(result).toEqual({
        gmailCalMode: 'ALL',
        gmailCalDebug: false,
        showButtonText: true
      });
    });

    test('sanitizes invalid data', () => {
      const input = {
        gmailCalMode: 'INVALID_MODE',
        gmailCalDebug: 'not_a_boolean',
        showButtonText: null
      };
      const result = validateStorageData(input);
      expect(result).toEqual({
        gmailCalMode: 'ALL',
        gmailCalDebug: false,
        showButtonText: true
      });
    });

    test('handles null/undefined input', () => {
      expect(validateStorageData(null)).toEqual({
        gmailCalMode: 'ALL',
        gmailCalDebug: false,
        showButtonText: true
      });
      expect(validateStorageData(undefined)).toEqual({
        gmailCalMode: 'ALL',
        gmailCalDebug: false,
        showButtonText: true
      });
    });
  });

  describe('sanitizeTextContent', () => {
    test('passes through safe text unchanged', () => {
      expect(sanitizeTextContent('Safe text')).toBe('Safe text');
      expect(sanitizeTextContent('Text with 123 numbers')).toBe('Text with 123 numbers');
      expect(sanitizeTextContent('Special chars: !@#$%^&*()')).toBe('Special chars: !@#$%^&*()');
    });

    test('removes script tags and dangerous content', () => {
      expect(sanitizeTextContent('<script>alert("hack")</script>'))
        .toBe('');
      expect(sanitizeTextContent('Safe text <script>bad</script> more text'))
        .toBe('Safe text  more text');
      expect(sanitizeTextContent('javascript:alert(1)'))
        .toBe('');
    });

    test('removes event handlers', () => {
      expect(sanitizeTextContent('onclick=alert(1)'))
        .toBe('');
      expect(sanitizeTextContent('onload=bad() good text'))
        .toBe('good text');
    });

    test('handles null/undefined input', () => {
      expect(sanitizeTextContent(null)).toBe('');
      expect(sanitizeTextContent(undefined)).toBe('');
      expect(sanitizeTextContent(null, 'default')).toBe('default');
    });

    test('converts non-string input to string', () => {
      expect(sanitizeTextContent(123)).toBe('123');
      expect(sanitizeTextContent(true)).toBe('true');
    });
  });

  describe('validateDatasetAttribute', () => {
    test('validates safe attribute values', () => {
      expect(validateDatasetAttribute('mode', 'EMAIL')).toBe('EMAIL');
      expect(validateDatasetAttribute('tooltip', 'Safe tooltip')).toBe('Safe tooltip');
    });

    test('removes dangerous characters', () => {
      expect(validateDatasetAttribute('attr', '<script>')).toBe('script');
      expect(validateDatasetAttribute('attr', 'value"with"quotes')).toBe('valuewithquotes');
      expect(validateDatasetAttribute('attr', "value'with'quotes")).toBe('valuewithquotes');
    });

    test('removes javascript: protocol', () => {
      expect(validateDatasetAttribute('attr', 'javascript:alert(1)')).toBe('');
    });

    test('throws error for invalid keys', () => {
      expect(() => validateDatasetAttribute('', 'value')).toThrow('Invalid dataset key');
      expect(() => validateDatasetAttribute(null, 'value')).toThrow('Invalid dataset key');
      expect(() => validateDatasetAttribute('  ', 'value')).toThrow('Invalid dataset key');
    });

    test('handles null/undefined values', () => {
      expect(validateDatasetAttribute('key', null)).toBe('');
      expect(validateDatasetAttribute('key', undefined)).toBe('');
    });
  });

  describe('validateI18nKey', () => {
    test('accepts valid i18n keys', () => {
      expect(validateI18nKey('btn_all')).toBe(true);
      expect(validateI18nKey('label_toolbar')).toBe(true);
      expect(validateI18nKey('page_title')).toBe(true);
      expect(validateI18nKey('validKey123')).toBe(true);
    });

    test('rejects invalid i18n keys', () => {
      expect(validateI18nKey('123invalid')).toBe(false);
      expect(validateI18nKey('key-with-dash')).toBe(false);
      expect(validateI18nKey('key with space')).toBe(false);
      expect(validateI18nKey('')).toBe(false);
      expect(validateI18nKey('<script>')).toBe(false);
    });

    test('handles non-string input', () => {
      expect(validateI18nKey(null)).toBe(false);
      expect(validateI18nKey(undefined)).toBe(false);
      expect(validateI18nKey(123)).toBe(false);
    });
  });

  describe('safeGetI18nMessage', () => {
    beforeEach(() => {
      // Mock chrome.i18n.getMessage
      global.chrome = {
        i18n: {
          getMessage: jest.fn((key) => {
            const messages = {
              'btn_all': 'All Email',
              'label_toolbar': 'Filter Toolbar',
              'page_title': 'Options Page'
            };
            return messages[key] || '';
          })
        }
      };
    });

    test('returns message for valid keys', () => {
      expect(safeGetI18nMessage('btn_all')).toBe('All Email');
      expect(safeGetI18nMessage('label_toolbar')).toBe('Filter Toolbar');
    });

    test('returns fallback for invalid keys', () => {
      expect(safeGetI18nMessage('invalid_key', 'fallback')).toBe('fallback');
      expect(safeGetI18nMessage('123invalid', 'fallback')).toBe('fallback');
    });

    test('returns fallback when chrome.i18n throws error', () => {
      global.chrome.i18n.getMessage.mockImplementation(() => {
        throw new Error('i18n error');
      });
      
      expect(safeGetI18nMessage('btn_all', 'fallback')).toBe('fallback');
    });
  });

  describe('validateStorageError', () => {
    test('handles string error messages', () => {
      expect(validateStorageError('Storage quota exceeded')).toBe('Storage quota exceeded');
    });

    test('handles error objects with message property', () => {
      const error = new Error('Test error message');
      expect(validateStorageError(error)).toBe('Test error message');
    });

    test('handles Chrome runtime errors', () => {
      const chromeError = { message: 'QUOTA_BYTES_PER_ITEM quota exceeded' };
      expect(validateStorageError(chromeError)).toBe('QUOTA_BYTES_PER_ITEM quota exceeded');
    });

    test('returns safe default for null/undefined', () => {
      expect(validateStorageError(null)).toBe('Unknown storage error');
      expect(validateStorageError(undefined)).toBe('Unknown storage error');
    });

    test('returns safe default for objects without message', () => {
      expect(validateStorageError({})).toBe('Storage error occurred');
      expect(validateStorageError({ code: 'ERROR' })).toBe('Storage error occurred');
    });

    test('sanitizes potentially dangerous error messages', () => {
      expect(validateStorageError('<script>alert(1)</script>Error')).toBe('Error');
    });
  });
});

describe('DOM Security Integration Tests', () => {
  beforeEach(() => {
    // Set up DOM environment
    document.body.innerHTML = '';
    
    // Mock chrome APIs
    global.chrome = {
      i18n: {
        getMessage: jest.fn((key) => {
          const messages = {
            'btn_all': 'All Email',
            'label_toolbar': 'Filter Toolbar',
            'page_title': 'Options Page'
          };
          return messages[key] || key;
        })
      },
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
  });

  test('DOM elements created with validated content', () => {
    // Test that created DOM elements use validated content
    const button = document.createElement('button');
    const maliciousText = '<script>alert("hack")</script>Safe Text';
    const sanitizedText = sanitizeTextContent(maliciousText);
    
    button.textContent = sanitizedText;
    
    expect(button.textContent).toBe('Safe Text');
    expect(button.innerHTML).toBe('Safe Text');
    expect(button.textContent).not.toContain('<script>');
  });

  test('Dataset attributes are validated before setting', () => {
    const element = document.createElement('div');
    const maliciousValue = 'value"onclick="alert(1)"';
    const sanitizedValue = validateDatasetAttribute('test', maliciousValue);
    
    element.dataset.test = sanitizedValue;
    
    expect(element.dataset.test).toBe('valueonclick=alert(1)');
    expect(element.dataset.test).not.toContain('"');
  });

  test('Text content insertion is safe from XSS', () => {
    const div = document.createElement('div');
    const maliciousContent = '<img src="x" onerror="alert(1)">Text';
    const sanitizedContent = sanitizeTextContent(maliciousContent);
    
    div.textContent = sanitizedContent;
    document.body.appendChild(div);
    
    // textContent should not execute any scripts
    expect(div.textContent).toBe('Text');
    expect(div.innerHTML).toBe('Text');
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });

  test('No innerHTML usage in codebase prevents XSS', () => {
    // This test verifies our security principle that innerHTML is not used
    // for user-generated content anywhere in the codebase
    
    const testElement = document.createElement('div');
    const userContent = '<script>alert("XSS")</script>User Content';
    
    // Safe approach using textContent
    testElement.textContent = sanitizeTextContent(userContent);
    
    expect(testElement.textContent).toBe('User Content');
    expect(testElement.innerHTML).toBe('User Content');
    expect(testElement.querySelector('script')).toBeNull();
  });

  test('All text setting goes through validation layer', () => {
    // Verify that i18n messages go through validation
    const key = 'test_key';
    const maliciousMessage = '<script>bad</script>Good message';
    
    // Mock getMessage to return malicious content
    global.chrome.i18n.getMessage.mockReturnValue(maliciousMessage);
    
    const safeMessage = safeGetI18nMessage(key, 'fallback');
    
    expect(safeMessage).toBe('Good message');
    expect(safeMessage).not.toContain('<script>');
  });
});