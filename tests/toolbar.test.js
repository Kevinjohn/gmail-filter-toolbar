import { describe, beforeEach, test, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import {
  injectToolbar,
  updateButtonTextView,
  updateAlignmentView,
  updateFavouritesVisibility,
  refreshUI,
} from '../src/modules/toolbar.js';
import {
  MODES,
  setCurrentMode,
  setShowFavouritesButton,
  setToolbarAlignment,
  showFavouritesButton,
  toolbarAlignment,
} from '../src/modules/state.js';
import { SELECTORS } from '../src/modules/constants.js';

const { useChromeMock } = global;

beforeEach(() => {
  useChromeMock({
    i18n: {
      getMessage: (key, substitutions) => {
        const map = {
          label_toolbar: 'Calendar filter',
          label_options: 'Calendar options',
          filter_status_update: `Filter set to ${substitutions?.[0] ?? ''}`,
          btn_all: 'Everything',
          btn_mail: 'Emails',
          btn_cal: 'Calendar',
          btn_attach: 'Attachments',
          btn_fav: 'Favourites',
          button_filter_images: 'Images Only',
          button_filter_pdfs: 'PDFs Only',
          button_filter_documents: 'Documents Only',
          button_filter_spreadsheets: 'Spreadsheets Only',
          button_filter_presentations: 'Presentations Only',
        };
        return map[key] ?? key;
      },
    },
  });
});

const createDocument = () => {
  const dom = new JSDOM('<div class="aeH"></div>');
  global.document = dom.window.document;
  return dom.window.document;
};

const renderToolbar = ({ alignment = 'start', favourites = true } = {}) => {
  const doc = createDocument();
  const header = doc.querySelector('.aeH');
  setToolbarAlignment(alignment);
  setShowFavouritesButton(favourites);
  injectToolbar(doc, header);
  const wrapper = header.nextElementSibling;
  return { doc, header, wrapper };
};

describe('injectToolbar', () => {
  test('creates toolbar wrapper and live region', () => {
    const { wrapper } = renderToolbar();
    const bar = wrapper.querySelector(SELECTORS.filterBar);
    const liveRegion = wrapper.querySelector(SELECTORS.liveRegion);

    expect(bar).not.toBeNull();
    expect(liveRegion).not.toBeNull();
    expect(liveRegion.getAttribute('role')).toBe('status');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
  });

  test('hides favourites button when preference disabled', () => {
    const { wrapper } = renderToolbar({ favourites: false });
    const favourites = wrapper.querySelector('#filter-FAVOURITES');
    expect(favourites.hidden).toBe(true);
    expect(favourites.getAttribute('aria-hidden')).toBe('true');
  });

  test('applies center alignment class', () => {
    const { wrapper } = renderToolbar({ alignment: 'center' });
    const bar = wrapper.querySelector(SELECTORS.filterBar);
    const group = wrapper.querySelector('.gcal-btn-group');
    expect(bar.classList.contains('gcal-align-center')).toBe(true);
    expect(group.classList.contains('gcal-align-center')).toBe(true);
  });
});

describe('update helpers', () => {
  test('updateButtonTextView toggles icon-only mode', () => {
    const { doc, wrapper } = renderToolbar();
    const bar = wrapper.querySelector(SELECTORS.filterBar);
    expect(bar.classList.contains('show-icon-only')).toBe(false);
    updateButtonTextView(false, doc);
    expect(bar.classList.contains('show-icon-only')).toBe(true);
  });

  test('updateAlignmentView syncs classes when bar exists', () => {
    const { doc, wrapper } = renderToolbar();
    const bar = wrapper.querySelector(SELECTORS.filterBar);
    const group = wrapper.querySelector('.gcal-btn-group');
    expect(toolbarAlignment).toBe('start');
    updateAlignmentView('center', doc);
    expect(bar.classList.contains('gcal-align-center')).toBe(true);
    expect(group.classList.contains('gcal-align-center')).toBe(true);
  });

  test('updateFavouritesVisibility toggles attributes', () => {
    const { doc, wrapper } = renderToolbar({ favourites: true });
    const favourites = wrapper.querySelector('#filter-FAVOURITES');
    expect(favourites.hidden).toBe(false);
    updateFavouritesVisibility(false, doc);
    expect(favourites.hidden).toBe(true);
    expect(favourites.getAttribute('aria-hidden')).toBe('true');
    updateFavouritesVisibility(true, doc);
    expect(favourites.hidden).toBe(false);
    expect(favourites.hasAttribute('aria-hidden')).toBe(false);
  });
});

describe('refreshUI', () => {
  test('reflects currentMode in aria attributes and live region', () => {
    const { doc, wrapper } = renderToolbar();
    setCurrentMode(MODES.CALENDAR);
    refreshUI(doc);
    const calendarButton = wrapper.querySelector('#filter-CALENDAR');
    expect(calendarButton.getAttribute('aria-checked')).toBe('true');
    expect(calendarButton.getAttribute('tabindex')).toBe('0');
    const liveRegion = wrapper.querySelector(SELECTORS.liveRegion);
    expect(liveRegion.textContent).toBe('Filter set to Calendar');
  });

  test('announces fallback label for unknown mode', () => {
    const { doc, wrapper } = renderToolbar();
    setCurrentMode('UNKNOWN_MODE');
    refreshUI(doc);
    const liveRegion = wrapper.querySelector(SELECTORS.liveRegion);
    expect(liveRegion.textContent).toBe('Filter set to Everything');
  });
});

describe('state wiring sanity', () => {
  test('exports reflect latest preference values after toolbar render', () => {
    renderToolbar({ alignment: 'center', favourites: false });
    expect(toolbarAlignment).toBe('center');
    expect(showFavouritesButton).toBe(false);
  });
});
