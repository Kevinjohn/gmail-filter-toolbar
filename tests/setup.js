import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Chrome APIs with proper functionality
global.chrome = {
  storage: {
    sync: {
      get: function(keys, callback) {
        // Mock empty storage by default
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            result[key] = undefined;
          });
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach(key => {
            result[key] = keys[key]; // Use default values
          });
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      },
      set: function(items, callback) {
        if (callback) callback();
        return Promise.resolve();
      },
      remove: function(keys, callback) {
        if (callback) callback();
        return Promise.resolve();
      },
      clear: function(callback) {
        if (callback) callback();
        return Promise.resolve();
      }
    },
    local: {
      get: function(keys, callback) {
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
      },
      set: function(items, callback) {
        if (callback) callback();
        return Promise.resolve();
      },
      remove: function(keys, callback) {
        if (callback) callback();
        return Promise.resolve();
      },
      clear: function(callback) {
        if (callback) callback();
        return Promise.resolve();
      }
    },
    onChanged: {
      addListener: function() {},
      removeListener: function() {},
      hasListener: function() { return false; }
    }
  },
  runtime: {
    onInstalled: {
      addListener: function() {},
      removeListener: function() {}
    },
    onStartup: {
      addListener: function() {},
      removeListener: function() {}
    },
    onMessage: {
      addListener: function() {},
      removeListener: function() {}
    },
    sendMessage: function() { return Promise.resolve(); },
    getURL: function(path) { return `chrome-extension://test-id/${path}`; },
    id: 'test-extension-id'
  },
  tabs: {
    query: function() { return Promise.resolve([]); },
    sendMessage: function() { return Promise.resolve(); }
  },
  i18n: {
    getMessage: function(key, substitutions) {
      // Return the key with substitutions for testing
      if (substitutions) {
        return `${key}_${substitutions.join('_')}`;
      }
      return key;
    }
  }
};

// Mock localStorage for DOM environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: function() {},
      setItem: function() {},
      removeItem: function() {},
      clear: function() {},
      length: 0,
      key: function() {}
    },
    writable: true
  });
}

// Test setup and teardown will be handled by individual test files
