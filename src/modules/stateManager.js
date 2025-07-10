/**
 * StateManager Module - Centralized State Management for Chrome Extension
 * 
 * This module provides a comprehensive state management system with:
 * - Centralized store with immutable updates
 * - Event-driven state change notifications
 * - Persistent storage with automatic synchronization
 * - Schema validation and migration support
 * - Performance optimizations (batching, immutable updates)
 * 
 * @typedef {Object} ExtensionState
 * @property {string} filterMode - Current filter mode (ALL, EMAIL, CALENDAR, etc.)
 * @property {boolean} debugMode - Debug mode state
 * @property {boolean} showButtonText - Whether to show button text in UI
 * @property {string} toolbarPlacement - Toolbar placement preference
 * @property {Object} userPreferences - User-specific preferences
 * @property {string} userPreferences.theme - UI theme preference
 * @property {string} userPreferences.language - Language preference
 * @property {number} userPreferences.refreshRate - Refresh rate in milliseconds
 * @property {Object} metadata - State metadata
 * @property {number} metadata.version - State schema version
 * @property {number} metadata.lastUpdated - Timestamp of last update
 * @property {string} metadata.migrationSource - Source version for migrations
 */

import {
  validateMode,
  validateBoolean,
  validateStorageError
} from './utils/validation.js';

// State schema version for migration support
const CURRENT_SCHEMA_VERSION = 1;

// Storage keys
const STORAGE_KEYS = {
  FILTER_MODE: 'gmailCalMode',
  DEBUG_MODE: 'gmailCalDebug', 
  SHOW_BUTTON_TEXT: 'showButtonText',
  TOOLBAR_PLACEMENT: 'toolbarPlacement',
  USER_PREFERENCES: 'userPreferences',
  STATE_METADATA: 'stateMetadata'
};

// Default state configuration
const DEFAULT_STATE = {
  filterMode: 'ALL',
  debugMode: false,
  showButtonText: true,
  toolbarPlacement: 'top',
  userPreferences: {
    theme: 'auto',
    language: 'auto', 
    refreshRate: 1000
  },
  metadata: {
    version: CURRENT_SCHEMA_VERSION,
    lastUpdated: Date.now(),
    migrationSource: null
  }
};

// Valid values for state properties
const VALID_VALUES = {
  filterMode: new Set(['ALL', 'EMAIL', 'CALENDAR', 'ATTACH', 'FAVOURITES', 'IMAGE', 'PDF', 'DOCUMENT', 'SPREADSHEET', 'PRESENTATION']),
  toolbarPlacement: new Set(['top', 'bottom', 'inline']),
  theme: new Set(['light', 'dark', 'auto']),
  language: new Set(['auto', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'])
};

/**
 * Event emitter for state change notifications
 * Implements publisher-subscriber pattern for reactive updates
 */
class StateEventEmitter {
  constructor() {
    this.listeners = new Map();
    this.batchedEvents = [];
    this.batchTimeout = null;
    this.maxBatchSize = 10;
    this.batchDelay = 50; // ms
  }

  /**
   * Subscribe to state change events
   * @param {string} eventType - Event type to listen for
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Emit state change event with batching
   * @param {string} eventType - Event type
   * @param {Object} payload - Event payload
   */
  emit(eventType, payload) {
    // Add to batch
    this.batchedEvents.push({ eventType, payload, timestamp: Date.now() });
    
    // Process batch if full or schedule timeout
    if (this.batchedEvents.length >= this.maxBatchSize) {
      this.processBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.processBatch(), this.batchDelay);
    }
  }

  /**
   * Process batched events
   * @private
   */
  processBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const events = [...this.batchedEvents];
    this.batchedEvents.length = 0;

    // Group events by type and emit
    const eventGroups = new Map();
    events.forEach(({ eventType, payload }) => {
      if (!eventGroups.has(eventType)) {
        eventGroups.set(eventType, []);
      }
      eventGroups.get(eventType).push(payload);
    });

    eventGroups.forEach((payloads, eventType) => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            // If multiple payloads, send as batch, otherwise single payload
            callback(payloads.length === 1 ? payloads[0] : payloads);
          } catch (error) {
            console.error(`Error in state event callback for ${eventType}:`, error);
          }
        });
      }
    });
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.listeners.clear();
    this.batchedEvents.length = 0;
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}

/**
 * State validation and migration manager
 */
