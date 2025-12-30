/**
 * Unified storage abstraction for cross-browser compatibility.
 *
 * WHY: Safari only supports storage.local (not storage.sync).
 * This module provides a consistent API that:
 * - Uses storage.sync on Chrome/Firefox for cross-device sync
 * - Falls back to storage.local on Safari
 *
 * Chrome and Firefox behavior is unchanged - they continue to use storage.sync.
 *
 * @stable
 */

/**
 * Detect if running in Safari.
 * Safari exposes a global `safari` object that other browsers don't have.
 * @returns {boolean}
 */
export function isSafari() {
  return typeof safari !== 'undefined';
}

/**
 * Get the appropriate storage backend.
 * Returns storage.sync for Chrome/Firefox, storage.local for Safari.
 * @returns {chrome.storage.SyncStorageArea | chrome.storage.LocalStorageArea}
 */
function getStorageBackend() {
  if (isSafari()) {
    return chrome.storage.local;
  }
  return chrome.storage.sync;
}

/**
 * Get values from storage.
 * Uses storage.sync on Chrome/Firefox, storage.local on Safari.
 *
 * @param {string|string[]|Object} keys - Keys to retrieve
 * @returns {Promise<Object>} - Retrieved values
 */
export function storageGet(keys) {
  return new Promise((resolve, reject) => {
    getStorageBackend().get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Set values in storage.
 * Uses storage.sync on Chrome/Firefox, storage.local on Safari.
 *
 * @param {Object} items - Key-value pairs to store
 * @returns {Promise<void>}
 */
export function storageSet(items) {
  return new Promise((resolve, reject) => {
    getStorageBackend().set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Add a listener for storage changes.
 * Works across all browsers - listens to both sync and local changes.
 *
 * @param {Function} callback - Callback receiving (changes, areaName)
 */
export function onStorageChanged(callback) {
  chrome.storage.onChanged.addListener(callback);
}
