/**
 * Unified storage abstraction for cross-browser compatibility.
 *
 * This module provides a consistent API that:
 * - Uses storage.sync when the browser exposes it
 * - Falls back to storage.local when sync is unavailable
 *
 * @stable
 */

/**
 * Get the appropriate storage backend.
 * Uses sync when the browser implements it and otherwise falls back to local.
 * @returns {chrome.storage.SyncStorageArea | chrome.storage.LocalStorageArea}
 */
function getStorageBackend() {
  return chrome.storage.sync ?? chrome.storage.local;
}

export const MODE_WRITE_ID_KEY = 'siftModeWriteId';
export const OPTIONS_WRITE_ID_KEY = 'siftOptionsWriteId';

let storageWriteSequence = 0;
const storageWriterId =
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * Returns an identifier that is unique to one storage write in this extension context.
 * Callers persist it beside user data so their onChanged listener can distinguish a local
 * acknowledgement from a genuinely external update.
 */
export function createStorageWriteId(scope) {
  storageWriteSequence += 1;
  return `${scope}:${storageWriterId}:${storageWriteSequence}`;
}

/**
 * Name of the storage area the abstraction actually writes to ('sync' or 'local').
 *
 * WHY: onChanged fires for every area, but this module only ever reads and writes one of them.
 * Listeners must ignore events from the inactive area — an unrelated write or removal there would
 * otherwise be applied as if it were a preference change, and a removal (newValue: undefined)
 * would read as "preferences reset to defaults".
 *
 * @returns {'sync'|'local'}
 */
export function getActiveAreaName() {
  return chrome.storage.sync ? 'sync' : 'local';
}

function getFromStorage(area, keys) {
  return new Promise((resolve, reject) => {
    area.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

function setInStorage(area, items) {
  return new Promise((resolve, reject) => {
    area.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get values from storage.
 * Uses the best storage backend exposed by the browser.
 *
 * WHY async: getStorageBackend() dereferences `chrome.storage`, which Firefox strips from an
 * orphaned content script after an extension update. `async` turns that synchronous TypeError into
 * a rejected promise, which is what callers handle — loadState() attaches `.catch` to the returned
 * promise rather than wrapping the call, so a synchronous throw would escape its fail-safe
 * defaults and abort content-script initialisation.
 *
 * @param {string|string[]|Object} keys - Keys to retrieve
 * @returns {Promise<Object>} - Retrieved values
 */
export async function storageGet(keys) {
  return getFromStorage(getStorageBackend(), keys);
}

/**
 * Set values in storage.
 * Uses the best storage backend exposed by the browser.
 *
 * @param {Object} items - Key-value pairs to store
 * @returns {Promise<void>}
 */
export async function storageSet(items) {
  return setInStorage(getStorageBackend(), items);
}

/**
 * Add a listener for storage changes.
 * Fires for every storage area; callers filter on getActiveAreaName().
 *
 * @param {Function} callback - Callback receiving (changes, areaName)
 */
export function onStorageChanged(callback) {
  chrome.storage.onChanged.addListener(callback);
}
