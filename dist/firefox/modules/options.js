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
import { applyTheme, normalizeTheme } from './theme.js';
import { storageGet, storageSet } from './storage.js';

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
const showAiNotetakersCheckbox = document.getElementById('show-ai-notetakers-checkbox');
const showDevNotificationsCheckbox = document.getElementById('show-dev-notifications-checkbox');

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
  'Settings for the Gmail Filter Toolbar extension.',
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

const showAiNotetakersLabel = document.querySelector('[data-i18n="options_show_ai_notetakers"]');
if (showAiNotetakersLabel) {
  showAiNotetakersLabel.textContent = getMessage('options_show_ai_notetakers', 'Show AI & Transcription button');
}

const showDevNotificationsLabel = document.querySelector('[data-i18n="options_show_dev_notifications"]');
if (showDevNotificationsLabel) {
  showDevNotificationsLabel.textContent = getMessage('options_show_dev_notifications', 'Show Dev Notifications button');
}

// Save options to storage (sync on Chrome/Firefox, local on Safari)
function save_options() {
  const themeValue = themeSelect ? themeSelect.value : THEMES.SYSTEM;
  const alignmentValue = alignmentSelect ? alignmentSelect.value : ALIGNMENTS.START;
  const favouritesValue = showFavouritesCheckbox ? showFavouritesCheckbox.checked : false;
  const aiNotetakersValue = showAiNotetakersCheckbox ? showAiNotetakersCheckbox.checked : false;
  const devNotificationsValue = showDevNotificationsCheckbox ? showDevNotificationsCheckbox.checked : false;
  storageSet({
    gmailCalDebug: debugCheckbox.checked,
    [SHOW_BUTTON_TEXT_KEY]: showButtonTextCheckbox.checked,
    [SHOW_FAVOURITES_KEY]: favouritesValue,
    [SHOW_AI_NOTETAKERS_KEY]: aiNotetakersValue,
    [SHOW_DEV_NOTIFICATIONS_KEY]: devNotificationsValue,
    [ALIGNMENT_KEY]: alignmentValue,
    [THEME_KEY]: themeValue,
  }).catch((error) => {
    console.error('Error saving options:', error);
  });
  applyTheme(document, themeValue);
}

// Restore options from storage (sync on Chrome/Firefox, local on Safari)
function restore_options() {
  storageGet(['gmailCalDebug', SHOW_BUTTON_TEXT_KEY, SHOW_FAVOURITES_KEY, SHOW_AI_NOTETAKERS_KEY, SHOW_DEV_NOTIFICATIONS_KEY, ALIGNMENT_KEY, THEME_KEY])
    .then((storageData) => {
      debugCheckbox.checked = !!storageData.gmailCalDebug;
      showButtonTextCheckbox.checked = !!storageData[SHOW_BUTTON_TEXT_KEY];
      const restoredTheme = normalizeTheme(storageData[THEME_KEY] ?? THEMES.SYSTEM);
      const restoredAlignment = normalizeAlignment(storageData[ALIGNMENT_KEY]);
      const showFavourites = !!storageData[SHOW_FAVOURITES_KEY];
      const showAiNotetakers = !!storageData[SHOW_AI_NOTETAKERS_KEY];
      const showDevNotifications = !!storageData[SHOW_DEV_NOTIFICATIONS_KEY];
      if (themeSelect) {
        themeSelect.value = restoredTheme;
      }
      if (alignmentSelect) {
        alignmentSelect.value = restoredAlignment;
      }
      if (showFavouritesCheckbox) {
        showFavouritesCheckbox.checked = showFavourites;
      }
      if (showAiNotetakersCheckbox) {
        showAiNotetakersCheckbox.checked = showAiNotetakers;
      }
      if (showDevNotificationsCheckbox) {
        showDevNotificationsCheckbox.checked = showDevNotifications;
      }
      applyTheme(document, restoredTheme);
    })
    .catch((error) => {
      console.error('Error retrieving options:', error);
    });
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
if (showAiNotetakersCheckbox) {
  showAiNotetakersCheckbox.addEventListener('change', save_options);
}
if (showDevNotificationsCheckbox) {
  showDevNotificationsCheckbox.addEventListener('change', save_options);
}

// Load options when the page is loaded
document.addEventListener('DOMContentLoaded', restore_options);
