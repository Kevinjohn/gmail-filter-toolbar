import { storageSet } from './storage.js';

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

chrome.runtime.onInstalled.addListener(() => {
  console.log('Gmail Filter Toolbar installed');
  const start = performance.now();
  storageSet({
    gmailCalMode: 'ALL',
    showAiNotetakers: false,
  })
    .then(() => {
      const duration = performance.now() - start;
      logDuration('background:onInstalled storage.set', duration);
    })
    .catch((error) => {
      console.error('Error setting initial mode:', error);
    });
});
