import { ALIGNMENTS, ATTACHMENT_TYPE_CONFIG, SELECTORS } from './constants.js';
import { MODES, currentMode, showFavouritesButton, showAiNotetakersButton, toolbarAlignment } from './state.js';

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
};

const BASE_FILTER_ORDER = [
  MODES.ALL,
  MODES.EMAIL,
  MODES.CALENDAR,
  MODES.FAVOURITES,
  MODES.ATTACH,
];

function ensureListElement(doc = document) {
  const list = doc.querySelector(SELECTORS.emailList);
  if (list && !list.hasAttribute('tabindex')) {
    list.setAttribute('tabindex', '-1');
  }
  return list;
}

export function injectToolbar(doc = document, headerElement) {
  const header = headerElement || doc.querySelector(SELECTORS.gmailToolbarHeader);
  if (!header) return;

  let wrapper = header.nextElementSibling;
  if (wrapper && wrapper.classList.contains('gcal-filter-wrapper')) {
    // If wrapper exists and is our filter wrapper, clear its children
    while (wrapper.firstChild) {
      wrapper.removeChild(wrapper.firstChild);
    }
  } else {
    // If wrapper doesn't exist or is not our filter wrapper, create a new one
    wrapper = doc.createElement('div');
    wrapper.className = 'gcal-filter-wrapper';
    header.insertAdjacentElement('afterend', wrapper);
  }

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

  bar.appendChild(btnGroup);

  const liveRegion = doc.createElement('div');
  liveRegion.className = 'gcal-live-region visually-hidden';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  wrapper.appendChild(liveRegion);

  updateAlignmentView(toolbarAlignment, doc);
  updateFavouritesVisibility(showFavouritesButton, doc);
  updateAiNotetakersVisibility(showAiNotetakersButton, doc);
  refreshUI(doc);

  // NOTE: Commented out listener flag check (line 62 always creates a new bar element,
  // so this flag never exists and the condition is always true, making it dead code).
  // Keeping the commented code for now in case removing it causes unexpected issues.
  // if (!bar.dataset.listenerAdded) {
  bar.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const list = ensureListElement(doc);
      list?.focus();
    }
  });
  btnGroup.addEventListener('keydown', handleArrowNavigation);
  // bar.dataset.listenerAdded = 'true';
  // }
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

export function handleArrowNavigation(e) {
  const { key } = e;
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;

  const buttons = Array.from(e.currentTarget.querySelectorAll('button[role="radio"]'));
  const focusedIndex = buttons.findIndex((btn) => btn === document.activeElement);

  if (focusedIndex === -1) return;

  e.preventDefault();

  let nextIndex;
  if (key === 'ArrowLeft') {
    nextIndex = (focusedIndex - 1 + buttons.length) % buttons.length;
  } else {
    nextIndex = (focusedIndex + 1) % buttons.length;
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

export function updateFavouritesVisibility(show, doc = document) {
  const button = doc.querySelector('#filter-FAVOURITES');
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

/**
 * Shows or hides the AI & Transcription filter button.
 * @experimental
 * @param {boolean} show - Whether to show the button.
 * @param {Document} doc - The document object.
 */
export function updateAiNotetakersVisibility(show, doc = document) {
  const button = doc.querySelector('#filter-AI_NOTETAKERS');
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

export function refreshUI(doc = document) {
  const bar = doc.querySelector(SELECTORS.filterBar);
  if (!bar) return;

  bar.querySelectorAll('button[data-mode]').forEach((btn) => {
    if (btn.hidden) {
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('tabindex', '-1');
      return;
    }
    const isChecked = btn.dataset.mode === currentMode;
    btn.setAttribute('aria-checked', isChecked);
    btn.setAttribute('tabindex', isChecked ? '0' : '-1');
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
    liveRegion.textContent = chrome.i18n.getMessage('filter_status_update', [currentModeLabel]);
  }
}
