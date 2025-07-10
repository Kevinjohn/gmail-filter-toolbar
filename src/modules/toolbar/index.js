/**
 * Toolbar Module - Main Entry Point
 * 
 * Unified interface for the modular toolbar architecture that exports all
 * toolbar components and provides convenient factory functions for creating
 * and managing toolbar instances.
 * 
 * @author Chrome Extension Team
 * @version 1.0.0
 */

// Core Components
import { ToolbarEventBus, toolbarEventBus } from './ToolbarEventBus.js';
import ButtonFactory from './ButtonFactory.js';
import ToolbarRenderer from './ToolbarRenderer.js';
import ToolbarController from './ToolbarController.js';
import { ToolbarStateManager, toolbarStateManager } from './ToolbarStateManager.js';
import ToolbarPluginSystem from './ToolbarPluginSystem.js';

// DOM Operations
import { ToolbarDOMOperations } from '../dom/ToolbarDOMOperations.js';
import { DOMManager } from '../dom/DOMManager.js';

// Configuration and State
import { configurationManager } from '../configurationManager.js';

/**
 * @typedef {Object} ToolbarModuleConfig
 * @property {Element} container - Container element for toolbar
 * @property {Array<Object>} [buttons] - Custom button configurations
 * @property {Object} [domOperations] - Custom DOM operations instance
 * @property {Object} [eventBus] - Custom event bus instance
 * @property {Object} [stateManager] - Custom state manager instance
 * @property {Object} [options] - Additional configuration options
 */

/**
 * @typedef {Object} ToolbarInstance
 * @property {ToolbarController} controller - Main toolbar controller
 * @property {ToolbarRenderer} renderer - Toolbar renderer
 * @property {ButtonFactory} buttonFactory - Button factory
 * @property {ToolbarEventBus} eventBus - Event bus instance
 * @property {ToolbarStateManager} stateManager - State manager
 * @property {ToolbarPluginSystem} pluginSystem - Plugin system
 * @property {ToolbarDOMOperations} domOperations - DOM operations
 */

export class ToolbarModule {
  /**
   * Create a new toolbar instance
   * @param {ToolbarModuleConfig} config - Toolbar configuration
   * @returns {Promise<ToolbarInstance>} Toolbar instance
   */
  static async createToolbar(config) {
    try {
      // Validate configuration
      if (!config.container || !(config.container instanceof Element)) {
        throw new Error('Container element is required');
      }

      // Get or create DOM operations
      const domOperations = config.domOperations || await ToolbarModule._createDOMOperations();
      
      // Get or create event bus
      const eventBus = config.eventBus || toolbarEventBus;
      
      // Get or create state manager
      const stateManager = config.stateManager || toolbarStateManager;
      
      // Initialize state manager if not already initialized
      if (stateManager && !stateManager._isInitialized) {
        await stateManager.initialize();
      }
      
      // Create toolbar controller
      const controller = new ToolbarController(domOperations, {
        enableKeyboardNavigation: true,
        enableStateSync: true,
        enableAutoRefresh: true,
        enableAccessibility: true,
        enableMetrics: true,
        ...config.options
      });
      
      // Get renderer from controller
      const renderer = controller.renderer;
      
      // Get button factory from renderer
      const buttonFactory = renderer.buttonFactory;
      
      // Create plugin system
      const pluginSystem = new ToolbarPluginSystem(controller, {
        enableSandboxing: true,
        enableDependencyResolution: true,
        enableVersionChecking: true,
        enablePermissionChecking: true,
        maxPlugins: 50,
        ...config.options?.pluginSystem
      });
      
      // Get button configurations
      const buttons = config.buttons || await ToolbarModule._getDefaultButtons();
      
      // Initialize toolbar
      const initResult = await controller.initialize({
        container: config.container,
        buttons,
        accessibility: config.accessibility,
        behavior: config.behavior,
        styling: config.styling
      });
      
      if (!initResult.success) {
        throw new Error(`Toolbar initialization failed: ${initResult.error?.message}`);
      }
      
      // Return toolbar instance
      return {
        controller,
        renderer,
        buttonFactory,
        eventBus,
        stateManager,
        pluginSystem,
        domOperations,
        
        // Convenience methods
        refresh: () => controller.refresh(),
        destroy: () => controller.destroy(),
        setVisibility: (visible, options) => controller.setVisibility(visible, options),
        getState: () => controller.getState(),
        getStats: () => ({
          controller: controller.getStats(),
          renderer: renderer.getStats(),
          buttonFactory: buttonFactory.getStats(),
          eventBus: eventBus.getStats(),
          stateManager: stateManager.getStats(),
          pluginSystem: pluginSystem.getStats()
        })
      };
      
    } catch (error) {
      console.error('Failed to create toolbar:', error);
      throw error;
    }
  }

