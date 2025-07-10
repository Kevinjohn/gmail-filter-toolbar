/**
 * Legacy Filter Adapter Module
 * 
 * Provides backward compatibility interface for the existing filter.js module.
 * Allows seamless migration from the old filter system to the new composable architecture.
 * 
 * @module LegacyFilterAdapter
 */

// Removed unused FilterSystem import - only used in JSDoc
import { MODES } from '../state.js';

/**
 * Create a legacy-compatible filter interface
 * @param {FilterSystem} filterSystem - The new filter system instance
 * @returns {Object} Legacy-compatible filter interface
 */
export function createLegacyFilterInterface(filterSystem) {
  // Ensure system is available
  if (!filterSystem) {
    throw new Error('FilterSystem instance required for legacy adapter');
  }

  return {
    /**
     * Legacy function: Check if email row is a calendar event
     * @param {Element} row - Email row element
     * @param {Object} chromeApi - Chrome API instance
     * @returns {boolean} True if calendar event
     */
    isCalendarRow(row, chromeApi = chrome) {
      try {
        const context = filterSystem.context || {
          configurationManager: window.configurationManager,
          getSelector: window.getSelector || ((sel) => `[data-${sel}]`),
          chromeApi
        };
        
        return filterSystem.filterEngine.context 
          ? filterSystem.filterEngine.getRules().find(r => r.id === 'calendar_predicate')?.predicate(row, context) || false
          : false;
      } catch (error) {
        console.warn('Legacy isCalendarRow fallback:', error);
        // Fallback to basic logic
        const hasIcs = !!row.querySelector('[data-ics-image]');
        const calendarEventAltText = chromeApi.i18n.getMessage('alt_calendar_event');
        const hasCalendarEventIcon = !!row.querySelector(`img[alt="${calendarEventAltText}"]`);
        return hasIcs || hasCalendarEventIcon;
      }
    },

    /**
     * Legacy function: Check if email row has Google Doc attachments
     * @param {Element} row - Email row element
     * @returns {boolean} True if has Google Doc attachments
     */
    isGoogleDocAttachment(row) {
      try {
        // Context setup for compatibility - might be used in future iterations
        filterSystem.context || {
          configurationManager: window.configurationManager,
          getSelector: window.getSelector || ((sel) => `[data-${sel}]`)
        };
        
        const attachmentChips = row.querySelectorAll('[data-attachment-chip]');
        for (const chip of attachmentChips) {
          const gdriveLink = chip.getAttribute('data-docurl');
          if (gdriveLink && gdriveLink.includes('google.com')) {
            return true;
          }
        }
        return false;
      } catch (error) {
        console.warn('Legacy isGoogleDocAttachment error:', error);
        return false;
      }
    },

    /**
     * Legacy function: Check if email row has attachments
     * @param {Element} row - Email row element
     * @returns {boolean} True if has attachments
     */
    hasAttachmentRow(row) {
      try {
        const context = filterSystem.context || {
          configurationManager: window.configurationManager,
          getSelector: window.getSelector || ((sel) => `[data-${sel}]`)
        };
        
        // Use new system if available
        if (filterSystem.filterEngine.context) {
          const attachmentRule = filterSystem.filterEngine.getRules().find(r => r.id === 'attachment_predicate');
          return attachmentRule?.predicate(row, context) || false;
        }
        
        // Fallback logic
        const hasBywClass = row.classList.contains('byp') || row.classList.contains('byw');
        const hasAttachmentTooltip = !!row.querySelector('[data-tooltip*="attachment"]');
        const hasPaperclipIcon = !!row.querySelector('[data-attachment-icon]');
        const hasGoogleDoc = this.isGoogleDocAttachment(row);
        
        return hasBywClass || hasAttachmentTooltip || hasPaperclipIcon || hasGoogleDoc;
      } catch (error) {
        console.warn('Legacy hasAttachmentRow error:', error);
        return false;
      }
    },

    /**
     * Legacy function: Check if email row is starred
     * @param {Element} row - Email row element
     * @param {Object} chromeApi - Chrome API instance
     * @returns {boolean} True if starred
     */
    isFavouriteRow(row, chromeApi = chrome) {
      try {
        const starredAltText = chromeApi.i18n.getMessage('alt_starred');
        return !!row.querySelector(`span[data-tooltip="${starredAltText}"]`);
      } catch (error) {
        console.warn('Legacy isFavouriteRow error:', error);
        return false;
      }
    },

    /**
     * Legacy function: Check if email row has specific attachment type
     * @param {Element} row - Email row element
     * @param {string} attachmentType - Attachment type
     * @returns {boolean} True if has specific attachment type
     */
    hasSpecificAttachmentType(row, attachmentType) {
      try {
        const context = filterSystem.context || {
          configurationManager: window.configurationManager,
          getSelector: window.getSelector || ((sel) => `[data-${sel}]`)
        };
        
        // Use new system if available
        if (filterSystem.filterEngine.context) {
          const typeRule = filterSystem.filterEngine.getRules().find(r => 
            r.metadata?.mode === attachmentType
          );
          return typeRule ? !typeRule.predicate(row, context) : false; // Rules hide elements, so invert
        }
        
        // Fallback logic would go here
        return false;
      } catch (error) {
        console.warn('Legacy hasSpecificAttachmentType error:', error);
        return false;
      }
    },

    /**
     * Legacy function: Apply filter to all email rows
     */
    async applyFilter() {
      try {
        // Get current filter mode from state manager or fallback
        const currentMode = window.stateManager?.get('filterMode') || 
                          localStorage.getItem('gmailCalMode') || 
                          MODES.ALL;
        
        // Apply filter using new system
        const result = await filterSystem.applyFilter(currentMode, {
          useCache: true,
          debugMode: window.stateManager?.get('debugMode') || false
        });
        
        if (!result.success) {
          console.error('Filter application failed:', result.errors);
        }
        
        return result;
      } catch (error) {
        console.error('Legacy applyFilter error:', error);
        
        // Fallback to basic DOM manipulation
        try {
          const emailRows = document.querySelectorAll('[data-email-row], .email-row, tr[data-thread-id]');
          emailRows.forEach(row => {
            row.style.display = '';
            row.style.background = '';
            row.style.opacity = '';
          });
        } catch (fallbackError) {
          console.error('Fallback filter application failed:', fallbackError);
        }
      }
    },

    /**
     * Get filter function for backward compatibility
     * @param {string} mode - Filter mode
     * @returns {Function} Filter function
     */
    getFilterFunction(mode) {
      try {
        return filterSystem.filterEngine.getFilterFunction(mode);
      } catch (error) {
        console.warn('Legacy getFilterFunction error:', error);
        return () => false; // Default to show all
      }
    },

    /**
     * Get performance statistics in legacy format
     * @returns {Object} Performance stats
     */
    getPerformanceStats() {
      try {
        const stats = filterSystem.getPerformanceStats();
        
        // Convert to legacy format
        return {
          lastFilterTime: stats.performance?.lastFilterTime || 0,
          averageTime: stats.performance?.summary?.averageDuration || 0,
          successRate: stats.performance?.summary?.successRate || 1,
          cacheHitRate: stats.cache?.hitRate || 0
        };
      } catch (error) {
        console.warn('Legacy getPerformanceStats error:', error);
        return {
          lastFilterTime: 0,
          averageTime: 0,
          successRate: 1,
          cacheHitRate: 0
        };
      }
    },

    /**
     * Legacy reset function
     */
    async resetFilter() {
      try {
        return await filterSystem.resetFilters();
      } catch (error) {
        console.error('Legacy resetFilter error:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Expose new system for advanced usage
     */
    get _newFilterSystem() {
      return filterSystem;
    },

    /**
     * Check if new system is available and working
     * @returns {boolean} True if new system is available
     */
    isNewSystemAvailable() {
      return filterSystem && filterSystem.isInitialized;
    },

    /**
     * Migration helper - get recommendations for updating code
     * @returns {Array<string>} Migration recommendations
     */
    getMigrationRecommendations() {
      return [
        'Replace direct filter function calls with filterSystem.applyFilter(mode)',
        'Use filterSystem.addCustomRule() instead of modifying filter logic directly',
        'Access performance stats via filterSystem.getPerformanceStats()',
        'Consider using the new caching and monitoring features',
        'Update state subscriptions to use the integrated state management'
      ];
    }
  };
}

/**
 * Create a drop-in replacement for the old filter module
 * @param {FilterSystem} filterSystem - Filter system instance
 * @param {Object} stateManager - State manager instance
 * @returns {Object} Complete legacy interface
 */
export function createDropInReplacement(filterSystem, stateManager) {
  const legacyInterface = createLegacyFilterInterface(filterSystem);
  
  // Add automatic state subscription for seamless integration
  if (stateManager) {
    stateManager.subscribe('stateChanged:filterMode', async ({ value: _value }) => {
      try {
        await legacyInterface.applyFilter();
      } catch (error) {
        console.error('Auto filter application failed:', error);
      }
    });

    stateManager.subscribe('stateChanged:debugMode', async () => {
      try {
        await legacyInterface.applyFilter();
      } catch (error) {
        console.error('Debug mode filter update failed:', error);
      }
    });
  }
  
  return legacyInterface;
}

/**
 * Gradual migration helper - allows mixed usage of old and new systems
 * @param {FilterSystem} filterSystem - New filter system
 * @param {Object} oldFilterModule - Old filter module
 * @returns {Object} Hybrid interface
 */
export function createHybridInterface(filterSystem, oldFilterModule) {
  const legacyInterface = createLegacyFilterInterface(filterSystem);
  
  return {
    ...legacyInterface,
    
    // Provide both old and new implementations
    applyFilter: {
      legacy: oldFilterModule.applyFilter,
      new: legacyInterface.applyFilter,
      hybrid: async function(useNew = true) {
        if (useNew && filterSystem.isInitialized) {
          return await legacyInterface.applyFilter();
        } else {
          return oldFilterModule.applyFilter();
        }
      }
    },
    
    // Migration status
    migrationStatus: {
      newSystemAvailable: filterSystem.isInitialized,
      recommendUseNew: true,
      compatibilityMode: true
    }
  };
}