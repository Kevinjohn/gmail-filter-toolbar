import {
  ALIGNMENT_KEY,
  SELECTORS,
  SHOW_BUTTON_TEXT_KEY,
  SHOW_FAVOURITES_KEY,
  THEME_KEY,
} from './modules/constants.js';
import {
  loadState,
  saveState,
  setCurrentMode,
  setDebugOn,
  showButtonText,
  KEY_DEBUG,
  currentMode,
  toolbarAlignment,
  setToolbarAlignment,
  showFavouritesButton,
  setShowFavouritesButton,
  MODES,
  themePreference,
  setThemePreference,
} from './modules/state.js';
import { applyFilter } from './modules/filter.js';
import {
  injectToolbar,
  refreshUI,
  updateAlignmentView,
  updateButtonTextView,
  updateFavouritesVisibility,
} from './modules/toolbar.js';
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
      updateAlignmentView(toolbarAlignment);
      updateFavouritesVisibility(showFavouritesButton);
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
  if (ALIGNMENT_KEY in changes) {
    setToolbarAlignment(changes[ALIGNMENT_KEY].newValue);
    updateAlignmentView(toolbarAlignment);
  }
  if (SHOW_FAVOURITES_KEY in changes) {
    const nextValue = !!changes[SHOW_FAVOURITES_KEY].newValue;
    setShowFavouritesButton(nextValue);
    updateFavouritesVisibility(nextValue);
    if (!nextValue && currentMode === MODES.FAVOURITES) {
      setCurrentMode(MODES.ALL);
      saveState()
        .then(() => {
          applyFilter();
          refreshUI(document);
        })
        .catch((error) => {
          console.error('Error saving mode:', error);
        });
    } else {
      refreshUI(document);
    }
  }
  if (THEME_KEY in changes) {
    setThemePreference(changes[THEME_KEY].newValue);
    applyTheme(document, themePreference);
  }
});

main();
