import { MODES, currentMode, debugOn } from './state.js';
import { SELECTORS, ATTACHMENT_TYPE_CONFIG } from './constants.js';

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

/**
 * Checks if an email row contains a specific type of attachment.
 * @param {HTMLElement} row - The DOM element for the email row.
 * @param {string} attachmentType - The key from ATTACHMENT_TYPE_CONFIG (e.g., 'IMAGE').
 * @returns {boolean} True if a matching attachment is found, otherwise false.
 */
export function hasSpecificAttachmentType(row, attachmentType) {
  const config = ATTACHMENT_TYPE_CONFIG[attachmentType];
  if (!config) return false;

  const attachmentChips = row.querySelectorAll(SELECTORS.attachmentChip);

  for (const chip of attachmentChips) {
    // Check for standard attachments by file extension
    const title = chip.getAttribute('title') || chip.querySelector('span')?.textContent;
    if (title) {
      const parts = title.split('.');
      const extension = parts.length > 1 ? parts.pop().toLowerCase() : '';
      if (config.extensions.includes(extension)) {
        return true;
      }
    }

    // Check for Google Drive attachments by image src
    const gdriveLink = chip.getAttribute('data-docurl');
    if (gdriveLink && gdriveLink.includes('google.com')) {
      const img = chip.querySelector('img');
      if (img && img.src.includes(config.gdriveIdentifier)) {
        return true;
      }
    }
  }
  return false;
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
  [MODES.IMAGE]: {
    labelKey: 'button_filter_images',
    filterFn: (row) => !hasSpecificAttachmentType(row, MODES.IMAGE),
  },
  [MODES.PDF]: {
    labelKey: 'button_filter_pdfs',
    filterFn: (row) => !hasSpecificAttachmentType(row, MODES.PDF),
  },
  [MODES.DOCUMENT]: {
    labelKey: 'button_filter_documents',
    filterFn: (row) => !hasSpecificAttachmentType(row, MODES.DOCUMENT),
  },
  [MODES.SPREADSHEET]: {
    labelKey: 'button_filter_spreadsheets',
    filterFn: (row) => !hasSpecificAttachmentType(row, MODES.SPREADSHEET),
  },
  [MODES.PRESENTATION]: {
    labelKey: 'button_filter_presentations',
    filterFn: (row) => !hasSpecificAttachmentType(row, MODES.PRESENTATION),
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
