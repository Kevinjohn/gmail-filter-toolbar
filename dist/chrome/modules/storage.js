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

function getRequestedKeys(keys) {
  if (typeof keys === 'string') return [keys];
  if (Array.isArray(keys)) return keys;
  if (keys && typeof keys === 'object') return Object.keys(keys);
  return [];
}

/**
 * Get values from storage.
 * Uses the best storage backend exposed by the browser. When sync storage is available,
 * missing values are recovered once from local storage so existing Safari preferences survive
 * the move from the legacy local-only backend.
 *
 * @param {string|string[]|Object} keys - Keys to retrieve
 * @returns {Promise<Object>} - Retrieved values
 */
export async function storageGet(keys) {
  const backend = getStorageBackend();
  const stored = await getFromStorage(backend, keys);
  const local = chrome.storage.local;

  if (backend !== chrome.storage.sync || !local || local === backend) {
    return stored;
  }

  const missingKeys = getRequestedKeys(keys).filter((key) => stored[key] === undefined);
  if (!missingKeys.length) {
    return stored;
  }

  const legacyValues = await getFromStorage(local, missingKeys);
  const recovered = Object.fromEntries(
    missingKeys
      .filter((key) => legacyValues[key] !== undefined)
      .map((key) => [key, legacyValues[key]]),
  );
  if (Object.keys(recovered).length) {
    await setInStorage(backend, recovered);
  }
  return { ...stored, ...recovered };
}

/**
 * Set values in storage.
 * Uses the best storage backend exposed by the browser.
 *
 * @param {Object} items - Key-value pairs to store
 * @returns {Promise<void>}
 */
export function storageSet(items) {
  return setInStorage(getStorageBackend(), items);
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
