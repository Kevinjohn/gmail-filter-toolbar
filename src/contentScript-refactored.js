/**
 * Content Script (Refactored with DOM Abstraction)
 * 
 * Updated content script that uses the DOM abstraction layer for all DOM operations.
 * Maintains backward compatibility while leveraging the new architecture.
 */

import { SHOW_BUTTON_TEXT_KEY } from './modules/constants.js';
import { KEY_DEBUG } from './modules/state.js';
import { stateManager } from './modules/stateManager.js';
import { configurationManager, getSelector } from './modules/configurationManager.js';
import { validateMode } from './modules/utils/validation.js';

// Import DOM abstraction layer
import { initializeDOMAbstraction } from './modules/dom/index.js';

// Import refactored business logic modules
import { ToolbarManager } from './modules/toolbar-refactored.js';
import { FilterManager } from './modules/filter-refactored.js';
import { ObserverManager } from './modules/observer-refactored.js';

/**
 * Global instances for the extension managers
 */
let domInstance = null;
let toolbarManager = null;
let filterManager = null;
let observerManager = null;

/**
 * Initialize the extension with DOM abstraction layer
 */
async function initializeExtension() {
  try {
    console.log('Initializing Gmail Calendar Options Extension with DOM abstraction...');
    
    // Initialize DOM abstraction layer
    const domResult = await initializeDOMAbstraction({
      domManager: {
        enablePerformanceMonitoring: true,
        cacheEnabled: true,
        queueEnabled: true
      },
      filter: {
        enablePerformanceMonitoring: true,
        enableDebugMode: false,
        batchSize: 20
      },
      toolbar: {
        enablePerformanceMonitoring: true,
        enableAnimations: true,
        enableKeyboardNavigation: true
      },
      observer: {
        enablePerformanceMonitoring: true,
        defaultTimeout: 10000,
        reconnectDelay: 1000,
        maxReconnectAttempts: 3
      }
    });

    if (!domResult.success) {
      throw new Error(`DOM abstraction initialization failed: ${domResult.error}`);
    }

    domInstance = domResult.instance;
    console.log(`DOM abstraction initialized for ${domResult.environment} environment`);

    // Initialize state and configuration managers
    await Promise.all([
      stateManager.initialize(),
      configurationManager.initialize()
    ]);

    // Create business logic managers with DOM operations
    toolbarManager = new ToolbarManager(domInstance.toolbarOperations, {
      enablePerformanceMonitoring: true,
      enableAnimations: true,
      enableKeyboardNavigation: true
    });

    filterManager = new FilterManager(domInstance.filterOperations, {
      enablePerformanceMonitoring: true,
      enableDebugMode: stateManager.get('debugMode') || false,
      batchSize: 20
    });

    observerManager = new ObserverManager(domInstance.observerOperations, {
      enablePerformanceMonitoring: true,
      defaultTimeout: 10000,
      reconnectDelay: 1000,
      maxReconnectAttempts: 3
    });

    console.log('Business logic managers initialized');

    return {
      success: true,
      domEnvironment: domResult.environment
    };

  } catch (error) {
    console.error('Extension initialization failed:', error);
    throw error;
  }
}

/**
 * Set up Gmail-specific functionality
 */
async function setupGmailFunctionality() {
  try {
    // Wait for Gmail to be ready and find toolbar location
    const gmailToolbarResult = await observerManager.waitForElement(
      configurationManager.getSelector('gmailToolbarContainer') || '.G-atb',
      {
        timeout: 15000,
        fallbackSelectors: [
          '.G-atb',
          '[role="toolbar"]',
          '.nH .nH .no .nH'
        ]
      }
    );

    if (!gmailToolbarResult.success) {
      throw new Error('Gmail toolbar container not found');
    }

    console.log('Gmail toolbar container found');

    // Inject toolbar
    const toolbarResult = await toolbarManager.injectToolbar(gmailToolbarResult.element);
    if (!toolbarResult.success) {
      throw new Error(`Toolbar injection failed: ${toolbarResult.error}`);
    }

    console.log('Toolbar injected successfully');

    // Apply initial state from StateManager
    const showButtonText = stateManager.get('showButtonText');
    await toolbarManager.updateButtonTextView(showButtonText);
    await toolbarManager.refreshUI();

    // Wait for message table to be ready
    const messageTableResult = await observerManager.waitForElement(
      configurationManager.getSelector('emailListContainer') || 'table[role="grid"]',
      {
        timeout: 15000,
        fallbackSelectors: [
          'table[role="grid"]',
          '.F.cf.zt',
          '.Tm .aeF'
        ]
      }
    );

    if (!messageTableResult.success) {
      console.warn('Message table not found, but continuing...');
    } else {
      console.log('Message table found');
    }

    // Apply initial filter
    const initialFilterResult = await filterManager.applyFilter();
    if (initialFilterResult.success) {
      console.log(`Initial filter applied: ${initialFilterResult.mode}, processed ${initialFilterResult.elementsProcessed} elements`);
    } else {
      console.warn('Initial filter application failed:', initialFilterResult.error);
    }

    // Set up content observer for dynamic changes
    const contentObserverResult = await observerManager.setupContentObserver(
      async (mutations) => {
        try {
          // Check if new email rows were added
          const hasNewEmailRows = mutations.some(mutation => 
            Array.from(mutation.addedNodes).some(node => 
              node.nodeType === Node.ELEMENT_NODE &&
              (node.matches && node.matches(configurationManager.getSelector('emailRow') || 'tr[role="row"]') ||
               node.querySelector && node.querySelector(configurationManager.getSelector('emailRow') || 'tr[role="row"]'))
            )
          );

          if (hasNewEmailRows) {
            console.log('New email rows detected, reapplying filter...');
            const refilterResult = await filterManager.applyFilter();
            if (!refilterResult.success) {
              console.warn('Refilter failed:', refilterResult.error);
            }
          }
        } catch (error) {
          console.error('Content observer callback error:', error);
        }
      },
      {
        observerConfig: {
          childList: true,
          subtree: true,
          attributes: false
        }
      }
    );

    if (contentObserverResult.success) {
      console.log('Content observer set up successfully');
    } else {
      console.warn('Content observer setup failed:', contentObserverResult.error);
    }

    // Set up toolbar observer for Gmail navigation changes
    const toolbarObserverResult = await observerManager.setupToolbarObserver(
      async (_mutations) => {
        try {
          console.log('Gmail toolbar changed, refreshing extension UI...');
          await toolbarManager.refreshUI();
        } catch (error) {
          console.error('Toolbar observer callback error:', error);
        }
      }
    );

    if (toolbarObserverResult.success) {
      console.log('Toolbar observer set up successfully');
    } else {
      console.warn('Toolbar observer setup failed:', toolbarObserverResult.error);
    }

    return { success: true };

  } catch (error) {
    console.error('Gmail functionality setup failed:', error);
    throw error;
  }
}

