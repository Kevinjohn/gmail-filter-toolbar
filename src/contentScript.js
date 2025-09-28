import { SELECTORS, SHOW_BUTTON_TEXT_KEY, THEME_KEY } from './modules/constants.js';
import {
  loadState,
  saveState,
  setCurrentMode,
  setDebugOn,
  showButtonText,
  KEY_DEBUG,
  themePreference,
  setThemePreference,
} from './modules/state.js';
import { applyFilter } from './modules/filter.js';
import { injectToolbar, refreshUI, updateButtonTextView } from './modules/toolbar.js';
import {
  waitForGmailChrome,
  waitForMessageTable,
  observeMessageList,
  setupGmailToolbarObserver,
} from './modules/observers.js';
import { applyTheme } from './modules/theme.js';

function injectFont() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@24,400,0';
  document.head.appendChild(link);
}

function main() {
  injectFont();
  loadState().then(() => {
    applyTheme(document, themePreference);
    waitForGmailChrome().then((gmailToolbarHeader) => {
      injectToolbar(document, gmailToolbarHeader);
      updateButtonTextView(showButtonText); // Apply initial state
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
  saveState()
    .then(() => {
      applyFilter();
      refreshUI(document);
    })
    .catch((error) => {
      console.error('Error saving state:', error);
    });
});

// Listen for storage changes (e.g., debug mode or showButtonText toggled in options.html)
chrome.storage.onChanged.addListener((changes) => {
  if (KEY_DEBUG in changes) {
    setDebugOn(changes[KEY_DEBUG].newValue);
    applyFilter();
  }
  if (SHOW_BUTTON_TEXT_KEY in changes) {
    updateButtonTextView(changes[SHOW_BUTTON_TEXT_KEY].newValue);
  }
  if (THEME_KEY in changes) {
    setThemePreference(changes[THEME_KEY].newValue);
    applyTheme(document, themePreference);
  }
});

main();
