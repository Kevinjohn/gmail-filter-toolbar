import { expect, test, describe, beforeEach, afterEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { injectToolbar, refreshUI } from '../src/modules/toolbar.js';
import { MODES, setCurrentMode, saveState, currentMode } from '../src/modules/state.js';
import { SELECTORS } from '../src/modules/constants.js';
import { applyFilter } from '../src/modules/filter.js';

// Mock the chrome API
global.chrome = {
  i18n: {
    getMessage: jest.fn((key, substitutions) => {
      if (key === 'label_toolbar') return 'Calendar filter';
      if (key === 'label_options') return 'Calendar options:';
      if (key === 'filter_status_update') return `Filter set to ${substitutions ? substitutions[0] : ''}`;
      if (key === 'btn_all') return 'All Email';
      if (key === 'btn_mail') return 'Email only';
      if (key === 'btn_cal') return 'Calendar only';
      if (key === 'btn_attach') return 'Attachments only';
      if (key === 'btn_fav') return 'Favourites only';
      return `Mocked ${key}`;
    }),
  },
  storage: {
    sync: {
      set: jest.fn(),
    },
  },
};

jest.mock('../src/modules/filter.js', () => ({
  applyFilter: jest.fn(),
}));

jest.mock('../src/modules/state.js', () => ({
  ...jest.requireActual('../src/modules/state.js'),
  setCurrentMode: jest.fn((mode) => {
    jest.requireActual('../src/modules/state.js').setCurrentMode(mode);
  }),
  saveState: jest.fn(),
}));

const setupDOM = (html) => {
  const dom = new JSDOM(html);
  global.document = dom.window.document;
  return dom.window.document;
};

function simulateClick(mode) {
    const button = document.querySelector(`button[data-mode="${mode}"]`);
    if (button) {
        button.click(); // This will trigger the event listener in contentScript.js
    } else {
        throw new Error(`Button for mode ${mode} not found.`); // Fail fast if button is missing
    }
}

describe('injectToolbar', () => {
  let header;
  let doc;
  let wrapper;

  beforeEach(() => {
    document.body.innerHTML = ''; // Clear the DOM completely
    document.body.innerHTML = '<div class="gb_Id gb_Hd gb_Id"></div>'; // Establish a clean, consistent Gmail-like header
    doc = document;
    header = doc.querySelector('.gb_Id');
    injectToolbar(doc, header);
    wrapper = header.nextElementSibling;

    chrome.storage.sync.set.mockClear();
    chrome.i18n.getMessage.mockClear(); // Clear i18n mock calls as well
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should inject the toolbar and live region', () => {
    const toolbar = wrapper.querySelector(SELECTORS.filterBar);
    const liveRegion = wrapper.querySelector(SELECTORS.liveRegion);

    expect(wrapper).not.toBeNull();
    expect(toolbar).not.toBeNull();
    expect(liveRegion).not.toBeNull();
    expect(liveRegion.getAttribute('role')).toBe('status');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
  });

  test('should inject Material Icons into buttons', () => {
    injectToolbar(doc);
    const headerHtml = wrapper.innerHTML;

    expect(headerHtml).toContain('<button data-mode="ALL" data-active="" aria-pressed="true"><span class="material-symbols-outlined">inbox</span><span class="gcal-text-label">All Email</span></button>');
    expect(headerHtml).toContain('<button data-mode="HIDE_CAL" aria-pressed="false"><span class="material-symbols-outlined">mail</span><span class="gcal-text-label">Email only</span></button>');
    expect(headerHtml).toContain('<button data-mode="ONLY_CAL" aria-pressed="false"><span class="material-symbols-outlined">calendar_today</span><span class="gcal-text-label">Calendar only</span></button>');
    expect(headerHtml).toContain('<button data-mode="ONLY_ATTACH" aria-pressed="false"><span class="material-symbols-outlined">attachment</span><span class="gcal-text-label">Attachments only</span></button>');
    expect(headerHtml).toContain('<button data-mode="FAVOURITES" aria-pressed="false"><span class="material-symbols-outlined">star</span><span class="gcal-text-label">Favourites only</span></button>');
  });
});

describe('refreshUI', () => {
  let header;
  let doc;
  let wrapper;

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
    injectToolbar(doc, header); // Ensure toolbar is injected before refreshUI is called
    wrapper = header.nextElementSibling;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should update the live region text for ALL mode', () => {
    setCurrentMode(MODES.ALL);
    refreshUI(doc);
    const liveRegion = wrapper.querySelector(SELECTORS.liveRegion);
    expect(liveRegion.textContent).toBe('Filter set to All Email');
  });

  test('should update the live region text for FAVOURITES mode', () => {
    setCurrentMode(MODES.FAVOURITES);
    refreshUI(doc);
    const liveRegion = wrapper.querySelector(SELECTORS.liveRegion);
    expect(liveRegion.textContent).toBe('Filter set to Favourites only');
  });
});