class StateValidator {
  /**
   * Validate complete state object
   * @param {Object} state - State to validate
   * @returns {Object} Validated state
   */
  static validateState(state) {
    if (!state || typeof state !== 'object') {
      console.warn('Invalid state object, using defaults');
      return { ...DEFAULT_STATE };
    }

    const validated = {
      filterMode: this.validateFilterMode(state.filterMode),
      debugMode: validateBoolean(state.debugMode, DEFAULT_STATE.debugMode),
      showButtonText: validateBoolean(state.showButtonText, DEFAULT_STATE.showButtonText),
      toolbarPlacement: this.validateToolbarPlacement(state.toolbarPlacement),
      userPreferences: this.validateUserPreferences(state.userPreferences),
      metadata: this.validateMetadata(state.metadata)
    };

    return validated;
  }

  /**
   * Validate filter mode
   * @param {any} mode - Mode to validate
   * @returns {string} Valid mode
   */
  static validateFilterMode(mode) {
    return validateMode(mode, DEFAULT_STATE.filterMode);
  }

  /**
   * Validate toolbar placement
   * @param {any} placement - Placement to validate
   * @returns {string} Valid placement
   */
  static validateToolbarPlacement(placement) {
    if (typeof placement === 'string' && VALID_VALUES.toolbarPlacement.has(placement.toLowerCase())) {
      return placement.toLowerCase();
    }
    return DEFAULT_STATE.toolbarPlacement;
  }

  /**
   * Validate user preferences object
   * @param {Object} prefs - Preferences to validate
   * @returns {Object} Valid preferences
   */
  static validateUserPreferences(prefs) {
    if (!prefs || typeof prefs !== 'object') {
      return { ...DEFAULT_STATE.userPreferences };
    }

    return {
      theme: this.validateTheme(prefs.theme),
      language: this.validateLanguage(prefs.language),
      refreshRate: this.validateRefreshRate(prefs.refreshRate)
    };
  }

  /**
   * Validate theme preference
   * @param {any} theme - Theme to validate
   * @returns {string} Valid theme
   */
  static validateTheme(theme) {
    if (typeof theme === 'string' && VALID_VALUES.theme.has(theme.toLowerCase())) {
      return theme.toLowerCase();
    }
    return DEFAULT_STATE.userPreferences.theme;
  }

  /**
   * Validate language preference
   * @param {any} language - Language to validate
   * @returns {string} Valid language
   */
  static validateLanguage(language) {
    if (typeof language === 'string' && VALID_VALUES.language.has(language.toLowerCase())) {
      return language.toLowerCase();
    }
    return DEFAULT_STATE.userPreferences.language;
  }

  /**
   * Validate refresh rate
   * @param {any} rate - Rate to validate
   * @returns {number} Valid refresh rate
   */
  static validateRefreshRate(rate) {
    if (typeof rate === 'number' && rate >= 100 && rate <= 10000) {
      return rate;
    }
    return DEFAULT_STATE.userPreferences.refreshRate;
  }

  /**
   * Validate metadata object
   * @param {Object} metadata - Metadata to validate
   * @returns {Object} Valid metadata
   */
  static validateMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
      return { ...DEFAULT_STATE.metadata };
    }

    return {
      version: typeof metadata.version === 'number' ? metadata.version : CURRENT_SCHEMA_VERSION,
      lastUpdated: typeof metadata.lastUpdated === 'number' ? metadata.lastUpdated : Date.now(),
      migrationSource: typeof metadata.migrationSource === 'string' ? metadata.migrationSource : null
    };
  }

  /**
   * Migrate state from older versions
   * @param {Object} state - State to migrate
   * @returns {Object} Migrated state
   */
  static migrateState(state) {
    if (!state || !state.metadata || state.metadata.version === CURRENT_SCHEMA_VERSION) {
      return state;
    }

    console.log(`Migrating state from version ${state.metadata.version} to ${CURRENT_SCHEMA_VERSION}`);
    
    let migrated = { ...state };
    const sourceVersion = state.metadata.version || 0;

    // Migration from version 0 (legacy state) to version 1
    if (sourceVersion < 1) {
      // Legacy state used different property names
      migrated = {
        filterMode: state.gmailCalMode || state.currentMode || DEFAULT_STATE.filterMode,
        debugMode: state.gmailCalDebug || state.debugOn || DEFAULT_STATE.debugMode,
        showButtonText: state.showButtonText !== undefined ? state.showButtonText : DEFAULT_STATE.showButtonText,
        toolbarPlacement: DEFAULT_STATE.toolbarPlacement,
        userPreferences: { ...DEFAULT_STATE.userPreferences },
        metadata: {
          version: 1,
          lastUpdated: Date.now(),
          migrationSource: `v${sourceVersion}`
        }
      };
    }

    return this.validateState(migrated);
  }
}

