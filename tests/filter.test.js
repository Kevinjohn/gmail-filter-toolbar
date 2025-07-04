import { expect, test, describe, beforeEach, jest } from '@jest/globals';
import { applyFilter } from '../src/modules/filter.js';
import { MODES, setCurrentMode } from '../src/modules/state.js';
import { SELECTORS } from '../src/modules/constants.js';

// Mock the chrome API
global.chrome = {
  i18n: {
    getMessage: (key) => {
      if (key === 'alt_calendar_event') return 'Calendar event';
      return key;
    },
  },
};

describe('applyFilter with MODES.FAVOURITES', () => {
  let mockRows;

  beforeEach(() => {
    mockRows = [
      { querySelector: (selector) => selector === 'img[alt="Starred"]', style: { display: '' } }, // Favourite
      { querySelector: (selector) => false, style: { display: '' } }, // Non-favourite
      { querySelector: (selector) => selector === 'img[alt="Starred"]', style: { display: '' } }, // Favourite
      { querySelector: (selector) => selector === 'img[alt=".ics"]', style: { display: '' } }, // Calendar (non-favourite)
      { querySelector: (selector) => selector === '[data-tooltip="Has attachment"]', style: { display: '' } }, // Attachment (non-favourite)
    ];

    jest.spyOn(document, 'querySelectorAll').mockReturnValue(mockRows);
    setCurrentMode(MODES.FAVOURITES);
    applyFilter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should hide non-favourite rows and show favourite rows', () => {
    expect(mockRows[0].style.display).toBe(''); // Favourite
    expect(mockRows[1].style.display).toBe('none'); // Non-favourite
    expect(mockRows[2].style.display).toBe(''); // Favourite
    expect(mockRows[3].style.display).toBe('none'); // Calendar (non-favourite)
    expect(mockRows[4].style.display).toBe('none'); // Attachment (non-favourite)
  });
});