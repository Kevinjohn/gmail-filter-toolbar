/**
 * ButtonFactory - Factory Pattern for Dynamic Button Creation
 * 
 * Provides a flexible system for creating various types of toolbar buttons
 * with different behaviors, styles, and configurations. Supports toggle buttons,
 * action buttons, dropdown buttons, and custom button types.
 * 
 * @author Chrome Extension Team
 * @version 1.0.0
 */

import { toolbarEventBus } from './ToolbarEventBus.js';
import { configurationManager } from '../configurationManager.js';
import { stateManager } from '../stateManager.js';
import { 
  sanitizeTextContent, 
  validateDatasetAttribute,
  safeGetI18nMessage 
} from '../utils/validation.js';

/**
 * @typedef {Object} ButtonConfig
 * @property {string} type - Button type (toggle, action, dropdown, custom)
 * @property {string} mode - Button mode identifier
 * @property {string} icon - Material icon name
 * @property {string} labelKey - I18n key for button label
 * @property {string} [tooltip] - Custom tooltip text
 * @property {Object} [attributes] - Additional HTML attributes
 * @property {Array<string>} [cssClasses] - Additional CSS classes
 * @property {Object} [behavior] - Button behavior configuration
 * @property {Object} [accessibility] - Accessibility configuration
 */

/**
 * @typedef {Object} ButtonCreationResult
 * @property {boolean} success - Whether creation was successful
 * @property {Element} [element] - Created button element
 * @property {ButtonConfig} [config] - Resolved button configuration
 * @property {Object} [metadata] - Creation metadata
 * @property {Error} [error] - Error if creation failed
 */

export class ButtonFactory {
  /**
   * @param {Object} domOperations - ToolbarDOMOperations instance
   * @param {Object} [options={}] - Factory configuration options
   */
  constructor(domOperations, options = {}) {
    this.domOperations = domOperations;
    
    // Configuration
    this.options = {
      enableValidation: true,
      enableMetrics: true,
      defaultButtonType: 'toggle',
      enableEventBus: true,
      ...options
    };
    
    // Button type handlers
    this.buttonTypeHandlers = new Map();
    this.customTypes = new Map();
    
    // Creation tracking
    this.creationMetrics = new Map();
    this.createdButtons = new Map();
    this.buttonCounter = 0;
    
    // Initialize default button types
    this._initializeDefaultTypes();
    
    // Bind methods
    this.createButton = this.createButton.bind(this);
    this.createButtonGroup = this.createButtonGroup.bind(this);
    
    // Subscribe to configuration changes
    this._setupConfigurationListeners();
  }

