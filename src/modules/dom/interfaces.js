/**
 * DOM Interfaces and Type Definitions
 * 
 * This module defines all interface contracts and type definitions for the DOM abstraction layer.
 * These JSDoc interfaces provide type safety and API contracts for robust DOM operations.
 */

/**
 * @typedef {Object} DOMOperationResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {*} data - Operation result data
 * @property {Error|null} error - Error if operation failed
 * @property {number} executionTime - Time taken in milliseconds
 */

/**
 * @typedef {Object} DOMQueryOptions
 * @property {Document|Element} [context=document] - Query context
 * @property {boolean} [useCache=true] - Whether to use cached results
 * @property {number} [timeout=5000] - Query timeout in ms
 * @property {string[]} [fallbackSelectors] - Fallback selectors to try
 */

/**
 * @typedef {Object} DOMUpdateOptions
 * @property {boolean} [batch=true] - Whether to batch the operation
 * @property {boolean} [validate=true] - Whether to validate inputs
 * @property {number} [priority=0] - Operation priority (higher = more urgent)
 * @property {Function} [onError] - Error callback
 */

/**
 * @typedef {Object} DOMCacheOptions
 * @property {number} [maxSize=1000] - Maximum cache size
 * @property {number} [ttl=30000] - Time to live in milliseconds
 * @property {boolean} [enabled=true] - Whether caching is enabled
 */

/**
 * @typedef {Object} DOMQueueOptions
 * @property {number} [batchSize=20] - Maximum operations per batch
 * @property {number} [maxWaitTime=16] - Maximum wait time before flush (ms)
 * @property {boolean} [separateReadWrite=true] - Separate read/write operations
 */

/**
 * @typedef {Object} DOMBatchOperation
 * @property {string} type - Operation type (e.g., 'select', 'setAttribute')
 * @property {Element} [element] - Target element
 * @property {string} [selector] - Selector for element selection
 * @property {Object} [args] - Operation arguments
 * @property {number} [priority=0] - Operation priority
 * @property {Function} [callback] - Success callback
 * @property {Function} [onError] - Error callback
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number} count - Number of operations
 * @property {number} totalTime - Total execution time
 * @property {number} avgTime - Average execution time
 * @property {number} maxTime - Maximum execution time
 * @property {number} minTime - Minimum execution time
 */

/**
 * @typedef {Object} CacheStats
 * @property {number} size - Current cache size
 * @property {number} hits - Cache hits
 * @property {number} misses - Cache misses
 * @property {number} hitRate - Cache hit rate (0-1)
 * @property {number} memoryUsage - Estimated memory usage
 */

/**
 * Constants for DOM operations
 */
export const DOM_CONSTANTS = {
  DEFAULT_TIMEOUT: 5000,
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY: 100,
  DEFAULT_CACHE_TTL: 30000,
  DEFAULT_BATCH_SIZE: 20,
  MAX_WAIT_TIME: 16, // One frame at 60fps
  PRIORITY_LEVELS: {
    LOW: 0,
    NORMAL: 1,
    HIGH: 2,
    CRITICAL: 3
  },
  OPERATION_TYPES: {
    READ: ['select', 'selectAll', 'getAttribute', 'getStyle', 'hasClass'],
    write: ['createElement', 'setAttribute', 'setStyle', 'addClass', 'removeClass', 'appendChild', 'removeElement'],
    event: ['addEventListener', 'removeEventListener', 'delegateEvent']
  }
};

/**
 * Error types for DOM operations
 */
export const DOM_ERRORS = {
  ELEMENT_NOT_FOUND: 'ElementNotFound',
  TIMEOUT_ERROR: 'TimeoutError',
  VALIDATION_ERROR: 'ValidationError',
  CACHE_ERROR: 'CacheError',
  BATCH_ERROR: 'BatchError',
  ADAPTER_ERROR: 'AdapterError'
};