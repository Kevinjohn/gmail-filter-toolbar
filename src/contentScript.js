import {
  ALIGNMENT_KEY,
  KEY_DEBUG,
  KEY_MODE,
  SELECTORS,
  SHOW_BUTTON_TEXT_KEY,
  SHOW_FAVOURITES_KEY,
  SHOW_AI_NOTETAKERS_KEY,
  SHOW_DEV_NOTIFICATIONS_KEY,
  THEME_KEY,
} from './modules/constants.js';
import {
  loadState,
  setCurrentMode,
  isModeAvailable,
  isValidMode,
  setDebugOn,
  setShowButtonText,
  currentMode,
  toolbarAlignment,
  setToolbarAlignment,
  setShowFavouritesButton,
  setShowAiNotetakersButton,
  setShowDevNotificationsButton,
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
  updateButtonVisibility,
} from './modules/toolbar.js';
import {
  waitForGmailToolbar,
  waitForMessageTable,
  observeMessageList,
  setupGmailToolbarObserver,
} from './modules/observers.js';
import { applyTheme } from './modules/theme.js';
import { getActiveAreaName, MODE_WRITE_ID_KEY } from './modules/storage.js';
import { consumeLocalModeWrite, selectMode, supersedeQueuedModeWrites } from './modules/mode.js';

const OPTIONAL_MODE_CONTROLS = {
  [SHOW_FAVOURITES_KEY]: {
    mode: MODES.FAVOURITES,
    setVisibility: setShowFavouritesButton,
  },
  [SHOW_AI_NOTETAKERS_KEY]: {
    mode: MODES.AI_NOTETAKERS,
    setVisibility: setShowAiNotetakersButton,
  },
  [SHOW_DEV_NOTIFICATIONS_KEY]: {
    mode: MODES.DEV_NOTIFICATIONS,
    setVisibility: setShowDevNotificationsButton,
  },
};

function applyOptionalModeChange(key, change) {
  const { mode, setVisibility } = OPTIONAL_MODE_CONTROLS[key];
  const show = !!change.newValue;
  setVisibility(show);
  updateButtonVisibility(mode, show);

  if (!show && currentMode === mode) {
    selectMode(MODES.ALL, { rollbackOnFailure: false }).catch((error) => {
      console.error('Error saving mode:', error);
    });
  } else {
    refreshUI(document);
  }
}

async function main() {
  await loadState();
  setupGmailToolbarObserver(document);

  // WHY: Keep "system" theme live — re-resolve when the OS scheme flips. (Gmail's own theme flips
  // re-resolve via the body observer, which re-applies the theme on DOM churn.)
  const colorSchemeQuery = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
  colorSchemeQuery?.addEventListener?.('change', () => applyTheme(document, themePreference));

  try {
    applyTheme(document, themePreference);
    const gmailToolbarHeader = await waitForGmailToolbar(document);
    injectToolbar(document, gmailToolbarHeader);
    refreshUI(document);
    try {
      await waitForMessageTable(15000, document);
      applyFilter(document);
      observeMessageList(document);
    } catch (error) {
      console.warn('Gmail message table not found:', error.message);
    }
  } catch (error) {
    console.error('Failed to find Gmail toolbar:', error);
    console.error('Gmail selectors may have changed. Check SELECTORS in src/modules/constants.js');
  }
}

// Listen for button clicks
document.addEventListener('click', (e) => {
  const filterButton = e.target.closest(SELECTORS.filterButtons);
  if (!filterButton) return;

  const requestedMode = filterButton.dataset.mode;
  if (!isModeAvailable(requestedMode)) return;
  selectMode(requestedMode).catch((error) => {
    console.error('Error saving state:', error);
  });
});

// Listen for storage changes (e.g., debug mode or showButtonText toggled in options.html)
chrome.storage.onChanged.addListener((changes, areaName) => {
  // WHY: Only react to the active backend's area. onChanged fires for every area, but preferences
  // only ever live in one — accepting the inactive area's events would apply unrelated writes as
  // preference changes, and a removal there (newValue: undefined) would read as "reset everything
  // to defaults" and clobber live state.
  if (areaName !== getActiveAreaName()) return;

  // WHY: The filter mode is a global preference — mirror changes made in another Gmail tab so each
  // tab's toolbar reflects the stored mode instead of drifting per-tab. Apply without re-persisting
  // to avoid write loops; our own write is a no-op here because currentMode already matches.
  if (KEY_MODE in changes) {
    const storedMode = changes[KEY_MODE].newValue;
    const nextMode = isValidMode(storedMode) ? storedMode : MODES.ALL;
    const writeId = changes[MODE_WRITE_ID_KEY]?.newValue;
    const isLocalAcknowledgement = consumeLocalModeWrite(writeId);
    if (!isLocalAcknowledgement && nextMode !== currentMode) {
      // An authoritative storage update supersedes local intents that have not started writing.
      supersedeQueuedModeWrites();
      setCurrentMode(nextMode);
      applyFilter(document);
      refreshUI(document);
    }
  }
  if (KEY_DEBUG in changes) {
    setDebugOn(changes[KEY_DEBUG].newValue);
    applyFilter(document);
  }
  if (SHOW_BUTTON_TEXT_KEY in changes) {
    const showText = changes[SHOW_BUTTON_TEXT_KEY].newValue !== false;
    setShowButtonText(showText);
    updateButtonTextView(showText);
  }
  if (ALIGNMENT_KEY in changes) {
    setToolbarAlignment(changes[ALIGNMENT_KEY].newValue);
    updateAlignmentView(toolbarAlignment);
  }
  for (const key of Object.keys(OPTIONAL_MODE_CONTROLS)) {
    if (key in changes) {
      applyOptionalModeChange(key, changes[key]);
    }
  }
  if (THEME_KEY in changes) {
    setThemePreference(changes[THEME_KEY].newValue);
    applyTheme(document, themePreference);
  }
});

void main();