/**
 * Storage persistence manager
 */
class StorageManager {
  constructor() {
    this.syncInProgress = false;
    this.pendingWrites = new Map();
    this.writeDebounceTimeout = null;
    this.writeDebounceDelay = 100; // ms
  }

  /**
   * Load state from storage with validation and migration
   * @returns {Promise<Object>} Loaded and validated state
   */
  async loadState() {
    try {
      const storageData = await this.getStorageData();
      const rawState = this.deserializeState(storageData);
      const migratedState = StateValidator.migrateState(rawState);
      const validatedState = StateValidator.validateState(migratedState);
      
      return validatedState;
    } catch (error) {
      console.error('Error loading state:', error);
      return { ...DEFAULT_STATE };
    }
  }

  /**
   * Save state to storage with serialization
   * @param {Object} state - State to save
   * @returns {Promise<void>}
   */
  async saveState(state) {
    if (this.syncInProgress) {
      // Queue the write
      this.pendingWrites.set('state', state);
      return;
    }

    // Debounce rapid writes
    if (this.writeDebounceTimeout) {
      clearTimeout(this.writeDebounceTimeout);
    }

    return new Promise((resolve, reject) => {
      this.writeDebounceTimeout = setTimeout(async () => {
        try {
          this.syncInProgress = true;
          
          // Get latest state if there were pending writes
          const finalState = this.pendingWrites.get('state') || state;
          this.pendingWrites.clear();
          
          const serializedData = this.serializeState(finalState);
          await this.setStorageData(serializedData);
          
          this.syncInProgress = false;
          resolve();
        } catch (error) {
          this.syncInProgress = false;
          console.error('Error saving state:', error);
          reject(error);
        }
      }, this.writeDebounceDelay);
    });
  }

