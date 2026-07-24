import {
  ALIGNMENTS,
  ATTACHMENT_TYPE_CONFIG,
  FILTER_WRAPPER_CLASS,
  SELECTORS,
} from './constants.js';
import {
  MODES,
  currentMode,
  showFavouritesButton,
  showAiNotetakersButton,
  showDevNotificationsButton,
  showButtonText,
  toolbarAlignment,
} from './state.js';

// Define the base filter configurations for non-attachment modes
const BASE_FILTER_CONFIG = {
  [MODES.ALL]: {
    icon: 'inbox',
    labelKey: 'btn_all',
  },
  [MODES.EMAIL]: {
    icon: 'mail',
    labelKey: 'btn_mail',
  },
  [MODES.CALENDAR]: {
    icon: 'calendar_today',
    labelKey: 'btn_cal',
  },
  [MODES.FAVOURITES]: {
    icon: 'star',
    labelKey: 'btn_fav',
  },
  [MODES.ATTACH]: {
    icon: 'attachment',
    labelKey: 'btn_attach',
  },
  [MODES.AI_NOTETAKERS]: {
    icon: 'smart_toy',
    labelKey: 'btn_ai_notetakers',
  },
  [MODES.DEV_NOTIFICATIONS]: {
    icon: 'code',
    labelKey: 'btn_dev_notifications',
  },
};

const BASE_FILTER_ORDER = [MODES.ALL, MODES.EMAIL, MODES.CALENDAR, MODES.FAVOURITES, MODES.ATTACH];

function ensureListElement(doc = document) {
  const list = doc.querySelector(SELECTORS.emailList);
  if (list && !list.hasAttribute('tabindex')) {
    list.setAttribute('tabindex', '-1');
  }
  return list;
}

/**
 * Detects an orphaned content script (extension updated/reloaded while the tab stayed open).
 * WHY: An orphan's observers keep firing, and its injectToolbar would wipe the live toolbar built
 * by the new script's context and then throw on the first chrome.* call — leaving the wrapper
 * permanently empty. Checking runtime.id BEFORE any DOM mutation lets the orphan bow out cleanly.
 */
export function isExtensionContextInvalidated() {
  // WHY: try/catch because Firefox replaces an orphaned content script's chrome/browser object
  // with a dead wrapper whose property access can itself throw — a throw means "orphaned" too.
  try {
    const runtime = globalThis.chrome?.runtime;
    return !!runtime && !runtime.id;
  } catch {
    return true;
  }
}

