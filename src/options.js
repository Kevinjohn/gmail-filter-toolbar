const KEY = 'gmailCalDebug';
const box = document.getElementById('debug');
chrome.storage.sync.get(KEY, (res) => {
  box.checked = !!res[KEY];
});
box.addEventListener('change', () => {
  chrome.storage.sync.set({ [KEY]: box.checked });
});
document.title = chrome.i18n.getMessage('page_title') || 'Calendar Options';
document.getElementById('debugLabel').textContent =
  chrome.i18n.getMessage('options_debug') ||
  'Enable debug mode (show filtered rows in blue)';