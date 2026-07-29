import { applyFilter } from './filter.js';
import { isExtensionContextInvalidated, markToolbarStale, refreshUI } from './toolbar.js';
import { currentMode, isModeAvailable, isValidMode, persistMode, setCurrentMode } from './state.js';
import { createStorageWriteId } from './storage.js';

/**
 * Owns the filter mode's write path: the optimistic UI update, the serialised persistence queue,
 * and the write-ID bookkeeping that lets the storage listener tell our own echo apart from another
 * tab's authoritative change.
 *
 * WHY this is a module rather than inline in contentScript.js: the three pieces of mutable state
 * below are one unit and must not be reachable independently — a caller that bumped the epoch
 * without also owning the queue could silently drop a write. Keeping them module-private and
 * exposing verbs instead means the invariants live in one file that can be tested against the real
 * state module.
 */

let modePersistenceQueue = Promise.resolve();
let modePersistenceEpoch = 0;
const localModeWriteIds = new Set();

function queueModePersistence(mode, epoch) {
  modePersistenceQueue = modePersistenceQueue
    .catch(() => {})
    .then(() => {
      if (epoch !== modePersistenceEpoch) return;
      const writeId = createStorageWriteId('mode');
      localModeWriteIds.add(writeId);
      return persistMode(mode, writeId).catch((error) => {
        localModeWriteIds.delete(writeId);
        throw error;
      });
    });
  return modePersistenceQueue;
}

/**
 * Applies a filter mode optimistically, then persists it.
 *
 * @param {string} mode
 * @param {{allowHidden?: boolean, rollbackOnFailure?: boolean}} [options]
 *   allowHidden accepts a valid-but-hidden mode (used when a mode's button is being turned off);
 *   rollbackOnFailure restores the previous mode if the write fails.
 * @returns {Promise<void>} rejects if the mode is unavailable or the write fails.
 */
export function selectMode(mode, { allowHidden = false, rollbackOnFailure = true } = {}) {
  // WHY first, before the mode is even validated: after an extension update this content script is
  // orphaned but its toolbar is still in the page and still takes clicks. Proceeding would apply the
  // filter optimistically, then throw inside refreshUI on the first `chrome.i18n` call — leaving the
  // user with a toolbar that claims a mode nothing can persist. Stand the controls down instead.
  if (isExtensionContextInvalidated()) {
    markToolbarStale(document);
    return Promise.reject(
      new Error('Extension context invalidated — reload Gmail to filter again.'),
    );
  }

  const isAllowed = allowHidden ? isValidMode(mode) : isModeAvailable(mode);
  if (!isAllowed) {
    return Promise.reject(new TypeError(`Unavailable filter mode: ${String(mode)}`));
  }

  const previousMode = currentMode;
  const persistenceEpoch = modePersistenceEpoch;
  setCurrentMode(mode);
  applyFilter(document);
  refreshUI(document);

  return queueModePersistence(mode, persistenceEpoch).catch((error) => {
    // WHY the currentMode check: by the time a failed write rejects, another tab's storage change
    // or a later click may already have moved the mode on. Rolling back then would resurrect a
    // stale mode over a newer, deliberate one — so only undo if our own optimistic value still stands.
    if (rollbackOnFailure && currentMode === mode) {
      setCurrentMode(previousMode);
      applyFilter(document);
      refreshUI(document);
    }
    throw error;
  });
}

/**
 * Reports whether a storage write ID came from this tab, consuming it if so.
 *
 * WHY it consumes: each ID is acknowledged exactly once. Leaving it in the set would let a later
 * unrelated change carrying a recycled ID be misread as our own echo and skipped.
 *
 * @param {string|undefined} writeId
 * @returns {boolean} true when this tab issued the write.
 */
export function consumeLocalModeWrite(writeId) {
  return localModeWriteIds.delete(writeId);
}

/**
 * Cancels queued mode writes that have not started yet.
 *
 * Call when an authoritative storage change arrives: the stored mode now supersedes any local
 * intent still sitting in the queue, which would otherwise write a stale mode back over it.
 */
export function supersedeQueuedModeWrites() {
  modePersistenceEpoch += 1;
}