  /**
   * Create toolbar with legacy compatibility
   * @param {Element} container - Container element
   * @param {Object} [options={}] - Legacy options
   * @returns {Promise<Object>} Legacy-compatible toolbar interface
   */
  static async createLegacyToolbar(container, options = {}) {
    try {
      const toolbar = await ToolbarModule.createToolbar({
        container,
        ...options
      });
      
      // Return legacy-compatible interface
      return {
        // Legacy methods
        injectToolbar: () => Promise.resolve(true),
        refreshUI: () => toolbar.refresh(),
        updateButtonTextView: (showText) => {
          return toolbar.stateManager.set('showButtonText', showText);
        },
        
        // Modern interface
        ...toolbar
      };
      
    } catch (error) {
      console.error('Failed to create legacy toolbar:', error);
      throw error;
    }
  }

  /**
   * Get default button configurations from configuration manager
   * @private
   * @returns {Promise<Array<Object>>} Default button configurations
   */
  static async _getDefaultButtons() {
    try {
      // Ensure configuration manager is initialized
      if (configurationManager && !configurationManager._isInitialized) {
        await configurationManager.initialize();
      }
      
      // Get all filter modes from configuration
      const allFilterModes = configurationManager?.getAllFilterModes?.() || {};
      
      // Convert to button configurations
      const buttons = Object.keys(allFilterModes).map(mode => {
        const config = allFilterModes[mode];
        return {
          type: 'toggle',
          mode,
          icon: config.icon || 'help',
          labelKey: config.labelKey || `btn_${mode.toLowerCase()}`,
          tooltip: config.tooltip,
          accessibility: {
            role: 'radio'
          }
        };
      });
      
      // Fallback to default buttons if configuration is not available
      if (buttons.length === 0) {
        return [
          {
            type: 'toggle',
            mode: 'ALL',
            icon: 'mail',
            labelKey: 'btn_all',
            accessibility: { role: 'radio' }
          },
          {
            type: 'toggle',
            mode: 'EMAIL',
            icon: 'email',
            labelKey: 'btn_email',
            accessibility: { role: 'radio' }
          },
          {
            type: 'toggle',
            mode: 'CALENDAR',
            icon: 'event',
            labelKey: 'btn_calendar',
            accessibility: { role: 'radio' }
          }
        ];
      }
      
      return buttons;
      
    } catch (error) {
      console.warn('Failed to get default buttons from configuration:', error);
      
      // Return minimal fallback
      return [
        {
          type: 'toggle',
          mode: 'ALL',
          icon: 'mail',
          labelKey: 'btn_all',
          accessibility: { role: 'radio' }
        }
      ];
    }
  }

  /**
   * Create DOM operations instance
   * @private
   * @returns {Promise<ToolbarDOMOperations>} DOM operations instance
   */
  static async _createDOMOperations() {
    try {
      // Create DOM manager
      const domManager = new DOMManager({
        enableCaching: true,
        enableBatching: true,
        enableMetrics: true,
        enableQueue: true
      });
      
      // Initialize DOM manager
      await domManager.initialize();
      
      // Create toolbar DOM operations
      const domOperations = new ToolbarDOMOperations(domManager);
      
      return domOperations;
      
    } catch (error) {
      console.error('Failed to create DOM operations:', error);
      throw error;
    }
  }

  /**
   * Initialize the toolbar module system
   * @param {Object} [options={}] - Initialization options
   * @returns {Promise<void>}
   */
  static async initialize(options = {}) {
    try {
      // Initialize global state manager
      if (toolbarStateManager && !toolbarStateManager._isInitialized) {
        await toolbarStateManager.initialize();
      }
      
      // Initialize configuration manager if needed
      if (configurationManager && !configurationManager._isInitialized) {
        await configurationManager.initialize();
      }
      
      // Emit module initialization event
      await toolbarEventBus.emit('TOOLBAR_MODULE_INITIALIZED', {
        options,
        timestamp: Date.now()
      });
      
      console.log('Toolbar module initialized successfully');
      
    } catch (error) {
      console.error('Toolbar module initialization failed:', error);
      throw error;
    }
  }

  /**
   * Destroy all toolbar module resources
   * @returns {Promise<void>}
   */
  static async destroy() {
    try {
      // Destroy global state manager
      if (toolbarStateManager) {
        await toolbarStateManager.destroy();
      }
      
      // Reset event bus
      if (toolbarEventBus) {
        toolbarEventBus.reset();
      }
      
      console.log('Toolbar module destroyed successfully');
      
    } catch (error) {
      console.error('Toolbar module destruction failed:', error);
    }
  }

  /**
   * Get module statistics
   * @returns {Object} Module statistics
   */
  static getModuleStats() {
    return {
      eventBus: toolbarEventBus?.getStats?.() || null,
      stateManager: toolbarStateManager?.getStats?.() || null,
      version: '1.0.0',
      timestamp: Date.now()
    };
  }
}

// ========== Direct Exports ==========

// Export individual components
export {
  ToolbarEventBus,
  toolbarEventBus,
  ButtonFactory,
  ToolbarRenderer,
  ToolbarController,
  ToolbarStateManager,
  toolbarStateManager,
  ToolbarPluginSystem
};

// ========== Convenience Functions ==========

/**
 * Create a simple toolbar with minimal configuration
 * @param {Element} container - Container element
 * @param {Object} [options={}] - Options
 * @returns {Promise<ToolbarInstance>} Toolbar instance
 */
