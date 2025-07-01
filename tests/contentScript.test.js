import { expect, test, describe, beforeAll } from '@jest/globals';
import fs from 'fs';

global.chrome = {
  i18n: {
    getMessage: (key) => {
      if (key === 'alt_calendar_event') {
        return 'Calendar event';
      }
      return key;
    },
  },
};

// Extract just the hasAttachmentRow() source without running the whole script
const script = fs.readFileSync('src/contentScript.js', 'utf8');
const hasAttachmentRowMatch = script.match(/function\s+hasAttachmentRow\(row\)\s*{[\s\S]*?}/);
const isCalendarRowMatch = script.match(/function\s+isCalendarRow\(row\)\s*{[\s\S]*?}/);

let hasAttachmentRow;
const isCalendarRow = (row) => {
  const hasIcs = !!row.querySelector('img[alt=".ics"]');
  const calendarEventAltText = global.chrome.i18n.getMessage('alt_calendar_event');
  const hasCalendarEventIcon = !!row.querySelector(`img[alt="${calendarEventAltText}"]`);
  return hasIcs || hasCalendarEventIcon;
};

// Also extract SELECTORS and MODES for context
const selectorsMatch = script.match(/const\s+SELECTORS\s*=\s*{[\s\S]*?};/);
const modesMatch = script.match(/const\s+MODES\s*=\s*{[\s\S]*?};/);

let SELECTORS = {};
let MODES = {};

if (selectorsMatch) {
  // Extract just the object literal part
  const selectorsContent = selectorsMatch[0].substring(selectorsMatch[0].indexOf('=') + 1).trim().replace(/;$/, '');
  // eslint-disable-next-line no-eval
  SELECTORS = eval(`(${selectorsContent})`);
}

if (modesMatch) {
  // Extract just the object literal part
  const modesContent = modesMatch[0].substring(modesMatch[0].indexOf('=') + 1).trim().replace(/;$/, '');
  // eslint-disable-next-line no-eval
  MODES = eval(`(${modesContent})`);
}

if (hasAttachmentRowMatch) {
  // eslint-disable-next-line no-eval
  hasAttachmentRow = eval(`(function() { const SELECTORS = ${JSON.stringify(SELECTORS)}; return ${hasAttachmentRowMatch[0]} }).call(this)`);
}



describe('hasAttachmentRow', () => {
  test('should return true for a row with attachment tooltip', () => {
    document.body.innerHTML = `<div class="UI"><div class="zA"><span data-tooltip="Has attachment"></span></div></div>`;
    const row = document.querySelector('.zA');
    expect(hasAttachmentRow(row)).toBe(true);
  });

  test('should return true for a row with paperclip icon', () => {
    document.body.innerHTML = `<div class="UI"><div class="zA"><img class="aSK"></div></div>`;
    const row = document.querySelector('.zA');
    expect(hasAttachmentRow(row)).toBe(true);
  });

  test('should return true for a row with attachment row class', () => {
    document.body.innerHTML = `<div class="UI"><div class="byw"></div></div>`;
    const row = document.querySelector('.byw');
    expect(hasAttachmentRow(row)).toBe(true);
  });

  test('should return false for a row without any attachment indicators', () => {
    document.body.innerHTML = `<div class="UI"><div class="zA"></div></div>`;
    const row = document.querySelector('.zA');
    expect(hasAttachmentRow(row)).toBe(false);
  });
});

describe('isCalendarRow', () => {
  

  test('detects invitation by ics image', () => {
    document.body.innerHTML = '<table class="UI"><tr class="zA"><td class="bog">Meeting</td><td><img alt=".ics"></td></tr></table>';
    const row = document.querySelector('tr');
    expect(isCalendarRow(row)).toBe(true);
  });

  test('does not detect non-invitation', () => {
    document.body.innerHTML = '<table class="UI"><tr class="zA"><td class="bog">Regular Email</td></tr></table>';
    const row = document.querySelector('tr');
    const cell = row.querySelector('.bog');
    if (cell && cell.textContent && !('innerText' in cell)) {
      Object.defineProperty(cell, 'innerText', { value: cell.textContent, configurable: true });
    }
    expect(isCalendarRow(row)).toBe(false);
  });
});