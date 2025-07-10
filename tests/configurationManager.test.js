/**
 * Configuration Manager Test Suite
 */

import { configurationManager, getSelector, getClassName, getAttachmentConfig, getFilterConfig } from '../src/modules/configurationManager.js';

describe('ConfigurationManager', () => {
  beforeEach(async () => {
    // Reset the configuration manager state
    configurationManager._isInitialized = false;
    configurationManager._config = null;
    configurationManager._changeListeners = new Set();
    
    // Initialize the configuration manager before each test
    await configurationManager.initialize();
    
    // Reset to defaults to ensure clean state
    await configurationManager.resetToDefaults();
  });

  afterEach(() => {
    // Clean up after each test
    configurationManager._isInitialized = false;
    configurationManager._config = null;
    configurationManager._changeListeners = new Set();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      expect(configurationManager.validateConfiguration()).toBe(true);
    });

    test('should have valid configuration structure', () => {
      const config = configurationManager.getConfiguration();
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('attachmentTypes');
      expect(config).toHaveProperty('filterModes');
      expect(config).toHaveProperty('ui');
      expect(config).toHaveProperty('system');
    });
  });

  describe('Attachment Type Configuration', () => {
    test('should retrieve attachment type configurations', () => {
      const imageConfig = configurationManager.getAttachmentTypeConfig('IMAGE');
      expect(imageConfig).toBeDefined();
      expect(imageConfig).toHaveProperty('extensions');
      expect(imageConfig).toHaveProperty('gdriveIdentifier');
      expect(imageConfig).toHaveProperty('icon');
      expect(imageConfig).toHaveProperty('labelKey');
      expect(Array.isArray(imageConfig.extensions)).toBe(true);
    });

    test('should return null for invalid attachment type', () => {
      const invalidConfig = configurationManager.getAttachmentTypeConfig('INVALID');
      expect(invalidConfig).toBeNull();
    });

    test('should return all attachment types', () => {
      const allTypes = configurationManager.getAllAttachmentTypes();
      expect(allTypes).toHaveProperty('IMAGE');
      expect(allTypes).toHaveProperty('PDF');
      expect(allTypes).toHaveProperty('DOCUMENT');
      expect(allTypes).toHaveProperty('SPREADSHEET');
      expect(allTypes).toHaveProperty('PRESENTATION');
    });
  });

  describe('Filter Mode Configuration', () => {
    test('should retrieve filter mode configurations', () => {
      const allConfig = configurationManager.getFilterModeConfig('ALL');
      expect(allConfig).toBeDefined();
      expect(allConfig).toHaveProperty('icon');
      expect(allConfig).toHaveProperty('labelKey');
      expect(allConfig.icon).toBe('inbox');
      expect(allConfig.labelKey).toBe('btn_all');
    });

    test('should return null for invalid filter mode', () => {
      const invalidConfig = configurationManager.getFilterModeConfig('INVALID');
      expect(invalidConfig).toBeNull();
    });

    test('should return all filter modes', () => {
      const allModes = configurationManager.getAllFilterModes();
      expect(allModes).toHaveProperty('ALL');
      expect(allModes).toHaveProperty('EMAIL');
      expect(allModes).toHaveProperty('CALENDAR');
      expect(allModes).toHaveProperty('ATTACH');
      expect(allModes).toHaveProperty('FAVOURITES');
    });
  });

  describe('UI Configuration', () => {
    test('should retrieve selector configurations', () => {
      const emailRowSelector = configurationManager.getSelector('emailRow');
      expect(emailRowSelector).toBeDefined();
      expect(emailRowSelector).toHaveProperty('selector');
      expect(emailRowSelector.selector).toBe('.UI tr.zA');
    });

    test('should return null for invalid selector', () => {
      const invalidSelector = configurationManager.getSelector('invalidSelector');
      expect(invalidSelector).toBeNull();
    });

    test('should retrieve class names', () => {
      const filterBarClass = configurationManager.getClassName('filterBarClass');
      expect(filterBarClass).toBe('gcal-filter-bar');
    });

    test('should retrieve ARIA configurations', () => {
      const toolbarLabel = configurationManager.getAriaConfig('toolbarLabel');
      expect(toolbarLabel).toBe('Gmail Calendar Filter Toolbar');
    });
  });

  describe('System Configuration', () => {
    test('should retrieve system configuration values', () => {
      const debugDefault = configurationManager.getSystemConfig('defaults.debugMode');
      expect(debugDefault).toBe(false);
      
      const debounceDelay = configurationManager.getSystemConfig('performance.debounceDelay');
      expect(debounceDelay).toBe(150);
    });

    test('should retrieve default values', () => {
      const filterModeDefault = configurationManager.getDefault('filterMode');
      expect(filterModeDefault).toBe('ALL');
      
      const showButtonTextDefault = configurationManager.getDefault('showButtonText');
      expect(showButtonTextDefault).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration at runtime', async () => {
      const originalValue = configurationManager.getSystemConfig('performance.debounceDelay');
      const newValue = 300;
      
      await configurationManager.updateConfiguration('system.performance.debounceDelay', newValue);
      
      const updatedValue = configurationManager.getSystemConfig('performance.debounceDelay');
      expect(updatedValue).toBe(newValue);
      
      // Restore original value
      await configurationManager.updateConfiguration('system.performance.debounceDelay', originalValue);
    });

    test('should reject invalid configuration updates', async () => {
      await expect(
        configurationManager.updateConfiguration('invalid.path', 'value')
      ).rejects.toThrow();
    });
  });

  describe('Change Listeners', () => {
    test('should notify listeners on configuration changes', async () => {
      let listenerCalled = false;
      let lastCallArgs = null;
      
      const listener = (changeEvent) => {
        listenerCalled = true;
        lastCallArgs = changeEvent;
      };
      
      configurationManager.addChangeListener(listener);
      
      await configurationManager.updateConfiguration('system.performance.debounceDelay', 250);
      
      expect(listenerCalled).toBe(true);
      expect(lastCallArgs).toMatchObject({
        path: 'system.performance.debounceDelay',
        newValue: 250
      });
      
      configurationManager.removeChangeListener(listener);
    });
  });

  describe('Export/Import', () => {
    test('should export configuration as JSON', () => {
      const exported = configurationManager.exportConfiguration();
      expect(() => JSON.parse(exported)).not.toThrow();
      
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('attachmentTypes');
      expect(parsed).toHaveProperty('filterModes');
    });

    test('should import valid configuration', async () => {
      // First set a known value
      await configurationManager.updateConfiguration('system.performance.debounceDelay', 150);
      const originalConfig = configurationManager.getConfiguration();
      const exportedConfig = configurationManager.exportConfiguration();
      
      // Modify the configuration to a different value
      await configurationManager.updateConfiguration('system.performance.debounceDelay', 500);
      
      // Verify the value was changed
      const modifiedConfig = configurationManager.getConfiguration();
      expect(modifiedConfig.system.performance.debounceDelay).toBe(500);
      
      // Import the original configuration
      await configurationManager.importConfiguration(exportedConfig);
      
      const restoredConfig = configurationManager.getConfiguration();
      expect(restoredConfig.system.performance.debounceDelay).toBe(150);
    });

    test('should reject invalid configuration import', async () => {
      const invalidConfig = '{"invalid": "structure"}';
      
      await expect(
        configurationManager.importConfiguration(invalidConfig)
      ).rejects.toThrow();
    });
  });

  describe('Utility Functions', () => {
    test('getSelector should return selector string', () => {
      const selector = getSelector('emailRow');
      expect(selector).toBe('.UI tr.zA');
    });

    test('getClassName should return class name', () => {
      const className = getClassName('filterBarClass');
      expect(className).toBe('gcal-filter-bar');
    });

    test('getAttachmentConfig should return attachment configuration', () => {
      const config = getAttachmentConfig('IMAGE');
      expect(config).toBeDefined();
      expect(config.icon).toBe('image');
    });

    test('getFilterConfig should return filter mode configuration', () => {
      const config = getFilterConfig('ALL');
      expect(config).toBeDefined();
      expect(config.icon).toBe('inbox');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing selectors gracefully', () => {
      const result = getSelector('nonExistentSelector');
      expect(result).toBe('');
    });

    test('should handle missing class names gracefully', () => {
      const result = getClassName('nonExistentClass');
      expect(result).toBe('');
    });

    test('should handle missing attachment configs gracefully', () => {
      const result = getAttachmentConfig('NONEXISTENT');
      expect(result).toBeNull();
    });

    test('should handle missing filter configs gracefully', () => {
      const result = getFilterConfig('NONEXISTENT');
      expect(result).toBeNull();
    });
  });
});