import {
  ALIGNMENT_KEY,
  SELECTORS,
  SHOW_BUTTON_TEXT_KEY,
  SHOW_FAVOURITES_KEY,
  SHOW_AI_NOTETAKERS_KEY,
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
  showAiNotetakersButton,
  setShowAiNotetakersButton,
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
  updateAiNotetakersVisibility,
} from './modules/toolbar.js';
import {
  waitForGmailToolbar,
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
    waitForGmailToolbar()
      .then((gmailToolbarHeader) => {
        injectToolbar(document, gmailToolbarHeader);
        updateButtonTextView(showButtonText); // Apply initial state
        updateAlignmentView(toolbarAlignment);
        updateFavouritesVisibility(showFavouritesButton);
        updateAiNotetakersVisibility(showAiNotetakersButton);
        refreshUI(document);

        waitForMessageTable().then(() => {
          applyFilter(document);
          observeMessageList(document);
        });
      })
      .catch((error) => {
        console.error('Failed to find Gmail toolbar:', error);
        console.error(
          'Gmail selectors may have changed. Check SELECTORS in src/modules/constants.js',
        );
      });
  });
  setupGmailToolbarObserver(document);
}

// Listen for button clicks
document.addEventListener('click', (e) => {
  const filterButton = e.target.closest(SELECTORS.filterButtons);
  if (!filterButton) return;

  setCurrentMode(filterButton.dataset.mode);
  saveState()
    .then(() => {
      applyFilter(document);
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
    applyFilter(document);
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
    // WHY: If user disables favourites button while actively using FAVOURITES mode, reset to ALL mode.
    // Without this, user would be stuck in an invisible filter mode with no way to change it (button is hidden).
    // Same pattern applies to AI_NOTETAKERS mode below.
    if (!nextValue && currentMode === MODES.FAVOURITES) {
      setCurrentMode(MODES.ALL);
      saveState()
        .then(() => {
          applyFilter(document);
          refreshUI(document);
        })
        .catch((error) => {
          console.error('Error saving mode:', error);
        });
    } else {
      refreshUI(document);
    }
  }
  if (SHOW_AI_NOTETAKERS_KEY in changes) {
    const nextValue = !!changes[SHOW_AI_NOTETAKERS_KEY].newValue;
    setShowAiNotetakersButton(nextValue);
    updateAiNotetakersVisibility(nextValue);
    if (!nextValue && currentMode === MODES.AI_NOTETAKERS) {
      setCurrentMode(MODES.ALL);
      saveState()
        .then(() => {
          applyFilter(document);
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

function handleRuntimeMessage(message, _sender, sendResponse) {
  if (!message || typeof message !== 'object') {
    return false;
  }

  if (message.type === 'gmailCal:setMode') {
    const mode = message.payload?.mode;
    if (!mode) {
      sendResponse?.({ ok: false, error: 'Missing mode payload' });
      return false;
    }

    setCurrentMode(mode);
    saveState()
      .then(() => {
        applyFilter(document);
        refreshUI(document);
        sendResponse?.({ ok: true, mode: currentMode });
      })
      .catch((error) => {
        console.error('Error saving mode:', error);
        sendResponse?.({ ok: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'gmailCal:refreshFilter') {
    applyFilter(document);
    refreshUI(document);
    sendResponse?.({ ok: true, mode: currentMode });
    return false;
  }

  return false;
}

if (chrome.runtime?.onMessage?.addListener) {
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
}

main();
