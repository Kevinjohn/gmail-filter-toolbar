/**
 * ToolbarStateManager - Specialized State Management for Toolbar Module
 * 
 * Provides toolbar-specific state management patterns while integrating with
 * the global StateManager. Handles toolbar state persistence, validation,
 * and change propagation with optimized performance for toolbar operations.
 * 
 * @author Chrome Extension Team
 * @version 1.0.0
 */

import { stateManager } from '../stateManager.js';
// Removed unused configurationManager import
import { toolbarEventBus } from './ToolbarEventBus.js';

/**
 * @typedef {Object} ToolbarState
 * @property {string} activeMode - Currently active filter mode
 * @property {boolean} isVisible - Whether toolbar is visible
 * @property {boolean} showButtonText - Whether to show button text
 * @property {string} placement - Toolbar placement (top, bottom, etc.)
 * @property {string} theme - Current theme
 * @property {Object} buttonStates - Individual button states
 * @property {Object} keyboardNavigation - Keyboard navigation state
 * @property {Object} accessibility - Accessibility settings
 * @property {Object} performance - Performance-related state
 */

/**
 * @typedef {Object} StateChangeEvent
 * @property {string} key - State key that changed
 * @property {any} oldValue - Previous value
 * @property {any} newValue - New value
 * @property {string} source - Source of the change
 * @property {number} timestamp - Change timestamp
 */

export class ToolbarStateManager {
  /**
   * @param {Object} [options={}] - State manager configuration options
   */
  constructor(options = {}) {
    this.options = {
      enablePersistence: true,
      enableValidation: true,
      enableEventBus: true,
      enableMetrics: true,
      autoSave: true,
      autoSaveDelay: 500,
      enableChangeTracking: true,
      ...options
    };
    
    // Internal state storage
    this._state = {
      activeMode: 'ALL',
      isVisible: true,
      showButtonText: true,
      placement: 'top',
      theme: 'default',
      buttonStates: {},
      keyboardNavigation: {
        enabled: true,
        currentIndex: -1,
        lastFocused: null
      },
      accessibility: {
        announceChanges: true,
        highContrast: false,
        reduceMotion: false
      },
      performance: {
        renderingEnabled: true,
        animationsEnabled: true,
        debounceDelay: 100
      }
    };
    
    // State metadata
    this._metadata = {
      version: 1,
      lastUpdated: Date.now(),
      changeCount: 0,
      subscribers: new Map(),
      validationRules: new Map(),
      changeHistory: []
    };
    
    // Performance tracking
    this._metrics = {
      stateChanges: 0,
      persistenceOperations: 0,
      validationChecks: 0,
      eventEmissions: 0
    };
    
    // Auto-save timer
    this._autoSaveTimer = null;
    
    // Change tracking
    this._pendingChanges = new Map();
    this._isInitialized = false;
    
    // Bind methods
    this.get = this.get.bind(this);
    this.set = this.set.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    
    // Initialize validation rules
    this._initializeValidationRules();
    
    // Setup global state integration
    this._setupGlobalStateIntegration();
  }

