/**
 * Filter Applicator Module
 * 
 * Handles the application of filter rules to DOM elements.
 * Completely separates filter application from filter logic using the DOM abstraction layer.
 * 
 * @module FilterApplicator
 */

import { FilterEngine } from './FilterEngine.js';

/**
 * @typedef {Object} FilterApplicationResult
 * @property {boolean} success - Whether the application succeeded
 * @property {number} elementsProcessed - Number of elements processed
 * @property {number} elementsHidden - Number of elements hidden
 * @property {number} elementsShown - Number of elements shown
 * @property {number} executionTime - Execution time in milliseconds
 * @property {Array<string>} errors - Any errors that occurred
 * @property {Object} performanceMetrics - Performance metrics
 */

/**
 * FilterApplicator class for applying filter rules to DOM elements
 */
export class FilterApplicator {
  /**
   * @param {FilterDOMOperations} filterDOMOperations - DOM operations instance
   * @param {FilterEngine} filterEngine - Filter engine instance
   */
  constructor(filterDOMOperations, filterEngine = null) {
    this.filterDOMOperations = filterDOMOperations;
    this.filterEngine = filterEngine || new FilterEngine();
    
    // Application state
    this.isApplying = false;
    this.lastApplicationTime = 0;
    this.applicationHistory = [];
    
    // Performance tracking
    this.performanceMetrics = new Map();
    
    // Error tracking
    this.errorCount = 0;
    this.lastErrors = [];
    
    // Bind methods
    this.applyFilter = this.applyFilter.bind(this);
    this.applyFilterToElements = this.applyFilterToElements.bind(this);
  }

  /**
   * Apply current filter mode to all email rows
   * @param {string} mode - Filter mode to apply
   * @param {Object} [options={}] - Application options
   * @returns {Promise<FilterApplicationResult>} Application result
   */
  async applyFilter(mode, options = {}) {
    const startTime = performance.now();
    
    // Prevent concurrent applications
    if (this.isApplying) {
      console.warn('Filter application already in progress, skipping');
      return this.createErrorResult('Application already in progress', startTime);
    }

    this.isApplying = true;
    
    try {
      const {
        selector = null,
        batchSize = 20,
        debugMode = false,
        animate = false,
        priority = 'HIGH'
      } = options;

      // Get elements to filter
      const elements = await this.getFilterableElements(selector);
      if (!elements.success) {
        throw new Error('Failed to get filterable elements');
      }

      // Get filter function from engine
      const filterFn = this.filterEngine.getFilterFunction(mode);
      if (!filterFn) {
        throw new Error(`No filter function available for mode: ${mode}`);
      }

      // Apply filter using DOM operations
      const result = await this.filterDOMOperations.applyVisibilityFilter(
        elements.data,
        filterFn,
        {
          debugMode,
          batchSize,
          priority,
          animate
        }
      );

      // Record application in history
      const applicationResult = {
        success: true,
        mode,
        elementsProcessed: result.elementsProcessed,
        elementsHidden: result.stats.hidden,
        elementsShown: result.stats.visible,
        executionTime: result.executionTime,
        errors: [],
        performanceMetrics: this.getPerformanceSnapshot()
      };

      this.recordApplication(applicationResult);
      this.lastApplicationTime = result.executionTime;

      console.log(`Filter applied successfully: ${mode} (${result.elementsProcessed} elements in ${result.executionTime}ms)`);
      
      return applicationResult;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      const errorResult = this.createErrorResult(error.message, startTime, executionTime);
      
      this.recordApplication(errorResult);
      console.error('Filter application failed:', error);
      
      return errorResult;
    } finally {
      this.isApplying = false;
    }
  }

