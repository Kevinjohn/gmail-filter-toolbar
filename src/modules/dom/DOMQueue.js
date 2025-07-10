/**
 * DOM Queue Module
 * 
 * Provides batched DOM operations with priority-based execution to prevent
 * layout thrashing and optimize performance through read/write separation.
 */

import { DOM_CONSTANTS } from './interfaces.js';

export class DOMQueue {
  /**
   * @param {DOMQueueOptions} options - Queue configuration options
   */
  constructor(options = {}) {
    this.batchSize = options.batchSize || DOM_CONSTANTS.DEFAULT_BATCH_SIZE;
    this.maxWaitTime = options.maxWaitTime || DOM_CONSTANTS.MAX_WAIT_TIME;
    this.separateReadWrite = options.separateReadWrite !== false;
    
    // Separate queues for read and write operations to prevent layout thrashing
    this.readOps = [];
    this.writeOps = [];
    this.eventOps = [];
    
    // Processing state
    this.isProcessing = false;
    this.isScheduled = false;
    this.frameId = null;
    
    // Performance tracking
    this.stats = {
      totalOperations: 0,
      batchesProcessed: 0,
      averageBatchSize: 0,
      totalProcessingTime: 0
    };
    
    // Bind methods to preserve context
    this.enqueue = this.enqueue.bind(this);
    this.flush = this.flush.bind(this);
    this.process = this.process.bind(this);
  }

  /**
   * Enqueue a DOM operation for batched execution
   * @param {DOMBatchOperation} operation - Operation to enqueue
   * @param {number} [priority=0] - Operation priority
   * @returns {Promise} Promise that resolves when operation completes
   */
  enqueue(operation, priority = 0) {
    return new Promise((resolve, reject) => {
      const queuedOp = {
        ...operation,
        priority: priority || 0,
        resolve,
        reject,
        timestamp: performance.now()
      };

      // Categorize operation by type for optimal batching
      const operationType = this.getOperationType(operation.type);
      
      switch (operationType) {
        case 'read':
          this.readOps.push(queuedOp);
          break;
        case 'write':
          this.writeOps.push(queuedOp);
          break;
        case 'event':
          this.eventOps.push(queuedOp);
          break;
        default:
          this.writeOps.push(queuedOp); // Default to write operations
      }

      // Sort by priority (higher priority first)
      this.sortByPriority();
      
      // Schedule processing if not already scheduled
      this.scheduleFlush();
    });
  }

  /**
   * Determine operation type category
   * @param {string} operationType - The operation type
   * @returns {string} Category: 'read', 'write', or 'event'
   */
  getOperationType(operationType) {
    if (DOM_CONSTANTS.OPERATION_TYPES.read.includes(operationType)) {
      return 'read';
    } else if (DOM_CONSTANTS.OPERATION_TYPES.event.includes(operationType)) {
      return 'event';
    } else {
      return 'write';
    }
  }

  /**
   * Sort operations by priority within each queue
   */
  sortByPriority() {
    const compareFn = (a, b) => b.priority - a.priority;
    this.readOps.sort(compareFn);
    this.writeOps.sort(compareFn);
    this.eventOps.sort(compareFn);
  }

  /**
   * Schedule flush operation using requestAnimationFrame
   */
  scheduleFlush() {
    if (!this.isScheduled && !this.isProcessing) {
      this.isScheduled = true;
      this.frameId = requestAnimationFrame(() => {
        this.isScheduled = false;
        this.flush();
      });
    }
  }

  /**
   * Force immediate flush of operations with optional priority filter
   * @param {number} [minPriority] - Minimum priority to flush
   */
  flush(minPriority = 0) {
    if (this.isProcessing) return;
    
    // Cancel scheduled flush if we're flushing immediately
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
      this.isScheduled = false;
    }

