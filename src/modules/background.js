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
      return Object.keys(missingDefaults).length ? storageSet(missingDefaults) : undefined;
    })
    .then(() => {
      const duration = performance.now() - start;
      logDuration('background:onInstalled storage.set', duration);
    })
    .catch((error) => {
      console.error('Error setting initial mode:', error);
    });
});
