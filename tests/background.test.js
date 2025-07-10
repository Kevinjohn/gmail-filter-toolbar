import { jest, describe, beforeAll, afterEach, test, expect } from '@jest/globals';

// Mocks are defined using jest.mock() below

// Create mock functions that will be reused
const mockStateManagerFunctions = {
  initialize: jest.fn(() => Promise.resolve()),
  get: jest.fn(),
  subscribe: jest.fn()
};

const mockConfigurationManagerFunctions = {
  initialize: jest.fn(() => Promise.resolve()),
  getSystemConfig: jest.fn(),
  addChangeListener: jest.fn()
};

// Mock modules before importing background.js
jest.mock('../src/modules/stateManager.js', () => ({
  stateManager: mockStateManagerFunctions
}));

jest.mock('../src/modules/configurationManager.js', () => ({
  configurationManager: mockConfigurationManagerFunctions
}));

describe('background.js', () => {
  let mockOnInstalledListener, mockOnStartupListener;
  let mockChromeStorageSet;
  let mockStateManager, mockConfigurationManager;
  
  beforeAll(async () => {
    // Use the mock functions defined above
    mockStateManager = mockStateManagerFunctions;
    mockConfigurationManager = mockConfigurationManagerFunctions;
    // Complete Chrome API mock with Jest functions
    mockOnInstalledListener = jest.fn();
    mockOnStartupListener = jest.fn();
    mockChromeStorageSet = jest.fn((items, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });
    
    global.chrome = {
      runtime: {
        onInstalled: {
          addListener: mockOnInstalledListener
        },
        onStartup: {
          addListener: mockOnStartupListener
        },
        sendMessage: jest.fn(() => Promise.resolve()),
        getURL: jest.fn(path => `chrome-extension://test-id/${path}`),
        id: 'test-extension-id',
        lastError: null
      },
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            const result = {};
            if (Array.isArray(keys)) {
              keys.forEach(key => {
                result[key] = undefined;
              });
            } else if (typeof keys === 'object') {
              Object.keys(keys).forEach(key => {
                result[key] = keys[key];
              });
            }
            if (callback) callback(result);
            return Promise.resolve(result);
          }),
          set: mockChromeStorageSet,
          remove: jest.fn((keys, callback) => {
            if (callback) callback();
            return Promise.resolve();
          }),
          clear: jest.fn(callback => {
            if (callback) callback();
            return Promise.resolve();
          })
        },
        local: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn(),
          clear: jest.fn()
        },
        onChanged: {
          addListener: jest.fn(),
          removeListener: jest.fn(),
          hasListener: jest.fn(() => false)
        }
      },
      tabs: {
        query: jest.fn(() => Promise.resolve([])),
        sendMessage: jest.fn(() => Promise.resolve())
      },
      i18n: {
        getMessage: jest.fn((key, substitutions) => {
          if (substitutions) {
            return `${key}_${substitutions.join('_')}`;
          }
          return key;
        })
      }
    };
    
    // Set up console.log and console.error mocks to avoid noise
    global.console = {
      ...console,
      log: jest.fn(),
      error: jest.fn()
    };
    
    // Add logging to verify module import
    console.log('About to import background.js');
    console.log('Chrome mock setup:', !!global.chrome);
    console.log('MockOnInstalledListener:', !!mockOnInstalledListener);
    
    // Dynamically import background.js to ensure it runs after mocks are set up
    await import('../src/modules/background.js');
    
    console.log('Background.js imported successfully');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should register onInstalled listener', () => {
    expect(mockOnInstalledListener).toHaveBeenCalledTimes(1);
    expect(typeof mockOnInstalledListener.mock.calls[0][0]).toBe('function');
  });

  test('should register onStartup listener', () => {
    expect(mockOnStartupListener).toHaveBeenCalledTimes(1);
    expect(typeof mockOnStartupListener.mock.calls[0][0]).toBe('function');
  });

  test('should initialize StateManager and ConfigurationManager on installation', async () => {
    // Get the onInstalled callback
    const onInstalledCallback = mockOnInstalledListener.mock.calls[0][0];
    
    // Set up successful initialization
    mockStateManager.get.mockReturnValue('ALL');
    mockConfigurationManager.getSystemConfig.mockReturnValue('1.0');
    
    // Simulate the onInstalled event
    await onInstalledCallback();
    
    // Verify initialization was called
    expect(mockStateManager.initialize).toHaveBeenCalled();
    expect(mockConfigurationManager.initialize).toHaveBeenCalled();
    expect(mockStateManager.get).toHaveBeenCalledWith('filterMode');
    expect(mockConfigurationManager.getSystemConfig).toHaveBeenCalledWith('defaults.configVersion');
  });

  test('should handle initialization failure with fallback', async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get the onInstalled callback
    const onInstalledCallback = mockOnInstalledListener.mock.calls[0][0];
    
    // Make initialization fail
    mockStateManager.initialize.mockRejectedValue(new Error('Initialization failed'));
    
    // Simulate the onInstalled event
    await onInstalledCallback();
    
    // Verify fallback was used
    expect(mockChromeStorageSet).toHaveBeenCalledWith(
      { gmailCalMode: 'ALL' },
      expect.any(Function)
    );
  });

  test('should initialize on startup', async () => {
    // Get the onStartup callback
    const onStartupCallback = mockOnStartupListener.mock.calls[0][0];
    
    // Simulate the onStartup event
    await onStartupCallback();
    
    // Verify initialization was called
    expect(mockStateManager.initialize).toHaveBeenCalled();
    expect(mockConfigurationManager.initialize).toHaveBeenCalled();
  });

  test('should register state change listener', () => {
    expect(mockStateManager.subscribe).toHaveBeenCalledWith('stateChanged', expect.any(Function));
  });

  test('should register configuration change listener', () => {
    expect(mockConfigurationManager.addChangeListener).toHaveBeenCalledWith(expect.any(Function));
  });
});