/**
 * Set up event listeners for user interactions
 */
function setupEventListeners() {
  // Listen for button clicks with input validation
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest(getSelector('filterButtons'));
    if (!btn) return;

    try {
      // Validate mode from dataset before using
      const mode = validateMode(btn.dataset.mode, 'ALL');
      await stateManager.set('filterMode', mode);
      
      // Apply filter using the new filter manager
      const filterResult = await filterManager.applyFilter();
      if (filterResult.success) {
        console.log(`Filter applied: ${mode}, processed ${filterResult.elementsProcessed} elements in ${filterResult.executionTime}ms`);
      } else {
        console.error('Filter application failed:', filterResult.error);
      }
      
      // Refresh UI using the new toolbar manager
      await toolbarManager.refreshUI();
      
    } catch (error) {
      console.error('Error updating filter mode:', error);
    }
  });

  // Listen for storage changes (e.g., debug mode or showButtonText toggled in options.html)
  chrome.storage.onChanged.addListener(async (changes) => {
    try {
      if (KEY_DEBUG in changes) {
        await stateManager.set('debugMode', changes[KEY_DEBUG].newValue);
        
        // Apply filter with new debug mode if filter manager is ready
        if (filterManager) {
          const filterResult = await filterManager.applyFilter();
          if (!filterResult.success) {
            console.warn('Filter reapplication failed after debug mode change:', filterResult.error);
          }
        }
      }
      
      if (SHOW_BUTTON_TEXT_KEY in changes) {
        await stateManager.set('showButtonText', changes[SHOW_BUTTON_TEXT_KEY].newValue);
        
        // Update button text view if toolbar manager is ready
        if (toolbarManager) {
          await toolbarManager.updateButtonTextView(changes[SHOW_BUTTON_TEXT_KEY].newValue);
        }
      }
    } catch (error) {
      console.error('Error handling storage changes:', error);
    }
  });

  console.log('Event listeners set up');
}

/**
 * Main initialization function
 */
async function main() {
  try {
    // Initialize the extension
    await initializeExtension();
    console.log('Extension core initialized');

    // Set up event listeners
    setupEventListeners();

    // Set up Gmail-specific functionality
    await setupGmailFunctionality();

    console.log('Gmail Calendar Options Extension fully initialized');

    // Log performance stats
    if (domInstance) {
      const stats = domInstance.getStats();
      console.log('DOM Abstraction Performance Stats:', stats);
    }

  } catch (error) {
    console.error('Extension initialization failed:', error);
    
    // Attempt cleanup if partially initialized
    if (domInstance) {
      domInstance.cleanup();
    }
  }
}

/**
 * Cleanup function for extension unload
 */
function cleanup() {
  try {
    if (toolbarManager) {
      toolbarManager.destroy();
      toolbarManager = null;
    }
    
    if (filterManager) {
      filterManager.destroy();
      filterManager = null;
    }
    
    if (observerManager) {
      observerManager.destroy();
      observerManager = null;
    }
    
    if (domInstance) {
      domInstance.destroy();
      domInstance = null;
    }
    
    console.log('Extension cleanup completed');
  } catch (error) {
    console.error('Extension cleanup error:', error);
  }
}

// Handle page unload
window.addEventListener('beforeunload', cleanup);

// Export for testing and debugging
if (typeof window !== 'undefined') {
  window.GmailCalendarOptionsExtension = {
    toolbarManager,
    filterManager,
    observerManager,
    domInstance,
    getStats: () => domInstance?.getStats(),
    cleanup
  };
}

// Start the extension
main();