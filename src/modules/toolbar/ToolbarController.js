/**
 * ToolbarController - Control Logic and Coordination for Toolbar Module
 * 
 * Orchestrates all toolbar functionality by coordinating between the renderer,
 * button factory, event bus, and state management. Handles user interactions,
 * keyboard navigation, and toolbar lifecycle management.
 * 
 * @author Chrome Extension Team
 * @version 1.0.0
 */

import { ToolbarRenderer } from './ToolbarRenderer.js';
import { toolbarEventBus } from './ToolbarEventBus.js';
import { stateManager } from '../stateManager.js';
// Removed unused configurationManager import

/**
 * @typedef {Object} ToolbarControllerConfig
 * @property {Element} container - Container element for toolbar
 * @property {Array<Object>} buttons - Button configurations
 * @property {Object} [accessibility] - Accessibility settings
 * @property {Object} [behavior] - Behavior settings
 * @property {Object} [styling] - Styling settings
 */

/**
 * @typedef {Object} ToolbarState
 * @property {string} activeMode - Currently active filter mode
 * @property {boolean} isVisible - Whether toolbar is visible
 * @property {boolean} showButtonText - Whether to show button text
 * @property {boolean} isKeyboardFocused - Whether keyboard navigation is active
 * @property {Element|null} focusedElement - Currently focused element
 */

export class ToolbarController {
  /**
   * @param {ToolbarDOMOperations} domOperations - DOM operations instance
   * @param {Object} [options={}] - Controller configuration options
   */
  constructor(domOperations, options = {}) {
    this.domOperations = domOperations;
    
    // Configuration
    this.options = {
      enableKeyboardNavigation: true,
      enableStateSync: true,
      enableAutoRefresh: true,
      autoFocusOnCreate: false,
      enableAccessibility: true,
      enableMetrics: true,
      ...options
    };
    
    // Core components
    this.renderer = new ToolbarRenderer(domOperations, {
      enableMetrics: this.options.enableMetrics,
      enableEventBus: true,
      enableAccessibility: this.options.enableAccessibility
    });
    
    // Internal state
    this.isInitialized = false;
    this.isDestroyed = false;
    this.toolbarId = null;
    this.elements = null;
    this.config = null;
    
    // Toolbar state
    this.state = {
      activeMode: null,
      isVisible: false,
      showButtonText: true,
      isKeyboardFocused: false,
      focusedElement: null
    };
    
    // Event subscriptions
    this.eventSubscriptions = new Set();
    
    // Performance metrics
    this.controllerMetrics = new Map();
    
    // Keyboard navigation state
    this.keyboardNavigation = {
      enabled: this.options.enableKeyboardNavigation,
      currentIndex: -1,
      buttons: []
    };
    
    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.destroy = this.destroy.bind(this);
    this.refresh = this.refresh.bind(this);
    this.handleButtonClick = this.handleButtonClick.bind(this);
    this.handleKeyboardNavigation = this.handleKeyboardNavigation.bind(this);
    
    // Setup event listeners
    this._setupEventListeners();
    
    // Setup state synchronization
    if (this.options.enableStateSync) {
      this._setupStateSynchronization();
    }
  }

