# Firefox Implementation - Phase 3: API Compatibility & Code Review

## Overview
Review and adapt JavaScript code to ensure Chrome and Firefox API compatibility. While most code is already compatible, we need to verify and add fallbacks where necessary.

## Prerequisites
- Phase 1 completed (Firefox manifest exists)
- Phase 2 completed (Build system works)
- Basic understanding of JavaScript
- Familiarity with browser extension APIs

## Duration Estimate
45-60 minutes (mostly verification, minimal changes needed)

---

## Step 1: Understand API Compatibility

### 1.1 Chrome vs Browser Namespace

**Chrome APIs**: Use `chrome.*` namespace
```javascript
chrome.storage.sync.get(...)
chrome.i18n.getMessage(...)
```

**Firefox APIs**: Prefer `browser.*` namespace (but also support `chrome.*`)
```javascript
browser.storage.sync.get(...)
browser.i18n.getMessage(...)
```

**Good News**: Your extension already uses `chrome.*` which Firefox also supports!

### 1.2 Promise vs Callback Style

**Chrome MV3**: Most APIs support both promises and callbacks
**Firefox MV3**: Prefers promises

**Example**:
```javascript
// Callback style (works in both)
chrome.storage.sync.get(['key'], (result) => { ... });

// Promise style (works in both, preferred in Firefox)
chrome.storage.sync.get(['key']).then((result) => { ... });
```

---

## Step 2: Audit Current Code for API Usage

### 2.1 Search for chrome.* API Calls
```bash
grep -r "chrome\." src/ --include="*.js" | cut -d: -f1 | sort -u
```

**Expected files using chrome APIs**:
- `src/modules/background.js`
- `src/modules/state.js`
- `src/modules/options.js`
- `src/contentScript.js`

### 2.2 List All API Usages
```bash
grep -r "chrome\.[a-zA-Z]*" src/ --include="*.js" -o | sort | uniq
```

**Expected APIs**:
- `chrome.storage` ✓ Compatible
- `chrome.i18n` ✓ Compatible
- `chrome.runtime` ✓ Compatible

---

## Step 3: Review State Management (storage API)

### 3.1 Examine state.js
```bash
cat src/modules/state.js
```

### 3.2 Verify Storage API Patterns

**Look for**:
```javascript
chrome.storage.sync.get(...)
chrome.storage.sync.set(...)
```

**Verify**:
- ✓ Uses `chrome.storage.sync` (compatible with Firefox)
- ✓ Uses promises or async/await (Firefox friendly)
- ✓ No use of deprecated APIs

**No changes needed** - state management is already compatible.

---

## Step 4: Review Background Script

### 4.1 Examine background.js
```bash
cat src/modules/background.js
```

### 4.2 Verify Service Worker Compatibility

**Check for**:
- `chrome.runtime.onInstalled` listener ✓ Compatible
- `chrome.storage.sync.set()` for defaults ✓ Compatible

**Important**: Firefox will execute this as a background script (not service worker), but the code works identically.

**No changes needed** - background logic is compatible.

---

## Step 5: Review Options Page

### 5.1 Examine options.js
```bash
cat src/modules/options.js
```

### 5.2 Verify Options API Usage

**Check for**:
- `chrome.i18n.getMessage()` ✓ Compatible
- `chrome.storage.sync.get()` ✓ Compatible
- `chrome.storage.sync.set()` ✓ Compatible
- `chrome.storage.onChanged` listener ✓ Compatible

**No changes needed** - options page is compatible.

---

## Step 6: Review Content Script

### 6.1 Examine contentScript.js
```bash
cat src/contentScript.js
```

### 6.2 Verify Content Script Compatibility

**Check for**:
- `chrome.i18n.getMessage()` for translations ✓ Compatible
- `chrome.storage.sync` for state ✓ Compatible
- DOM manipulation (browser-agnostic) ✓ Compatible
- Event listeners (browser-agnostic) ✓ Compatible

