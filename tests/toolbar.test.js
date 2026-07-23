import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import {
  injectToolbar,
  updateButtonTextView,
  updateAlignmentView,
  updateFavouritesVisibility,
  refreshUI,
  handleArrowNavigation,
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

  test('reuses existing wrapper and clears previous toolbar', () => {
    const { doc, header, wrapper } = renderToolbar();
    const stale = doc.createElement('div');
    wrapper.appendChild(stale);
    injectToolbar(doc, header);
    const newWrapper = header.nextElementSibling;
    expect(newWrapper).toBe(wrapper);
    expect(newWrapper.contains(stale)).toBe(false);
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

  test('gracefully handles missing elements', () => {
    const emptyDoc = document.implementation.createHTMLDocument('empty');
    expect(() => updateButtonTextView(false, emptyDoc)).not.toThrow();
    expect(() => updateAlignmentView('center', emptyDoc)).not.toThrow();
    expect(() => updateFavouritesVisibility(true, emptyDoc)).not.toThrow();
    expect(() => refreshUI(emptyDoc)).not.toThrow();
  });
});

describe('keyboard accessibility', () => {
  test('Escape focuses the message list and applies tabindex', () => {
    const dom = new JSDOM('<div class="aeH"></div><div class="UI"></div>');
    const doc = dom.window.document;
    global.document = doc;
    const list = doc.querySelector('.UI');
    list.focus = jest.fn();
    injectToolbar(doc, doc.querySelector('.aeH'));
    const bar = doc.querySelector(SELECTORS.filterBar);
    bar.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(list.getAttribute('tabindex')).toBe('-1');
    expect(list.focus).toHaveBeenCalled();
  });

  test('Escape retains existing tabindex when already present', () => {
    const dom = new JSDOM('<div class="aeH"></div><div class="UI" tabindex="0"></div>');
    const doc = dom.window.document;
    global.document = doc;
    const list = doc.querySelector('.UI');
    list.focus = jest.fn();
    injectToolbar(doc, doc.querySelector('.aeH'));
    const bar = doc.querySelector(SELECTORS.filterBar);
    bar.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(list.getAttribute('tabindex')).toBe('0');
    expect(list.focus).toHaveBeenCalled();
  });

  test('Arrow navigation cycles focus and triggers click', () => {
    const dom = new JSDOM('<div class="aeH"></div>');
    const doc = dom.window.document;
    global.document = doc;
    const firstButton = { focus: jest.fn(), click: jest.fn(), hidden: false };
    const secondButton = { focus: jest.fn(), click: jest.fn(), hidden: false };
    const fakeGroup = {
      querySelectorAll: () => [firstButton, secondButton],
    };
    const preventDefault = jest.fn();
    const originalDescriptor = Object.getOwnPropertyDescriptor(global.document.__proto__, 'activeElement')
      || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(global.document), 'activeElement');
    Object.defineProperty(global.document, 'activeElement', {
      configurable: true,
      get: () => firstButton,
    });
    handleArrowNavigation({ key: 'ArrowRight', currentTarget: fakeGroup, preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(secondButton.focus).toHaveBeenCalled();
    expect(secondButton.click).toHaveBeenCalled();
    if (originalDescriptor) {
      Object.defineProperty(global.document, 'activeElement', originalDescriptor);
    } else {
      delete global.document.activeElement;
    }
  });

  test('ArrowLeft wraps focus to the last button', () => {
    const dom = new JSDOM('<div class="aeH"></div>');
    const doc = dom.window.document;
    global.document = doc;
    const firstButton = { focus: jest.fn(), click: jest.fn(), hidden: false };
    const lastButton = { focus: jest.fn(), click: jest.fn(), hidden: false };
    const fakeGroup = {
      querySelectorAll: () => [firstButton, lastButton],
    };
    const preventDefault = jest.fn();
    const originalDescriptor = Object.getOwnPropertyDescriptor(global.document.__proto__, 'activeElement')
      || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(global.document), 'activeElement');
    Object.defineProperty(global.document, 'activeElement', {
      configurable: true,
      get: () => firstButton,
    });
    handleArrowNavigation({ key: 'ArrowLeft', currentTarget: fakeGroup, preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(lastButton.focus).toHaveBeenCalled();
    expect(lastButton.click).toHaveBeenCalled();
    if (originalDescriptor) {
      Object.defineProperty(global.document, 'activeElement', originalDescriptor);
    } else {
      delete global.document.activeElement;
    }
  });

  test('skips hidden buttons when navigating', () => {
    const dom = new JSDOM('<div class="aeH"></div>');
    const doc = dom.window.document;
    global.document = doc;
    const firstButton = { focus: jest.fn(), click: jest.fn(), hidden: false };
    const hiddenButton = { focus: jest.fn(), click: jest.fn(), hidden: true };
    const lastButton = { focus: jest.fn(), click: jest.fn(), hidden: false };
    const fakeGroup = {
      querySelectorAll: () => [firstButton, hiddenButton, lastButton],
    };
    const preventDefault = jest.fn();
    const originalDescriptor = Object.getOwnPropertyDescriptor(global.document.__proto__, 'activeElement')
      || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(global.document), 'activeElement');
    Object.defineProperty(global.document, 'activeElement', {
      configurable: true,
      get: () => firstButton,
    });
    handleArrowNavigation({ key: 'ArrowRight', currentTarget: fakeGroup, preventDefault });
    expect(hiddenButton.focus).not.toHaveBeenCalled();
    expect(hiddenButton.click).not.toHaveBeenCalled();
    expect(lastButton.focus).toHaveBeenCalled();
    expect(lastButton.click).toHaveBeenCalled();
    if (originalDescriptor) {
      Object.defineProperty(global.document, 'activeElement', originalDescriptor);
    } else {
      delete global.document.activeElement;
    }
  });

  test('ignores non-arrow keys', () => {
    const fakeGroup = {
      querySelectorAll: jest.fn(),
    };
    const preventDefault = jest.fn();
    handleArrowNavigation({ key: 'Enter', currentTarget: fakeGroup, preventDefault });
    expect(fakeGroup.querySelectorAll).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  test('returns early when no button is focused', () => {
    const dom = new JSDOM('<div class="aeH"></div>');
    const doc = dom.window.document;
    global.document = doc;
    const firstButton = { focus: jest.fn(), click: jest.fn(), hidden: false };
    const secondButton = { focus: jest.fn(), click: jest.fn(), hidden: false };
    const fakeGroup = {
      querySelectorAll: () => [firstButton, secondButton],
    };
    const preventDefault = jest.fn();
    const originalDescriptor = Object.getOwnPropertyDescriptor(global.document.__proto__, 'activeElement')
      || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(global.document), 'activeElement');
    Object.defineProperty(global.document, 'activeElement', {
      configurable: true,
      get: () => null,
    });
    handleArrowNavigation({ key: 'ArrowRight', currentTarget: fakeGroup, preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(secondButton.focus).not.toHaveBeenCalled();
    expect(secondButton.click).not.toHaveBeenCalled();
    if (originalDescriptor) {
      Object.defineProperty(global.document, 'activeElement', originalDescriptor);
    } else {
      delete global.document.activeElement;
    }
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

  test('uses attachment labels when current mode is attachment specific', () => {
    const { doc, wrapper } = renderToolbar();
    setCurrentMode(MODES.PDF);
    refreshUI(doc);
    const liveRegion = wrapper.querySelector(SELECTORS.liveRegion);
    expect(liveRegion.textContent).toBe('Filter set to PDFs Only');
  });

  test('handles missing live region without errors', () => {
    const dom = new JSDOM('<div class="aeH"></div>');
    const doc = dom.window.document;
    global.document = doc;
    injectToolbar(doc, doc.querySelector('.aeH'));
    const bar = doc.querySelector(SELECTORS.filterBar);
    expect(bar).not.toBeNull();
    const liveRegion = doc.querySelector(SELECTORS.liveRegion);
    liveRegion?.remove();
    expect(() => refreshUI(doc)).not.toThrow();
  });
});

describe('state wiring sanity', () => {
  test('exports reflect latest preference values after toolbar render', () => {
    renderToolbar({ alignment: 'center', favourites: false });
    expect(toolbarAlignment).toBe('center');
    expect(showFavouritesButton).toBe(false);
  });
});
