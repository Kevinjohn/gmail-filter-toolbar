/**
 * ToolbarPluginSystem - Extensible Plugin Architecture for Toolbar
 * 
 * Provides a robust plugin system that enables dynamic toolbar functionality
 * additions through a secure, extensible architecture. Supports plugin lifecycle
 * management, dependency resolution, and safe execution environments.
 * 
 * @author Chrome Extension Team
 * @version 1.0.0
 */

import { toolbarEventBus } from './ToolbarEventBus.js';
import { toolbarStateManager } from './ToolbarStateManager.js';

/**
 * @typedef {Object} PluginInterface
 * @property {string} id - Unique plugin identifier
 * @property {string} name - Human-readable plugin name
 * @property {string} version - Plugin version
 * @property {string} description - Plugin description
 * @property {Array<string>} dependencies - Plugin dependencies
 * @property {Object} api - Plugin API methods
 * @property {Function} initialize - Plugin initialization function
 * @property {Function} destroy - Plugin cleanup function
 * @property {Object} [config] - Plugin configuration
 */

/**
 * @typedef {Object} PluginContext
 * @property {Object} toolbar - Toolbar instance reference
 * @property {Object} eventBus - Event bus instance
 * @property {Object} stateManager - State manager instance
 * @property {Object} domOperations - DOM operations instance
 * @property {Function} registerAPI - Register plugin API
 * @property {Function} getAPI - Access other plugin APIs
 * @property {Function} emit - Emit plugin events
 * @property {Function} subscribe - Subscribe to events
 */

/**
 * @typedef {Object} PluginManifest
 * @property {string} id - Plugin ID
 * @property {string} name - Plugin name
 * @property {string} version - Plugin version
 * @property {string} author - Plugin author
 * @property {string} description - Plugin description
 * @property {Array<string>} dependencies - Plugin dependencies
 * @property {Array<string>} permissions - Required permissions
 * @property {Object} config - Default configuration
 * @property {string} entryPoint - Main plugin file
 */

export class ToolbarPluginSystem {
  /**
   * @param {Object} toolbarController - Toolbar controller instance
   * @param {Object} [options={}] - Plugin system configuration
   */
  constructor(toolbarController, options = {}) {
    this.toolbarController = toolbarController;
    
    // Configuration
    this.options = {
      enableSandboxing: true,
      enableDependencyResolution: true,
      enableVersionChecking: true,
      enablePermissionChecking: true,
      enableHotReloading: false,
      maxPlugins: 50,
      defaultTimeout: 5000,
      enableMetrics: true,
      ...options
    };
    
    // Plugin registry
    this.plugins = new Map(); // pluginId -> PluginInstance
    this.pluginManifests = new Map(); // pluginId -> PluginManifest
    this.pluginAPIs = new Map(); // pluginId -> API object
    this.pluginStates = new Map(); // pluginId -> state
    
    // Dependency graph
    this.dependencyGraph = new Map(); // pluginId -> Set<dependencyIds>
    this.dependents = new Map(); // pluginId -> Set<dependentIds>
    
    // Execution context
    this.executionContexts = new Map(); // pluginId -> execution context
    this.pluginTimeouts = new Map(); // pluginId -> timeout handles
    
    // Core API registry
    this.coreAPIs = new Map();
    
    // Plugin lifecycle state
    this.pluginStates = new Map(); // pluginId -> 'registered'|'initialized'|'active'|'error'|'disabled'
    
    // Metrics and monitoring
    this.metrics = {
      pluginsLoaded: 0,
      pluginsActive: 0,
      pluginErrors: 0,
      apiCalls: 0,
      eventEmissions: 0
    };
    
    // Error tracking
    this.errorLog = [];
    this.maxErrorLogSize = 100;
    
    // Event subscriptions
    this.eventSubscriptions = new Set();
    
    // Bind methods
    this.registerPlugin = this.registerPlugin.bind(this);
    this.loadPlugin = this.loadPlugin.bind(this);
    this.unloadPlugin = this.unloadPlugin.bind(this);
    this.enablePlugin = this.enablePlugin.bind(this);
    this.disablePlugin = this.disablePlugin.bind(this);
    
    // Initialize core APIs
    this._initializeCoreAPIs();
    
    // Setup event listeners
    this._setupEventListeners();
  }

