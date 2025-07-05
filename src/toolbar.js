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

export function injectToolbar(doc = document) {
  const header = doc.querySelector(SELECTORS.gmailToolbarHeader);
  if (!header) return;

  let wrapper = doc.querySelector(SELECTORS.filterWrapper);
  if (!wrapper) {
    wrapper = doc.createElement('div');
    wrapper.className = 'gcal-filter-wrapper';
    header.appendChild(wrapper);
  }

  if (header.lastChild !== wrapper) {
    header.appendChild(wrapper);
  }

  let bar = doc.querySelector(SELECTORS.filterBar);
  if (!bar) {
    bar = doc.createElement('div');
    bar.className = 'gcal-filter-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', chrome.i18n.getMessage('label_toolbar'));

    const btnGroup = doc.createElement('div');
    btnGroup.className = 'gcal-btn-group';

    const labelSpan = doc.createElement('span');
    labelSpan.className = 'gcal-label';
    labelSpan.textContent = chrome.i18n.getMessage('label_options');
    btnGroup.appendChild(labelSpan);

    const ICON_MAP = {
      [MODES.ALL]: 'select_all',
      [MODES.EMAIL]: 'mail',
      [MODES.CALENDAR]: 'calendar_month',
      [MODES.ATTACH]: 'attachment',
      [MODES.FAVOURITES]: 'star',
    };

    Object.values(MODES).forEach(mode => {
      const button = doc.createElement('button');
      button.dataset.mode = mode;
      button.id = `gcal-${mode.toLowerCase().replace('_', '-')}-only`;

      const iconSpan = doc.createElement('span');
      iconSpan.className = 'material-symbols-outlined';
      iconSpan.textContent = ICON_MAP[mode];

      const textSpan = doc.createElement('span');
      textSpan.className = 'text-label';
      textSpan.textContent = chrome.i18n.getMessage(FILTER_CONFIG[mode].labelKey);

      button.appendChild(iconSpan);
      button.appendChild(textSpan);
      btnGroup.appendChild(button);
    });

    bar.appendChild(btnGroup);
    wrapper.appendChild(bar);

    const liveRegion = doc.createElement('div');
    liveRegion.className = 'gcal-live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.style.cssText = 'position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;';
    wrapper.appendChild(liveRegion);
  } else if (bar.parentNode !== wrapper) {
    wrapper.appendChild(bar);
  }

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