export function injectToolbar(doc = document, headerElement) {
  if (isExtensionContextInvalidated()) return;

  const header = headerElement || doc.querySelector(SELECTORS.gmailToolbarHeader);
  if (!header) return;

  const wrappers = Array.from(doc.querySelectorAll(SELECTORS.filterWrapper));
  let wrapper = wrappers.shift();
  wrappers.forEach((duplicate) => duplicate.remove());

  if (!wrapper) {
    wrapper = doc.createElement('div');
    wrapper.className = FILTER_WRAPPER_CLASS;
  }

  // WHY: Rebuilding (and even just repositioning — a DOM move blurs to <body>) drops keyboard
  // focus if it was inside the wrapper. Capture the focused button BEFORE any DOM mutation so it
  // can be restored after re-injection.
  const previousFocusId = wrapper.contains(doc.activeElement) ? doc.activeElement.id : null;

  if (header.nextElementSibling !== wrapper) {
    header.insertAdjacentElement('afterend', wrapper);
  }

  wrapper.replaceChildren();

  // Create the bar element and append it to the wrapper
  const bar = doc.createElement('div'); // Always create a new bar
  bar.className = 'gcal-filter-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', chrome.i18n.getMessage('label_toolbar'));
  wrapper.appendChild(bar);

  const btnGroup = doc.createElement('div');
  btnGroup.className = 'gcal-btn-group';
  btnGroup.setAttribute('role', 'radiogroup');

  const labelId = 'gcal-filter-label';
  const labelSpan = doc.createElement('span');
  labelSpan.className = 'gcal-label';
  labelSpan.id = labelId;
  labelSpan.textContent = chrome.i18n.getMessage('label_options');
  btnGroup.appendChild(labelSpan);
  btnGroup.setAttribute('aria-labelledby', labelId);

  // Add base filter buttons
  BASE_FILTER_ORDER.forEach((mode) => {
    const config = BASE_FILTER_CONFIG[mode];
    const button = createFilterButton(doc, mode, config.icon, config.labelKey);
    if (mode === MODES.FAVOURITES && !showFavouritesButton) {
      button.hidden = true;
      button.setAttribute('aria-hidden', 'true');
      button.setAttribute('tabindex', '-1');
    }
    btnGroup.appendChild(button);
  });

  // Add attachment filter buttons dynamically
  Object.keys(ATTACHMENT_TYPE_CONFIG).forEach((mode) => {
    const config = ATTACHMENT_TYPE_CONFIG[mode];
    const button = createFilterButton(doc, mode, config.icon, config.labelKey);
    btnGroup.appendChild(button);
  });

  // Add AI & Transcription button at the end
  const aiConfig = BASE_FILTER_CONFIG[MODES.AI_NOTETAKERS];
  const aiButton = createFilterButton(doc, MODES.AI_NOTETAKERS, aiConfig.icon, aiConfig.labelKey);
  if (!showAiNotetakersButton) {
    aiButton.hidden = true;
    aiButton.setAttribute('aria-hidden', 'true');
    aiButton.setAttribute('tabindex', '-1');
  }
  btnGroup.appendChild(aiButton);

  // Add Dev Notifications button
  const devConfig = BASE_FILTER_CONFIG[MODES.DEV_NOTIFICATIONS];
  const devButton = createFilterButton(
    doc,
    MODES.DEV_NOTIFICATIONS,
    devConfig.icon,
    devConfig.labelKey,
  );
  if (!showDevNotificationsButton) {
    devButton.hidden = true;
    devButton.setAttribute('aria-hidden', 'true');
    devButton.setAttribute('tabindex', '-1');
  }
  btnGroup.appendChild(devButton);

  bar.appendChild(btnGroup);

  const liveRegion = doc.createElement('div');
  liveRegion.className = 'gcal-live-region visually-hidden';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  wrapper.appendChild(liveRegion);

  updateAlignmentView(toolbarAlignment, doc);
  updateButtonVisibility(MODES.FAVOURITES, showFavouritesButton, doc);
  updateButtonVisibility(MODES.AI_NOTETAKERS, showAiNotetakersButton, doc);
  updateButtonVisibility(MODES.DEV_NOTIFICATIONS, showDevNotificationsButton, doc);
  updateButtonTextView(showButtonText, doc);
  refreshUI(doc);

  if (previousFocusId) {
    const focusTarget = doc.getElementById(previousFocusId);
    if (focusTarget && !focusTarget.hidden) {
      focusTarget.focus();
    }
  }

  bar.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const list = ensureListElement(doc);
      list?.focus();
    }
  });
  btnGroup.addEventListener('keydown', handleArrowNavigation);
}

/**
 * Helper function to create a filter button.
 * @param {string} mode - The filter mode (e.g., MODES.ALL, MODES.IMAGE).
 * @param {string} iconName - The Material Icon name.
 * @param {string} labelKey - The i18n key for the button's label.
 * @returns {HTMLButtonElement} The created button element.
 */
function createFilterButton(doc, mode, iconName, labelKey) {
  const button = doc.createElement('button');
  button.id = `filter-${mode}`;
  button.dataset.mode = mode;
  button.setAttribute('role', 'radio');
  const buttonText = chrome.i18n.getMessage(labelKey);
  button.setAttribute('aria-label', buttonText);
  button.dataset.tooltip = buttonText;
  // WHY: data-tooltip is a Gmail-internal convention that Gmail does not render for injected
  // elements; the native title attribute guarantees sighted mouse users a hover hint in icon-only mode.
  button.title = buttonText;

  const icon = doc.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.textContent = iconName;
  button.appendChild(icon);

  const textSpan = doc.createElement('span');
  textSpan.className = 'gcal-text-label';
  textSpan.textContent = chrome.i18n.getMessage(labelKey);
  button.appendChild(textSpan);

  return button;
}

const NAVIGATION_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);

