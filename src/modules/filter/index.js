/**
 * Filter Module Index
 * 
 * Central export module for the composable filter architecture.
 * Provides easy access to all filter components and a unified interface.
 * 
 * @module Filter
 */

// Core filter components
export { FilterEngine } from './FilterEngine.js';
export { FilterApplicator } from './FilterApplicator.js';
export { FilterCache } from './FilterCache.js';
export { FilterPerformanceMonitor } from './FilterPerformanceMonitor.js';

// Predicate functions
export {
  isCalendarRow,
  isGoogleDocAttachment,
  hasAttachmentRow,
  isFavouriteRow,
  hasSpecificAttachmentType,
  andPredicates,
  orPredicates,
  notPredicate,
  createAttachmentTypePredicate,
  ATTACHMENT_PREDICATES,
  validatePredicate,
  createSafePredicate,
  createPerformancePredicate
} from './FilterPredicates.js';

// Unified filter system
export { FilterSystem } from './FilterSystem.js';

// Backward compatibility
export {
  createLegacyFilterInterface,
  createDropInReplacement,
  createHybridInterface
} from './LegacyFilterAdapter.js';