/**
 * State Module - Legacy State Management Integration with StateManager
 *
 * This module provides backward compatibility while migrating to the new StateManager.
 * All state operations now route through the centralized StateManager.
 */

import { stateManager } from './stateManager.js';

// Export state constants (these are still needed by other modules)
export const KEY_MODE = 'gmailCalMode';
export const KEY_DEBUG = 'gmailCalDebug';

export const MODES = {
  ALL: 'ALL',
  EMAIL: 'EMAIL',
  CALENDAR: 'CALENDAR',
  ATTACH: 'ATTACH',
  FAVOURITES: 'FAVOURITES',
  IMAGE: 'IMAGE',
  PDF: 'PDF',
  DOCUMENT: 'DOCUMENT',
  SPREADSHEET: 'SPREADSHEET',
  PRESENTATION: 'PRESENTATION',
};

// State debugging utilities
export function logStateChange(path, oldValue, newValue) {
  if (stateManager.get('debugMode')) {
    console.log(`[StateDebug] ${path}: ${oldValue} → ${newValue}`);
  }
}

export function validateCurrentState() {
  const status = stateManager.getValidationStatus();
  if (!status.isValid) {
    console.warn('State validation failed:', status);
  }
  return status;
}

/**
 * Legacy function - now routes through StateManager
 * @deprecated Use stateManager.set('filterMode', mode) instead
 */
export async function setCurrentMode(mode) {
  await stateManager.set('filterMode', mode);
}

/**
 * Legacy function - now routes through StateManager
 * @deprecated Use stateManager.set('debugMode', value) instead
 */
export async function setDebugOn(value) {
  await stateManager.set('debugMode', value);
}

/**
 * Legacy function - now routes through StateManager
 * @deprecated Use stateManager.initialize() instead
 */
export async function loadState() {
  await stateManager.initialize();
}

/**
 * Legacy function - state is now automatically persisted
 * @deprecated State is automatically saved by StateManager
 */
export async function saveState() {
  // StateManager automatically persists changes, but we can force a save
  // The StateManager handles persistence automatically, so this is effectively a no-op
  return Promise.resolve();
}

// Add state debugging utilities
stateManager.subscribe('stateChanged', ({ path, value, previousState, newState }) => {
  if (stateManager.get('debugMode')) {
    console.log(`[StateManager] Changed ${path}:`, {
      from: previousState,
      to: newState,
      newValue: value
    });
  }
});

// Export debugging function for development
export function dumpState() {
  console.log('Current State:', stateManager.exportState());
  console.log('Validation Status:', stateManager.getValidationStatus());
}
