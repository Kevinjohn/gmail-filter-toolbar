import { describe, afterEach, test, expect, jest } from '@jest/globals';
import { makeOptionsPayload } from './factories/index.js';

const { useChromeMock, resetChromeMock } = global;

const baseMessages = {
  page_title: 'Mock Page Title',
  options_page_description: 'Mock Page Description',
  options_debug_legend: 'Debug Legend',
  options_debug_label: 'Debug Label',
  optionShowButtonText: 'Show Text Label',
  options_show_text_legend: 'Display Legend',
  options_alignment_legend: 'Alignment Legend',
  options_alignment_label: 'Alignment Label',
  options_alignment_start: 'Align Start',
  options_alignment_center: 'Align Center',
  options_show_favourites_label: 'Show Favourites Label',
  options_theme_legend: 'Theme Legend',
  options_theme_label: 'Theme Label',
  options_theme_system: 'System Theme',
  options_theme_light: 'Light Theme',
  options_theme_dark: 'Dark Theme',
};

const getTextContent = (id) => document.getElementById(id)?.textContent ?? null;

const serializeOptionsUi = () => ({
  documentTitle: document.title,
  pageTitle: getTextContent('pageTitle'),
  pageDescription: getTextContent('pageDescription'),
  debug: {
    legend: getTextContent('debugLegend'),
    label: getTextContent('debugLabel'),
    checked: document.getElementById('debug')?.checked ?? false,
  },
  showButtonText: {
    legend: getTextContent('showButtonTextLegend'),
    label: getTextContent('showButtonTextLabel'),
    checked: document.getElementById('show-button-text-checkbox')?.checked ?? false,
  },
  alignment: {
    legend: getTextContent('alignmentLegend'),
    label: getTextContent('alignmentLabel'),
    value: document.getElementById('alignment-select')?.value ?? null,
    options: Array.from(document.querySelectorAll('#alignment-select option')).map((option) => ({
      value: option.value,
      text: option.textContent,
    })),
  },
  showFavourites: {
    label: getTextContent('showFavouritesLabel'),
    checked: document.getElementById('show-favourites-checkbox')?.checked ?? false,
  },
  theme: {
    legend: getTextContent('themeLegend'),
    label: getTextContent('themeLabel'),
    value: document.getElementById('theme-select')?.value ?? null,
    options: Array.from(document.querySelectorAll('#theme-select option')).map((option) => ({
      value: option.value,
      text: option.textContent,
    })),
  },
});

const renderHtml = () => {
  document.body.innerHTML = `
    <h1 id="pageTitle"></h1>
    <p id="pageDescription"></p>
    <fieldset>
      <legend id="debugLegend"></legend>
      <label for="debug" id="debugLabel"></label>
      <input type="checkbox" id="debug" />
    </fieldset>
    <fieldset>
      <legend id="showButtonTextLegend"></legend>
      <label for="show-button-text-checkbox" id="showButtonTextLabel"></label>
      <input type="checkbox" id="show-button-text-checkbox" />
    </fieldset>
    <fieldset>
      <legend id="alignmentLegend"></legend>
      <label for="alignment-select" id="alignmentLabel"></label>
      <select id="alignment-select">
        <option id="alignmentOptionStart" value="start"></option>
        <option id="alignmentOptionCenter" value="center"></option>
      </select>
      <label for="show-favourites-checkbox" id="showFavouritesLabel"></label>
      <input type="checkbox" id="show-favourites-checkbox" />
    </fieldset>
    <fieldset>
      <legend id="themeLegend"></legend>
      <label for="theme-select" id="themeLabel"></label>
      <select id="theme-select">
        <option id="themeOptionSystem" value="system"></option>
        <option id="themeOptionLight" value="light"></option>
        <option id="themeOptionDark" value="dark"></option>
      </select>
    </fieldset>
  `;
};

async function loadModule({ storageValues = makeOptionsPayload(), getError, setError } = {}) {
  jest.resetModules();
  const chrome = useChromeMock({
    i18n: {
      getMessage: jest.fn((key) => baseMessages[key] ?? ''),
    },
    storage: {
      sync: {
        get: jest.fn((keys, callback) => {
          if (getError) {
            chrome.runtime.lastError = new Error(getError);
          } else {
            chrome.runtime.lastError = null;
          }
          callback(storageValues);
        }),
        set: jest.fn((payload, callback) => {
          if (setError) {
            chrome.runtime.lastError = new Error(setError);
          } else {
            chrome.runtime.lastError = null;
          }
          callback?.();
        }),
      },
    },
    runtime: {
      lastError: null,
    },
  });
  renderHtml();
  await jest.isolateModulesAsync(async () => {
    await import('../src/modules/options.js');
  });
  document.dispatchEvent(new Event('DOMContentLoaded'));
  return chrome;
}

describe('options module', () => {
  afterEach(() => {
    resetChromeMock();
    document.body.innerHTML = '';
  });

  test('restores state from storage and localises labels', async () => {
    const chrome = await loadModule();

    expect(chrome.storage.sync.get).toHaveBeenCalledWith(
      ['gmailCalDebug', 'showButtonText', 'showFavourites', 'toolbarAlignment', 'gmailCalTheme'],
      expect.any(Function),
    );
    expect(document.getElementById('pageTitle').textContent).toBe('Mock Page Title');
    expect(document.title).toBe('Mock Page Title');
    expect(document.getElementById('alignmentOptionCenter').textContent).toBe('Align Center');
  });

  test('serialises localised labels for regression safety', async () => {
    await loadModule();

    expect(serializeOptionsUi()).toMatchSnapshot();
  });

  test('saves updated values when controls change', async () => {
    const chrome = await loadModule();
    const debugBox = document.getElementById('debug');
    const showTextBox = document.getElementById('show-button-text-checkbox');
    const favouritesBox = document.getElementById('show-favourites-checkbox');
    const alignmentSelect = document.getElementById('alignment-select');
    const themeSelect = document.getElementById('theme-select');

    debugBox.checked = true;
    showTextBox.checked = false;
    favouritesBox.checked = true;
    alignmentSelect.value = 'center';
    themeSelect.value = 'dark';

    debugBox.dispatchEvent(new Event('change'));
    showTextBox.dispatchEvent(new Event('change'));
    favouritesBox.dispatchEvent(new Event('change'));
    alignmentSelect.dispatchEvent(new Event('change'));
    themeSelect.dispatchEvent(new Event('change'));

    const lastPayload = chrome.storage.sync.set.mock.calls.pop()[0];
    expect(lastPayload).toMatchInlineSnapshot(`
      {
        "gmailCalDebug": true,
        "gmailCalTheme": "dark",
        "showButtonText": false,
        "showFavourites": true,
        "toolbarAlignment": "center",
      }
    `);
  });

  test('logs retrieval errors from storage', async () => {
    const chrome = await loadModule({ getError: 'boom' });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(errorSpy).toHaveBeenCalledWith('Error retrieving options:', chrome.runtime.lastError);
    errorSpy.mockRestore();
  });

  test('logs saving errors to storage', async () => {
    const chrome = await loadModule({ setError: 'save failure' });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const debugBox = document.getElementById('debug');
    debugBox.checked = true;

    debugBox.dispatchEvent(new Event('change'));

    expect(errorSpy).toHaveBeenCalledWith('Error saving options:', chrome.runtime.lastError);
    errorSpy.mockRestore();
  });
});
