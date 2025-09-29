import { describe, afterEach, test, expect, jest } from '@jest/globals';
import {
  loadState,
  saveState,
  setCurrentMode,
  currentMode,
  MODES,
  debugOn,
  setDebugOn,
  showButtonText,
  themePreference,
  setThemePreference,
  toolbarAlignment,
  setToolbarAlignment,
  showFavouritesButton,
  setShowFavouritesButton,
} from '../src/modules/state.js';
import { THEMES, ALIGNMENTS } from '../src/modules/constants.js';

const { useChromeMock, resetChromeMock } = global;

async function hydrateDefaults() {
  useChromeMock({
    storage: {
      sync: {
        get: jest.fn((keys, callback) =>
          callback({
            gmailCalMode: MODES.ALL,
            gmailCalDebug: false,
            showButtonText: true,
            showFavourites: false,
            toolbarAlignment: ALIGNMENTS.START,
            gmailCalTheme: THEMES.SYSTEM,
          }),
        ),
        set: jest.fn((payload, cb) => cb?.()),
      },
    },
    runtime: { lastError: null },
  });
  await loadState();
}

afterEach(async () => {
  await hydrateDefaults();
  resetChromeMock();
});

describe('loadState', () => {
  test('hydrates values from storage', async () => {
    useChromeMock({
      storage: {
        sync: {
          get: jest.fn((keys, callback) =>
            callback({
              gmailCalMode: MODES.CALENDAR,
              gmailCalDebug: true,
              showButtonText: false,
              showFavourites: true,
              toolbarAlignment: ALIGNMENTS.CENTER,
              gmailCalTheme: THEMES.DARK,
            }),
          ),
          set: jest.fn((payload, cb) => cb?.()),
        },
      },
      runtime: { lastError: null },
    });

    await expect(loadState()).resolves.toBeUndefined();

    expect(currentMode).toBe(MODES.CALENDAR);
    expect(debugOn).toBe(true);
    expect(showButtonText).toBe(false);
    expect(showFavouritesButton).toBe(true);
    expect(toolbarAlignment).toBe(ALIGNMENTS.CENTER);
    expect(themePreference).toBe(THEMES.DARK);
  });

  test('resets to defaults when storage read fails', async () => {
    const chrome = useChromeMock({
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            chrome.runtime.lastError = new Error('read failure');
            callback({});
          }),
          set: jest.fn(),
        },
      },
      runtime: { lastError: null },
    });

    await expect(loadState()).rejects.toThrow('read failure');

    expect(currentMode).toBe(MODES.ALL);
    expect(debugOn).toBe(false);
    expect(showButtonText).toBe(true);
    expect(showFavouritesButton).toBe(false);
    expect(toolbarAlignment).toBe(ALIGNMENTS.START);
    expect(themePreference).toBe(THEMES.SYSTEM);
  });
});

describe('saveState', () => {
  test('persists current mode to storage', async () => {
    const chrome = useChromeMock();
    setCurrentMode(MODES.ATTACH);
    await expect(saveState()).resolves.toBeUndefined();
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ gmailCalMode: MODES.ATTACH }, expect.any(Function));
  });

  test('propagates storage errors', async () => {
    const chrome = useChromeMock({
      storage: {
        sync: {
          set: jest.fn((payload, callback) => {
            chrome.runtime.lastError = new Error('write failure');
            callback?.();
          }),
          get: jest.fn((keys, callback) => callback({})),
        },
      },
      runtime: { lastError: null },
    });
    setCurrentMode(MODES.EMAIL);
    await expect(saveState()).rejects.toThrow('write failure');
  });
});

describe('value setters', () => {
  test('setThemePreference falls back to system theme', () => {
    setThemePreference('unknown');
    expect(themePreference).toBe(THEMES.SYSTEM);
  });

  test('setToolbarAlignment falls back to start', () => {
    setToolbarAlignment('invalid');
    expect(toolbarAlignment).toBe(ALIGNMENTS.START);
  });

  test('setShowFavouritesButton normalises to boolean', () => {
    setShowFavouritesButton('true');
    expect(showFavouritesButton).toBe(true);
  });

  test('setDebugOn toggles debug flag', () => {
    setDebugOn(true);
    expect(debugOn).toBe(true);
    setDebugOn(false);
    expect(debugOn).toBe(false);
  });
});