export function handleArrowNavigation(e) {
  const { key } = e;
  if (!NAVIGATION_KEYS.has(key)) return;

  // WHY: Exclude hidden buttons (Favourites/AI/Dev filters when disabled in options) — otherwise arrow keys
  // could focus and activate an invisible button, silently switching the user into a filter they can't see.
  const buttons = Array.from(e.currentTarget.querySelectorAll('button[role="radio"]')).filter(
    (btn) => !btn.hidden,
  );
  const focusedIndex = buttons.findIndex((btn) => btn === document.activeElement);

  if (focusedIndex === -1) return;

  e.preventDefault();

  // WHY: Per the ARIA radiogroup pattern, horizontal arrows must follow the visual direction —
  // in RTL Gmail (Arabic locale) ArrowRight moves to the visually-next button, which is DOM-previous.
  // Resolve getComputedStyle from the element's own window so detached/foreign documents don't throw.
  let isRtl = false;
  const view = e.currentTarget?.ownerDocument?.defaultView;
  if (view?.getComputedStyle) {
    try {
      isRtl = view.getComputedStyle(e.currentTarget).direction === 'rtl';
    } catch {
      isRtl = false;
    }
  }
  const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
  const previousKey = isRtl ? 'ArrowRight' : 'ArrowLeft';

  let nextIndex;
  if (key === 'Home') {
    nextIndex = 0;
  } else if (key === 'End') {
    nextIndex = buttons.length - 1;
  } else if (key === previousKey || key === 'ArrowUp') {
    nextIndex = (focusedIndex - 1 + buttons.length) % buttons.length;
  } else if (key === nextKey || key === 'ArrowDown') {
    nextIndex = (focusedIndex + 1) % buttons.length;
  } else {
    return;
  }

  buttons[nextIndex].focus();
  buttons[nextIndex].click();
}

export function updateButtonTextView(showText, doc = document) {
  const bar = doc.querySelector(SELECTORS.filterBar);
  if (bar) {
    bar.classList.toggle('show-icon-only', !showText);
  }
}

export function updateAlignmentView(alignment, doc = document) {
  const bar = doc.querySelector(SELECTORS.filterBar);
  if (!bar) {
    return;
  }

  const group = bar.querySelector('.gcal-btn-group');
  const isCenter = alignment === ALIGNMENTS.CENTER;
  bar.classList.toggle('gcal-align-center', isCenter);
  if (group) {
    group.classList.toggle('gcal-align-center', isCenter);
  }
}

export function updateButtonVisibility(mode, show, doc = document) {
  const button = doc.querySelector(`#filter-${mode}`);
  if (!button) {
    return;
  }

  button.hidden = !show;
  if (show) {
    button.removeAttribute('aria-hidden');
  } else {
    button.setAttribute('aria-hidden', 'true');
    button.setAttribute('aria-checked', 'false');
    button.setAttribute('tabindex', '-1');
  }
}

// WHY: Track the last announced filter across re-injections so the live region only speaks when the
// filter actually changes. Without this, every Gmail reflow re-announced the unchanged filter to
// screen-reader users. Starts as null so the initial page load records silently instead of announcing.
let lastAnnouncedText = null;

/** Reset announcement tracking (test helper). */
export function resetAnnouncementTracking() {
  lastAnnouncedText = null;
}

export function refreshUI(doc = document) {
  const bar = doc.querySelector(SELECTORS.filterBar);
  if (!bar) return;

  bar.querySelectorAll('button[data-mode]').forEach((filterButton) => {
    if (filterButton.hidden) {
      filterButton.setAttribute('aria-checked', 'false');
      filterButton.setAttribute('tabindex', '-1');
      return;
    }
    const isChecked = filterButton.dataset.mode === currentMode;
    filterButton.setAttribute('aria-checked', isChecked);
    filterButton.setAttribute('tabindex', isChecked ? '0' : '-1');
  });

  const liveRegion = doc.querySelector(SELECTORS.liveRegion);
  if (liveRegion) {
    // Determine the label key based on whether it's a base mode or an attachment mode
    let labelKey;
    if (BASE_FILTER_CONFIG[currentMode]) {
      labelKey = BASE_FILTER_CONFIG[currentMode].labelKey;
    } else if (ATTACHMENT_TYPE_CONFIG[currentMode]) {
      labelKey = ATTACHMENT_TYPE_CONFIG[currentMode].labelKey;
    } else {
      // Fallback for unknown modes, though this should ideally not happen
      labelKey = 'btn_all'; // Default to the Everything mode
    }
    const currentModeLabel = chrome.i18n.getMessage(labelKey);
    const announcement = chrome.i18n.getMessage('filter_status_update', [currentModeLabel]);
    if (lastAnnouncedText === null) {
      lastAnnouncedText = announcement;
    } else if (announcement !== lastAnnouncedText) {
      liveRegion.textContent = announcement;
      lastAnnouncedText = announcement;
    }
  }
}