  /**
   * Initialize toolbar with configuration
   * @param {ToolbarControllerConfig} config - Toolbar configuration
   * @param {Object} [options={}] - Initialization options
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(config, options = {}) {
    const startTime = performance.now();
    
    try {
      if (this.isInitialized) {
        throw new Error('Toolbar controller already initialized');
      }
      
      if (this.isDestroyed) {
        throw new Error('Toolbar controller has been destroyed');
      }
      
      // Validate configuration
      this._validateConfig(config);
      
      // Store configuration
      this.config = { ...config };
      this.toolbarId = `toolbar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize state from configuration and state manager
      await this._initializeState();
      
      // Render toolbar
      const renderResult = await this.renderer.renderToolbar(
        config.container,
        {
          buttons: config.buttons,
          accessibility: config.accessibility,
          styling: config.styling
        },
        {
          ...options,
          renderingId: this.toolbarId
        }
      );
      
      if (!renderResult.success) {
        throw new Error(`Toolbar rendering failed: ${renderResult.error?.message}`);
      }
      
      // Store rendered elements
      this.elements = renderResult.elements;
      
      // Setup button interactions
      await this._setupButtonInteractions();
      
      // Setup keyboard navigation
      if (this.options.enableKeyboardNavigation) {
        await this._setupKeyboardNavigation();
      }
      
      // Setup accessibility features
      if (this.options.enableAccessibility) {
        await this._setupAccessibilityFeatures();
      }
      
      // Auto-focus if requested
      if (this.options.autoFocusOnCreate && this.elements.buttons.length > 0) {
        await this._focusActiveButton();
      }
      
      // Update visual state
      await this._updateVisualState();
      
      // Mark as initialized
      this.isInitialized = true;
      this.state.isVisible = true;
      
      // Record metrics
      const executionTime = performance.now() - startTime;
      this._recordControllerMetric('initialize', executionTime, true);
      
      // Emit initialization event
      await toolbarEventBus.emit('TOOLBAR_INITIALIZED', {
        toolbarId: this.toolbarId,
        container: config.container,
        config: this.config,
        elements: this.elements,
        executionTime
      });
      
      return {
        success: true,
        toolbarId: this.toolbarId,
        elements: this.elements,
        metadata: {
          executionTime,
          buttonCount: config.buttons.length,
          initializedAt: Date.now()
        }
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this._recordControllerMetric('initialize', executionTime, false);
      
      // Cleanup on failure
      if (this.elements) {
        await this._cleanup();
      }
      
      throw error;
    }
  }

  /**
   * Refresh toolbar UI to match current state
   * @param {Object} [options={}] - Refresh options
   * @returns {Promise<boolean>} Success status
   */
  async refresh(options = {}) {
    const startTime = performance.now();
    
    try {
      if (!this.isInitialized) {
        throw new Error('Toolbar not initialized');
      }
      
      const {
        updateButtons = true,
        updateVisualState = true
      } = options;
      
      // Get current state from state manager
      await this._syncStateFromManager();
      
      // Update button states
      if (updateButtons) {
        await this._updateButtonStates();
      }
      
      // Update visual state
      if (updateVisualState) {
        await this._updateVisualState();
      }
      
      // Update live region
      await this._updateLiveRegion();
      
      // Record metrics
      const executionTime = performance.now() - startTime;
      this._recordControllerMetric('refresh', executionTime, true);
      
      // Emit refresh event
      await toolbarEventBus.emit('TOOLBAR_REFRESH_REQUESTED', {
        toolbarId: this.toolbarId,
        reason: 'manual_refresh',
        options,
        executionTime
      });
      
      return true;
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this._recordControllerMetric('refresh', executionTime, false);
      
      console.error('Toolbar refresh failed:', error);
      return false;
    }
  }

  /**
   * Update toolbar configuration
   * @param {Partial<ToolbarControllerConfig>} configUpdate - Configuration updates
   * @param {Object} [options={}] - Update options
   * @returns {Promise<boolean>} Success status
   */
  async updateConfig(configUpdate, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Toolbar not initialized');
      }
      
      const {
        reRender = false,
        preserveState = true
      } = options;
      
      // Update configuration
      this.config = { ...this.config, ...configUpdate };
      
      if (reRender) {
        // Store current state if preserving
        const currentState = preserveState ? { ...this.state } : null;
        
        // Re-render toolbar
        await this.destroy();
        await this.initialize(this.config);
        
        // Restore state if preserving
        if (preserveState && currentState) {
          this.state = currentState;
          await this._updateVisualState();
        }
      } else {
        // Update specific components without full re-render
        await this._updateFromConfig(configUpdate);
      }
      
