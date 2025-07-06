import { MODES, currentMode, debugOn } from './state.js';
import { SELECTORS } from './constants.js';

export function isCalendarRow(row, chromeApi = chrome) {
  const hasIcs = !!row.querySelector(SELECTORS.icsImage);
  const calendarEventAltText = chromeApi.i18n.getMessage('alt_calendar_event');
  const hasCalendarEventIcon = !!row.querySelector(`img[alt="${calendarEventAltText}"]`);
  return hasIcs || hasCalendarEventIcon;
}

export function hasAttachmentRow(row) {
  const hasBywClass = row.classList.contains(SELECTORS.attachmentRowClass);
  const hasAttachmentTooltip = !!row.querySelector(SELECTORS.attachmentTooltip);
  const hasPaperclipIcon = !!row.querySelector(SELECTORS.attachmentIcon);
  return hasBywClass || hasAttachmentTooltip || hasPaperclipIcon;
}

export function isFavouriteRow(row, chromeApi = chrome) {
  const starredAltText = chromeApi.i18n.getMessage('alt_starred');
  return !!row.querySelector(`span[data-tooltip="${starredAltText}"]`);
}

const FILTER_CONFIG = {
  [MODES.ALL]: {
    labelKey: 'btn_all',
    filterFn: () => false,
  },
  [MODES.EMAIL]: {
    labelKey: 'btn_mail',
    filterFn: (row) => isCalendarRow(row),
  },
  [MODES.CALENDAR]: {
    labelKey: 'btn_cal',
    filterFn: (row) => !isCalendarRow(row),
  },
  [MODES.ATTACH]: {
    labelKey: 'btn_attach',
    filterFn: (row) => !hasAttachmentRow(row) || isCalendarRow(row),
  },
  [MODES.FAVOURITES]: {
    labelKey: 'btn_fav',
    filterFn: (row) => !isFavouriteRow(row),
  },
};

export function applyFilter() {
  const currentFilter = FILTER_CONFIG[currentMode];
  if (!currentFilter) return;

  document.querySelectorAll(SELECTORS.emailRow).forEach((row) => {
    const hide = currentFilter.filterFn(row);

    if (debugOn) {
      row.style.display = '';
      row.style.background = hide ? 'rgba(0,123,255,.15)' : '';
      row.style.opacity = hide ? '0.5' : '';
    } else {
      row.style.background = '';
      row.style.opacity = '';
      row.style.display = hide ? 'none' : '';
    }
  });
}
