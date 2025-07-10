/**
 * Filter Predicates Module
 * 
 * Pure, testable functions for email filter logic.
 * All predicates are completely separated from DOM manipulation and side effects.
 * 
 * @module FilterPredicates
 */

import { MODES } from '../state.js';

/**
 * @typedef {Object} FilterContext
 * @property {Object} configurationManager - Configuration manager instance
 * @property {Function} getSelector - Function to get DOM selectors
 * @property {Object} chromeApi - Chrome API instance for i18n
 */

/**
 * Check if an email row represents a calendar event
 * @param {Element} row - The DOM element for the email row
 * @param {FilterContext} context - Filter execution context
 * @returns {boolean} True if the row is a calendar event
 */
export function isCalendarRow(row, context) {
  if (!row || !context) return false;
  
  try {
    const { getSelector, chromeApi } = context;
    
    // Check for ICS attachment
    const hasIcs = !!row.querySelector(getSelector('icsImage'));
    
    // Check for calendar event icon with localized alt text
    const calendarEventAltText = chromeApi.i18n.getMessage('alt_calendar_event');
    const hasCalendarEventIcon = !!row.querySelector(`img[alt="${calendarEventAltText}"]`);
    
    return hasIcs || hasCalendarEventIcon;
  } catch (error) {
    console.warn('Error in isCalendarRow predicate:', error);
    return false;
  }
}

/**
 * Check if an email row has Google Drive attachments
 * @param {Element} row - The DOM element for the email row
 * @param {FilterContext} context - Filter execution context
 * @returns {boolean} True if the row has Google Drive attachments
 */
