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
  wrapper.appendChild(bar); // Append bar to the wrapper

  const btnGroup = doc.createElement('div');
  btnGroup.className = 'gcal-btn-group';

  const labelSpan = doc.createElement('span');
  labelSpan.className = 'gcal-label';
  labelSpan.textContent = chrome.i18n.getMessage('label_options');
  btnGroup.appendChild(labelSpan);

  Object.values(MODES).forEach(mode => {
    let iconName = '';
    switch (mode) {
      case MODES.ALL:
        iconName = 'inbox';
        break;
      case MODES.EMAIL:
        iconName = 'mail';
        break;
      case MODES.CALENDAR:
        iconName = 'calendar_today';
        break;
      case MODES.ATTACH:
        iconName = 'attachment';
        break;
      case MODES.FAVOURITES:
        iconName = 'star';
        break;
    }

    const button = doc.createElement('button');
    button.dataset.mode = mode;

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
  liveRegion.className = 'gcal-live-region';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.style.cssText = 'position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;';
  wrapper.appendChild(liveRegion);

  refreshUI(doc);

  if (!bar.dataset.listenerAdded) {
    bar.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const list = ensureListElement(doc);
        list?.focus();
      }
    });
    bar.dataset.listenerAdded = 'true';
  }
}

export function refreshUI(doc = document) {
  const bar = doc.querySelector(SELECTORS.filterBar);
  if (!bar) return;

  bar.querySelectorAll('button[data-mode]').forEach((btn) => {
    btn.toggleAttribute('data-active', btn.dataset.mode === currentMode);
    btn.setAttribute('aria-pressed', btn.dataset.mode === currentMode);
  });

  const liveRegion = doc.querySelector(SELECTORS.liveRegion);
  if (liveRegion) {
    const currentModeLabel = chrome.i18n.getMessage(FILTER_CONFIG[currentMode].labelKey);
    liveRegion.textContent = chrome.i18n.getMessage('filter_status_update', [currentModeLabel]);
  }
}
