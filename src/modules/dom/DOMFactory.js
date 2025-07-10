/**
 * DOM Factory Module
 * 
 * Factory class for creating DOM managers with dependency injection,
 * configuration management, and adapter selection.
 */

import { DOMManager } from './DOMManager.js';
import { DOMCache } from './DOMCache.js';
import { DOMQueue } from './DOMQueue.js';
import { GmailDOMAdapter } from './GmailDOMAdapter.js';

export class DOMFactory {
  /**
   * @param {Object} configurationManager - Configuration manager instance
   * @param {Object} [options={}] - Factory options
   */
  constructor(configurationManager, options = {}) {
    this.configurationManager = configurationManager;
    this.options = {
      defaultAdapter: 'gmail',
      enableCaching: true,
      enableBatching: true,
      enablePerformanceMonitoring: true,
      ...options
    };

    // Registered adapters
    this.adapters = new Map();
    this.registerDefaultAdapters();

    // Singleton instances for reuse
    this.instances = new Map();
  }

  /**
   * Register default DOM adapters
   */
  registerDefaultAdapters() {
    this.registerAdapter('gmail', GmailDOMAdapter);
    
    // Test adapter for unit testing
    if (typeof window !== 'undefined' && window.__DOM_TESTING__) {
      // TestDOMAdapter will be registered when testing module is loaded
    }
  }

  /**
   * Register a DOM adapter
   * @param {string} name - Adapter name
   * @param {Function} AdapterClass - Adapter constructor
   */
  registerAdapter(name, AdapterClass) {
    this.adapters.set(name, AdapterClass);
  }

  /**
   * Create a DOM manager instance with specified configuration
   * @param {Object} [options={}] - Creation options
   * @returns {DOMManager} Configured DOM manager instance
   */
  createDOMManager(options = {}) {
    const config = this.mergeConfig(options);
    const cacheKey = this.generateCacheKey(config);

    // Return existing instance if singleton is enabled
    if (config.singleton && this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey);
    }

    // Create adapter
    const adapter = this.createAdapter(config.adapter, config.adapterOptions);

    // Create cache if enabled
    const cache = config.enableCaching 
      ? this.createCache(config.cacheOptions)
      : null;

    // Create queue if enabled
    const queue = config.enableBatching
      ? this.createQueue(config.queueOptions)
      : null;

    // Create DOM manager
    const domManager = new DOMManager(adapter, cache, queue, config.managerOptions);

    // Store instance if singleton is enabled
    if (config.singleton) {
      this.instances.set(cacheKey, domManager);
    }

