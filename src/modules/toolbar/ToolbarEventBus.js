/**
 * ToolbarEventBus - Event Bus Pattern for Toolbar Interactions
 * 
 * Provides a type-safe event communication system that decouples event producers
 * from consumers within the toolbar module. Supports event validation, error handling,
 * and performance monitoring.
 * 
 * @author Chrome Extension Team
 * @version 1.0.0
 */

/**
 * @typedef {Object} ToolbarEvent
 * @property {string} type - Event type identifier
 * @property {Object} payload - Event data payload
 * @property {number} timestamp - Event timestamp
 * @property {string} source - Event source identifier
 * @property {Object} metadata - Additional event metadata
 */

/**
 * @typedef {Object} EventSubscription
 * @property {string} id - Subscription identifier
 * @property {string} eventType - Event type being subscribed to
 * @property {Function} handler - Event handler function
 * @property {Object} options - Subscription options
 * @property {boolean} options.once - Execute only once
 * @property {number} options.priority - Handler priority (higher = earlier execution)
 */

export class ToolbarEventBus {
  /**
   * @param {Object} [options={}] - EventBus configuration options
   * @param {boolean} [options.enableMetrics=true] - Enable performance metrics
   * @param {boolean} [options.enableLogging=false] - Enable event logging
   * @param {number} [options.maxListeners=50] - Maximum listeners per event type
   */
  constructor(options = {}) {
    const {
      enableMetrics = true,
      enableLogging = false,
      maxListeners = 50
    } = options;

    // Event storage and management
    this._listeners = new Map(); // eventType -> Set<EventSubscription>
    this._onceListeners = new Map(); // eventType -> Set<EventSubscription>
    this._subscriptionCounter = 0;
    
    // Configuration
    this._enableMetrics = enableMetrics;
    this._enableLogging = enableLogging;
    this._maxListeners = maxListeners;
    
    // Performance tracking
    this._metrics = new Map();
    this._eventHistory = [];
    this._maxHistorySize = 100;
    
    // Error handling
    this._errorHandlers = new Set();
    this._lastError = null;
    
    // Bind methods to preserve context
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.once = this.once.bind(this);
    
    // Initialize predefined toolbar event types
    this._initializeEventTypes();
    
    if (this._enableLogging) {
      console.log('ToolbarEventBus initialized with options:', options);
    }
  }

  /**
   * Initialize supported toolbar event types
   * @private
   */
  _initializeEventTypes() {
    /**
     * @type {Object<string, Object>} Supported event types and their schemas
     */
    this.EVENT_TYPES = {
      // Button interaction events
      BUTTON_CLICKED: {
        schema: ['mode', 'element', 'config'],
        description: 'Fired when a toolbar button is clicked'
      },
      BUTTON_CREATED: {
        schema: ['mode', 'element', 'config'],
        description: 'Fired when a new button is created'
      },
      BUTTON_STATE_CHANGED: {
        schema: ['mode', 'isActive', 'element'],
        description: 'Fired when button state changes'
      },
      
      // Toolbar lifecycle events
      TOOLBAR_INITIALIZED: {
        schema: ['toolbarId', 'container', 'config'],
        description: 'Fired when toolbar is fully initialized'
      },
      TOOLBAR_DESTROYED: {
        schema: ['toolbarId'],
        description: 'Fired when toolbar is destroyed'
      },
      TOOLBAR_REFRESH_REQUESTED: {
        schema: ['reason'],
        description: 'Fired when toolbar refresh is requested'
      },
      
      // State management events
      STATE_CHANGED: {
        schema: ['key', 'oldValue', 'newValue'],
        description: 'Fired when toolbar state changes'
      },
      FILTER_MODE_CHANGED: {
        schema: ['oldMode', 'newMode', 'source'],
        description: 'Fired when filter mode changes'
      },
      
      // UI events
      TEXT_VISIBILITY_CHANGED: {
        schema: ['showText'],
        description: 'Fired when button text visibility changes'
      },
      THEME_CHANGED: {
        schema: ['theme'],
        description: 'Fired when UI theme changes'
      },
      
      // Navigation events
      KEYBOARD_NAVIGATION: {
        schema: ['direction', 'currentButton', 'nextButton'],
        description: 'Fired during keyboard navigation'
      },
      FOCUS_CHANGED: {
        schema: ['previousElement', 'currentElement'],
        description: 'Fired when focus changes within toolbar'
      },
      
      // Error events
      TOOLBAR_ERROR: {
        schema: ['error', 'context', 'severity'],
        description: 'Fired when toolbar errors occur'
      },
      BUTTON_ERROR: {
        schema: ['error', 'buttonConfig', 'operation'],
        description: 'Fired when button operation errors occur'
      },
      
      // Performance events
      PERFORMANCE_METRIC: {
        schema: ['operation', 'duration', 'metadata'],
        description: 'Fired for performance measurements'
      }
    };
  }

