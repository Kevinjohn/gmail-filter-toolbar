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
import {
  createStorageWriteId,
  getActiveAreaName,
  onStorageChanged,
  OPTIONS_WRITE_ID_KEY,
  storageGet,
  storageSet,
} from './storage.js';

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
const statusMessage = document.getElementById('status-message');

const ALL_CONTROLS = [
  debugCheckbox,
  showButtonTextCheckbox,
  showFavouritesCheckbox,
  alignmentSelect,
  themeSelect,
  showAiNotetakersCheckbox,
  showDevNotificationsCheckbox,
].filter(Boolean);

// WHY: Controls stay disabled until the stored options have been restored. A click that lands before
// restore_options() resolves would compare against HTML defaults instead of the user's real values.
function setControlsDisabled(disabled) {
  ALL_CONTROLS.forEach((control) => {
    control.disabled = disabled;
  });
}
setControlsDisabled(true);

let statusTimeoutId = null;

function showStatus(text, { transient = false } = {}) {
  if (!statusMessage) return;
  if (statusTimeoutId) {
    clearTimeout(statusTimeoutId);
    statusTimeoutId = null;
  }
  statusMessage.textContent = text;
  if (transient && text) {
    statusTimeoutId = setTimeout(() => {
      statusMessage.textContent = '';
      statusTimeoutId = null;
    }, 2000);
  }
}

function getMessage(key, fallback) {
  const value = globalThis.chrome?.i18n?.getMessage?.(key);
  return value || fallback;
}

// Set document language dynamically based on browser locale.
// WHY: Only advertise a lang the extension actually ships — for an unshipped browser locale the page
// falls back to English text, and stamping e.g. lang="ja" on English copy makes screen readers use
// the wrong pronunciation language.
const SHIPPED_LOCALES = new Set([
  'ar',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'en-GB',
  'es',
  'es-419',
  'fi',
  'fr',
  'hi',
  'hu',
  'it',
  'nl',
  'no',
  'pl',
  'pt-BR',
  'pt-PT',
  'ro',
  'ru',
  'sv',
  'tr',
  'uk',
  'zh-CN',
]);
const uiLanguage = (globalThis.chrome?.i18n?.getUILanguage?.() || 'en').replace('_', '-');
const baseLanguage = uiLanguage.split('-')[0];
const documentLanguage = SHIPPED_LOCALES.has(uiLanguage)
  ? uiLanguage
  : SHIPPED_LOCALES.has(baseLanguage)
    ? baseLanguage
    : 'en';
const rtlLanguages = new Set(['ar', 'fa', 'he', 'ur']);
document.documentElement.lang = documentLanguage;
document.documentElement.dir = rtlLanguages.has(documentLanguage.split('-')[0]) ? 'rtl' : 'ltr';

function normalizeAlignment(value) {
  return Object.values(ALIGNMENTS).includes(value) ? value : ALIGNMENTS.START;
}

/**
 * Coerces a raw storage snapshot into a complete, valid options object.
 * Single source of truth for option defaults — used by the no-storage fallback, restore, and the
 * onChanged mirror so their semantics can't drift apart.
 */
function normalizeOptions(raw = {}) {
  return {
    gmailCalDebug: !!raw.gmailCalDebug,
    [SHOW_BUTTON_TEXT_KEY]:
      raw[SHOW_BUTTON_TEXT_KEY] === undefined ? true : !!raw[SHOW_BUTTON_TEXT_KEY],
    [SHOW_FAVOURITES_KEY]: !!raw[SHOW_FAVOURITES_KEY],
    [SHOW_AI_NOTETAKERS_KEY]: !!raw[SHOW_AI_NOTETAKERS_KEY],
    [SHOW_DEV_NOTIFICATIONS_KEY]: !!raw[SHOW_DEV_NOTIFICATIONS_KEY],
    [ALIGNMENT_KEY]: normalizeAlignment(raw[ALIGNMENT_KEY]),
    [THEME_KEY]: normalizeTheme(raw[THEME_KEY] ?? THEMES.SYSTEM),
  };
}

