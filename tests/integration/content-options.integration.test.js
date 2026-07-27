import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

const { useChromeMock } = global;

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
const createEvent = (type, options = {}) => {
  const event = document.createEvent('Event');
  event.initEvent(type, Boolean(options.bubbles), Boolean(options.cancelable));
  return event;
};

const getGmailMarkup = () => `
  <div class="aeH">
    <div class="G-atb">
      <div class="G6" role="toolbar"></div>
    </div>
  </div>
  <div class="UI">
    <table>
      <tbody>
        <tr class="zA">
          <td class="bog">Subject line</td>
        </tr>
      </tbody>
    </table>
  </div>
`;

const getOptionsMarkup = () => `
  <section id="options-root">
    <h1 id="pageTitle"></h1>
    <p id="pageDescription"></p>
    <fieldset>
      <legend id="debugLegend"></legend>
      <div class="option-row">
        <label for="debug" id="debugLabel"></label>
        <input type="checkbox" id="debug" />
      </div>
    </fieldset>
    <fieldset>
      <legend id="showButtonTextLegend"></legend>
      <div class="option-row">
        <label for="show-button-text-checkbox" id="showButtonTextLabel"></label>
        <input type="checkbox" id="show-button-text-checkbox" />
      </div>
    </fieldset>
    <fieldset>
      <legend id="alignmentLegend"></legend>
      <div class="option-row">
        <label for="alignment-select" id="alignmentLabel"></label>
        <select id="alignment-select">
          <option id="alignmentOptionStart" value="start"></option>
          <option id="alignmentOptionCenter" value="center"></option>
        </select>
      </div>
      <div class="option-row">
        <label for="show-favourites-checkbox" id="showFavouritesLabel"></label>
        <input type="checkbox" id="show-favourites-checkbox" />
      </div>
    </fieldset>
    <fieldset>
      <legend id="themeLegend"></legend>
      <div class="option-row">
        <label for="theme-select" id="themeLabel"></label>
        <select id="theme-select">
          <option id="themeOptionSystem" value="system"></option>
          <option id="themeOptionLight" value="light"></option>
          <option id="themeOptionDark" value="dark"></option>
        </select>
      </div>
    </fieldset>
  </section>
`;

