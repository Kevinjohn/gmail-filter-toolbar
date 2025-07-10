/**
 * Constants Module - Configuration Bridge
 *
 * This module now serves as a bridge to the ConfigurationManager,
 * providing backward compatibility while centralizing all configurations.
 *
 * @deprecated These exports are provided for backward compatibility.
 * New code should use ConfigurationManager directly.
 */

import {
  configurationManager,
  getSelector,
  getClassName,
  getAttachmentConfig
} from './configurationManager.js';

// Legacy exports for backward compatibility
export const SHOW_BUTTON_TEXT_KEY = 'showButtonText';

/**
 * @deprecated Use configurationManager.getAllAttachmentTypes() instead
 */
export const ATTACHMENT_TYPE_CONFIG = new Proxy({}, {
  get(_target, prop) {
    return configurationManager.getAttachmentTypeConfig(prop);
  },
  ownKeys(_target) {
    return Object.keys(configurationManager.getAllAttachmentTypes());
  },
  has(_target, prop) {
    return configurationManager.getAttachmentTypeConfig(prop) !== null;
  }
});

/**
 * @deprecated Use configurationManager.getSelector() or getSelector() helper instead
 */
export const SELECTORS = new Proxy({}, {
  get(_target, prop) {
    const selectorConfig = configurationManager.getSelector(prop);
    if (selectorConfig) {
      return selectorConfig.selector;
    }
    
    // Handle special cases for legacy compatibility
    switch (prop) {
      case 'attachmentRowClass':
        return configurationManager.getClassName('attachmentRowClass');
      default:
        return undefined;
    }
  },
  ownKeys(_target) {
    const selectors = Object.keys(configurationManager.getAllSelectors());
    selectors.push('attachmentRowClass'); // Add special case
    return selectors;
  },
  has(_target, prop) {
    return configurationManager.getSelector(prop) !== null ||
           prop === 'attachmentRowClass';
  }
});

// Re-export configuration utilities for convenience
export {
  configurationManager,
  getSelector,
  getClassName,
  getAttachmentConfig
};
