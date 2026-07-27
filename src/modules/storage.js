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

export const MODE_WRITE_ID_KEY = 'gmailCalModeWriteId';
export const OPTIONS_WRITE_ID_KEY = 'gmailCalOptionsWriteId';

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
 * WHY: onChanged listeners must only react to the active backend's area. The legacy migration
 * removes keys from local after copying them to sync; if listeners also accepted 'local' events,
 * those removals (newValue: undefined) would be misread as "preferences reset to defaults" and
 * clobber the just-migrated values.
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

function removeFromStorage(area, keys) {
  return new Promise((resolve, reject) => {
    area.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
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
  // Narrow the migration race: another context may have populated sync while local.get was in
  // flight. Re-read the candidates and migrate only values that are still absent.
  let latestStored;
  try {
    latestStored = await getFromStorage(backend, missingKeys);
  } catch (error) {
    // The initial backend and legacy reads both succeeded. A transient failure in this defensive
    // re-read must not discard usable values; return them without attempting a migration write.
    console.warn('Failed to recheck sync storage before legacy migration:', error);
    return { ...stored, ...legacyValues };
  }
  const recovered = Object.fromEntries(
    missingKeys
      .filter((key) => latestStored[key] === undefined && legacyValues[key] !== undefined)
      .map((key) => [key, legacyValues[key]]),
  );
  if (Object.keys(recovered).length) {
    // WHY: The migration write is best-effort — the values were already read successfully, so a
    // failed sync write (quota, throttle, sync disabled) must not reject the whole storageGet and
    // break the caller. The legacy values stay in local and migration retries next read.
    try {
      await setInStorage(backend, recovered);
      // WHY: Delete the migrated keys from local so the migration is genuinely one-time. Leaving
      // them behind meant every context re-read local forever, and a later divergence between the
      // two areas could silently resurrect stale values. Best-effort: a failed cleanup only means
      // the migration re-runs (idempotently) next time.
      await removeFromStorage(local, Object.keys(recovered));
    } catch (error) {
      console.warn('Failed to migrate legacy storage values to sync:', error);
    }
  }
  return { ...stored, ...latestStored, ...recovered };
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