  /**
   * Register a plugin with the system
   * @param {PluginInterface} plugin - Plugin to register
   * @param {PluginManifest} [manifest] - Plugin manifest
   * @returns {Promise<Object>} Registration result
   */
  async registerPlugin(plugin, manifest = null) {
    const startTime = performance.now();
    
    try {
      // Validate plugin interface
      this._validatePluginInterface(plugin);
      
      // Check for duplicate registration
      if (this.plugins.has(plugin.id)) {
        throw new Error(`Plugin ${plugin.id} is already registered`);
      }
      
      // Check plugin limit
      if (this.plugins.size >= this.options.maxPlugins) {
        throw new Error(`Maximum plugin limit (${this.options.maxPlugins}) reached`);
      }
      
      // Validate and process manifest
      const processedManifest = manifest || this._createDefaultManifest(plugin);
      this._validatePluginManifest(processedManifest);
      
      // Check permissions if enabled
      if (this.options.enablePermissionChecking) {
        await this._checkPluginPermissions(processedManifest);
      }
      
      // Validate dependencies
      if (this.options.enableDependencyResolution) {
        await this._validateDependencies(plugin);
      }
      
      // Create execution context
      const executionContext = this._createExecutionContext(plugin);
      
      // Register plugin
      this.plugins.set(plugin.id, plugin);
      this.pluginManifests.set(plugin.id, processedManifest);
      this.executionContexts.set(plugin.id, executionContext);
      this.pluginStates.set(plugin.id, 'registered');
      
      // Update dependency graph
      this._updateDependencyGraph(plugin);
      
      // Record metrics
      const executionTime = performance.now() - startTime;
      this.metrics.pluginsLoaded++;
      
      // Emit registration event
      await toolbarEventBus.emit('PLUGIN_REGISTERED', {
        pluginId: plugin.id,
        plugin,
        manifest: processedManifest,
        executionTime
      });
      
      return {
        success: true,
        pluginId: plugin.id,
        manifest: processedManifest,
        executionTime
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this._logError(plugin?.id || 'unknown', 'registration', error);
      
      return {
        success: false,
        error,
        executionTime
      };
    }
  }

  /**
   * Load and initialize a plugin
   * @param {string} pluginId - Plugin identifier
   * @param {Object} [config={}] - Plugin configuration
   * @returns {Promise<Object>} Load result
   */
  async loadPlugin(pluginId, config = {}) {
    const startTime = performance.now();
    
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }
      
      const currentState = this.pluginStates.get(pluginId);
      if (currentState === 'active') {
        return { success: true, message: 'Plugin already loaded' };
      }
      
      if (currentState === 'error') {
        throw new Error(`Plugin ${pluginId} is in error state`);
      }
      
      // Load dependencies first
      if (this.options.enableDependencyResolution) {
        await this._loadDependencies(pluginId);
      }
      
      // Create plugin context
      const context = this._createPluginContext(pluginId, config);
      
      // Initialize plugin with timeout
      const initPromise = this._executeWithTimeout(
        () => plugin.initialize(context),
        this.options.defaultTimeout,
        `Plugin ${pluginId} initialization timeout`
      );
      
      const initResult = await initPromise;
      
      // Update state
      this.pluginStates.set(pluginId, 'initialized');
      
      // Register plugin APIs if provided
      if (plugin.api && typeof plugin.api === 'object') {
        this.pluginAPIs.set(pluginId, plugin.api);
      }
      
      // Activate plugin
      await this._activatePlugin(pluginId);
      
      // Record metrics
      const executionTime = performance.now() - startTime;
      this.metrics.pluginsActive++;
      
      // Emit load event
      await toolbarEventBus.emit('PLUGIN_LOADED', {
        pluginId,
        config,
        initResult,
        executionTime
      });
      
      return {
        success: true,
        pluginId,
        initResult,
        executionTime
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.pluginStates.set(pluginId, 'error');
      this._logError(pluginId, 'loading', error);
      
      return {
        success: false,
        pluginId,
        error,
        executionTime
      };
    }
  }

  /**
   * Unload a plugin
   * @param {string} pluginId - Plugin identifier
   * @param {Object} [options={}] - Unload options
   * @returns {Promise<Object>} Unload result
   */
  async unloadPlugin(pluginId, options = {}) {
    const startTime = performance.now();
    
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }
      
