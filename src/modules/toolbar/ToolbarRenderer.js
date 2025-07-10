/**
 * ToolbarRenderer - Pure Rendering Functions for Toolbar Components
 * 
 * Provides pure, side-effect-free rendering functions for all toolbar visual elements.
 * Separates rendering logic from control logic to improve testability and maintainability.
 * All DOM operations go through the ToolbarDOMOperations abstraction layer.
 * 
 * @author Chrome Extension Team
 * @version 1.0.0
 */

import { ButtonFactory } from './ButtonFactory.js';
import { toolbarEventBus } from './ToolbarEventBus.js';
import {
  sanitizeTextContent
} from '../utils/validation.js';

/**
 * @typedef {Object} ToolbarRenderConfig
 * @property {string} containerId - Container element ID
 * @property {Array<Object>} buttons - Button configurations
 * @property {Object} styling - Styling configuration
 * @property {Object} accessibility - Accessibility configuration
 * @property {Object} layout - Layout configuration
 */

/**
 * @typedef {Object} RenderResult
 * @property {boolean} success - Whether rendering was successful
 * @property {Object} [elements] - Rendered elements
 * @property {Object} [metadata] - Rendering metadata
 * @property {Error} [error] - Error if rendering failed
 */

export class ToolbarRenderer {
  /**
   * @param {ToolbarDOMOperations} domOperations - DOM operations instance
   * @param {Object} [options={}] - Renderer configuration options
   */
  constructor(domOperations, options = {}) {
    this.domOperations = domOperations;
    
    // Configuration
    this.options = {
      enableAccessibility: true,
      enableMetrics: true,
      enableEventBus: true,
      defaultTheme: 'default',
      cacheElements: true,
      ...options
    };
    
    // Element cache for performance
    this.elementCache = new Map();
    
    // Rendering metrics
    this.renderingMetrics = new Map();
    
    // Button factory instance
    this.buttonFactory = new ButtonFactory(domOperations, {
      enableValidation: true,
      enableMetrics: this.options.enableMetrics,
      enableEventBus: this.options.enableEventBus
    });
    
    // Template cache
    this.templateCache = new Map();
    
    // Bind methods
    this.renderToolbar = this.renderToolbar.bind(this);
    this.renderButton = this.renderButton.bind(this);
    this.renderButtonGroup = this.renderButtonGroup.bind(this);
    
    // Initialize default templates
    this._initializeTemplates();
  }

