# Browser API Compatibility

## Current Status

The extension currently uses `chrome.*` APIs directly, which work in both Chrome and Firefox.

## If Future Compatibility Issues Arise

If Firefox deprecates `chrome.*` namespace support:

1. Import the polyfill in affected files:
   ```javascript
   import browserAPI from './modules/browser-polyfill.js';
   ```

2. Replace `chrome` with `browserAPI`:
   ```javascript
   // Before
   chrome.storage.sync.get(...)

   // After
   browserAPI.storage.sync.get(...)
   ```

## Why Not Implement Now?

- Current code works in both browsers
- Adding polyfill adds complexity without immediate benefit
- Firefox officially supports `chrome.*` namespace
- Can be added incrementally if issues arise

## Tested APIs

✓ `chrome.storage.sync` - Works in Firefox
✓ `chrome.i18n` - Works in Firefox
✓ `chrome.runtime` - Works in Firefox
✓ `chrome.storage.onChanged` - Works in Firefox