  /**
   * Get data from Chrome storage
   * @returns {Promise<Object>} Storage data
   * @private
   */
  getStorageData() {
    return new Promise((resolve, reject) => {
      const keys = Object.values(STORAGE_KEYS);
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          const errorMessage = validateStorageError(chrome.runtime.lastError);
          reject(new Error(errorMessage));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Set data to Chrome storage
   * @param {Object} data - Data to store
   * @returns {Promise<void>}
   * @private
   */
  setStorageData(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          const errorMessage = validateStorageError(chrome.runtime.lastError);
          reject(new Error(errorMessage));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Deserialize storage data to state object
   * @param {Object} storageData - Raw storage data
   * @returns {Object} Deserialized state
   * @private
   */
  deserializeState(storageData) {
    try {
      // Handle both new format and legacy format
      if (storageData[STORAGE_KEYS.STATE_METADATA]) {
        // New format - structured state
        return {
          filterMode: storageData[STORAGE_KEYS.FILTER_MODE],
          debugMode: storageData[STORAGE_KEYS.DEBUG_MODE],
          showButtonText: storageData[STORAGE_KEYS.SHOW_BUTTON_TEXT],
          toolbarPlacement: storageData[STORAGE_KEYS.TOOLBAR_PLACEMENT],
          userPreferences: this.parseJSON(storageData[STORAGE_KEYS.USER_PREFERENCES]),
          metadata: this.parseJSON(storageData[STORAGE_KEYS.STATE_METADATA])
        };
      } else {
        // Legacy format - return as-is for migration
        return {
          gmailCalMode: storageData[STORAGE_KEYS.FILTER_MODE],
          gmailCalDebug: storageData[STORAGE_KEYS.DEBUG_MODE],
          showButtonText: storageData[STORAGE_KEYS.SHOW_BUTTON_TEXT],
          metadata: { version: 0 }
        };
      }
    } catch (error) {
      console.error('Error deserializing state:', error);
      return {};
    }
  }

  /**
   * Serialize state object to storage format
   * @param {Object} state - State to serialize
   * @returns {Object} Serialized storage data
   * @private
   */
  serializeState(state) {
    const updatedState = {
      ...state,
      metadata: {
        ...state.metadata,
        lastUpdated: Date.now()
      }
    };

    return {
      [STORAGE_KEYS.FILTER_MODE]: updatedState.filterMode,
      [STORAGE_KEYS.DEBUG_MODE]: updatedState.debugMode,
      [STORAGE_KEYS.SHOW_BUTTON_TEXT]: updatedState.showButtonText,
      [STORAGE_KEYS.TOOLBAR_PLACEMENT]: updatedState.toolbarPlacement,
      [STORAGE_KEYS.USER_PREFERENCES]: JSON.stringify(updatedState.userPreferences),
      [STORAGE_KEYS.STATE_METADATA]: JSON.stringify(updatedState.metadata)
    };
  }

  /**
   * Safely parse JSON with fallback
   * @param {string} jsonString - JSON string to parse
   * @returns {Object|null} Parsed object or null
   * @private
   */
  parseJSON(jsonString) {
    try {
      return jsonString ? JSON.parse(jsonString) : null;
    } catch (error) {
      console.warn('Error parsing JSON:', error);
      return null;
    }
  }
}

/**
 * Main StateManager class - Centralized state management
 */
export class StateManager {
  constructor() {
    this.state = { ...DEFAULT_STATE };
    this.eventEmitter = new StateEventEmitter();
    this.storageManager = new StorageManager();
    this.initialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize the state manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform initialization
   * @returns {Promise<void>}
   * @private
   */
  async performInitialization() {
    try {
      const loadedState = await this.storageManager.loadState();
      this.state = loadedState;
      this.initialized = true;
      
      this.eventEmitter.emit('stateInitialized', { state: this.getState() });
      console.log('StateManager initialized successfully');
    } catch (error) {
      console.error('StateManager initialization failed:', error);
      this.state = { ...DEFAULT_STATE };
      this.initialized = true;
      throw error;
    }
  }

  /**
   * Get complete state (immutable copy)
   * @returns {Object} State copy
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Get specific state property
   * @param {string} path - Property path (e.g., 'userPreferences.theme')
   * @returns {any} Property value
   */
  get(path) {
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Set state property with validation and persistence
   * @param {string} path - Property path
   * @param {any} value - New value
   * @returns {Promise<void>}
   */
  async set(path, value) {
    if (!this.initialized) {
      throw new Error('StateManager not initialized');
    }

    const previousState = this.getState();
    const newState = this.createUpdatedState(path, value);
    const validatedState = StateValidator.validateState(newState);
    
    // Check if state actually changed
    if (JSON.stringify(previousState) === JSON.stringify(validatedState)) {
      return;
    }

    this.state = validatedState;
    
    // Emit change events
    this.eventEmitter.emit('stateChanged', {
      path,
      value,
      previousState,
      newState: this.getState()
    });
    
    this.eventEmitter.emit(`stateChanged:${path}`, {
      value,
      previousValue: this.getValueFromPath(previousState, path),
      newState: this.getState()
    });

    // Persist to storage
    try {
      await this.storageManager.saveState(this.state);
      this.eventEmitter.emit('statePersisted', { path, value });
    } catch (error) {
      console.error('Failed to persist state:', error);
      this.eventEmitter.emit('statePersistError', { path, value, error });
    }
  }

  /**
   * Update multiple properties atomically
   * @param {Object} updates - Object with property paths as keys
   * @returns {Promise<void>}
   */
  async updateState(updates) {
    if (!this.initialized) {
      throw new Error('StateManager not initialized');
    }

    const previousState = this.getState();
    let newState = { ...this.state };

    // Apply all updates
    for (const [path, value] of Object.entries(updates)) {
      newState = this.createUpdatedStateInMemory(newState, path, value);
    }

    const validatedState = StateValidator.validateState(newState);
    
    // Check if state actually changed
    if (JSON.stringify(previousState) === JSON.stringify(validatedState)) {
      return;
    }

    this.state = validatedState;
    
    // Emit change events for each update
    for (const [path, value] of Object.entries(updates)) {
      this.eventEmitter.emit(`stateChanged:${path}`, {
        value,
        previousValue: this.getValueFromPath(previousState, path),
        newState: this.getState()
      });
    }

    this.eventEmitter.emit('stateChanged', {
      updates,
      previousState,
      newState: this.getState()
    });

    // Persist to storage
    try {
      await this.storageManager.saveState(this.state);
      this.eventEmitter.emit('statePersisted', { updates });
    } catch (error) {
      console.error('Failed to persist state:', error);
      this.eventEmitter.emit('statePersistError', { updates, error });
    }
  }

  /**
   * Create updated state with immutable updates
   * @param {string} path - Property path
   * @param {any} value - New value
   * @returns {Object} New state object
   * @private
   */
  createUpdatedState(path, value) {
    return this.createUpdatedStateInMemory(this.state, path, value);
  }

  /**
   * Create updated state in memory
   * @param {Object} state - Current state
   * @param {string} path - Property path
   * @param {any} value - New value
   * @returns {Object} New state object
   * @private
   */
  createUpdatedStateInMemory(state, path, value) {
    const keys = path.split('.');
    const newState = JSON.parse(JSON.stringify(state)); // Deep clone
    
    let current = newState;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return newState;
  }

  /**
   * Get value from state using path
   * @param {Object} state - State object
   * @param {string} path - Property path
   * @returns {any} Value at path
   * @private
   */
  getValueFromPath(state, path) {
    const keys = path.split('.');
    let value = state;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Subscribe to state change events
   * @param {string} eventType - Event type or property path
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, callback) {
    return this.eventEmitter.on(eventType, callback);
  }

  /**
   * Reset state to defaults
   * @returns {Promise<void>}
   */
  async reset() {
    const previousState = this.getState();
    this.state = { ...DEFAULT_STATE };
    
    this.eventEmitter.emit('stateReset', {
      previousState,
      newState: this.getState()
    });

    try {
      await this.storageManager.saveState(this.state);
      this.eventEmitter.emit('statePersisted', { reset: true });
    } catch (error) {
      console.error('Failed to persist reset state:', error);
      this.eventEmitter.emit('statePersistError', { reset: true, error });
    }
  }

  /**
   * Export state for backup
   * @returns {Object} Exportable state
   */
  exportState() {
    return {
      ...this.getState(),
      exportTimestamp: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION
    };
  }

  /**
   * Import state from backup
   * @param {Object} importedState - State to import
   * @returns {Promise<void>}
   */
  async importState(importedState) {
    if (!importedState || typeof importedState !== 'object') {
      throw new Error('Invalid state data for import');
    }

    const migratedState = StateValidator.migrateState(importedState);
    const validatedState = StateValidator.validateState(migratedState);
    
    const previousState = this.getState();
    this.state = validatedState;
    
    this.eventEmitter.emit('stateImported', {
      previousState,
      newState: this.getState(),
      importSource: importedState.exportTimestamp ? 'backup' : 'manual'
    });

    try {
      await this.storageManager.saveState(this.state);
      this.eventEmitter.emit('statePersisted', { imported: true });
    } catch (error) {
      console.error('Failed to persist imported state:', error);
      this.eventEmitter.emit('statePersistError', { imported: true, error });
      throw error;
    }
  }

  /**
   * Get state validation status
   * @returns {Object} Validation status
   */
  getValidationStatus() {
    const validatedState = StateValidator.validateState(this.state);
    const isValid = JSON.stringify(this.state) === JSON.stringify(validatedState);
    
    return {
      isValid,
      currentVersion: this.state.metadata?.version || 0,
      expectedVersion: CURRENT_SCHEMA_VERSION,
      lastUpdated: this.state.metadata?.lastUpdated,
      migrationSource: this.state.metadata?.migrationSource
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.eventEmitter.removeAllListeners();
    this.initialized = false;
    this.initializationPromise = null;
  }
}

// Create singleton instance
export const stateManager = new StateManager();

// Export commonly used getters for backward compatibility
export function getCurrentMode() {
  return stateManager.get('filterMode');
}

export function getDebugMode() {
  return stateManager.get('debugMode');
}

export function getShowButtonText() {
  return stateManager.get('showButtonText');
}

// Export commonly used setters for backward compatibility
export async function setCurrentMode(mode) {
  await stateManager.set('filterMode', mode);
}

export async function setDebugMode(enabled) {
  await stateManager.set('debugMode', enabled);
}

export async function setShowButtonText(show) {
  await stateManager.set('showButtonText', show);
}

// Export state constants for external use
export { STORAGE_KEYS, DEFAULT_STATE, CURRENT_SCHEMA_VERSION };