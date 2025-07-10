/**
 * Gmail DOM Adapter Module
 * 
 * Gmail-specific DOM operations with robust selector strategies,
 * fallback mechanisms, and dynamic element detection for Gmail's
 * constantly changing DOM structure.
 */

// Removed unused DOM_CONSTANTS, DOM_ERRORS imports

export class GmailDOMAdapter {
  /**
   * @param {Object} configurationManager - Configuration manager instance
   * @param {Object} [options={}] - Adapter options
   */
  constructor(configurationManager, options = {}) {
    this.configurationManager = configurationManager;
    this.options = {
      enableRobustSelectors: true,
      enableFallbacks: true,
      enableWaiting: true,
      defaultTimeout: 10000,
      pollInterval: 100,
      ...options
    };

    // Selector fallback strategies
    this.selectorFallbacks = new Map();
    this.initializeSelectorFallbacks();

    // Performance tracking for selectors
    this.selectorPerformance = new Map();
    
    // Gmail-specific observer state
    this.observers = new Map();
  }

  /**
   * Initialize selector fallback strategies for Gmail elements
   */
  initializeSelectorFallbacks() {
    // Email row selectors with multiple fallbacks
    this.selectorFallbacks.set('emailRow', [
      this.getSelector('emailRow'), // Primary from config
      'tr[role="row"]',
      '[data-thread-id]',
      '.zA',
      'tr.yW'
    ]);

    // Toolbar selectors
    this.selectorFallbacks.set('gmailToolbar', [
      this.getSelector('gmailToolbar'),
      '[role="toolbar"]',
      '.ar9',
      '.G-Ni'
    ]);

    // Attachment selectors
    this.selectorFallbacks.set('attachmentChip', [
      this.getSelector('attachmentChip'),
      '[data-tooltip*="attachment"]',
      '.aZo',
      '.aZp'
    ]);

    // Email list container
    this.selectorFallbacks.set('emailList', [
      this.getSelector('emailList'),
      '[role="main"] table',
      '.Cp',
      'table[role="grid"]'
    ]);
  }

  /**
   * Get selector from configuration manager with fallback
   * @param {string} key - Selector key
   * @returns {string} CSS selector
   */
  getSelector(key) {
    try {
      return this.configurationManager.getSelector ? 
        this.configurationManager.getSelector(key) : 
        `[data-${key}]`; // Fallback selector
    } catch (error) {
      console.warn(`Error getting selector for ${key}:`, error);
      return `[data-${key}]`;
    }
  }

  // ========== Gmail-Specific Element Finding ==========

