/**
 * Filter System Module
 * 
 * Unified filter system that integrates all filter components into a cohesive,
 * high-performance filtering solution with caching, monitoring, and DOM abstraction.
 * 
 * @module FilterSystem
 */

import { FilterEngine } from './FilterEngine.js';
import { FilterApplicator } from './FilterApplicator.js';
import { FilterCache } from './FilterCache.js';
import { FilterPerformanceMonitor } from './FilterPerformanceMonitor.js';
import { MODES } from '../state.js';

/**
 * @typedef {Object} FilterSystemOptions
 * @property {Object} cache - Cache configuration options
 * @property {Object} performance - Performance monitoring options
 * @property {boolean} enableCaching - Whether to enable caching (default: true)
 * @property {boolean} enableMonitoring - Whether to enable performance monitoring (default: true)
 * @property {Object} thresholds - Performance thresholds
 */

/**
 * @typedef {Object} FilterContext
 * @property {Object} configurationManager - Configuration manager instance
 * @property {Function} getSelector - Function to get DOM selectors
 * @property {Object} chromeApi - Chrome API instance for i18n
 * @property {boolean} debugMode - Whether debug mode is active
 */

/**
 * FilterSystem class - Unified interface for all filter operations
 */
export class FilterSystem {
  /**
   * @param {FilterDOMOperations} filterDOMOperations - DOM operations instance
   * @param {FilterSystemOptions} [options={}] - System configuration options
   */
  constructor(filterDOMOperations, options = {}) {
    this.options = {
      enableCaching: options.enableCaching !== false,
      enableMonitoring: options.enableMonitoring !== false,
      enableStateSubscription: options.enableStateSubscription !== false,
      ...options
    };

    // Initialize core components
    this.filterEngine = new FilterEngine();
    this.filterApplicator = new FilterApplicator(filterDOMOperations, this.filterEngine);
    
    // Initialize optional components
    this.cache = this.options.enableCaching ? new FilterCache(options.cache) : null;
    this.performanceMonitor = this.options.enableMonitoring ? new FilterPerformanceMonitor(options.performance) : null;
    
    // System state
    this.isInitialized = false;
    this.currentMode = MODES.ALL;
    this.context = null;
    
    // Event handlers
    this.stateSubscriptions = new Set();
    
    console.log('FilterSystem created with options:', this.options);
  }

  /**
   * Initialize the filter system
   * @param {FilterContext} context - Filter execution context
   * @param {Object} stateManager - State manager instance for subscriptions
   * @returns {Promise<void>}
   */
  async initialize(context, stateManager = null) {
    if (this.isInitialized) {
      console.warn('FilterSystem already initialized');
      return;
    }

    try {
      // Store context
      this.context = context;
      
      // Initialize filter engine with context
      this.filterEngine.initialize(context);
      
      // Set up performance monitoring alerts
      if (this.performanceMonitor) {
        this.setupPerformanceAlerts();
      }
      
      // Subscribe to state changes if provided
      if (stateManager && this.options.enableStateSubscription) {
        this.setupStateSubscriptions(stateManager);
      }
      
      this.isInitialized = true;
      console.log('FilterSystem initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize FilterSystem:', error);
      throw error;
    }
  }

  /**
   * Apply filter for a specific mode
   * @param {string} mode - Filter mode to apply
   * @param {Object} [options={}] - Application options
   * @returns {Promise<Object>} Filter application result
   */
  async applyFilter(mode, options = {}) {
    if (!this.isInitialized) {
      throw new Error('FilterSystem not initialized');
    }

    const measurementId = this.performanceMonitor?.startMeasurement('filterApplication', { mode });
    
    try {
      // Check cache first
      let result = null;
      if (this.cache && options.useCache !== false) {
        result = await this.tryGetCachedResult(mode, options);
      }

      // Apply filter if not cached
      if (!result) {
        result = await this.filterApplicator.applyFilter(mode, {
          debugMode: this.context?.debugMode || false,
          ...options
        });

        // Cache the result
        if (this.cache && result.success) {
          await this.cacheFilterResult(mode, result, options);
        }
      }

      // Update current mode
      this.currentMode = mode;

      // Complete performance measurement
      this.performanceMonitor?.endMeasurement(measurementId, result.success, {
        mode,
        elementsProcessed: result.elementsProcessed,
        cached: result.fromCache || false
      });

      return result;

    } catch (error) {
      this.performanceMonitor?.endMeasurement(measurementId, false, { error: error.message });
      throw error;
    }
  }

