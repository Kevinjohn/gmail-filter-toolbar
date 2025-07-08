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
      if (key === 'button_filter_images') return 'Images Only';
      if (key === 'button_filter_pdfs') return 'PDFs Only';
      if (key === 'button_filter_documents') return 'Documents Only';
      if (key === 'button_filter_spreadsheets') return 'Spreadsheets Only';
      if (key === 'button_filter_presentations') return 'Presentations Only';
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

    expect(headerHtml).toContain('<button id="filter-ALL" data-mode="ALL" role="radio" aria-label="All Email" data-tooltip="All Email" aria-checked="true" tabindex="0"><span class="material-symbols-outlined">inbox</span><span class="gcal-text-label">All Email</span></button>');
    expect(headerHtml).toContain('<button id="filter-EMAIL" data-mode="EMAIL" role="radio" aria-label="Email only" data-tooltip="Email only" aria-checked="false" tabindex="-1"><span class="material-symbols-outlined">mail</span><span class="gcal-text-label">Email only</span></button>');
    expect(headerHtml).toContain('<button id="filter-CALENDAR" data-mode="CALENDAR" role="radio" aria-label="Calendar only" data-tooltip="Calendar only" aria-checked="false" tabindex="-1"><span class="material-symbols-outlined">calendar_today</span><span class="gcal-text-label">Calendar only</span></button>');
    expect(headerHtml).toContain('<button id="filter-ATTACH" data-mode="ATTACH" role="radio" aria-label="Attachments only" data-tooltip="Attachments only" aria-checked="false" tabindex="-1"><span class="material-symbols-outlined">attachment</span><span class="gcal-text-label">Attachments only</span></button>');
    expect(headerHtml).toContain('<button id="filter-FAVOURITES" data-mode="FAVOURITES" role="radio" aria-label="Favourites only" data-tooltip="Favourites only" aria-checked="false" tabindex="-1"><span class="material-symbols-outlined">star</span><span class="gcal-text-label">Favourites only</span></button>');
  });
});

describe('createToolbar', () => {
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

  test('should add five new attachment filter buttons', () => {
    const buttons = wrapper.querySelectorAll('button[data-mode]');
    // Original 5 buttons + 5 new attachment buttons
    expect(buttons.length).toBe(10);
  });

  test('should create a button with id filter-IMAGE', () => {
    const imageButton = wrapper.querySelector('button#filter-IMAGE');
    expect(imageButton).not.toBeNull();
    expect(imageButton.getAttribute('aria-label')).toBe('Images Only');
    expect(imageButton.querySelector('.material-symbols-outlined').textContent).toBe('image');
  });

  test('should create a button with id filter-PDF', () => {
    const pdfButton = wrapper.querySelector('button#filter-PDF');
    expect(pdfButton).not.toBeNull();
    expect(pdfButton.getAttribute('aria-label')).toBe('PDFs Only');
    expect(pdfButton.querySelector('.material-symbols-outlined').textContent).toBe('picture_as_pdf');
  });

  test('should create a button with id filter-DOCUMENT', () => {
    const documentButton = wrapper.querySelector('button#filter-DOCUMENT');
    expect(documentButton).not.toBeNull();
    expect(documentButton.getAttribute('aria-label')).toBe('Documents Only');
    expect(documentButton.querySelector('.material-symbols-outlined').textContent).toBe('article');
  });

  test('should create a button with id filter-SPREADSHEET', () => {
    const spreadsheetButton = wrapper.querySelector('button#filter-SPREADSHEET');
    expect(spreadsheetButton).not.toBeNull();
    expect(spreadsheetButton.getAttribute('aria-label')).toBe('Spreadsheets Only');
    expect(spreadsheetButton.querySelector('.material-symbols-outlined').textContent).toBe('assessment');
  });

  test('should create a button with id filter-PRESENTATION', () => {
    const presentationButton = wrapper.querySelector('button#filter-PRESENTATION');
    expect(presentationButton).not.toBeNull();
    expect(presentationButton.getAttribute('aria-label')).toBe('Presentations Only');
    expect(presentationButton.querySelector('.material-symbols-outlined').textContent).toBe('slideshow');
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