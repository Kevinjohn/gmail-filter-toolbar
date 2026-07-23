import { describe, afterEach, test, expect, jest } from '@jest/globals';
import {
  loadState,
  saveState,
  setCurrentMode,
  isValidMode,
  isModeAvailable,
  persistMode,
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

    await expect(loadState()).resolves.toBeUndefined();

    expect(currentMode).toBe(MODES.ALL);
    expect(debugOn).toBe(false);
    expect(showButtonText).toBe(true);
    expect(showFavouritesButton).toBe(false);
    expect(toolbarAlignment).toBe(ALIGNMENTS.START);
    expect(themePreference).toBe(THEMES.SYSTEM);
  });

  test('normalises unknown and disabled optional modes to ALL', async () => {
    const chrome = useChromeMock({
      storage: {
        sync: {
          get: jest
            .fn()
            .mockImplementationOnce((keys, callback) => callback({ gmailCalMode: 'UNKNOWN' }))
            .mockImplementationOnce((keys, callback) =>
              callback({ gmailCalMode: MODES.FAVOURITES, showFavourites: false }),
            ),
          set: jest.fn((payload, cb) => cb?.()),
        },
      },
      runtime: { lastError: null },
    });

    await loadState();
    expect(currentMode).toBe(MODES.ALL);
    await loadState();
    expect(currentMode).toBe(MODES.ALL);
    expect(chrome.storage.sync.get).toHaveBeenCalledTimes(2);
  });
});

describe('saveState', () => {
  test('persists current mode to storage', async () => {
    const chrome = useChromeMock();
    setCurrentMode(MODES.ATTACH);
    await expect(saveState()).resolves.toBeUndefined();
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      { gmailCalMode: MODES.ATTACH },
      expect.any(Function),
    );
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

  test('persists a validated mode without mutating current state', async () => {
    const chrome = useChromeMock();
    setCurrentMode(MODES.ALL);
    await persistMode(MODES.CALENDAR);
    expect(currentMode).toBe(MODES.ALL);
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      { gmailCalMode: MODES.CALENDAR },
      expect.any(Function),
    );
  });

  test('rejects invalid modes', async () => {
    expect(isValidMode('UNKNOWN')).toBe(false);
    expect(setCurrentMode('UNKNOWN')).toBe(false);
    await expect(persistMode('UNKNOWN')).rejects.toThrow('Invalid filter mode');
  });

  test('persists valid optional modes while their buttons are disabled', async () => {
    const chrome = useChromeMock();
    setShowFavouritesButton(false);
    expect(isModeAvailable(MODES.FAVOURITES)).toBe(false);
    await expect(persistMode(MODES.FAVOURITES)).resolves.toBeUndefined();
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      { gmailCalMode: MODES.FAVOURITES },
      expect.any(Function),
    );
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