export function isGoogleDocAttachment(row, context) {
  if (!row || !context) return false;
  
  try {
    const { getSelector } = context;
    const attachmentChips = row.querySelectorAll(getSelector('attachmentChip'));
    
    for (const chip of attachmentChips) {
      const gdriveLink = chip.getAttribute('data-docurl');
      if (gdriveLink && gdriveLink.includes('google.com')) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.warn('Error in isGoogleDocAttachment predicate:', error);
    return false;
  }
}

/**
 * Check if an email row has any type of attachment
 * @param {Element} row - The DOM element for the email row
 * @param {FilterContext} context - Filter execution context
 * @returns {boolean} True if the row has attachments
 */
export function hasAttachmentRow(row, context) {
  if (!row || !context) return false;
  
  try {
    const { configurationManager, getSelector } = context;
    
    // Check for attachment row class
    const attachmentRowClass = configurationManager.getClassName('attachmentRowClass');
    const hasBywClass = row.classList.contains(attachmentRowClass);
    
    // Check for attachment indicators
    const hasAttachmentTooltip = !!row.querySelector(getSelector('attachmentTooltip'));
    const hasPaperclipIcon = !!row.querySelector(getSelector('attachmentIcon'));
    
    // Check for Google Drive attachments
    const hasGoogleDoc = isGoogleDocAttachment(row, context);
    
    return hasBywClass || hasAttachmentTooltip || hasPaperclipIcon || hasGoogleDoc;
  } catch (error) {
    console.warn('Error in hasAttachmentRow predicate:', error);
    return false;
  }
}

/**
 * Check if an email row is starred/favourited
 * @param {Element} row - The DOM element for the email row
 * @param {FilterContext} context - Filter execution context
 * @returns {boolean} True if the row is starred
 */
export function isFavouriteRow(row, context) {
  if (!row || !context) return false;
  
  try {
    const { chromeApi } = context;
    const starredAltText = chromeApi.i18n.getMessage('alt_starred');
    return !!row.querySelector(`span[data-tooltip="${starredAltText}"]`);
  } catch (error) {
    console.warn('Error in isFavouriteRow predicate:', error);
    return false;
  }
}

/**
 * Check if an email row contains a specific type of attachment
 * @param {Element} row - The DOM element for the email row
 * @param {string} attachmentType - The attachment type key (e.g., 'IMAGE', 'PDF')
 * @param {FilterContext} context - Filter execution context
 * @returns {boolean} True if a matching attachment is found
 */
export function hasSpecificAttachmentType(row, attachmentType, context) {
  if (!row || !attachmentType || !context) return false;
  
  try {
    const { configurationManager, getSelector } = context;
    const config = configurationManager.getAttachmentTypeConfig(attachmentType);
    
    if (!config) return false;

    const attachmentChips = row.querySelectorAll(getSelector('attachmentChip'));

    for (const chip of attachmentChips) {
      // Check for standard attachments by file extension
      const title = chip.getAttribute('title') || chip.querySelector('span')?.textContent;
      if (title) {
        const parts = title.split('.');
        const extension = parts.length > 1 ? parts.pop().toLowerCase() : '';
        if (config.extensions.includes(extension)) {
          return true;
        }
      }

      // Check for Google Drive attachments by image src
      const gdriveLink = chip.getAttribute('data-docurl');
      if (gdriveLink && gdriveLink.includes('google.com')) {
        const img = chip.querySelector('img');
        if (img && img.src.includes(config.gdriveIdentifier)) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.warn('Error in hasSpecificAttachmentType predicate:', error);
    return false;
  }
}

/**
 * Composite predicate that combines multiple conditions with AND logic
 * @param {Element} row - The DOM element for the email row
 * @param {Array<Function>} predicates - Array of predicate functions
 * @param {FilterContext} context - Filter execution context
 * @returns {boolean} True if all predicates return true
 */
export function andPredicates(row, predicates, context) {
  if (!row || !Array.isArray(predicates) || !context) return false;
  
  try {
    return predicates.every(predicate => predicate(row, context));
  } catch (error) {
    console.warn('Error in andPredicates:', error);
    return false;
  }
}

/**
 * Composite predicate that combines multiple conditions with OR logic
 * @param {Element} row - The DOM element for the email row
 * @param {Array<Function>} predicates - Array of predicate functions
 * @param {FilterContext} context - Filter execution context
 * @returns {boolean} True if any predicate returns true
 */
export function orPredicates(row, predicates, context) {
  if (!row || !Array.isArray(predicates) || !context) return false;
  
  try {
    return predicates.some(predicate => predicate(row, context));
  } catch (error) {
    console.warn('Error in orPredicates:', error);
    return false;
  }
}

/**
 * Negation predicate that inverts the result of another predicate
 * @param {Element} row - The DOM element for the email row
 * @param {Function} predicate - Predicate function to negate
 * @param {FilterContext} context - Filter execution context
 * @returns {boolean} Inverted result of the predicate
 */
export function notPredicate(row, predicate, context) {
  if (!row || typeof predicate !== 'function' || !context) return false;
  
  try {
    return !predicate(row, context);
  } catch (error) {
    console.warn('Error in notPredicate:', error);
    return false;
  }
}

/**
 * Create a predicate factory for specific attachment types
 * @param {string} attachmentType - The attachment type to check for
 * @returns {Function} Predicate function for the specific attachment type
 */
export function createAttachmentTypePredicate(attachmentType) {
  return function(row, context) {
    return hasSpecificAttachmentType(row, attachmentType, context);
  };
}

/**
 * Predefined attachment type predicates for common use cases
 */
export const ATTACHMENT_PREDICATES = {
  [MODES.IMAGE]: createAttachmentTypePredicate(MODES.IMAGE),
  [MODES.PDF]: createAttachmentTypePredicate(MODES.PDF),
  [MODES.DOCUMENT]: createAttachmentTypePredicate(MODES.DOCUMENT),
  [MODES.SPREADSHEET]: createAttachmentTypePredicate(MODES.SPREADSHEET),
  [MODES.PRESENTATION]: createAttachmentTypePredicate(MODES.PRESENTATION)
};

/**
 * Validate that a predicate function is properly formed
 * @param {Function} predicate - The predicate function to validate
 * @returns {boolean} True if the predicate is valid
 */
export function validatePredicate(predicate) {
  if (typeof predicate !== 'function') {
    return false;
  }
  
  // Check that the function has the expected arity (row, context)
  return predicate.length >= 2;
}

/**
 * Create a safe predicate wrapper that handles errors gracefully
 * @param {Function} predicate - The predicate function to wrap
 * @param {boolean} [defaultValue=false] - Default value to return on error
 * @returns {Function} Wrapped predicate function
 */
export function createSafePredicate(predicate, defaultValue = false) {
  if (!validatePredicate(predicate)) {
    throw new Error('Invalid predicate function provided');
  }
  
  return function safePredicate(row, context) {
    try {
      return predicate(row, context);
    } catch (error) {
      console.warn('Safe predicate caught error:', error);
      return defaultValue;
    }
  };
}

/**
 * Performance wrapper for predicates that adds timing metrics
 * @param {Function} predicate - The predicate function to wrap
 * @param {string} name - Name for performance tracking
 * @returns {Function} Performance-monitored predicate function
 */
export function createPerformancePredicate(predicate, name) {
  if (!validatePredicate(predicate)) {
    throw new Error('Invalid predicate function provided');
  }
  
  return function performancePredicate(row, context) {
    const startTime = performance.now();
    try {
      const result = predicate(row, context);
      const endTime = performance.now();
      
      // Log slow predicates (>1ms)
      if (endTime - startTime > 1) {
        console.debug(`Slow predicate ${name}: ${endTime - startTime}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      console.warn(`Predicate ${name} error after ${endTime - startTime}ms:`, error);
      throw error;
    }
  };
}