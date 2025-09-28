import { SHOW_BUTTON_TEXT_KEY, THEME_KEY, THEMES } from './constants.js';

export const KEY_MODE = 'gmailCalMode';
export const KEY_DEBUG = 'gmailCalDebug';

export const MODES = {
  ALL: 'ALL',
  EMAIL: 'EMAIL',
  CALENDAR: 'CALENDAR',
  ATTACH: 'ATTACH',
  FAVOURITES: 'FAVOURITES',
  IMAGE: 'IMAGE',
  PDF: 'PDF',
  DOCUMENT: 'DOCUMENT',
  SPREADSHEET: 'SPREADSHEET',
  PRESENTATION: 'PRESENTATION',
};

const THEME_VALUES = new Set(Object.values(THEMES));

export let currentMode = MODES.ALL;
export let debugOn = false;
export let showButtonText = true;
export let themePreference = THEMES.SYSTEM;

export function setCurrentMode(mode) {
  currentMode = mode;
}

export function setDebugOn(value) {
  debugOn = value;
}

export function setThemePreference(value) {
  themePreference = THEME_VALUES.has(value) ? value : THEMES.SYSTEM;
}

export function loadState() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get([KEY_MODE, KEY_DEBUG, SHOW_BUTTON_TEXT_KEY, THEME_KEY], (res) => {
      if (chrome.runtime.lastError) {
        console.error('Error retrieving storage data:', chrome.runtime.lastError);
        currentMode = MODES.ALL;
        debugOn = false;
        showButtonText = true; // Default to true on error
        themePreference = THEMES.SYSTEM;
        reject(chrome.runtime.lastError); // Reject the promise on error
      } else {
        currentMode = res[KEY_MODE] || MODES.ALL;
        debugOn = !!res[KEY_DEBUG];
        showButtonText =
          res[SHOW_BUTTON_TEXT_KEY] !== undefined ? res[SHOW_BUTTON_TEXT_KEY] : true; // Default to true if not set
        setThemePreference(res[THEME_KEY]);
        resolve(); // Resolve the promise on success
      }
    });
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