      return true;
      
    } catch (error) {
      console.error('Configuration update failed:', error);
      return false;
    }
  }

  /**
   * Handle button click events
   * @param {Event} event - Click event
   * @param {Element} button - Button element
   * @param {Object} buttonConfig - Button configuration
   */
  async handleButtonClick(event, button, buttonConfig) {
    try {
      event.preventDefault();
      
      // Update active mode
      const oldMode = this.state.activeMode;
      this.state.activeMode = buttonConfig.mode;
      
      // Update state manager
      if (this.options.enableStateSync && stateManager) {
        await stateManager.set('filterMode', buttonConfig.mode);
      }
      
      // Update button states
      await this._updateButtonStates();
      
      // Update live region
      await this._updateLiveRegion();
      
      // Emit events
      await toolbarEventBus.emit('BUTTON_CLICKED', {
        mode: buttonConfig.mode,
        element: button,
        config: buttonConfig,
        event
      });
      
      await toolbarEventBus.emit('FILTER_MODE_CHANGED', {
        oldMode,
        newMode: buttonConfig.mode,
        source: 'button_click'
      });
      
    } catch (error) {
      console.error('Button click handling failed:', error);
      
      await toolbarEventBus.emit('BUTTON_ERROR', {
        error,
        buttonConfig,
        operation: 'click'
      });
    }
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  async handleKeyboardNavigation(event) {
    if (!this.options.enableKeyboardNavigation || !this.elements?.buttons) {
      return;
    }
    
    const { key } = event;
    
    try {
      switch (key) {
        case 'ArrowLeft':
        case 'ArrowRight':
          await this._handleArrowNavigation(event);
          break;
          
        case 'Enter':
        case ' ': // Space
          await this._handleActivation(event);
          break;
          
        case 'Escape':
          await this._handleEscape(event);
          break;
          
        case 'Home':
          await this._handleHome(event);
          break;
          
        case 'End':
          await this._handleEnd(event);
          break;
      }
      
    } catch (error) {
      console.error('Keyboard navigation failed:', error);
    }
  }

  /**
   * Set toolbar visibility
   * @param {boolean} visible - Whether toolbar should be visible
   * @param {Object} [options={}] - Visibility options
   * @returns {Promise<boolean>} Success status
   */
  async setVisibility(visible, options = {}) {
    try {
      if (!this.isInitialized) {
        return false;
      }
      
      const { animate = false } = options;
      
      if (this.state.isVisible === visible) {
        return true; // Already in desired state
      }
      
      this.state.isVisible = visible;
      
      // Update DOM visibility
      if (this.elements?.wrapper) {
        if (visible) {
          await this.domOperations.domManager.removeClass(this.elements.wrapper, 'hidden');
          if (animate) {
            await this.domOperations.domManager.addClass(this.elements.wrapper, 'fade-in');
          }
        } else {
          if (animate) {
            await this.domOperations.domManager.addClass(this.elements.wrapper, 'fade-out');
            // Wait for animation to complete
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          await this.domOperations.domManager.addClass(this.elements.wrapper, 'hidden');
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('Visibility update failed:', error);
      return false;
    }
  }

  /**
   * Get toolbar state
   * @returns {ToolbarState} Current toolbar state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get toolbar statistics
   * @returns {Object} Controller statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      isDestroyed: this.isDestroyed,
      toolbarId: this.toolbarId,
      state: this.state,
      keyboardNavigation: this.keyboardNavigation,
      eventSubscriptions: this.eventSubscriptions.size,
      controllerMetrics: Object.fromEntries(this.controllerMetrics),
      renderer: this.renderer?.getStats(),
      options: this.options
    };
  }

  /**
   * Destroy toolbar and cleanup resources
   * @returns {Promise<boolean>} Success status
   */
  async destroy() {
    try {
      if (this.isDestroyed) {
        return true;
      }
      
      // Emit destruction event
      if (this.isInitialized && this.toolbarId) {
        await toolbarEventBus.emit('TOOLBAR_DESTROYED', {
          toolbarId: this.toolbarId
        });
      }
      
      // Cleanup components
      await this._cleanup();
      
      // Mark as destroyed
      this.isDestroyed = true;
      this.isInitialized = false;
      
      return true;
      
    } catch (error) {
      console.error('Toolbar destruction failed:', error);
      return false;
    }
  }

  // ========== Private Methods ==========

  /**
   * Validate controller configuration
   * @private
   * @param {ToolbarControllerConfig} config - Configuration to validate
   */
  _validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration must be an object');
    }
    
    if (!config.container || !(config.container instanceof Element)) {
      throw new Error('Container must be a valid DOM element');
    }
    
    if (!Array.isArray(config.buttons) || config.buttons.length === 0) {
      throw new Error('Configuration must include at least one button');
    }
    
    // Validate each button configuration
    config.buttons.forEach((buttonConfig, index) => {
      if (!buttonConfig.mode) {
        throw new Error(`Button ${index} missing required 'mode' property`);
      }
      if (!buttonConfig.icon) {
        throw new Error(`Button ${index} missing required 'icon' property`);
      }
      if (!buttonConfig.labelKey) {
        throw new Error(`Button ${index} missing required 'labelKey' property`);
      }
    });
  }

  /**
   * Initialize controller state
   * @private
   */
  async _initializeState() {
    // Get initial state from state manager
    if (this.options.enableStateSync && stateManager) {
      try {
        this.state.activeMode = await stateManager.get('filterMode') || 'ALL';
        this.state.showButtonText = await stateManager.get('showButtonText') !== false;
      } catch (error) {
        console.warn('Failed to load state from manager:', error);
        this.state.activeMode = 'ALL';
        this.state.showButtonText = true;
      }
    } else {
      this.state.activeMode = 'ALL';
      this.state.showButtonText = true;
    }
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for state changes from other components
    if (this.options.enableStateSync) {
      const stateSubscription = toolbarEventBus.on('STATE_CHANGED', async (event) => {
        if (this.isInitialized) {
          await this._handleStateChange(event);
        }
      });
      this.eventSubscriptions.add(stateSubscription);
    }
    
    // Listen for configuration changes
    const configSubscription = toolbarEventBus.on('CONFIG_CHANGED', async (event) => {
      if (this.isInitialized) {
        await this._handleConfigChange(event);
      }
    });
    this.eventSubscriptions.add(configSubscription);
  }

  /**
   * Setup state synchronization with state manager
   * @private
   */
  _setupStateSynchronization() {
    if (!stateManager || !stateManager.subscribe) {
      return;
    }
    
    // Subscribe to filter mode changes
    const filterModeSubscription = stateManager.subscribe('stateChanged:filterMode', async (event) => {
      if (this.isInitialized && event.value !== this.state.activeMode) {
        this.state.activeMode = event.value;
        await this._updateButtonStates();
        await this._updateLiveRegion();
      }
    });
    this.eventSubscriptions.add(filterModeSubscription);
    
    // Subscribe to button text visibility changes
    const buttonTextSubscription = stateManager.subscribe('stateChanged:showButtonText', async (event) => {
      if (this.isInitialized && event.value !== this.state.showButtonText) {
        this.state.showButtonText = event.value;
        await this._updateVisualState();
      }
    });
    this.eventSubscriptions.add(buttonTextSubscription);
  }

  /**
   * Setup button interactions
   * @private
   */
  async _setupButtonInteractions() {
    if (!this.elements?.buttons) return;
    
    for (const button of this.elements.buttons) {
      const buttonConfig = this.config.buttons.find(
        config => config.mode === button.dataset.mode
      );
      
      if (buttonConfig) {
        // Add click handler
        button.addEventListener('click', (event) => 
          this.handleButtonClick(event, button, buttonConfig)
        );
        
        // Add focus/blur handlers for keyboard navigation tracking
        button.addEventListener('focus', () => {
          this.state.focusedElement = button;
          this.state.isKeyboardFocused = true;
        });
        
        button.addEventListener('blur', () => {
          if (this.state.focusedElement === button) {
            this.state.focusedElement = null;
            this.state.isKeyboardFocused = false;
          }
        });
      }
    }
  }

  /**
   * Setup keyboard navigation
   * @private
   */
  async _setupKeyboardNavigation() {
    if (!this.elements?.bar) return;
    
    // Store buttons for navigation
    this.keyboardNavigation.buttons = Array.from(this.elements.buttons || []);
    
    // Add keyboard event listener to toolbar
    this.elements.bar.addEventListener('keydown', this.handleKeyboardNavigation);
    
    // Add escape key handler for focus management
    this.elements.bar.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this._handleEscape(event);
      }
    });
  }

  /**
   * Setup accessibility features
   * @private
   */
  async _setupAccessibilityFeatures() {
    if (!this.elements) return;
    
    // Ensure proper ARIA attributes are set
    if (this.elements.bar) {
      await this.domOperations.domManager.setAttribute(
        this.elements.bar,
        'aria-label',
        this.config.accessibility?.toolbarLabel || 'Filter Toolbar'
      );
    }
    
    // Setup live region for announcements
    if (this.elements.liveRegion) {
      await this._updateLiveRegion();
    }
  }

  /**
   * Sync state from state manager
   * @private
   */
  async _syncStateFromManager() {
    if (!this.options.enableStateSync || !stateManager) return;
    
    try {
      const currentMode = await stateManager.get('filterMode');
      const showButtonText = await stateManager.get('showButtonText');
      
      if (currentMode && currentMode !== this.state.activeMode) {
        this.state.activeMode = currentMode;
      }
      
      if (showButtonText !== undefined && showButtonText !== this.state.showButtonText) {
        this.state.showButtonText = showButtonText;
      }
      
    } catch (error) {
      console.warn('Failed to sync state from manager:', error);
    }
  }

  /**
   * Update button states based on current state
   * @private
   */
  async _updateButtonStates() {
    if (!this.elements?.buttons) return;
    
    for (const button of this.elements.buttons) {
      const isActive = button.dataset.mode === this.state.activeMode;
      
      // Update ARIA attributes
      await this.domOperations.domManager.setAttribute(button, 'aria-checked', isActive.toString());
      await this.domOperations.domManager.setAttribute(button, 'tabindex', isActive ? '0' : '-1');
      
      // Update visual state
      if (isActive) {
        await this.domOperations.domManager.addClass(button, 'active');
      } else {
        await this.domOperations.domManager.removeClass(button, 'active');
      }
    }
  }

  /**
   * Update visual state based on current state
   * @private
   */
  async _updateVisualState() {
    if (!this.elements) return;
    
    // Update button text visibility
    await this.renderer.updateToolbarVisualState(this.elements, {
      showButtonText: this.state.showButtonText,
      activeButton: this.state.activeMode
    });
  }

  /**
   * Update live region with current status
   * @private
   */
  async _updateLiveRegion() {
    if (!this.elements?.liveRegion) return;
    
    try {
      // Get current mode configuration
      const currentModeConfig = this.config.buttons.find(
        button => button.mode === this.state.activeMode
      );
      
      if (currentModeConfig) {
        const modeLabel = currentModeConfig.labelKey || 'All Email';
        let statusMessage;
        
        try {
          statusMessage = chrome.i18n.getMessage('filter_status_update', [modeLabel]);
        } catch (error) {
          statusMessage = `Filter set to ${modeLabel}`;
        }
        
        await this.renderer.updateLiveRegion(this.elements.liveRegion, statusMessage);
      }
      
    } catch (error) {
      console.warn('Failed to update live region:', error);
    }
  }

  /**
   * Focus the currently active button
   * @private
   */
  async _focusActiveButton() {
    if (!this.elements?.buttons) return;
    
    const activeButton = this.elements.buttons.find(
      button => button.dataset.mode === this.state.activeMode
    );
    
    if (activeButton) {
      activeButton.focus();
    }
  }

  /**
   * Handle arrow key navigation
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  async _handleArrowNavigation(event) {
    event.preventDefault();
    
    const buttons = this.keyboardNavigation.buttons;
    const currentIndex = buttons.findIndex(btn => btn === document.activeElement);
    
    if (currentIndex === -1) return;
    
    let nextIndex;
    if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    } else {
      nextIndex = (currentIndex + 1) % buttons.length;
    }
    
    const nextButton = buttons[nextIndex];
    if (nextButton) {
      nextButton.focus();
      
      // Emit navigation event
      await toolbarEventBus.emit('KEYBOARD_NAVIGATION', {
        direction: event.key === 'ArrowLeft' ? 'left' : 'right',
        currentButton: buttons[currentIndex],
        nextButton
      });
    }
  }

  /**
   * Handle activation (Enter/Space)
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  async _handleActivation(event) {
    event.preventDefault();
    
    const focusedButton = document.activeElement;
    if (focusedButton && this.elements?.buttons.includes(focusedButton)) {
      focusedButton.click();
    }
  }

  /**
   * Handle escape key
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  async _handleEscape(event) {
    event.preventDefault();
    
    // Return focus to main content area
    const emailList = document.querySelector('[role="main"], [data-thread-id], .gmail-main');
    if (emailList) {
      emailList.focus();
    }
  }

  /**
   * Handle Home key
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  async _handleHome(event) {
    event.preventDefault();
    
    const buttons = this.keyboardNavigation.buttons;
    if (buttons.length > 0) {
      buttons[0].focus();
    }
  }

  /**
   * Handle End key
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  async _handleEnd(event) {
    event.preventDefault();
    
    const buttons = this.keyboardNavigation.buttons;
    if (buttons.length > 0) {
      buttons[buttons.length - 1].focus();
    }
  }

  /**
   * Handle state change events
   * @private
   * @param {Object} event - State change event
   */
  async _handleStateChange(event) {
    const { key, newValue } = event.payload;
    
    switch (key) {
      case 'filterMode':
        if (newValue !== this.state.activeMode) {
          this.state.activeMode = newValue;
          await this._updateButtonStates();
          await this._updateLiveRegion();
        }
        break;
        
      case 'showButtonText':
        if (newValue !== this.state.showButtonText) {
          this.state.showButtonText = newValue;
          await this._updateVisualState();
        }
        break;
    }
  }

  /**
   * Handle configuration change events
   * @private
   * @param {Object} event - Configuration change event
   */
  async _handleConfigChange(_event) {
    // React to configuration changes that affect the toolbar
    if (this.options.enableAutoRefresh) {
      await this.refresh({ forceRefresh: true });
    }
  }

  /**
   * Update specific components from configuration changes
   * @private
   * @param {Object} configUpdate - Configuration updates
   */
  async _updateFromConfig(configUpdate) {
    // Handle specific configuration updates without full re-render
    if (configUpdate.buttons) {
      // Button configuration changed - may need to re-render buttons
      console.log('Button configuration updated, may require re-render');
    }
    
    if (configUpdate.accessibility) {
      // Accessibility configuration changed
      await this._setupAccessibilityFeatures();
    }
  }

  /**
   * Record controller metrics
   * @private
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {boolean} success - Success status
   */
  _recordControllerMetric(operation, duration, success) {
    if (!this.options.enableMetrics) return;
    
    if (!this.controllerMetrics.has(operation)) {
      this.controllerMetrics.set(operation, {
        total: 0,
        successful: 0,
        failed: 0,
        totalDuration: 0,
        avgDuration: 0
      });
    }
    
    const metric = this.controllerMetrics.get(operation);
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
   * Cleanup resources and remove event listeners
   * @private
   */
  async _cleanup() {
    // Remove event subscriptions
    for (const subscriptionId of this.eventSubscriptions) {
      try {
        toolbarEventBus.off(subscriptionId);
      } catch (error) {
        console.warn('Failed to remove event subscription:', error);
      }
    }
    this.eventSubscriptions.clear();
    
    // Cleanup renderer
    if (this.renderer) {
      if (this.elements) {
        await this.renderer.removeToolbar(this.elements);
      }
      this.renderer.destroy();
      this.renderer = null;
    }
    
    // Clear references
    this.elements = null;
    this.config = null;
    this.toolbarId = null;
    this.state = {
      activeMode: null,
      isVisible: false,
      showButtonText: true,
      isKeyboardFocused: false,
      focusedElement: null
    };
  }
}

export default ToolbarController;