  /**
   * Initialize toolbar state manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._isInitialized) {
      return;
    }
    
    try {
      // Load state from global state manager
      await this._loadFromGlobalState();
      
      // Load persisted toolbar-specific state
      if (this.options.enablePersistence) {
        await this._loadPersistedState();
      }
      
      // Validate loaded state
      if (this.options.enableValidation) {
        await this._validateState();
      }
      
      // Setup auto-save if enabled
      if (this.options.autoSave) {
        this._setupAutoSave();
      }
      
      this._isInitialized = true;
      
      // Emit initialization event
      if (this.options.enableEventBus) {
        await toolbarEventBus.emit('TOOLBAR_STATE_INITIALIZED', {
          state: this._state,
          metadata: this._metadata
        });
      }
      
    } catch (error) {
      console.error('ToolbarStateManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get state value by key
   * @param {string} key - State key
   * @param {any} [defaultValue] - Default value if key not found
   * @returns {any} State value
   */
  get(key, defaultValue = undefined) {
    if (!this._isInitialized) {
      console.warn('ToolbarStateManager not initialized');
      return defaultValue;
    }
    
    // Support nested key access (e.g., 'buttonStates.mode1')
    const keys = key.split('.');
    let value = this._state;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Set state value by key
   * @param {string} key - State key
   * @param {any} value - Value to set
   * @param {Object} [options={}] - Set options
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, options = {}) {
    if (!this._isInitialized) {
      console.warn('ToolbarStateManager not initialized');
      return false;
    }
    
    try {
      const {
        source = 'unknown',
        skipValidation = false,
        skipEvents = false,
        skipPersistence = false
      } = options;
      
      // Get current value for comparison
      const oldValue = this.get(key);
      
      // Skip if value hasn't changed
      if (oldValue === value) {
        return true;
      }
      
      // Validate new value
      if (this.options.enableValidation && !skipValidation) {
        const isValid = await this._validateValue(key, value);
        if (!isValid) {
          throw new Error(`Invalid value for key '${key}': ${value}`);
        }
      }
      
      // Update state
      this._updateNestedState(key, value);
      
      // Update metadata
      this._metadata.lastUpdated = Date.now();
      this._metadata.changeCount++;
      this._metrics.stateChanges++;
      
      // Track change
      if (this.options.enableChangeTracking) {
        this._trackChange(key, oldValue, value, source);
      }
      
      // Emit state change event
      if (this.options.enableEventBus && !skipEvents) {
        await this._emitStateChange(key, oldValue, value, source);
      }
      
      // Update global state for key toolbar properties
      await this._updateGlobalState(key, value);
      
      // Schedule persistence
      if (this.options.enablePersistence && !skipPersistence) {
        this._schedulePersistence();
      }
      
      return true;
      
    } catch (error) {
      console.error(`Failed to set state '${key}':`, error);
      return false;
    }
  }

  /**
   * Update multiple state values atomically
   * @param {Object} updates - Object with key-value pairs to update
   * @param {Object} [options={}] - Update options
   * @returns {Promise<boolean>} Success status
   */
  async updateMultiple(updates, options = {}) {
    const {
      source = 'batch_update',
      atomic = true
    } = options;
    
    if (atomic) {
      // Validate all updates before applying any
      for (const [key, value] of Object.entries(updates)) {
        if (this.options.enableValidation) {
          const isValid = await this._validateValue(key, value);
          if (!isValid) {
            throw new Error(`Invalid value in batch update for key '${key}': ${value}`);
          }
        }
      }
    }
    
    // Apply all updates
    const results = await Promise.allSettled(
      Object.entries(updates).map(([key, value]) =>
        this.set(key, value, { ...options, source })
      )
    );
    
    // Check if all updates succeeded
    const succeeded = results.every(result => result.status === 'fulfilled' && result.value);
    
    if (!succeeded && atomic) {
      console.error('Batch update failed, some values may be inconsistent');
    }
    
    return succeeded;
  }

