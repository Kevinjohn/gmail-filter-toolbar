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
  const value = globalThis.chrome?.i18n?.getMessage?.(key);
  return value || fallback;
}

// Set document language dynamically based on browser locale
const uiLanguage = globalThis.chrome?.i18n?.getUILanguage?.() || 'en';
const rtlLanguages = new Set(['ar', 'fa', 'he', 'ur']);
document.documentElement.lang = uiLanguage;
document.documentElement.dir = rtlLanguages.has(uiLanguage.split(/[-_]/)[0]) ? 'rtl' : 'ltr';

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
document.getElementById('debugLegend').textContent = getMessage(
  'options_debug_legend',
  'Debugging',
);
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
  showFavouritesLabel.textContent = getMessage(
    'options_show_favourites_label',
    'Show Favourites button',
  );
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
  experimentalDescription.textContent = getMessage(
    'experimental_description',
    'Experimental features are in active testing and may only be available in English.',
  );
}

const showAiNotetakersLabel = document.querySelector('[data-i18n="options_show_ai_notetakers"]');
if (showAiNotetakersLabel) {
  showAiNotetakersLabel.textContent = getMessage(
    'options_show_ai_notetakers',
    'Show AI & Transcription button',
  );
}

const showDevNotificationsLabel = document.querySelector(
  '[data-i18n="options_show_dev_notifications"]',
);
if (showDevNotificationsLabel) {
  showDevNotificationsLabel.textContent = getMessage(
    'options_show_dev_notifications',
    'Show Dev Notifications button',
  );
}

let persistedOptions = null;

function readOptionsFromControls() {
  return {
    gmailCalDebug: debugCheckbox.checked,
    [SHOW_BUTTON_TEXT_KEY]: showButtonTextCheckbox.checked,
    [SHOW_FAVOURITES_KEY]: showFavouritesCheckbox?.checked ?? false,
    [SHOW_AI_NOTETAKERS_KEY]: showAiNotetakersCheckbox?.checked ?? false,
    [SHOW_DEV_NOTIFICATIONS_KEY]: showDevNotificationsCheckbox?.checked ?? false,
    [ALIGNMENT_KEY]: alignmentSelect?.value ?? ALIGNMENTS.START,
    [THEME_KEY]: themeSelect?.value ?? THEMES.SYSTEM,
  };
}

function applyOptionsToControls(options) {
  debugCheckbox.checked = options.gmailCalDebug;
  showButtonTextCheckbox.checked = options[SHOW_BUTTON_TEXT_KEY];
  if (showFavouritesCheckbox) showFavouritesCheckbox.checked = options[SHOW_FAVOURITES_KEY];
  if (showAiNotetakersCheckbox) {
    showAiNotetakersCheckbox.checked = options[SHOW_AI_NOTETAKERS_KEY];
  }
  if (showDevNotificationsCheckbox) {
    showDevNotificationsCheckbox.checked = options[SHOW_DEV_NOTIFICATIONS_KEY];
  }
  if (alignmentSelect) alignmentSelect.value = options[ALIGNMENT_KEY];
  if (themeSelect) themeSelect.value = options[THEME_KEY];
  applyTheme(document, options[THEME_KEY]);
}

// Save options through the browser-compatible storage abstraction.
function save_options() {
  const nextOptions = readOptionsFromControls();
  applyTheme(document, nextOptions[THEME_KEY]);
  storageSet(nextOptions)
    .then(() => {
      persistedOptions = nextOptions;
    })
    .catch((error) => {
      console.error('Error saving options:', error);
      if (persistedOptions) applyOptionsToControls(persistedOptions);
    });
}

// Restore options through the browser-compatible storage abstraction.
function restore_options() {
  if (!globalThis.chrome?.storage) {
    persistedOptions = {
      gmailCalDebug: false,
      [SHOW_BUTTON_TEXT_KEY]: true,
      [SHOW_FAVOURITES_KEY]: false,
      [SHOW_AI_NOTETAKERS_KEY]: false,
      [SHOW_DEV_NOTIFICATIONS_KEY]: false,
      [ALIGNMENT_KEY]: ALIGNMENTS.START,
      [THEME_KEY]: THEMES.SYSTEM,
    };
    applyOptionsToControls(persistedOptions);
    return;
  }

  storageGet([
    'gmailCalDebug',
    SHOW_BUTTON_TEXT_KEY,
    SHOW_FAVOURITES_KEY,
    SHOW_AI_NOTETAKERS_KEY,
    SHOW_DEV_NOTIFICATIONS_KEY,
    ALIGNMENT_KEY,
    THEME_KEY,
  ])
    .then((storageData) => {
      persistedOptions = {
        gmailCalDebug: !!storageData.gmailCalDebug,
        [SHOW_BUTTON_TEXT_KEY]:
          storageData[SHOW_BUTTON_TEXT_KEY] === undefined
            ? true
            : !!storageData[SHOW_BUTTON_TEXT_KEY],
        [SHOW_FAVOURITES_KEY]: !!storageData[SHOW_FAVOURITES_KEY],
        [SHOW_AI_NOTETAKERS_KEY]: !!storageData[SHOW_AI_NOTETAKERS_KEY],
        [SHOW_DEV_NOTIFICATIONS_KEY]: !!storageData[SHOW_DEV_NOTIFICATIONS_KEY],
        [ALIGNMENT_KEY]: normalizeAlignment(storageData[ALIGNMENT_KEY]),
        [THEME_KEY]: normalizeTheme(storageData[THEME_KEY] ?? THEMES.SYSTEM),
      };
      applyOptionsToControls(persistedOptions);
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
