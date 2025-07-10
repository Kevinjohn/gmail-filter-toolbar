/**
 * Toolbar DOM Operations Module
 * 
 * Specialized DOM operations for toolbar functionality including button creation,
 * toolbar injection, state management, and ARIA compliance.
 */

import { DOM_CONSTANTS } from './interfaces.js';

export class ToolbarDOMOperations {
  /**
   * @param {DOMManager} domManager - DOM manager instance
   */
  constructor(domManager) {
    this.domManager = domManager;
    this.performanceMetrics = new Map();
    
    // Toolbar state tracking
    this.activeToolbars = new Map();
    this.buttonGroups = new Map();
    
    // Bind methods to preserve context
    this.createFilterButton = this.createFilterButton.bind(this);
    this.injectToolbar = this.injectToolbar.bind(this);
  }

  /**
   * Create a filter button with proper ARIA attributes and validation
   * @param {Object} config - Button configuration
   * @param {Object} [options={}] - Creation options
   * @returns {Promise<Object>} Created button element and metadata
   */
  async createFilterButton(config, options = {}) {
    const operationName = 'createFilterButton';
    const startTime = performance.now();

    try {
      const {
        mode,
        icon,
        labelKey,
        tooltip
      } = this.validateButtonConfig(config);

      const {
        priority = DOM_CONSTANTS.PRIORITY_LEVELS.NORMAL,
        validate = true,
        addEventListeners = true
      } = options;

      // Create button element with attributes
      const buttonResult = await this.domManager.createElement('button', {
        id: `filter-${mode}`,
        'data-mode': mode,
        'role': 'radio',
        'aria-label': tooltip || labelKey,
        'data-tooltip': tooltip || labelKey,
        'class': 'gcal-filter-button'
      }, { priority, validate });

      if (!buttonResult.success) {
        throw new Error('Failed to create button element');
      }

      const button = buttonResult.data;

      // Create icon element
      const iconResult = await this.domManager.createElement('span', {
        'class': 'material-symbols-outlined',
        'textContent': icon
      }, { priority, validate });

      if (!iconResult.success) {
        throw new Error('Failed to create icon element');
      }

      // Create text label element
      const textLabelResult = await this.domManager.createElement('span', {
        'class': 'gcal-text-label',
        'textContent': labelKey
      }, { priority, validate });

      if (!textLabelResult.success) {
        throw new Error('Failed to create text label element');
      }

      // Append elements to button
      await this.domManager.appendChild(button, iconResult.data, { priority });
      await this.domManager.appendChild(button, textLabelResult.data, { priority });

      // Add event listeners if requested
      if (addEventListeners) {
        await this.addButtonEventListeners(button, config, options);
      }

      const executionTime = performance.now() - startTime;
      this.recordToolbarPerformance(operationName, executionTime);

      return {
        success: true,
        button,
        config: { mode, icon, labelKey, tooltip },
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordToolbarPerformance(operationName, executionTime, false);
      throw new Error(`Button creation failed: ${error.message}`);
    }
  }

  /**
   * Update button state (active/inactive)
   * @param {Element} button - Button element
   * @param {boolean} isActive - Whether button should be active
   * @param {Object} [options={}] - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateButtonState(button, isActive, options = {}) {
    const operationName = 'updateButtonState';
    const startTime = performance.now();

    try {
      const {
        priority = DOM_CONSTANTS.PRIORITY_LEVELS.HIGH,
        animate = false
      } = options;

      // Update ARIA attributes
      const operations = [
        {
          type: 'setAttribute',
          args: {
            element: button,
            attribute: 'aria-checked',
            value: isActive.toString()
          },
          priority
        },
        {
          type: 'setAttribute',
          args: {
            element: button,
            attribute: 'tabindex',
            value: isActive ? '0' : '-1'
          },
          priority
        }
      ];

      // Add visual state classes if animate is enabled
      if (animate) {
        operations.push({
          type: isActive ? 'addClass' : 'removeClass',
          args: {
            element: button,
            className: 'active'
          },
          priority
        });
      }

      await this.domManager.batch(operations, { priority });

      const executionTime = performance.now() - startTime;
      this.recordToolbarPerformance(operationName, executionTime);

      return {
        success: true,
        isActive,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordToolbarPerformance(operationName, executionTime, false);
      throw error;
    }
  }

  /**
   * Create a group of related buttons
   * @param {Array<Object>} buttonConfigs - Array of button configurations
   * @param {Object} [options={}] - Button group options
   * @returns {Promise<Object>} Created button group and buttons
   */
  async createButtonGroup(buttonConfigs, options = {}) {
    const operationName = 'createButtonGroup';
    const startTime = performance.now();

    try {
      const {
        groupId = `button-group-${Date.now()}`,
        labelId = `${groupId}-label`,
        groupLabel = 'Filter Options',
        priority = DOM_CONSTANTS.PRIORITY_LEVELS.NORMAL
      } = options;

      // Create button group container
      const groupResult = await this.domManager.createElement('div', {
        'class': 'gcal-button-group',
        'role': 'radiogroup',
        'aria-labelledby': labelId
      }, { priority });

      if (!groupResult.success) {
        throw new Error('Failed to create button group container');
      }

      const buttonGroup = groupResult.data;

      // Create group label
      const labelResult = await this.domManager.createElement('span', {
        'id': labelId,
        'class': 'gcal-group-label',
        'textContent': groupLabel
      }, { priority });

      if (!labelResult.success) {
        throw new Error('Failed to create group label');
      }

      await this.domManager.appendChild(buttonGroup, labelResult.data, { priority });

      // Create all buttons
      const buttons = [];
      for (const config of buttonConfigs) {
        const buttonResult = await this.createFilterButton(config, {
          ...options,
          addEventListeners: false // Add listeners after all buttons are created
        });
        
        if (buttonResult.success) {
          buttons.push(buttonResult.button);
          await this.domManager.appendChild(buttonGroup, buttonResult.button, { priority });
        }
      }

      // Add keyboard navigation
      await this.addGroupKeyboardNavigation(buttonGroup, buttons, options);

      // Store button group reference
      this.buttonGroups.set(groupId, {
        container: buttonGroup,
        buttons,
        label: labelResult.data
      });

      const executionTime = performance.now() - startTime;
      this.recordToolbarPerformance(operationName, executionTime);

      return {
        success: true,
        buttonGroup,
        buttons,
        groupId,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordToolbarPerformance(operationName, executionTime, false);
      throw error;
    }
  }

  /**
   * Inject complete toolbar into container
   * @param {Element} container - Container element for toolbar
   * @param {Object} toolbarConfig - Toolbar configuration
   * @param {Object} [options={}] - Injection options
   * @returns {Promise<Object>} Injection result with toolbar elements
   */
  async injectToolbar(container, toolbarConfig, options = {}) {
    const operationName = 'injectToolbar';
    const startTime = performance.now();

    try {
      const {
        wrapperClass = 'gcal-filter-wrapper',
        barClass = 'gcal-filter-bar',
        priority = DOM_CONSTANTS.PRIORITY_LEVELS.HIGH,
        replaceExisting = true,
        enableLiveRegion = true
      } = options;

      // Validate toolbar configuration
      const validatedConfig = this.validateToolbarConfig(toolbarConfig);

      // Check for existing toolbar wrapper
      let wrapper = container.nextElementSibling;
      if (wrapper && wrapper.classList.contains(wrapperClass)) {
        if (replaceExisting) {
          // Clear existing content
          while (wrapper.firstChild) {
            await this.domManager.removeElement(wrapper.firstChild, { priority });
          }
        } else {
          throw new Error('Toolbar already exists and replaceExisting is false');
        }
      } else {
        // Create new wrapper
        const wrapperResult = await this.domManager.createElement('div', {
          'class': wrapperClass
        }, { priority });

        if (!wrapperResult.success) {
          throw new Error('Failed to create toolbar wrapper');
        }

        wrapper = wrapperResult.data;
        await this.domManager.insertAfter(container.parentNode, wrapper, container, { priority });
      }

      // Create toolbar bar
      const barResult = await this.domManager.createElement('div', {
        'class': barClass,
        'role': 'toolbar',
        'aria-label': validatedConfig.toolbarLabel || 'Filter Toolbar'
      }, { priority });

      if (!barResult.success) {
        throw new Error('Failed to create toolbar bar');
      }

      const bar = barResult.data;

      // Create button group
      const buttonGroupResult = await this.createButtonGroup(
        validatedConfig.buttons,
        {
          ...options,
          groupLabel: validatedConfig.groupLabel || 'Filter Options'
        }
      );

      if (!buttonGroupResult.success) {
        throw new Error('Failed to create button group');
      }

      // Append button group to bar
      await this.domManager.appendChild(bar, buttonGroupResult.buttonGroup, { priority });

      // Create live region for screen readers if enabled
      let liveRegion = null;
      if (enableLiveRegion) {
        const liveRegionResult = await this.domManager.createElement('div', {
          'class': 'gcal-live-region sr-only',
          'role': 'status',
          'aria-live': 'polite'
        }, { priority });

        if (liveRegionResult.success) {
          liveRegion = liveRegionResult.data;
          await this.domManager.appendChild(wrapper, liveRegion, { priority });
        }
      }

      // Append bar to wrapper
      await this.domManager.appendChild(wrapper, bar, { priority });

      // Add toolbar event listeners
      await this.addToolbarEventListeners(bar, buttonGroupResult.buttons, options);

      // Store toolbar reference
      const toolbarId = `toolbar-${Date.now()}`;
      this.activeToolbars.set(toolbarId, {
        container,
        wrapper,
        bar,
        buttonGroup: buttonGroupResult.buttonGroup,
        buttons: buttonGroupResult.buttons,
        liveRegion,
        config: validatedConfig
      });

      const executionTime = performance.now() - startTime;
      this.recordToolbarPerformance(operationName, executionTime);

      return {
        success: true,
        toolbarId,
        wrapper,
        bar,
        buttonGroup: buttonGroupResult.buttonGroup,
        buttons: buttonGroupResult.buttons,
        liveRegion,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordToolbarPerformance(operationName, executionTime, false);
      throw error;
    }
  }

  /**
   * Update toolbar button text visibility
   * @param {string} toolbarId - Toolbar identifier
   * @param {boolean} showText - Whether to show button text
   * @param {Object} [options={}] - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateButtonTextVisibility(toolbarId, showText, options = {}) {
    const operationName = 'updateButtonTextVisibility';
    const startTime = performance.now();

    try {
      const toolbar = this.activeToolbars.get(toolbarId);
      if (!toolbar) {
        throw new Error(`Toolbar not found: ${toolbarId}`);
      }

      const {
        priority = DOM_CONSTANTS.PRIORITY_LEVELS.NORMAL
      } = options;

      const className = 'show-icon-only';
      const operation = {
        type: showText ? 'removeClass' : 'addClass',
        args: {
          element: toolbar.bar,
          className
        },
        priority
      };

      await this.domManager.batch([operation], { priority });

      const executionTime = performance.now() - startTime;
      this.recordToolbarPerformance(operationName, executionTime);

      return {
        success: true,
        showText,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordToolbarPerformance(operationName, executionTime, false);
      throw error;
    }
  }

  /**
   * Update live region with status message
   * @param {string} toolbarId - Toolbar identifier
   * @param {string} message - Status message
   * @param {Object} [options={}] - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateLiveRegion(toolbarId, message, options = {}) {
    const operationName = 'updateLiveRegion';
    const startTime = performance.now();

    try {
      const toolbar = this.activeToolbars.get(toolbarId);
      if (!toolbar || !toolbar.liveRegion) {
        throw new Error(`Toolbar or live region not found: ${toolbarId}`);
      }

      const {
        priority = DOM_CONSTANTS.PRIORITY_LEVELS.LOW,
        sanitize = true
      } = options;

      const safeMessage = sanitize ? this.sanitizeMessage(message) : message;

      await this.domManager.setText(toolbar.liveRegion, safeMessage, {
        batch: false, // Immediate update for accessibility
        priority
      });

      const executionTime = performance.now() - startTime;
      this.recordToolbarPerformance(operationName, executionTime);

      return {
        success: true,
        message: safeMessage,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordToolbarPerformance(operationName, executionTime, false);
      throw error;
    }
  }

  // ========== Helper Methods ==========

  /**
   * Validate button configuration
   * @param {Object} config - Button configuration
   * @returns {Object} Validated configuration
   */
  validateButtonConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Button config must be an object');
    }

    const { mode, icon, labelKey, tooltip } = config;

    if (!mode || typeof mode !== 'string') {
      throw new Error('Button mode is required and must be a string');
    }

    if (!icon || typeof icon !== 'string') {
      throw new Error('Button icon is required and must be a string');
    }

    if (!labelKey || typeof labelKey !== 'string') {
      throw new Error('Button labelKey is required and must be a string');
    }

    return {
      mode: mode.trim(),
      icon: icon.trim(),
      labelKey: labelKey.trim(),
      tooltip: tooltip ? tooltip.trim() : labelKey.trim()
    };
  }

  /**
   * Validate toolbar configuration
   * @param {Object} config - Toolbar configuration
   * @returns {Object} Validated configuration
   */
  validateToolbarConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Toolbar config must be an object');
    }