  /**
   * Render complete toolbar with all components
   * @param {Element} container - Container element
   * @param {ToolbarRenderConfig} config - Rendering configuration
   * @param {Object} [options={}] - Rendering options
   * @returns {Promise<RenderResult>} Rendering result
   */
  async renderToolbar(container, config, options = {}) {
    const startTime = performance.now();
    const renderingId = `toolbar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Validate inputs
      this._validateRenderingInputs(container, config);
      
      const {
        replaceExisting = true,
        enableLiveRegion = true,
        enableKeyboardNavigation = true,
        theme = this.options.defaultTheme
      } = options;
      
      // Prepare rendering context
      const renderingContext = {
        renderingId,
        container,
        config,
        options: { replaceExisting, enableLiveRegion, enableKeyboardNavigation, theme },
        startTime
      };
      
      // Clear existing content if requested
      if (replaceExisting) {
        await this._clearExistingToolbar(container);
      }
      
      // Render toolbar structure
      const structureResult = await this._renderToolbarStructure(renderingContext);
      if (!structureResult.success) {
        throw new Error(`Failed to render toolbar structure: ${structureResult.error?.message}`);
      }
      
      // Render button group
      const buttonGroupResult = await this._renderButtonGroup(
        structureResult.elements.bar,
        config.buttons,
        renderingContext
      );
      if (!buttonGroupResult.success) {
        throw new Error(`Failed to render button group: ${buttonGroupResult.error?.message}`);
      }
      
      // Render live region if enabled
      let liveRegionResult = null;
      if (enableLiveRegion) {
        liveRegionResult = await this._renderLiveRegion(
          structureResult.elements.wrapper,
          renderingContext
        );
      }
      
      // Apply theme styling
      await this._applyThemeStyles(structureResult.elements.wrapper, theme);
      
      // Cache rendered elements
      if (this.options.cacheElements) {
        this._cacheElements(renderingId, {
          ...structureResult.elements,
          buttonGroup: buttonGroupResult.elements.group,
          buttons: buttonGroupResult.elements.buttons,
          liveRegion: liveRegionResult?.elements?.liveRegion
        });
      }
      
      // Record metrics
      const executionTime = performance.now() - startTime;
      this._recordRenderingMetric('renderToolbar', executionTime, true);
      
      // Emit rendering event
      if (this.options.enableEventBus) {
        await toolbarEventBus.emit('TOOLBAR_RENDERED', {
          renderingId,
          container,
          elements: structureResult.elements,
          config,
          executionTime
        });
      }
      
      return {
        success: true,
        elements: {
          renderingId,
          wrapper: structureResult.elements.wrapper,
          bar: structureResult.elements.bar,
          buttonGroup: buttonGroupResult.elements.group,
          buttons: buttonGroupResult.elements.buttons,
          liveRegion: liveRegionResult?.elements?.liveRegion
        },
        metadata: {
          renderingId,
          executionTime,
          buttonCount: config.buttons.length,
          theme,
          renderedAt: Date.now()
        }
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this._recordRenderingMetric('renderToolbar', executionTime, false);
      
      return {
        success: false,
        error,
        metadata: {
          renderingId,
          executionTime,
          failedAt: Date.now()
        }
      };
    }
  }

  /**
   * Render a single button
   * @param {Object} buttonConfig - Button configuration
   * @param {Object} [options={}] - Rendering options
   * @returns {Promise<RenderResult>} Rendering result
   */
  async renderButton(buttonConfig, options = {}) {
    const startTime = performance.now();
    
    try {
      const buttonResult = await this.buttonFactory.createButton(buttonConfig, options);
      
      if (!buttonResult.success) {
        throw new Error(`Button rendering failed: ${buttonResult.error?.message}`);
      }
      
      const executionTime = performance.now() - startTime;
      this._recordRenderingMetric('renderButton', executionTime, true);
      
      return {
        success: true,
        elements: { button: buttonResult.element },
        metadata: {
          ...buttonResult.metadata,
          executionTime
        }
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this._recordRenderingMetric('renderButton', executionTime, false);
      
      return {
        success: false,
        error,
        metadata: { executionTime }
      };
    }
  }

  /**
   * Render a group of buttons
   * @param {Array<Object>} buttonConfigs - Button configurations
   * @param {Object} [options={}] - Rendering options
   * @returns {Promise<RenderResult>} Rendering result
   */
  async renderButtonGroup(buttonConfigs, options = {}) {
    const startTime = performance.now();
    
    try {
      const groupResult = await this.buttonFactory.createButtonGroup(buttonConfigs, options);
      
      if (!groupResult.success) {
        throw new Error(`Button group rendering failed`);
      }
      
      const executionTime = performance.now() - startTime;
      this._recordRenderingMetric('renderButtonGroup', executionTime, true);
      
      return {
        success: true,
        elements: {
          group: groupResult.buttonGroup,
          buttons: groupResult.buttons
        },
        metadata: {
          ...groupResult.metadata,
          executionTime
        }
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this._recordRenderingMetric('renderButtonGroup', executionTime, false);
      
      return {
        success: false,
        error,
        metadata: { executionTime }
      };
    }
  }

  /**
   * Update toolbar visual state
   * @param {string|Object} toolbarIdentifier - Toolbar ID or elements object
   * @param {Object} stateUpdate - State update object
   * @param {Object} [options={}] - Update options
   * @returns {Promise<RenderResult>} Update result
   */
  async updateToolbarVisualState(toolbarIdentifier, stateUpdate, _options = {}) {
    const startTime = performance.now();
    
    try {
      const elements = this._resolveToolbarElements(toolbarIdentifier);
      if (!elements) {
        throw new Error('Toolbar elements not found');
      }
      
      const updateOperations = [];
      
      // Handle button text visibility
      if ('showButtonText' in stateUpdate) {
        updateOperations.push(
          this._updateButtonTextVisibility(elements, stateUpdate.showButtonText)
        );
      }
      
      // Handle active button state
      if ('activeButton' in stateUpdate) {
        updateOperations.push(
          this._updateActiveButton(elements, stateUpdate.activeButton)
        );
      }
      
      // Handle theme changes
      if ('theme' in stateUpdate) {
        updateOperations.push(
          this._updateTheme(elements, stateUpdate.theme)
        );
      }
      
      // Handle disabled state
      if ('disabled' in stateUpdate) {
        updateOperations.push(
          this._updateDisabledState(elements, stateUpdate.disabled)
        );
      }
      
      // Execute all update operations
      await Promise.all(updateOperations);
      
      const executionTime = performance.now() - startTime;
      this._recordRenderingMetric('updateVisualState', executionTime, true);
      
      return {
        success: true,
        metadata: { executionTime, updatedProperties: Object.keys(stateUpdate) }
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this._recordRenderingMetric('updateVisualState', executionTime, false);
      
      return {
        success: false,
        error,
        metadata: { executionTime }
      };
    }
  }

  /**
   * Update live region content
   * @param {string|Element} liveRegionIdentifier - Live region ID or element
   * @param {string} message - Message to display
   * @param {Object} [options={}] - Update options
   * @returns {Promise<RenderResult>} Update result
   */
  async updateLiveRegion(liveRegionIdentifier, message, options = {}) {
    const startTime = performance.now();
    
    try {
      const liveRegion = this._resolveLiveRegionElement(liveRegionIdentifier);
      if (!liveRegion) {
        throw new Error('Live region not found');
      }
      
      const {
        sanitize = true,
        priority = 'polite'
      } = options;
      
      const safeMessage = sanitize ? sanitizeTextContent(message, '') : message;
      
      // Update live region content
      await this.domOperations.domManager.setText(liveRegion, safeMessage, {
        batch: false // Immediate update for accessibility
      });
      
      // Update aria-live attribute if priority changed
      if (liveRegion.getAttribute('aria-live') !== priority) {
        await this.domOperations.domManager.setAttribute(liveRegion, 'aria-live', priority);
      }
      
      const executionTime = performance.now() - startTime;
      this._recordRenderingMetric('updateLiveRegion', executionTime, true);
      
      return {
        success: true,
        metadata: { 
          message: safeMessage, 
          priority, 
          executionTime 
        }
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this._recordRenderingMetric('updateLiveRegion', executionTime, false);
      
      return {
        success: false,
        error,
        metadata: { executionTime }
      };
    }
  }

  /**
   * Remove toolbar from DOM
   * @param {string|Object} toolbarIdentifier - Toolbar ID or elements object
   * @returns {Promise<RenderResult>} Removal result
   */
  async removeToolbar(toolbarIdentifier) {
    const startTime = performance.now();
    
    try {
      const elements = this._resolveToolbarElements(toolbarIdentifier);
      if (!elements) {
        return { success: true, metadata: { message: 'Toolbar already removed' } };
      }
      
      // Remove buttons through factory for proper cleanup
      if (elements.buttons) {
        for (const button of elements.buttons) {
          await this.buttonFactory.removeButton(button);
        }
      }
      
      // Remove wrapper element (contains all toolbar elements)
      if (elements.wrapper && elements.wrapper.parentNode) {
        await this.domOperations.domManager.removeElement(elements.wrapper);
      }
      
      // Clear from cache
      if (typeof toolbarIdentifier === 'string') {
        this.elementCache.delete(toolbarIdentifier);
      }
      
      const executionTime = performance.now() - startTime;
      this._recordRenderingMetric('removeToolbar', executionTime, true);
      
      return {
        success: true,
        metadata: { executionTime }
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this._recordRenderingMetric('removeToolbar', executionTime, false);
      
      return {
        success: false,
        error,
        metadata: { executionTime }
      };
    }
  }

  /**
   * Get rendering statistics
   * @returns {Object} Rendering statistics
   */
  getStats() {
    return {
      cachedElements: this.elementCache.size,
      renderingMetrics: Object.fromEntries(this.renderingMetrics),
      buttonFactory: this.buttonFactory.getStats(),
      templates: this.templateCache.size,
      options: this.options
    };
  }

  /**
   * Clear all caches and reset renderer
   */
  reset() {
    this.elementCache.clear();
    this.renderingMetrics.clear();
    this.templateCache.clear();
    
    if (this.buttonFactory) {
      this.buttonFactory.destroy();
      this.buttonFactory = new ButtonFactory(this.domOperations, {
        enableValidation: true,
        enableMetrics: this.options.enableMetrics,
        enableEventBus: this.options.enableEventBus
      });
    }
  }

  /**
   * Destroy renderer and cleanup resources
   */
  destroy() {
    this.reset();
    
    if (this.buttonFactory) {
      this.buttonFactory.destroy();
      this.buttonFactory = null;
    }
    
    this.domOperations = null;
  }

  // ========== Private Methods ==========

  /**
   * Initialize default templates
   * @private
   */
  _initializeTemplates() {
    this.templateCache.set('toolbar-wrapper', {
      element: 'div',
      attributes: {
        class: 'gcal-filter-wrapper',
        role: 'toolbar'
      }
    });
    
    this.templateCache.set('toolbar-bar', {
      element: 'div',
      attributes: {
        class: 'gcal-filter-bar',
        role: 'toolbar'
      }
    });
    
    this.templateCache.set('live-region', {
      element: 'div',
      attributes: {
        class: 'gcal-live-region sr-only',
        role: 'status',
        'aria-live': 'polite'
      }
    });
  }

  /**
   * Validate rendering inputs
   * @private
   * @param {Element} container - Container element
   * @param {ToolbarRenderConfig} config - Configuration object
   */
  _validateRenderingInputs(container, config) {
    if (!container || !(container instanceof Element)) {
      throw new Error('Container must be a valid DOM element');
    }
    
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration must be an object');
    }
    
    if (!Array.isArray(config.buttons) || config.buttons.length === 0) {
      throw new Error('Configuration must include at least one button');
    }
  }

  /**
   * Clear existing toolbar content
   * @private
   * @param {Element} container - Container element
   */
  async _clearExistingToolbar(container) {
    const existingWrapper = container.nextElementSibling;
    if (existingWrapper && existingWrapper.classList.contains('gcal-filter-wrapper')) {
      await this.domOperations.domManager.removeElement(existingWrapper);
    }
  }

  /**
   * Render toolbar structure (wrapper and bar)
   * @private
   * @param {Object} renderingContext - Rendering context
   * @returns {Promise<RenderResult>} Structure rendering result
   */
  async _renderToolbarStructure(renderingContext) {
    try {
      const { container, config } = renderingContext;
      
      // Create wrapper
      const wrapperTemplate = this.templateCache.get('toolbar-wrapper');
      const wrapperResult = await this.domOperations.domManager.createElement(
        wrapperTemplate.element,
        wrapperTemplate.attributes
      );
      
      if (!wrapperResult.success) {
        throw new Error('Failed to create toolbar wrapper');
      }
      
      const wrapper = wrapperResult.data;
      
      // Create bar
      const barTemplate = this.templateCache.get('toolbar-bar');
      const barAttributes = {
        ...barTemplate.attributes,
        'aria-label': config.accessibility?.toolbarLabel || 'Filter Toolbar'
      };
      
      const barResult = await this.domOperations.domManager.createElement(
        barTemplate.element,
        barAttributes
      );
      
      if (!barResult.success) {
        throw new Error('Failed to create toolbar bar');
      }
      
      const bar = barResult.data;
      
      // Append bar to wrapper
      await this.domOperations.domManager.appendChild(wrapper, bar);
      
      // Insert wrapper after container
      await this.domOperations.domManager.insertAfter(
        container.parentNode,
        wrapper,
        container
      );
      
      return {
        success: true,
        elements: { wrapper, bar }
      };
      
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }

  /**
   * Render button group within toolbar bar
   * @private
   * @param {Element} bar - Toolbar bar element
   * @param {Array} buttonConfigs - Button configurations
   * @param {Object} renderingContext - Rendering context
   * @returns {Promise<RenderResult>} Button group rendering result
   */
  async _renderButtonGroup(bar, buttonConfigs, renderingContext) {
    try {
      const groupResult = await this.buttonFactory.createButtonGroup(buttonConfigs, {
        groupLabel: renderingContext.config.accessibility?.groupLabel || 'Filter Options',
        enableGroupBehavior: true
      });
      
      if (!groupResult.success) {
        throw new Error('Failed to create button group');
      }
      
      // Append button group to bar
      await this.domOperations.domManager.appendChild(bar, groupResult.buttonGroup);
      
      return {
        success: true,
        elements: {
          group: groupResult.buttonGroup,
          buttons: groupResult.buttons
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }

  /**
   * Render live region for screen reader updates
   * @private
   * @param {Element} wrapper - Toolbar wrapper element
   * @param {Object} renderingContext - Rendering context
   * @returns {Promise<RenderResult>} Live region rendering result
   */
  async _renderLiveRegion(wrapper, _renderingContext) {
    try {
      const liveRegionTemplate = this.templateCache.get('live-region');
      const liveRegionResult = await this.domOperations.domManager.createElement(
        liveRegionTemplate.element,
        liveRegionTemplate.attributes
      );
      
      if (!liveRegionResult.success) {
        throw new Error('Failed to create live region');
      }
      
      const liveRegion = liveRegionResult.data;
      
      // Append live region to wrapper
      await this.domOperations.domManager.appendChild(wrapper, liveRegion);
      
      return {
        success: true,
        elements: { liveRegion }
      };
      
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }

  /**
   * Apply theme styles to toolbar
   * @private
   * @param {Element} wrapper - Toolbar wrapper element
   * @param {string} theme - Theme name
   */
  async _applyThemeStyles(wrapper, theme) {
    if (theme && theme !== 'default') {
      await this.domOperations.domManager.addClass(wrapper, `theme-${theme}`);
    }
  }

  /**
   * Cache rendered elements
   * @private
   * @param {string} renderingId - Rendering identifier
   * @param {Object} elements - Elements to cache
   */
  _cacheElements(renderingId, elements) {
    this.elementCache.set(renderingId, {
      ...elements,
      cachedAt: Date.now()
    });
  }

  /**
   * Update button text visibility
   * @private
   * @param {Object} elements - Toolbar elements
   * @param {boolean} showText - Whether to show text
   */
  async _updateButtonTextVisibility(elements, showText) {
    const className = 'show-icon-only';
    
    if (showText) {
      await this.domOperations.domManager.removeClass(elements.bar, className);
    } else {
      await this.domOperations.domManager.addClass(elements.bar, className);
    }
  }

  /**
   * Update active button state
   * @private
   * @param {Object} elements - Toolbar elements
   * @param {string} activeButtonMode - Active button mode
   */
  async _updateActiveButton(elements, activeButtonMode) {
    if (!elements.buttons) return;
    
    for (const button of elements.buttons) {
      const isActive = button.dataset.mode === activeButtonMode;
      await this.buttonFactory.updateButtonState(button, { isActive });
    }
  }

  /**
   * Update theme
   * @private
   * @param {Object} elements - Toolbar elements
   * @param {string} theme - New theme
   */
  async _updateTheme(elements, theme) {
    // Remove existing theme classes
    const classList = Array.from(elements.wrapper.classList);
    const themeClasses = classList.filter(cls => cls.startsWith('theme-'));
    
    for (const themeClass of themeClasses) {
      await this.domOperations.domManager.removeClass(elements.wrapper, themeClass);
    }
    
    // Add new theme class
    if (theme && theme !== 'default') {
      await this.domOperations.domManager.addClass(elements.wrapper, `theme-${theme}`);
    }
  }

  /**
   * Update disabled state
   * @private
   * @param {Object} elements - Toolbar elements
   * @param {boolean} disabled - Whether toolbar is disabled
   */
  async _updateDisabledState(elements, disabled) {
    if (!elements.buttons) return;
    
    for (const button of elements.buttons) {
      await this.buttonFactory.updateButtonState(button, { disabled });
    }
  }

  /**
   * Resolve toolbar elements from identifier
   * @private
   * @param {string|Object} identifier - Toolbar ID or elements object
   * @returns {Object|null} Toolbar elements
   */
  _resolveToolbarElements(identifier) {
    if (typeof identifier === 'string') {
      return this.elementCache.get(identifier) || null;
    }
    
    if (identifier && typeof identifier === 'object') {
      return identifier;
    }
    
    return null;
  }

  /**
   * Resolve live region element
   * @private
   * @param {string|Element} identifier - Live region ID or element
   * @returns {Element|null} Live region element
   */
  _resolveLiveRegionElement(identifier) {
    if (identifier instanceof Element) {
      return identifier;
    }
    
    if (typeof identifier === 'string') {
      const elements = this.elementCache.get(identifier);
      return elements?.liveRegion || null;
    }
    
    return null;
  }

  /**
   * Record rendering metrics
   * @private
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {boolean} success - Success status
   */
  _recordRenderingMetric(operation, duration, success) {
    if (!this.options.enableMetrics) return;
    
    if (!this.renderingMetrics.has(operation)) {
      this.renderingMetrics.set(operation, {
        total: 0,
        successful: 0,
        failed: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity
      });
    }
    
    const metric = this.renderingMetrics.get(operation);
    metric.total++;
    
    if (success) {
      metric.successful++;
    } else {
      metric.failed++;
    }
    
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.total;
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.minDuration = Math.min(metric.minDuration, duration);
  }
}

export default ToolbarRenderer;