    return domManager;
  }

  /**
   * Create a DOM adapter instance
   * @param {string} adapterName - Name of the adapter
   * @param {Object} [options={}] - Adapter options
   * @returns {Object} Adapter instance
   */
  createAdapter(adapterName, options = {}) {
    const AdapterClass = this.adapters.get(adapterName);
    
    if (!AdapterClass) {
      throw new Error(`Unknown DOM adapter: ${adapterName}`);
    }

    // Pass configuration manager to adapter
    return new AdapterClass(this.configurationManager, options);
  }

  /**
   * Create a cache instance with configuration
   * @param {Object} [options={}] - Cache options
   * @returns {DOMCache} Cache instance
   */
  createCache(options = {}) {
    const cacheConfig = this.getCacheConfiguration();
    const mergedOptions = { ...cacheConfig, ...options };
    
    return new DOMCache(mergedOptions);
  }

  /**
   * Create a queue instance with configuration
   * @param {Object} [options={}] - Queue options
   * @returns {DOMQueue} Queue instance
   */
  createQueue(options = {}) {
    const queueConfig = this.getQueueConfiguration();
    const mergedOptions = { ...queueConfig, ...options };
    
    return new DOMQueue(mergedOptions);
  }

  /**
   * Get cache configuration from configuration manager
   * @returns {Object} Cache configuration
   */
  getCacheConfiguration() {
    const defaultConfig = {
      maxSize: 1000,
      ttl: 30000,
      enabled: true
    };

    try {
      const systemConfig = this.configurationManager.getSystemConfig('dom.cache') || {};
      return { ...defaultConfig, ...systemConfig };
    } catch (error) {
      console.warn('Error getting cache configuration, using defaults:', error);
      return defaultConfig;
    }
  }

  /**
   * Get queue configuration from configuration manager
   * @returns {Object} Queue configuration
   */
  getQueueConfiguration() {
    const defaultConfig = {
      batchSize: 20,
      maxWaitTime: 16,
      separateReadWrite: true
    };

    try {
      const systemConfig = this.configurationManager.getSystemConfig('dom.queue') || {};
      return { ...defaultConfig, ...systemConfig };
    } catch (error) {
      console.warn('Error getting queue configuration, using defaults:', error);
      return defaultConfig;
    }
  }

  /**
   * Merge factory options with provided options
   * @param {Object} options - User-provided options
   * @returns {Object} Merged configuration
   */
  mergeConfig(options) {
    return {
      adapter: options.adapter || this.options.defaultAdapter,
      enableCaching: options.enableCaching !== undefined 
        ? options.enableCaching 
        : this.options.enableCaching,
      enableBatching: options.enableBatching !== undefined
        ? options.enableBatching
        : this.options.enableBatching,
      singleton: options.singleton !== undefined
        ? options.singleton
        : false,
      adapterOptions: options.adapterOptions || {},
      cacheOptions: options.cacheOptions || {},
      queueOptions: options.queueOptions || {},
      managerOptions: {
        enablePerformanceMonitoring: options.enablePerformanceMonitoring !== undefined
          ? options.enablePerformanceMonitoring
          : this.options.enablePerformanceMonitoring,
        enableErrorRecovery: options.enableErrorRecovery !== undefined
          ? options.enableErrorRecovery
          : true,
        defaultTimeout: options.defaultTimeout || 5000,
        maxRetryAttempts: options.maxRetryAttempts || 3,
        retryDelay: options.retryDelay || 100,
        ...options.managerOptions || {}
      }
    };
  }

  /**
   * Generate cache key for singleton instances
   * @param {Object} config - Configuration object
   * @returns {string} Cache key
   */
  generateCacheKey(config) {
    const keyParts = [
      config.adapter,
      config.enableCaching,
      config.enableBatching,
      JSON.stringify(config.adapterOptions),
      JSON.stringify(config.cacheOptions),
      JSON.stringify(config.queueOptions)
    ];
    
    return keyParts.join('|');
  }

  /**
   * Create a DOM manager specifically configured for Gmail
   * @param {Object} [options={}] - Gmail-specific options
   * @returns {DOMManager} Gmail-configured DOM manager
   */
  createGmailDOMManager(options = {}) {
    const gmailOptions = {
      adapter: 'gmail',
      singleton: true,
      enableCaching: true,
      enableBatching: true,
      adapterOptions: {
        enableRobustSelectors: true,
        enableFallbacks: true,
        ...options.adapterOptions
      },
      cacheOptions: {
        ttl: 30000, // 30 seconds for Gmail's dynamic content
        ...options.cacheOptions
      },
      queueOptions: {
        batchSize: 15, // Smaller batches for Gmail's performance
        maxWaitTime: 16,
        ...options.queueOptions
      },
      ...options
    };

    return this.createDOMManager(gmailOptions);
  }

  /**
   * Create a DOM manager for testing with mock adapter
   * @param {Object} mockAdapter - Mock adapter instance
   * @param {Object} [options={}] - Test options
   * @returns {DOMManager} Test-configured DOM manager
   */
  createTestDOMManager(mockAdapter, options = {}) {
    const testOptions = {
      enableCaching: false,
      enableBatching: false,
      enablePerformanceMonitoring: false,
      singleton: false,
      ...options
    };

    // Create components manually for testing
    const cache = testOptions.enableCaching ? this.createCache() : null;
    const queue = testOptions.enableBatching ? this.createQueue() : null;
    
    return new DOMManager(mockAdapter, cache, queue, testOptions);
  }

  /**
   * Get list of registered adapter names
   * @returns {Array<string>} Adapter names
   */
  getRegisteredAdapters() {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if an adapter is registered
   * @param {string} name - Adapter name
   * @returns {boolean} True if registered
   */
  hasAdapter(name) {
    return this.adapters.has(name);
  }

  /**
   * Clear all singleton instances
   */
  clearInstances() {
    // Cleanup existing instances
    for (const instance of this.instances.values()) {
      if (instance.destroy) {
        instance.destroy();
      }
    }
    
    this.instances.clear();
  }

  /**
   * Get factory statistics
   * @returns {Object} Factory statistics
   */
  getStats() {
    return {
      registeredAdapters: Array.from(this.adapters.keys()),
      singletonInstances: this.instances.size,
      configuration: this.options
    };
  }

  /**
   * Destroy factory and cleanup resources
   */
  destroy() {
    this.clearInstances();
    this.adapters.clear();
  }
}

/**
 * Create a default factory instance
 * @param {Object} configurationManager - Configuration manager instance
 * @param {Object} [options={}] - Factory options
 * @returns {DOMFactory} Factory instance
 */
export function createDOMFactory(configurationManager, options = {}) {
  return new DOMFactory(configurationManager, options);
}

/**
 * Create a pre-configured DOM manager for Gmail
 * @param {Object} configurationManager - Configuration manager instance
 * @param {Object} [options={}] - Options
 * @returns {DOMManager} Configured DOM manager
 */
export function createGmailDOMManager(configurationManager, options = {}) {
  const factory = new DOMFactory(configurationManager);
  return factory.createGmailDOMManager(options);
}