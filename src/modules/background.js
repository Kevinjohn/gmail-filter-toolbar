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

  console.log('Gmail Filter Toolbar installed');
  const start = performance.now();
  const defaults = {
    gmailCalMode: 'ALL',
    showAiNotetakers: false,
    showDevNotifications: false,
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
