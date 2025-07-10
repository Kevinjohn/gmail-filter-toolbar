/**
 * Configuration Manager - Centralized Configuration System
 * 
 * This module provides a single source of truth for all extension configurations,
 * including button configurations, filter settings, UI configurations, and system settings.
 * 
 * Features:
 * - Centralized configuration management
 * - Type-safe configuration access via JSDoc interfaces
 * - JSON schema validation
 * - Hot-reload support for runtime configuration updates
 * - Integration with StateManager
 */

import { stateManager } from './stateManager.js';

/**
 * @typedef {Object} AttachmentTypeConfig
 * @property {string[]} extensions - File extensions for this attachment type
 * @property {string} gdriveIdentifier - Google Drive icon identifier
 * @property {string} icon - Material Icons name
 * @property {string} labelKey - i18n message key for the button label
 */

/**
 * @typedef {Object} FilterModeConfig
 * @property {string} icon - Material Icons name for the button
 * @property {string} labelKey - i18n message key for the button label
 * @property {Function} filterFn - Filter function that returns true to hide email row
 * @property {string} [description] - Optional description for the filter mode
 */

/**
 * @typedef {Object} SelectorConfig
 * @property {string} selector - CSS selector string
 * @property {string} [description] - Optional description of what the selector targets
 * @property {string[]} [fallbacks] - Optional fallback selectors
 */

/**
 * @typedef {Object} UIConfig
 * @property {Object<string, SelectorConfig>} selectors - CSS selectors for Gmail elements
 * @property {Object} classes - CSS class names used by the extension
 * @property {Object} aria - ARIA-related configuration
 * @property {Object} animations - Animation and transition settings
 */

/**
 * @typedef {Object} SystemConfig
 * @property {Object} storage - Storage keys and defaults
 * @property {Object} defaults - Default values for various settings
 * @property {Object} validation - Validation rules and schemas
 * @property {Object} performance - Performance-related settings
 */

/**
 * @typedef {Object} ExtensionConfiguration
 * @property {Object<string, AttachmentTypeConfig>} attachmentTypes - Attachment type configurations
 * @property {Object<string, FilterModeConfig>} filterModes - Filter mode configurations
 * @property {UIConfig} ui - UI-related configurations
 * @property {SystemConfig} system - System-wide configurations
 * @property {string} version - Configuration schema version
 */

/**
 * Configuration Schema for validation
 */
