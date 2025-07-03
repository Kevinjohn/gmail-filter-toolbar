const KEY = 'gmailCalDebug';
const box = document.getElementById('debug');
chrome.storage.sync.get(KEY, (res) => {
  if (chrome.runtime.lastError) {
    console.error("Error retrieving debug mode setting:", chrome.runtime.lastError);
    box.checked = false; // Default to false on error
  } else {
    box.checked = !!res[KEY];
  }
});
box.addEventListener('change', () => {
  chrome.storage.sync.set({ [KEY]: box.checked }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving debug mode setting:", chrome.runtime.lastError);
    }
  });
});
document.title = chrome.i18n.getMessage('page_title') || 'Calendar Options';
document.getElementById('debugLabel').textContent =
  chrome.i18n.getMessage('options_debug') ||
  'Enable debug mode (show filtered rows in blue)';