**No changes needed** - content script is compatible.

---

## Step 7: Optional Browser Polyfill (Future-Proofing)

While not required now, we can add a lightweight polyfill for maximum compatibility.

### 7.1 Create Browser Polyfill Module

Create `src/modules/browser-polyfill.js`:

```javascript
/**
 * Lightweight browser API polyfill
 * Ensures chrome.* APIs work consistently across Chrome and Firefox
 *
 * Firefox supports chrome.* namespace natively, but this provides
 * a safety net for future API changes.
 */

// Firefox natively supports chrome.* so this is mostly a no-op
// but provides a safety layer for future compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

export default browserAPI;
```

### 7.2 Document Usage (Don't Implement Yet)

Create `docs/browser-api-compatibility.md`:

```markdown
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
```

**Decision**: Keep using `chrome.*` for now. Add polyfill only if issues arise.

---

## Step 8: Test API Functionality in Firefox

### 8.1 Build and Launch Firefox
```bash
npm run build:firefox
npm run firefox:run
```

### 8.2 Open Browser Console

When Firefox opens:
1. Press `F12` to open Developer Tools
2. Click "Console" tab
3. Navigate to https://mail.google.com

### 8.3 Verify No API Errors

**Look for**:
- ✓ No "chrome is not defined" errors
- ✓ No "storage.sync is not supported" errors
- ✓ No i18n errors

**If errors appear**: Note them and proceed to troubleshooting section.

### 8.4 Test Storage API

In the Firefox console, test storage:

```javascript
// Set a value
chrome.storage.sync.set({testKey: 'testValue'}).then(() => {
  console.log('✓ Storage set works');
});

// Get the value
chrome.storage.sync.get(['testKey']).then((result) => {
  console.log('✓ Storage get works:', result);
});
```

**Expected output**: No errors, values stored/retrieved successfully.

### 8.5 Test i18n API

In the Firefox console:

```javascript
// Get a message
const message = chrome.i18n.getMessage('extension_name');
console.log('✓ i18n works:', message);
```

**Expected output**: Extension name appears.

---

## Step 9: Verify Extension Options Page

### 9.1 Open Extension Options

In Firefox:
1. Type `about:addons` in address bar
2. Find "Gmail Calendar Options" (or your extension name)
3. Click "Options" or "Preferences"

### 9.2 Test Options Functionality

**Test checklist**:
- [ ] Options page loads without console errors
- [ ] Debug mode checkbox toggles
- [ ] Theme selector changes theme
- [ ] Toolbar alignment selector works
- [ ] Settings persist after page reload

### 9.3 Check Console for Errors

Press `F12` in options page and verify:
- ✓ No API errors
- ✓ No "undefined" errors
- ✓ Settings save successfully

---

## Step 10: Content Script Gmail Integration Test

### 10.1 Navigate to Gmail

In the Firefox window opened by `npm run firefox:run`:
1. Go to https://mail.google.com
2. Log in with a Google account (or use an existing session)

### 10.2 Open Browser Console

Press `F12` to open Developer Tools.

### 10.3 Verify Extension Load

**Check console for**:
- ✓ No "chrome.* is not defined" errors
- ✓ Extension messages appear (if any debug logging exists)
- ✓ Toolbar elements inject successfully

### 10.4 Test Storage in Gmail Context

In console:
```javascript
chrome.storage.sync.get(['currentMode']).then((result) => {
  console.log('Current filter mode:', result.currentMode);
});
```

**Expected**: Current mode retrieved successfully.

---

## Step 11: Document API Compatibility

### 11.1 Update CLAUDE.md

**Add a new section after "## Architecture"**:

