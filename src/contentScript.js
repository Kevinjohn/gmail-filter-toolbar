import { SELECTORS } from './constants.js';
import { loadState, saveState, setCurrentMode, setDebugOn, KEY_DEBUG } from './state.js';
import { applyFilter } from './filter.js';
import { injectToolbar, refreshUI } from './toolbar.js';
import { waitForGmailChrome, waitForMessageTable, observeMessageList, observeToolbar } from './observers.js';

function main() {
  loadState(() => {
    waitForGmailChrome().then(() => {
      injectToolbar();
      refreshUI();

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
  refreshUI();
});

// Listen for storage changes (e.g., debug mode toggled in options.html)
chrome.storage.onChanged.addListener((changes) => {
  if (KEY_DEBUG in changes) {
    setDebugOn(changes[KEY_DEBUG].newValue);
    applyFilter();
  }
});

main();