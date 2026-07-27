import {
  ALIGNMENT_KEY,
  SELECTORS,
  SHOW_BUTTON_TEXT_KEY,
  SHOW_FAVOURITES_KEY,
  SHOW_AI_NOTETAKERS_KEY,
  SHOW_DEV_NOTIFICATIONS_KEY,
  THEME_KEY,
} from './modules/constants.js';
import {
  loadState,
  persistMode,
  setCurrentMode,
  isModeAvailable,
  isValidMode,
  setDebugOn,
  setShowButtonText,
  KEY_DEBUG,
  KEY_MODE,
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
import { createStorageWriteId, getActiveAreaName, MODE_WRITE_ID_KEY } from './modules/storage.js';

let modePersistenceQueue = Promise.resolve();
let modePersistenceEpoch = 0;
const localModeWriteIds = new Set();

function queueModePersistence(mode, epoch) {
  modePersistenceQueue = modePersistenceQueue
    .catch(() => {})
    .then(() => {
      if (epoch !== modePersistenceEpoch) return;
      const writeId = createStorageWriteId('mode');
      localModeWriteIds.add(writeId);
      return persistMode(mode, writeId).catch((error) => {
        localModeWriteIds.delete(writeId);
        throw error;
      });
    });
  return modePersistenceQueue;
}

function selectMode(mode, { allowHidden = false, rollbackOnFailure = true } = {}) {
  const isAllowed = allowHidden ? isValidMode(mode) : isModeAvailable(mode);
  if (!isAllowed) {
    return Promise.reject(new TypeError(`Unavailable filter mode: ${String(mode)}`));
  }

  const previousMode = currentMode;
  const persistenceEpoch = modePersistenceEpoch;
  setCurrentMode(mode);
  applyFilter(document);
  refreshUI(document);

  return queueModePersistence(mode, persistenceEpoch).catch((error) => {
    if (rollbackOnFailure && currentMode === mode) {
      setCurrentMode(previousMode);
      applyFilter(document);
      refreshUI(document);
    }
    throw error;
  });
}

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
  // WHY: Only react to the active backend's area. The legacy migration removes keys from *local*
  // after copying them to sync — accepting 'local' events alongside 'sync' would misread those
  // removals (newValue: undefined) as "reset everything to defaults" and clobber live state.
  if (areaName !== getActiveAreaName()) return;

  // WHY: The filter mode is a global preference — mirror changes made in another Gmail tab so each
  // tab's toolbar reflects the stored mode instead of drifting per-tab. Apply without re-persisting
  // to avoid write loops; our own write is a no-op here because currentMode already matches.
  if (KEY_MODE in changes) {
    const storedMode = changes[KEY_MODE].newValue;
    const nextMode = isValidMode(storedMode) ? storedMode : MODES.ALL;
    const writeId = changes[MODE_WRITE_ID_KEY]?.newValue;
    const isLocalAcknowledgement = localModeWriteIds.delete(writeId);
    if (!isLocalAcknowledgement && nextMode !== currentMode) {
      // An authoritative storage update supersedes local intents that have not started writing.
      modePersistenceEpoch += 1;
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

function handleRuntimeMessage(message, _sender, sendResponse) {
  if (!message || typeof message !== 'object') {
    return false;
  }

  if (message.type === 'gmailCal:setMode') {
    const mode = message.payload?.mode;
    if (!isValidMode(mode)) {
      sendResponse?.({ ok: false, error: 'Invalid mode payload' });
      return false;
    }

    selectMode(mode, { allowHidden: true })
      .then(() => {
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

void main();
