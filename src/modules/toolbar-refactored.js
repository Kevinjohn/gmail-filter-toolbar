/**
 * Toolbar Module (Refactored with DOM Abstraction)
 * 
 * Business logic for toolbar functionality separated from DOM operations.
 * Uses DOM abstraction layer for all DOM interactions.
 */

import { stateManager } from './stateManager.js';
import { configurationManager } from './configurationManager.js';
import {
  sanitizeTextContent,
  validateDatasetAttribute,
  safeGetI18nMessage
} from './utils/validation.js';

export class ToolbarManager {
  /**
   * @param {Object} domOperations - Toolbar DOM operations instance
   * @param {Object} [options={}] - Configuration options
   */
  constructor(domOperations, options = {}) {
    this.domOperations = domOperations;
    this.options = {
      enableAutoRefresh: true,
      enableKeyboardNavigation: true,
      ...options
    };
    
    // State tracking
    this.currentToolbarId = null;
    this.isInitialized = false;
    this.eventListeners = new Map();
    
    // Bind methods to preserve context
    this.injectToolbar = this.injectToolbar.bind(this);
    this.refreshUI = this.refreshUI.bind(this);
    this.updateButtonTextView = this.updateButtonTextView.bind(this);
    
    // Set up state subscriptions if auto-refresh is enabled
    if (this.options.enableAutoRefresh) {
      this.setupStateSubscriptions();
    }
  }

  /**
   * Inject toolbar into Gmail interface
   * @param {Element} [headerElement] - Header element to inject after
   * @returns {Promise<Object>} Injection result
   */
  async injectToolbar(headerElement = null) {
    try {
      // Find header element if not provided
      let header = headerElement;
      if (!header) {
        const headerResult = await this.domOperations.domManager.select(
          configurationManager.getSelector('gmailToolbarHeader'),
          {
            fallbackSelectors: [
              '.nH .ar9',
              '[role="banner"] + div',
              '.G-Ni .G-asx'
            ],
            timeout: 5000
          }
        );
        
        if (!headerResult.success || !headerResult.data) {
          throw new Error('Gmail toolbar header not found');
        }
        
        header = headerResult.data;
      }

      // Create toolbar configuration
      const toolbarConfig = this.createToolbarConfig();
      
      // Inject toolbar using DOM operations
      const injectionResult = await this.domOperations.injectToolbar(
        header,
        toolbarConfig,
        {
          wrapperClass: configurationManager.getClassName('filterWrapperClass'),
          barClass: configurationManager.getClassName('filterBarClass'),
          replaceExisting: true,
          enableLiveRegion: true
        }
      );

      if (!injectionResult.success) {
        throw new Error('Failed to inject toolbar');
      }

      // Store toolbar reference
      this.currentToolbarId = injectionResult.toolbarId;
      
      // Set up event handling
      await this.setupEventHandling(injectionResult.buttons);
      
      // Apply initial UI state
      await this.refreshUI();
      await this.updateButtonTextView(stateManager.get('showButtonText'));
      
      this.isInitialized = true;
      
      return {
        success: true,
        toolbarId: this.currentToolbarId,
        buttonsCount: injectionResult.buttons.length
      };

    } catch (error) {
      console.error('Toolbar injection failed:', error);
      throw error;
    }
  }

  /**
   * Refresh UI to reflect current state
   * @returns {Promise<Object>} Refresh result
   */
  async refreshUI() {
    if (!this.currentToolbarId) {
      console.warn('No toolbar to refresh');
      return { success: false, reason: 'No active toolbar' };
    }

    try {
      const currentMode = stateManager.get('filterMode');
      const toolbar = this.domOperations.getToolbar(this.currentToolbarId);
      
      if (!toolbar) {
        throw new Error('Toolbar not found');
      }

      // Update button states
      const updatePromises = toolbar.buttons.map(async (button) => {
        const buttonMode = button.dataset.mode;
        const isActive = buttonMode === currentMode;
        
        return this.domOperations.updateButtonState(button, isActive, {
          animate: true
        });
      });

      await Promise.all(updatePromises);

      // Update live region with current status
      const statusMessage = this.createStatusMessage(currentMode);
      await this.domOperations.updateLiveRegion(
        this.currentToolbarId,
        statusMessage
      );

      return {
        success: true,
        currentMode,
        buttonsUpdated: toolbar.buttons.length
      };

    } catch (error) {
      console.error('UI refresh failed:', error);
      throw error;
    }
  }

  /**
   * Update button text visibility
   * @param {boolean} showText - Whether to show button text
   * @returns {Promise<Object>} Update result
   */
  async updateButtonTextView(showText) {
    if (!this.currentToolbarId) {
      console.warn('No toolbar to update');
      return { success: false, reason: 'No active toolbar' };
    }

    try {
      await this.domOperations.updateButtonTextVisibility(
        this.currentToolbarId,
        showText,
        { animate: true }
      );

      return {
        success: true,
        showText
      };

    } catch (error) {
      console.error('Button text view update failed:', error);
      throw error;
    }
  }

  /**
   * Handle button click events
   * @param {Event} event - Click event
   * @returns {Promise<void>}
   */
  async handleButtonClick(event) {
    try {
      const button = event.target.closest('button[data-mode]');
      if (!button) return;

      // Validate mode from dataset
      const mode = validateDatasetAttribute('mode', button.dataset.mode);
      
      // Update state
      await stateManager.set('filterMode', mode);
      
      // Refresh UI will be handled by state subscription
      
    } catch (error) {
      console.error('Button click handling failed:', error);
    }
  }