    this.process(minPriority);
  }

  /**
   * Process queued operations in optimal order
   * @param {number} [minPriority=0] - Minimum priority to process
   */
  async process(minPriority = 0) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    const startTime = performance.now();

    try {
      // Filter operations by minimum priority
      const readOpsToProcess = this.readOps.filter(op => op.priority >= minPriority);
      const writeOpsToProcess = this.writeOps.filter(op => op.priority >= minPriority);
      const eventOpsToProcess = this.eventOps.filter(op => op.priority >= minPriority);

      // Process operations in optimal order to prevent layout thrashing:
      // 1. Read operations first (no layout impact)
      // 2. Write operations second (batched layout)
      // 3. Event operations last (after DOM is stable)

      await this.processBatch(readOpsToProcess, 'read');
      await this.processBatch(writeOpsToProcess, 'write');
      await this.processBatch(eventOpsToProcess, 'event');

      // Remove processed operations from queues
      this.readOps = this.readOps.filter(op => op.priority < minPriority);
      this.writeOps = this.writeOps.filter(op => op.priority < minPriority);
      this.eventOps = this.eventOps.filter(op => op.priority < minPriority);

      // Update statistics
      const totalOps = readOpsToProcess.length + writeOpsToProcess.length + eventOpsToProcess.length;
      if (totalOps > 0) {
        this.stats.totalOperations += totalOps;
        this.stats.batchesProcessed++;
        this.stats.averageBatchSize = this.stats.totalOperations / this.stats.batchesProcessed;
        this.stats.totalProcessingTime += performance.now() - startTime;
      }

    } catch (error) {
      console.error('Error processing DOM queue:', error);
    } finally {
      this.isProcessing = false;
      
      // Schedule next flush if there are remaining operations
      if (this.hasOperations()) {
        this.scheduleFlush();
      }
    }
  }

  /**
   * Process a batch of operations of the same type
   * @param {Array} operations - Operations to process
   * @param {string} type - Operation type category
   */
  async processBatch(operations, _type) {
    if (operations.length === 0) return;

    // Process operations in chunks to maintain responsiveness
    const chunkSize = Math.min(this.batchSize, operations.length);
    
    for (let i = 0; i < operations.length; i += chunkSize) {
      const chunk = operations.slice(i, i + chunkSize);
      
      // Process chunk operations
      const results = await Promise.allSettled(
        chunk.map(op => this.executeOperation(op))
      );

      // Handle results and resolve/reject promises
      results.forEach((result, index) => {
        const operation = chunk[index];
        
        if (result.status === 'fulfilled') {
          operation.resolve(result.value);
        } else {
          operation.reject(result.reason);
        }
      });

      // Yield control between chunks for long batches
      if (i + chunkSize < operations.length) {
        await this.yieldControl();
      }
    }
  }

  /**
   * Execute a single DOM operation
   * @param {DOMBatchOperation} operation - Operation to execute
   * @returns {Promise<*>} Operation result
   */
  async executeOperation(operation) {
    const startTime = performance.now();
    
    try {
      let result;
      
      // Execute operation based on type
      switch (operation.type) {
        case 'select':
          result = this.executeSelect(operation);
          break;
        case 'selectAll':
          result = this.executeSelectAll(operation);
          break;
        case 'createElement':
          result = this.executeCreateElement(operation);
          break;
        case 'setAttribute':
          result = this.executeSetAttribute(operation);
          break;
        case 'setStyle':
          result = this.executeSetStyle(operation);
          break;
        case 'addClass':
          result = this.executeAddClass(operation);
          break;
        case 'removeClass':
          result = this.executeRemoveClass(operation);
          break;
        case 'appendChild':
          result = this.executeAppendChild(operation);
          break;
        case 'removeElement':
          result = this.executeRemoveElement(operation);
          break;
        case 'addEventListener':
          result = this.executeAddEventListener(operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      const executionTime = performance.now() - startTime;
      
      return {
        success: true,
        data: result,
        error: null,
        executionTime
      };
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      // Call error callback if provided
      if (operation.onError) {
        operation.onError(error);
      }
      
      return {
        success: false,
        data: null,
        error,
        executionTime
      };
    }
  }

  /**
   * Execute select operation
   * @param {DOMBatchOperation} operation - Select operation
   * @returns {Element|null} Selected element
   */
  executeSelect(operation) {
    const { selector, context = document } = operation.args;
    return context.querySelector(selector);
  }

  /**
   * Execute selectAll operation
   * @param {DOMBatchOperation} operation - SelectAll operation
   * @returns {NodeList} Selected elements
   */
  executeSelectAll(operation) {
    const { selector, context = document } = operation.args;
    return context.querySelectorAll(selector);
  }

  /**
   * Execute createElement operation
   * @param {DOMBatchOperation} operation - CreateElement operation
   * @returns {Element} Created element
   */
  executeCreateElement(operation) {
    const { tagName, attributes = {} } = operation.args;
    const element = document.createElement(tagName);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'textContent') {
        element.textContent = value;
      } else if (key === 'className') {
        element.className = value;
      } else {
        element.setAttribute(key, value);
      }
    });
    
    return element;
  }

  /**
   * Execute setAttribute operation
   * @param {DOMBatchOperation} operation - SetAttribute operation
   * @returns {void}
   */
  executeSetAttribute(operation) {
    const { element, attribute, value } = operation.args;
    element.setAttribute(attribute, value);
  }

  /**
   * Execute setStyle operation
   * @param {DOMBatchOperation} operation - SetStyle operation
   * @returns {void}
   */
  executeSetStyle(operation) {
    const { element, property, value } = operation.args;
    element.style[property] = value;
  }

  /**
   * Execute addClass operation
   * @param {DOMBatchOperation} operation - AddClass operation
   * @returns {void}
   */
  executeAddClass(operation) {
    const { element, className } = operation.args;
    element.classList.add(className);
  }

  /**
   * Execute removeClass operation
   * @param {DOMBatchOperation} operation - RemoveClass operation
   * @returns {void}
   */
  executeRemoveClass(operation) {
    const { element, className } = operation.args;
    element.classList.remove(className);
  }

  /**
   * Execute appendChild operation
   * @param {DOMBatchOperation} operation - AppendChild operation
   * @returns {void}
   */
  executeAppendChild(operation) {
    const { parent, child } = operation.args;
    parent.appendChild(child);
  }

  /**
   * Execute removeElement operation
   * @param {DOMBatchOperation} operation - RemoveElement operation
   * @returns {void}
   */
  executeRemoveElement(operation) {
    const { element } = operation.args;
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * Execute addEventListener operation
   * @param {DOMBatchOperation} operation - AddEventListener operation
   * @returns {void}
   */
  executeAddEventListener(operation) {
    const { element, event, handler, options } = operation.args;
    element.addEventListener(event, handler, options);
  }

  /**
   * Yield control to prevent blocking the main thread
   * @returns {Promise<void>}
   */
  yieldControl() {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }

  /**
   * Check if there are operations in any queue
   * @returns {boolean} True if operations are pending
   */
  hasOperations() {
    return this.readOps.length > 0 || 
           this.writeOps.length > 0 || 
           this.eventOps.length > 0;
  }

  /**
   * Get current queue statistics
   * @returns {Object} Queue statistics
   */
  getStats() {
    return {
      ...this.stats,
      currentQueued: {
        read: this.readOps.length,
        write: this.writeOps.length,
        event: this.eventOps.length,
        total: this.readOps.length + this.writeOps.length + this.eventOps.length
      },
      isProcessing: this.isProcessing,
      isScheduled: this.isScheduled
    };
  }

  /**
   * Clear all queued operations
   */
  clear() {
    // Reject all pending operations
    const allOps = [...this.readOps, ...this.writeOps, ...this.eventOps];
    allOps.forEach(op => {
      op.reject(new Error('Queue cleared'));
    });

    this.readOps = [];
    this.writeOps = [];
    this.eventOps = [];
    
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    
    this.isScheduled = false;
  }
}