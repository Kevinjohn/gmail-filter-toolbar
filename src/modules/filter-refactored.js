/**
 * Filter Module (Refactored with DOM Abstraction)
 * 
 * Business logic for email filtering separated from DOM operations.
 * Uses DOM abstraction layer for all DOM interactions.
 */

import { MODES } from './state.js';
import { stateManager } from './stateManager.js';
import { configurationManager } from './configurationManager.js';

export class FilterManager {
  /**
   * @param {Object} domOperations - Filter DOM operations instance
   * @param {Object} [options={}] - Configuration options
   */
  constructor(domOperations, options = {}) {
    this.domOperations = domOperations;
    this.options = {
      enablePerformanceMonitoring: true,
      enableDebugMode: false,
      batchSize: 20,
      ...options
    };
    
    // Filter state tracking
    this.lastFilterMode = null;
    this.lastFilterTime = 0;
    this.filteredElementsCount = 0;
    
    // Performance tracking
    this.performanceTarget = 50; // 50ms target as per architecture
    
    // Bind methods to preserve context
    this.applyFilter = this.applyFilter.bind(this);
    
    // Set up state subscriptions
    this.setupStateSubscriptions();
  }

  /**
   * Apply current filter to all email rows
   * @param {Object} [options={}] - Filter options
   * @returns {Promise<Object>} Filter result
   */
  async applyFilter(options = {}) {
    const startTime = performance.now();
    
    try {
      const currentMode = stateManager.get('filterMode');
      const debugMode = stateManager.get('debugMode') || this.options.enableDebugMode;
      
      // Get filter function for current mode
      const filterFn = this.getFilterFunction(currentMode);
      if (!filterFn) {
        throw new Error(`No filter function found for mode: ${currentMode}`);
      }

      // Find all email rows
      const emailRowsResult = await this.domOperations.domManager.selectAll(
        configurationManager.getSelector('emailRow'),
        {
          fallbackSelectors: [
            'tr[role="row"]',
            '[data-thread-id]',
            '.zA',
            'tr.yW'
          ],
          timeout: 5000
        }
      );

      if (!emailRowsResult.success || !emailRowsResult.data.length) {
        console.warn('No email rows found to filter');
        return {
          success: true,
          elementsProcessed: 0,
          executionTime: performance.now() - startTime,
          mode: currentMode
        };
      }

      const emailRows = Array.from(emailRowsResult.data);

      // Apply visibility filter using DOM operations
      const filterResult = await this.domOperations.applyVisibilityFilter(
        emailRows,
        filterFn,
        {
          debugMode,
          batchSize: this.options.batchSize,
          priority: 2, // High priority for user-initiated filtering
          animate: options.animate || false
        }
      );

      if (!filterResult.success) {
        throw new Error('Filter application failed');
      }

      // Update internal state
      this.lastFilterMode = currentMode;
      this.lastFilterTime = filterResult.executionTime;
      this.filteredElementsCount = filterResult.stats.hidden;

      // Check performance target
      const meetsTarget = filterResult.executionTime < this.performanceTarget;
      if (!meetsTarget && this.options.enablePerformanceMonitoring) {
        console.warn(`Filter performance target missed: ${filterResult.executionTime}ms > ${this.performanceTarget}ms`);
      }

      const totalExecutionTime = performance.now() - startTime;

      return {
        success: true,
        mode: currentMode,
        stats: filterResult.stats,
        executionTime: totalExecutionTime,
        filterExecutionTime: filterResult.executionTime,
        meetsPerformanceTarget: meetsTarget,
        elementsProcessed: emailRows.length
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      console.error('Filter application failed:', error);
      
      return {
        success: false,
        error: error.message,
        executionTime,
        mode: stateManager.get('filterMode')
      };
    }
  }

  /**
   * Reset filter to show all emails
   * @param {Object} [options={}] - Reset options
   * @returns {Promise<Object>} Reset result
   */
  async resetFilter(options = {}) {
    try {
      // Set filter mode to ALL
      await stateManager.set('filterMode', MODES.ALL);
      
      // Apply the reset filter
      return await this.applyFilter(options);

    } catch (error) {
      console.error('Filter reset failed:', error);
      throw error;
    }
  }

  /**
   * Toggle debug mode for visual filter indicators
   * @param {boolean} [enabled] - Whether to enable debug mode
   * @returns {Promise<Object>} Toggle result
   */
  async toggleDebugMode(enabled = null) {
    try {
      const newDebugMode = enabled !== null ? enabled : !stateManager.get('debugMode');
      
      await stateManager.set('debugMode', newDebugMode);
      
      // Reapply current filter with new debug mode
      const filterResult = await this.applyFilter();
      
      return {
        success: true,
        debugMode: newDebugMode,
        filterResult
      };

    } catch (error) {
      console.error('Debug mode toggle failed:', error);
      throw error;
    }
  }

  /**
   * Get filter statistics and performance metrics
   * @returns {Object} Filter statistics
   */
  getFilterStats() {
    const domStats = this.domOperations.getPerformanceStats();
    
    return {
      lastFilterMode: this.lastFilterMode,
      lastFilterTime: this.lastFilterTime,
      filteredElementsCount: this.filteredElementsCount,
      performanceTarget: this.performanceTarget,
      meetsPerformanceTarget: this.lastFilterTime < this.performanceTarget,
      domOperationStats: domStats,
      currentMode: stateManager.get('filterMode'),
      debugMode: stateManager.get('debugMode')
    };
  }

  // ========== Filter Logic Methods ==========

  /**
   * Get filter function for a specific mode
   * @param {string} mode - The filter mode
   * @returns {Function|null} The filter function that returns true to hide the row
   */
  getFilterFunction(mode) {
    const filterFunctions = {
      [MODES.ALL]: () => false, // Show all emails
      [MODES.EMAIL]: (row) => this.isCalendarRow(row), // Hide calendar events
      [MODES.CALENDAR]: (row) => !this.isCalendarRow(row), // Hide non-calendar emails
      [MODES.ATTACH]: (row) => !this.hasAttachmentRow(row) || this.isCalendarRow(row), // Hide emails without attachments, but show calendar events
      [MODES.FAVOURITES]: (row) => !this.isFavouriteRow(row), // Hide non-starred emails
      [MODES.IMAGE]: (row) => !this.hasSpecificAttachmentType(row, MODES.IMAGE), // Hide emails without image attachments
      [MODES.PDF]: (row) => !this.hasSpecificAttachmentType(row, MODES.PDF), // Hide emails without PDF attachments
      [MODES.DOCUMENT]: (row) => !this.hasSpecificAttachmentType(row, MODES.DOCUMENT), // Hide emails without document attachments
      [MODES.SPREADSHEET]: (row) => !this.hasSpecificAttachmentType(row, MODES.SPREADSHEET), // Hide emails without spreadsheet attachments
      [MODES.PRESENTATION]: (row) => !this.hasSpecificAttachmentType(row, MODES.PRESENTATION) // Hide emails without presentation attachments
    };

    return filterFunctions[mode] || (() => false); // Default to showing all
  }

  /**
   * Check if email row is a calendar event
   * @param {Element} row - Email row element
   * @returns {boolean} True if row is a calendar event
   */
  isCalendarRow(row) {
    try {
      const hasIcs = !!row.querySelector(configurationManager.getSelector('icsImage'));
      
      const calendarEventAltText = chrome.i18n.getMessage('alt_calendar_event');
      const hasCalendarEventIcon = !!row.querySelector(`img[alt="${calendarEventAltText}"]`);
      
      return hasIcs || hasCalendarEventIcon;
    } catch (error) {
      console.warn('Error checking calendar row:', error);
      return false;
    }
  }

  /**
   * Check if email row has Google Doc attachment
   * @param {Element} row - Email row element
   * @returns {boolean} True if has Google Doc attachment
   */
  isGoogleDocAttachment(row) {
    try {
      const attachmentChips = row.querySelectorAll(configurationManager.getSelector('attachmentChip'));
      
      for (const chip of attachmentChips) {
        const gdriveLink = chip.getAttribute('data-docurl');
        if (gdriveLink && gdriveLink.includes('google.com')) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn('Error checking Google Doc attachment:', error);
      return false;
    }
  }

  /**
   * Check if email row has any attachment
   * @param {Element} row - Email row element
   * @returns {boolean} True if has attachment
   */
  hasAttachmentRow(row) {
    try {
      const attachmentRowClass = configurationManager.getClassName('attachmentRowClass');
      const hasBywClass = row.classList.contains(attachmentRowClass);
      
      const hasAttachmentTooltip = !!row.querySelector(configurationManager.getSelector('attachmentTooltip'));
      const hasPaperclipIcon = !!row.querySelector(configurationManager.getSelector('attachmentIcon'));
      
      return hasBywClass || hasAttachmentTooltip || hasPaperclipIcon || this.isGoogleDocAttachment(row);
    } catch (error) {
      console.warn('Error checking attachment row:', error);
      return false;
    }
  }

  /**
   * Check if email row is starred/favourite
   * @param {Element} row - Email row element
   * @returns {boolean} True if row is starred
   */
  isFavouriteRow(row) {
    try {
      const starredAltText = chrome.i18n.getMessage('alt_starred');
      return !!row.querySelector(`span[data-tooltip="${starredAltText}"]`);
    } catch (error) {
      console.warn('Error checking favourite row:', error);
      return false;
    }
  }

  /**
   * Check if email row has specific attachment type
   * @param {Element} row - Email row element
   * @param {string} attachmentType - Attachment type key
   * @returns {boolean} True if has specific attachment type
   */
  hasSpecificAttachmentType(row, attachmentType) {
    try {
      const config = configurationManager.getAttachmentTypeConfig(attachmentType);
      if (!config) return false;

      const attachmentChips = row.querySelectorAll(configurationManager.getSelector('attachmentChip'));

      for (const chip of attachmentChips) {
        // Check for standard attachments by file extension
        const title = chip.getAttribute('title') || chip.querySelector('span')?.textContent;
        if (title) {
          const parts = title.split('.');
          const extension = parts.length > 1 ? parts.pop().toLowerCase() : '';
          if (config.extensions.includes(extension)) {
            return true;
          }
        }

        // Check for Google Drive attachments by image src
        const gdriveLink = chip.getAttribute('data-docurl');
        if (gdriveLink && gdriveLink.includes('google.com')) {
          const img = chip.querySelector('img');
          if (img && img.src.includes(config.gdriveIdentifier)) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.warn('Error checking specific attachment type:', error);
      return false;
    }
  }

  // ========== Helper Methods ==========

  /**
   * Set up state subscriptions for automatic filtering
   */
  setupStateSubscriptions() {
    // Subscribe to filter mode changes
    stateManager.subscribe('stateChanged:filterMode', () => {
      this.applyFilter().catch(error => {
        console.error('Error applying filter on state change:', error);
      });
    });

    // Subscribe to debug mode changes
    stateManager.subscribe('stateChanged:debugMode', () => {
      this.applyFilter().catch(error => {
        console.error('Error applying filter on debug mode change:', error);
      });
    });
  }

  /**
   * Get current filter state
   * @returns {Object} Filter state information
   */
  getFilterState() {
    return {
      currentMode: stateManager.get('filterMode'),
      debugMode: stateManager.get('debugMode'),
      lastFilterMode: this.lastFilterMode,
      lastFilterTime: this.lastFilterTime,
      filteredElementsCount: this.filteredElementsCount,
      performanceTarget: this.performanceTarget
    };
  }

  /**
   * Cleanup filter resources
   */
  cleanup() {
    // Reset any filtered elements
    this.domOperations.resetFilter().catch(error => {
      console.error('Error resetting filter during cleanup:', error);
    });
    
    // Clear state
    this.lastFilterMode = null;
    this.lastFilterTime = 0;
    this.filteredElementsCount = 0;
  }

  /**
   * Destroy filter manager and cleanup all resources
   */
  destroy() {
    this.cleanup();
    this.domOperations = null;
  }
}

// Legacy compatibility functions for backward compatibility during migration
export function isCalendarRow(row, _chromeApi = chrome) {
  console.warn('Legacy isCalendarRow called - consider migrating to FilterManager');
  // For now, create a temporary filter manager to handle the call
  const dummyDomOps = { domManager: { selectAll: () => ({ success: false, data: [] }) } };
  const filterManager = new FilterManager(dummyDomOps);
  return filterManager.isCalendarRow(row);
}

export function isGoogleDocAttachment(row) {
  console.warn('Legacy isGoogleDocAttachment called - consider migrating to FilterManager');
  const dummyDomOps = { domManager: { selectAll: () => ({ success: false, data: [] }) } };
  const filterManager = new FilterManager(dummyDomOps);
  return filterManager.isGoogleDocAttachment(row);
}

export function hasAttachmentRow(row) {
  console.warn('Legacy hasAttachmentRow called - consider migrating to FilterManager');
  const dummyDomOps = { domManager: { selectAll: () => ({ success: false, data: [] }) } };
  const filterManager = new FilterManager(dummyDomOps);
  return filterManager.hasAttachmentRow(row);
}

export function isFavouriteRow(row, _chromeApi = chrome) {
  console.warn('Legacy isFavouriteRow called - consider migrating to FilterManager');
  const dummyDomOps = { domManager: { selectAll: () => ({ success: false, data: [] }) } };
  const filterManager = new FilterManager(dummyDomOps);
  return filterManager.isFavouriteRow(row);
}

export function hasSpecificAttachmentType(row, attachmentType) {
  console.warn('Legacy hasSpecificAttachmentType called - consider migrating to FilterManager');
  const dummyDomOps = { domManager: { selectAll: () => ({ success: false, data: [] }) } };
  const filterManager = new FilterManager(dummyDomOps);
  return filterManager.hasSpecificAttachmentType(row, attachmentType);
}

export function applyFilter() {
  console.warn('Legacy applyFilter called - consider migrating to FilterManager');
  // This would require a global filter manager instance
}