  /**
   * Subscribe to an event type
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} handler - Event handler function
   * @param {Object} [options={}] - Subscription options
   * @param {boolean} [options.once=false] - Execute handler only once
   * @param {number} [options.priority=0] - Handler priority (higher = earlier)
   * @returns {string} Subscription ID for later removal
   */
  on(eventType, handler, options = {}) {
    try {
      // Validate inputs
      if (!this._validateEventType(eventType)) {
        throw new Error(`Invalid event type: ${eventType}`);
      }
      
      if (typeof handler !== 'function') {
        throw new Error('Event handler must be a function');
      }

      const {
        once = false,
        priority = 0
      } = options;

      // Check listener limits
      const currentListeners = this._listeners.get(eventType)?.size || 0;
      if (currentListeners >= this._maxListeners) {
        throw new Error(`Maximum listeners (${this._maxListeners}) exceeded for event: ${eventType}`);
      }

      // Create subscription
      const subscriptionId = `sub_${++this._subscriptionCounter}_${Date.now()}`;
      const subscription = {
        id: subscriptionId,
        eventType,
        handler,
        options: { once, priority },
        createdAt: Date.now()
      };

      // Store subscription
      const listenerMap = once ? this._onceListeners : this._listeners;
      if (!listenerMap.has(eventType)) {
        listenerMap.set(eventType, new Set());
      }
      listenerMap.get(eventType).add(subscription);

      if (this._enableLogging) {
        console.log(`Subscribed to ${eventType} with ID: ${subscriptionId}`);
      }

      return subscriptionId;

    } catch (error) {
      this._handleError(error, 'subscription', { eventType, handler });
      throw error;
    }
  }

