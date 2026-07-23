import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import { SELECTORS } from '../src/modules/constants.js';

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
    updateButtonVisibility: jest.fn(),
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
    expect(instance.observe).toHaveBeenCalledWith(list, { childList: true, subtree: true });

    instance.trigger();
    jest.advanceTimersByTime(200);

    expect(applyFilterMock).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  test('does not apply filter while mode is ALL', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('list');
    const list = doc.createElement('div');
    list.className = 'UI';
    doc.body.appendChild(list);

    state.setCurrentMode(state.MODES.ALL);
    observers.observeMessageList(doc);

    const instance = MockMutationObserver.instances[0];
    instance.trigger();
    jest.advanceTimersByTime(200);

    expect(applyFilterMock).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('exits early when no message list is present', () => {
    const doc = document.implementation.createHTMLDocument('list');
    observers.observeMessageList(doc);
    expect(MockMutationObserver.instances).toHaveLength(0);
  });

  test('keeps the existing observer when the message-list node is unchanged', () => {
    const doc = document.implementation.createHTMLDocument('list');
    const list = doc.createElement('div');
    list.className = 'UI';
    doc.body.appendChild(list);

    observers.observeMessageList(doc);
    observers.observeMessageList(doc);

    expect(MockMutationObserver.instances).toHaveLength(1);
    expect(MockMutationObserver.instances[0].disconnect).not.toHaveBeenCalled();
  });
});

