/**
 * Observer Module (Refactored with DOM Abstraction)
 * 
 * Business logic for dynamic content observation separated from DOM operations.
 * Uses DOM abstraction layer for all DOM interactions.
 */

import { stateManager } from './stateManager.js';
import { configurationManager } from './configurationManager.js';

export class ObserverManager {
  /**
   * @param {Object} domOperations - Observer DOM operations instance
   * @param {Object} [options={}] - Configuration options
   */
  constructor(domOperations, options = {}) {
    this.domOperations = domOperations;
    this.options = {
      enablePerformanceMonitoring: true,
      defaultTimeout: 10000,
      reconnectDelay: 1000,
      maxReconnectAttempts: 3,
      ...options
    };
    
    // Observer state tracking
    this.activeObservers = new Map();
    this.observerCallbacks = new Map();
    this.reconnectAttempts = new Map();
    
    // Performance tracking
    this.observationStats = {
      observersCreated: 0,
      observersDestroyed: 0,
      elementsFound: 0,
      timeouts: 0,
      reconnections: 0
    };
    
    // Bind methods to preserve context
    this.setupContentObserver = this.setupContentObserver.bind(this);
    this.waitForElement = this.waitForElement.bind(this);
    this.handleObserverCallback = this.handleObserverCallback.bind(this);
    
    // Set up state subscriptions
    this.setupStateSubscriptions();
  }