  /**
   * Apply filter rules to specific elements
   * @param {Array<Element>|NodeList} elements - Elements to filter
   * @param {Object} [options={}] - Application options
   * @returns {Promise<FilterApplicationResult>} Application result
   */
  async applyFilterToElements(elements, options = {}) {
    const operationName = 'applyFilterToElements';
    const startTime = performance.now();

    try {
      const {
        priority = 'NORMAL'
      } = options;

      const elementArray = Array.from(elements);
      const results = [];
      let totalHidden = 0;
      let totalShown = 0;
      let totalErrors = 0;

      // Process elements through filter engine
      for (const element of elementArray) {
        try {
          const filterResult = this.filterEngine.applyFilters(element);
          
          if (filterResult.actions.length > 0) {
            // Convert engine actions to DOM operations
            const domOperations = this.convertActionsToDOMOperations(filterResult.actions);
            
            // Execute DOM operations
            await this.filterDOMOperations.domManager.batch(domOperations, { priority });
            
            // Track statistics
            const hideActions = filterResult.actions.filter(action => action.strategy === 'hide');
            const showActions = filterResult.actions.filter(action => action.strategy === 'show');
            
            if (hideActions.length > 0) totalHidden++;
            if (showActions.length > 0) totalShown++;
          }
          
          results.push(filterResult);
          
        } catch (error) {
          console.warn('Error applying filter to element:', error);
          totalErrors++;
        }
      }

      const executionTime = performance.now() - startTime;
      this.recordPerformance(operationName, executionTime);

      return {
        success: true,
        elementsProcessed: elementArray.length,
        elementsHidden: totalHidden,
        elementsShown: totalShown,
        executionTime,
        errors: totalErrors > 0 ? [`${totalErrors} element processing errors`] : [],
        performanceMetrics: this.getPerformanceSnapshot(),
        detailedResults: results
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordPerformance(operationName, executionTime, false);
      
      return this.createErrorResult(error.message, startTime, executionTime);
    }
  }

  /**
   * Reset all filters (show all elements)
   * @param {Object} [options={}] - Reset options
   * @returns {Promise<FilterApplicationResult>} Reset result
   */
  async resetFilters(options = {}) {
    const startTime = performance.now();

    try {
      const result = await this.filterDOMOperations.resetFilter(null, options);
      
      const resetResult = {
        success: true,
        elementsProcessed: result.elementsReset,
        elementsHidden: 0,
        elementsShown: result.elementsReset,
        executionTime: result.executionTime,
        errors: [],
        performanceMetrics: this.getPerformanceSnapshot()
      };

      this.recordApplication(resetResult);
      console.log(`Filters reset: ${result.elementsReset} elements shown`);
      
      return resetResult;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.createErrorResult(error.message, startTime, executionTime);
    }
  }

  /**
   * Toggle visibility of specific elements
   * @param {Array<Element>|NodeList} elements - Elements to toggle
   * @param {boolean} visible - Whether elements should be visible
   * @param {Object} [options={}] - Toggle options
   * @returns {Promise<FilterApplicationResult>} Toggle result
   */
  async toggleElementsVisibility(elements, visible, options = {}) {
    const startTime = performance.now();

    try {
      const result = await this.filterDOMOperations.batchToggleVisibility(
        elements,
        visible,
        options
      );

      const toggleResult = {
        success: true,
        elementsProcessed: result.elementsProcessed,
        elementsHidden: visible ? 0 : result.elementsProcessed,
        elementsShown: visible ? result.elementsProcessed : 0,
        executionTime: result.executionTime,
        errors: [],
        performanceMetrics: this.getPerformanceSnapshot()
      };

      this.recordApplication(toggleResult);
      
      return toggleResult;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.createErrorResult(error.message, startTime, executionTime);
    }
  }

  /**
   * Highlight elements that match current filter
   * @param {string} highlightClass - CSS class for highlighting
   * @param {Object} [options={}] - Highlight options
   * @returns {Promise<FilterApplicationResult>} Highlight result
   */
  async highlightFilteredElements(highlightClass, options = {}) {
    const startTime = performance.now();

    try {
      const filteredElements = this.filterDOMOperations.getFilteredElements();
      
      if (filteredElements.size === 0) {
        return {
          success: true,
          elementsProcessed: 0,
          elementsHidden: 0,
          elementsShown: 0,
          executionTime: performance.now() - startTime,
          errors: [],
          performanceMetrics: this.getPerformanceSnapshot()
        };
      }

      const result = await this.filterDOMOperations.highlightFilteredElements(
        Array.from(filteredElements),
        highlightClass,
        options
      );

      const highlightResult = {
        success: true,
        elementsProcessed: result.elementsHighlighted,
        elementsHidden: 0,
        elementsShown: 0,
        executionTime: result.executionTime,
        errors: [],
        performanceMetrics: this.getPerformanceSnapshot(),
        highlighted: result.elementsHighlighted,
        temporary: result.temporary
      };

      this.recordApplication(highlightResult);
      
      return highlightResult;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      return this.createErrorResult(error.message, startTime, executionTime);
    }
  }

  /**
   * Update filter status display
   * @param {Element} statusElement - Status display element
   * @param {string} mode - Current filter mode
   * @param {FilterApplicationResult} [result] - Recent application result
   * @returns {Promise<Object>} Update result
   */
  async updateFilterStatus(statusElement, mode, result = null) {
    if (!statusElement) {
      return { success: false, error: 'No status element provided' };
    }

    try {
      let message = `Filter: ${mode}`;
      
      if (result) {
        const { elementsProcessed, elementsHidden, executionTime } = result;
        message += ` (${elementsHidden}/${elementsProcessed} hidden in ${Math.round(executionTime)}ms)`;
      }

      const updateResult = await this.filterDOMOperations.updateFilterStatus(
        statusElement,
        message,
        { sanitize: true }
      );

      return updateResult;

    } catch (error) {
      console.error('Error updating filter status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get application history
   * @param {number} [limit=10] - Maximum number of entries to return
   * @returns {Array<FilterApplicationResult>} Recent applications
   */
  getApplicationHistory(limit = 10) {
    return this.applicationHistory.slice(-limit);
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance metrics and statistics
   */
  getPerformanceStats() {
    const engineStats = this.filterEngine.getPerformanceStats();
    const domStats = this.filterDOMOperations.getPerformanceStats();
    
    return {
      applicator: this.getPerformanceSnapshot(),
      engine: engineStats,
      dom: domStats,
      lastApplicationTime: this.lastApplicationTime,
      errorCount: this.errorCount,
      recentErrors: this.lastErrors.slice(-5)
    };
  }

  /**
   * Clear application history and reset metrics
   */
  clearHistory() {
    this.applicationHistory = [];
    this.performanceMetrics.clear();
    this.errorCount = 0;
    this.lastErrors = [];
    console.log('Filter application history cleared');
  }

  // ========== Private Methods ==========

  /**
   * Get filterable elements from DOM
   * @param {string|null} selector - Custom selector or null for default
   * @returns {Promise<Object>} Selection result
   * @private
   */
  async getFilterableElements(selector = null) {
    try {
      const targetSelector = selector || '[data-email-row], .email-row, tr[data-thread-id]';
      return await this.filterDOMOperations.domManager.selectAll(targetSelector);
    } catch (error) {
      console.error('Error getting filterable elements:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert filter engine actions to DOM operations
   * @param {Array} actions - Actions from filter engine
   * @returns {Array} DOM operation objects
   * @private
   */
  convertActionsToDOMOperations(actions) {
    return actions.map(({ action }) => action).filter(Boolean);
  }

  /**
   * Create an error result object
   * @param {string} message - Error message
   * @param {number} startTime - Operation start time
   * @param {number} [executionTime] - Execution time if available
   * @returns {FilterApplicationResult} Error result
   * @private
   */
  createErrorResult(message, startTime, executionTime = null) {
    const finalTime = executionTime || (performance.now() - startTime);
    
    this.errorCount++;
    this.lastErrors.push({
      message,
      timestamp: Date.now(),
      executionTime: finalTime
    });

    // Keep only last 10 errors
    if (this.lastErrors.length > 10) {
      this.lastErrors.shift();
    }

    return {
      success: false,
      elementsProcessed: 0,
      elementsHidden: 0,
      elementsShown: 0,
      executionTime: finalTime,
      errors: [message],
      performanceMetrics: this.getPerformanceSnapshot()
    };
  }

  /**
   * Record a filter application in history
   * @param {FilterApplicationResult} result - Application result
   * @private
   */
  recordApplication(result) {
    this.applicationHistory.push({
      ...result,
      timestamp: Date.now()
    });

    // Keep only last 50 applications
    if (this.applicationHistory.length > 50) {
      this.applicationHistory.shift();
    }

    this.recordPerformance('application', result.executionTime, result.success);
  }

  /**
   * Record performance metrics
   * @param {string} operation - Operation name
   * @param {number} time - Execution time
   * @param {boolean} [success=true] - Whether operation succeeded
   * @private
   */
  recordPerformance(operation, time, success = true) {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, {
        count: 0,
        successCount: 0,
        totalTime: 0,
        times: []
      });
    }

    const metrics = this.performanceMetrics.get(operation);
    metrics.count++;
    if (success) metrics.successCount++;
    metrics.totalTime += time;
    metrics.times.push(time);

    // Keep only last 50 measurements
    if (metrics.times.length > 50) {
      metrics.times.shift();
    }
  }

  /**
   * Get current performance snapshot
   * @returns {Object} Performance metrics snapshot
   * @private
   */
  getPerformanceSnapshot() {
    const snapshot = {};
    
    for (const [operation, metrics] of this.performanceMetrics) {
      snapshot[operation] = {
        count: metrics.count,
        successRate: metrics.count > 0 ? metrics.successCount / metrics.count : 0,
        averageTime: metrics.count > 0 ? metrics.totalTime / metrics.count : 0,
        recentAverage: metrics.times.length > 0 
          ? metrics.times.slice(-10).reduce((sum, time) => sum + time, 0) / Math.min(10, metrics.times.length)
          : 0
      };
    }

    return snapshot;
  }
}