  /**
   * Handle keyboard navigation
   * @param {Event} event - Keyboard event
   * @returns {Promise<void>}
   */
  async handleKeyboardNavigation(event) {
    if (!this.options.enableKeyboardNavigation) return;
    
    const { key } = event;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Escape') return;

    try {
      if (key === 'Escape') {
        // Focus email list
        const emailListResult = await this.domOperations.domManager.select(
          configurationManager.getSelector('emailList'),
          { timeout: 1000 }
        );
        
        if (emailListResult.success && emailListResult.data) {
          emailListResult.data.focus();
        }
        return;
      }

      // Arrow key navigation is handled by the toolbar DOM operations
      // through the button group keyboard navigation setup
      
    } catch (error) {
      console.error('Keyboard navigation failed:', error);
    }
  }

  // ========== Helper Methods ==========

  /**
   * Create toolbar configuration from current settings
   * @returns {Object} Toolbar configuration
   */
  createToolbarConfig() {
    const allFilterModes = configurationManager.getAllFilterModes();
    const buttons = Object.keys(allFilterModes).map(mode => {
      const config = allFilterModes[mode];
      return {
        mode,
        icon: config.icon,
        labelKey: safeGetI18nMessage(config.labelKey, 'Filter Button'),
        tooltip: safeGetI18nMessage(config.labelKey, 'Filter Button')
      };
    });

    return {
      buttons,
      toolbarLabel: safeGetI18nMessage(
        'label_toolbar',
        configurationManager.getAriaConfig('toolbarLabel')
      ),
      groupLabel: safeGetI18nMessage(
        'label_options',
        configurationManager.getAriaConfig('filterOptionsLabel')
      )
    };
  }

  /**
   * Create status message for live region
   * @param {string} mode - Current filter mode
   * @returns {string} Status message
   */
  createStatusMessage(mode) {
    try {
      const filterConfig = configurationManager.getFilterModeConfig(mode);
      const labelKey = filterConfig ? filterConfig.labelKey : 'btn_all';
      
      const currentModeLabel = sanitizeTextContent(
        safeGetI18nMessage(labelKey, 'All Email'),
        'All Email'
      );
      
      // Use Chrome i18n API with substitutions
      const rawMessage = chrome.i18n.getMessage('filter_status_update', [currentModeLabel]);
      return sanitizeTextContent(rawMessage, `Filter set to ${currentModeLabel}`);
      
    } catch (error) {
      console.error('Error creating status message:', error);
      return 'Filter updated';
    }
  }

  /**
   * Set up event handling for toolbar buttons
   * @param {Array<Element>} buttons - Button elements
   * @returns {Promise<void>}
   */
  async setupEventHandling(_buttons) {
    // Clear existing event listeners
    this.clearEventListeners();

    // Set up click handling on toolbar container
    const toolbar = this.domOperations.getToolbar(this.currentToolbarId);
    if (!toolbar) return;

    // Use event delegation for button clicks
    const clickHandler = this.handleButtonClick.bind(this);
    await this.domOperations.domManager.delegateEvent(
      toolbar.bar,
      'button[data-mode]',
      'click',
      clickHandler
    );

    // Set up keyboard navigation
    const keyboardHandler = this.handleKeyboardNavigation.bind(this);
    await this.domOperations.domManager.addEventListener(
      toolbar.bar,
      'keydown',
      keyboardHandler
    );

    // Store event listener references for cleanup
    this.eventListeners.set('click', clickHandler);
    this.eventListeners.set('keydown', keyboardHandler);
  }

  /**
   * Set up state subscriptions for automatic UI updates
   */
  setupStateSubscriptions() {
    // Subscribe to filter mode changes
    stateManager.subscribe('stateChanged:filterMode', () => {
      if (this.isInitialized) {
        this.refreshUI().catch(error => {
          console.error('Error refreshing UI on state change:', error);
        });
      }
    });

    // Subscribe to button text visibility changes
    stateManager.subscribe('stateChanged:showButtonText', ({ value }) => {
      if (this.isInitialized) {
        this.updateButtonTextView(value).catch(error => {
          console.error('Error updating button text view on state change:', error);
        });
      }
    });
  }

  /**
   * Clear event listeners
   */
  clearEventListeners() {
    this.eventListeners.clear();
  }

  /**
   * Get current toolbar state
   * @returns {Object|null} Toolbar state
   */
  getToolbarState() {
    if (!this.currentToolbarId) {
      return null;
    }

    const toolbar = this.domOperations.getToolbar(this.currentToolbarId);
    return toolbar ? {
      toolbarId: this.currentToolbarId,
      isInitialized: this.isInitialized,
      buttonsCount: toolbar.buttons.length,
      currentMode: stateManager.get('filterMode'),
      showButtonText: stateManager.get('showButtonText')
    } : null;
  }

  /**
   * Cleanup toolbar and resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      // Clear event listeners
      this.clearEventListeners();

      // Remove toolbar if it exists
      if (this.currentToolbarId) {
        await this.domOperations.removeToolbar(this.currentToolbarId);
        this.currentToolbarId = null;
      }

      this.isInitialized = false;

    } catch (error) {
      console.error('Toolbar cleanup failed:', error);
    }
  }

  /**
   * Destroy toolbar manager and cleanup all resources
   * @returns {Promise<void>}
   */
  async destroy() {
    await this.cleanup();
    this.domOperations = null;
  }
}

// Legacy compatibility functions for backward compatibility during migration
export function injectToolbar(_doc = document, _headerElement) {
  console.warn('Legacy injectToolbar called - consider migrating to ToolbarManager');
  // This would require a global DOM operations instance
  // For now, just log the call
}

export function updateButtonTextView(showText, _doc = document) {
  console.warn('Legacy updateButtonTextView called - consider migrating to ToolbarManager');
}

export function refreshUI(_doc = document) {
  console.warn('Legacy refreshUI called - consider migrating to ToolbarManager');
}