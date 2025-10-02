import { MODES, currentMode, debugOn } from './state.js';
import { SELECTORS, ATTACHMENT_TYPE_CONFIG, AI_NOTETAKER_PATTERNS } from './constants.js';

/**
 * Checks if an email row is a calendar invitation.
 * @stable
 */
export function isCalendarRow(row, chromeApi = chrome) {
  const hasIcs = !!row.querySelector(SELECTORS.icsImage);
  const calendarEventAltText = chromeApi.i18n.getMessage('alt_calendar_event');
  const hasCalendarEventIcon = !!row.querySelector(`img[alt="${calendarEventAltText}"]`);
  return hasIcs || hasCalendarEventIcon;
}

/**
 * Checks if an email row has Google Doc attachments.
 * @stable
 */
export function isGoogleDocAttachment(row) {
  const attachmentChips = row.querySelectorAll(SELECTORS.attachmentChip);
  for (const chip of attachmentChips) {
    const gdriveLink = chip.getAttribute('data-docurl');
    if (gdriveLink && gdriveLink.includes('google.com')) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if an email row has any attachments.
 * @stable
 */
export function hasAttachmentRow(row) {
  const hasBywClass = row.classList.contains(SELECTORS.attachmentRowClass);
  const hasAttachmentTooltip = !!row.querySelector(SELECTORS.attachmentTooltip);
  const hasPaperclipIcon = !!row.querySelector(SELECTORS.attachmentIcon);
  return hasBywClass || hasAttachmentTooltip || hasPaperclipIcon || isGoogleDocAttachment(row);
}

/**
 * Checks if an email row is starred/favourited.
 * @stable
 */
export function isFavouriteRow(row, chromeApi = chrome) {
  const starredAltText = chromeApi.i18n.getMessage('alt_starred');
  return !!row.querySelector(`span[data-tooltip="${starredAltText}"]`);
}

/**
 * Checks if an email row is from an AI service or transcription tool.
 * Matches sender name against patterns in AI_NOTETAKER_PATTERNS.
 * @experimental
 * @since 2.3.0
 * @param {HTMLElement} row - The DOM element for the email row.
 * @returns {boolean} True if sender matches any AI/notetaker pattern.
 */
export function isAiNotetakerRow(row) {
  // Try primary selector
  let senderElement = row.querySelector(SELECTORS.senderName);

  // Fallback: try to find any span with email attribute in the sender area
  if (!senderElement) {
    senderElement = row.querySelector('.yW span[email]');
  }

  // Fallback: try to find the sender name in the row's text content
  if (!senderElement) {
    const senderContainer = row.querySelector('.yW');
    if (senderContainer) {
      const textContent = senderContainer.textContent || '';
      return AI_NOTETAKER_PATTERNS.some(pattern => pattern.test(textContent));
    }
    return false;
  }

  // Get sender name from name attribute, email attribute, or text content
  const senderName = senderElement.getAttribute('name') ||
                     senderElement.getAttribute('email') ||
                     senderElement.textContent || '';

  if (debugOn) {
    console.log('[AI Filter Debug] Sender name:', senderName, 'Element:', senderElement);
  }

  return AI_NOTETAKER_PATTERNS.some(pattern => pattern.test(senderName));
}

/**
 * Checks if an email row contains a specific type of attachment.
 * @stable
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
  [MODES.AI_NOTETAKERS]: {
    labelKey: 'btn_ai_notetakers',
    filterFn: (row) => !isAiNotetakerRow(row),
  },
};

export function applyFilter(doc = document) {
  const currentFilter = FILTER_CONFIG[currentMode];
  if (!currentFilter) return;

  doc.querySelectorAll(SELECTORS.emailRow).forEach((row) => {
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