```markdown
## Browser Compatibility

### Supported Browsers
- **Chrome**: 114+ (Manifest V3)
- **Edge**: 114+ (Chromium-based, Manifest V3)
- **Firefox**: 121+ (Manifest V3 with background scripts)

### API Compatibility
The extension uses the `chrome.*` namespace for all browser APIs, which is supported by both Chrome and Firefox:

- `chrome.storage.sync` - Cross-browser state persistence
- `chrome.i18n` - Internationalization and localization
- `chrome.runtime` - Extension lifecycle and messaging
- `chrome.storage.onChanged` - Real-time storage updates

Firefox natively supports the `chrome.*` namespace alongside its preferred `browser.*` namespace. No polyfill is currently required.

### Firefox-Specific Behaviors
1. **Background Scripts**: Firefox executes `background.js` as a background script (event page) rather than a service worker. The code works identically in both contexts.
2. **Host Permissions**: Firefox users must manually grant permissions to mail.google.com when first visiting Gmail (Chrome grants automatically).
3. **Storage Sync**: Firefox's `chrome.storage.sync` has a lower quota (100KB vs Chrome's 100KB) - extension is well within limits.
```

### 11.2 Update README.md

**Add to "## Requirements" section**:

```markdown
* **Google Chrome / Microsoft Edge ≥ 114** (desktop)
* **Mozilla Firefox ≥ 121** (desktop)
* **Node ≥ 18** (for build & test tooling)
* macOS, Windows, or Linux
```

---

## Verification Checklist

Before moving to Phase 4, verify:

- [ ] Searched codebase for chrome.* API usage
- [ ] Verified all APIs are Firefox-compatible
- [ ] Created browser-polyfill.js (for future use)
- [ ] Tested storage API in Firefox console
- [ ] Tested i18n API in Firefox console
- [ ] Options page works in Firefox
- [ ] Extension loads on Gmail in Firefox without errors
- [ ] CLAUDE.md documents browser compatibility
- [ ] README.md lists Firefox as supported browser
- [ ] No code changes required (APIs already compatible)

---

## Files Created/Modified

**New Files**:
- `src/modules/browser-polyfill.js` - Future compatibility layer (unused for now)
- `docs/browser-api-compatibility.md` - API compatibility documentation

**Modified Files**:
- `CLAUDE.md` - Added "Browser Compatibility" section
- `README.md` - Added Firefox to requirements

**No Changes to Core Code**:
- `src/modules/state.js` - Already compatible ✓
- `src/modules/background.js` - Already compatible ✓
- `src/modules/options.js` - Already compatible ✓
- `src/contentScript.js` - Already compatible ✓

---

## Next Steps

After completing Phase 3:
1. Proceed to **Phase 4: Testing & Documentation**
2. Run comprehensive tests in both browsers
3. Document Firefox-specific behaviors

---

## Troubleshooting

### Issue: "chrome is not defined" error in Firefox
**Cause**: Very unlikely with Firefox 121+
**Solution**: Check Firefox version is 121+:
```bash
firefox --version
```

### Issue: Storage API returns undefined
**Cause**: Permission not granted or storage not initialized
**Solution**:
1. Check manifest includes `"permissions": ["storage"]`
2. Verify background script sets default values

### Issue: i18n messages show "??key??" in Firefox
**Cause**: Message key doesn't exist or _locales not copied
**Solution**:
```bash
# Verify _locales copied to dist
ls dist/_locales/en/messages.json
```

### Issue: Options page blank in Firefox
**Cause**: CSP blocking scripts
**Solution**: Verify CSP in manifest allows 'self':
```bash
grep "extension_pages" dist/manifest.json
```

### Issue: Extension doesn't inject on Gmail
**Cause**: Content script not loaded or host permissions not granted
**Solution**:
1. Check Firefox address bar for shield icon
2. Click and grant permissions to mail.google.com
3. Reload Gmail

---

## References

- [Chrome API Support in Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities)
- [Firefox storage.sync Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync)
- [Firefox i18n Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n)
- [Browser API Polyfill (Not Required)](https://github.com/mozilla/webextension-polyfill)
