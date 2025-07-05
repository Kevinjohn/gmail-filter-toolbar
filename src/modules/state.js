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

export function loadState() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get([KEY_MODE, KEY_DEBUG], (res) => {
      if (chrome.runtime.lastError) {
        console.error('Error retrieving storage data:', chrome.runtime.lastError);
        currentMode = MODES.ALL;
        debugOn = false;
        reject(chrome.runtime.lastError); // Reject the promise on error
      } else {
        currentMode = res[KEY_MODE] || MODES.ALL;
        debugOn = !!res[KEY_DEBUG];
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
