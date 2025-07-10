/**
 * Filter Cache Module
 * 
 * Intelligent caching system for filter operations and DOM operations.
 * Ensures <50ms filter application performance target through strategic caching.
 * 
 * @module FilterCache
 */

/**
 * @typedef {Object} CacheEntry
 * @property {*} data - Cached data
 * @property {number} timestamp - Cache creation timestamp
 * @property {number} accessCount - Number of times accessed
 * @property {number} lastAccess - Last access timestamp
 * @property {number} ttl - Time to live in milliseconds
 * @property {string} hash - Content hash for invalidation
 */

/**
 * @typedef {Object} CacheStats
 * @property {number} hitCount - Number of cache hits
 * @property {number} missCount - Number of cache misses
 * @property {number} hitRate - Cache hit rate (0-1)
 * @property {number} size - Current cache size
 * @property {number} maxSize - Maximum cache size
 * @property {Object} performance - Performance metrics
 */

/**
 * FilterCache class for intelligent caching of filter operations
 */
export class FilterCache {
  /**
   * @param {Object} [options={}] - Cache configuration options
   */
  constructor(options = {}) {
    this.options = {
      maxSize: options.maxSize || 1000,
      defaultTTL: options.defaultTTL || 300000, // 5 minutes
      cleanupInterval: options.cleanupInterval || 60000, // 1 minute
      maxMemoryUsage: options.maxMemoryUsage || 50 * 1024 * 1024, // 50MB
      enablePerformanceTracking: options.enablePerformanceTracking !== false,
      ...options
    };

    // Cache storage
    /** @type {Map<string, CacheEntry>} */
    this.cache = new Map();
    
    // Cache statistics
    this.stats = {
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      cleanupCount: 0
    };

    // Performance tracking
    this.performanceMetrics = new Map();
    
    // Cache invalidation tracking
    this.invalidationRules = new Map();
    this.dependencyGraph = new Map();
    
    // Memory usage estimation
    this.estimatedMemoryUsage = 0;
    
    // Cleanup timer
    this.cleanupTimer = null;
    
    // Start automatic cleanup
    this.startCleanup();
    
    console.log('FilterCache initialized with options:', this.options);
  }

  /**
   * Get cached value by key
   * @param {string} key - Cache key
   * @param {Object} [options={}] - Get options
   * @returns {*|null} Cached value or null if not found/expired
   */
  get(key, _options = {}) {
    const startTime = this.options.enablePerformanceTracking ? performance.now() : 0;
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.missCount++;
        this.recordPerformance('get', startTime, false);
        return null;
      }

