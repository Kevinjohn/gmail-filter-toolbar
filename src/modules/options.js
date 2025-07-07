import { SHOW_BUTTON_TEXT_KEY } from './constants.js';

const debugCheckbox = document.getElementById('debug');
const showButtonTextCheckbox = document.getElementById('show-button-text-checkbox');

// Localize text content
document.title = chrome.i18n.getMessage('page_title');
document.getElementById('pageTitle').textContent = chrome.i18n.getMessage('page_title');
document.getElementById('pageDescription').textContent = chrome.i18n.getMessage(
  'options_page_description',
);
document.getElementById('debugLegend').textContent = chrome.i18n.getMessage('options_debug_legend');
document.getElementById('debugLabel').textContent = chrome.i18n.getMessage('options_debug_label');
document.getElementById('showButtonTextLabel').textContent = chrome.i18n.getMessage('optionShowButtonText');

// Save options to chrome.storage.sync
function save_options() {
  chrome.storage.sync.set(
    {
      gmailCalDebug: debugCheckbox.checked,
      [SHOW_BUTTON_TEXT_KEY]: showButtonTextCheckbox.checked,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving options:', chrome.runtime.lastError);
      }
    },
  );
}

// Restore options from chrome.storage.sync
function restore_options() {
  chrome.storage.sync.get(
    ['gmailCalDebug', SHOW_BUTTON_TEXT_KEY],
    (res) => {
      if (chrome.runtime.lastError) {
        console.error('Error retrieving options:', chrome.runtime.lastError);
      } else {
        debugCheckbox.checked = !!res.gmailCalDebug;
        showButtonTextCheckbox.checked = !!res[SHOW_BUTTON_TEXT_KEY];
      }
    },
  );
}

// Event Listeners
debugCheckbox.addEventListener('change', save_options);
showButtonTextCheckbox.addEventListener('change', save_options);

// Load options when the page is loaded
document.addEventListener('DOMContentLoaded', restore_options);