describe('setupGmailToolbarObserver', () => {
  test('injects toolbar when header present and wrapper missing', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('gmail');
    const header = doc.createElement('div');
    header.className = 'aeH';
    doc.body.appendChild(header);
    const list = doc.createElement('div');
    list.className = 'UI';
    doc.body.appendChild(list);
    state.setCurrentMode(state.MODES.CALENDAR);

    observers.setupGmailToolbarObserver(doc);

    expect(MockMutationObserver.instances).toHaveLength(1);
    const instance = MockMutationObserver.instances[0];
    instance.trigger([{ type: 'childList' }]);
    jest.advanceTimersByTime(200);

    expect(injectToolbarMock).toHaveBeenCalledWith(doc, header);
    expect(MockMutationObserver.instances).toHaveLength(2);
    const [, listObserver] = MockMutationObserver.instances;
    expect(listObserver.observe).toHaveBeenCalledWith(list, { childList: true, subtree: true });
    expect(applyFilterMock).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('debounces bursts of mutations into a single re-injection check', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('gmail');
    const header = doc.createElement('div');
    header.className = 'aeH';
    doc.body.appendChild(header);
    const list = doc.createElement('div');
    list.className = 'UI';
    doc.body.appendChild(list);
    state.setCurrentMode(state.MODES.CALENDAR);

    observers.setupGmailToolbarObserver(doc);
    const instance = MockMutationObserver.instances[0];
    instance.trigger([{ type: 'childList' }]);
    instance.trigger([{ type: 'childList' }]);
    instance.trigger([{ type: 'childList' }]);
    jest.advanceTimersByTime(200);

    expect(injectToolbarMock).toHaveBeenCalledTimes(1);
    expect(applyFilterMock).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  test('reinjects when a stale wrapper is not adjacent to the current header', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('gmail');
    const header = doc.createElement('div');
    header.className = 'aeH';
    doc.body.appendChild(header);
    const list = doc.createElement('div');
    list.className = 'UI';
    doc.body.appendChild(list);
    const wrapper = doc.createElement('div');
    wrapper.className = 'gcal-filter-wrapper';
    doc.body.appendChild(wrapper);

    observers.setupGmailToolbarObserver(doc);

    const instance = MockMutationObserver.instances[0];
    instance.trigger([{ type: 'childList' }]);
    jest.advanceTimersByTime(200);

    expect(injectToolbarMock).toHaveBeenCalledWith(doc, header);
    jest.useRealTimers();
  });

  test('reapplies the active filter after reinjection when the list observer is unchanged', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('gmail');
    const header = doc.createElement('div');
    header.className = 'aeH';
    const wrapper = doc.createElement('div');
    wrapper.className = 'gcal-filter-wrapper';
    const list = doc.createElement('div');
    list.className = 'UI';
    doc.body.append(header, wrapper, list);
    state.setCurrentMode(state.MODES.CALENDAR);

    observers.observeMessageList(doc);
    observers.setupGmailToolbarObserver(doc);
    const bodyObserver = MockMutationObserver.instances[1];
    const spacer = doc.createElement('div');
    header.insertAdjacentElement('afterend', spacer);
    bodyObserver.trigger([{ type: 'childList' }]);
    jest.advanceTimersByTime(200);

    expect(injectToolbarMock).toHaveBeenCalledWith(doc, header);
    expect(applyFilterMock).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  test('skips reinjection when the current header has an adjacent wrapper', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('gmail');
    const header = doc.createElement('div');
    header.className = 'aeH';
    const wrapper = doc.createElement('div');
    wrapper.className = 'gcal-filter-wrapper';
    doc.body.append(header, wrapper);

    observers.setupGmailToolbarObserver(doc);
    const instance = MockMutationObserver.instances[0];
    instance.trigger([{ type: 'childList' }]);
    jest.advanceTimersByTime(200);

    expect(injectToolbarMock).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('reinjects once to clean up duplicate wrappers', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('gmail');
    const header = doc.createElement('div');
    header.className = 'aeH';
    const wrapper = doc.createElement('div');
    wrapper.className = 'gcal-filter-wrapper';
    const duplicate = wrapper.cloneNode();
    doc.body.append(header, wrapper, duplicate);

    observers.setupGmailToolbarObserver(doc);
    const instance = MockMutationObserver.instances[0];
    instance.trigger([{ type: 'childList' }]);
    jest.advanceTimersByTime(200);

    expect(injectToolbarMock).toHaveBeenCalledWith(doc, header);
    jest.useRealTimers();
  });

  test('disconnects existing toolbar observer before reattaching', () => {
    const doc = document.implementation.createHTMLDocument('gmail');
    const header = doc.createElement('div');
    header.className = 'aeH';
    doc.body.appendChild(header);
    const list = doc.createElement('div');
    list.className = 'UI';
    doc.body.appendChild(list);

    observers.setupGmailToolbarObserver(doc);
    const firstInstance = MockMutationObserver.instances[0];
    observers.setupGmailToolbarObserver(doc);
    expect(firstInstance.disconnect).toHaveBeenCalled();
  });

  test('ignores mutations that are not childList updates', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('gmail');
    observers.setupGmailToolbarObserver(doc);
    const instance = MockMutationObserver.instances[0];
    instance.trigger([{ type: 'attributes' }]);
    jest.advanceTimersByTime(200);
    expect(injectToolbarMock).not.toHaveBeenCalled();
    expect(applyFilterMock).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe('waiters', () => {
  test('waitForGmailToolbar resolves with toolbar header', async () => {
    const promise = observers.waitForGmailToolbar();
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
    const list = document.createElement('div');
    list.className = 'UI';
    document.body.appendChild(list);
    const row = document.createElement('tr');
    row.className = 'zA';
    list.appendChild(row);
    await promise;
  });

  test('waitForGmailToolbar retries until header materialises', async () => {
    jest.useFakeTimers();
    const promise = observers.waitForGmailToolbar();
    const toolbar = document.createElement('div');
    toolbar.className = 'G-atb';
    toolbar.setAttribute('role', 'toolbar');
    document.body.appendChild(toolbar);

    await Promise.resolve();
    jest.runOnlyPendingTimers();
    expect.assertions(1);

    const header = document.createElement('div');
    header.className = 'aeH';
    header.appendChild(toolbar);
    document.body.appendChild(header);

    await promise;
    expect(header.contains(toolbar)).toBe(true);
    jest.useRealTimers();
  });

  test('waitForGmailToolbar polls until closest header appears', async () => {
    jest.useFakeTimers();
    const header = document.createElement('div');
    header.className = 'aeH';
    const toolbar = {
      closest: jest
        .fn()
        .mockImplementationOnce(() => null)
        .mockImplementationOnce(() => header),
    };

    const originalQuery = document.querySelector.bind(document);
    const querySpy = jest.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (
        selector === SELECTORS.gmailToolbar ||
        selector === SELECTORS.gmailToolbarLegacy ||
        selector === SELECTORS.gmailToolbarAria
      ) {
        return toolbar;
      }
      if (selector === SELECTORS.gmailToolbarHeader) {
        return header;
      }
      return originalQuery(selector);
    });

    const promise = observers.waitForGmailToolbar();
    jest.runOnlyPendingTimers();
    await promise;

    expect(toolbar.closest).toHaveBeenCalledTimes(2);
    querySpy.mockRestore();
    jest.useRealTimers();
  });

  test('waitForGmailToolbar rejects after timeout', async () => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    const promise = observers.waitForGmailToolbar();
    jest.advanceTimersByTime(10000);
    jest.runOnlyPendingTimers();
    await expect(promise).rejects.toThrow('Gmail toolbar not found within 10 seconds.');
    jest.useRealTimers();
  });

  test('waitForMessageTable rejects after timeout when no rows appear', async () => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    const promise = observers.waitForMessageTable();
    jest.advanceTimersByTime(15000);
    jest.runOnlyPendingTimers();
    await expect(promise).rejects.toThrow('Gmail message table not found within 15 seconds.');
    jest.useRealTimers();
  });
});
