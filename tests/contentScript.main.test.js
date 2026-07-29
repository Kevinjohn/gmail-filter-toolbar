import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';

const { useChromeMock, resetChromeMock } = global;

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('contentScript main lifecycle', () => {
  let loadStateMock;
  let saveStateMock;
  let persistModeMock;
  let setCurrentModeMock;
  let isModeAvailableMock;
  let isValidModeMock;
  let setToolbarAlignmentMock;
  let setShowFavouritesButtonMock;
  let setShowAiNotetakersButtonMock;
  let setShowDevNotificationsButtonMock;
  let setThemePreferenceMock;
  let applyFilterMock;
  let injectToolbarMock;
  let refreshUIMock;
  let updateAlignmentViewMock;
  let updateButtonTextViewMock;
  let updateButtonVisibilityMock;
  let waitForGmailToolbarMock;
  let waitForMessageTableMock;
  let observeMessageListMock;
  let setupGmailToolbarObserverMock;
  let applyThemeMock;
  let storageChangeListener;
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

    header = document.createElement('div');
    header.className = 'aeH';
    document.body.appendChild(header);

    loadStateMock = jest.fn(() => Promise.resolve());
    saveStateMock = jest.fn(() => Promise.resolve());
    persistModeMock = jest.fn(() => Promise.resolve());
    setCurrentModeMock = jest.fn();
    isModeAvailableMock = jest.fn((mode) =>
      ['ALL', 'CALENDAR', 'FAVOURITES', 'AI_NOTETAKERS', 'DEV_NOTIFICATIONS'].includes(mode),
    );
    isValidModeMock = jest.fn((mode) =>
      ['ALL', 'CALENDAR', 'FAVOURITES', 'AI_NOTETAKERS', 'DEV_NOTIFICATIONS'].includes(mode),
    );
    setToolbarAlignmentMock = jest.fn();
    setShowFavouritesButtonMock = jest.fn();
    setShowAiNotetakersButtonMock = jest.fn();
    setShowDevNotificationsButtonMock = jest.fn();
    setThemePreferenceMock = jest.fn();
    applyFilterMock = jest.fn();
    injectToolbarMock = jest.fn();
    refreshUIMock = jest.fn();
    updateAlignmentViewMock = jest.fn();
    updateButtonTextViewMock = jest.fn();
    updateButtonVisibilityMock = jest.fn();
    waitForGmailToolbarMock = jest.fn(() => Promise.resolve(header));
    waitForMessageTableMock = jest.fn(() => Promise.resolve());
    observeMessageListMock = jest.fn();
    setupGmailToolbarObserverMock = jest.fn();
    applyThemeMock = jest.fn();

    jest.unstable_mockModule('../src/modules/state.js', () => ({
      loadState: loadStateMock,
      saveState: saveStateMock,
      persistMode: persistModeMock,
      setCurrentMode: setCurrentModeMock,
      isModeAvailable: isModeAvailableMock,
      isValidMode: isValidModeMock,
      setDebugOn: jest.fn(),
      setShowButtonText: jest.fn(),
      showButtonText: true,
      currentMode: 'ALL',
      toolbarAlignment: 'start',
      setToolbarAlignment: setToolbarAlignmentMock,
      showFavouritesButton: false,
      setShowFavouritesButton: setShowFavouritesButtonMock,
      showAiNotetakersButton: false,
      setShowAiNotetakersButton: setShowAiNotetakersButtonMock,
      showDevNotificationsButton: false,
      setShowDevNotificationsButton: setShowDevNotificationsButtonMock,
      MODES: {
        ALL: 'ALL',
        FAVOURITES: 'FAVOURITES',
        AI_NOTETAKERS: 'AI_NOTETAKERS',
        DEV_NOTIFICATIONS: 'DEV_NOTIFICATIONS',
      },
      themePreference: 'system',
      setThemePreference: setThemePreferenceMock,
    }));

    jest.unstable_mockModule('../src/modules/filter.js', () => ({
      applyFilter: applyFilterMock,
    }));

    jest.unstable_mockModule('../src/modules/toolbar.js', () => ({
      injectToolbar: injectToolbarMock,
      refreshUI: refreshUIMock,
      markToolbarStale: jest.fn(),
      // A live extension context — the orphaned-script path is covered in tests/mode.test.js.
      isExtensionContextInvalidated: jest.fn(() => false),
      updateAlignmentView: updateAlignmentViewMock,
      updateButtonTextView: updateButtonTextViewMock,
      updateButtonVisibility: updateButtonVisibilityMock,
    }));

    jest.unstable_mockModule('../src/modules/observers.js', () => ({
      waitForGmailToolbar: waitForGmailToolbarMock,
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
  });

  test('initialises toolbar and observers', async () => {
    expect(loadStateMock).toHaveBeenCalled();
    expect(applyThemeMock).toHaveBeenCalledWith(document, 'system');
    expect(waitForGmailToolbarMock).toHaveBeenCalled();
    expect(injectToolbarMock).toHaveBeenCalledWith(document, header);
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
    expect(persistModeMock).toHaveBeenCalledWith('CALENDAR', expect.any(String));
    expect(applyFilterMock).toHaveBeenCalled();
    expect(refreshUIMock).toHaveBeenCalledWith(document);
  });

  test('serializes rapid mode writes in click order', async () => {
    let resolveFirstWrite;
    persistModeMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstWrite = resolve;
          }),
      )
      .mockImplementationOnce(() => Promise.resolve());

    const bar = document.createElement('div');
    bar.className = 'gcal-filter-bar';
    const calendarButton = document.createElement('button');
    calendarButton.dataset.mode = 'CALENDAR';
    const allButton = document.createElement('button');
    allButton.dataset.mode = 'ALL';
    bar.append(calendarButton, allButton);
    document.body.appendChild(bar);

    calendarButton.click();
    allButton.click();
    await flushPromises();

    expect(persistModeMock).toHaveBeenCalledTimes(1);
    expect(persistModeMock).toHaveBeenLastCalledWith('CALENDAR', expect.any(String));

    resolveFirstWrite();
    await flushPromises();

    expect(persistModeMock).toHaveBeenNthCalledWith(2, 'ALL', expect.any(String));
  });

  test('keeps the latest queued mode after acknowledging an earlier local write', async () => {
    let resolveFirstWrite;
    persistModeMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstWrite = resolve;
          }),
      )
      .mockImplementationOnce(() => Promise.resolve());
    const bar = document.createElement('div');
    bar.className = 'gcal-filter-bar';
    const calendarButton = document.createElement('button');
    calendarButton.dataset.mode = 'CALENDAR';
    const allButton = document.createElement('button');
    allButton.dataset.mode = 'ALL';
    bar.append(calendarButton, allButton);
    document.body.appendChild(bar);

    calendarButton.click();
    allButton.click();
    await flushPromises();
    const firstWriteId = persistModeMock.mock.calls[0][1];
    storageChangeListener(
      {
        siftMode: { newValue: 'CALENDAR' },
        siftModeWriteId: { newValue: firstWriteId },
      },
      'sync',
    );
    resolveFirstWrite();
    await flushPromises();

    expect(persistModeMock).toHaveBeenCalledTimes(2);
    expect(persistModeMock).toHaveBeenNthCalledWith(2, 'ALL', expect.any(String));
  });

  test('drops a queued local mode write after an authoritative storage change', async () => {
    let resolveFirstWrite;
    persistModeMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirstWrite = resolve;
        }),
    );
    const bar = document.createElement('div');
    bar.className = 'gcal-filter-bar';
    const calendarButton = document.createElement('button');
    calendarButton.dataset.mode = 'CALENDAR';
    const allButton = document.createElement('button');
    allButton.dataset.mode = 'ALL';
    bar.append(calendarButton, allButton);
    document.body.appendChild(bar);

    calendarButton.click();
    allButton.click();
    await flushPromises();
    storageChangeListener({ siftMode: { newValue: 'CALENDAR' } }, 'sync');
    resolveFirstWrite();
    await flushPromises();

    expect(persistModeMock).toHaveBeenCalledTimes(1);
    expect(persistModeMock).toHaveBeenCalledWith('CALENDAR', expect.any(String));
  });

  test('mirrors mode changes from other tabs without re-persisting', async () => {
    storageChangeListener({ siftMode: { newValue: 'CALENDAR' } }, 'sync');
    await flushPromises();

    expect(setCurrentModeMock).toHaveBeenCalledWith('CALENDAR');
    expect(applyFilterMock).toHaveBeenCalled();
    expect(refreshUIMock).toHaveBeenCalled();
    // Mirroring must not write back to storage — that would loop across tabs.
    expect(persistModeMock).not.toHaveBeenCalled();
  });

  test('ignores storage changes from unrelated areas', async () => {
    storageChangeListener(
      { siftMode: { newValue: 'CALENDAR' }, siftShowButtonText: { newValue: false } },
      'managed',
    );
    await flushPromises();

    expect(setCurrentModeMock).not.toHaveBeenCalled();
    expect(updateButtonTextViewMock).not.toHaveBeenCalled();
  });

  test('ignores local-area events when sync is the active backend', async () => {
    // WHY: onChanged fires for every storage area. Removals in the inactive area
    // (newValue: undefined) must not be misread as "reset everything to defaults".
    applyFilterMock.mockClear(); // ignore the applyFilter call from init
    storageChangeListener(
      {
        siftDebug: { oldValue: true },
        siftShowButtonText: { oldValue: false },
        siftTheme: { oldValue: 'dark' },
      },
      'local',
    );
    await flushPromises();

    expect(updateButtonTextViewMock).not.toHaveBeenCalled();
    expect(setThemePreferenceMock).not.toHaveBeenCalled();
    expect(applyFilterMock).not.toHaveBeenCalled();
  });

  test('reacts to storage changes', async () => {
    expect(typeof storageChangeListener).toBe('function');
    storageChangeListener(
      {
        siftDebug: { newValue: true },
        siftShowButtonText: { newValue: false },
        siftToolbarAlignment: { newValue: 'center' },
        siftShowFavourites: { newValue: true },
        siftTheme: { newValue: 'dark' },
      },
      'sync',
    );
    await flushPromises();

    expect(updateButtonTextViewMock).toHaveBeenCalledWith(false);
    expect(setToolbarAlignmentMock).toHaveBeenCalledWith('center');
    expect(updateAlignmentViewMock).toHaveBeenCalledWith('start');
    expect(setShowFavouritesButtonMock).toHaveBeenCalledWith(true);
    expect(updateButtonVisibilityMock).toHaveBeenCalledWith('FAVOURITES', true);
    expect(setThemePreferenceMock).toHaveBeenCalledWith('dark');
    expect(applyThemeMock).toHaveBeenCalledWith(document, 'system');
  });

  test('restores visible button text when the storage key is removed', () => {
    storageChangeListener({ siftShowButtonText: { newValue: undefined } }, 'sync');

    expect(updateButtonTextViewMock).toHaveBeenCalledWith(true);
  });
});
