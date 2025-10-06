import {
  ALIGNMENT_KEY,
  ALIGNMENTS,
  SHOW_BUTTON_TEXT_KEY,
  SHOW_FAVOURITES_KEY,
  SHOW_AI_NOTETAKERS_KEY,
  THEME_KEY,
  THEMES,
} from './constants.js';

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
  IMAGE: 'IMAGE',
  PDF: 'PDF',
  DOCUMENT: 'DOCUMENT',
  SPREADSHEET: 'SPREADSHEET',
  PRESENTATION: 'PRESENTATION',
};

const THEME_VALUES = new Set(Object.values(THEMES));

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
 * Toolbar alignment preference.
 * @stable
 */
export let toolbarAlignment = ALIGNMENTS.START;

export function setCurrentMode(mode) {
  currentMode = mode;
}

export function setDebugOn(value) {
  debugOn = value;
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

const ALIGNMENT_VALUES = new Set(Object.values(ALIGNMENTS));

export function setToolbarAlignment(value) {
  toolbarAlignment = ALIGNMENT_VALUES.has(value) ? value : ALIGNMENTS.START;
}

export function loadState() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(
      [KEY_MODE, KEY_DEBUG, SHOW_BUTTON_TEXT_KEY, SHOW_FAVOURITES_KEY, SHOW_AI_NOTETAKERS_KEY, ALIGNMENT_KEY, THEME_KEY],
      (storageData) => {
        if (chrome.runtime.lastError) {
          console.error('Error retrieving storage data:', chrome.runtime.lastError);
          currentMode = MODES.ALL;
          debugOn = false;
          showButtonText = true; // Default to true on error
          themePreference = THEMES.SYSTEM;
          showFavouritesButton = false;
          showAiNotetakersButton = false;
          toolbarAlignment = ALIGNMENTS.START;
          reject(chrome.runtime.lastError); // Reject the promise on error
        } else {
          currentMode = storageData[KEY_MODE] || MODES.ALL;
          debugOn = !!storageData[KEY_DEBUG];
          showButtonText =
            storageData[SHOW_BUTTON_TEXT_KEY] !== undefined ? storageData[SHOW_BUTTON_TEXT_KEY] : true; // Default to true if not set
          setThemePreference(storageData[THEME_KEY]);
          setShowFavouritesButton(storageData[SHOW_FAVOURITES_KEY]);
          setShowAiNotetakersButton(storageData[SHOW_AI_NOTETAKERS_KEY]);
          setToolbarAlignment(storageData[ALIGNMENT_KEY]);
          resolve(); // Resolve the promise on success
        }
      },
    );
  });
}

export function saveState() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [KEY_MODE]: currentMode }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving mode:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError); // Reject the promise on error
      } else {
        resolve(); // Resolve the promise on success
      }
    });
  });
}