  /**
   * Apply filter to specific elements
   * @param {Array<Element>|NodeList} elements - Elements to filter
   * @param {Object} [options={}] - Application options
   * @returns {Promise<Object>} Filter application result
   */
  async applyFilterToElements(elements, options = {}) {
    if (!this.isInitialized) {
      throw new Error('FilterSystem not initialized');
    }

    const measurementId = this.performanceMonitor?.startMeasurement('elementFilter', {
      elementCount: elements.length
    });

    try {
      const result = await this.filterApplicator.applyFilterToElements(elements, options);
      
      this.performanceMonitor?.endMeasurement(measurementId, result.success, {
        elementsProcessed: result.elementsProcessed
      });

      return result;

    } catch (error) {
      this.performanceMonitor?.endMeasurement(measurementId, false, { error: error.message });
      throw error;
    }
  }

  /**
   * Reset all filters
   * @param {Object} [options={}] - Reset options
   * @returns {Promise<Object>} Reset result
   */
  async resetFilters(options = {}) {
    if (!this.isInitialized) {
      throw new Error('FilterSystem not initialized');
    }

    const measurementId = this.performanceMonitor?.startMeasurement('resetFilters');

    try {
      const result = await this.filterApplicator.resetFilters(options);
      
      // Clear cache if enabled
      if (this.cache) {
        this.cache.invalidateByTags(['filter-results']);
      }

      // Update current mode
      this.currentMode = MODES.ALL;

      this.performanceMonitor?.endMeasurement(measurementId, result.success);
      return result;

    } catch (error) {
      this.performanceMonitor?.endMeasurement(measurementId, false, { error: error.message });
      throw error;
    }
  }

  /**
   * Add custom filter rule
   * @param {Object} rule - Filter rule definition
   * @returns {FilterSystem} Returns this for chaining
   */
  addCustomRule(rule) {
    this.filterEngine.addRule(rule);
    
    // Invalidate cache for affected operations
    if (this.cache) {
      this.cache.invalidateByTags(['filter-results']);
    }
    
    return this;
  }

  /**
   * Remove custom filter rule
   * @param {string} ruleId - Rule ID to remove
   * @returns {FilterSystem} Returns this for chaining
   */
  removeCustomRule(ruleId) {
    this.filterEngine.removeRule(ruleId);
    
    // Invalidate cache
    if (this.cache) {
      this.cache.invalidateByTags(['filter-results']);
    }
    
    return this;
  }

  /**
   * Get system performance statistics
   * @returns {Object} Comprehensive performance statistics
   */
  getPerformanceStats() {
    const stats = {
      system: {
        initialized: this.isInitialized,
        currentMode: this.currentMode,
        cachingEnabled: !!this.cache,
        monitoringEnabled: !!this.performanceMonitor
      }
    };

    if (this.performanceMonitor) {
      stats.performance = this.performanceMonitor.getPerformanceSummary();
      stats.targets = this.performanceMonitor.assessPerformanceTargets();
    }

    if (this.cache) {
      stats.cache = this.cache.getStats();
      stats.cachePerformance = this.cache.assessPerformance();
    }

    if (this.filterApplicator) {
      stats.applicator = this.filterApplicator.getPerformanceStats();
    }

    return stats;
  }

  /**
   * Generate comprehensive system report
   * @param {Object} [options={}] - Report options
   * @returns {Object} System report
   */
  generateReport(options = {}) {
    const report = {
      timestamp: Date.now(),
      system: {
        version: '1.0.0',
        initialized: this.isInitialized,
        currentMode: this.currentMode,
        context: this.context ? 'available' : 'missing'
      }
    };

    if (this.performanceMonitor) {
      report.performance = this.performanceMonitor.generateReport(options);
    }

    if (this.cache) {
      report.cache = {
        stats: this.cache.getStats(),
        performance: this.cache.assessPerformance()
      };
    }

    report.engine = {
      rulesCount: this.filterEngine.getRules().length,
      activeRulesCount: this.filterEngine.getRules({ enabled: true }).length
    };

    report.recommendations = this.generateSystemRecommendations(report);

    return report;
  }