const CONFIGURATION_SCHEMA = {
  type: 'object',
  required: ['attachmentTypes', 'filterModes', 'ui', 'system', 'version'],
  properties: {
    version: { type: 'string', pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+$' },
    attachmentTypes: {
      type: 'object',
      patternProperties: {
        '^[A-Z_]+$': {
          type: 'object',
          required: ['extensions', 'gdriveIdentifier', 'icon', 'labelKey'],
          properties: {
            extensions: { type: 'array', items: { type: 'string' } },
            gdriveIdentifier: { type: 'string' },
            icon: { type: 'string' },
            labelKey: { type: 'string' }
          }
        }
      }
    },
    filterModes: {
      type: 'object',
      patternProperties: {
        '^[A-Z_]+$': {
          type: 'object',
          required: ['icon', 'labelKey'],
          properties: {
            icon: { type: 'string' },
            labelKey: { type: 'string' },
            description: { type: 'string' }
          }
        }
      }
    },
    ui: {
      type: 'object',
      required: ['selectors', 'classes', 'aria'],
      properties: {
        selectors: { type: 'object' },
        classes: { type: 'object' },
        aria: { type: 'object' }
      }
    },
    system: {
      type: 'object',
      required: ['storage', 'defaults'],
      properties: {
        storage: { type: 'object' },
        defaults: { type: 'object' }
      }
    }
  }
};

/**
 * Default Extension Configuration
 * @type {ExtensionConfiguration}
 */
const DEFAULT_CONFIGURATION = {
  version: '1.0.0',
  
  // Consolidated attachment type configurations
  attachmentTypes: {
    IMAGE: {
      extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
      gdriveIdentifier: 'icon_1_image',
      icon: 'image',
      labelKey: 'button_filter_images',
    },
    PDF: {
      extensions: ['pdf'],
      gdriveIdentifier: 'icon_1_pdf',
      icon: 'picture_as_pdf',
      labelKey: 'button_filter_pdfs',
    },
    DOCUMENT: {
      extensions: ['doc', 'docx', 'rtf', 'txt', 'odt'],
      gdriveIdentifier: 'icon_1_document',
      icon: 'article',
      labelKey: 'button_filter_documents',
    },
    SPREADSHEET: {
      extensions: ['xls', 'xlsx', 'csv', 'ods'],
      gdriveIdentifier: 'icon_1_spreadsheet',
      icon: 'assessment',
      labelKey: 'button_filter_spreadsheets',
    },
    PRESENTATION: {
      extensions: ['ppt', 'pptx', 'odp'],
      gdriveIdentifier: 'icon_1_presentation',
      icon: 'slideshow',
      labelKey: 'button_filter_presentations',
    },
  },
  
  // Consolidated filter mode configurations
  filterModes: {
    ALL: {
      icon: 'inbox',
      labelKey: 'btn_all',
      description: 'Show all emails',
    },
    EMAIL: {
      icon: 'mail',
      labelKey: 'btn_mail',
      description: 'Show only regular emails (hide calendar events)',
    },
    CALENDAR: {
      icon: 'calendar_today',
      labelKey: 'btn_cal',
      description: 'Show only calendar events',
    },
    ATTACH: {
      icon: 'attachment',
      labelKey: 'btn_attach',
      description: 'Show only emails with attachments',
    },
    FAVOURITES: {
      icon: 'star',
      labelKey: 'btn_fav',
      description: 'Show only starred emails',
    },
    IMAGE: {
      icon: 'image',
      labelKey: 'button_filter_images',
      description: 'Show only emails with image attachments',
    },
    PDF: {
      icon: 'picture_as_pdf',
      labelKey: 'button_filter_pdfs',
      description: 'Show only emails with PDF attachments',
    },
    DOCUMENT: {
      icon: 'article',
      labelKey: 'button_filter_documents',
      description: 'Show only emails with document attachments',
    },
    SPREADSHEET: {
      icon: 'assessment',
      labelKey: 'button_filter_spreadsheets',
      description: 'Show only emails with spreadsheet attachments',
    },
    PRESENTATION: {
      icon: 'slideshow',
      labelKey: 'button_filter_presentations',
      description: 'Show only emails with presentation attachments',
    },
  },
  
  // UI Configuration
  ui: {
    selectors: {
      gmailToolbar: {
        selector: '.G-atb .G6[role="toolbar"]',
        description: 'Primary Gmail toolbar (newer versions)',
        fallbacks: ['.G-atb[role="toolbar"]', 'div[aria-label="Main toolbar"]']
      },
      gmailToolbarLegacy: {
        selector: '.G-atb[role="toolbar"]',
        description: 'Gmail toolbar (older versions/fallback)',
      },
      gmailToolbarAria: {
        selector: 'div[aria-label="Main toolbar"]',
        description: 'Gmail toolbar using ARIA label (alternative fallback)',
      },
      gmailToolbarHeader: {
        selector: '.aeH',
        description: 'Header element containing the Gmail toolbar',
      },
      emailRow: {
        selector: '.UI tr.zA',
        description: 'Individual email rows in the Gmail message list',
      },
      emailSubject: {
        selector: '.bog',
        description: 'Email subject line within an email row',
      },
      emailList: {
        selector: '.UI',
        description: 'Main email list container',
      },
      attachmentRow: {
        selector: 'div.brd',
        description: 'Container of all attachments in a row',
      },
      attachmentChip: {
        selector: 'div.brc',
        description: 'Individual attachment chip within an attachment row',
      },
      attachmentIcon: {
        selector: 'img.aSK',
        description: 'Attachment icon within an email row',
      },
      attachmentTooltip: {
        selector: '[data-tooltip="Has attachment"]',
        description: 'Tooltip indicating an email has an attachment',
      },
      icsImage: {
        selector: 'img[alt*=".ics"]',
        description: 'Image indicating an ICS (calendar) attachment',
      },
      filterBar: {
        selector: '.gcal-filter-bar',
        description: 'Custom filter bar injected by the extension',
      },
      filterWrapper: {
        selector: '.gcal-filter-wrapper',
        description: 'Wrapper element around the custom filter bar',
      },
      filterButtons: {
        selector: '.gcal-filter-bar button[data-mode]',
        description: 'Filter buttons within the custom toolbar',
      },
      liveRegion: {
        selector: '.gcal-live-region',
        description: 'ARIA live region for accessibility announcements',
      },
    },
    
    classes: {
      attachmentRowClass: 'byw',
      filterBarClass: 'gcal-filter-bar',
      filterWrapperClass: 'gcal-filter-wrapper',
      buttonGroupClass: 'gcal-btn-group',
      labelClass: 'gcal-label',
      textLabelClass: 'gcal-text-label',
      liveRegionClass: 'gcal-live-region',
      visuallyHiddenClass: 'visually-hidden',
      showIconOnlyClass: 'show-icon-only',
    },
    
    aria: {
      toolbarLabel: 'Gmail Calendar Filter Toolbar',
      radioGroupRole: 'radiogroup',
      radioRole: 'radio',
      statusRole: 'status',
      livePolite: 'polite',
      filterOptionsLabel: 'Filter Options',
    },
    
    animations: {
      transitionDuration: '150ms',
      fadeInDuration: '200ms',
      slideInDuration: '300ms',
    },
  },
  
  // System Configuration
  system: {
    storage: {
      filterModeKey: 'gmailCalMode',
      debugModeKey: 'gmailCalDebug',
      showButtonTextKey: 'showButtonText',
      configVersionKey: 'configVersion',
    },
    
    defaults: {
      filterMode: 'ALL',
      debugMode: false,
      showButtonText: true,
      configVersion: '1.0.0',
    },
    
    validation: {
      enableRuntimeValidation: true,
      strictMode: false,
      logValidationErrors: true,
    },
    
    performance: {
      debounceDelay: 150,
      maxRetries: 3,
      cacheTimeout: 300000, // 5 minutes
    },
  },
};

/**
 * Configuration Manager Class
 */
class ConfigurationManager {
  constructor() {
    /** @type {ExtensionConfiguration} */
    this._config = null;
    this._isInitialized = false;
    this._changeListeners = new Set();
    this._hotReloadEnabled = false;
  }

  /**
   * Initialize the configuration manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._isInitialized) {
      return;
    }

    try {
      // Load configuration from storage or use defaults
      await this._loadConfiguration();
      
      // Validate the loaded configuration
      if (!this._validateConfiguration(this._config)) {
        console.warn('Configuration validation failed, using defaults');
        this._config = { ...DEFAULT_CONFIGURATION };
      }
      
      // Set up hot-reload if enabled
      if (this._hotReloadEnabled) {
        this._setupHotReload();
      }
      
      this._isInitialized = true;
      console.log('ConfigurationManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ConfigurationManager:', error);
      this._config = { ...DEFAULT_CONFIGURATION };
      this._isInitialized = true;
    }
  }

  /**
   * Get attachment type configuration
   * @param {string} attachmentType - The attachment type key
   * @returns {AttachmentTypeConfig|null}
   */
  getAttachmentTypeConfig(attachmentType) {
    this._ensureInitialized();
    return this._config.attachmentTypes[attachmentType] || null;
  }

  /**
   * Get all attachment type configurations
   * @returns {Object<string, AttachmentTypeConfig>}
   */
  getAllAttachmentTypes() {
    this._ensureInitialized();
    return { ...this._config.attachmentTypes };
  }

  /**
   * Get filter mode configuration
   * @param {string} mode - The filter mode key
   * @returns {FilterModeConfig|null}
   */
  getFilterModeConfig(mode) {
    this._ensureInitialized();
    return this._config.filterModes[mode] || null;
  }

  /**
   * Get all filter mode configurations
   * @returns {Object<string, FilterModeConfig>}
   */
  getAllFilterModes() {
    this._ensureInitialized();
    return { ...this._config.filterModes };
  }

  /**
   * Get UI selector configuration
   * @param {string} selectorName - The selector name
   * @returns {SelectorConfig|null}
   */
  getSelector(selectorName) {
    this._ensureInitialized();
    return this._config.ui.selectors[selectorName] || null;
  }

  /**
   * Get all UI selectors
   * @returns {Object<string, SelectorConfig>}
   */
  getAllSelectors() {
    this._ensureInitialized();
    return { ...this._config.ui.selectors };
  }

  /**
   * Get CSS class name
   * @param {string} className - The class name key
   * @returns {string|null}
   */
  getClassName(className) {
    this._ensureInitialized();
    return this._config.ui.classes[className] || null;
  }

  /**
   * Get ARIA configuration
   * @param {string} ariaKey - The ARIA configuration key
   * @returns {string|null}
   */
  getAriaConfig(ariaKey) {
    this._ensureInitialized();
    return this._config.ui.aria[ariaKey] || null;
  }

  /**
   * Get system configuration value
   * @param {string} key - The system configuration key
   * @returns {any}
   */
  getSystemConfig(key) {
    this._ensureInitialized();
    const keyParts = key.split('.');
    let value = this._config.system;
    
    for (const part of keyParts) {
      value = value[part];
      if (value === undefined) {
        return null;
      }
    }
    
    return value;
  }

  /**
   * Get default value for a setting
   * @param {string} setting - The setting name
   * @returns {any}
   */
  getDefault(setting) {
    this._ensureInitialized();
    return this._config.system.defaults[setting];
  }

  /**
   * Update configuration at runtime
   * @param {string} path - The configuration path (e.g., 'ui.classes.newClass')
   * @param {any} value - The new value
   * @returns {Promise<void>}
   */
  async updateConfiguration(path, value) {
    this._ensureInitialized();
    
    // Validate that the path exists in the configuration structure
    if (!this._isValidConfigurationPath(path)) {
      throw new Error(`Invalid configuration path: ${path}`);
    }
    
    const pathParts = path.split('.');
    let target = this._config;
    
    // Navigate to the parent object
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!target[pathParts[i]]) {
        throw new Error(`Invalid configuration path: ${path}`);
      }
      target = target[pathParts[i]];
    }
    
    // Set the value
    const lastKey = pathParts[pathParts.length - 1];
    const oldValue = target[lastKey];
    target[lastKey] = value;
    
    // Validate the updated configuration
    if (!this._validateConfiguration(this._config)) {
      // Revert the change if validation fails
      target[lastKey] = oldValue;
      throw new Error(`Configuration validation failed for path: ${path}`);
    }
    
    // Persist the configuration
    await this._saveConfiguration();
    
    // Notify listeners
    this._notifyConfigurationChange(path, oldValue, value);
  }

  /**
   * Enable hot-reload functionality
   */
  enableHotReload() {
    this._hotReloadEnabled = true;
    if (this._isInitialized) {
      this._setupHotReload();
    }
  }

  /**
   * Disable hot-reload functionality
   */
  disableHotReload() {
    this._hotReloadEnabled = false;
  }

  /**
   * Add a configuration change listener
   * @param {Function} listener - The listener function
   */
  addChangeListener(listener) {
    this._changeListeners.add(listener);
  }

  /**
   * Remove a configuration change listener
   * @param {Function} listener - The listener function
   */
  removeChangeListener(listener) {
    this._changeListeners.delete(listener);
  }

  /**
   * Get the current configuration
   * @returns {ExtensionConfiguration}
   */
  getConfiguration() {
    this._ensureInitialized();
    return { ...this._config };
  }

  /**
   * Validate the entire configuration
   * @returns {boolean}
   */
  validateConfiguration() {
    this._ensureInitialized();
    return this._validateConfiguration(this._config);
  }

  /**
   * Reset configuration to defaults
   * @returns {Promise<void>}
   */
  async resetToDefaults() {
    this._config = { ...DEFAULT_CONFIGURATION };
    await this._saveConfiguration();
    this._notifyConfigurationChange('*', null, this._config);
  }

  /**
   * Export configuration for backup
   * @returns {string}
   */
  exportConfiguration() {
    this._ensureInitialized();
    return JSON.stringify(this._config, null, 2);
  }

  /**
   * Import configuration from backup
   * @param {string} configString - The configuration JSON string
   * @returns {Promise<void>}
   */
  async importConfiguration(configString) {
    try {
      const newConfig = JSON.parse(configString);
      
      if (!this._validateConfiguration(newConfig)) {
        throw new Error('Invalid configuration format');
      }
      
      const oldConfig = this._config;
      this._config = newConfig;
      await this._saveConfiguration();
      this._notifyConfigurationChange('*', oldConfig, newConfig);
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error.message}`);
    }
  }

  // Private methods

  /**
   * Ensure the configuration manager is initialized
   * @private
   */
  _ensureInitialized() {
    if (!this._isInitialized) {
      throw new Error('ConfigurationManager must be initialized before use');
    }
  }

  /**
   * Load configuration from storage
   * @private
   * @returns {Promise<void>}
   */
  async _loadConfiguration() {
    try {
      // Try to load from StateManager first
      await stateManager.initialize();
      const storedVersion = stateManager.get('configVersion');
      
      if (storedVersion === DEFAULT_CONFIGURATION.version) {
        // Configuration is current, use defaults
        this._config = { ...DEFAULT_CONFIGURATION };
      } else {
        // Configuration might be outdated, use defaults and update version
        this._config = { ...DEFAULT_CONFIGURATION };
        await stateManager.set('configVersion', DEFAULT_CONFIGURATION.version);
      }
    } catch (error) {
      console.warn('Failed to load configuration from storage:', error);
      this._config = { ...DEFAULT_CONFIGURATION };
    }
  }

  /**
   * Save configuration to storage
   * @private
   * @returns {Promise<void>}
   */
  async _saveConfiguration() {
    try {
      await stateManager.set('configVersion', this._config.version);
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }

  /**
   * Validate configuration against schema
   * @private
   * @param {any} config - The configuration to validate
   * @returns {boolean}
   */
  _validateConfiguration(config) {
    if (!config || typeof config !== 'object') {
      return false;
    }
    
    try {
      // Basic structure validation
      const requiredKeys = ['version', 'attachmentTypes', 'filterModes', 'ui', 'system'];
      return requiredKeys.every(key => key in config);
    } catch (error) {
      console.error('Configuration validation error:', error);
      return false;
    }
  }

  /**
   * Check if a configuration path is valid
   * @private
   * @param {string} path - The configuration path to validate
   * @returns {boolean}
   */
  _isValidConfigurationPath(path) {
    const pathParts = path.split('.');
    let target = this._config;
    
    for (const part of pathParts) {
      if (!target || typeof target !== 'object' || !(part in target)) {
        return false;
      }
      target = target[part];
    }
    
    return true;
  }

  /**
   * Set up hot-reload functionality
   * @private
   */
  _setupHotReload() {
    // Listen for storage changes that might indicate configuration updates
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.configVersion) {
          this._handleConfigurationReload();
        }
      });
    }
  }

  /**
   * Handle configuration reload
   * @private
   */
  async _handleConfigurationReload() {
    try {
      const oldConfig = this._config;
      await this._loadConfiguration();
      
      if (this._validateConfiguration(this._config)) {
        this._notifyConfigurationChange('*', oldConfig, this._config);
        console.log('Configuration hot-reloaded successfully');
      }
    } catch (error) {
      console.error('Failed to hot-reload configuration:', error);
    }
  }

  /**
   * Notify listeners of configuration changes
   * @private
   * @param {string} path - The changed path
   * @param {any} oldValue - The old value
   * @param {any} newValue - The new value
   */
  _notifyConfigurationChange(path, oldValue, newValue) {
    const changeEvent = { path, oldValue, newValue, timestamp: Date.now() };
    
    this._changeListeners.forEach(listener => {
      try {
        listener(changeEvent);
      } catch (error) {
        console.error('Error in configuration change listener:', error);
      }
    });
  }
}

// Create and export the singleton instance
export const configurationManager = new ConfigurationManager();

// Export configuration-related constants and utilities
export { DEFAULT_CONFIGURATION, CONFIGURATION_SCHEMA };

/**
 * Utility function to get a selector string safely
 * @param {string} selectorName - The selector name
 * @returns {string}
 */
export function getSelector(selectorName) {
  const selectorConfig = configurationManager.getSelector(selectorName);
  return selectorConfig ? selectorConfig.selector : '';
}

/**
 * Utility function to get a class name safely
 * @param {string} className - The class name key
 * @returns {string}
 */
export function getClassName(className) {
  return configurationManager.getClassName(className) || '';
}

/**
 * Utility function to get attachment type configuration safely
 * @param {string} attachmentType - The attachment type
 * @returns {AttachmentTypeConfig|null}
 */
export function getAttachmentConfig(attachmentType) {
  return configurationManager.getAttachmentTypeConfig(attachmentType);
}

/**
 * Utility function to get filter mode configuration safely
 * @param {string} mode - The filter mode
 * @returns {FilterModeConfig|null}
 */
export function getFilterConfig(mode) {
  return configurationManager.getFilterModeConfig(mode);
}

// Initialize configuration manager when module loads
configurationManager.initialize().catch(error => {
  console.error('Failed to initialize ConfigurationManager:', error);
});