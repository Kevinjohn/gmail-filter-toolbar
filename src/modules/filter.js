/**
 * Filter Module - DOM Operations Security Audit
 *
 * Security Note: This module has been audited for DOM security.
 * - All DOM operations use safe methods (style property access, no innerHTML)
 * - No user-generated content is inserted into the DOM
 * - Filter predicates operate on safe DOM queries
 * - All text comparisons use safe getAttribute and textContent access
 */

import { MODES } from './state.js';
import { stateManager } from './stateManager.js';
import { configurationManager, getSelector } from './configurationManager.js';

export function isCalendarRow(row, chromeApi = chrome) {
  const hasIcs = !!row.querySelector(getSelector('icsImage'));
  const calendarEventAltText = chromeApi.i18n.getMessage('alt_calendar_event');
  const hasCalendarEventIcon = !!row.querySelector(`img[alt="${calendarEventAltText}"]`);
  return hasIcs || hasCalendarEventIcon;
}

export function isGoogleDocAttachment(row) {
  const attachmentChips = row.querySelectorAll(getSelector('attachmentChip'));
  for (const chip of attachmentChips) {
    const gdriveLink = chip.getAttribute('data-docurl');
    if (gdriveLink && gdriveLink.includes('google.com')) {
      return true;
    }
  }
  return false;
}

export function hasAttachmentRow(row) {
  const attachmentRowClass = configurationManager.getClassName('attachmentRowClass');
  const hasBywClass = row.classList.contains(attachmentRowClass);
  const hasAttachmentTooltip = !!row.querySelector(getSelector('attachmentTooltip'));
  const hasPaperclipIcon = !!row.querySelector(getSelector('attachmentIcon'));
  return hasBywClass || hasAttachmentTooltip || hasPaperclipIcon || isGoogleDocAttachment(row);
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
  const config = configurationManager.getAttachmentTypeConfig(attachmentType);
  if (!config) return false;

  const attachmentChips = row.querySelectorAll(getSelector('attachmentChip'));

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

/**
 * Get filter function for a specific mode
 * @param {string} mode - The filter mode
 * @returns {Function|null} The filter function that returns true to hide the row
 */
function getFilterFunction(mode) {
  switch (mode) {
    case MODES.ALL:
      return () => false; // Show all emails
    case MODES.EMAIL:
      return (row) => isCalendarRow(row); // Hide calendar events
    case MODES.CALENDAR:
      return (row) => !isCalendarRow(row); // Hide non-calendar emails
    case MODES.ATTACH:
      return (row) => !hasAttachmentRow(row) || isCalendarRow(row); // Hide emails without attachments, but show calendar events
    case MODES.FAVOURITES:
      return (row) => !isFavouriteRow(row); // Hide non-starred emails
    case MODES.IMAGE:
      return (row) => !hasSpecificAttachmentType(row, MODES.IMAGE); // Hide emails without image attachments
    case MODES.PDF:
      return (row) => !hasSpecificAttachmentType(row, MODES.PDF); // Hide emails without PDF attachments
    case MODES.DOCUMENT:
      return (row) => !hasSpecificAttachmentType(row, MODES.DOCUMENT); // Hide emails without document attachments
    case MODES.SPREADSHEET:
      return (row) => !hasSpecificAttachmentType(row, MODES.SPREADSHEET); // Hide emails without spreadsheet attachments
    case MODES.PRESENTATION:
      return (row) => !hasSpecificAttachmentType(row, MODES.PRESENTATION); // Hide emails without presentation attachments
    default:
      return () => false; // Default to showing all
  }
}

export function applyFilter() {
  const currentMode = stateManager.get('filterMode');
  const debugMode = stateManager.get('debugMode');
  
  const filterFn = getFilterFunction(currentMode);
  if (!filterFn) return;

  document.querySelectorAll(getSelector('emailRow')).forEach((row) => {
    const hide = filterFn(row);

    if (debugMode) {
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

// Subscribe to state changes to automatically apply filters when state changes
stateManager.subscribe('stateChanged:filterMode', () => {
  applyFilter();
});

stateManager.subscribe('stateChanged:debugMode', () => {
  applyFilter();
});
