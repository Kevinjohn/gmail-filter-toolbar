/**
 * DOM Manager Module
 * 
 * Core DOM abstraction interface providing unified access to DOM operations
 * with caching, batching, error handling, and performance monitoring.
 */

import { DOM_CONSTANTS } from './interfaces.js';
import { DOMCache } from './DOMCache.js';
import { DOMQueue } from './DOMQueue.js';

export class DOMManager {
  /**
   * @param {Object} adapter - DOM adapter for environment-specific operations
   * @param {DOMCache} [cache] - Cache instance for performance optimization
   * @param {DOMQueue} [queue] - Queue instance for batched operations
   * @param {Object} [options] - Configuration options
   */
  constructor(adapter, cache = null, queue = null, options = {}) {
    this.adapter = adapter;
    this.cache = cache || new DOMCache(options.cache);
    this.queue = queue || new DOMQueue(options.queue);
    this.options = {
      enablePerformanceMonitoring: true,
      enableErrorRecovery: true,
      defaultTimeout: DOM_CONSTANTS.DEFAULT_TIMEOUT,
      maxRetryAttempts: DOM_CONSTANTS.DEFAULT_RETRY_ATTEMPTS,
      retryDelay: DOM_CONSTANTS.DEFAULT_RETRY_DELAY,
      ...options
    };

    // Performance monitoring
    this.performanceMonitor = new Map();
    this.activeOperations = new Map();

    // Error handling
    this.errorCallbacks = new Set();
    this.errorStats = {
      total: 0,
      byType: {},
      recovered: 0
    };

    // Bind methods to preserve context
    this.select = this.select.bind(this);
    this.selectAll = this.selectAll.bind(this);
    this.batch = this.batch.bind(this);
  }

  // ========== Element Selection and Query Methods ==========

