/**
 * DOM Abstraction Layer - Main Export Module
 * 
 * Central export point for all DOM abstraction components.
 * Provides factory methods and configured instances for easy integration.
 */

// Core DOM abstraction components
import { DOMManager } from './DOMManager.js';
import { DOMCache } from './DOMCache.js';
import { DOMQueue } from './DOMQueue.js';
import { DOMFactory } from './DOMFactory.js';

// Domain-specific adapters
import { GmailDOMAdapter } from './GmailDOMAdapter.js';

// Specialized operation modules
import { FilterDOMOperations } from './FilterDOMOperations.js';
import { ToolbarDOMOperations } from './ToolbarDOMOperations.js';
import { ObserverDOMOperations } from './ObserverDOMOperations.js';

// Re-export all components
export {
  DOMManager,
  DOMCache,
  DOMQueue,
  DOMFactory,
  GmailDOMAdapter,
  FilterDOMOperations,
  ToolbarDOMOperations,
  ObserverDOMOperations
};

// Interfaces and constants
export * from './interfaces.js';

/**
 * Create a pre-configured Gmail DOM abstraction instance
 * @param {Object} [options={}] - Configuration options
 * @returns {Object} Complete DOM abstraction instance
 */
export function createGmailDOMInstance(options = {}) {
  const factory = new DOMFactory();
  
  // Create Gmail-specific DOM manager
  const domManager = factory.createGmailManager(options.domManager);
  
  // Create specialized operation modules
  const filterOperations = new FilterDOMOperations(domManager, options.filter);
  const toolbarOperations = new ToolbarDOMOperations(domManager, options.toolbar);
  const observerOperations = new ObserverDOMOperations(domManager, options.observer);
  
  return {
    // Core components
    domManager,
    
    // Specialized operations
    filterOperations,
    toolbarOperations,
    observerOperations,
    
    // Convenience methods
    getStats() {
      return {
        domManager: domManager.getStats(),
        filter: filterOperations.getPerformanceStats(),
        toolbar: toolbarOperations.getPerformanceStats(),
        observer: observerOperations.getPerformanceStats()
      };
    },
    
    cleanup() {
      domManager.cleanup();
      filterOperations.cleanup();
      toolbarOperations.cleanup();
      observerOperations.cleanup();
    },
    
    destroy() {
      domManager.destroy();
      filterOperations.destroy();
      toolbarOperations.destroy();
      observerOperations.destroy();
    }
  };
}

/**
 * Create a test DOM abstraction instance with mocked components
 * @param {Object} [options={}] - Configuration options
 * @returns {Object} Test DOM abstraction instance
 */
export function createTestDOMInstance(options = {}) {
  const factory = new DOMFactory();
  
  // Create test DOM manager
  const domManager = factory.createTestManager(options.domManager);
  
  // Create operation modules with test configuration
  const filterOperations = new FilterDOMOperations(domManager, {
    enablePerformanceMonitoring: false,
    enableDebugMode: true,
    ...options.filter
  });
  
  const toolbarOperations = new ToolbarDOMOperations(domManager, {
    enablePerformanceMonitoring: false,
    enableAnimations: false,
    ...options.toolbar
  });
  
  const observerOperations = new ObserverDOMOperations(domManager, {
    enablePerformanceMonitoring: false,
    defaultTimeout: 1000,
    ...options.observer
  });
  
  return {
    domManager,
    filterOperations,
    toolbarOperations,
    observerOperations,
    
    getStats() {
      return {
        domManager: domManager.getStats(),
        filter: filterOperations.getPerformanceStats(),
        toolbar: toolbarOperations.getPerformanceStats(),
        observer: observerOperations.getPerformanceStats()
      };
    },
    
    cleanup() {
      domManager.cleanup();
      filterOperations.cleanup();
      toolbarOperations.cleanup();
      observerOperations.cleanup();
    },
    
    destroy() {
      domManager.destroy();
      filterOperations.destroy();
      toolbarOperations.destroy();
      observerOperations.destroy();
    }
  };
}

/**
 * DOM abstraction initialization for Chrome extensions
 * @param {Object} [options={}] - Initialization options
 * @returns {Promise<Object>} Initialized DOM abstraction instance
 */
export async function initializeDOMAbstraction(options = {}) {
  try {
    // Detect environment (Gmail vs other)
    const isGmail = window.location.hostname.includes('mail.google.com');
    
    if (isGmail) {
      console.log('Initializing Gmail DOM abstraction');
      const instance = createGmailDOMInstance(options);
      
      // Wait for initial DOM readiness
      if (document.readyState !== 'complete') {
        await new Promise(resolve => {
          window.addEventListener('load', resolve);
        });
      }
      
      return {
        success: true,
        instance,
        environment: 'gmail'
      };
    } else {
      console.log('Initializing generic DOM abstraction');
      const instance = createTestDOMInstance(options);
      
      return {
        success: true,
        instance,
        environment: 'generic'
      };
    }
    
  } catch (error) {
    console.error('DOM abstraction initialization failed:', error);
    
    return {
      success: false,
      error: error.message,
      fallbackInstance: createTestDOMInstance(options)
    };
  }
}

/**
 * Get DOM abstraction version and feature information
 * @returns {Object} Version and feature information
 */
export function getDOMAbstractionInfo() {
  return {
    version: '1.0.0',
    features: [
      'Gmail DOM Adapter',
      'Performance Optimized Operations',
      'Intelligent Caching',
      'Batched Operations',
      'Error Recovery',
      'MutationObserver Management',
      'ARIA Compliance',
      'Legacy Compatibility'
    ],
    components: [
      'DOMManager',
      'DOMCache', 
      'DOMQueue',
      'DOMFactory',
      'GmailDOMAdapter',
      'FilterDOMOperations',
      'ToolbarDOMOperations',
      'ObserverDOMOperations'
    ]
  };
}

// Legacy compatibility - provide global access for migration period
if (typeof window !== 'undefined') {
  window.DOMAbstraction = {
    createGmailDOMInstance,
    createTestDOMInstance,
    initializeDOMAbstraction,
    getDOMAbstractionInfo,
    // Individual exports for direct access
    DOMManager,
    DOMCache,
    DOMQueue,
    DOMFactory,
    GmailDOMAdapter,
    FilterDOMOperations,
    ToolbarDOMOperations,
    ObserverDOMOperations
  };
}