  /**
   * Find Gmail email rows with robust fallback selectors
   * @param {Object} [options={}] - Query options
   * @returns {Promise<NodeList>} Email row elements
   */
  async findEmailRows(options = {}) {
    const operationName = 'findEmailRows';
    const startTime = performance.now();

    try {
      const {
        context = document,
        timeout = this.options.defaultTimeout
      } = options;

      const selectors = this.selectorFallbacks.get('emailRow');
      const elements = await this.findWithFallbacks(selectors, { context, timeout });

      this.recordSelectorPerformance(operationName, performance.now() - startTime);
      return elements;

    } catch (error) {
      this.recordSelectorPerformance(operationName, performance.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Find Gmail toolbar container
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Element|null>} Toolbar container element
   */
  async findToolbarContainer(options = {}) {
    const operationName = 'findToolbarContainer';
    const startTime = performance.now();

    try {
      const {
        context = document,
        timeout = this.options.defaultTimeout
      } = options;

      // Try specific Gmail toolbar selectors
      const toolbarSelectors = [
        this.getSelector('gmailToolbarHeader'),
        '.nH .ar9',
        '[role="banner"] + div',
        '.G-Ni .G-asx'
      ];

      const element = await this.findSingleWithFallbacks(toolbarSelectors, { context, timeout });
      
      this.recordSelectorPerformance(operationName, performance.now() - startTime);
      return element;

    } catch (error) {
      this.recordSelectorPerformance(operationName, performance.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Find attachment chips within an email row
   * @param {Element} emailRow - Email row element
   * @param {Object} [options={}] - Query options
   * @returns {Promise<NodeList>} Attachment chip elements
   */
  async findAttachmentChips(emailRow, options = {}) {
    const operationName = 'findAttachmentChips';
    const startTime = performance.now();

    try {
      const selectors = this.selectorFallbacks.get('attachmentChip');
      const elements = await this.findWithFallbacks(selectors, { 
        context: emailRow,
        timeout: options.timeout || 1000 // Shorter timeout for row-specific queries
      });

      this.recordSelectorPerformance(operationName, performance.now() - startTime);
      return elements;

    } catch (error) {
      this.recordSelectorPerformance(operationName, performance.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Wait for Gmail element to appear with polling
   * @param {string} selector - CSS selector
   * @param {number} [timeout=10000] - Timeout in milliseconds
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Element>} Found element
   */
  async waitForGmailElement(selector, timeout = this.options.defaultTimeout, options = {}) {
    const {
      context = document,
      pollInterval = this.options.pollInterval,
      fallbackSelectors = []
    } = options;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let currentSelectorIndex = 0;
      const allSelectors = [selector, ...fallbackSelectors];

      const poll = () => {
        const currentSelector = allSelectors[currentSelectorIndex];
        const element = context.querySelector(currentSelector);
        
        if (element) {
          if (currentSelectorIndex > 0) {
            console.warn(`Primary selector failed, used fallback: ${currentSelector}`);
          }
          resolve(element);
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeout) {
          // Try next fallback selector
          currentSelectorIndex++;
          if (currentSelectorIndex < allSelectors.length) {
            setTimeout(poll, pollInterval);
          } else {
            reject(new Error(`Timeout waiting for element: ${selector} (${timeout}ms)`));
          }
          return;
        }

        setTimeout(poll, pollInterval);
      };

      poll();
    });
  }

  // ========== Gmail-Specific Observers ==========

  /**
   * Observe changes to Gmail email list
   * @param {Function} callback - Callback function for changes
   * @param {Object} [options={}] - Observer options
   * @returns {MutationObserver} Observer instance
   */
  observeEmailList(callback, options = {}) {
    const {
      childList = true,
      subtree = true,
      debounceDelay = 200
    } = options;

    const emailList = document.querySelector(this.getSelector('emailList'));
    if (!emailList) {
      throw new Error('Email list not found for observation');
    }

    // Debounce callback to prevent excessive firing
    let timeoutId = null;
    const debouncedCallback = (mutations) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        callback(mutations);
      }, debounceDelay);
    };

    const observer = new MutationObserver(debouncedCallback);
    observer.observe(emailList, {
      childList,
      subtree,
      attributes: false,
      characterData: false
    });

    // Store observer for cleanup
    this.observers.set('emailList', observer);
    
    return observer;
  }

  /**
   * Observe changes to Gmail toolbar
   * @param {Function} callback - Callback function for changes
   * @param {Object} [options={}] - Observer options
   * @returns {MutationObserver} Observer instance
   */
  observeToolbarChanges(callback, options = {}) {
    const {
      childList = true,
      subtree = true,
      debounceDelay = 100
    } = options;

    // Debounce callback
    let timeoutId = null;
    const debouncedCallback = (mutations) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        callback(mutations);
      }, debounceDelay);
    };

    const observer = new MutationObserver(debouncedCallback);
    observer.observe(document.body, {
      childList,
      subtree,
      attributes: false,
      characterData: false
    });

    // Store observer for cleanup
    this.observers.set('toolbar', observer);
    
