import { SELECTORS } from './modules/constants.js';
import { loadState, saveState, setCurrentMode, setDebugOn, KEY_DEBUG } from './modules/state.js';
import { applyFilter } from './modules/filter.js';
import { injectToolbar, refreshUI } from './modules/toolbar.js';
import { waitForGmailChrome, waitForMessageTable, observeMessageList, observeToolbar } from './modules/observers.js';

function main() {
  // Dynamically inject Material Icons CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('fonts/material-icons.css');
  document.head.appendChild(link);

  loadState(() => {
    waitForGmailChrome().then(() => {
      injectToolbar(document);
      refreshUI(document);

      waitForMessageTable().then(() => {
        applyFilter();
        observeMessageList();
        observeToolbar();
      });
    });
  });
}

// Listen for button clicks
document.addEventListener('click', (e) => {
  const btn = e.target.closest(SELECTORS.filterButtons);
  if (!btn) return;

  setCurrentMode(btn.dataset.mode);
  saveState();
  applyFilter();
  refreshUI(document);
});

// Listen for storage changes (e.g., debug mode toggled in options.html)
chrome.storage.onChanged.addListener((changes) => {
  if (KEY_DEBUG in changes) {
    setDebugOn(changes[KEY_DEBUG].newValue);
    applyFilter();
  }
});

main();