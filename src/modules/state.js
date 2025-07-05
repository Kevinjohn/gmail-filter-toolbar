export const KEY_MODE = 'gmailCalMode';
export const KEY_DEBUG = 'gmailCalDebug';

export const MODES = {
  ALL: 'ALL',
  EMAIL: 'EMAIL',
  CALENDAR: 'CALENDAR',
  ATTACH: 'ATTACH',
  FAVOURITES: 'FAVOURITES',
};

export let currentMode = MODES.ALL;
export let debugOn = false;

export function setCurrentMode(mode) {
  currentMode = mode;
}

export function setDebugOn(value) {
  debugOn = value;
}

export function loadState(callback) {
  chrome.storage.sync.get([KEY_MODE, KEY_DEBUG], (res) => {
    if (chrome.runtime.lastError) {
      console.error("Error retrieving storage data:", chrome.runtime.lastError);
      currentMode = MODES.ALL;
      debugOn = false;
    } else {
      currentMode = res[KEY_MODE] || MODES.ALL;
      debugOn = !!res[KEY_DEBUG];
    }
    callback();
  });
}

export function saveState() {
  chrome.storage.sync.set({ [KEY_MODE]: currentMode }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving mode:", chrome.runtime.lastError);
    }
  });
}