    const { buttons, toolbarLabel, groupLabel } = config;

    if (!Array.isArray(buttons) || buttons.length === 0) {
      throw new Error('Toolbar must have at least one button');
    }

    // Validate each button config
    const validatedButtons = buttons.map(buttonConfig => 
      this.validateButtonConfig(buttonConfig)
    );

    return {
      buttons: validatedButtons,
      toolbarLabel: toolbarLabel || 'Filter Toolbar',
      groupLabel: groupLabel || 'Filter Options'
    };
  }

  /**
   * Add event listeners to button
   * @param {Element} button - Button element
   * @param {Object} config - Button configuration
   * @param {Object} options - Event options
   */
  async addButtonEventListeners(button, config, options = {}) {
    const {
      onClick,
      onFocus,
      onBlur
    } = options;

    if (onClick) {
      await this.domManager.addEventListener(button, 'click', onClick);
    }

    if (onFocus) {
      await this.domManager.addEventListener(button, 'focus', onFocus);
    }

    if (onBlur) {
      await this.domManager.addEventListener(button, 'blur', onBlur);
    }
  }

  /**
   * Add keyboard navigation to button group
   * @param {Element} buttonGroup - Button group container
   * @param {Array<Element>} buttons - Array of button elements
   * @param {Object} options - Navigation options
   */
  async addGroupKeyboardNavigation(buttonGroup, buttons, options = {}) {
    const navigationHandler = (e) => {
      const { key } = e;
      if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;

      const focusedIndex = buttons.findIndex(btn => btn === document.activeElement);
      if (focusedIndex === -1) return;

      e.preventDefault();

      let nextIndex;
      if (key === 'ArrowLeft') {
        nextIndex = (focusedIndex - 1 + buttons.length) % buttons.length;
      } else {
        nextIndex = (focusedIndex + 1) % buttons.length;
      }

      buttons[nextIndex].focus();
      if (options.autoActivate !== false) {
        buttons[nextIndex].click();
      }
    };

    await this.domManager.addEventListener(buttonGroup, 'keydown', navigationHandler);
  }

  /**
   * Add toolbar-level event listeners
   * @param {Element} toolbar - Toolbar element
   * @param {Array<Element>} buttons - Array of button elements
   * @param {Object} options - Event options
   */
  async addToolbarEventListeners(toolbar, buttons, _options = {}) {
    // Escape key handler to focus email list
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        const emailList = document.querySelector('[role="main"] table');
        if (emailList) {
          emailList.focus();
        }
      }
    };

    await this.domManager.addEventListener(toolbar, 'keydown', escapeHandler);

    // Mark toolbar as having listeners to prevent duplicate addition
    toolbar.dataset.listenerAdded = 'true';
  }

  /**
   * Sanitize message content
   * @param {string} message - Message to sanitize
   * @returns {string} Sanitized message
   */
  sanitizeMessage(message) {
    if (typeof message !== 'string') {
      return 'Invalid message';
    }
    
    return message
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim()
      .substring(0, 200); // Limit length
  }

  /**
   * Record toolbar operation performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {boolean} [success=true] - Whether operation succeeded
   */
  recordToolbarPerformance(operation, duration, success = true) {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, {
        count: 0,
        successCount: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity
      });
    }

    const metrics = this.performanceMetrics.get(operation);
    metrics.count++;
    if (success) metrics.successCount++;
    metrics.totalTime += duration;
    metrics.avgTime = metrics.totalTime / metrics.count;
    metrics.maxTime = Math.max(metrics.maxTime, duration);
    metrics.minTime = Math.min(metrics.minTime, duration);
  }

  /**
   * Get toolbar performance statistics
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    const stats = {};
    for (const [operation, metrics] of this.performanceMetrics) {
      stats[operation] = {
        ...metrics,
        successRate: metrics.count > 0 ? metrics.successCount / metrics.count : 0
      };
    }
    
    return {
      operations: stats,
      activeToolbars: this.activeToolbars.size,
      buttonGroups: this.buttonGroups.size
    };
  }

  /**
   * Get active toolbar by ID
   * @param {string} toolbarId - Toolbar identifier
   * @returns {Object|null} Toolbar data or null if not found
   */
  getToolbar(toolbarId) {
    return this.activeToolbars.get(toolbarId) || null;
  }

  /**
   * Remove toolbar by ID
   * @param {string} toolbarId - Toolbar identifier
   * @returns {Promise<boolean>} True if removed successfully
   */
  async removeToolbar(toolbarId) {
    const toolbar = this.activeToolbars.get(toolbarId);
    if (!toolbar) {
      return false;
    }

    try {
      await this.domManager.removeElement(toolbar.wrapper);
      this.activeToolbars.delete(toolbarId);
      return true;
    } catch (error) {
      console.error('Error removing toolbar:', error);
      return false;
    }
  }

  /**
   * Cleanup resources and remove all toolbars
   */
  destroy() {
    // Remove all active toolbars
    for (const toolbarId of this.activeToolbars.keys()) {
      this.removeToolbar(toolbarId);
    }

    this.activeToolbars.clear();
    this.buttonGroups.clear();
    this.performanceMetrics.clear();
  }
}