  /**
   * Create a button with specified configuration
   * @param {ButtonConfig} config - Button configuration
   * @param {Object} [options={}] - Creation options
   * @returns {Promise<ButtonCreationResult>} Creation result
   */
  async createButton(config, options = {}) {
    const startTime = performance.now();
    const buttonId = `btn_${++this.buttonCounter}_${Date.now()}`;
    
    try {
      // Validate and normalize configuration
      const normalizedConfig = await this._validateAndNormalizeConfig(config);
      
      // Get button type handler
      const typeHandler = this._getTypeHandler(normalizedConfig.type);
      if (!typeHandler) {
        throw new Error(`Unsupported button type: ${normalizedConfig.type}`);
      }
      
      // Create button using type-specific handler
      const creationResult = await typeHandler.create(normalizedConfig, {
        buttonId,
        ...options
      });
      
      if (!creationResult.success) {
        throw new Error(`Button creation failed: ${creationResult.error?.message}`);
      }
      
      // Store button reference
      this.createdButtons.set(buttonId, {
        element: creationResult.element,
        config: normalizedConfig,
        type: normalizedConfig.type,
        createdAt: Date.now()
      });
      
      // Add factory metadata to element
      creationResult.element.dataset.factoryId = buttonId;
      creationResult.element.dataset.buttonType = normalizedConfig.type;
      
      // Record metrics
      const executionTime = performance.now() - startTime;
      this._recordCreationMetric(normalizedConfig.type, executionTime, true);
      
      // Emit creation event
      if (this.options.enableEventBus) {
        await toolbarEventBus.emit('BUTTON_CREATED', {
          buttonId,
          element: creationResult.element,
          config: normalizedConfig,
          type: normalizedConfig.type
        });
      }
      
      return {
        success: true,
        element: creationResult.element,
        config: normalizedConfig,
        metadata: {
          buttonId,
          type: normalizedConfig.type,
          executionTime,
          createdAt: Date.now()
        }
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this._recordCreationMetric(config.type || 'unknown', executionTime, false);
      
      return {
        success: false,
        error,
        metadata: {
          buttonId,
          executionTime,
          failedAt: Date.now()
        }
      };
    }
  }

  /**
   * Create multiple buttons as a cohesive group
   * @param {Array<ButtonConfig>} buttonConfigs - Array of button configurations
   * @param {Object} [options={}] - Group creation options
   * @returns {Promise<Object>} Group creation result
   */
  async createButtonGroup(buttonConfigs, options = {}) {
    const startTime = performance.now();
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const {
        failFast = false,
        validateGroup = true,
        enableGroupBehavior = true
      } = options;
      
      // Validate group configuration
      if (validateGroup) {
        this._validateButtonGroup(buttonConfigs);
      }
      
      // Create all buttons
      const creationPromises = buttonConfigs.map((config, index) => 
        this.createButton(config, { 
          ...options, 
          groupId,
          groupIndex: index 
        })
      );
      
      const results = failFast 
        ? await Promise.all(creationPromises)
        : await Promise.allSettled(creationPromises);
      
      // Process results
      const successfulButtons = [];
      const failedButtons = [];
      
      results.forEach((result, index) => {
        const isSuccess = failFast ? result.success : result.status === 'fulfilled';
        const buttonResult = failFast ? result : result.value || result.reason;
        
        if (isSuccess && buttonResult?.success) {
          successfulButtons.push({
            index,
            element: buttonResult.element,
            config: buttonResult.config,
            metadata: buttonResult.metadata
          });
        } else {
          failedButtons.push({
            index,
            config: buttonConfigs[index],
            error: buttonResult?.error || buttonResult
          });
        }
      });
      
      // Add group behavior if enabled and we have successful buttons
      if (enableGroupBehavior && successfulButtons.length > 0) {
        await this._addGroupBehavior(successfulButtons, groupId, options);
      }
      
      const executionTime = performance.now() - startTime;
      
      return {
        success: failedButtons.length === 0,
        groupId,
        successfulButtons,
        failedButtons,
        metadata: {
          totalButtons: buttonConfigs.length,
          successCount: successfulButtons.length,
          failureCount: failedButtons.length,
          executionTime
        }
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      return {
        success: false,
        groupId,
        error,
        metadata: {
          totalButtons: buttonConfigs.length,
          executionTime
        }
      };
    }
  }

  /**
   * Register a custom button type
   * @param {string} typeName - Custom type name
   * @param {Object} typeHandler - Type handler with create() method
   */
  registerButtonType(typeName, typeHandler) {
    if (typeof typeHandler.create !== 'function') {
      throw new Error('Button type handler must have a create() method');
    }
    
    this.customTypes.set(typeName, typeHandler);
    console.log(`Registered custom button type: ${typeName}`);
  }

  /**
   * Update button state
   * @param {string|Element} buttonIdentifier - Button ID or element
   * @param {Object} stateUpdate - State update object
   * @returns {Promise<boolean>} Success status
   */
  async updateButtonState(buttonIdentifier, stateUpdate) {
    try {
      const buttonData = this._resolveButtonData(buttonIdentifier);
      if (!buttonData) {
        throw new Error('Button not found');
      }
      
      const { element, config } = buttonData;
      const typeHandler = this._getTypeHandler(config.type);
      
      if (typeHandler.updateState) {
        await typeHandler.updateState(element, stateUpdate, config);
      }
      
      // Emit state change event
      if (this.options.enableEventBus) {
        await toolbarEventBus.emit('BUTTON_STATE_CHANGED', {
          element,
          config,
          stateUpdate
        });
      }
      
      return true;
      
    } catch (error) {
      console.error('Failed to update button state:', error);
      return false;
    }
  }

  /**
   * Remove a button
   * @param {string|Element} buttonIdentifier - Button ID or element
   * @returns {Promise<boolean>} Success status
   */
  async removeButton(buttonIdentifier) {
    try {
      const buttonData = this._resolveButtonData(buttonIdentifier);
      if (!buttonData) {
        return false;
      }
      
      const { element, config } = buttonData;
      const buttonId = element.dataset.factoryId;
      
      // Call type-specific cleanup
      const typeHandler = this._getTypeHandler(config.type);
      if (typeHandler.cleanup) {
        await typeHandler.cleanup(element, config);
      }
      
      // Remove from DOM
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      
      // Remove from tracking
      this.createdButtons.delete(buttonId);
      
      return true;
      
    } catch (error) {
      console.error('Failed to remove button:', error);
      return false;
    }
  }

  /**
   * Get factory statistics
   * @returns {Object} Factory statistics
   */
  getStats() {
    return {
      totalButtons: this.createdButtons.size,
      buttonTypes: Object.keys(this.buttonTypeHandlers),
      customTypes: Array.from(this.customTypes.keys()),
      creationMetrics: Object.fromEntries(this.creationMetrics),
      options: this.options
    };
  }

  /**
   * Cleanup factory resources
   */
  destroy() {
    // Remove all created buttons
    for (const [buttonId] of this.createdButtons) {
      this.removeButton(buttonId);
    }
    
    // Clear all references
    this.createdButtons.clear();
    this.creationMetrics.clear();
    this.buttonTypeHandlers.clear();
    this.customTypes.clear();
  }

  // ========== Private Methods ==========

  /**
   * Initialize default button type handlers
   * @private
   */
  _initializeDefaultTypes() {
    // Toggle Button Handler
    this.buttonTypeHandlers.set('toggle', {
      create: async (config, options) => {
        const buttonResult = await this.domOperations.createFilterButton({
          mode: config.mode,
          icon: config.icon,
          labelKey: config.labelKey,
          tooltip: config.tooltip
        }, {
          priority: options.priority,
          validate: this.options.enableValidation
        });
        
        if (!buttonResult.success) {
          throw new Error('Failed to create toggle button');
        }
        
        const button = buttonResult.button;
        
        // Add toggle-specific attributes
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', 'false');
        
        // Add toggle behavior
        await this._addToggleBehavior(button, config);
        
        return { success: true, element: button };
      },
      
      updateState: async (element, stateUpdate) => {
        if ('isActive' in stateUpdate) {
          element.setAttribute('aria-checked', stateUpdate.isActive.toString());
          element.setAttribute('tabindex', stateUpdate.isActive ? '0' : '-1');
        }
      },
      
      cleanup: async (element) => {
        // Remove event listeners added by toggle behavior
        element.removeEventListener('click', element._toggleHandler);
      }
    });

    // Action Button Handler
    this.buttonTypeHandlers.set('action', {
      create: async (config, options) => {
        const buttonResult = await this.domOperations.createFilterButton({
          mode: config.mode,
          icon: config.icon,
          labelKey: config.labelKey,
          tooltip: config.tooltip
        }, options);
        
        if (!buttonResult.success) {
          throw new Error('Failed to create action button');
        }
        
        const button = buttonResult.button;
        
        // Add action-specific attributes
        button.setAttribute('role', 'button');
        button.classList.add('action-button');
        
        // Add action behavior
        await this._addActionBehavior(button, config);
        
        return { success: true, element: button };
      },
      
      updateState: async (element, stateUpdate) => {
        if ('disabled' in stateUpdate) {
          element.disabled = stateUpdate.disabled;
          element.setAttribute('aria-disabled', stateUpdate.disabled.toString());
        }
      }
    });

    // Dropdown Button Handler (future enhancement placeholder)
    this.buttonTypeHandlers.set('dropdown', {
      create: async (_config, _options) => {
        // Placeholder for dropdown button implementation
        throw new Error('Dropdown buttons not yet implemented');
      }
    });
  }

  /**
   * Validate and normalize button configuration
   * @private
   * @param {ButtonConfig} config - Raw configuration
   * @returns {Promise<ButtonConfig>} Normalized configuration
   */
  async _validateAndNormalizeConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Button configuration must be an object');
    }
    
