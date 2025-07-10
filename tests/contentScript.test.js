import { expect, test, describe } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { isCalendarRow, hasAttachmentRow, isFavouriteRow } from '../src/modules/filter-refactored.js';
import { applyFilter } from '../src/modules/filter-refactored.js';
import { MODES, setCurrentMode } from '../src/modules/state.js';
import { SELECTORS } from '../src/modules/constants.js';

// Mock the chrome API and JSDOM
global.chrome = {
  i18n: {
    getMessage: (key) => {
      if (key === 'alt_calendar_event') return 'Calendar event';
      if (key === 'alt_starred') return 'Starred';
      return key;
    },
  },
};

const setupDOM = (html) => {
  const dom = new JSDOM(html);
  global.document = dom.window.document;
  return dom.window.document;
};

describe('hasAttachmentRow', () => {
  test('should return true for a row with attachment tooltip', () => {
    const doc = setupDOM(`<div class="UI"><div class="zA"><span data-tooltip="Has attachment"></span></div></div>`);
    const row = doc.querySelector('.zA');
    expect(hasAttachmentRow(row)).toBe(true);
  });

  test('should return true for a row with paperclip icon', () => {
    const doc = setupDOM(`<div class="UI"><div class="zA"><img class="aSK"></div></div>`);
    const row = doc.querySelector('.zA');
    expect(hasAttachmentRow(row)).toBe(true);
  });

  test('should return true for a row with attachment row class', () => {
    const doc = setupDOM(`<div class="UI"><div class="${SELECTORS.attachmentRowClass}"></div></div>`);
    const row = doc.querySelector(`.${SELECTORS.attachmentRowClass}`);
    expect(hasAttachmentRow(row)).toBe(true);
  });

  test('should return false for a row without any attachment indicators', () => {
    const doc = setupDOM(`<div class="UI"><div class="zA"></div></div>`);
    const row = doc.querySelector('.zA');
    expect(hasAttachmentRow(row)).toBe(false);
  });
});

describe('isCalendarRow', () => {
  test('detects invitation by ics image', () => {
    const doc = setupDOM(`<table class="UI"><tr class="zA"><td><img alt=".ics"></td></tr></table>`);
    const row = doc.querySelector('tr');
    expect(isCalendarRow(row)).toBe(true);
  });

  test('detects invitation by alt text', () => {
    const doc = setupDOM(`<table class="UI"><tr class="zA"><td><img alt="Calendar event"></td></tr></table>`);
    const row = doc.querySelector('tr');
    expect(isCalendarRow(row)).toBe(true);
  });

  test('does not detect non-invitation', () => {
    const doc = setupDOM('<table class="UI"><tr class="zA"><td>Regular Email</td></tr></table>');
    const row = doc.querySelector('tr');
    expect(isCalendarRow(row)).toBe(false);
  });
});

describe('isFavouriteRow', () => {
  test('should return true for a row with a starred image', () => {
    const doc = setupDOM('<div class="UI"><div class="zA"><td class="apU xY"><span id=":ph" class="T-KT T-KT-Jp" aria-label="Starred" role="button" data-tooltip="Starred"><img class="T-KT-JX" src="images/cleardot.gif" alt="Starred"></span></td></div></div>');
    const row = doc.querySelector('.zA');
    expect(isFavouriteRow(row)).toBe(true);
  });

  test('should return false for a row without a starred image', () => {
    const doc = setupDOM('<div class="UI"><div class="zA"></div></div>');
    const row = doc.querySelector('.zA');
    expect(isFavouriteRow(row)).toBe(false);
  });
});