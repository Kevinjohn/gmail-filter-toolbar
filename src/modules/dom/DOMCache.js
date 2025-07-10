/**
 * DOM Cache Module
 * 
 * Provides intelligent caching for DOM queries and operations with automatic
 * invalidation, memory management, and performance optimization.
 */

import { DOM_CONSTANTS } from './interfaces.js';

export class DOMCache {
  /**
   * @param {DOMCacheOptions} options - Cache configuration options
   */
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || DOM_CONSTANTS.DEFAULT_CACHE_TTL;
    this.enabled = options.enabled !== false;
    
    // Query result cache with TTL
    this.queryCache = new Map();
    this.timeouts = new Map();
    
    // Element cache using WeakMap for automatic garbage collection
    this.elementCache = new WeakMap();
    
    // Performance tracking
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      memoryUsage: 0
    };
    
    // Selector performance tracking
    this.selectorPerformance = new Map();
    
    // Bind methods to preserve context
    this.get = this.get.bind(this);
    this.set = this.set.bind(this);
    this.invalidate = this.invalidate.bind(this);
    this.clear = this.clear.bind(this);
  }

  /**
   * Get cached query result
   * @param {string} key - Cache key
   * @returns {*|null} Cached result or null if not found/expired
   */
  get(key) {
    if (!this.enabled) return null;
    
    const cached = this.queryCache.get(key);
    if (!cached) {
      this.stats.misses++;
      return null;
    }

    if (this.isValidCache(cached)) {
      this.stats.hits++;
      return cached.result;
    } else {
      // Cache expired, clean it up
      this.remove(key);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set cache entry with optional custom TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [customTTL] - Custom TTL override
   */
  set(key, value, customTTL) {
    if (!this.enabled) return;
    
    // Enforce size limit
    if (this.queryCache.size >= this.maxSize) {
      this.evictOldest();
    }

    const ttl = customTTL || this.ttl;
    const entry = {
      result: value,
      timestamp: Date.now(),
      ttl: ttl,
      context: value && value.nodeType ? new WeakRef(value) : null
    };

    this.queryCache.set(key, entry);
    this.stats.size = this.queryCache.size;

    // Set timeout for automatic cleanup
    if (ttl > 0) {
      const timeoutId = setTimeout(() => {
        this.remove(key);
      }, ttl);
      
      this.timeouts.set(key, timeoutId);
    }
  }

  /**
   * Generate cache key for DOM queries
   * @param {string} selector - CSS selector
   * @param {Document|Element} context - Query context
   * @param {Object} options - Query options
   * @returns {string} Cache key
   */
  generateKey(selector, context = document, options = {}) {
    const contextId = context.id || 
                     context.tagName || 
                     (context === document ? 'document' : 'element');
    const optionsKey = JSON.stringify(options);
    return `${selector}:${contextId}:${optionsKey}`;
  }

  /**
   * Get cached query result by selector and context
   * @param {string} selector - CSS selector
   * @param {Document|Element} context - Query context
   * @param {Object} options - Query options
   * @returns {*|null} Cached result or null
   */
  getCachedQuery(selector, context = document, options = {}) {
    const key = this.generateKey(selector, context, options);
    return this.get(key);
  }

  /**
   * Cache query result by selector and context
   * @param {string} selector - CSS selector
   * @param {Document|Element} context - Query context
   * @param {*} result - Query result to cache
   * @param {Object} options - Query options
   * @param {number} [customTTL] - Custom TTL override
   */
  cacheQuery(selector, context, result, options = {}, customTTL) {
    const key = this.generateKey(selector, context, options);
    this.set(key, result, customTTL);
  }

  /**
   * Check if cached entry is still valid
   * @param {Object} cached - Cached entry
   * @returns {boolean} True if valid
   */
  isValidCache(cached) {
    // Check TTL expiration
    if (cached.ttl > 0 && Date.now() - cached.timestamp > cached.ttl) {
      return false;
    }
    
    // Check if context element still exists (for element-specific caches)
    if (cached.context) {
      const element = cached.context.deref();
      if (!element || !document.contains(element)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Invalidate cache entries matching pattern
   * @param {string|RegExp} pattern - Pattern to match keys
   */
  invalidate(pattern) {
    const isRegex = pattern instanceof RegExp;
    const keysToRemove = [];

    for (const key of this.queryCache.keys()) {
      const matches = isRegex ? pattern.test(key) : key.includes(pattern);
      if (matches) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => this.remove(key));
  }

  /**
   * Remove specific cache entry
   * @param {string} key - Cache key to remove
   */
  remove(key) {
    this.queryCache.delete(key);
    
    const timeoutId = this.timeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(key);
    }
    
    this.stats.size = this.queryCache.size;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    // Clear all timeouts
    for (const timeoutId of this.timeouts.values()) {
      clearTimeout(timeoutId);
    }
    
    this.queryCache.clear();
    this.timeouts.clear();
    this.stats.size = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Evict oldest cache entries when size limit is reached
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.queryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.remove(oldestKey);
    }
  }

  /**
   * Record selector performance metrics
   * @param {string} selector - CSS selector
   * @param {number} duration - Execution time in ms
   */
  recordSelectorPerformance(selector, duration) {
    if (!this.selectorPerformance.has(selector)) {
      this.selectorPerformance.set(selector, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity
      });
    }

    const metrics = this.selectorPerformance.get(selector);
    metrics.count++;
    metrics.totalTime += duration;
    metrics.avgTime = metrics.totalTime / metrics.count;
    metrics.maxTime = Math.max(metrics.maxTime, duration);
    metrics.minTime = Math.min(metrics.minTime, duration);
  }

  /**
   * Get cache statistics
   * @returns {CacheStats} Cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses) 
      : 0;

    return {
      size: this.stats.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: hitRate,
      memoryUsage: this.estimateMemoryUsage(),
      selectorPerformance: Object.fromEntries(this.selectorPerformance)
    };
  }

  /**
   * Estimate memory usage of cache
   * @returns {number} Estimated memory usage in bytes
   */
  estimateMemoryUsage() {
    let usage = 0;
    
    for (const [key, entry] of this.queryCache.entries()) {
      usage += key.length * 2; // String characters (UTF-16)
      usage += 64; // Estimated object overhead
      
      if (entry.result && typeof entry.result === 'string') {
        usage += entry.result.length * 2;
      }
    }
    
    return usage;
  }

  /**
   * Enable/disable caching
   * @param {boolean} enabled - Whether to enable caching
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }
}