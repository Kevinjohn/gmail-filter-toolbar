import { expect, test, describe, beforeEach, afterEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { injectToolbar, refreshUI } from '../src/toolbar.js';
import { MODES, setCurrentMode } from '../src/state.js';
import { SELECTORS } from '../src/constants.js';

// Mock the chrome API
global.chrome = {
  i18n: {
    getMessage: (key, substitutions) => {
      if (key === 'label_toolbar') return 'Calendar filter';
      if (key === 'label_options') return 'Calendar options:';
      if (key === 'filter_status_update') return `Filter set to ${substitutions[0]}`;
      if (key === 'btn_all') return 'All Email';
      if (key === 'btn_mail') return 'Email only';
      if (key === 'btn_cal') return 'Calendar only';
      if (key === 'btn_attach') return 'Attachments only';
      if (key === 'btn_fav') return 'Favourites only';
      return key;
    },
  },
};

const setupDOM = (html) => {
  const dom = new JSDOM(html);
  global.document = dom.window.document;
  return dom.window.document;
};

describe('injectToolbar', () => {
  let header;
  let doc;

  beforeEach(() => {
    doc = setupDOM(`<div class="aeH"></div>`);
    header = doc.querySelector('.aeH');
    jest.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === SELECTORS.gmailToolbarHeader) {
        return header;
      }
      return doc.querySelector(selector);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should inject the toolbar and live region', () => {
    injectToolbar(doc);
    const wrapper = header.querySelector('.gcal-filter-wrapper');
    const toolbar = wrapper.querySelector(SELECTORS.filterBar);
    const liveRegion = wrapper.querySelector(SELECTORS.liveRegion);

    expect(wrapper).not.toBeNull();
    expect(toolbar).not.toBeNull();
    expect(liveRegion).not.toBeNull();
    expect(liveRegion.getAttribute('role')).toBe('status');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
  });
});

describe('refreshUI', () => {
  let header;
  let doc;

  beforeEach(() => {
    const doc = setupDOM(`
      <div class="aeH"></div>
    `);
    header = doc.querySelector('.aeH');
    jest.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === SELECTORS.gmailToolbarHeader) {
        return header;
      }
      return doc.querySelector(selector);
    });
    injectToolbar(doc); // Ensure toolbar is injected before refreshUI is called
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should update the live region text for ALL mode', () => {
    setCurrentMode(MODES.ALL);
    refreshUI(doc);
    const liveRegion = header.querySelector(SELECTORS.liveRegion);
    expect(liveRegion.textContent).toBe('Filter set to All Email');
  });

  test('should update the live region text for FAVOURITES mode', () => {
    setCurrentMode(MODES.FAVOURITES);
    refreshUI(doc);
    const liveRegion = header.querySelector(SELECTORS.liveRegion);
    expect(liveRegion.textContent).toBe('Filter set to Favourites only');
  });
});