  /**
   * Subscribe to state changes
   * @param {string|Array<string>} keys - State key(s) to subscribe to
   * @param {Function} callback - Callback function
   * @param {Object} [options={}] - Subscription options
   * @returns {string} Subscription ID
   */
  subscribe(keys, callback, options = {}) {
    const {
      immediate = false,
      once = false
    } = options;
    
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription = {
      id: subscriptionId,
      keys: keyArray,
      callback,
      options: { immediate, once },
      createdAt: Date.now()
    };
    
    this._metadata.subscribers.set(subscriptionId, subscription);
    
    // Call immediately with current values if requested
    if (immediate) {
      const currentValues = {};
      keyArray.forEach(key => {
        currentValues[key] = this.get(key);
      });
      
      try {
        callback({
          type: 'immediate',
          values: currentValues,
          source: 'subscription'
        });
      } catch (error) {
        console.error('Subscription callback failed:', error);
      }
    }
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from state changes
   * @param {string} subscriptionId - Subscription ID
   * @returns {boolean} Success status
   */
  unsubscribe(subscriptionId) {
    return this._metadata.subscribers.delete(subscriptionId);
  }

  /**
   * Get button state
   * @param {string} buttonMode - Button mode identifier
   * @returns {Object} Button state
   */
  getButtonState(buttonMode) {
    return this.get(`buttonStates.${buttonMode}`, {
      isActive: false,
      isEnabled: true,
      isVisible: true,
      lastClicked: null
    });
  }

  /**
   * Set button state
   * @param {string} buttonMode - Button mode identifier
   * @param {Object} state - Button state updates
   * @param {Object} [options={}] - Set options
   * @returns {Promise<boolean>} Success status
   */
  async setButtonState(buttonMode, state, options = {}) {
    const currentState = this.getButtonState(buttonMode);
    const newState = { ...currentState, ...state };
    
    return await this.set(`buttonStates.${buttonMode}`, newState, options);
  }

  /**
   * Reset toolbar state to defaults
   * @param {Object} [options={}] - Reset options
   * @returns {Promise<boolean>} Success status
   */
  async reset(options = {}) {
    const {
      preserveUserPreferences = true,
      source = 'reset'
    } = options;
    
    const defaultState = {
      activeMode: 'ALL',
      isVisible: true,
      showButtonText: true,
      placement: 'top',
      theme: 'default',
      buttonStates: {},
      keyboardNavigation: {
        enabled: true,
        currentIndex: -1,
        lastFocused: null
      },
      accessibility: preserveUserPreferences ? this._state.accessibility : {
        announceChanges: true,
        highContrast: false,
        reduceMotion: false
      },
      performance: {
        renderingEnabled: true,
        animationsEnabled: true,
        debounceDelay: 100
      }
    };
    
    // Update state
    this._state = defaultState;
    
    // Update metadata
    this._metadata.lastUpdated = Date.now();
    this._metadata.changeCount++;
    
    // Emit reset event
    if (this.options.enableEventBus) {
      await toolbarEventBus.emit('TOOLBAR_STATE_RESET', {
        state: this._state,
        source,
        preserveUserPreferences
      });
    }
    
    // Persist changes
    if (this.options.enablePersistence) {
      await this._persistState();
    }
    
    return true;
  }

  /**
   * Get current state snapshot
   * @returns {Object} Complete state object
   */
  getSnapshot() {
    return {
      state: JSON.parse(JSON.stringify(this._state)),
      metadata: {
        version: this._metadata.version,
        lastUpdated: this._metadata.lastUpdated,
        changeCount: this._metadata.changeCount
      },
      metrics: { ...this._metrics }
    };
  }

  /**
   * Get state statistics
   * @returns {Object} State statistics
   */
  getStats() {
    return {
      isInitialized: this._isInitialized,
      state: this._state,
      metadata: {
        ...this._metadata,
        subscribers: this._metadata.subscribers.size,
        validationRules: this._metadata.validationRules.size,
        changeHistorySize: this._metadata.changeHistory.length
      },
      metrics: this._metrics,
      options: this.options
    };
  }

  /**
   * Destroy state manager and cleanup resources
   */
  async destroy() {
    // Cancel auto-save timer
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
    
    // Final persistence if enabled
    if (this.options.enablePersistence && this._pendingChanges.size > 0) {
      await this._persistState();
    }
    
    // Clear all subscribers
    this._metadata.subscribers.clear();
    
    // Clear change tracking
    this._pendingChanges.clear();
    this._metadata.changeHistory = [];
    
    // Mark as destroyed
    this._isInitialized = false;
    
    // Emit destruction event
    if (this.options.enableEventBus) {
      await toolbarEventBus.emit('TOOLBAR_STATE_DESTROYED', {
        finalStats: this.getStats()
      });
    }
  }

  // ========== Private Methods ==========

  /**
   * Initialize validation rules
   * @private
   */
  _initializeValidationRules() {
    this._metadata.validationRules.set('activeMode', (value) => {
      return typeof value === 'string' && value.length > 0;
    });
    
    this._metadata.validationRules.set('isVisible', (value) => {
      return typeof value === 'boolean';
    });
    
    this._metadata.validationRules.set('showButtonText', (value) => {
      return typeof value === 'boolean';
    });
    
    this._metadata.validationRules.set('placement', (value) => {
      return ['top', 'bottom', 'left', 'right'].includes(value);
    });
    
    this._metadata.validationRules.set('theme', (value) => {
      return typeof value === 'string';
    });
  }

  /**
   * Setup global state integration
   * @private
   */
  _setupGlobalStateIntegration() {
    if (!stateManager || !stateManager.subscribe) {
      return;
    }
    
    // Subscribe to relevant global state changes
    stateManager.subscribe('stateChanged:filterMode', (event) => {
      if (this._isInitialized && event.value !== this._state.activeMode) {
        this.set('activeMode', event.value, { 
          source: 'global_state', 
          skipEvents: false 
        });
      }
    });
    
    stateManager.subscribe('stateChanged:showButtonText', (event) => {
      if (this._isInitialized && event.value !== this._state.showButtonText) {
        this.set('showButtonText', event.value, { 
          source: 'global_state', 
          skipEvents: false 
        });
      }
    });
  }

  /**
   * Load state from global state manager
   * @private
   */
  async _loadFromGlobalState() {
    if (!stateManager) return;
    
    try {
      const globalFilterMode = await stateManager.get('filterMode');
      const globalShowButtonText = await stateManager.get('showButtonText');
      
      if (globalFilterMode) {
        this._state.activeMode = globalFilterMode;
      }
      
      if (globalShowButtonText !== undefined) {
        this._state.showButtonText = globalShowButtonText;
      }
      
    } catch (error) {
      console.warn('Failed to load from global state:', error);
    }
  }

  /**
   * Load persisted toolbar state
   * @private
   */
  async _loadPersistedState() {
    try {
      // Load from chrome.storage.local
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['toolbarState'], resolve);
      });
      
