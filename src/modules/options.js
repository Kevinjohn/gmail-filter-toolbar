import { stateManager } from './stateManager.js';
import { configurationManager } from './configurationManager.js';
import {
  validateBoolean,
  sanitizeTextContent,
  safeGetI18nMessage
} from './utils/validation.js';

/**
 * Options Module - DOM Operations Security Audit
 *
 * Security Note: This module has been audited for DOM security.
 * - All DOM operations use safe methods (textContent, no innerHTML)
 * - All text content is validated and sanitized before DOM insertion
 * - Storage values are validated before use
 * - Input validation layer ensures data safety
 */

const debugCheckbox = document.getElementById('debug');
const showButtonTextCheckbox = document.getElementById('show-button-text-checkbox');

// Localize text content with validation
document.title = sanitizeTextContent(safeGetI18nMessage('page_title', 'Gmail Calendar Options'));
document.getElementById('pageTitle').textContent = sanitizeTextContent(
  safeGetI18nMessage('page_title', 'Gmail Calendar Options')
);
document.getElementById('pageDescription').textContent = sanitizeTextContent(
  safeGetI18nMessage('options_page_description', 'Configure your Gmail Calendar extension settings.')
);
document.getElementById('debugLegend').textContent = sanitizeTextContent(
  safeGetI18nMessage('options_debug_legend', 'Debug Options')
);
document.getElementById('debugLabel').textContent = sanitizeTextContent(
  safeGetI18nMessage('options_debug_label', 'Enable debug mode')
);
document.getElementById('showButtonTextLabel').textContent = sanitizeTextContent(
  safeGetI18nMessage('optionShowButtonText', 'Show button text')
);

/**
 * Save options using StateManager with validation
 * Security Note: All values are validated before saving
 */
async function save_options() {
  try {
    // Validate checkbox values before saving
    const debugValue = validateBoolean(debugCheckbox.checked, false);
    const showButtonTextValue = validateBoolean(showButtonTextCheckbox.checked, true);
    
    // Save both values using StateManager
    await stateManager.updateState({
      debugMode: debugValue,
      showButtonText: showButtonTextValue
    });
    
    console.log('Options saved successfully');
  } catch (error) {
    console.error('Error saving options:', error);
  }
}

/**
 * Restore options from StateManager with validation
 * Security Note: All storage values are validated before use
 */
async function restore_options() {
  try {
    // Initialize both StateManager and ConfigurationManager
    await Promise.all([
      stateManager.initialize(),
      configurationManager.initialize()
    ]);
    
    // Get values from StateManager with fallbacks from ConfigurationManager
    const debugValue = stateManager.get('debugMode');
    const showButtonTextValue = stateManager.get('showButtonText');
    
    // Get defaults from configuration manager
    const debugDefault = configurationManager.getDefault('debugMode');
    const showButtonTextDefault = configurationManager.getDefault('showButtonText');
    
    // Validate and set UI values
    debugCheckbox.checked = validateBoolean(debugValue, debugDefault);
    showButtonTextCheckbox.checked = validateBoolean(showButtonTextValue, showButtonTextDefault);
    
    console.log('Options restored successfully');
  } catch (error) {
    console.error('Error restoring options:', error);
    // Set safe defaults on error (use configuration manager defaults if available)
    try {
      debugCheckbox.checked = configurationManager.getDefault('debugMode') || false;
      showButtonTextCheckbox.checked = configurationManager.getDefault('showButtonText') || true;
    } catch (configError) {
      // Final fallback to hardcoded defaults
      debugCheckbox.checked = false;
      showButtonTextCheckbox.checked = true;
    }
  }
}

// Event Listeners
debugCheckbox.addEventListener('change', save_options);
showButtonTextCheckbox.addEventListener('change', save_options);

// Load options when the page is loaded
document.addEventListener('DOMContentLoaded', restore_options);
