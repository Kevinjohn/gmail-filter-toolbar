/**
 * Observer DOM Operations Module
 * 
 * Specialized DOM operations for setting up and managing MutationObservers,
 * element waiting, and dynamic content monitoring in Gmail.
 */

// Removed unused DOM_CONSTANTS import

export class ObserverDOMOperations {
  /**
   * @param {DOMManager} domManager - DOM manager instance
   */
  constructor(domManager) {
    this.domManager = domManager;
    this.performanceMetrics = new Map();
    
    // Active observers tracking
    this.activeObservers = new Map();
    this.observerConfigs = new Map();
    
    // Waiting operations tracking
    this.waitingOperations = new Map();
    
    // Bind methods to preserve context
    this.observeEmailList = this.observeEmailList.bind(this);
    this.observeToolbarChanges = this.observeToolbarChanges.bind(this);
    this.waitForElement = this.waitForElement.bind(this);
  }

  /**
   * Set up observer for Gmail email list changes
   * @param {Function} callback - Callback function for changes
   * @param {Object} [options={}] - Observer options
   * @returns {Promise<Object>} Observer setup result
   */
  async observeEmailList(callback, options = {}) {
    const operationName = 'observeEmailList';
    const startTime = performance.now();

    try {
      const {
        context = document,
        debounceDelay = 200,
        observerConfig = {
          childList: true,
          subtree: false
        },
        autoReconnect = true,
        maxReconnectAttempts = 3
      } = options;

      // Find email list element
      const emailListResult = await this.domManager.select('[role="main"] table, .Cp, table[role="grid"]', {
        context,
        fallbackSelectors: [
          '[data-email-list]',
          '.gmail-email-list',
          'table.F'
        ]
      });

      if (!emailListResult.success || !emailListResult.data) {
        throw new Error('Email list element not found');
      }

      const emailList = emailListResult.data;

      // Disconnect existing observer if it exists
      if (this.activeObservers.has('emailList')) {
        this.disconnectObserver('emailList');
      }

      // Create debounced callback
      let timeoutId = null;
      const debouncedCallback = (mutations) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          try {
            callback(mutations, emailList);
          } catch (error) {
            console.error('Error in email list observer callback:', error);
          }
        }, debounceDelay);
      };

      // Create observer
      const observer = new MutationObserver(debouncedCallback);
      observer.observe(emailList, observerConfig);

      // Store observer reference and configuration
      this.activeObservers.set('emailList', {
        observer,
        target: emailList,
        callback: debouncedCallback,
        originalCallback: callback,
        config: observerConfig,
        autoReconnect,
        maxReconnectAttempts,
        reconnectAttempts: 0,
        timeoutId
      });

      // Set up auto-reconnection if enabled
      if (autoReconnect) {
        this.setupAutoReconnect('emailList');
      }

      const executionTime = performance.now() - startTime;
      this.recordObserverPerformance(operationName, executionTime);

      return {
        success: true,
        observerId: 'emailList',
        target: emailList,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordObserverPerformance(operationName, executionTime, false);
      throw new Error(`Email list observer setup failed: ${error.message}`);
    }
  }

  /**
   * Set up observer for Gmail toolbar changes
   * @param {Function} callback - Callback function for changes
   * @param {Object} [options={}] - Observer options
   * @returns {Promise<Object>} Observer setup result
   */
  async observeToolbarChanges(callback, options = {}) {
    const operationName = 'observeToolbarChanges';
    const startTime = performance.now();

    try {
      const {
        context = document.body,
        debounceDelay = 100,
        observerConfig = {
          childList: true,
          subtree: true
        },
        autoReconnect = true,
        filterMutations = true
      } = options;

      // Disconnect existing observer if it exists
      if (this.activeObservers.has('gmailToolbar')) {
        this.disconnectObserver('gmailToolbar');
      }

      // Create filtered and debounced callback
      let timeoutId = null;
      const debouncedCallback = (mutations) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          try {
            let relevantMutations = mutations;
            
            // Filter mutations to toolbar-relevant changes if enabled
            if (filterMutations) {
              relevantMutations = mutations.filter(mutation => {
                return mutation.type === 'childList' && 
                       (mutation.target.matches('[role="banner"], .nH, .ar9') ||
                        Array.from(mutation.addedNodes).some(node => 
                          node.nodeType === Node.ELEMENT_NODE &&
                          node.matches('[role="toolbar"], .ar9, .G-Ni')
                        ));
              });
            }

            if (relevantMutations.length > 0) {
              callback(relevantMutations, context);
            }
          } catch (error) {
            console.error('Error in toolbar observer callback:', error);
          }
        }, debounceDelay);
      };

      // Create observer
      const observer = new MutationObserver(debouncedCallback);
      observer.observe(context, observerConfig);

      // Store observer reference
      this.activeObservers.set('gmailToolbar', {
        observer,
        target: context,
        callback: debouncedCallback,
        originalCallback: callback,
        config: observerConfig,
        autoReconnect,
        timeoutId
      });

      // Set up auto-reconnection if enabled
      if (autoReconnect) {
        this.setupAutoReconnect('gmailToolbar');
      }

      const executionTime = performance.now() - startTime;
      this.recordObserverPerformance(operationName, executionTime);

      return {
        success: true,
        observerId: 'gmailToolbar',
        target: context,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordObserverPerformance(operationName, executionTime, false);
      throw new Error(`Toolbar observer setup failed: ${error.message}`);
    }
  }

  /**
   * Set up custom observer with specified configuration
   * @param {string} observerId - Unique identifier for the observer
   * @param {Element} target - Target element to observe
   * @param {Function} callback - Callback function for changes
   * @param {Object} [options={}] - Observer options
   * @returns {Promise<Object>} Observer setup result
   */
  async setupCustomObserver(observerId, target, callback, options = {}) {
    const operationName = 'setupCustomObserver';
    const startTime = performance.now();

    try {
      const {
        observerConfig = {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false
        },
        debounceDelay = 0,
        autoReconnect = false,
        maxReconnectAttempts = 3
      } = options;

      if (!target || !target.nodeType) {
        throw new Error('Invalid target element provided');
      }

      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }

      // Disconnect existing observer with same ID if it exists
      if (this.activeObservers.has(observerId)) {
        this.disconnectObserver(observerId);
      }

      // Create callback wrapper with optional debouncing
      let wrappedCallback = callback;
      let timeoutId = null;

      if (debounceDelay > 0) {
        wrappedCallback = (mutations) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          timeoutId = setTimeout(() => {
            try {
              callback(mutations, target);
            } catch (error) {
              console.error(`Error in custom observer ${observerId} callback:`, error);
            }
          }, debounceDelay);
        };
      }

      // Create observer
      const observer = new MutationObserver(wrappedCallback);
      observer.observe(target, observerConfig);

      // Store observer reference
      this.activeObservers.set(observerId, {
        observer,
        target,
        callback: wrappedCallback,
        originalCallback: callback,
        config: observerConfig,
        autoReconnect,
        maxReconnectAttempts,
        reconnectAttempts: 0,
        timeoutId
      });

      // Set up auto-reconnection if enabled
      if (autoReconnect) {
        this.setupAutoReconnect(observerId);
      }

      const executionTime = performance.now() - startTime;
      this.recordObserverPerformance(operationName, executionTime);

      return {
        success: true,
        observerId,
        target,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordObserverPerformance(operationName, executionTime, false);
      throw new Error(`Custom observer setup failed: ${error.message}`);
    }
  }

  /**
   * Wait for element to appear in DOM with polling
   * @param {string} selector - CSS selector for target element
   * @param {Object} [options={}] - Waiting options
   * @returns {Promise<Element>} Found element
   */
  async waitForElement(selector, options = {}) {
    const operationName = 'waitForElement';
    const startTime = performance.now();

    try {
      const {
        context = document,
        timeout = 10000,
        pollInterval = 100,
        fallbackSelectors = [],
        returnFirst = true
      } = options;

      const waitId = `wait-${Date.now()}-${Math.random()}`;
      const allSelectors = [selector, ...fallbackSelectors];
      
      return new Promise((resolve, reject) => {
        let currentSelectorIndex = 0;
        let pollCount = 0;
        const maxPolls = Math.ceil(timeout / pollInterval);

        // Store waiting operation for cleanup
        this.waitingOperations.set(waitId, {
          selector,
          context,
          startTime,
          resolve,
          reject
        });

        const poll = () => {
          pollCount++;
          const currentSelector = allSelectors[currentSelectorIndex];
          
          try {
            const element = returnFirst 
              ? context.querySelector(currentSelector)
              : context.querySelectorAll(currentSelector);
              
            if (element && (returnFirst || element.length > 0)) {
              // Cleanup and resolve
              this.waitingOperations.delete(waitId);
              
              if (currentSelectorIndex > 0) {
                console.warn(`Primary selector failed, used fallback: ${currentSelector}`);
              }
              
              const executionTime = performance.now() - startTime;
              this.recordObserverPerformance(operationName, executionTime);
              
              resolve(element);
              return;
            }
          } catch (error) {
            console.warn(`Selector polling error: ${currentSelector}`, error);
          }

          // Check if we should try next fallback selector
          if (pollCount >= maxPolls) {
            currentSelectorIndex++;
            
            if (currentSelectorIndex < allSelectors.length) {
              // Reset poll count for next selector
              pollCount = 0;
              setTimeout(poll, pollInterval);
            } else {
              // All selectors exhausted
              this.waitingOperations.delete(waitId);
              
              const executionTime = performance.now() - startTime;
              this.recordObserverPerformance(operationName, executionTime, false);
              
              reject(new Error(`Timeout waiting for element: ${selector} (${timeout}ms)`));
            }
          } else {
            // Continue polling with current selector
            setTimeout(poll, pollInterval);
          }
        };

        // Start polling
        poll();
      });

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordObserverPerformance(operationName, executionTime, false);
      throw error;
    }
  }

  /**
   * Wait for Gmail toolbar to appear
   * @param {Object} [options={}] - Waiting options
   * @returns {Promise<Element>} Gmail toolbar header element
   */
  async waitForGmailToolbar(options = {}) {
    const fallbackSelectors = [
      '[role="banner"] .nH',
      '.ar9',
      '.G-Ni',
      '[aria-label*="toolbar"]'
    ];

    const toolbarElement = await this.waitForElement(
      '[role="toolbar"], .ar9, .G-Ni',
      {
        ...options,
        fallbackSelectors,
        timeout: options.timeout || 10000
      }
    );

    // Find the header container
    const header = toolbarElement.closest('[role="banner"], .nH, .ar9') || toolbarElement;
    return header;
  }

  /**
   * Wait for Gmail message table to appear
   * @param {Object} [options={}] - Waiting options
   * @returns {Promise<Element>} Message table element
   */
  async waitForMessageTable(options = {}) {
    const fallbackSelectors = [
      'table[role="grid"]',
      '.Cp table',
      '[data-thread-id]',
      '.zA'
    ];

    return this.waitForElement(
      '[role="main"] table',
      {
        ...options,
        fallbackSelectors,
        timeout: options.timeout || 5000
      }
    );
  }

  /**
   * Disconnect observer by ID
   * @param {string} observerId - Observer identifier
   * @returns {boolean} True if observer was disconnected
   */
  disconnectObserver(observerId) {
    const observerData = this.activeObservers.get(observerId);
    if (!observerData) {
      return false;
    }

    try {
      // Clear timeout if exists
      if (observerData.timeoutId) {
        clearTimeout(observerData.timeoutId);
      }

      // Disconnect observer
      observerData.observer.disconnect();
      
      // Remove from active observers
      this.activeObservers.delete(observerId);
      
      return true;
    } catch (error) {
      console.error(`Error disconnecting observer ${observerId}:`, error);
      return false;
    }
  }

  /**
   * Set up auto-reconnection for an observer
   * @param {string} observerId - Observer identifier
   */
  setupAutoReconnect(observerId) {
    const observerData = this.activeObservers.get(observerId);
    if (!observerData || !observerData.autoReconnect) {
      return;
    }

    // Monitor if target element is still in DOM
    const checkConnection = () => {
      if (!document.contains(observerData.target)) {
        console.warn(`Observer target removed from DOM, attempting reconnection: ${observerId}`);
        this.attemptReconnection(observerId);
      } else {
        // Schedule next check
        setTimeout(checkConnection, 5000); // Check every 5 seconds
      }
    };

    // Start monitoring after a delay
    setTimeout(checkConnection, 5000);
  }

  /**
   * Attempt to reconnect a disconnected observer
   * @param {string} observerId - Observer identifier
   */
  async attemptReconnection(observerId) {
    const observerData = this.activeObservers.get(observerId);
    if (!observerData) {
      return;
    }

    try {
      observerData.reconnectAttempts++;
      
      if (observerData.reconnectAttempts > observerData.maxReconnectAttempts) {
        console.error(`Max reconnection attempts reached for observer: ${observerId}`);
        this.disconnectObserver(observerId);
        return;
      }

      // Try to find target element again based on observer type
      let newTarget = null;
      
      if (observerId === 'emailList') {
        const result = await this.domManager.select('[role="main"] table, .Cp, table[role="grid"]');
        newTarget = result.success ? result.data : null;
      } else if (observerId === 'gmailToolbar') {
        newTarget = document.body; // Toolbar observer always uses body
      }

      if (newTarget) {
        // Disconnect old observer
        observerData.observer.disconnect();
        
        // Create new observer with same configuration
        const newObserver = new MutationObserver(observerData.callback);
        newObserver.observe(newTarget, observerData.config);
        
        // Update observer data
        observerData.observer = newObserver;
        observerData.target = newTarget;
        
        console.log(`Successfully reconnected observer: ${observerId}`);
      } else {
        // Retry after delay
        setTimeout(() => this.attemptReconnection(observerId), 2000);
      }

    } catch (error) {
      console.error(`Error reconnecting observer ${observerId}:`, error);
      setTimeout(() => this.attemptReconnection(observerId), 2000);
    }
  }

  /**
   * Cancel waiting operation
   * @param {string} selector - Selector that was being waited for
   * @returns {boolean} True if operation was cancelled
   */
  cancelWaiting(selector) {
    for (const [waitId, operation] of this.waitingOperations.entries()) {
      if (operation.selector === selector) {
        operation.reject(new Error('Waiting operation cancelled'));
        this.waitingOperations.delete(waitId);
        return true;
      }
    }
    return false;
  }

  /**
   * Get active observers information
   * @returns {Object} Active observers data
   */
  getActiveObservers() {
    const observers = {};
    for (const [observerId, data] of this.activeObservers.entries()) {
      observers[observerId] = {
        target: data.target.tagName || 'Document',
        config: data.config,
        autoReconnect: data.autoReconnect,
        reconnectAttempts: data.reconnectAttempts || 0
      };
    }
    return observers;
  }

  /**
   * Get waiting operations information
   * @returns {Object} Waiting operations data
   */
  getWaitingOperations() {
    const operations = {};
    for (const [waitId, operation] of this.waitingOperations.entries()) {
      operations[waitId] = {
        selector: operation.selector,
        context: operation.context.tagName || 'Document',
        duration: performance.now() - operation.startTime
      };
    }
    return operations;
  }

  /**
   * Record observer operation performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {boolean} [success=true] - Whether operation succeeded
   */
  recordObserverPerformance(operation, duration, success = true) {
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
   * Get observer performance statistics
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
      activeObservers: this.activeObservers.size,
      waitingOperations: this.waitingOperations.size
    };
  }

  /**
   * Cleanup all observers and waiting operations
   */
  destroy() {
    // Disconnect all observers
    for (const observerId of this.activeObservers.keys()) {
      this.disconnectObserver(observerId);
    }

    // Cancel all waiting operations
    for (const operation of this.waitingOperations.values()) {
      operation.reject(new Error('Observer module destroyed'));
    }

    this.activeObservers.clear();
    this.waitingOperations.clear();
    this.performanceMetrics.clear();
  }
}