      // Check TTL
      const now = Date.now();
      if (entry.ttl > 0 && (now - entry.timestamp) > entry.ttl) {
        this.cache.delete(key);
        this.stats.missCount++;
        this.recordPerformance('get', startTime, false);
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccess = now;

      this.stats.hitCount++;
      this.recordPerformance('get', startTime, true);
      
      return entry.data;

    } catch (error) {
      console.error('Error getting cached value:', error);
      this.stats.missCount++;
      this.recordPerformance('get', startTime, false);
      return null;
    }
  }

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {Object} [options={}] - Set options
   * @returns {boolean} True if successfully cached
   */
  set(key, data, options = {}) {
    const startTime = this.options.enablePerformanceTracking ? performance.now() : 0;
    
    try {
      const {
        ttl = this.options.defaultTTL,
        tags = [],
        dependencies = [],
        priority = 1
      } = options;

      // Check memory usage before adding
      const dataSize = this.estimateSize(data);
      if (this.estimatedMemoryUsage + dataSize > this.options.maxMemoryUsage) {
        this.evictLeastRecentlyUsed();
      }

      // Create cache entry
      const entry = {
        data,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccess: Date.now(),
        ttl,
        hash: this.generateHash(data),
        tags: new Set(tags),
        dependencies: new Set(dependencies),
        priority,
        size: dataSize
      };

      // Handle cache size limit
      if (this.cache.size >= this.options.maxSize) {
        this.evictLeastRecentlyUsed();
      }

      // Store entry
      this.cache.set(key, entry);
      this.estimatedMemoryUsage += dataSize;

      // Update dependency graph
      this.updateDependencyGraph(key, dependencies);

      // Set up invalidation rules
      if (tags.length > 0) {
        this.updateInvalidationRules(key, tags);
      }

      this.recordPerformance('set', startTime, true);
      return true;

    } catch (error) {
      console.error('Error setting cached value:', error);
      this.recordPerformance('set', startTime, false);
      return false;
    }
  }

  /**
   * Cache a filter result for specific elements and mode
   * @param {Array<Element>} elements - Elements that were filtered
   * @param {string} mode - Filter mode
   * @param {Array<boolean>} results - Filter results (true = hidden)
   * @param {Object} [options={}] - Cache options
   * @returns {string} Cache key for the result
   */
  cacheFilterResults(elements, mode, results, options = {}) {
    const elementIds = elements.map(el => this.getElementId(el));
    const key = this.generateFilterKey(elementIds, mode);
    
    const cacheData = {
      mode,
      elementIds,
      results,
      timestamp: Date.now()
    };

    this.set(key, cacheData, {
      ttl: 30000, // 30 seconds for filter results
      tags: ['filter-results', `mode:${mode}`],
      dependencies: [`elements:${elementIds.join(',')}`],
      ...options
    });

    return key;
  }

  /**
   * Get cached filter results
   * @param {Array<Element>} elements - Elements to check
   * @param {string} mode - Filter mode
   * @returns {Array<boolean>|null} Cached results or null
   */
  getCachedFilterResults(elements, mode) {
    const elementIds = elements.map(el => this.getElementId(el));
    const key = this.generateFilterKey(elementIds, mode);
    
    const cached = this.get(key);
    if (!cached) return null;

    // Verify element IDs match (elements might have changed)
    if (JSON.stringify(cached.elementIds) !== JSON.stringify(elementIds)) {
      this.delete(key);
      return null;
    }

    return cached.results;
  }

  /**
   * Cache DOM query results
   * @param {string} selector - CSS selector
   * @param {Array<Element>} elements - Query results
   * @param {Object} [options={}] - Cache options
   * @returns {string} Cache key
   */
  cacheDOMQuery(selector, elements, options = {}) {
    const key = `dom-query:${selector}`;
    
    // Store lightweight references instead of full elements
    const elementRefs = elements.map(el => ({
      id: this.getElementId(el),
      tagName: el.tagName,
      className: el.className
    }));

    this.set(key, elementRefs, {
      ttl: 10000, // 10 seconds for DOM queries
      tags: ['dom-query'],
      ...options
    });

    return key;
  }

  /**
   * Get cached DOM query results
   * @param {string} selector - CSS selector
   * @returns {Array<Object>|null} Cached element references or null
   */
  getCachedDOMQuery(selector) {
    const key = `dom-query:${selector}`;
    return this.get(key);
  }

  /**
   * Cache element visibility state
   * @param {Element} element - DOM element
   * @param {boolean} visible - Visibility state
   * @param {Object} [options={}] - Cache options
   */
  cacheElementVisibility(element, visible, options = {}) {
    const elementId = this.getElementId(element);
    const key = `visibility:${elementId}`;
    
    this.set(key, visible, {
      ttl: 5000, // 5 seconds for visibility state
      tags: ['visibility'],
      ...options
    });
  }

  /**
   * Get cached element visibility state
   * @param {Element} element - DOM element
   * @returns {boolean|null} Cached visibility or null
   */
  getCachedElementVisibility(element) {
    const elementId = this.getElementId(element);
    const key = `visibility:${elementId}`;
    return this.get(key);
  }

  /**
   * Invalidate cache entries by tags
   * @param {Array<string>} tags - Tags to invalidate
   * @returns {number} Number of entries invalidated
   */
  invalidateByTags(tags) {
    let invalidatedCount = 0;
    
    for (const tag of tags) {
      const keys = this.invalidationRules.get(tag) || new Set();
      for (const key of keys) {
        if (this.cache.delete(key)) {
          invalidatedCount++;
        }
      }
      this.invalidationRules.delete(tag);
    }

    console.log(`Invalidated ${invalidatedCount} cache entries by tags:`, tags);
    return invalidatedCount;
  }

  /**
   * Invalidate cache entries by dependency
   * @param {string} dependency - Dependency key
   * @returns {number} Number of entries invalidated
   */
  invalidateByDependency(dependency) {
    let invalidatedCount = 0;
    const dependentKeys = this.dependencyGraph.get(dependency) || new Set();
    
    for (const key of dependentKeys) {
      if (this.cache.delete(key)) {
        invalidatedCount++;
      }
    }
    
    this.dependencyGraph.delete(dependency);
    console.log(`Invalidated ${invalidatedCount} cache entries by dependency: ${dependency}`);
    return invalidatedCount;
  }

  /**
   * Delete specific cache entry
   * @param {string} key - Cache key to delete
   * @returns {boolean} True if deleted
   */
  delete(key) {
    const entry = this.cache.get(key);
    if (entry) {
      this.estimatedMemoryUsage -= entry.size || 0;
      this.cache.delete(key);
      this.cleanupDependencies(key);
      return true;
    }
    return false;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.invalidationRules.clear();
    this.dependencyGraph.clear();
    this.estimatedMemoryUsage = 0;
    this.stats = {
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      cleanupCount: 0
    };
    console.log('Filter cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {CacheStats} Current cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    
    return {
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate: totalRequests > 0 ? this.stats.hitCount / totalRequests : 0,
      size: this.cache.size,
      maxSize: this.options.maxSize,
      memoryUsage: this.estimatedMemoryUsage,
      maxMemoryUsage: this.options.maxMemoryUsage,
      evictionCount: this.stats.evictionCount,
      cleanupCount: this.stats.cleanupCount,
      performance: this.getPerformanceStats()
    };
  }

  /**
   * Check if cache performance meets targets
   * @returns {Object} Performance assessment
   */
  assessPerformance() {
    const stats = this.getStats();
    const performanceStats = this.getPerformanceStats();
    
    const avgGetTime = performanceStats.get?.averageTime || 0;
    const avgSetTime = performanceStats.set?.averageTime || 0;
    
    return {
      meetsPerformanceTarget: avgGetTime < 1 && avgSetTime < 5, // <1ms get, <5ms set
      hitRateGood: stats.hitRate > 0.7, // >70% hit rate
      memoryUsageOk: stats.memoryUsage < stats.maxMemoryUsage * 0.8, // <80% memory
      averageGetTime: avgGetTime,
      averageSetTime: avgSetTime,
      recommendations: this.generateRecommendations(stats, performanceStats)
    };
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clear();
    console.log('FilterCache destroyed');
  }

  // ========== Private Methods ==========

  /**
   * Start automatic cleanup process
   * @private
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Cleanup expired and low-priority entries
   * @private
   */
  cleanup() {
    const startTime = performance.now();
    let removedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      // Remove expired entries
      if (entry.ttl > 0 && (now - entry.timestamp) > entry.ttl) {
        this.cache.delete(key);
        this.estimatedMemoryUsage -= entry.size || 0;
        removedCount++;
        continue;
      }

      // Remove rarely accessed low-priority entries if over memory limit
      if (this.estimatedMemoryUsage > this.options.maxMemoryUsage * 0.9) {
        if (entry.priority < 2 && entry.accessCount < 2) {
          this.cache.delete(key);
          this.estimatedMemoryUsage -= entry.size || 0;
          removedCount++;
        }
      }
    }

    if (removedCount > 0) {
      this.stats.cleanupCount += removedCount;
      const cleanupTime = performance.now() - startTime;
      console.log(`Cache cleanup: removed ${removedCount} entries in ${cleanupTime.toFixed(2)}ms`);
    }
  }

  /**
   * Evict least recently used entries
   * @private
   */
  evictLeastRecentlyUsed() {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    const toRemove = Math.ceil(this.cache.size * 0.1); // Remove 10%
    
    for (let i = 0; i < toRemove && entries.length > 0; i++) {
      const [key, entry] = entries[i];
      this.cache.delete(key);
      this.estimatedMemoryUsage -= entry.size || 0;
      this.stats.evictionCount++;
    }
  }

  /**
   * Generate unique element ID
   * @param {Element} element - DOM element
   * @returns {string} Element identifier
   * @private
   */
  getElementId(element) {
    // Use existing ID if available
    if (element.id) return element.id;
    
    // Generate hash based on element characteristics
    const characteristics = [
      element.tagName,
      element.className,
      element.textContent?.substring(0, 50) || '',
      element.getAttribute('data-thread-id') || '',
      element.offsetTop || 0
    ].join('|');
    
    return this.generateHash(characteristics).substring(0, 16);
  }

  /**
   * Generate filter cache key
   * @param {Array<string>} elementIds - Element identifiers
   * @param {string} mode - Filter mode
   * @returns {string} Cache key
   * @private
   */
  generateFilterKey(elementIds, mode) {
    const elementHash = this.generateHash(elementIds.join(','));
    return `filter:${mode}:${elementHash}`;
  }

  /**
   * Generate hash for data
   * @param {*} data - Data to hash
   * @returns {string} Hash string
   * @private
   */
  generateHash(data) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Estimate memory size of data
   * @param {*} data - Data to estimate
   * @returns {number} Estimated size in bytes
   * @private
   */
  estimateSize(data) {
    if (data === null || data === undefined) return 0;
    
    if (typeof data === 'string') return data.length * 2;
    if (typeof data === 'number') return 8;
    if (typeof data === 'boolean') return 4;
    if (Array.isArray(data)) return data.length * 8 + data.reduce((sum, item) => sum + this.estimateSize(item), 0);
    if (typeof data === 'object') return Object.keys(data).length * 16 + Object.values(data).reduce((sum, item) => sum + this.estimateSize(item), 0);
    
    return 16; // Default estimate
  }

  /**
   * Update dependency graph
   * @param {string} key - Cache key
   * @param {Array<string>} dependencies - Dependencies
   * @private
   */
  updateDependencyGraph(key, dependencies) {
    for (const dep of dependencies) {
      if (!this.dependencyGraph.has(dep)) {
        this.dependencyGraph.set(dep, new Set());
      }
      this.dependencyGraph.get(dep).add(key);
    }
  }

  /**
   * Update invalidation rules
   * @param {string} key - Cache key
   * @param {Array<string>} tags - Tags
   * @private
   */
  updateInvalidationRules(key, tags) {
    for (const tag of tags) {
      if (!this.invalidationRules.has(tag)) {
        this.invalidationRules.set(tag, new Set());
      }
      this.invalidationRules.get(tag).add(key);
    }
  }

  /**
   * Cleanup dependencies for removed key
   * @param {string} key - Removed cache key
   * @private
   */
  cleanupDependencies(key) {
    // Remove from invalidation rules
    for (const [tag, keys] of this.invalidationRules.entries()) {
      keys.delete(key);
      if (keys.size === 0) {
        this.invalidationRules.delete(tag);
      }
    }

    // Remove from dependency graph
    for (const [dep, keys] of this.dependencyGraph.entries()) {
      keys.delete(key);
      if (keys.size === 0) {
        this.dependencyGraph.delete(dep);
      }
    }
  }

  /**
   * Record performance metrics
   * @param {string} operation - Operation name
   * @param {number} startTime - Start time
   * @param {boolean} success - Success status
   * @private
   */
  recordPerformance(operation, startTime, success) {
    if (!this.options.enablePerformanceTracking) return;
    
    const duration = performance.now() - startTime;
    
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
    metrics.totalTime += duration;
    metrics.times.push(duration);

    // Keep only last 100 measurements
    if (metrics.times.length > 100) {
      metrics.times.shift();
    }
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance metrics
   * @private
   */
  getPerformanceStats() {
    const stats = {};
    
    for (const [operation, metrics] of this.performanceMetrics) {
      stats[operation] = {
        count: metrics.count,
        successRate: metrics.count > 0 ? metrics.successCount / metrics.count : 0,
        averageTime: metrics.count > 0 ? metrics.totalTime / metrics.count : 0,
        recentAverageTime: metrics.times.length > 0 
          ? metrics.times.slice(-10).reduce((sum, time) => sum + time, 0) / Math.min(10, metrics.times.length)
          : 0
      };
    }

    return stats;
  }

  /**
   * Generate performance recommendations
   * @param {Object} stats - Cache statistics
   * @param {Object} perfStats - Performance statistics
   * @returns {Array<string>} Recommendations
   * @private
   */
  generateRecommendations(stats, perfStats) {
    const recommendations = [];

    if (stats.hitRate < 0.5) {
      recommendations.push('Consider increasing cache TTL or cache size to improve hit rate');
    }

    if (stats.memoryUsage > stats.maxMemoryUsage * 0.9) {
      recommendations.push('Memory usage is high, consider reducing cache size or TTL');
    }

    const avgGetTime = perfStats.get?.averageTime || 0;
    if (avgGetTime > 2) {
      recommendations.push('Cache get operations are slow, consider optimizing data structures');
    }

    if (stats.evictionCount > stats.hitCount * 0.1) {
      recommendations.push('High eviction rate detected, consider increasing cache size');
    }

    return recommendations;
  }
}