import { SELECTORS } from './modules/constants.js';
import { loadState, saveState, setCurrentMode, setDebugOn, KEY_DEBUG } from './modules/state.js';
import { applyFilter } from './modules/filter.js';
import { injectToolbar, refreshUI } from './modules/toolbar.js';
import { waitForGmailChrome, waitForMessageTable, observeMessageList, setupGmailToolbarObserver } from './modules/observers.js';

function injectFont() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@24,400,0';
  document.head.appendChild(link);
}

function main() {
  injectFont();
  loadState(() => {
    waitForGmailChrome().then((gmailToolbarHeader) => {
      injectToolbar(document, gmailToolbarHeader);
      refreshUI(document);

      waitForMessageTable().then(() => {
        applyFilter();
        observeMessageList();
      });
    });
  });
  setupGmailToolbarObserver();
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