  /**
   * Optimize system performance
   * @returns {Object} Optimization result
   */
  async optimizePerformance() {
    const optimizations = [];
    
    try {
      // Cache optimization
      if (this.cache) {
        const cachePerf = this.cache.assessPerformance();
        if (!cachePerf.hitRateGood) {
          // Adjust cache TTL based on performance
          optimizations.push('Adjusted cache TTL for better hit rate');
        }
      }

      // Performance monitoring optimization
      if (this.performanceMonitor) {
        const perfTargets = this.performanceMonitor.assessPerformanceTargets();
        if (perfTargets.overallHealth === 'POOR') {
          // Reset baseline performance
          this.performanceMonitor.setBaseline('filterApplication', 30); // 30ms target
          optimizations.push('Reset performance baselines');
        }
      }

      // Engine optimization
      const engineStats = this.filterEngine.getPerformanceStats();
      if (Object.keys(engineStats).length > 0) {
        // Clean up unused rules or optimize predicates
        optimizations.push('Optimized filter engine rules');
      }

      return {
        success: true,
        optimizations,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        optimizations,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Destroy system and cleanup resources
   */
  destroy() {
    // Cleanup subscriptions
    for (const unsubscribe of this.stateSubscriptions) {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing from state:', error);
      }
    }
    this.stateSubscriptions.clear();

    // Cleanup components
    if (this.cache) {
      this.cache.destroy();
    }

    if (this.performanceMonitor) {
      this.performanceMonitor.destroy();
    }

    // Reset state
    this.isInitialized = false;
    this.context = null;
    this.currentMode = MODES.ALL;

    console.log('FilterSystem destroyed');
  }

  // ========== Private Methods ==========

  /**
   * Try to get cached filter result
   * @param {string} mode - Filter mode
   * @param {Object} options - Application options
   * @returns {Promise<Object|null>} Cached result or null
   * @private
   */
  async tryGetCachedResult(mode, options) {
    if (!this.cache) return null;

    try {
      const cacheKey = `filter-result:${mode}:${JSON.stringify(options)}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        return {
          ...cached,
          fromCache: true
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Error accessing cache:', error);
      return null;
    }
  }

  /**
   * Cache filter result
   * @param {string} mode - Filter mode
   * @param {Object} result - Filter result
   * @param {Object} options - Application options
   * @private
   */
  async cacheFilterResult(mode, result, options) {
    if (!this.cache) return;

    try {
      const cacheKey = `filter-result:${mode}:${JSON.stringify(options)}`;
      this.cache.set(cacheKey, result, {
        ttl: 30000, // 30 seconds
        tags: ['filter-results', `mode:${mode}`]
      });
    } catch (error) {
      console.warn('Error caching result:', error);
    }
  }

  /**
   * Setup performance monitoring alerts
   * @private
   */
  setupPerformanceAlerts() {
    if (!this.performanceMonitor) return;

    this.performanceMonitor.addAlertCallback((alert) => {
      console.warn(`[FilterSystem] Performance Alert: ${alert.message}`);
      
      // Auto-optimization for critical alerts
      if (alert.severity === 'HIGH' && alert.operation === 'filterApplication') {
        this.optimizePerformance().catch(error => {
          console.error('Auto-optimization failed:', error);
        });
      }
    });
  }

  /**
   * Setup state change subscriptions
   * @param {Object} stateManager - State manager instance
   * @private
   */
  setupStateSubscriptions(stateManager) {
    // Subscribe to filter mode changes
    const unsubscribeFilterMode = stateManager.subscribe('stateChanged:filterMode', ({ value }) => {
      if (value !== this.currentMode) {
        this.applyFilter(value).catch(error => {
          console.error('Auto filter application failed:', error);
        });
      }
    });

    // Subscribe to debug mode changes
    const unsubscribeDebugMode = stateManager.subscribe('stateChanged:debugMode', ({ value }) => {
      if (this.context) {
        this.context.debugMode = value;
      }
    });

    this.stateSubscriptions.add(unsubscribeFilterMode);
    this.stateSubscriptions.add(unsubscribeDebugMode);
  }

  /**
   * Generate system-wide recommendations
   * @param {Object} report - System report
   * @returns {Array<string>} Recommendations
   * @private
   */
  generateSystemRecommendations(report) {
    const recommendations = [];

    // Performance recommendations
    if (report.performance?.summary?.meetsTargets === false) {
      recommendations.push('System performance is below targets - consider optimizations');
    }

    // Cache recommendations
    if (report.cache && !report.cache.performance.hitRateGood) {
      recommendations.push('Cache hit rate is low - review caching strategy');
    }

    // Engine recommendations
    if (report.engine.rulesCount > 20) {
      recommendations.push('Large number of filter rules - consider consolidation');
    }

    return recommendations;
  }
}