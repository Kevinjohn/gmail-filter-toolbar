import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';

let observers;
let state;
let applyFilterMock;
let injectToolbarMock;

class MockMutationObserver {
  static instances = [];

  constructor(callback) {
    this.callback = callback;
    this.observe = jest.fn();
    this.disconnect = jest.fn();
    MockMutationObserver.instances.push(this);
  }

  trigger(payload) {
    this.callback(payload);
  }

  static reset() {
    MockMutationObserver.instances = [];
  }
}

global.MutationObserver = MockMutationObserver;

global.requestAnimationFrame = (cb) => {
  return setTimeout(cb, 0);
};

global.cancelAnimationFrame = (id) => clearTimeout(id);

beforeEach(async () => {
  jest.resetModules();
  MockMutationObserver.reset();
  applyFilterMock = jest.fn();
  injectToolbarMock = jest.fn();
  jest.unstable_mockModule('../src/modules/filter.js', () => ({
    applyFilter: applyFilterMock,
  }));
  jest.unstable_mockModule('../src/modules/toolbar.js', () => ({
    injectToolbar: injectToolbarMock,
    refreshUI: jest.fn(),
    updateAlignmentView: jest.fn(),
    updateButtonTextView: jest.fn(),
    updateFavouritesVisibility: jest.fn(),
  }));
  state = await import('../src/modules/state.js');
  observers = await import('../src/modules/observers.js');
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('observeMessageList', () => {
  test('attaches mutation observer and debounces filter application', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('list');
    const list = doc.createElement('div');
    list.className = 'UI';
    doc.body.appendChild(list);

    state.setCurrentMode(state.MODES.CALENDAR);
    observers.observeMessageList(doc);

    expect(MockMutationObserver.instances).toHaveLength(1);
    const instance = MockMutationObserver.instances[0];
    expect(instance.observe).toHaveBeenCalledWith(list, { childList: true });

    instance.trigger();
    jest.advanceTimersByTime(200);

    expect(applyFilterMock).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  test('disconnects existing observer before attaching new one', () => {
    const doc = document.implementation.createHTMLDocument('list');
    const list = doc.createElement('div');
    list.className = 'UI';
    doc.body.appendChild(list);

    observers.observeMessageList(doc);
    observers.observeMessageList(doc);

    expect(MockMutationObserver.instances[0].disconnect).toHaveBeenCalled();
  });
});

describe('setupGmailToolbarObserver', () => {
  test('injects toolbar when header present and wrapper missing', () => {
    const doc = document.implementation.createHTMLDocument('gmail');
    const header = doc.createElement('div');
    header.className = 'aeH';
    doc.body.appendChild(header);

    const observeSpy = jest.spyOn(observers, 'observeMessageList');

    observers.setupGmailToolbarObserver(doc);

    expect(MockMutationObserver.instances).toHaveLength(1);
    const instance = MockMutationObserver.instances[0];
    instance.trigger([{ type: 'childList' }]);

    expect(injectToolbarMock).toHaveBeenCalledWith(doc, header);
    expect(observeSpy).toHaveBeenCalledWith(doc);
    expect(applyFilterMock).toHaveBeenCalled();

    observeSpy.mockRestore();
  });
});

describe('waiters', () => {
  test('waitForGmailChrome resolves with toolbar header', async () => {
    const promise = observers.waitForGmailChrome();
    const header = document.createElement('div');
    header.className = 'aeH';
    const toolbar = document.createElement('div');
    toolbar.className = 'G-atb';
    toolbar.setAttribute('role', 'toolbar');
    header.appendChild(toolbar);
    document.body.appendChild(header);

    await promise;
  });

  test('waitForMessageTable resolves when email rows appear', async () => {
    const promise = observers.waitForMessageTable();
    const row = document.createElement('tr');
    row.className = 'zA';
    document.body.appendChild(row);
    await promise;
  });
});
