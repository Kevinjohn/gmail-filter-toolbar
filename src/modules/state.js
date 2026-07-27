import {
  ALIGNMENT_KEY,
  ALIGNMENTS,
  SHOW_BUTTON_TEXT_KEY,
  SHOW_FAVOURITES_KEY,
  SHOW_AI_NOTETAKERS_KEY,
  SHOW_DEV_NOTIFICATIONS_KEY,
  THEME_KEY,
  THEMES,
} from './constants.js';
import { MODE_WRITE_ID_KEY, storageGet, storageSet } from './storage.js';

/**
 * Storage key for current filter mode.
 * @stable
 */
export const KEY_MODE = 'gmailCalMode';

/**
 * Storage key for debug mode.
 * @stable
 */
export const KEY_DEBUG = 'gmailCalDebug';

/**
 * Available filter modes.
 * @stable
 */
export const MODES = {
  ALL: 'ALL',
  EMAIL: 'EMAIL',
  CALENDAR: 'CALENDAR',
  ATTACH: 'ATTACH',
  FAVOURITES: 'FAVOURITES',
  AI_NOTETAKERS: 'AI_NOTETAKERS',
  DEV_NOTIFICATIONS: 'DEV_NOTIFICATIONS',
  IMAGE: 'IMAGE',
  PDF: 'PDF',
  DOCUMENT: 'DOCUMENT',
  SPREADSHEET: 'SPREADSHEET',
  PRESENTATION: 'PRESENTATION',
};

const THEME_VALUES = new Set(Object.values(THEMES));
const MODE_VALUES = new Set(Object.values(MODES));

/**
 * Current active filter mode.
 * @stable
 */
export let currentMode = MODES.ALL;

/**
 * Debug mode flag.
 * @stable
 */
export let debugOn = false;

/**
 * Show button text preference.
 * @stable
 */
export let showButtonText = true;

/**
 * Theme preference.
 * @stable
 */
export let themePreference = THEMES.SYSTEM;

/**
 * Favourites button visibility.
 * @stable
 */
export let showFavouritesButton = false;

/**
 * AI & Transcription button visibility.
 * @experimental
 * @since 2.3.0
 */
export let showAiNotetakersButton = false;

/**
 * Dev Notifications button visibility.
 * @experimental
 * @since 2.4.0
 */
export let showDevNotificationsButton = false;

/**
 * Toolbar alignment preference.
 * @stable
 */
export let toolbarAlignment = ALIGNMENTS.START;

export function setCurrentMode(mode) {
  if (!isValidMode(mode)) {
    return false;
  }
  currentMode = mode;
  return true;
}

export function isValidMode(mode) {
  return MODE_VALUES.has(mode);
}

export function isModeAvailable(mode) {
  return (
    isValidMode(mode) &&
    (mode !== MODES.FAVOURITES || showFavouritesButton) &&
    (mode !== MODES.AI_NOTETAKERS || showAiNotetakersButton) &&
    (mode !== MODES.DEV_NOTIFICATIONS || showDevNotificationsButton)
  );
}

export function setDebugOn(value) {
  debugOn = value;
}

export function setShowButtonText(value) {
  showButtonText = value !== false;
}

export function setThemePreference(value) {
  themePreference = THEME_VALUES.has(value) ? value : THEMES.SYSTEM;
}

export function setShowFavouritesButton(value) {
  showFavouritesButton = !!value;
}

/**
 * Sets AI & Transcription button visibility.
 * @experimental
 * @param {boolean} value
 */
export function setShowAiNotetakersButton(value) {
  showAiNotetakersButton = !!value;
}

/**
 * Sets Dev Notifications button visibility.
 * @experimental
 * @param {boolean} value
 */
export function setShowDevNotificationsButton(value) {
  showDevNotificationsButton = !!value;
}

const ALIGNMENT_VALUES = new Set(Object.values(ALIGNMENTS));

export function setToolbarAlignment(value) {
  toolbarAlignment = ALIGNMENT_VALUES.has(value) ? value : ALIGNMENTS.START;
}

export function loadState() {
  return storageGet([
    KEY_MODE,
    KEY_DEBUG,
    SHOW_BUTTON_TEXT_KEY,
    SHOW_FAVOURITES_KEY,
    SHOW_AI_NOTETAKERS_KEY,
    SHOW_DEV_NOTIFICATIONS_KEY,
    ALIGNMENT_KEY,
    THEME_KEY,
  ])
    .then((storageData) => {
      debugOn = !!storageData[KEY_DEBUG];
      setShowButtonText(storageData[SHOW_BUTTON_TEXT_KEY]);
      setThemePreference(storageData[THEME_KEY]);
      setShowFavouritesButton(storageData[SHOW_FAVOURITES_KEY]);
      setShowAiNotetakersButton(storageData[SHOW_AI_NOTETAKERS_KEY]);
      setShowDevNotificationsButton(storageData[SHOW_DEV_NOTIFICATIONS_KEY]);
      setToolbarAlignment(storageData[ALIGNMENT_KEY]);
      const storedMode = storageData[KEY_MODE];
      currentMode = isModeAvailable(storedMode) ? storedMode : MODES.ALL;
    })
    .catch((error) => {
      console.error('Error retrieving storage data:', error);
      currentMode = MODES.ALL;
      debugOn = false;
      showButtonText = true; // Default to true on error
      themePreference = THEMES.SYSTEM;
      showFavouritesButton = false;
      showAiNotetakersButton = false;
      showDevNotificationsButton = false;
      toolbarAlignment = ALIGNMENTS.START;
    });
}

export function saveState() {
  return storageSet({ [KEY_MODE]: currentMode }).catch((error) => {
    console.error('Error saving mode:', error);
    throw error; // Re-throw to propagate the error
  });
}

export function persistMode(mode, writeId) {
  if (!isValidMode(mode)) {
    return Promise.reject(new TypeError(`Invalid filter mode: ${String(mode)}`));
  }
  return storageSet({
    [KEY_MODE]: mode,
    ...(writeId ? { [MODE_WRITE_ID_KEY]: writeId } : {}),
  });
}
