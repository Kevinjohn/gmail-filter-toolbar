import { TextEncoder, TextDecoder } from 'util';
import { beforeEach, afterEach, jest } from '@jest/globals';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const createListenerMock = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
  hasListener: jest.fn(),
});

const deepMerge = (target, source) => {
  if (!source) return target;
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];
    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object'
    ) {
      target[key] = deepMerge({ ...targetValue }, sourceValue);
    } else {
      target[key] = sourceValue;
    }
  }
  return target;
};

const createBaseChromeMock = () => ({
  alarms: {
    create: jest.fn(),
    clear: jest.fn((name, callback) => callback?.(true)),
    get: jest.fn((name, callback) => callback?.({ name })),
    onAlarm: createListenerMock(),
  },
  action: {
    onClicked: createListenerMock(),
  },
  i18n: {
    getMessage: jest.fn((key) => key),
    getUILanguage: jest.fn(() => 'en'),
  },
  runtime: {
    // WHY: A real extension context always has runtime.id; its absence is the signature of an
    // orphaned content script, which injectToolbar/observers treat as "do not touch the DOM".
    id: 'test-extension-id',
    lastError: null,
    onInstalled: createListenerMock(),
    onMessage: createListenerMock(),
    openOptionsPage: jest.fn(),
    sendMessage: jest.fn((message, responseCallback) => responseCallback?.()),
  },
  storage: {
    sync: {
      get: jest.fn((keys, callback) => callback?.({})),
      set: jest.fn((items, callback) => callback?.()),
      remove: jest.fn((keys, callback) => callback?.()),
    },
    local: {
      get: jest.fn((keys, callback) => callback?.({})),
      set: jest.fn((items, callback) => callback?.()),
      remove: jest.fn((keys, callback) => callback?.()),
    },
    onChanged: createListenerMock(),
  },
});

function createChromeMock(overrides = {}) {
  return deepMerge(createBaseChromeMock(), overrides);
}

global.createChromeMock = createChromeMock;

global.useChromeMock = (overrides = {}) => {
  global.__chromeOverrides = overrides;
  global.chrome = createChromeMock(overrides);
  return global.chrome;
};

global.resetChromeMock = () => {
  global.__chromeOverrides = undefined;
  global.chrome = createChromeMock();
  return global.chrome;
};

beforeEach(() => {
  const overrides =
    typeof global.__chromeOverrides === 'function'
      ? global.__chromeOverrides()
      : global.__chromeOverrides;
  global.chrome = createChromeMock(overrides);
});

afterEach(() => {
  jest.clearAllMocks();
});
