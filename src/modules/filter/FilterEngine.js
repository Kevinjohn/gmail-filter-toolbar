/**
 * Filter Engine Module
 * 
 * Implements composable filter rule system with strategy pattern.
 * Enables chaining and combining of filter rules for flexible email filtering.
 * 
 * @module FilterEngine
 */

import { MODES } from '../state.js';
import {
  isCalendarRow,
  hasAttachmentRow,
  isFavouriteRow,
  andPredicates,
  orPredicates,
  notPredicate,
  ATTACHMENT_PREDICATES,
  createSafePredicate,
  createPerformancePredicate
} from './FilterPredicates.js';

/**
 * @typedef {Object} FilterRule
 * @property {string} id - Unique identifier for the rule
 * @property {string} name - Human-readable name
 * @property {Function} predicate - Filter predicate function
 * @property {string} strategy - Filter strategy ('hide', 'show', 'highlight')
 * @property {number} priority - Rule priority (higher = more important)
 * @property {boolean} enabled - Whether the rule is active
 * @property {Object} metadata - Additional rule metadata
 */

/**
 * @typedef {Object} FilterContext
 * @property {Object} configurationManager - Configuration manager instance
 * @property {Function} getSelector - Function to get DOM selectors
 * @property {Object} chromeApi - Chrome API instance for i18n
 * @property {boolean} debugMode - Whether debug mode is active
 */

/**
 * Filter Engine class implementing the strategy pattern for composable filtering
 */
export class FilterEngine {
  constructor() {
    /** @type {Map<string, FilterRule>} */
    this.rules = new Map();
    
    /** @type {Array<FilterRule>} */
    this.activeRules = [];
    
    /** @type {FilterContext|null} */
    this.context = null;
    
    /** @type {Map<string, Function>} */
    this.strategies = new Map();
    
    /** @type {Map<string, number>} */
    this.performanceMetrics = new Map();
    
    // Initialize default strategies
    this.initializeStrategies();
    
    // Initialize default rules
    this.initializeDefaultRules();
  }

  /**
   * Initialize the filter engine with context
   * @param {FilterContext} context - Filter execution context
   */
  initialize(context) {
    if (!context) {
      throw new Error('Filter context is required');
    }
    
    this.context = context;
    console.log('FilterEngine initialized with context');
  }

  /**
   * Add a new filter rule
   * @param {FilterRule} rule - The filter rule to add
   * @returns {FilterEngine} Returns this for chaining
   */
  addRule(rule) {
    if (!this.validateRule(rule)) {
      throw new Error('Invalid filter rule provided');
    }
    
    // Wrap predicate with safety and performance monitoring
    const safePredicate = createSafePredicate(rule.predicate);
    const perfPredicate = createPerformancePredicate(safePredicate, rule.name);
    
    const enhancedRule = {
      ...rule,
      predicate: perfPredicate,
      createdAt: Date.now()
    };
    
    this.rules.set(rule.id, enhancedRule);
    this.updateActiveRules();
    
    console.log(`Filter rule added: ${rule.name} (${rule.id})`);
    return this;
  }

  /**
   * Remove a filter rule
   * @param {string} ruleId - ID of the rule to remove
   * @returns {FilterEngine} Returns this for chaining
   */
  removeRule(ruleId) {
    if (this.rules.has(ruleId)) {
      this.rules.delete(ruleId);
      this.updateActiveRules();
      console.log(`Filter rule removed: ${ruleId}`);
    }
    return this;
  }