export async function createSimpleToolbar(container, options = {}) {
  return await ToolbarModule.createToolbar({
    container,
    options: {
      enableKeyboardNavigation: true,
      enableAccessibility: true,
      enableMetrics: false,
      ...options
    }
  });
}

/**
 * Create a toolbar with plugin support
 * @param {Element} container - Container element
 * @param {Array<Object>} [plugins=[]] - Plugin configurations
 * @param {Object} [options={}] - Options
 * @returns {Promise<ToolbarInstance>} Toolbar instance with plugins
 */
export async function createPluginToolbar(container, plugins = [], options = {}) {
  const toolbar = await ToolbarModule.createToolbar({
    container,
    options: {
      enableKeyboardNavigation: true,
      enableAccessibility: true,
      enableMetrics: true,
      pluginSystem: {
        enableSandboxing: true,
        enableDependencyResolution: true,
        ...options.pluginSystem
      },
      ...options
    }
  });
  
  // Load plugins
  for (const plugin of plugins) {
    try {
      await toolbar.pluginSystem.registerPlugin(plugin);
      await toolbar.pluginSystem.loadPlugin(plugin.id);
    } catch (error) {
      console.error(`Failed to load plugin ${plugin.id}:`, error);
    }
  }
  
  return toolbar;
}

/**
 * Create toolbar with custom buttons
 * @param {Element} container - Container element
 * @param {Array<Object>} buttons - Button configurations
 * @param {Object} [options={}] - Options
 * @returns {Promise<ToolbarInstance>} Toolbar instance
 */
export async function createCustomToolbar(container, buttons, options = {}) {
  return await ToolbarModule.createToolbar({
    container,
    buttons,
    options: {
      enableKeyboardNavigation: true,
      enableAccessibility: true,
      enableMetrics: true,
      ...options
    }
  });
}

// ========== Legacy Compatibility ==========

/**
 * Legacy toolbar creation function for backward compatibility
 * @param {Document} [doc=document] - Document object
 * @param {Element} headerElement - Header element
 * @returns {Promise<void>}
 * @deprecated Use createSimpleToolbar or ToolbarModule.createToolbar instead
 */
export async function injectToolbar(doc = document, headerElement) {
  try {
    console.warn('injectToolbar is deprecated. Use createSimpleToolbar instead.');
    
    const container = headerElement || doc.querySelector('[role="banner"], .gmail-header, #gb');
    if (!container) {
      throw new Error('Could not find suitable container for toolbar');
    }
    
    const toolbar = await createSimpleToolbar(container, {
      enableMetrics: false // Legacy mode with minimal overhead
    });
    
    // Store reference for legacy compatibility
    if (!window.gcalToolbar) {
      window.gcalToolbar = toolbar;
    }
    
  } catch (error) {
    console.error('Legacy toolbar injection failed:', error);
  }
}

/**
 * Legacy UI refresh function
 * @param {Document} [doc=document] - Document object
 * @deprecated Use toolbar.refresh() instead
 */
export async function refreshUI(_doc = document) {
  console.warn('refreshUI is deprecated. Use toolbar.refresh() instead.');
  
  if (window.gcalToolbar) {
    await window.gcalToolbar.refresh();
  }
}

/**
 * Legacy button text view update
 * @param {boolean} showText - Whether to show button text
 * @param {Document} [doc=document] - Document object
 * @deprecated Use toolbar.stateManager.set('showButtonText', value) instead
 */
export async function updateButtonTextView(showText, _doc = document) {
  console.warn('updateButtonTextView is deprecated. Use toolbar.stateManager.set instead.');
  
  if (window.gcalToolbar) {
    await window.gcalToolbar.stateManager.set('showButtonText', showText);
  }
}

// ========== Module Configuration ==========

/**
 * Default module configuration
 */
export const defaultConfig = {
  toolbar: {
    enableKeyboardNavigation: true,
    enableAccessibility: true,
    enableMetrics: true,
    enableStateSync: true,
    enableAutoRefresh: true
  },
  eventBus: {
    enableMetrics: true,
    enableLogging: false,
    maxListeners: 100
  },
  stateManager: {
    enablePersistence: true,
    enableValidation: true,
    enableEventBus: true,
    autoSave: true,
    autoSaveDelay: 500
  },
  pluginSystem: {
    enableSandboxing: true,
    enableDependencyResolution: true,
    enableVersionChecking: true,
    maxPlugins: 50
  }
};

// ========== Module Information ==========

export const moduleInfo = {
  name: 'ToolbarModule',
  version: '1.0.0',
  description: 'Modular toolbar architecture for Gmail Calendar Options',
  author: 'Chrome Extension Team',
  components: [
    'ToolbarEventBus',
    'ButtonFactory', 
    'ToolbarRenderer',
    'ToolbarController',
    'ToolbarStateManager',
    'ToolbarPluginSystem'
  ],
  features: [
    'Event-driven architecture',
    'Plugin system',
    'State management',
    'DOM abstraction',
    'Accessibility support',
    'Keyboard navigation',
    'Performance monitoring'
  ]
};

// Set as default export
export default ToolbarModule;