    // Required fields
    if (!config.mode) {
      throw new Error('Button mode is required');
    }
    
    if (!config.icon) {
      throw new Error('Button icon is required');
    }
    
    if (!config.labelKey) {
      throw new Error('Button labelKey is required');
    }
    
    // Normalize and validate fields
    const normalized = {
      type: config.type || this.options.defaultButtonType,
      mode: validateDatasetAttribute('mode', config.mode),
      icon: sanitizeTextContent(config.icon, 'help'),
      labelKey: config.labelKey,
      tooltip: config.tooltip || safeGetI18nMessage(config.labelKey, 'Button'),
      attributes: config.attributes || {},
      cssClasses: config.cssClasses || [],
      behavior: config.behavior || {},
      accessibility: {
        role: 'button',
        ...config.accessibility
      }
    };
    
    // Validate against configuration manager if available
    if (configurationManager && configurationManager.getFilterModeConfig) {
      const modeConfig = configurationManager.getFilterModeConfig(normalized.mode);
      if (!modeConfig) {
        console.warn(`Unknown filter mode: ${normalized.mode}`);
      }
    }
    
    return normalized;
  }

  /**
   * Get button type handler
   * @private
   * @param {string} type - Button type
   * @returns {Object|null} Type handler
   */
  _getTypeHandler(type) {
    return this.buttonTypeHandlers.get(type) || this.customTypes.get(type) || null;
  }

  /**
   * Add toggle behavior to button
   * @private
   * @param {Element} button - Button element
   * @param {ButtonConfig} config - Button configuration
   */
  async _addToggleBehavior(button, config) {
    const toggleHandler = async (event) => {
      event.preventDefault();
      
      // Update state via state manager
      if (stateManager && stateManager.set) {
        await stateManager.set('filterMode', config.mode);
      }
      
      // Emit click event
      if (this.options.enableEventBus) {
        await toolbarEventBus.emit('BUTTON_CLICKED', {
          mode: config.mode,
          element: button,
          config,
          event
        });
      }
    };
    
    button._toggleHandler = toggleHandler;
    button.addEventListener('click', toggleHandler);
  }

  /**
   * Add action behavior to button
   * @private
   * @param {Element} button - Button element
   * @param {ButtonConfig} config - Button configuration
   */
  async _addActionBehavior(button, config) {
    const actionHandler = async (event) => {
      event.preventDefault();
      
      // Execute action if defined in behavior
      if (config.behavior && config.behavior.action) {
        try {
          await config.behavior.action(event, button, config);
        } catch (error) {
          console.error('Action button handler failed:', error);
        }
      }
      
      // Emit click event
      if (this.options.enableEventBus) {
        await toolbarEventBus.emit('BUTTON_CLICKED', {
          mode: config.mode,
          element: button,
          config,
          event
        });
      }
    };
    
    button.addEventListener('click', actionHandler);
  }

  /**
   * Add group behavior to button collection
   * @private
   * @param {Array} buttons - Button collection
   * @param {string} groupId - Group identifier
   * @param {Object} options - Group options
   */
  async _addGroupBehavior(buttons, _groupId, _options) {
    // Add radio group behavior for toggle buttons
    const toggleButtons = buttons.filter(b => b.config.type === 'toggle');
    
    if (toggleButtons.length > 1) {
      // Ensure only one toggle button is active at a time
      toggleButtons.forEach(buttonData => {
        const originalHandler = buttonData.element._toggleHandler;
        
        buttonData.element._toggleHandler = async (event) => {
          // Deactivate other buttons in group
          toggleButtons.forEach(otherButton => {
            if (otherButton !== buttonData) {
              otherButton.element.setAttribute('aria-checked', 'false');
              otherButton.element.setAttribute('tabindex', '-1');
            }
          });
          
          // Activate current button
          buttonData.element.setAttribute('aria-checked', 'true');
          buttonData.element.setAttribute('tabindex', '0');
          
          // Call original handler
          if (originalHandler) {
            await originalHandler(event);
          }
        };
      });
    }
  }

  /**
   * Validate button group configuration
   * @private
   * @param {Array<ButtonConfig>} buttonConfigs - Button configurations
   */
  _validateButtonGroup(buttonConfigs) {
    if (!Array.isArray(buttonConfigs) || buttonConfigs.length === 0) {
      throw new Error('Button group must contain at least one button configuration');
    }
    
    // Check for duplicate modes
    const modes = buttonConfigs.map(config => config.mode);
    const duplicates = modes.filter((mode, index) => modes.indexOf(mode) !== index);
    
    if (duplicates.length > 0) {
      throw new Error(`Duplicate button modes found: ${duplicates.join(', ')}`);
    }
  }

  /**
   * Resolve button data from identifier
   * @private
   * @param {string|Element} identifier - Button ID or element
   * @returns {Object|null} Button data
   */
  _resolveButtonData(identifier) {
    if (typeof identifier === 'string') {
      return this.createdButtons.get(identifier) || null;
    }
    
    if (identifier instanceof Element) {
      const buttonId = identifier.dataset.factoryId;
      return buttonId ? this.createdButtons.get(buttonId) : null;
    }
    
    return null;
  }

  /**
   * Record creation metrics
   * @private
   * @param {string} type - Button type
   * @param {number} duration - Creation duration
   * @param {boolean} success - Success status
   */
  _recordCreationMetric(type, duration, success) {
    if (!this.options.enableMetrics) return;
    
    if (!this.creationMetrics.has(type)) {
      this.creationMetrics.set(type, {
        total: 0,
        successful: 0,
        failed: 0,
        totalDuration: 0,
        avgDuration: 0
      });
    }
    
    const metric = this.creationMetrics.get(type);
    metric.total++;
    
    if (success) {
      metric.successful++;
    } else {
      metric.failed++;
    }
    
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.total;
  }

  /**
   * Setup configuration change listeners
   * @private
   */
  _setupConfigurationListeners() {
    // Listen for configuration changes if configuration manager supports it
    if (configurationManager && configurationManager.onChange) {
      configurationManager.onChange((changes) => {
        // React to configuration changes that affect button factory
        console.log('Configuration changed, may affect button factory:', changes);
      });
    }
  }
}

export default ButtonFactory;