    return observer;
  }

  // ========== Gmail-Specific Utilities ==========

  /**
   * Check if element is visible in Gmail interface
   * @param {Element} element - Element to check
   * @param {Object} [options={}] - Check options
   * @returns {boolean} True if visible
   */
  isElementVisible(element, options = {}) {
    if (!element) return false;

    const {
      checkParents = true,
      checkViewport = false
    } = options;

    // Check basic visibility
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    // Check parent visibility if requested
    if (checkParents) {
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') {
          return false;
        }
        parent = parent.parentElement;
      }
    }

    // Check if element is in viewport if requested
    if (checkViewport) {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && 
             rect.left >= 0 && 
             rect.bottom <= window.innerHeight && 
             rect.right <= window.innerWidth;
    }

    return true;
  }

  /**
   * Scroll element into view in Gmail interface
   * @param {Element} element - Element to scroll to
   * @param {Object} [options={}] - Scroll options
   * @returns {Promise<void>}
   */
  async scrollToElement(element, options = {}) {
    const {
      behavior = 'smooth',
      block = 'nearest',
      inline = 'nearest'
    } = options;

    return new Promise((resolve) => {
      element.scrollIntoView({
        behavior,
        block,
        inline
      });

      // Wait for scroll to complete
      setTimeout(resolve, behavior === 'smooth' ? 500 : 0);
    });
  }

  /**
   * Check if Gmail is in specific view mode
   * @param {string} viewMode - View mode to check ('conversation', 'list', etc.)
   * @returns {boolean} True if in specified view mode
   */
  isInViewMode(viewMode) {
    switch (viewMode) {
      case 'conversation':
        return !!document.querySelector('[role="main"] [data-thread-id]');
      case 'list':
        return !!document.querySelector('table[role="grid"]');
      case 'compose':
        return !!document.querySelector('[role="dialog"] [aria-label*="compose"]');
      default:
        return false;
    }
  }

  // ========== Helper Methods ==========

  /**
   * Find elements using fallback selectors
   * @param {Array<string>} selectors - Array of selectors to try
   * @param {Object} [options={}] - Query options
   * @returns {Promise<NodeList>} Found elements
   */
  async findWithFallbacks(selectors, options = {}) {
    const {
      context = document,
      timeout = 5000
    } = options;

    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      
      try {
        const elements = context.querySelectorAll(selector);
        if (elements.length > 0) {
          if (i > 0) {
            console.warn(`Primary selector failed, used fallback: ${selector}`);
          }
          return elements;
        }
      } catch (error) {
        console.warn(`Selector failed: ${selector}`, error);
      }
    }

    // If no elements found, try waiting for elements to appear
    if (options.timeout > 1000) {
      try {
        await this.waitForGmailElement(selectors[0], timeout, {
          context,
          fallbackSelectors: selectors.slice(1)
        });
        return context.querySelectorAll(selectors[0]);
      } catch (error) {
        // Return empty NodeList if waiting fails
        return document.querySelectorAll('non-existent-selector');
      }
    }

    // Return empty NodeList if no selectors work
    return document.querySelectorAll('non-existent-selector');
  }

  /**
   * Find single element using fallback selectors
   * @param {Array<string>} selectors - Array of selectors to try
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Element|null>} Found element
   */
  async findSingleWithFallbacks(selectors, options = {}) {
    const {
      context = document,
      timeout = 5000
    } = options;

    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      
      try {
        const element = context.querySelector(selector);
        if (element) {
          if (i > 0) {
            console.warn(`Primary selector failed, used fallback: ${selector}`);
          }
          return element;
        }
      } catch (error) {
        console.warn(`Selector failed: ${selector}`, error);
      }
    }

    // If no element found, try waiting
    if (timeout > 1000) {
      try {
        return await this.waitForGmailElement(selectors[0], timeout, {
          context,
          fallbackSelectors: selectors.slice(1)
        });
      } catch (error) {
        console.warn('All selectors failed:', selectors, error);
      }
    }

    return null;
  }

  /**
   * Record selector performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {boolean} [success=true] - Whether operation succeeded
   */
  recordSelectorPerformance(operation, duration, success = true) {
    if (!this.selectorPerformance.has(operation)) {
      this.selectorPerformance.set(operation, {
        count: 0,
        successCount: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity
      });
    }

    const metrics = this.selectorPerformance.get(operation);
    metrics.count++;
    if (success) metrics.successCount++;
    metrics.totalTime += duration;
    metrics.avgTime = metrics.totalTime / metrics.count;
    metrics.maxTime = Math.max(metrics.maxTime, duration);
    metrics.minTime = Math.min(metrics.minTime, duration);
  }

  /**
   * Get adapter performance statistics
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    const stats = {};
    for (const [operation, metrics] of this.selectorPerformance) {
      stats[operation] = {
        ...metrics,
        successRate: metrics.count > 0 ? metrics.successCount / metrics.count : 0
      };
    }
    return stats;
  }

  /**
   * Cleanup observers and resources
   */
  destroy() {
    // Disconnect all observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
    
    // Clear performance tracking
    this.selectorPerformance.clear();
    this.selectorFallbacks.clear();
  }
}