  /**
   * Select single element with caching and fallback support
   * @param {string} selector - CSS selector
   * @param {DOMQueryOptions} [options={}] - Query options
   * @returns {Promise<DOMOperationResult>} Operation result with selected element
   */
  async select(selector, options = {}) {
    const operationName = `select:${selector}`;
    this.startPerformanceMonitoring(operationName);

    try {
      const {
        context = document,
        useCache = true,
        timeout = this.options.defaultTimeout,
        fallbackSelectors = []
      } = options;

      // Check cache first
      if (useCache) {
        const cached = this.cache.getCachedQuery(selector, context, options);
        if (cached !== null) {
          this.endPerformanceMonitoring(operationName);
          return this.createSuccessResult(cached, performance.now() - this.activeOperations.get(operationName));
        }
      }

      // Execute with timeout and fallbacks
      const element = await this.executeWithTimeout(async () => {
        // Try primary selector
        let result = context.querySelector(selector);
        if (result) return result;

        // Try fallback selectors
        for (const fallback of fallbackSelectors) {
          result = context.querySelector(fallback);
          if (result) {
            console.warn(`Primary selector failed, used fallback: ${fallback}`);
            return result;
          }
        }

        return null;
      }, timeout);

      // Cache result if successful and caching enabled
      if (element && useCache) {
        this.cache.cacheQuery(selector, context, element, options);
      }

      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(element, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Select multiple elements with caching and fallback support
   * @param {string} selector - CSS selector
   * @param {DOMQueryOptions} [options={}] - Query options
   * @returns {Promise<DOMOperationResult>} Operation result with NodeList
   */
  async selectAll(selector, options = {}) {
    const operationName = `selectAll:${selector}`;
    this.startPerformanceMonitoring(operationName);

    try {
      const {
        context = document,
        useCache = true,
        timeout = this.options.defaultTimeout,
        fallbackSelectors = []
      } = options;

      // Check cache first
      if (useCache) {
        const cached = this.cache.getCachedQuery(selector, context, options);
        if (cached !== null) {
          this.endPerformanceMonitoring(operationName);
          return this.createSuccessResult(cached, performance.now() - this.activeOperations.get(operationName));
        }
      }

      // Execute with timeout and fallbacks
      const elements = await this.executeWithTimeout(async () => {
        // Try primary selector
        let result = context.querySelectorAll(selector);
        if (result.length > 0) return result;

        // Try fallback selectors
        for (const fallback of fallbackSelectors) {
          result = context.querySelectorAll(fallback);
          if (result.length > 0) {
            console.warn(`Primary selector failed, used fallback: ${fallback}`);
            return result;
          }
        }

        return result; // Return empty NodeList
      }, timeout);

      // Cache result if caching enabled
      if (useCache) {
        this.cache.cacheQuery(selector, context, elements, options);
      }

      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(elements, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Select elements by data attribute
   * @param {string} attribute - Data attribute name
   * @param {string} value - Attribute value
   * @param {DOMQueryOptions} [options={}] - Query options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async selectByDataAttribute(attribute, value, options = {}) {
    const selector = `[data-${attribute}="${value}"]`;
    return this.selectAll(selector, options);
  }

  /**
   * Select element by ID with caching
   * @param {string} id - Element ID
   * @param {DOMQueryOptions} [options={}] - Query options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async getElementById(id, options = {}) {
    const selector = `#${id}`;
    return this.select(selector, options);
  }

  // ========== Element Creation and Manipulation ==========

  /**
   * Create element with attributes
   * @param {string} tagName - HTML tag name
   * @param {Object} [attributes={}] - Element attributes
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result with created element
   */
  async createElement(tagName, attributes = {}, options = {}) {
    const operationName = `createElement:${tagName}`;
    
    if (options.batch !== false) {
      return this.queue.enqueue({
        type: 'createElement',
        args: { tagName, attributes },
        ...options
      }, options.priority);
    }

    this.startPerformanceMonitoring(operationName);

    try {
      const element = document.createElement(tagName);
      
      // Set attributes safely
      Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'textContent') {
          element.textContent = this.sanitizeTextContent(value);
        } else if (key === 'className' || key === 'class') {
          element.className = value;
        } else {
          element.setAttribute(key, value);
        }
      });

      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(element, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Create element from template with data substitution
   * @param {string} template - HTML template string
   * @param {Object} [data={}] - Data for substitution
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async createElementFromTemplate(template, data = {}, options = {}) {
    const operationName = 'createElementFromTemplate';
    this.startPerformanceMonitoring(operationName);

    try {
      // Simple template substitution (security: only predefined templates)
      let processedTemplate = template;
      Object.entries(data).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processedTemplate = processedTemplate.replace(
          new RegExp(placeholder, 'g'), 
          this.sanitizeTextContent(value)
        );
      });

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = processedTemplate;
      const element = tempDiv.firstElementChild;

      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(element, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Clone element safely
   * @param {Element} element - Element to clone
   * @param {boolean} [deep=true] - Whether to deep clone
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async cloneElement(element, deep = true, options = {}) {
    const operationName = 'cloneElement';
    this.startPerformanceMonitoring(operationName);

    try {
      const cloned = element.cloneNode(deep);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(cloned, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  // ========== Content Manipulation ==========

  /**
   * Set text content safely
   * @param {Element} element - Target element
   * @param {string} text - Text content
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async setText(element, text, options = {}) {
    const operationName = 'setText';
    
    if (options.batch !== false) {
      return this.queue.enqueue({
        type: 'setText',
        args: { element, text: this.sanitizeTextContent(text) }
      }, options.priority);
    }

    this.startPerformanceMonitoring(operationName);

    try {
      element.textContent = this.sanitizeTextContent(text);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Set HTML content safely (use with caution)
   * @param {Element} element - Target element
   * @param {string} html - HTML content
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async setHTML(element, html, options = {}) {
    const operationName = 'setHTML';
    this.startPerformanceMonitoring(operationName);

    try {
      // Security note: Only use with trusted content
      if (options.validate !== false) {
        console.warn('Setting innerHTML - ensure content is trusted');
      }
      
      element.innerHTML = html;
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Get attribute value
   * @param {Element} element - Target element
   * @param {string} attribute - Attribute name
   * @param {DOMQueryOptions} [options={}] - Query options
   * @returns {Promise<DOMOperationResult>} Operation result with attribute value
   */
  async getAttribute(element, attribute, options = {}) {
    const operationName = 'getAttribute';
    this.startPerformanceMonitoring(operationName);

    try {
      const value = element.getAttribute(attribute);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(value, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Set attribute value
   * @param {Element} element - Target element
   * @param {string} attribute - Attribute name
   * @param {string} value - Attribute value
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async setAttribute(element, attribute, value, options = {}) {
    const operationName = 'setAttribute';
    
    if (options.batch !== false) {
      return this.queue.enqueue({
        type: 'setAttribute',
        args: { element, attribute, value }
      }, options.priority);
    }

    this.startPerformanceMonitoring(operationName);

    try {
      element.setAttribute(attribute, value);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Remove attribute
   * @param {Element} element - Target element
   * @param {string} attribute - Attribute name
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async removeAttribute(element, attribute, options = {}) {
    const operationName = 'removeAttribute';
    
    if (options.batch !== false) {
      return this.queue.enqueue({
        type: 'removeAttribute',
        args: { element, attribute }
      }, options.priority);
    }

    this.startPerformanceMonitoring(operationName);

    try {
      element.removeAttribute(attribute);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  // ========== Class and Style Management ==========

  /**
   * Add CSS class
   * @param {Element} element - Target element
   * @param {string} className - Class name to add
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async addClass(element, className, options = {}) {
    const operationName = 'addClass';
    
    if (options.batch !== false) {
      return this.queue.enqueue({
        type: 'addClass',
        args: { element, className }
      }, options.priority);
    }

    this.startPerformanceMonitoring(operationName);

    try {
      element.classList.add(className);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Remove CSS class
   * @param {Element} element - Target element
   * @param {string} className - Class name to remove
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async removeClass(element, className, options = {}) {
    const operationName = 'removeClass';
    
    if (options.batch !== false) {
      return this.queue.enqueue({
        type: 'removeClass',
        args: { element, className }
      }, options.priority);
    }

    this.startPerformanceMonitoring(operationName);

    try {
      element.classList.remove(className);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Toggle CSS class
   * @param {Element} element - Target element
   * @param {string} className - Class name to toggle
   * @param {boolean} [force] - Force add (true) or remove (false)
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async toggleClass(element, className, force, options = {}) {
    const operationName = 'toggleClass';
    this.startPerformanceMonitoring(operationName);

    try {
      const result = element.classList.toggle(className, force);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(result, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Check if element has CSS class
   * @param {Element} element - Target element
   * @param {string} className - Class name to check
   * @param {DOMQueryOptions} [options={}] - Query options
   * @returns {Promise<DOMOperationResult>} Operation result with boolean
   */
  async hasClass(element, className, options = {}) {
    const operationName = 'hasClass';
    this.startPerformanceMonitoring(operationName);

    try {
      const hasClass = element.classList.contains(className);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(hasClass, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Set CSS style property
   * @param {Element} element - Target element
   * @param {string} property - CSS property name
   * @param {string} value - CSS property value
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async setStyle(element, property, value, options = {}) {
    const operationName = 'setStyle';
    
    if (options.batch !== false) {
      return this.queue.enqueue({
        type: 'setStyle',
        args: { element, property, value }
      }, options.priority);
    }

    this.startPerformanceMonitoring(operationName);

    try {
      element.style[property] = value;
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Get CSS style property
   * @param {Element} element - Target element
   * @param {string} property - CSS property name
   * @param {DOMQueryOptions} [options={}] - Query options
   * @returns {Promise<DOMOperationResult>} Operation result with style value
   */
  async getStyle(element, property, options = {}) {
    const operationName = 'getStyle';
    this.startPerformanceMonitoring(operationName);

    try {
      const computed = window.getComputedStyle(element);
      const value = computed.getPropertyValue(property);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(value, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  // ========== DOM Tree Manipulation ==========

  /**
   * Append child element
   * @param {Element} parent - Parent element
   * @param {Element} child - Child element to append
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async appendChild(parent, child, options = {}) {
    const operationName = 'appendChild';
    
    if (options.batch !== false) {
      return this.queue.enqueue({
        type: 'appendChild',
        args: { parent, child }
      }, options.priority);
    }

    this.startPerformanceMonitoring(operationName);

    try {
      parent.appendChild(child);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Insert element before reference element
   * @param {Element} parent - Parent element
   * @param {Element} newElement - Element to insert
   * @param {Element} referenceElement - Reference element
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async insertBefore(parent, newElement, referenceElement, options = {}) {
    const operationName = 'insertBefore';
    this.startPerformanceMonitoring(operationName);

    try {
      parent.insertBefore(newElement, referenceElement);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Insert element after reference element
   * @param {Element} parent - Parent element
   * @param {Element} newElement - Element to insert
   * @param {Element} referenceElement - Reference element
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async insertAfter(parent, newElement, referenceElement, options = {}) {
    const operationName = 'insertAfter';
    this.startPerformanceMonitoring(operationName);

    try {
      parent.insertBefore(newElement, referenceElement.nextSibling);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Remove element from DOM
   * @param {Element} element - Element to remove
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async removeElement(element, options = {}) {
    const operationName = 'removeElement';
    
    if (options.batch !== false) {
      return this.queue.enqueue({
        type: 'removeElement',
        args: { element }
      }, options.priority);
    }

    this.startPerformanceMonitoring(operationName);

    try {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Replace element with new element
   * @param {Element} oldElement - Element to replace
   * @param {Element} newElement - New element
   * @param {DOMUpdateOptions} [options={}] - Update options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async replaceElement(oldElement, newElement, options = {}) {
    const operationName = 'replaceElement';
    this.startPerformanceMonitoring(operationName);

    try {
      if (oldElement.parentNode) {
        oldElement.parentNode.replaceChild(newElement, oldElement);
      }
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  // ========== Event Management ==========

  /**
   * Add event listener
   * @param {Element} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object|boolean} [options={}] - Event options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async addEventListener(element, event, handler, options = {}) {
    const operationName = 'addEventListener';
    this.startPerformanceMonitoring(operationName);

    try {
      element.addEventListener(event, handler, options);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Remove event listener
   * @param {Element} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object|boolean} [options={}] - Event options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async removeEventListener(element, event, handler, options = {}) {
    const operationName = 'removeEventListener';
    this.startPerformanceMonitoring(operationName);

    try {
      element.removeEventListener(event, handler, options);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(null, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Delegate event to container
   * @param {Element} container - Container element
   * @param {string} selector - Selector for target elements
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} [options={}] - Event options
   * @returns {Promise<DOMOperationResult>} Operation result
   */
  async delegateEvent(container, selector, event, handler, options = {}) {
    const operationName = 'delegateEvent';
    this.startPerformanceMonitoring(operationName);

    try {
      const delegatedHandler = (e) => {
        const target = e.target.closest(selector);
        if (target) {
          handler.call(target, e);
        }
      };

      container.addEventListener(event, delegatedHandler, options);
      
      this.endPerformanceMonitoring(operationName);
      return this.createSuccessResult(delegatedHandler, performance.now() - this.activeOperations.get(operationName));

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  // ========== Batch Operations ==========

  /**
   * Execute multiple operations in a batch
   * @param {Array<DOMBatchOperation>} operations - Operations to batch
   * @param {Object} [options={}] - Batch options
   * @returns {Promise<Array<DOMOperationResult>>} Array of operation results
   */
  async batch(operations, options = {}) {
    const operationName = 'batch';
    this.startPerformanceMonitoring(operationName);

    try {
      const promises = operations.map(op => 
        this.queue.enqueue(op, op.priority || options.priority || 0)
      );

      const results = await Promise.allSettled(promises);
      
      this.endPerformanceMonitoring(operationName);
      return results;

    } catch (error) {
      this.endPerformanceMonitoring(operationName);
      return this.handleError(error, operationName, options);
    }
  }

  /**
   * Force flush of queued operations
   * @param {number} [priority=0] - Minimum priority to flush
   * @returns {Promise<void>}
   */
  async flush(priority = 0) {
    return this.queue.flush(priority);
  }

  // ========== Performance and Monitoring ==========

  /**
   * Start performance monitoring for an operation
   * @param {string} operationName - Name of the operation
   */
  startPerformanceMonitoring(operationName) {
    if (this.options.enablePerformanceMonitoring) {
      this.activeOperations.set(operationName, performance.now());
    }
  }

  /**
   * End performance monitoring for an operation
   * @param {string} operationName - Name of the operation
   */
  endPerformanceMonitoring(operationName) {
    if (this.options.enablePerformanceMonitoring) {
      const startTime = this.activeOperations.get(operationName);
      if (startTime) {
        const duration = performance.now() - startTime;
        this.recordPerformanceMetric(operationName, duration);
        this.activeOperations.delete(operationName);
      }
    }
  }

  /**
   * Record performance metric
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   */
  recordPerformanceMetric(operation, duration) {
    if (!this.performanceMonitor.has(operation)) {
      this.performanceMonitor.set(operation, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity
      });
    }

    const metric = this.performanceMonitor.get(operation);
    metric.count++;
    metric.totalTime += duration;
    metric.avgTime = metric.totalTime / metric.count;
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.minTime = Math.min(metric.minTime, duration);

    // Record in cache for selector performance tracking
    if (operation.startsWith('select')) {
      this.cache.recordSelectorPerformance(operation, duration);
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics report
   */
  getPerformanceMetrics() {
    const report = {};
    for (const [operation, metrics] of this.performanceMonitor) {
      report[operation] = { ...metrics };
    }
    return {
      operations: report,
      cache: this.cache.getStats(),
      queue: this.queue.getStats(),
      errors: this.errorStats
    };
  }

  // ========== Error Handling and Recovery ==========

  /**
   * Register error callback
   * @param {Function} callback - Error callback function
   */
  onError(callback) {
    this.errorCallbacks.add(callback);
  }

  /**
   * Remove error callback
   * @param {Function} callback - Error callback function
   */
  offError(callback) {
    this.errorCallbacks.delete(callback);
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - Operation to execute
   * @param {number} [maxAttempts=3] - Maximum retry attempts
   * @param {number} [delay=100] - Delay between retries
   * @returns {Promise<*>} Operation result
   */
  async retry(operation, maxAttempts = this.options.maxRetryAttempts, delay = this.options.retryDelay) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        
        console.warn(`DOM operation failed (attempt ${attempt}/${maxAttempts}):`, error);
        await this.delay(delay * attempt);
      }
    }
  }

  /**
   * Handle operation error
   * @param {Error} error - The error that occurred
   * @param {string} operationName - Name of the failed operation
   * @param {Object} options - Operation options
   * @returns {DOMOperationResult} Error result
   */
  handleError(error, operationName, options = {}) {
    // Update error statistics
    this.errorStats.total++;
    const errorType = error.constructor.name;
    this.errorStats.byType[errorType] = (this.errorStats.byType[errorType] || 0) + 1;

    // Notify error callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error, operationName, options);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });

    // Call operation-specific error handler if provided
    if (options.onError) {
      try {
        options.onError(error);
      } catch (callbackError) {
        console.error('Error in operation error callback:', callbackError);
      }
    }

    return {
      success: false,
      data: null,
      error,
      executionTime: 0
    };
  }

  /**
   * Execute operation with timeout
   * @param {Function} operation - Operation to execute
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<*>} Operation result
   */
  async executeWithTimeout(operation, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve(operation())
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Create successful operation result
   * @param {*} data - Result data
   * @param {number} executionTime - Execution time in milliseconds
   * @returns {DOMOperationResult} Success result
   */
  createSuccessResult(data, executionTime) {
    return {
      success: true,
      data,
      error: null,
      executionTime
    };
  }

  /**
   * Sanitize text content for safe DOM insertion
   * @param {string} text - Text to sanitize
   * @param {string} [defaultValue=''] - Default value if text is invalid
   * @returns {string} Sanitized text
   */
  sanitizeTextContent(text, defaultValue = '') {
    if (typeof text !== 'string') {
      return defaultValue;
    }
    
    // Remove potential script tags and other dangerous content
    return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  /**
   * Delay execution for specified time
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========== Cache Management ==========

  /**
   * Clear cache with optional selector pattern
   * @param {string|RegExp} [selector] - Selector pattern to clear
   */
  clearCache(selector = null) {
    if (selector) {
      this.cache.invalidate(selector);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Invalidate cache entries matching pattern
   * @param {string|RegExp} selector - Selector pattern to invalidate
   */
  invalidateCache(selector) {
    this.cache.invalidate(selector);
  }

  /**
   * Get cache statistics
   * @returns {CacheStats} Cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Cleanup resources and stop monitoring
   */
  destroy() {
    // Clear all caches
    this.cache.clear();
    
    // Clear queue
    this.queue.clear();
    
    // Clear performance monitoring
    this.performanceMonitor.clear();
    this.activeOperations.clear();
    
    // Clear error callbacks
    this.errorCallbacks.clear();
  }
}