      if (result.toolbarState) {
        const persistedState = result.toolbarState;
        
        // Merge with current state (preserving structure)
        this._state = {
          ...this._state,
          ...persistedState.state
        };
        
        // Update metadata if available
        if (persistedState.metadata) {
          this._metadata.version = persistedState.metadata.version || this._metadata.version;
        }
      }
      
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
    }
  }

  /**
   * Validate current state
   * @private
   */
  async _validateState() {
    const validationPromises = [];
    
    for (const [key, value] of Object.entries(this._state)) {
      if (this._metadata.validationRules.has(key)) {
        validationPromises.push(this._validateValue(key, value));
      }
    }
    
    const results = await Promise.allSettled(validationPromises);
    const failures = results.filter(result => 
      result.status === 'rejected' || !result.value
    );
    
    if (failures.length > 0) {
      console.warn(`State validation found ${failures.length} issues`);
    }
    
    this._metrics.validationChecks += results.length;
  }

  /**
   * Validate a specific value
   * @private
   * @param {string} key - State key
   * @param {any} value - Value to validate
   * @returns {Promise<boolean>} Validation result
   */
  async _validateValue(key, value) {
    // Handle nested keys
    const topLevelKey = key.split('.')[0];
    const validator = this._metadata.validationRules.get(topLevelKey);
    
    if (!validator) {
      return true; // No validation rule = valid
    }
    
    try {
      const result = await validator(value);
      this._metrics.validationChecks++;
      return Boolean(result);
    } catch (error) {
      console.error(`Validation failed for ${key}:`, error);
      return false;
    }
  }

  /**
   * Update nested state value
   * @private
   * @param {string} key - State key (supports dot notation)
   * @param {any} value - Value to set
   */
  _updateNestedState(key, value) {
    const keys = key.split('.');
    let current = this._state;
    
    // Navigate to parent object
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    // Set the final value
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Track state change
   * @private
   * @param {string} key - State key
   * @param {any} oldValue - Previous value
   * @param {any} newValue - New value
   * @param {string} source - Change source
   */
  _trackChange(key, oldValue, newValue, source) {
    const change = {
      key,
      oldValue,
      newValue,
      source,
      timestamp: Date.now()
    };
    
    this._metadata.changeHistory.push(change);
    
    // Limit history size
    if (this._metadata.changeHistory.length > 100) {
      this._metadata.changeHistory = this._metadata.changeHistory.slice(-100);
    }
    
    // Mark as pending for persistence
    this._pendingChanges.set(key, change);
  }

  /**
   * Emit state change event
   * @private
   * @param {string} key - State key
   * @param {any} oldValue - Previous value
   * @param {any} newValue - New value
   * @param {string} source - Change source
   */
  async _emitStateChange(key, oldValue, newValue, source) {
    try {
      // Emit to event bus
      await toolbarEventBus.emit('TOOLBAR_STATE_CHANGED', {
        key,
        oldValue,
        newValue,
        source,
        timestamp: Date.now()
      });
      
      // Notify subscribers
      this._notifySubscribers(key, oldValue, newValue, source);
      
      this._metrics.eventEmissions++;
      
    } catch (error) {
      console.error('Failed to emit state change:', error);
    }
  }

  /**
   * Notify subscribers of state changes
   * @private
   * @param {string} key - State key
   * @param {any} oldValue - Previous value
   * @param {any} newValue - New value
   * @param {string} source - Change source
   */
  _notifySubscribers(key, oldValue, newValue, source) {
    const subscribersToRemove = [];
    
    for (const [subscriptionId, subscription] of this._metadata.subscribers) {
      try {
        // Check if this subscription is interested in this key
        if (subscription.keys.includes(key) || subscription.keys.includes('*')) {
          const eventData = {
            type: 'change',
            key,
            oldValue,
            newValue,
            source,
            timestamp: Date.now()
          };
          
          subscription.callback(eventData);
          
          // Remove once-only subscriptions
          if (subscription.options.once) {
            subscribersToRemove.push(subscriptionId);
          }
        }
        
      } catch (error) {
        console.error(`Subscriber callback failed for ${subscriptionId}:`, error);
        subscribersToRemove.push(subscriptionId);
      }
    }
    
    // Clean up failed or once-only subscriptions
    subscribersToRemove.forEach(id => this._metadata.subscribers.delete(id));
  }

  /**
   * Update global state for key properties
   * @private
   * @param {string} key - State key
   * @param {any} value - Value
   */
  async _updateGlobalState(key, value) {
    if (!stateManager) return;
    
    try {
      // Update global state for properties that should be synchronized
      switch (key) {
        case 'activeMode':
          await stateManager.set('filterMode', value);
          break;
          
        case 'showButtonText':
          await stateManager.set('showButtonText', value);
          break;
      }
      
    } catch (error) {
      console.warn(`Failed to update global state for ${key}:`, error);
    }
  }

  /**
   * Setup auto-save functionality
   * @private
   */
  _setupAutoSave() {
    // Auto-save will be triggered by _schedulePersistence
  }

  /**
   * Schedule state persistence
   * @private
   */
  _schedulePersistence() {
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
    }
    
    this._autoSaveTimer = setTimeout(async () => {
      await this._persistState();
      this._autoSaveTimer = null;
    }, this.options.autoSaveDelay);
  }

  /**
   * Persist state to storage
   * @private
   */
  async _persistState() {
    try {
      const stateData = {
        state: this._state,
        metadata: {
          version: this._metadata.version,
          lastUpdated: this._metadata.lastUpdated,
          changeCount: this._metadata.changeCount
        }
      };
      
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ toolbarState: stateData }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
      
      // Clear pending changes
      this._pendingChanges.clear();
      this._metrics.persistenceOperations++;
      
    } catch (error) {
      console.error('Failed to persist toolbar state:', error);
    }
  }
}

// Export singleton instance
export const toolbarStateManager = new ToolbarStateManager({
  enablePersistence: true,
  enableValidation: true,
  enableEventBus: true,
  enableMetrics: true,
  autoSave: true,
  autoSaveDelay: 500
});

export default toolbarStateManager;