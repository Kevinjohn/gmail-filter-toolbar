import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';

let observers;
let state;
let applyFilterMock;
let injectToolbarMock;
let contextInvalidatedMock;

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

const MESSAGE_OBSERVER_OPTIONS = {
  attributes: true,
  attributeFilter: [
    'alt',
    'aria-checked',
    'class',
    'data-docurl',
    'data-tooltip',
    'email',
    'name',
    'src',
    'title',
  ],
  childList: true,
  subtree: true,
};

beforeEach(async () => {
  jest.resetModules();
  MockMutationObserver.reset();
  applyFilterMock = jest.fn();
  injectToolbarMock = jest.fn();
  contextInvalidatedMock = jest.fn(() => false);
  jest.unstable_mockModule('../src/modules/filter.js', () => ({
    applyFilter: applyFilterMock,
  }));
  jest.unstable_mockModule('../src/modules/toolbar.js', () => ({
    injectToolbar: injectToolbarMock,
    isExtensionContextInvalidated: (...args) => contextInvalidatedMock(...args),
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
    expect(instance.observe).toHaveBeenCalledWith(list, MESSAGE_OBSERVER_OPTIONS);

    instance.trigger();
    jest.advanceTimersByTime(200);

    expect(applyFilterMock).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  test('reapplies an active filter after row metadata changes', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('list');
    const list = doc.createElement('div');
    list.className = 'UI';
    doc.body.appendChild(list);
    state.setCurrentMode(state.MODES.FAVOURITES);

    observers.observeMessageList(doc);
    MockMutationObserver.instances[0].trigger([
      { type: 'attributes', attributeName: 'aria-checked' },
    ]);
    jest.advanceTimersByTime(200);

    expect(applyFilterMock).toHaveBeenCalledWith(doc);
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
    expect(listObserver.observe).toHaveBeenCalledWith(list, MESSAGE_OBSERVER_OPTIONS);
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
    // WHY: The skip-path requires a healthy wrapper — one still containing the filter bar.
    // An empty wrapper is treated as gutted (orphaned-script cleanup) and triggers reinjection.
    const bar = doc.createElement('div');
    bar.className = 'gcal-filter-bar';
    wrapper.appendChild(bar);
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

  test('cancels a pending callback when replacing the toolbar observer', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('gmail');
    observers.setupGmailToolbarObserver(doc);
    MockMutationObserver.instances[0].trigger([{ type: 'childList' }]);

    observers.setupGmailToolbarObserver(doc);
    jest.advanceTimersByTime(200);

    expect(injectToolbarMock).not.toHaveBeenCalled();
    expect(applyFilterMock).not.toHaveBeenCalled();
    jest.useRealTimers();
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

  test('waitForGmailToolbar resolves against current Gmail markup', async () => {
    // WHY: Gmail dropped role="toolbar" and the .G6 class from the action bar, leaving only
    // `.aeH > .G-atb[gh="tm"]`. Every selector the waiter knew about stopped matching, so it timed
    // out on every page load while the observer silently carried injection instead.
    document.body.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'aeH';
    const actionBar = document.createElement('div');
    actionBar.className = 'D E G-atb';
    actionBar.setAttribute('gh', 'tm');
    header.appendChild(actionBar);
    document.body.appendChild(header);

    await expect(observers.waitForGmailToolbar()).resolves.toBe(header);
  });

  test('waitForGmailToolbar skips candidates that are not inside a header', async () => {
    // WHY: Gmail renders ~20 [role="toolbar"] elements, nearly all outside .aeH. The waiter used to
    // take the first selector that matched anything, and when closest('.aeH') came back null it
    // re-polled that same doomed element until timeout rather than trying the other candidates.
    document.body.innerHTML = '';
    const decoy = document.createElement('div');
    decoy.setAttribute('role', 'toolbar');
    decoy.setAttribute('aria-label', 'Main toolbar');
    document.body.appendChild(decoy);

    const header = document.createElement('div');
    header.className = 'aeH';
    const actionBar = document.createElement('div');
    actionBar.className = 'G-atb';
    actionBar.setAttribute('gh', 'tm');
    header.appendChild(actionBar);
    document.body.appendChild(header);

    await expect(observers.waitForGmailToolbar()).resolves.toBe(header);
  });

  test('findGmailToolbarHeader returns null when nothing matches', () => {
    document.body.innerHTML = '<div class="aeH"></div>';
    // A bare header with no toolbar candidate inside is not yet ready.
    expect(observers.findGmailToolbarHeader(document)).toBeNull();
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

describe('multiple message lists (Multiple Inboxes)', () => {
  test('observes every .UI list, not just the first', () => {
    const doc = document.implementation.createHTMLDocument('multi');
    const first = doc.createElement('div');
    first.className = 'UI';
    const second = doc.createElement('div');
    second.className = 'UI';
    doc.body.append(first, second);

    expect(observers.observeMessageList(doc)).toBe(true);

    expect(MockMutationObserver.instances).toHaveLength(2);
    expect(MockMutationObserver.instances[0].observe).toHaveBeenCalledWith(
      first,
      MESSAGE_OBSERVER_OPTIONS,
    );
    expect(MockMutationObserver.instances[1].observe).toHaveBeenCalledWith(
      second,
      MESSAGE_OBSERVER_OPTIONS,
    );
  });

  test('returns false when the same set of lists is already observed', () => {
    const doc = document.implementation.createHTMLDocument('multi');
    const first = doc.createElement('div');
    first.className = 'UI';
    const second = doc.createElement('div');
    second.className = 'UI';
    doc.body.append(first, second);

    expect(observers.observeMessageList(doc)).toBe(true);
    expect(observers.observeMessageList(doc)).toBe(false);
    expect(MockMutationObserver.instances).toHaveLength(2);
  });

  test('reattaches (and disconnects old observers) when a new list appears', () => {
    const doc = document.implementation.createHTMLDocument('multi');
    const first = doc.createElement('div');
    first.className = 'UI';
    doc.body.append(first);

    expect(observers.observeMessageList(doc)).toBe(true);
    const initialObserver = MockMutationObserver.instances[0];

    const second = doc.createElement('div');
    second.className = 'UI';
    doc.body.append(second);

    expect(observers.observeMessageList(doc)).toBe(true);
    expect(initialObserver.disconnect).toHaveBeenCalled();
    expect(MockMutationObserver.instances).toHaveLength(3);
  });

  test('disconnects observers when a view no longer contains a message list', () => {
    const doc = document.implementation.createHTMLDocument('multi');
    const list = doc.createElement('div');
    list.className = 'UI';
    doc.body.appendChild(list);
    observers.observeMessageList(doc);
    const observer = MockMutationObserver.instances[0];

    list.remove();
    expect(observers.observeMessageList(doc)).toBe(false);

    expect(observer.disconnect).toHaveBeenCalled();
  });
});

describe('orphaned content script handling', () => {
  test('stops observing and never mutates the DOM once the context is invalidated', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('gmail');
    const header = doc.createElement('div');
    header.className = 'aeH';
    doc.body.append(header);

    observers.setupGmailToolbarObserver(doc);
    const bodyObserver = MockMutationObserver.instances[0];

    contextInvalidatedMock.mockReturnValue(true);
    bodyObserver.trigger([{ type: 'childList' }]);
    jest.advanceTimersByTime(200);

    expect(injectToolbarMock).not.toHaveBeenCalled();
    expect(applyFilterMock).not.toHaveBeenCalled();
    expect(bodyObserver.disconnect).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('rebuilds the toolbar when the wrapper was gutted by a dead orphan', () => {
    jest.useFakeTimers();
    const doc = document.implementation.createHTMLDocument('gmail');
    const header = doc.createElement('div');
    header.className = 'aeH';
    const wrapper = doc.createElement('div');
    wrapper.className = 'gcal-filter-wrapper';
    // Wrapper adjacent to header but EMPTY — the position check alone would skip it.
    doc.body.append(header, wrapper);

    observers.setupGmailToolbarObserver(doc);
    MockMutationObserver.instances[0].trigger([{ type: 'childList' }]);
    jest.advanceTimersByTime(200);

    expect(injectToolbarMock).toHaveBeenCalledWith(doc, header);
    jest.useRealTimers();
  });
});
