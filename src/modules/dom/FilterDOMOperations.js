/**
 * Filter DOM Operations Module
 * 
 * Specialized DOM operations for email filtering functionality with
 * batched visibility operations, performance monitoring, and filter status updates.
 */

import { DOM_CONSTANTS } from './interfaces.js';

export class FilterDOMOperations {
  /**
   * @param {DOMManager} domManager - DOM manager instance
   */
  constructor(domManager) {
    this.domManager = domManager;
    this.performanceMetrics = new Map();
    
    // Filter operation tracking
    this.lastFilterTime = 0;
    this.filteredElements = new Set();
    
    // Bind methods to preserve context
    this.applyVisibilityFilter = this.applyVisibilityFilter.bind(this);
    this.batchToggleVisibility = this.batchToggleVisibility.bind(this);
  }

  /**
   * Apply visibility filter to elements based on filter function
   * @param {Array<Element>|NodeList} elements - Elements to filter
   * @param {Function} filterFn - Filter function that returns true to hide element
   * @param {Object} [options={}] - Filter options
   * @returns {Promise<Object>} Filter result with statistics
   */
  async applyVisibilityFilter(elements, filterFn, options = {}) {
    const operationName = 'applyVisibilityFilter';
    const startTime = performance.now();
    
    try {
      const {
        debugMode = false,
        batchSize = 20,
        priority = DOM_CONSTANTS.PRIORITY_LEVELS.HIGH,
        animate = false
      } = options;

      // Convert NodeList to Array if needed
      const elementArray = Array.from(elements);
      
      // Track filter statistics
      const stats = {
        total: elementArray.length,
        hidden: 0,
        visible: 0,
        errors: 0
      };

      // Clear previous filtered elements tracking
      this.filteredElements.clear();

      // Process elements in batches for performance
      const batches = this.createBatches(elementArray, batchSize);
      const operations = [];

      for (const batch of batches) {
        const batchOperations = batch.map(element => {
          try {
            const shouldHide = filterFn(element);
            
            if (shouldHide) {
              stats.hidden++;
              this.filteredElements.add(element);
            } else {
              stats.visible++;
            }

            return this.createVisibilityOperation(element, shouldHide, debugMode, animate);
          } catch (error) {
            console.error('Error in filter function:', error);
            stats.errors++;
            return this.createVisibilityOperation(element, false, debugMode, animate);
          }
        });

        operations.push(...batchOperations);
      }

      // Execute all operations in batch
      await this.domManager.batch(operations, { 
        priority,
        validate: false // Skip validation for performance
      });

      // Record performance metrics
      const executionTime = performance.now() - startTime;
      this.recordFilterPerformance(operationName, executionTime, stats);
      this.lastFilterTime = executionTime;

      return {
        success: true,
        stats,
        executionTime,
        elementsProcessed: elementArray.length
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordFilterPerformance(operationName, executionTime, null, false);
      
      throw new Error(`Filter application failed: ${error.message}`);
    }
  }

  /**
   * Batch toggle visibility of multiple elements
   * @param {Array<Element>|NodeList} elements - Elements to toggle
   * @param {boolean} visible - Whether elements should be visible
   * @param {Object} [options={}] - Toggle options
   * @returns {Promise<Object>} Toggle result
   */
  async batchToggleVisibility(elements, visible, options = {}) {
    const operationName = 'batchToggleVisibility';
    const startTime = performance.now();

    try {
      const {
        priority = DOM_CONSTANTS.PRIORITY_LEVELS.NORMAL,
        animate = false,
        debugMode = false
      } = options;

      const elementArray = Array.from(elements);
      const operations = elementArray.map(element => 
        this.createVisibilityOperation(element, !visible, debugMode, animate)
      );

      await this.domManager.batch(operations, { priority });

      const executionTime = performance.now() - startTime;
      this.recordFilterPerformance(operationName, executionTime, {
        total: elementArray.length,
        visible: visible ? elementArray.length : 0,
        hidden: visible ? 0 : elementArray.length
      });

      return {
        success: true,
        elementsProcessed: elementArray.length,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordFilterPerformance(operationName, executionTime, null, false);
      throw error;
    }
  }

  /**
   * Update filter status in UI
   * @param {Element} statusElement - Status display element
   * @param {string} message - Status message
   * @param {Object} [options={}] - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateFilterStatus(statusElement, message, options = {}) {
    const operationName = 'updateFilterStatus';
    const startTime = performance.now();

    try {
      const {
        sanitize = true,
        priority = DOM_CONSTANTS.PRIORITY_LEVELS.LOW
      } = options;

      if (!statusElement) {
        throw new Error('Status element not provided');
      }

      // Sanitize message if requested
      const safeMessage = sanitize ? this.sanitizeStatusMessage(message) : message;

      // Update text content
      await this.domManager.setText(statusElement, safeMessage, {
        batch: false, // Immediate update for status
        priority
      });

      const executionTime = performance.now() - startTime;
      this.recordFilterPerformance(operationName, executionTime);

      return {
        success: true,
        message: safeMessage,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordFilterPerformance(operationName, executionTime, null, false);
      throw error;
    }
  }

  /**
   * Highlight filtered elements with visual indicators
   * @param {Array<Element>|NodeList} elements - Elements to highlight
   * @param {string} highlightClass - CSS class for highlighting
   * @param {Object} [options={}] - Highlight options
   * @returns {Promise<Object>} Highlight result
   */
  async highlightFilteredElements(elements, highlightClass, options = {}) {
    const operationName = 'highlightFilteredElements';
    const startTime = performance.now();

    try {
      const {
        priority = DOM_CONSTANTS.PRIORITY_LEVELS.LOW,
        duration = 0 // 0 = permanent, >0 = temporary in ms
      } = options;

      const elementArray = Array.from(elements);
      const operations = elementArray.map(element => ({
        type: 'addClass',
        args: { element, className: highlightClass },
        priority
      }));

      await this.domManager.batch(operations, { priority });

      // Set up temporary highlight removal if duration is specified
      if (duration > 0) {
        setTimeout(async () => {
          const removeOperations = elementArray.map(element => ({
            type: 'removeClass',
            args: { element, className: highlightClass },
            priority: DOM_CONSTANTS.PRIORITY_LEVELS.LOW
          }));
          
          await this.domManager.batch(removeOperations);
        }, duration);
      }

      const executionTime = performance.now() - startTime;
      this.recordFilterPerformance(operationName, executionTime);

      return {
        success: true,
        elementsHighlighted: elementArray.length,
        executionTime,
        temporary: duration > 0
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordFilterPerformance(operationName, executionTime, null, false);
      throw error;
    }
  }

  /**
   * Get currently filtered (hidden) elements
   * @returns {Set<Element>} Set of hidden elements
   */
  getFilteredElements() {
    return new Set(this.filteredElements);
  }

  /**
   * Clear all filter highlights
   * @param {string} highlightClass - CSS class to remove
   * @param {Object} [options={}] - Clear options
   * @returns {Promise<Object>} Clear result
   */
  async clearFilterHighlights(highlightClass, options = {}) {
    const operationName = 'clearFilterHighlights';
    const startTime = performance.now();

    try {
      const {
        priority = DOM_CONSTANTS.PRIORITY_LEVELS.LOW
      } = options;

      // Find all elements with the highlight class
      const highlightedElements = await this.domManager.selectAll(`.${highlightClass}`);
      
      if (!highlightedElements.success || !highlightedElements.data.length) {
        return {
          success: true,
          elementsCleared: 0,
          executionTime: performance.now() - startTime
        };
      }

      const operations = Array.from(highlightedElements.data).map(element => ({
        type: 'removeClass',
        args: { element, className: highlightClass },
        priority
      }));

      await this.domManager.batch(operations, { priority });

      const executionTime = performance.now() - startTime;
      this.recordFilterPerformance(operationName, executionTime);

      return {
        success: true,
        elementsCleared: highlightedElements.data.length,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordFilterPerformance(operationName, executionTime, null, false);
      throw error;
    }
  }

  /**
   * Reset all filter effects
   * @param {Array<Element>|NodeList} [elements] - Elements to reset (optional)
   * @param {Object} [options={}] - Reset options
   * @returns {Promise<Object>} Reset result
   */
  async resetFilter(elements = null, options = {}) {
    const operationName = 'resetFilter';
    const startTime = performance.now();

    try {
      const {
        priority = DOM_CONSTANTS.PRIORITY_LEVELS.NORMAL
      } = options;

      let targetElements;
      
      if (elements) {
        targetElements = Array.from(elements);
      } else {
        // Reset all previously filtered elements
        targetElements = Array.from(this.filteredElements);
      }

      // Create operations to show all elements
      const operations = targetElements.map(element => ({
        type: 'setStyle',
        args: { 
          element, 
          property: 'display', 
          value: '' 
        },
        priority
      }));

      // Also reset debug styles
      operations.push(...targetElements.map(element => ({
        type: 'setStyle',
        args: { 
          element, 
          property: 'background', 
          value: '' 
        },
        priority
      })));

      operations.push(...targetElements.map(element => ({
        type: 'setStyle',
        args: { 
          element, 
          property: 'opacity', 
          value: '' 
        },
        priority
      })));

      await this.domManager.batch(operations, { priority });

      // Clear filtered elements tracking
      this.filteredElements.clear();

      const executionTime = performance.now() - startTime;
      this.recordFilterPerformance(operationName, executionTime);

      return {
        success: true,
        elementsReset: targetElements.length,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordFilterPerformance(operationName, executionTime, null, false);
      throw error;
    }
  }

  // ========== Helper Methods ==========

  /**
   * Create visibility operation for an element
   * @param {Element} element - Target element
   * @param {boolean} hide - Whether to hide the element
   * @param {boolean} debugMode - Whether debug mode is active
   * @param {boolean} animate - Whether to animate the change
   * @returns {Object} DOM operation object
   */
  createVisibilityOperation(element, hide, debugMode = false, animate = false) {
    if (debugMode) {
      // In debug mode, use visual indicators instead of hiding
      return {
        type: 'setStyle',
        args: {
          element,
          property: 'background',
          value: hide ? 'rgba(0,123,255,.15)' : ''
        }
      };
    } else {
      // Normal mode - hide/show elements
      const operation = {
        type: 'setStyle',
        args: {
          element,
          property: 'display',
          value: hide ? 'none' : ''
        }
      };

      if (animate) {
        // Add animation class for smooth transitions
        return [
          operation,
          {
            type: hide ? 'addClass' : 'removeClass',
            args: {
              element,
              className: 'filter-transition'
            }
          }
        ];
      }

      return operation;
    }
  }

  /**
   * Create batches of elements for processing
   * @param {Array<Element>} elements - Elements to batch
   * @param {number} batchSize - Size of each batch
   * @returns {Array<Array<Element>>} Array of batches
   */
  createBatches(elements, batchSize) {
    const batches = [];
    for (let i = 0; i < elements.length; i += batchSize) {
      batches.push(elements.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Sanitize status message for safe display
   * @param {string} message - Message to sanitize
   * @returns {string} Sanitized message
   */
  sanitizeStatusMessage(message) {
    if (typeof message !== 'string') {
      return 'Invalid status message';
    }
    
    // Remove HTML tags and limit length
    return message
      .replace(/<[^>]*>/g, '')
      .trim()
      .substring(0, 200);
  }

  /**
   * Record filter operation performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} [stats] - Operation statistics
   * @param {boolean} [success=true] - Whether operation succeeded
   */
  recordFilterPerformance(operation, duration, stats = null, success = true) {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, {
        count: 0,
        successCount: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity,
        lastStats: null
      });
    }

    const metrics = this.performanceMetrics.get(operation);
    metrics.count++;
    if (success) metrics.successCount++;
    metrics.totalTime += duration;
    metrics.avgTime = metrics.totalTime / metrics.count;
    metrics.maxTime = Math.max(metrics.maxTime, duration);
    metrics.minTime = Math.min(metrics.minTime, duration);
    metrics.lastStats = stats;
  }

  /**
   * Get filter performance statistics
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
      lastFilterTime: this.lastFilterTime,
      currentlyFiltered: this.filteredElements.size,
      overallPerformance: this.getOverallPerformance()
    };
  }

  /**
   * Get overall filter performance summary
   * @returns {Object} Overall performance metrics
   */
  getOverallPerformance() {
    let totalOperations = 0;
    let totalTime = 0;
    let successfulOperations = 0;

    for (const metrics of this.performanceMetrics.values()) {
      totalOperations += metrics.count;
      totalTime += metrics.totalTime;
      successfulOperations += metrics.successCount;
    }

    return {
      totalOperations,
      totalTime,
      successfulOperations,
      successRate: totalOperations > 0 ? successfulOperations / totalOperations : 0,
      averageTime: totalOperations > 0 ? totalTime / totalOperations : 0,
      meetsPerformanceTarget: totalTime < 50 // <50ms target
    };
  }

  /**
   * Cleanup resources and reset state
   */
  destroy() {
    this.filteredElements.clear();
    this.performanceMetrics.clear();
    this.lastFilterTime = 0;
  }
}