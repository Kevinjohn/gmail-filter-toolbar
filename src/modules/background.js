import { KEY_MODE, SHOW_AI_NOTETAKERS_KEY, SHOW_DEV_NOTIFICATIONS_KEY } from './constants.js';
import { storageGet, storageSet } from './storage.js';

const SLOW_TASK_THRESHOLD_MS = 500;

function logDuration(label, durationMs) {
  const rounded = Math.round(durationMs);
  const message = `[perf] ${label} completed in ${rounded}ms`;
  if (durationMs > SLOW_TASK_THRESHOLD_MS) {
    console.warn(message);
  } else {
    console.info(message);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details?.reason !== 'install') {
    return;
  }

  const start = performance.now();
  const defaults = {
    [KEY_MODE]: 'ALL',
    [SHOW_AI_NOTETAKERS_KEY]: false,
    [SHOW_DEV_NOTIFICATIONS_KEY]: false,
  };
  storageGet(Object.keys(defaults))
    .then((stored) => {
      const missingDefaults = Object.fromEntries(
        Object.entries(defaults).filter(([key]) => stored[key] === undefined),
      );
      if (!Object.keys(missingDefaults).length) {
        logDuration('background:onInstalled defaults already present', performance.now() - start);
        return undefined;
      }
      return storageSet(missingDefaults).then(() => {
        logDuration('background:onInstalled storage.set', performance.now() - start);
      });
    })
    .catch((error) => {
      console.error('Error setting initial mode:', error);
    });
});

// WHY: the manifest declares an action with no default_popup, so without this listener clicking the
// toolbar icon is a dead click. onClicked only fires when no popup is declared.
chrome.action?.onClicked.addListener(() => {
  const logFailure = (error) => console.error('Error opening the options page:', error);
  try {
    // WHY: openOptionsPage() returns a promise under MV3 when called without a callback, so a
    // failure arrives as a rejection that try/catch cannot see. Handle both shapes — Safari's
    // callback form returns undefined — or the dead click this listener exists to fix comes back
    // with nothing but an unhandled rejection to diagnose it.
    const opening = chrome.runtime.openOptionsPage();
    if (typeof opening?.catch === 'function') {
      opening.catch(logFailure);
    }
  } catch (error) {
    logFailure(error);
  }
});