  /**
   * Subscribe to an event type for one-time execution
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} handler - Event handler function
   * @param {Object} [options={}] - Subscription options
   * @returns {string} Subscription ID
   */
  once(eventType, handler, options = {}) {
    return this.on(eventType, handler, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   * @param {string} subscriptionId - Subscription ID returned by on() or once()
   * @returns {boolean} True if subscription was found and removed
   */
  off(subscriptionId) {
    try {
      // Search in regular listeners
      for (const [eventType, subscriptions] of this._listeners) {
        for (const subscription of subscriptions) {
          if (subscription.id === subscriptionId) {
            subscriptions.delete(subscription);
            if (subscriptions.size === 0) {
              this._listeners.delete(eventType);
            }
            
            if (this._enableLogging) {
              console.log(`Unsubscribed from ${eventType}: ${subscriptionId}`);
            }
            return true;
          }
        }
      }

      // Search in once listeners
      for (const [eventType, subscriptions] of this._onceListeners) {
        for (const subscription of subscriptions) {
          if (subscription.id === subscriptionId) {
            subscriptions.delete(subscription);
            if (subscriptions.size === 0) {
              this._onceListeners.delete(eventType);
            }
            
            if (this._enableLogging) {
              console.log(`Unsubscribed from ${eventType}: ${subscriptionId}`);
            }
            return true;
          }
        }
      }

      return false;

    } catch (error) {
      this._handleError(error, 'unsubscription', { subscriptionId });
      return false;
    }
  }

  /**
   * Emit an event to all subscribers
   * @param {string} eventType - Event type to emit
   * @param {Object} payload - Event payload data
   * @param {Object} [metadata={}] - Additional event metadata
   * @returns {Promise<boolean>} True if event was successfully processed
   */
  async emit(eventType, payload = {}, metadata = {}) {
    const startTime = performance.now();
    
    try {
      // Validate event type
      if (!this._validateEventType(eventType)) {
        throw new Error(`Invalid event type: ${eventType}`);
      }

      // Validate payload against schema if available
      if (this.EVENT_TYPES[eventType]) {
        this._validatePayload(eventType, payload);
      }

      // Create event object
      const event = {
        type: eventType,
        payload,
        timestamp: Date.now(),
        source: 'ToolbarEventBus',
        metadata: {
          ...metadata,
          emissionId: `emit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      };

      // Collect all handlers (regular + once)
      const handlers = [];
      
      // Add regular listeners
      const regularListeners = this._listeners.get(eventType);
      if (regularListeners) {
        handlers.push(...Array.from(regularListeners));
      }
      
      // Add once listeners and remove them
      const onceListeners = this._onceListeners.get(eventType);
      if (onceListeners) {
        handlers.push(...Array.from(onceListeners));
        this._onceListeners.delete(eventType); // Remove once listeners
      }

      if (handlers.length === 0) {
        if (this._enableLogging) {
          console.log(`No handlers for event: ${eventType}`);
        }
        return true;
      }

      // Sort handlers by priority (highest first)
      handlers.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

      // Execute handlers
      const results = await Promise.allSettled(
        handlers.map(subscription => this._executeHandler(subscription, event))
      );

      // Check for handler errors
      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => result.reason);

      if (errors.length > 0) {
        console.warn(`${errors.length} handler(s) failed for event ${eventType}:`, errors);
      }

      // Record event in history
      this._recordEvent(event, handlers.length, errors.length);

      // Record performance metrics
      if (this._enableMetrics) {
        const duration = performance.now() - startTime;
        this._recordMetric(eventType, duration, handlers.length);
      }

      if (this._enableLogging) {
        console.log(`Emitted ${eventType} to ${handlers.length} handler(s)`);
      }

      return errors.length === 0;

    } catch (error) {
      const duration = performance.now() - startTime;
      this._handleError(error, 'emission', { eventType, payload, duration });
      throw error;
    }
  }

  /**
   * Add error handler for bus-level errors
   * @param {Function} errorHandler - Error handling function
   * @returns {string} Handler ID for removal
   */
  onError(errorHandler) {
    if (typeof errorHandler !== 'function') {
      throw new Error('Error handler must be a function');
    }

    const handlerId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this._errorHandlers.add({ id: handlerId, handler: errorHandler });
    return handlerId;
  }

  /**
   * Remove error handler
   * @param {string} handlerId - Handler ID returned by onError()
   * @returns {boolean} True if handler was removed
   */
  offError(handlerId) {
    for (const errorHandler of this._errorHandlers) {
      if (errorHandler.id === handlerId) {
        this._errorHandlers.delete(errorHandler);
        return true;
      }
    }
    return false;
  }

  /**
   * Get event bus statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const stats = {
      listeners: {},
      onceListeners: {},
      totalSubscriptions: 0,
      eventHistory: this._eventHistory.length,
      metrics: Object.fromEntries(this._metrics),
      lastError: this._lastError
    };

    // Count listeners by event type
    for (const [eventType, subscriptions] of this._listeners) {
      stats.listeners[eventType] = subscriptions.size;
      stats.totalSubscriptions += subscriptions.size;
    }

    for (const [eventType, subscriptions] of this._onceListeners) {
      stats.onceListeners[eventType] = subscriptions.size;
      stats.totalSubscriptions += subscriptions.size;
    }

    return stats;
  }

  /**
   * Clear all subscriptions and reset the event bus
   * @param {Object} [options={}] - Reset options
   * @param {boolean} [options.preserveMetrics=false] - Keep performance metrics
   * @param {boolean} [options.preserveHistory=false] - Keep event history
   */
  reset(options = {}) {
    const { preserveMetrics = false, preserveHistory = false } = options;

    // Clear subscriptions
    this._listeners.clear();
    this._onceListeners.clear();
    this._subscriptionCounter = 0;

    // Clear error handlers
    this._errorHandlers.clear();
    this._lastError = null;

    // Optionally clear metrics and history
    if (!preserveMetrics) {
      this._metrics.clear();
    }

    if (!preserveHistory) {
      this._eventHistory = [];
    }

    if (this._enableLogging) {
      console.log('ToolbarEventBus reset completed');
    }
  }

  /**
   * Destroy the event bus and clean up resources
   */
  destroy() {
    this.reset();
    
    // Clear all properties
    this._listeners = null;
    this._onceListeners = null;
    this._metrics = null;
    this._eventHistory = null;
    this._errorHandlers = null;
    
    if (this._enableLogging) {
      console.log('ToolbarEventBus destroyed');
    }
  }

  // ========== Private Methods ==========

  /**
   * Validate event type
   * @private
   * @param {string} eventType - Event type to validate
   * @returns {boolean} True if valid
   */
  _validateEventType(eventType) {
    return typeof eventType === 'string' && eventType.length > 0;
  }

  /**
   * Validate event payload against schema
   * @private
   * @param {string} eventType - Event type
   * @param {Object} payload - Payload to validate
   */
  _validatePayload(eventType, payload) {
    const eventConfig = this.EVENT_TYPES[eventType];
    if (!eventConfig || !eventConfig.schema) {
      return; // No schema validation required
    }

    const requiredFields = eventConfig.schema;
    const missingFields = requiredFields.filter(field => !(field in payload));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields for ${eventType}: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Execute event handler safely
   * @private
   * @param {EventSubscription} subscription - Subscription to execute
   * @param {ToolbarEvent} event - Event to pass to handler
   * @returns {Promise<any>} Handler result
   */
  async _executeHandler(subscription, event) {
    try {
      const result = await subscription.handler(event);
      return result;
    } catch (error) {
      // Re-throw with additional context
      const enhancedError = new Error(`Handler failed for ${event.type}: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.subscription = subscription;
      enhancedError.event = event;
      throw enhancedError;
    }
  }

  /**
   * Record event in history
   * @private
   * @param {ToolbarEvent} event - Event to record
   * @param {number} handlerCount - Number of handlers executed
   * @param {number} errorCount - Number of handler errors
   */
  _recordEvent(event, handlerCount, errorCount) {
    const eventRecord = {
      ...event,
      handlerCount,
      errorCount,
      recordedAt: Date.now()
    };

    this._eventHistory.push(eventRecord);

    // Trim history if it gets too large
    if (this._eventHistory.length > this._maxHistorySize) {
      this._eventHistory = this._eventHistory.slice(-this._maxHistorySize);
    }
  }

  /**
   * Record performance metric
   * @private
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {number} handlerCount - Number of handlers
   */
  _recordMetric(operation, duration, handlerCount) {
    if (!this._metrics.has(operation)) {
      this._metrics.set(operation, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        totalHandlers: 0
      });
    }

    const metric = this._metrics.get(operation);
    metric.count++;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.count;
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.totalHandlers += handlerCount;
  }

  /**
   * Handle internal errors
   * @private
   * @param {Error} error - Error that occurred
   * @param {string} context - Context where error occurred
   * @param {Object} metadata - Additional error metadata
   */
  _handleError(error, context, metadata = {}) {
    this._lastError = {
      error: error.message,
      context,
      metadata,
      timestamp: Date.now()
    };

    // Notify error handlers
    for (const errorHandler of this._errorHandlers) {
      try {
        errorHandler.handler(error, context, metadata);
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError);
      }
    }

    if (this._enableLogging) {
      console.error(`ToolbarEventBus error in ${context}:`, error, metadata);
    }
  }
}

// Export singleton instance for convenience
export const toolbarEventBus = new ToolbarEventBus({
  enableMetrics: true,
  enableLogging: false,
  maxListeners: 100
});

export default toolbarEventBus;