describe('Integration: DOM + Message Passing', () => {
  let storageListeners;
  let storedState;
  let failNextSet;
  let failMessage;
  let stateModule;
  let messageListener;

  const getMessageListener = () =>
    messageListener ?? global.chrome.runtime.onMessage.addListener.mock.calls.at(-1)?.[0];

  const initialiseDom = () => {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      url: 'https://example.com',
    });
    global.window = dom.window;
    global.document = dom.window.document;
    global.Node = dom.window.Node;
    global.Element = dom.window.Element;
    global.HTMLElement = dom.window.HTMLElement;
    global.Event = dom.window.Event;
    global.CustomEvent = dom.window.CustomEvent;
    global.navigator = dom.window.navigator;
    global.getComputedStyle = dom.window.getComputedStyle;
    global.requestAnimationFrame = (callback) => {
      const handle = setTimeout(() => callback(Date.now()), 0);
      return handle;
    };
    global.cancelAnimationFrame = (handle) => clearTimeout(handle);
    global.window.requestAnimationFrame = global.requestAnimationFrame;
    global.window.cancelAnimationFrame = global.cancelAnimationFrame;
    global.MutationObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      observe() {}
      disconnect() {}
    };
  };

  beforeEach(async () => {
    jest.resetModules();
    storageListeners = [];
    storedState = {
      gmailCalMode: 'ALL',
      gmailCalDebug: false,
      showButtonText: true,
      showFavourites: false,
      toolbarAlignment: 'start',
      gmailCalTheme: 'system',
    };
    failNextSet = false;
    failMessage = 'Storage write failure';
    messageListener = undefined;

    const overrideFactory = () => ({
      i18n: {
        getMessage: jest.fn((key, substitutions) => {
          const messages = {
            page_title: 'Calendar Options',
            options_page_description: 'Extension settings',
            options_debug_legend: 'Debugging',
            options_debug_label: 'Enable debug mode',
            optionShowButtonText: 'Show text on filter buttons',
            options_show_text_legend: 'Display',
            options_alignment_legend: 'Toolbar layout',
            options_alignment_label: 'Toolbar alignment',
            options_alignment_start: 'Start',
            options_alignment_center: 'Center',
            options_show_favourites_label: 'Show favourites button',
            options_theme_legend: 'Appearance',
            options_theme_label: 'Extension theme',
            options_theme_system: 'System',
            options_theme_light: 'Light',
            options_theme_dark: 'Dark',
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
            alt_calendar_event: 'Calendar event',
            alt_starred: 'Starred',
          };
          return messages[key] ?? key;
        }),
      },
      runtime: {
        lastError: null,
        onMessage: {
          addListener: jest.fn((listener) => {
            messageListener = listener;
          }),
          removeListener: jest.fn((listener) => {
            if (messageListener === listener) {
              messageListener = undefined;
            }
          }),
          hasListener: jest.fn((listener) => messageListener === listener),
        },
        sendMessage: jest.fn(),
      },
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            callback({ ...storedState });
          }),
          set: jest.fn((payload, callback) => {
            global.chrome.runtime.lastError = null;
            if (failNextSet) {
              global.chrome.runtime.lastError = new Error(failMessage);
              failNextSet = false;
              callback?.();
              return;
            }

            const previous = { ...storedState };
            storedState = { ...storedState, ...payload };
            callback?.();

            const changes = Object.keys(payload).reduce((acc, key) => {
              acc[key] = { oldValue: previous[key], newValue: storedState[key] };
              return acc;
            }, {});
            storageListeners.forEach((listener) => listener(changes, 'sync'));
          }),
        },
        onChanged: {
          addListener: jest.fn((listener) => {
            storageListeners.push(listener);
          }),
          removeListener: jest.fn((listener) => {
            storageListeners = storageListeners.filter((fn) => fn !== listener);
          }),
          hasListener: jest.fn((listener) => storageListeners.includes(listener)),
        },
      },
    });
    const overrides = overrideFactory();
    useChromeMock(overrides);
    global.__chromeOverrides = overrideFactory;

    initialiseDom();

    stateModule = await import('../../src/modules/state.js');
  });

  const loadContentScript = async () => {
    await import('../../src/contentScript.js');
    await flushPromises();
  };

  test('responds to runtime mode messages by updating toolbar and storage', async () => {
    document.body.innerHTML = getGmailMarkup();
    await loadContentScript();

    expect(global.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    const listener = getMessageListener();
    expect(listener).toBeDefined();

    const sendResponse = jest.fn();
    const result = listener(
      { type: 'gmailCal:setMode', payload: { mode: stateModule.MODES.CALENDAR } },
      {},
      sendResponse,
    );

    expect(result).toBe(true);
    await flushPromises();

    expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({ gmailCalMode: stateModule.MODES.CALENDAR }),
      expect.any(Function),
    );

    const calendarButton = document.querySelector('#filter-CALENDAR');
    expect(calendarButton?.getAttribute('aria-checked')).toBe('true');
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, mode: stateModule.MODES.CALENDAR });
  });

  test('options changes persist and propagate to toolbar listeners', async () => {
    document.body.innerHTML = `${getGmailMarkup()}${getOptionsMarkup()}`;
    await loadContentScript();
    await import('../../src/modules/options.js');
    document.dispatchEvent(createEvent('DOMContentLoaded'));

    // Wait for async storage operations (restore_options uses Promises)
    await flushPromises();

    const filterBar = document.querySelector('.gcal-filter-bar');
    expect(filterBar).not.toBeNull();

    const showTextCheckbox = document.getElementById('show-button-text-checkbox');
    expect(showTextCheckbox.checked).toBe(true);
    showTextCheckbox.checked = false;
    showTextCheckbox.dispatchEvent(createEvent('change', { bubbles: true }));
    await flushPromises();
    expect(filterBar.classList.contains('show-icon-only')).toBe(true);

    const alignmentSelect = document.getElementById('alignment-select');
    alignmentSelect.value = 'center';
    alignmentSelect.dispatchEvent(createEvent('change', { bubbles: true }));
    await flushPromises();
    expect(filterBar.classList.contains('gcal-align-center')).toBe(true);

    const favouritesCheckbox = document.getElementById('show-favourites-checkbox');
    favouritesCheckbox.checked = true;
    favouritesCheckbox.dispatchEvent(createEvent('change', { bubbles: true }));
    await flushPromises();
    const favouritesButton = document.querySelector('#filter-FAVOURITES');
    expect(favouritesButton?.hidden).toBe(false);

    expect(global.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    const listener = getMessageListener();
    const sendResponse = jest.fn();
    listener(
      { type: 'gmailCal:setMode', payload: { mode: stateModule.MODES.FAVOURITES } },
      {},
      sendResponse,
    );
    await flushPromises();
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, mode: stateModule.MODES.FAVOURITES });

    favouritesCheckbox.checked = false;
    favouritesCheckbox.dispatchEvent(createEvent('change', { bubbles: true }));
    await flushPromises();

    expect(favouritesButton?.hidden).toBe(true);
    expect(favouritesButton?.getAttribute('aria-hidden')).toBe('true');
    expect(storedState.gmailCalMode).toBe(stateModule.MODES.ALL);

    const payloads = global.chrome.storage.sync.set.mock.calls.map(([payload]) => payload);
    const fallBackPersisted = payloads.some(
      (payload) => payload.gmailCalMode === stateModule.MODES.ALL && payload.gmailCalModeWriteId,
    );
    expect(fallBackPersisted).toBe(true);
  });

  test('keeps All active when hiding the current mode cannot be persisted', async () => {
    storedState.showFavourites = true;
    document.body.innerHTML = getGmailMarkup();
    await loadContentScript();

    const listener = getMessageListener();
    listener(
      { type: 'gmailCal:setMode', payload: { mode: stateModule.MODES.FAVOURITES } },
      {},
      jest.fn(),
    );
    await flushPromises();
    expect(stateModule.currentMode).toBe(stateModule.MODES.FAVOURITES);

    storedState.showFavourites = false;
    failNextSet = true;
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    storageListeners.forEach((storageListener) =>
      storageListener(
        {
          showFavourites: {
            oldValue: true,
            newValue: false,
          },
        },
        'sync',
      ),
    );
    await flushPromises();

    expect(stateModule.currentMode).toBe(stateModule.MODES.ALL);
    expect(document.querySelector('#filter-FAVOURITES')?.hidden).toBe(true);
    expect(document.querySelector('#filter-ALL')?.getAttribute('aria-checked')).toBe('true');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving mode:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  test('returns an error response when storage write fails', async () => {
    document.body.innerHTML = getGmailMarkup();
    await loadContentScript();

    expect(global.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    failNextSet = true;
    failMessage = 'Quota exceeded';
    const listener = getMessageListener();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const sendResponse = jest.fn();
    const result = listener(
      { type: 'gmailCal:setMode', payload: { mode: stateModule.MODES.CALENDAR } },
      {},
      sendResponse,
    );

    expect(result).toBe(true);
    await flushPromises();

    expect(global.chrome.storage.sync.set).toHaveBeenCalled();
    expect(failNextSet).toBe(false);
    expect(global.chrome.runtime.lastError).toEqual(expect.any(Error));
    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: 'Quota exceeded' });
    expect(consoleErrorSpy).toHaveBeenCalled();

    const calendarButton = document.querySelector('#filter-CALENDAR');
    expect(calendarButton?.getAttribute('aria-checked')).not.toBe('true');

    consoleErrorSpy.mockRestore();
  });

  test('refresh messages re-run filter logic without mutating storage', async () => {
    document.body.innerHTML = getGmailMarkup();
    await loadContentScript();

    const sendResponse = jest.fn();
    const liveRegion = document.querySelector('.gcal-live-region');
    expect(liveRegion).not.toBeNull();
    if (liveRegion) {
      liveRegion.textContent = '';
    }

    expect(global.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    const listener = getMessageListener();
    const result = listener({ type: 'gmailCal:refreshFilter' }, {}, sendResponse);
    expect(result).toBe(false);
    await flushPromises();

    // WHY: The mode did not change, so the live region must stay silent — re-announcing the
    // unchanged filter on every refresh/re-injection was screen-reader spam.
    expect(liveRegion?.textContent).toBe('');
    expect(global.chrome.storage.sync.set).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, mode: stateModule.MODES.ALL });
  });

  test('options gracefully handle storage quota errors', async () => {
    document.body.innerHTML = `${getGmailMarkup()}${getOptionsMarkup()}`;
    await loadContentScript();
    await import('../../src/modules/options.js');
    document.dispatchEvent(createEvent('DOMContentLoaded'));
    // WHY: Wait for restore_options to resolve — saves are (deliberately) ignored until the stored
    // options are restored, so the quota-error path can only trigger after restoration completes.
    await flushPromises();

    const filterBar = document.querySelector('.gcal-filter-bar');
    const showTextCheckbox = document.getElementById('show-button-text-checkbox');

    failNextSet = true;
    failMessage = 'Quota exceeded';
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    showTextCheckbox.checked = false;
    showTextCheckbox.dispatchEvent(createEvent('change', { bubbles: true }));
    await flushPromises();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving options:', expect.any(Error));
    expect(filterBar.classList.contains('show-icon-only')).toBe(false);
    expect(storedState.showButtonText).toBe(true);

    consoleErrorSpy.mockRestore();
  });
});
