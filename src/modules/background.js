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
  console.log('Gmail Calendar Options installed');
  const start = performance.now();
  chrome.storage.sync.set(
    {
      gmailCalMode: 'ALL',
      showAiNotetakers: false,
    },
    () => {
      const duration = performance.now() - start;
      logDuration('background:onInstalled storage.sync.set', duration);
      if (chrome.runtime.lastError) {
        console.error('Error setting initial mode:', chrome.runtime.lastError);
      }
    }
  );
});
