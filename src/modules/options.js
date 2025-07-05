const KEY = 'gmailCalDebug';
const box = document.getElementById('debug');
chrome.storage.sync.get(KEY, (res) => {
  if (chrome.runtime.lastError) {
    console.error('Error retrieving debug mode setting:', chrome.runtime.lastError);
    box.checked = false; // Default to false on error
  } else {
    box.checked = !!res[KEY];
  }
});
box.addEventListener('change', () => {
  chrome.storage.sync.set({ [KEY]: box.checked }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving debug mode setting:', chrome.runtime.lastError);
    }
  });
});
document.title = chrome.i18n.getMessage('page_title');
document.getElementById('pageTitle').textContent = chrome.i18n.getMessage('page_title');
document.getElementById('pageDescription').textContent = chrome.i18n.getMessage(
  'options_page_description',
);
document.getElementById('debugLegend').textContent = chrome.i18n.getMessage('options_debug_legend');
document.getElementById('debugLabel').textContent = chrome.i18n.getMessage('options_debug_label');