// Localize text content
document.title = getMessage('page_title', 'Filter Toolbar Options');
document.getElementById('pageTitle').textContent = getMessage(
  'page_title',
  'Filter Toolbar Options',
);
document.getElementById('pageDescription').textContent = getMessage(
  'options_page_description',
  'Configure filtering options and toolbar preferences for Gmail.',
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
let latestRequestedOptions = null;
let saveGeneration = 0;
let optionsSaveQueue = Promise.resolve();
const localOptionsWriteIds = new Set();
const optionIntentVersions = new Map();

const OPTION_KEYS = [
  'gmailCalDebug',
  SHOW_BUTTON_TEXT_KEY,
  SHOW_FAVOURITES_KEY,
  SHOW_AI_NOTETAKERS_KEY,
  SHOW_DEV_NOTIFICATIONS_KEY,
  ALIGNMENT_KEY,
  THEME_KEY,
];

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
  // WHY: Never save before the stored options have been restored — the controls would still hold
  // HTML defaults, so the change patch could be calculated against the wrong baseline.
  if (!persistedOptions) return;

  const nextOptions = readOptionsFromControls();
  const patch = Object.fromEntries(
    OPTION_KEYS.filter((key) => nextOptions[key] !== latestRequestedOptions?.[key]).map((key) => [
      key,
      nextOptions[key],
    ]),
  );
  if (!Object.keys(patch).length) return;

  const generation = ++saveGeneration;
  const requestVersions = new Map(
    Object.keys(patch).map((key) => {
      const version = (optionIntentVersions.get(key) ?? 0) + 1;
      optionIntentVersions.set(key, version);
      return [key, version];
    }),
  );
  latestRequestedOptions = nextOptions;
  applyTheme(document, nextOptions[THEME_KEY]);
  const saveTask = optionsSaveQueue
    .catch(() => {})
    .then(async () => {
      const activePatch = Object.fromEntries(
        Object.entries(patch).filter(
          ([key]) => optionIntentVersions.get(key) === requestVersions.get(key),
        ),
      );
      if (!Object.keys(activePatch).length) return null;

      const writeId = createStorageWriteId('options');
      localOptionsWriteIds.add(writeId);
      try {
        await storageSet({ ...activePatch, [OPTIONS_WRITE_ID_KEY]: writeId });
        return activePatch;
      } catch (error) {
        localOptionsWriteIds.delete(writeId);
        throw error;
      }
    });
  optionsSaveQueue = saveTask;
  saveTask
    .then((savedPatch) => {
      if (!savedPatch) return;
      const confirmedPatch = Object.fromEntries(
        Object.entries(savedPatch).filter(
          ([key]) => optionIntentVersions.get(key) === requestVersions.get(key),
        ),
      );
      persistedOptions = normalizeOptions({ ...persistedOptions, ...confirmedPatch });
      if (generation === saveGeneration && Object.keys(confirmedPatch).length) {
        showStatus(getMessage('options_status_saved', 'Settings saved'), { transient: true });
      }
    })
    .catch((error) => {
      console.error('Error saving options:', error);
      const failedCurrentKeys = Object.keys(patch).filter(
        (key) => optionIntentVersions.get(key) === requestVersions.get(key),
      );
      if (failedCurrentKeys.length) {
        latestRequestedOptions = {
          ...latestRequestedOptions,
          ...Object.fromEntries(failedCurrentKeys.map((key) => [key, persistedOptions[key]])),
        };
        applyOptionsToControls(latestRequestedOptions);
        showStatus(
          getMessage('options_status_save_error', 'Couldn’t save settings. Please try again.'),
        );
      }
    });
}

// WHY: Transient storage errors (temporary add-on IDs, sync backend hiccups) shouldn't leave the
// page dead — retry the restore a few times with backoff before surfacing the failure message.
const RESTORE_RETRY_DELAYS_MS = [500, 1000, 2000];
let restoreAttempts = 0;

// Restore options through the browser-compatible storage abstraction.
function restore_options() {
  if (!globalThis.chrome?.storage) {
    persistedOptions = normalizeOptions();
    applyOptionsToControls(persistedOptions);
    setControlsDisabled(false);
    return;
  }

  storageGet(OPTION_KEYS)
    .then((storageData) => {
      restoreAttempts = 0;
      persistedOptions = normalizeOptions(storageData);
      latestRequestedOptions = persistedOptions;
      applyOptionsToControls(persistedOptions);
      setControlsDisabled(false);
      showStatus('');
    })
    .catch((error) => {
      // WHY: Keep the controls disabled — they still show unsaved HTML defaults, and enabling them
      // would let a change persist that wrong snapshot over the user's stored preferences.
      console.error('Error retrieving options:', error);
      const retryDelay = RESTORE_RETRY_DELAYS_MS[restoreAttempts];
      restoreAttempts += 1;
      if (retryDelay !== undefined) {
        setTimeout(restore_options, retryDelay);
        return;
      }
      showStatus(
        getMessage(
          'options_status_load_error',
          'Couldn’t load settings. Close and reopen this page to try again.',
        ),
      );
    });
}

// Keep the page in sync when settings change elsewhere (another window, another synced profile).
if (globalThis.chrome?.storage?.onChanged) {
  onStorageChanged((changes, areaName) => {
    // WHY: Only react to the active backend's area — the legacy migration removes keys from
    // *local* after copying them to sync, and treating those removals (newValue: undefined) as
    // changes would reset every control to defaults and clobber the just-migrated preferences.
    if (areaName !== getActiveAreaName()) return;
    if (!persistedOptions) return;

    const writeId = changes[OPTIONS_WRITE_ID_KEY]?.newValue;
    if (localOptionsWriteIds.delete(writeId)) return;

    const nextPersisted = { ...persistedOptions };
    const nextRequested = { ...(latestRequestedOptions ?? persistedOptions) };
    let changed = false;
    for (const key of OPTION_KEYS) {
      if (key in changes) {
        const value = changes[key].newValue;
        nextPersisted[key] = value;
        nextRequested[key] = value;
        optionIntentVersions.set(key, (optionIntentVersions.get(key) ?? 0) + 1);
        changed = true;
      }
    }
    if (!changed) return;

    persistedOptions = normalizeOptions(nextPersisted);
    latestRequestedOptions = normalizeOptions(nextRequested);
    applyOptionsToControls(latestRequestedOptions);
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
document.addEventListener('DOMContentLoaded', restore_options, { once: true });
