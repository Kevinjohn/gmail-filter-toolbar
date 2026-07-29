import { describe, beforeEach, test, expect, jest } from '@jest/globals';

const { useChromeMock } = global;

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * WHY these tests use the real state module: the mode write path's most interesting branch — rolling
 * back the optimistic UI update when the storage write fails — depends on reading back the
 * `currentMode` binding that `setCurrentMode` just mutated. The contentScript suite mocks state.js,
 * where `currentMode` is a frozen literal in the mock namespace, so the rollback guard is
 * permanently false there and the branch was never actually exercised. Only filter.js and toolbar.js
 * are mocked here, purely to observe the re-render calls.
 */
describe('mode', () => {
  let applyFilterMock;
  let refreshUIMock;
  let markToolbarStaleMock;
  let isExtensionContextInvalidatedMock;
  let mode;
  let state;
  let setWriteOutcome;

  beforeEach(async () => {
    jest.resetModules();
    applyFilterMock = jest.fn();
    refreshUIMock = jest.fn();
    markToolbarStaleMock = jest.fn();
    isExtensionContextInvalidatedMock = jest.fn(() => false);

    // Default: every write succeeds. Individual tests swap in a failing or deferred implementation.
    setWriteOutcome = (implementation) => {
      global.chrome.storage.sync.set.mockImplementation(implementation);
    };
    useChromeMock();

    jest.unstable_mockModule('../src/modules/filter.js', () => ({ applyFilter: applyFilterMock }));
    jest.unstable_mockModule('../src/modules/toolbar.js', () => ({
      refreshUI: refreshUIMock,
      markToolbarStale: markToolbarStaleMock,
      isExtensionContextInvalidated: isExtensionContextInvalidatedMock,
    }));

    mode = await import('../src/modules/mode.js');
    state = await import('../src/modules/state.js');
    state.setCurrentMode(state.MODES.ALL);
  });

  describe('selectMode', () => {
    test('applies the mode optimistically and persists it', async () => {
      await mode.selectMode(state.MODES.CALENDAR);

      expect(state.currentMode).toBe(state.MODES.CALENDAR);
      expect(applyFilterMock).toHaveBeenCalledWith(document);
      expect(refreshUIMock).toHaveBeenCalledWith(document);
      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({ siftMode: state.MODES.CALENDAR }),
        expect.any(Function),
      );
    });

    test('stands the toolbar down instead of filtering when the extension context is orphaned', async () => {
      // WHY: after an extension update the old content script keeps taking clicks. Applying the
      // filter here would look like it worked, then throw in refreshUI's chrome.i18n call and
      // silently fail to persist — the mode would revert on the next page load.
      isExtensionContextInvalidatedMock.mockReturnValue(true);

      await expect(mode.selectMode(state.MODES.CALENDAR)).rejects.toThrow(
        'Extension context invalidated',
      );

      expect(markToolbarStaleMock).toHaveBeenCalledWith(document);
      expect(state.currentMode).toBe(state.MODES.ALL);
      expect(applyFilterMock).not.toHaveBeenCalled();
      expect(refreshUIMock).not.toHaveBeenCalled();
      expect(global.chrome.storage.sync.set).not.toHaveBeenCalled();
    });

    test('rejects an unavailable mode without changing state', async () => {
      // FAVOURITES is a valid mode but its button is hidden by default.
      await expect(mode.selectMode(state.MODES.FAVOURITES)).rejects.toThrow(TypeError);

      expect(state.currentMode).toBe(state.MODES.ALL);
      expect(applyFilterMock).not.toHaveBeenCalled();
      expect(global.chrome.storage.sync.set).not.toHaveBeenCalled();
    });

    test('allowHidden accepts a valid mode whose button is hidden', async () => {
      await mode.selectMode(state.MODES.FAVOURITES, { allowHidden: true });

      expect(state.currentMode).toBe(state.MODES.FAVOURITES);
    });

    test('rolls back to the previous mode when the write fails', async () => {
      await mode.selectMode(state.MODES.CALENDAR);
      applyFilterMock.mockClear();
      refreshUIMock.mockClear();
      setWriteOutcome((items, callback) => {
        global.chrome.runtime.lastError = new Error('Write error');
        callback();
        global.chrome.runtime.lastError = null;
      });

      await expect(mode.selectMode(state.MODES.EMAIL)).rejects.toThrow('Write error');

      expect(state.currentMode).toBe(state.MODES.CALENDAR);
      // Rolling back has to re-render too, or the toolbar keeps showing the mode that never stuck.
      expect(applyFilterMock).toHaveBeenCalledTimes(2);
      expect(refreshUIMock).toHaveBeenCalledTimes(2);
    });

    test('leaves the optimistic mode in place when rollbackOnFailure is false', async () => {
      setWriteOutcome((items, callback) => {
        global.chrome.runtime.lastError = new Error('Write error');
        callback();
        global.chrome.runtime.lastError = null;
      });

      await expect(
        mode.selectMode(state.MODES.EMAIL, { rollbackOnFailure: false }),
      ).rejects.toThrow('Write error');

      expect(state.currentMode).toBe(state.MODES.EMAIL);
    });

    test('does not roll back over a mode chosen after the failing write started', async () => {
      // WHY: the rollback resolves long after the click. If the user (or another tab) has since
      // moved to a different mode, undoing would resurrect a stale mode over a deliberate one.
      let failWrite;
      setWriteOutcome((items, callback) => {
        failWrite = () => {
          global.chrome.runtime.lastError = new Error('Write error');
          callback();
          global.chrome.runtime.lastError = null;
        };
      });

      const pending = mode.selectMode(state.MODES.EMAIL);
      await flushPromises();
      state.setCurrentMode(state.MODES.ATTACH);
      failWrite();

      await expect(pending).rejects.toThrow('Write error');
      expect(state.currentMode).toBe(state.MODES.ATTACH);
    });

    test('serialises concurrent writes in call order', async () => {
      const pendingCallbacks = [];
      setWriteOutcome((items, callback) => {
        pendingCallbacks.push(callback);
      });

      const first = mode.selectMode(state.MODES.CALENDAR);
      const second = mode.selectMode(state.MODES.EMAIL);
      await flushPromises();

      expect(pendingCallbacks).toHaveLength(1);
      pendingCallbacks[0]();
      await first;
      await flushPromises();

      expect(global.chrome.storage.sync.set).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ siftMode: state.MODES.EMAIL }),
        expect.any(Function),
      );
      pendingCallbacks[1]();
      await second;
    });
  });

  describe('consumeLocalModeWrite', () => {
    test('recognises this tab’s own write exactly once', async () => {
      await mode.selectMode(state.MODES.CALENDAR);
      const writeId = global.chrome.storage.sync.set.mock.calls[0][0].siftModeWriteId;

      expect(writeId).toEqual(expect.any(String));
      expect(mode.consumeLocalModeWrite(writeId)).toBe(true);
      expect(mode.consumeLocalModeWrite(writeId)).toBe(false);
    });

    test('does not claim another tab’s write', async () => {
      await mode.selectMode(state.MODES.CALENDAR);

      expect(mode.consumeLocalModeWrite('mode:someone-else:1')).toBe(false);
      // An absent write ID is what a plain cross-tab change looks like.
      expect(mode.consumeLocalModeWrite(undefined)).toBe(false);
    });

    test('a failed write leaves no write ID behind to acknowledge', async () => {
      // WHY: an ID that outlived its failed write would swallow the next genuine cross-tab change,
      // leaving this tab showing a mode no other tab agrees with.
      let capturedWriteId;
      setWriteOutcome((items, callback) => {
        capturedWriteId = items.siftModeWriteId;
        global.chrome.runtime.lastError = new Error('Write error');
        callback();
        global.chrome.runtime.lastError = null;
      });

      await expect(mode.selectMode(state.MODES.EMAIL)).rejects.toThrow('Write error');

      expect(mode.consumeLocalModeWrite(capturedWriteId)).toBe(false);
    });
  });

  describe('supersedeQueuedModeWrites', () => {
    test('drops a queued write that has not started yet', async () => {
      const pendingCallbacks = [];
      setWriteOutcome((items, callback) => {
        pendingCallbacks.push(callback);
      });

      const first = mode.selectMode(state.MODES.CALENDAR);
      const second = mode.selectMode(state.MODES.EMAIL);
      await flushPromises();

      mode.supersedeQueuedModeWrites();
      pendingCallbacks[0]();
      await Promise.all([first, second]);

      expect(global.chrome.storage.sync.set).toHaveBeenCalledTimes(1);
    });

    test('does not disturb a write already in flight', async () => {
      let completeWrite;
      setWriteOutcome((items, callback) => {
        completeWrite = callback;
      });

      const pending = mode.selectMode(state.MODES.CALENDAR);
      await flushPromises();
      mode.supersedeQueuedModeWrites();
      completeWrite();

      await expect(pending).resolves.toBeUndefined();
      expect(state.currentMode).toBe(state.MODES.CALENDAR);
    });
  });
});
