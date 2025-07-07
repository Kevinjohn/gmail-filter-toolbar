import { SELECTORS } from './constants.js';
import { MODES, currentMode } from './state.js';

const FILTER_CONFIG = {
  [MODES.ALL]: {
    labelKey: 'btn_all',
  },
  [MODES.EMAIL]: {
    labelKey: 'btn_mail',
  },
  [MODES.CALENDAR]: {
    labelKey: 'btn_cal',
  },
  [MODES.ATTACH]: {
    labelKey: 'btn_attach',
  },
  [MODES.FAVOURITES]: {
    labelKey: 'btn_fav',
  },
};

const MODE_ICONS = {
  [MODES.ALL]: 'inbox',
  [MODES.EMAIL]: 'mail',
  [MODES.CALENDAR]: 'calendar_today',
  [MODES.ATTACH]: 'attachment',
  [MODES.FAVOURITES]: 'star',
};

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

  Object.values(MODES).forEach((mode) => {
    const iconName = MODE_ICONS[mode];

    const button = doc.createElement('button');
    button.dataset.mode = mode;
    button.setAttribute('role', 'radio');
    const buttonText = chrome.i18n.getMessage(FILTER_CONFIG[mode].labelKey);
    button.setAttribute('aria-label', buttonText);
    button.dataset.tooltip = buttonText;

    const icon = doc.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = iconName;
    button.appendChild(icon);

    const textSpan = doc.createElement('span');
    textSpan.className = 'gcal-text-label';
    textSpan.textContent = chrome.i18n.getMessage(FILTER_CONFIG[mode].labelKey);
    button.appendChild(textSpan);

    btnGroup.appendChild(button);
  });

  bar.appendChild(btnGroup);

  const liveRegion = doc.createElement('div');
  liveRegion.className = 'gcal-live-region visually-hidden';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  wrapper.appendChild(liveRegion);

  refreshUI(doc);

  if (!bar.dataset.listenerAdded) {
    bar.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const list = ensureListElement(doc);
        list?.focus();
      }
    });
    btnGroup.addEventListener('keydown', handleArrowNavigation);
    bar.dataset.listenerAdded = 'true';
  }
}

function handleArrowNavigation(e) {
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

export function refreshUI(doc = document) {
  const bar = doc.querySelector(SELECTORS.filterBar);
  if (!bar) return;

  bar.querySelectorAll('button[data-mode]').forEach((btn) => {
    const isChecked = btn.dataset.mode === currentMode;
    btn.setAttribute('aria-checked', isChecked);
    btn.setAttribute('tabindex', isChecked ? '0' : '-1');
  });

  const liveRegion = doc.querySelector(SELECTORS.liveRegion);
  if (liveRegion) {
    const currentModeLabel = chrome.i18n.getMessage(FILTER_CONFIG[currentMode].labelKey);
    liveRegion.textContent = chrome.i18n.getMessage('filter_status_update', [currentModeLabel]);
  }
}