  /**
   * Enable or disable a filter rule
   * @param {string} ruleId - ID of the rule to toggle
   * @param {boolean} enabled - Whether the rule should be enabled
   * @returns {FilterEngine} Returns this for chaining
   */
  toggleRule(ruleId, enabled) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.updateActiveRules();
      console.log(`Filter rule ${enabled ? 'enabled' : 'disabled'}: ${ruleId}`);
    }
    return this;
  }

  /**
   * Create a composite rule by combining multiple rules with AND logic
   * @param {string} id - ID for the composite rule
   * @param {string} name - Name for the composite rule
   * @param {Array<string>} ruleIds - IDs of rules to combine
   * @param {Object} [options={}] - Additional options
   * @returns {FilterEngine} Returns this for chaining
   */
  createAndRule(id, name, ruleIds, options = {}) {
    const predicates = ruleIds.map(ruleId => {
      const rule = this.rules.get(ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }
      return rule.predicate;
    });

    const compositeRule = {
      id,
      name,
      predicate: (row, context) => andPredicates(row, predicates, context),
      strategy: options.strategy || 'hide',
      priority: options.priority || 1,
      enabled: options.enabled !== false,
      metadata: {
        type: 'composite_and',
        componentRules: ruleIds,
        ...options.metadata
      }
    };

    return this.addRule(compositeRule);
  }

  /**
   * Create a composite rule by combining multiple rules with OR logic
   * @param {string} id - ID for the composite rule
   * @param {string} name - Name for the composite rule
   * @param {Array<string>} ruleIds - IDs of rules to combine
   * @param {Object} [options={}] - Additional options
   * @returns {FilterEngine} Returns this for chaining
   */
  createOrRule(id, name, ruleIds, options = {}) {
    const predicates = ruleIds.map(ruleId => {
      const rule = this.rules.get(ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }
      return rule.predicate;
    });

    const compositeRule = {
      id,
      name,
      predicate: (row, context) => orPredicates(row, predicates, context),
      strategy: options.strategy || 'hide',
      priority: options.priority || 1,
      enabled: options.enabled !== false,
      metadata: {
        type: 'composite_or',
        componentRules: ruleIds,
        ...options.metadata
      }
    };

    return this.addRule(compositeRule);
  }

  /**
   * Create a negation rule that inverts another rule
   * @param {string} id - ID for the negation rule
   * @param {string} name - Name for the negation rule
   * @param {string} ruleId - ID of rule to negate
   * @param {Object} [options={}] - Additional options
   * @returns {FilterEngine} Returns this for chaining
   */
  createNotRule(id, name, ruleId, options = {}) {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    const negationRule = {
      id,
      name,
      predicate: (row, context) => notPredicate(row, rule.predicate, context),
      strategy: options.strategy || 'hide',
      priority: options.priority || 1,
      enabled: options.enabled !== false,
      metadata: {
        type: 'negation',
        sourceRule: ruleId,
        ...options.metadata
      }
    };

    return this.addRule(negationRule);
  }

  /**
   * Apply all active filter rules to an element
   * @param {Element} element - DOM element to filter
   * @returns {Object} Filter result with actions to perform
   */
  applyFilters(element) {
    if (!this.context) {
      throw new Error('FilterEngine not initialized with context');
    }

    if (!element) {
      return { actions: [], metadata: { rulesApplied: 0, errors: 0 } };
    }

    const startTime = performance.now();
    const actions = [];
    let rulesApplied = 0;
    let errors = 0;

    try {
      // Sort active rules by priority (higher priority first)
      const sortedRules = [...this.activeRules].sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        try {
          const matches = rule.predicate(element, this.context);
          
          if (matches) {
            const strategy = this.strategies.get(rule.strategy);
            if (strategy) {
              const action = strategy(element, rule, this.context);
              actions.push({
                ruleId: rule.id,
                ruleName: rule.name,
                strategy: rule.strategy,
                action
              });
            }
          }
          
          rulesApplied++;
        } catch (error) {
          console.warn(`Error applying rule ${rule.id}:`, error);
          errors++;
        }
      }

      const executionTime = performance.now() - startTime;
      this.recordPerformance('applyFilters', executionTime);

      return {
        actions,
        metadata: {
          rulesApplied,
          errors,
          executionTime,
          element: element.tagName
        }
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordPerformance('applyFilters', executionTime, false);
      
      console.error('Error in applyFilters:', error);
      return {
        actions: [],
        metadata: {
          rulesApplied,
          errors: errors + 1,
          executionTime,
          error: error.message
        }
      };
    }
  }

  /**
   * Get filter function for a specific mode (backward compatibility)
   * @param {string} mode - The filter mode
   * @returns {Function|null} The filter function that returns true to hide the row
   */
  getFilterFunction(mode) {
    if (!this.context) {
      console.warn('FilterEngine not initialized, returning default filter');
      return () => false;
    }

    const ruleId = this.getModeRuleId(mode);
    const rule = this.rules.get(ruleId);
    
    if (!rule) {
      console.warn(`No rule found for mode: ${mode}`);
      return () => false;
    }

    // Return a function that applies the rule's predicate
    return (row) => {
      try {
        return rule.predicate(row, this.context);
      } catch (error) {
        console.warn(`Error applying filter for mode ${mode}:`, error);
        return false;
      }
    };
  }

  /**
   * Get all rules, optionally filtered by criteria
   * @param {Object} [filter={}] - Filter criteria
   * @returns {Array<FilterRule>} Array of matching rules
   */
  getRules(filter = {}) {
    let rules = Array.from(this.rules.values());

    if (filter.enabled !== undefined) {
      rules = rules.filter(rule => rule.enabled === filter.enabled);
    }

    if (filter.strategy) {
      rules = rules.filter(rule => rule.strategy === filter.strategy);
    }

    if (filter.type) {
      rules = rules.filter(rule => rule.metadata?.type === filter.type);
    }

    return rules;
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance metrics
   */
  getPerformanceStats() {
    const stats = {};
    for (const [operation, times] of this.performanceMetrics) {
      const total = times.reduce((sum, time) => sum + time, 0);
      stats[operation] = {
        count: times.length,
        total,
        average: total / times.length,
        min: Math.min(...times),
        max: Math.max(...times)
      };
    }
    return stats;
  }

  /**
   * Clear all rules
   * @returns {FilterEngine} Returns this for chaining
   */
  clearRules() {
    this.rules.clear();
    this.activeRules = [];
    console.log('All filter rules cleared');
    return this;
  }

  /**
   * Reset to default rules
   * @returns {FilterEngine} Returns this for chaining
   */
  resetToDefaults() {
    this.clearRules();
    this.initializeDefaultRules();
    console.log('Filter rules reset to defaults');
    return this;
  }

  // ========== Private Methods ==========

  /**
   * Initialize filter strategies
   * @private
   */
  initializeStrategies() {
    this.strategies.set('hide', (element, rule, context) => ({
      type: 'setStyle',
      args: {
        element,
        property: 'display',
        value: context.debugMode ? '' : 'none'
      }
    }));

    this.strategies.set('show', (element, _rule, _context) => ({
      type: 'setStyle',
      args: {
        element,
        property: 'display',
        value: ''
      }
    }));

    this.strategies.set('highlight', (element, _rule, _context) => ({
      type: 'setStyle',
      args: {
        element,
        property: 'background',
        value: 'rgba(255, 235, 59, 0.3)'
      }
    }));

    this.strategies.set('debug', (element, _rule, _context) => ({
      type: 'setStyle',
      args: {
        element,
        property: 'background',
        value: 'rgba(0, 123, 255, 0.15)'
      }
    }));
  }

  /**
   * Initialize default filter rules for backward compatibility
   * @private
   */
  initializeDefaultRules() {
    // Rule for showing all emails
    this.addRule({
      id: 'show_all',
      name: 'Show All Emails',
      predicate: () => false, // Never hide anything
      strategy: 'show',
      priority: 0,
      enabled: true,
      metadata: { mode: MODES.ALL }
    });

    // Rule for hiding calendar events (EMAIL mode)
    this.addRule({
      id: 'hide_calendar',
      name: 'Hide Calendar Events',
      predicate: isCalendarRow,
      strategy: 'hide',
      priority: 1,
      enabled: false,
      metadata: { mode: MODES.EMAIL }
    });

    // Rule for hiding non-calendar emails (CALENDAR mode)
    this.addRule({
      id: 'show_only_calendar',
      name: 'Show Only Calendar Events',
      predicate: (row, context) => !isCalendarRow(row, context),
      strategy: 'hide',
      priority: 1,
      enabled: false,
      metadata: { mode: MODES.CALENDAR }
    });

    // Rule for showing only emails with attachments (ATTACH mode)
    this.addRule({
      id: 'show_only_attachments',
      name: 'Show Only Emails with Attachments',
      predicate: (row, context) => !hasAttachmentRow(row, context) || isCalendarRow(row, context),
      strategy: 'hide',
      priority: 1,
      enabled: false,
      metadata: { mode: MODES.ATTACH }
    });

    // Rule for showing only starred emails (FAVOURITES mode)
    this.addRule({
      id: 'show_only_favourites',
      name: 'Show Only Starred Emails',
      predicate: (row, context) => !isFavouriteRow(row, context),
      strategy: 'hide',
      priority: 1,
      enabled: false,
      metadata: { mode: MODES.FAVOURITES }
    });

    // Rules for specific attachment types
    Object.entries(ATTACHMENT_PREDICATES).forEach(([type, predicate]) => {
      this.addRule({
        id: `show_only_${type.toLowerCase()}`,
        name: `Show Only ${type} Attachments`,
        predicate: (row, context) => !predicate(row, context),
        strategy: 'hide',
        priority: 1,
        enabled: false,
        metadata: { mode: type }
      });
    });
  }

  /**
   * Update the list of active rules
   * @private
   */
  updateActiveRules() {
    this.activeRules = Array.from(this.rules.values()).filter(rule => rule.enabled);
  }

  /**
   * Validate a filter rule
   * @param {FilterRule} rule - Rule to validate
   * @returns {boolean} True if valid
   * @private
   */
  validateRule(rule) {
    return !!(
      rule &&
      typeof rule.id === 'string' &&
      typeof rule.name === 'string' &&
      typeof rule.predicate === 'function' &&
      typeof rule.strategy === 'string' &&
      typeof rule.priority === 'number' &&
      typeof rule.enabled === 'boolean'
    );
  }

  /**
   * Get rule ID for a given mode (backward compatibility)
   * @param {string} mode - Filter mode
   * @returns {string} Rule ID
   * @private
   */
  getModeRuleId(mode) {
    const modeRuleMap = {
      [MODES.ALL]: 'show_all',
      [MODES.EMAIL]: 'hide_calendar',
      [MODES.CALENDAR]: 'show_only_calendar',
      [MODES.ATTACH]: 'show_only_attachments',
      [MODES.FAVOURITES]: 'show_only_favourites',
      [MODES.IMAGE]: 'show_only_image',
      [MODES.PDF]: 'show_only_pdf',
      [MODES.DOCUMENT]: 'show_only_document',
      [MODES.SPREADSHEET]: 'show_only_spreadsheet',
      [MODES.PRESENTATION]: 'show_only_presentation'
    };

    return modeRuleMap[mode] || 'show_all';
  }

  /**
   * Record performance metrics
   * @param {string} operation - Operation name
   * @param {number} time - Execution time in milliseconds
   * @param {boolean} [success=true] - Whether operation succeeded
   * @private
   */
  recordPerformance(operation, time, _success = true) {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    
    const times = this.performanceMetrics.get(operation);
    times.push(time);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
  }
}