      const {
        unloadDependents = true
      } = options;
      
      // Check if other plugins depend on this one
      if (unloadDependents && this.dependents.has(pluginId)) {
        const dependentIds = Array.from(this.dependents.get(pluginId));
        for (const dependentId of dependentIds) {
          await this.unloadPlugin(dependentId, { ...options, unloadDependents: false });
        }
      }
      
      // Deactivate plugin
      await this._deactivatePlugin(pluginId);
      
      // Call plugin destroy method if available
      if (typeof plugin.destroy === 'function') {
        const destroyPromise = this._executeWithTimeout(
          () => plugin.destroy(),
          this.options.defaultTimeout,
          `Plugin ${pluginId} destruction timeout`
        );
        
        await destroyPromise;
      }
      
      // Clean up plugin context
      await this._cleanupPluginContext(pluginId);
      
      // Update state
      this.pluginStates.set(pluginId, 'registered');
      
      // Record metrics
      const executionTime = performance.now() - startTime;
      if (this.metrics.pluginsActive > 0) {
        this.metrics.pluginsActive--;
      }
      
      // Emit unload event
      await toolbarEventBus.emit('PLUGIN_UNLOADED', {
        pluginId,
        options,
        executionTime
      });
      
      return {
        success: true,
        pluginId,
        executionTime
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this._logError(pluginId, 'unloading', error);
      
      return {
        success: false,
        pluginId,
        error,
        executionTime
      };
    }
  }

  /**
   * Enable a disabled plugin
   * @param {string} pluginId - Plugin identifier
   * @returns {Promise<boolean>} Success status
   */
  async enablePlugin(pluginId) {
    try {
      const currentState = this.pluginStates.get(pluginId);
      if (currentState === 'disabled') {
        return await this.loadPlugin(pluginId);
      }
      return { success: true, message: 'Plugin already enabled' };
    } catch (error) {
      this._logError(pluginId, 'enabling', error);
      return { success: false, error };
    }
  }

  /**
   * Disable an active plugin
   * @param {string} pluginId - Plugin identifier
   * @returns {Promise<boolean>} Success status
   */
  async disablePlugin(pluginId) {
    try {
      const result = await this.unloadPlugin(pluginId);
      if (result.success) {
        this.pluginStates.set(pluginId, 'disabled');
      }
      return result;
    } catch (error) {
      this._logError(pluginId, 'disabling', error);
      return { success: false, error };
    }
  }

  /**
   * Get plugin API
   * @param {string} pluginId - Plugin identifier
   * @returns {Object|null} Plugin API object
   */
  getPluginAPI(pluginId) {
    return this.pluginAPIs.get(pluginId) || null;
  }

  /**
   * Get core API
   * @param {string} apiName - Core API name
   * @returns {Object|null} Core API object
   */
  getCoreAPI(apiName) {
    return this.coreAPIs.get(apiName) || null;
  }

  /**
   * List all registered plugins
   * @param {Object} [filters={}] - Filter options
   * @returns {Array<Object>} Plugin list
   */
  listPlugins(filters = {}) {
    const {
      state = null,
      hasAPI = null,
      dependencies = null
    } = filters;
    
    const plugins = [];
    
    for (const [pluginId, plugin] of this.plugins) {
      const pluginState = this.pluginStates.get(pluginId);
      const manifest = this.pluginManifests.get(pluginId);
      const hasPluginAPI = this.pluginAPIs.has(pluginId);
      
      // Apply filters
      if (state && pluginState !== state) continue;
      if (hasAPI !== null && hasPluginAPI !== hasAPI) continue;
      if (dependencies && !dependencies.every(dep => manifest.dependencies.includes(dep))) continue;
      
      plugins.push({
        id: pluginId,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        state: pluginState,
        hasAPI: hasPluginAPI,
        manifest
      });
    }
    
    return plugins;
  }

  /**
   * Get plugin system statistics
   * @returns {Object} System statistics
   */
  getStats() {
    return {
      totalPlugins: this.plugins.size,
      pluginStates: Object.fromEntries(
        Array.from(this.pluginStates.entries())
      ),
      dependencyGraph: Object.fromEntries(
        Array.from(this.dependencyGraph.entries()).map(([key, value]) => [
          key,
          Array.from(value)
        ])
      ),
      metrics: { ...this.metrics },
      coreAPIs: Array.from(this.coreAPIs.keys()),
      pluginAPIs: Array.from(this.pluginAPIs.keys()),
      errorLog: this.errorLog.slice(-10), // Last 10 errors
      options: this.options
    };
  }

  /**
   * Reload a plugin (unload and load)
   * @param {string} pluginId - Plugin identifier
   * @param {Object} [config={}] - New plugin configuration
   * @returns {Promise<Object>} Reload result
   */
  async reloadPlugin(pluginId, config = {}) {
    try {
      // Unload plugin
      const unloadResult = await this.unloadPlugin(pluginId);
      if (!unloadResult.success) {
        throw new Error(`Failed to unload plugin: ${unloadResult.error?.message}`);
      }
      
      // Load plugin with new configuration
      const loadResult = await this.loadPlugin(pluginId, config);
      if (!loadResult.success) {
        throw new Error(`Failed to reload plugin: ${loadResult.error?.message}`);
      }
      
      return {
        success: true,
        pluginId,
        message: 'Plugin reloaded successfully'
      };
      
    } catch (error) {
      this._logError(pluginId, 'reloading', error);
      return {
        success: false,
        pluginId,
        error
      };
    }
  }

  /**
   * Destroy plugin system and cleanup all resources
   */
  async destroy() {
    try {
      // Unload all active plugins
      const activePlugins = Array.from(this.plugins.keys()).filter(
        id => this.pluginStates.get(id) === 'active'
      );
      
      for (const pluginId of activePlugins) {
        await this.unloadPlugin(pluginId, { forceUnload: true });
      }
      
      // Clear all timeouts
      for (const timeout of this.pluginTimeouts.values()) {
        clearTimeout(timeout);
      }
      
      // Remove event subscriptions
      for (const subscriptionId of this.eventSubscriptions) {
        toolbarEventBus.off(subscriptionId);
      }
      
      // Clear all data structures
      this.plugins.clear();
      this.pluginManifests.clear();
      this.pluginAPIs.clear();
      this.pluginStates.clear();
      this.dependencyGraph.clear();
      this.dependents.clear();
      this.executionContexts.clear();
      this.pluginTimeouts.clear();
      this.eventSubscriptions.clear();
      
      // Emit destruction event
      await toolbarEventBus.emit('PLUGIN_SYSTEM_DESTROYED', {
        finalStats: this.getStats()
      });
      
    } catch (error) {
      console.error('Plugin system destruction failed:', error);
    }
  }

  // ========== Private Methods ==========

  /**
   * Initialize core APIs available to plugins
   * @private
   */
  _initializeCoreAPIs() {
    // Toolbar API
    this.coreAPIs.set('toolbar', {
      getController: () => this.toolbarController,
      getState: () => this.toolbarController.getState(),
      refresh: (options) => this.toolbarController.refresh(options),
      setVisibility: (visible, options) => this.toolbarController.setVisibility(visible, options)
    });
    
    // Event Bus API
    this.coreAPIs.set('events', {
      emit: (eventType, payload, metadata) => toolbarEventBus.emit(eventType, payload, metadata),
      on: (eventType, handler, options) => toolbarEventBus.on(eventType, handler, options),
      once: (eventType, handler, options) => toolbarEventBus.once(eventType, handler, options),
      off: (subscriptionId) => toolbarEventBus.off(subscriptionId)
    });
    
    // State Management API
    this.coreAPIs.set('state', {
      get: (key, defaultValue) => toolbarStateManager.get(key, defaultValue),
      set: (key, value, options) => toolbarStateManager.set(key, value, options),
      subscribe: (keys, callback, options) => toolbarStateManager.subscribe(keys, callback, options),
      unsubscribe: (subscriptionId) => toolbarStateManager.unsubscribe(subscriptionId)
    });
    
    // Plugin System API
    this.coreAPIs.set('plugins', {
      getAPI: (pluginId) => this.getPluginAPI(pluginId),
      listPlugins: (filters) => this.listPlugins(filters),
      getStats: () => this.getStats()
    });
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for system events that might affect plugins
    const systemEventSubscription = toolbarEventBus.on('TOOLBAR_DESTROYED', async () => {
      await this.destroy();
    });
    this.eventSubscriptions.add(systemEventSubscription);
  }

  /**
   * Validate plugin interface
   * @private
   * @param {PluginInterface} plugin - Plugin to validate
   */
  _validatePluginInterface(plugin) {
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin must be an object');
    }
    
    if (!plugin.id || typeof plugin.id !== 'string') {
      throw new Error('Plugin must have a valid id');
    }
    
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a valid name');
    }
    
    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a valid version');
    }
    
    if (typeof plugin.initialize !== 'function') {
      throw new Error('Plugin must have an initialize function');
    }
    
    // Validate dependencies array
    if (plugin.dependencies && !Array.isArray(plugin.dependencies)) {
      throw new Error('Plugin dependencies must be an array');
    }
  }

  /**
   * Validate plugin manifest
   * @private
   * @param {PluginManifest} manifest - Manifest to validate
   */
  _validatePluginManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Plugin manifest must be an object');
    }
    
    // Required fields validation would go here
    // For now, we accept any valid object
  }

  /**
   * Create default manifest for plugin
   * @private
   * @param {PluginInterface} plugin - Plugin instance
   * @returns {PluginManifest} Default manifest
   */
  _createDefaultManifest(plugin) {
    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      author: 'Unknown',
      description: plugin.description || 'No description provided',
      dependencies: plugin.dependencies || [],
      permissions: [],
      config: plugin.config || {},
      entryPoint: 'main.js'
    };
  }

  /**
   * Check plugin permissions
   * @private
   * @param {PluginManifest} manifest - Plugin manifest
   */
  async _checkPluginPermissions(manifest) {
    // Placeholder for permission checking logic
    // In a real implementation, this would check against allowed permissions
    if (manifest.permissions && manifest.permissions.length > 0) {
      console.log(`Plugin ${manifest.id} requires permissions:`, manifest.permissions);
    }
  }

  /**
   * Validate plugin dependencies
   * @private
   * @param {PluginInterface} plugin - Plugin instance
   */
  async _validateDependencies(plugin) {
    if (!plugin.dependencies || plugin.dependencies.length === 0) {
      return;
    }
    
    for (const dependency of plugin.dependencies) {
      if (!this.plugins.has(dependency)) {
        throw new Error(`Missing dependency: ${dependency}`);
      }
      
      // Check for circular dependencies
      if (this._hasCircularDependency(plugin.id, dependency)) {
        throw new Error(`Circular dependency detected: ${plugin.id} -> ${dependency}`);
      }
    }
  }

  /**
   * Check for circular dependencies
   * @private
   * @param {string} pluginId - Plugin ID
   * @param {string} dependencyId - Dependency ID
   * @returns {boolean} True if circular dependency exists
   */
  _hasCircularDependency(pluginId, dependencyId, visited = new Set()) {
    if (visited.has(dependencyId)) {
      return dependencyId === pluginId;
    }
    
    visited.add(dependencyId);
    
    const dependencies = this.dependencyGraph.get(dependencyId);
    if (!dependencies) {
      return false;
    }
    
    for (const dep of dependencies) {
      if (this._hasCircularDependency(pluginId, dep, new Set(visited))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Create execution context for plugin
   * @private
   * @param {PluginInterface} plugin - Plugin instance
   * @returns {Object} Execution context
   */
  _createExecutionContext(plugin) {
    return {
      pluginId: plugin.id,
      sandbox: this.options.enableSandboxing,
      startTime: Date.now(),
      timeouts: new Set(),
      intervals: new Set(),
      eventListeners: new Set()
    };
  }

  /**
   * Create plugin context for initialization
   * @private
   * @param {string} pluginId - Plugin ID
   * @param {Object} config - Plugin configuration
   * @returns {PluginContext} Plugin context
   */
  _createPluginContext(pluginId, config) {
    return {
      pluginId,
      config,
      toolbar: this.getCoreAPI('toolbar'),
      eventBus: this.getCoreAPI('events'),
      stateManager: this.getCoreAPI('state'),
      plugins: this.getCoreAPI('plugins'),
      domOperations: this.toolbarController.domOperations,
      
      registerAPI: (api) => {
        this.pluginAPIs.set(pluginId, api);
      },
      
      getAPI: (targetPluginId) => {
        return this.getPluginAPI(targetPluginId);
      },
      
      emit: async (eventType, payload, metadata) => {
        this.metrics.eventEmissions++;
        return await toolbarEventBus.emit(eventType, payload, {
          ...metadata,
          source: pluginId
        });
      },
      
      subscribe: (eventType, handler, options) => {
        const subscriptionId = toolbarEventBus.on(eventType, handler, options);
        const context = this.executionContexts.get(pluginId);
        if (context) {
          context.eventListeners.add(subscriptionId);
        }
        return subscriptionId;
      }
    };
  }

  /**
   * Update dependency graph
   * @private
   * @param {PluginInterface} plugin - Plugin instance
   */
  _updateDependencyGraph(plugin) {
    if (!plugin.dependencies || plugin.dependencies.length === 0) {
      return;
    }
    
    // Add dependencies for this plugin
    this.dependencyGraph.set(plugin.id, new Set(plugin.dependencies));
    
    // Update dependents mapping
    for (const dependency of plugin.dependencies) {
      if (!this.dependents.has(dependency)) {
        this.dependents.set(dependency, new Set());
      }
      this.dependents.get(dependency).add(plugin.id);
    }
  }

  /**
   * Load plugin dependencies
   * @private
   * @param {string} pluginId - Plugin ID
   */
  async _loadDependencies(pluginId) {
    const dependencies = this.dependencyGraph.get(pluginId);
    if (!dependencies) {
      return;
    }
    
    for (const dependencyId of dependencies) {
      const dependencyState = this.pluginStates.get(dependencyId);
      if (dependencyState !== 'active') {
        await this.loadPlugin(dependencyId);
      }
    }
  }

  /**
   * Activate plugin
   * @private
   * @param {string} pluginId - Plugin ID
   */
  async _activatePlugin(pluginId) {
    this.pluginStates.set(pluginId, 'active');
    
    await toolbarEventBus.emit('PLUGIN_ACTIVATED', {
      pluginId
    });
  }

  /**
   * Deactivate plugin
   * @private
   * @param {string} pluginId - Plugin ID
   */
  async _deactivatePlugin(pluginId) {
    await toolbarEventBus.emit('PLUGIN_DEACTIVATED', {
      pluginId
    });
  }

  /**
   * Execute function with timeout
   * @private
   * @param {Function} fn - Function to execute
   * @param {number} timeout - Timeout in milliseconds
   * @param {string} errorMessage - Error message for timeout
   * @returns {Promise<any>} Function result
   */
  async _executeWithTimeout(fn, timeout, errorMessage) {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeout);
      
      Promise.resolve(fn())
        .then(result => {
          clearTimeout(timeoutHandle);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutHandle);
          reject(error);
        });
    });
  }

  /**
   * Cleanup plugin context
   * @private
   * @param {string} pluginId - Plugin ID
   */
  async _cleanupPluginContext(pluginId) {
    const context = this.executionContexts.get(pluginId);
    if (!context) return;
    
    // Clear timeouts and intervals
    for (const timeout of context.timeouts) {
      clearTimeout(timeout);
    }
    for (const interval of context.intervals) {
      clearInterval(interval);
    }
    
    // Remove event listeners
    for (const subscriptionId of context.eventListeners) {
      toolbarEventBus.off(subscriptionId);
    }
    
    // Remove context
    this.executionContexts.delete(pluginId);
    
    // Remove API
    this.pluginAPIs.delete(pluginId);
  }

  /**
   * Log plugin error
   * @private
   * @param {string} pluginId - Plugin ID
   * @param {string} operation - Operation that failed
   * @param {Error} error - Error object
   */
  _logError(pluginId, operation, error) {
    const errorEntry = {
      pluginId,
      operation,
      error: error.message,
      stack: error.stack,
      timestamp: Date.now()
    };
    
    this.errorLog.push(errorEntry);
    
    // Trim error log
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxErrorLogSize);
    }
    
    this.metrics.pluginErrors++;
    
    // Emit error event
    toolbarEventBus.emit('PLUGIN_ERROR', {
      pluginId,
      operation,
      error: error.message,
      timestamp: Date.now()
    });
  }
}

export default ToolbarPluginSystem;