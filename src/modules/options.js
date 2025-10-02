import {
  ALIGNMENT_KEY,
  ALIGNMENTS,
  SHOW_BUTTON_TEXT_KEY,
  SHOW_FAVOURITES_KEY,
  THEME_KEY,
  THEMES,
} from './constants.js';
import { applyTheme, normalizeTheme } from './theme.js';

const debugCheckbox = document.getElementById('debug');
const showButtonTextCheckbox = document.getElementById('show-button-text-checkbox');
const showButtonTextLegend = document.getElementById('showButtonTextLegend');
const alignmentLegend = document.getElementById('alignmentLegend');
const alignmentLabel = document.getElementById('alignmentLabel');
const alignmentSelect = document.getElementById('alignment-select');
const alignmentOptionStart = document.getElementById('alignmentOptionStart');
const alignmentOptionCenter = document.getElementById('alignmentOptionCenter');
const showFavouritesCheckbox = document.getElementById('show-favourites-checkbox');
const showFavouritesLabel = document.getElementById('showFavouritesLabel');
const themeSelect = document.getElementById('theme-select');
const themeLegend = document.getElementById('themeLegend');
const themeLabel = document.getElementById('themeLabel');
const themeOptionSystem = document.getElementById('themeOptionSystem');
const themeOptionLight = document.getElementById('themeOptionLight');
const themeOptionDark = document.getElementById('themeOptionDark');

function getMessage(key, fallback) {
  const value = chrome.i18n.getMessage(key);
  return value || fallback;
}

// Set document language dynamically based on browser locale
document.documentElement.lang = chrome.i18n.getUILanguage();

function normalizeAlignment(value) {
  return Object.values(ALIGNMENTS).includes(value) ? value : ALIGNMENTS.START;
}

// Localize text content
document.title = getMessage('page_title', 'Calendar Options');
document.getElementById('pageTitle').textContent = getMessage('page_title', 'Calendar Options');
document.getElementById('pageDescription').textContent = getMessage(
  'options_page_description',
  'Settings for the Gmail Calendar Options extension.',
);
document.getElementById('debugLegend').textContent = getMessage('options_debug_legend', 'Debugging');
document.getElementById('debugLabel').textContent = getMessage(
  'options_debug_label',
  'Enable debug mode (highlights filtered rows in blue instead of hiding them)',
);
document.getElementById('showButtonTextLabel').textContent = getMessage(
  'optionShowButtonText',
  'Show text on filter buttons',
);
if (showButtonTextLegend) {
  showButtonTextLegend.textContent = getMessage('options_show_text_legend', 'Display');
}
if (alignmentLegend) {
  alignmentLegend.textContent = getMessage('options_alignment_legend', 'Toolbar layout');
}
if (alignmentLabel) {
  alignmentLabel.textContent = getMessage('options_alignment_label', 'Toolbar alignment');
}
if (alignmentOptionStart) {
  alignmentOptionStart.textContent = getMessage('options_alignment_start', 'Start');
}
if (alignmentOptionCenter) {
  alignmentOptionCenter.textContent = getMessage('options_alignment_center', 'Center');
}
if (showFavouritesLabel) {
  showFavouritesLabel.textContent = getMessage('options_show_favourites_label', 'Show Favourites button');
}
if (themeLegend) {
  themeLegend.textContent = getMessage('options_theme_legend', 'Appearance');
}
if (themeLabel) {
  themeLabel.textContent = getMessage('options_theme_label', 'Extension theme');
}
if (themeOptionSystem) {
  themeOptionSystem.textContent = getMessage('options_theme_system', 'Match system theme');
}
if (themeOptionLight) {
  themeOptionLight.textContent = getMessage('options_theme_light', 'Light');
}
if (themeOptionDark) {
  themeOptionDark.textContent = getMessage('options_theme_dark', 'Dark');
}

// Set experimental section text
const experimentalLegend = document.querySelector('[data-i18n="experimental_legend"]');
const experimentalDescription = document.querySelector('[data-i18n="experimental_description"]');

if (experimentalLegend) {
  experimentalLegend.textContent = getMessage('experimental_legend', 'Experimental');
}
if (experimentalDescription) {
  experimentalDescription.textContent = getMessage('experimental_description', 'Experimental features are in active testing and may only be available in English.');
}

// Save options to chrome.storage.sync
function save_options() {
  const themeValue = themeSelect ? themeSelect.value : THEMES.SYSTEM;
  const alignmentValue = alignmentSelect ? alignmentSelect.value : ALIGNMENTS.START;
  const favouritesValue = showFavouritesCheckbox ? showFavouritesCheckbox.checked : false;
  chrome.storage.sync.set(
    {
      gmailCalDebug: debugCheckbox.checked,
      [SHOW_BUTTON_TEXT_KEY]: showButtonTextCheckbox.checked,
      [SHOW_FAVOURITES_KEY]: favouritesValue,
      [ALIGNMENT_KEY]: alignmentValue,
      [THEME_KEY]: themeValue,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving options:', chrome.runtime.lastError);
      }
    },
  );
  applyTheme(document, themeValue);
}

// Restore options from chrome.storage.sync
function restore_options() {
  chrome.storage.sync.get(
    ['gmailCalDebug', SHOW_BUTTON_TEXT_KEY, SHOW_FAVOURITES_KEY, ALIGNMENT_KEY, THEME_KEY],
    (res) => {
      if (chrome.runtime.lastError) {
        console.error('Error retrieving options:', chrome.runtime.lastError);
      } else {
        debugCheckbox.checked = !!res.gmailCalDebug;
        showButtonTextCheckbox.checked = !!res[SHOW_BUTTON_TEXT_KEY];
        const restoredTheme = normalizeTheme(res[THEME_KEY] ?? THEMES.SYSTEM);
        const restoredAlignment = normalizeAlignment(res[ALIGNMENT_KEY]);
        const showFavourites = !!res[SHOW_FAVOURITES_KEY];
        if (themeSelect) {
          themeSelect.value = restoredTheme;
        }
        if (alignmentSelect) {
          alignmentSelect.value = restoredAlignment;
        }
        if (showFavouritesCheckbox) {
          showFavouritesCheckbox.checked = showFavourites;
        }
        applyTheme(document, restoredTheme);
      }
    },
  );
}

// Event Listeners
debugCheckbox.addEventListener('change', save_options);
showButtonTextCheckbox.addEventListener('change', save_options);
if (showFavouritesCheckbox) {
  showFavouritesCheckbox.addEventListener('change', save_options);
}
if (themeSelect) {
  themeSelect.addEventListener('change', save_options);
}
if (alignmentSelect) {
  alignmentSelect.addEventListener('change', save_options);
}

// Load options when the page is loaded
document.addEventListener('DOMContentLoaded', restore_options);