  /**
   * Set up main content observer for dynamic email list changes
   * @param {Function} callback - Callback function for when content changes
   * @param {Object} [options={}] - Observer options
   * @returns {Promise<Object>} Setup result
   */
  async setupContentObserver(callback, options = {}) {
    const startTime = performance.now();
    
    try {
      const observerOptions = {
        childList: true,
        subtree: true,
        attributes: false,
        ...options.observerConfig
      };

      // Use domain-specific selector for Gmail content
      const contentSelector = configurationManager.getSelector('emailListContainer') || 
                             '[role="main"]';

      const setupResult = await this.domOperations.setupContentObserver(
        contentSelector,
        (mutations, observer) => this.handleObserverCallback(mutations, observer, callback),
        {
          observerOptions,
          fallbackSelectors: [
            '[role="main"]',
            '[data-thread-pane-id]',
            '.nH.oy8Mbf',
            '.aAy',
            'body'
          ],
          timeout: this.options.defaultTimeout,
          enableReconnection: true,
          reconnectDelay: this.options.reconnectDelay
        }
      );

      if (!setupResult.success) {
        throw new Error(`Content observer setup failed: ${setupResult.error}`);
      }

      // Track the observer
      const observerId = `content-${Date.now()}`;
      this.activeObservers.set(observerId, setupResult.data.observer);
      this.observerCallbacks.set(observerId, callback);
      this.reconnectAttempts.set(observerId, 0);

      // Update stats
      this.observationStats.observersCreated++;
      
      const executionTime = performance.now() - startTime;

      return {
        success: true,
        observerId,
        observer: setupResult.data.observer,
        targetElement: setupResult.data.targetElement,
        executionTime,
        stats: this.observationStats
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      console.error('Content observer setup failed:', error);
      
      return {
        success: false,
        error: error.message,
        executionTime
      };
    }
  }

  /**
   * Wait for a specific element to appear in the DOM
   * @param {string} selector - Element selector to wait for
   * @param {Object} [options={}] - Wait options
   * @returns {Promise<Object>} Wait result with element or timeout
   */
  async waitForElement(selector, options = {}) {
    const startTime = performance.now();
    
    try {
      const waitOptions = {
        timeout: this.options.defaultTimeout,
        interval: 100,
        fallbackSelectors: [],
        ...options
      };

      const waitResult = await this.domOperations.waitForElement(
        selector,
        waitOptions
      );

      const executionTime = performance.now() - startTime;

      if (waitResult.success) {
        this.observationStats.elementsFound++;
        
        return {
          success: true,
          element: waitResult.data.element,
          selector: waitResult.data.actualSelector,
          executionTime,
          attempts: waitResult.data.attempts
        };
      } else {
        this.observationStats.timeouts++;
        
        return {
          success: false,
          error: 'Element wait timeout',
          selector,
          executionTime,
          timeout: waitOptions.timeout
        };
      }

    } catch (error) {
      const executionTime = performance.now() - startTime;
      console.error('Element wait failed:', error);
      
      return {
        success: false,
        error: error.message,
        selector,
        executionTime
      };
    }
  }

  /**
   * Set up toolbar observer for when toolbar container appears
   * @param {Function} callback - Callback function for toolbar appearance
   * @param {Object} [options={}] - Observer options
   * @returns {Promise<Object>} Setup result
   */
  async setupToolbarObserver(callback, options = {}) {
    try {
      const toolbarSelector = configurationManager.getSelector('toolbarContainer') ||
                             '.G-atb';

      return await this.setupElementObserver(
        toolbarSelector,
        callback,
        {
          ...options,
          fallbackSelectors: [
            '.G-atb',
            '[role="toolbar"]',
            '.nH .nH .no .nH'
          ],
          observerType: 'toolbar'
        }
      );

    } catch (error) {
      console.error('Toolbar observer setup failed:', error);
      throw error;
    }
  }

  /**
   * Set up filter observer for when filter elements change
   * @param {Function} callback - Callback function for filter changes
   * @param {Object} [options={}] - Observer options
   * @returns {Promise<Object>} Setup result
   */
  async setupFilterObserver(callback, options = {}) {
    try {
      const emailListSelector = configurationManager.getSelector('emailListContainer') ||
                               'table[role="grid"]';

      return await this.setupElementObserver(
        emailListSelector,
        callback,
        {
          ...options,
          fallbackSelectors: [
            'table[role="grid"]',
            '.F.cf.zt',
            '.Tm .aeF'
          ],
          observerType: 'filter',
          observerConfig: {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
          }
        }
      );

    } catch (error) {
      console.error('Filter observer setup failed:', error);
      throw error;
    }
  }

  /**
   * Generic element observer setup
   * @param {string} selector - Element selector to observe
   * @param {Function} callback - Callback function
   * @param {Object} [options={}] - Observer options
   * @returns {Promise<Object>} Setup result
   */
  async setupElementObserver(selector, callback, options = {}) {
    const startTime = performance.now();
    
    try {
      const observerType = options.observerType || 'element';
      const observerOptions = {
        childList: true,
        subtree: true,
        ...options.observerConfig
      };

      const setupResult = await this.domOperations.setupElementObserver(
        selector,
        (mutations, observer) => this.handleObserverCallback(mutations, observer, callback, observerType),
        {
          observerOptions,
          fallbackSelectors: options.fallbackSelectors || [],
          timeout: options.timeout || this.options.defaultTimeout,
          enableReconnection: true,
          reconnectDelay: this.options.reconnectDelay
        }
      );

      if (!setupResult.success) {
        throw new Error(`${observerType} observer setup failed: ${setupResult.error}`);
      }

      // Track the observer
      const observerId = `${observerType}-${Date.now()}`;
      this.activeObservers.set(observerId, setupResult.data.observer);
      this.observerCallbacks.set(observerId, callback);
      this.reconnectAttempts.set(observerId, 0);

      // Update stats
      this.observationStats.observersCreated++;
      
      const executionTime = performance.now() - startTime;

      return {
        success: true,
        observerId,
        observer: setupResult.data.observer,
        targetElement: setupResult.data.targetElement,
        observerType,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      console.error(`${options.observerType || 'Element'} observer setup failed:`, error);
      
      return {
        success: false,
        error: error.message,
        executionTime,
        observerType: options.observerType || 'element'
      };
    }
  }

  /**
   * Handle observer callback with error handling and reconnection logic
   * @param {MutationRecord[]} mutations - DOM mutations
   * @param {MutationObserver} observer - The observer instance
   * @param {Function} callback - Original callback function
   * @param {string} [observerType='content'] - Type of observer for logging
   */
  handleObserverCallback(mutations, observer, callback, observerType = 'content') {
    try {
      // Call the original callback
      callback(mutations, observer);
      
      // Reset reconnection attempts on successful callback
      const observerId = this.findObserverId(observer);
      if (observerId) {
        this.reconnectAttempts.set(observerId, 0);
      }

    } catch (error) {
      console.error(`Observer callback error (${observerType}):`, error);
      
      // Attempt reconnection if enabled
      this.attemptObserverReconnection(observer, observerType);
    }
  }

  /**
   * Attempt to reconnect a failed observer
   * @param {MutationObserver} observer - The failed observer
   * @param {string} observerType - Type of observer
   */
  async attemptObserverReconnection(observer, observerType) {
    const observerId = this.findObserverId(observer);
    if (!observerId) return;

    const attempts = this.reconnectAttempts.get(observerId) || 0;
    
    if (attempts >= this.options.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${observerType} observer`);
      this.destroyObserver(observerId);
      return;
    }

    this.reconnectAttempts.set(observerId, attempts + 1);
    this.observationStats.reconnections++;

    console.log(`Attempting to reconnect ${observerType} observer (attempt ${attempts + 1})`);

    setTimeout(async () => {
      try {
        const callback = this.observerCallbacks.get(observerId);
        if (callback) {
          // Re-setup the observer
          const reconnectResult = await this.domOperations.reconnectObserver(
            observer,
            (mutations, obs) => this.handleObserverCallback(mutations, obs, callback, observerType)
          );

          if (reconnectResult.success) {
            console.log(`${observerType} observer reconnected successfully`);
          } else {
            console.error(`${observerType} observer reconnection failed:`, reconnectResult.error);
          }
        }
      } catch (error) {
        console.error(`Observer reconnection failed:`, error);
      }
    }, this.options.reconnectDelay);
  }

  /**
   * Find observer ID by observer instance
   * @param {MutationObserver} observer - The observer instance
   * @returns {string|null} Observer ID or null if not found
   */
  findObserverId(observer) {
    for (const [id, obs] of this.activeObservers.entries()) {
      if (obs === observer) return id;
    }
    return null;
  }

  /**
   * Destroy a specific observer
   * @param {string} observerId - Observer ID to destroy
   * @returns {boolean} Success status
   */
  destroyObserver(observerId) {
    try {
      const observer = this.activeObservers.get(observerId);
      if (observer) {
        this.domOperations.destroyObserver(observer);
        this.activeObservers.delete(observerId);
        this.observerCallbacks.delete(observerId);
        this.reconnectAttempts.delete(observerId);
        this.observationStats.observersDestroyed++;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error destroying observer:', error);
      return false;
    }
  }

  /**
   * Get observer statistics and performance metrics
   * @returns {Object} Observer statistics
   */
  getObserverStats() {
    const domStats = this.domOperations.getPerformanceStats();
    
    return {
      ...this.observationStats,
      activeObserversCount: this.activeObservers.size,
      domOperationStats: domStats,
      reconnectAttempts: Object.fromEntries(this.reconnectAttempts)
    };
  }

  // ========== Helper Methods ==========

  /**
   * Set up state subscriptions for observer management
   */
  setupStateSubscriptions() {
    // Subscribe to relevant state changes that might affect observations
    stateManager.subscribe('stateChanged:filterMode', () => {
      // Observers may need to react to filter mode changes
      console.log('Filter mode changed, observers notified');
    });
  }

  /**
   * Get current observer state
   * @returns {Object} Observer state information
   */
  getObserverState() {
    return {
      activeObserversCount: this.activeObservers.size,
      observerTypes: Array.from(this.activeObservers.keys()).map(id => id.split('-')[0]),
      stats: this.observationStats,
      options: this.options
    };
  }

  /**
   * Cleanup all observers and resources
   */
  cleanup() {
    // Destroy all active observers
    for (const observerId of this.activeObservers.keys()) {
      this.destroyObserver(observerId);
    }
    
    // Clear all maps
    this.activeObservers.clear();
    this.observerCallbacks.clear();
    this.reconnectAttempts.clear();
    
    // Reset stats
    this.observationStats = {
      observersCreated: 0,
      observersDestroyed: 0,
      elementsFound: 0,
      timeouts: 0,
      reconnections: 0
    };
  }

  /**
   * Destroy observer manager and cleanup all resources
   */
  destroy() {
    this.cleanup();
    this.domOperations = null;
  }
}

// Legacy compatibility functions for backward compatibility during migration
export function waitForElement(selector, timeout = 10000, _chromeApi = chrome) {
  console.warn('Legacy waitForElement called - consider migrating to ObserverManager');
  // For now, create a temporary observer manager to handle the call
  const dummyDomOps = { 
    waitForElement: async (sel, _opts) => {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          const element = document.querySelector(sel);
          if (element) {
            clearInterval(interval);
            resolve({ success: true, data: { element, actualSelector: sel } });
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(interval);
          resolve({ success: false, error: 'Timeout' });
        }, timeout);
      });
    }
  };
  
  const observerManager = new ObserverManager(dummyDomOps);
  return observerManager.waitForElement(selector, { timeout });
}

export function setupContentObserver(callback, _options = {}) {
  console.warn('Legacy setupContentObserver called - consider migrating to ObserverManager');
  // This would require a global observer manager instance
}