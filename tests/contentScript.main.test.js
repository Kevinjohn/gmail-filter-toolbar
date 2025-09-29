import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';

const { useChromeMock, resetChromeMock } = global;

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('contentScript main lifecycle', () => {
  let loadStateMock;
  let saveStateMock;
  let setCurrentModeMock;
  let setToolbarAlignmentMock;
  let setShowFavouritesButtonMock;
  let setThemePreferenceMock;
  let applyFilterMock;
  let injectToolbarMock;
  let refreshUIMock;
  let updateAlignmentViewMock;
  let updateButtonTextViewMock;
  let updateFavouritesVisibilityMock;
  let waitForGmailChromeMock;
  let waitForMessageTableMock;
  let observeMessageListMock;
  let setupGmailToolbarObserverMock;
  let applyThemeMock;
  let storageChangeListener;
  let messageListener;
  let header;

  beforeEach(async () => {
    jest.resetModules();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    resetChromeMock();
    const chrome = useChromeMock();
    chrome.storage.onChanged.addListener.mockImplementation((listener) => {
      storageChangeListener = listener;
    });
    chrome.runtime.onMessage.addListener.mockImplementation((listener) => {
      messageListener = listener;
    });

    header = document.createElement('div');
    header.className = 'aeH';
    document.body.appendChild(header);

    loadStateMock = jest.fn(() => Promise.resolve());
    saveStateMock = jest.fn(() => Promise.resolve());
    setCurrentModeMock = jest.fn();
    setToolbarAlignmentMock = jest.fn();
    setShowFavouritesButtonMock = jest.fn();
    setThemePreferenceMock = jest.fn();
    applyFilterMock = jest.fn();
    injectToolbarMock = jest.fn();
    refreshUIMock = jest.fn();
    updateAlignmentViewMock = jest.fn();
    updateButtonTextViewMock = jest.fn();
    updateFavouritesVisibilityMock = jest.fn();
    waitForGmailChromeMock = jest.fn(() => Promise.resolve(header));
    waitForMessageTableMock = jest.fn(() => Promise.resolve());
    observeMessageListMock = jest.fn();
    setupGmailToolbarObserverMock = jest.fn();
    applyThemeMock = jest.fn();

    jest.unstable_mockModule('../src/modules/state.js', () => ({
      loadState: loadStateMock,
      saveState: saveStateMock,
      setCurrentMode: setCurrentModeMock,
      setDebugOn: jest.fn(),
      showButtonText: true,
      KEY_DEBUG: 'gmailCalDebug',
      currentMode: 'ALL',
      toolbarAlignment: 'start',
      setToolbarAlignment: setToolbarAlignmentMock,
      showFavouritesButton: false,
      setShowFavouritesButton: setShowFavouritesButtonMock,
      MODES: { ALL: 'ALL', FAVOURITES: 'FAVOURITES' },
      themePreference: 'system',
      setThemePreference: setThemePreferenceMock,
    }));

    jest.unstable_mockModule('../src/modules/filter.js', () => ({
      applyFilter: applyFilterMock,
    }));

    jest.unstable_mockModule('../src/modules/toolbar.js', () => ({
      injectToolbar: injectToolbarMock,
      refreshUI: refreshUIMock,
      updateAlignmentView: updateAlignmentViewMock,
      updateButtonTextView: updateButtonTextViewMock,
      updateFavouritesVisibility: updateFavouritesVisibilityMock,
    }));

    jest.unstable_mockModule('../src/modules/observers.js', () => ({
      waitForGmailChrome: waitForGmailChromeMock,
      waitForMessageTable: waitForMessageTableMock,
      observeMessageList: observeMessageListMock,
      setupGmailToolbarObserver: setupGmailToolbarObserverMock,
    }));

    jest.unstable_mockModule('../src/modules/theme.js', () => ({
      applyTheme: applyThemeMock,
    }));

    await import('../src/contentScript.js');
    await flushPromises();
  });

  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    storageChangeListener = undefined;
    messageListener = undefined;
  });

  test('initialises toolbar and observers', async () => {
    expect(loadStateMock).toHaveBeenCalled();
    expect(applyThemeMock).toHaveBeenCalledWith(document, 'system');
    expect(waitForGmailChromeMock).toHaveBeenCalled();
    expect(injectToolbarMock).toHaveBeenCalledWith(document, header);
    expect(updateButtonTextViewMock).toHaveBeenCalledWith(true);
    expect(updateAlignmentViewMock).toHaveBeenCalledWith('start');
    expect(updateFavouritesVisibilityMock).toHaveBeenCalledWith(false);
    expect(waitForMessageTableMock).toHaveBeenCalled();
    await flushPromises();
    expect(applyFilterMock).toHaveBeenCalled();
    expect(observeMessageListMock).toHaveBeenCalledWith(document);
    expect(setupGmailToolbarObserverMock).toHaveBeenCalledWith(document);
  });

  test('persists mode when toolbar button clicked', async () => {
    const bar = document.createElement('div');
    bar.className = 'gcal-filter-bar';
    const button = document.createElement('button');
    button.dataset.mode = 'CALENDAR';
    bar.appendChild(button);
    document.body.appendChild(bar);

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(setCurrentModeMock).toHaveBeenCalledWith('CALENDAR');
    expect(saveStateMock).toHaveBeenCalled();
    expect(applyFilterMock).toHaveBeenCalled();
    expect(refreshUIMock).toHaveBeenCalledWith(document);
  });

  test('reacts to storage changes', async () => {
    expect(typeof storageChangeListener).toBe('function');
    storageChangeListener({
      gmailCalDebug: { newValue: true },
      showButtonText: { newValue: false },
      toolbarAlignment: { newValue: 'center' },
      showFavourites: { newValue: true },
      gmailCalTheme: { newValue: 'dark' },
    });
    await flushPromises();

    expect(updateButtonTextViewMock).toHaveBeenCalledWith(false);
    expect(setToolbarAlignmentMock).toHaveBeenCalledWith('center');
    expect(updateAlignmentViewMock).toHaveBeenCalledWith('start');
    expect(setShowFavouritesButtonMock).toHaveBeenCalledWith(true);
    expect(updateFavouritesVisibilityMock).toHaveBeenCalledWith(true);
    expect(setThemePreferenceMock).toHaveBeenCalledWith('dark');
    expect(applyThemeMock).toHaveBeenCalledWith(document, 'system');
  });

  test('runtime handler ignores non-object messages', () => {
    expect(messageListener(undefined, {}, jest.fn())).toBe(false);
    expect(messageListener('hello', {}, jest.fn())).toBe(false);
  });

  test('runtime handler reports missing mode payload', () => {
    const sendResponse = jest.fn();
    const result = messageListener({ type: 'gmailCal:setMode', payload: {} }, {}, sendResponse);
    expect(result).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: 'Missing mode payload' });
  });

  test('runtime handler persists mode and responds with success', async () => {
    const sendResponse = jest.fn();
    const result = messageListener(
      { type: 'gmailCal:setMode', payload: { mode: 'FAVOURITES' } },
      {},
      sendResponse,
    );
    expect(result).toBe(true);
    await flushPromises();
    expect(setCurrentModeMock).toHaveBeenCalledWith('FAVOURITES');
    expect(saveStateMock).toHaveBeenCalled();
    expect(applyFilterMock).toHaveBeenCalled();
    expect(refreshUIMock).toHaveBeenCalledWith(document);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, mode: 'ALL' });
  });

  test('runtime handler surfaces save errors', async () => {
    saveStateMock.mockImplementationOnce(() => Promise.reject(new Error('write failure')));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const sendResponse = jest.fn();
    const result = messageListener(
      { type: 'gmailCal:setMode', payload: { mode: 'FAVOURITES' } },
      {},
      sendResponse,
    );
    expect(result).toBe(true);
    await flushPromises();
    expect(errorSpy).toHaveBeenCalledWith('Error saving mode:', expect.any(Error));
    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: 'write failure' });
    errorSpy.mockRestore();
  });

  test('runtime handler refreshes filter on demand', () => {
    const sendResponse = jest.fn();
    const result = messageListener({ type: 'gmailCal:refreshFilter' }, {}, sendResponse);
    expect(result).toBe(false);
    expect(applyFilterMock).toHaveBeenCalled();
    expect(refreshUIMock).toHaveBeenCalledWith(document);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, mode: 'ALL' });
  });

  test('runtime handler returns false for unknown messages', () => {
    const sendResponse = jest.fn();
    const result = messageListener({ type: 'gmailCal:noop' }, {}, sendResponse);
    expect(result).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });
});
