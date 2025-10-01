# Firefox Implementation - Phase 4: Testing & Documentation

## Overview
Comprehensive testing of the Firefox extension across all functionality, followed by complete documentation updates for end users and developers.

## Prerequisites
- Phase 1 completed (Firefox manifest exists)
- Phase 2 completed (Build system works)
- Phase 3 completed (API compatibility verified)
- Firefox Developer Edition installed (recommended)
- Gmail account for testing

## Duration Estimate
90-120 minutes

---

## Step 1: Set Up Firefox Testing Environment

### 1.1 Install Firefox Developer Edition (Recommended)

**Why Developer Edition?**
- Better debugging tools
- Stricter extension validation
- Access to beta APIs

**Download**: https://www.mozilla.org/firefox/developer/

### 1.2 Create Clean Firefox Profile

```bash
# Create a dedicated testing profile
npx web-ext run --source-dir dist --firefox-profile=gmail-calendar-test --keep-profile-changes
```

**Benefits**:
- Isolated from personal browsing
- Reproducible test environment
- Can reset cleanly

### 1.3 Enable Extension Debugging

In Firefox:
1. Type `about:config` in address bar
2. Accept the warning
3. Search for: `extensions.webextensions.debug.disabled`
4. Set to `false`

---

## Step 2: Functional Testing - Core Features

### 2.1 Build Latest Firefox Version
```bash
npm run build:firefox
```

### 2.2 Launch Firefox with Extension
```bash
npm run firefox:run
```

### 2.3 Test: Extension Installation

**Verify**:
- [ ] Firefox opens without errors
- [ ] Extension icon appears in toolbar
- [ ] No console errors in terminal
- [ ] Extension listed in `about:addons`

**Screenshot location**: Take screenshot → save as `docs/firefox-installation.png`

### 2.4 Test: Gmail Page Load

1. Navigate to https://mail.google.com
2. Log in with test account
3. Open browser console (`F12`)

**Verify**:
- [ ] Gmail loads completely
- [ ] No red errors in console
- [ ] Permission prompt appears (if first time)
- [ ] Grant permission to mail.google.com

### 2.5 Test: Toolbar Injection

**Verify**:
- [ ] Custom toolbar appears below Gmail's action bar
- [ ] All filter buttons visible (All Mail, Mail Only, Calendar, Attachments, Favourites)
- [ ] Icons render correctly (Material Icons)
- [ ] Button text visible (default state)

**If toolbar doesn't appear**:
1. Check console for errors
2. Verify Gmail selectors in `src/modules/constants.js`
3. Check Firefox console for DOM errors

**Screenshot**: Save as `docs/firefox-toolbar.png`

### 2.6 Test: Filter Modes

For EACH filter mode:

#### All Mail Mode
1. Click "All Mail" button
2. **Verify**: All emails visible
3. **Verify**: Button highlighted/pressed state
4. **Console check**: `chrome.storage.sync.get(['currentMode'])` returns `"ALL"`

#### Mail Only Mode
1. Click "Mail Only" button
2. **Verify**: Calendar invite rows hidden
3. **Verify**: Regular emails still visible
4. **Console check**: Mode saved as `"MAIL_ONLY"`

#### Calendar Only Mode
1. Click "Calendar Only" button
2. **Verify**: Only calendar invites visible
3. **Verify**: Regular emails hidden
4. **Console check**: Mode saved as `"CALENDAR_ONLY"`

#### Attachments Only Mode
1. Click "Attachments Only" button
2. **Verify**: Only emails with attachments visible
3. **Verify**: Emails without attachments hidden
4. **Console check**: Mode saved as `"ATTACHMENTS_ONLY"`

#### Favourites Only Mode (if enabled)
1. Star some emails first
2. Click "Favourites Only" button
3. **Verify**: Only starred emails visible
4. **Console check**: Mode saved as `"FAVOURITES_ONLY"`

**Document results**: Create `test-results-firefox-filters.txt`

### 2.7 Test: Filter Persistence

1. Set filter to "Mail Only"
2. Click "Next page" in Gmail pagination
3. **Verify**: Filter still active on page 2
4. Navigate to different Gmail folder (Sent, Drafts)
5. Return to Inbox
6. **Verify**: Filter mode persisted

**Common issue**: If filter doesn't persist, check:
```bash
cat src/modules/observers.js | grep -A 5 "observeMessageList"
```

---

## Step 3: Options Page Testing

### 3.1 Open Options Page

**Method 1**: Via about:addons
1. Navigate to `about:addons`
2. Find extension
3. Click "Options" button

**Method 2**: Via toolbar icon
1. Click extension icon
2. Select "Options" (if available)

### 3.2 Test: Debug Mode Toggle

1. **Initial state**: Debug mode OFF
2. **Action**: Check "Enable debug mode" checkbox
3. **Verify**: Checkbox checked
4. Navigate to Gmail
5. Set filter to "Mail Only"
6. **Verify**: Filtered rows have blue tint at 50% opacity (not hidden)
7. Return to options
8. Uncheck debug mode
9. **Verify**: Filtered rows now fully hidden

**Screenshot**: Save as `docs/firefox-debug-mode.png`

### 3.3 Test: Theme Selection

For each theme:

#### System Theme
1. Select "System"
2. **Verify**: Toolbar matches OS theme
3. Change OS theme (dark ↔ light)
4. **Verify**: Toolbar updates automatically

#### Light Theme
1. Select "Light"
2. **Verify**: Toolbar uses light colors regardless of OS theme

#### Dark Theme
1. Select "Dark"
2. **Verify**: Toolbar uses dark colors regardless of OS theme

### 3.4 Test: Toolbar Alignment

#### Top Alignment
1. Select "Top" alignment
2. **Verify**: Toolbar appears above Gmail's toolbar

#### Bottom Alignment (Default)
1. Select "Bottom" alignment
2. **Verify**: Toolbar appears below Gmail's toolbar

### 3.5 Test: Button Text Toggle

1. Check "Show button text"
2. **Verify**: Text labels appear on all buttons
3. Uncheck "Show button text"
4. **Verify**: Only icons visible (more compact)

### 3.6 Test: Settings Persistence

1. Configure settings:
   - Debug mode: ON
   - Theme: Dark
   - Alignment: Top
   - Button text: OFF
2. Close Firefox completely
3. Reopen Firefox
4. Launch extension
5. **Verify**: All settings retained
6. Check options page
7. **Verify**: Checkboxes/selects match previous state

---

## Step 4: Accessibility Testing

### 4.1 Keyboard Navigation

1. Navigate to Gmail with extension loaded
2. Press `Tab` repeatedly
3. **Verify**: Focus order:
   - Gmail's native controls
   - Custom toolbar label
   - All Mail button
   - Mail Only button
   - Calendar Only button
   - Attachments Only button
   - Favourites Only button (if enabled)
   - Back to Gmail controls

4. Focus on a filter button
5. Press `Enter` or `Space`
6. **Verify**: Filter activates

### 4.2 Escape Key Focus Return

1. Focus any button in custom toolbar
2. Press `Escape`
3. **Verify**: Focus moves to Gmail message list
4. **Verify**: Screen reader announces region change (if using screen reader)

### 4.3 ARIA Attributes

Open browser console and check:

```javascript
// Check button ARIA states
document.querySelectorAll('.gmail-calendar-filter button').forEach(btn => {
  console.log(btn.textContent, 'aria-pressed:', btn.getAttribute('aria-pressed'));
});
```

**Verify**:
- Active button has `aria-pressed="true"`
- Inactive buttons have `aria-pressed="false"`

### 4.4 Screen Reader Testing (Optional but Recommended)

**macOS**: Enable VoiceOver (`Cmd+F5`)
**Windows**: Enable NVDA or JAWS
**Linux**: Enable Orca

**Test**:
1. Navigate to custom toolbar with screen reader
2. **Verify**: Buttons announced with correct labels
3. Activate a filter
4. **Verify**: Status change announced
5. Press `Escape`
6. **Verify**: "Message list" region announced

---

## Step 5: Internationalization Testing

### 5.1 Change Firefox Language

1. Navigate to `about:preferences`
2. Search for "Language"
3. Add a language (e.g., Spanish, French)
4. Set as default
5. Restart Firefox

### 5.2 Verify Translated Strings

**Check**:
- [ ] Extension name translated
- [ ] Button labels translated
- [ ] Options page translated
- [ ] Status messages translated

**Note**: If translations missing, this is expected (English fallback works).

### 5.3 Test RTL Languages (Arabic, Hebrew)

1. Add Arabic or Hebrew to Firefox
2. Set as default language
3. Restart Firefox
4. Open Gmail

**Verify**:
- [ ] Toolbar direction reversed (RTL)
- [ ] Icons mirror correctly
- [ ] Spacing uses logical properties
- [ ] Text aligns right

**Screenshot**: Save as `docs/firefox-rtl.png`

### 5.4 Reset Language

Return Firefox to English (or your preferred language).

---

## Step 6: Performance & Stability Testing

### 6.1 Memory Usage Check

1. Open Firefox Task Manager: `about:processes`
2. Note extension memory usage
3. Perform actions:
   - Switch filters 20 times
   - Navigate through 10 Gmail pages
   - Open/close options page 5 times
4. Check memory usage again

**Expected**: Memory should remain stable (< 50MB increase)

**Document**: Save results to `test-results-firefox-performance.txt`

### 6.2 Gmail Pagination Stress Test

1. Set filter to "Mail Only"
2. Click through 20+ pages of emails
3. **Verify**:
   - Filter persists on every page
   - No console errors accumulate
   - Page transitions remain smooth

### 6.3 Gmail Navigation Test

With filter active:
1. Navigate to Sent folder
2. Navigate to Drafts
3. Navigate to Spam
4. Return to Inbox
5. Open an email thread
6. Return to list view

**Verify**: No errors, extension remains stable

---

## Step 7: Cross-Browser Comparison

### 7.1 Build Chrome Version
```bash
npm run build:chrome
```

### 7.2 Load in Chrome

1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked: select `dist/` folder

### 7.3 Side-by-Side Comparison

Open both browsers with Gmail:

**Compare**:
- [ ] Toolbar appearance identical
- [ ] Filter behavior identical
- [ ] Options page layout identical
- [ ] Icon rendering identical
- [ ] Performance similar

**Document differences**: Save to `test-results-browser-comparison.txt`

---

## Step 8: Update Documentation

### 8.1 Update README.md

#### 8.1.1 Update Installation Instructions

**Find "## Quick Start" section**, add Firefox instructions after Chrome:

```markdown
### For Firefox

```bash
git clone https://github.com/Kevinjohn/chome-extension-gmail-calendar-options.git
cd chome-extension-gmail-calendar-options

# install dev dependencies
npm ci

# create dist/ with Firefox manifest
npm run build:firefox

# load temporary extension
npx web-ext run --source-dir dist
```

Firefox will open automatically with the extension loaded.

**Or manually load**:
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to `dist/` folder
4. Select `manifest.json`
```

#### 8.1.2 Add Firefox-Specific Notes

**Add new section after "## Requirements"**:

```markdown
## Firefox-Specific Behavior

### Host Permissions
Unlike Chrome, Firefox requires users to manually grant permissions to mail.google.com:
1. Click the extension icon or shield icon in the address bar
2. Select "Always allow on mail.google.com"
3. Reload Gmail

### Temporary Installation
Extensions loaded via `about:debugging` are temporary and removed when Firefox closes. For permanent installation:
- Wait for Mozilla Add-ons (AMO) publication
- Or use Firefox Developer Edition with persistent profiles

### Background Scripts vs Service Workers
Firefox executes the background script as an event page (non-persistent background script) rather than a service worker. This is transparent to users but relevant for developers.
```

### 8.2 Update CONTRIBUTING.md

**Add section on Firefox testing**:

```markdown
## Testing on Firefox

### Build Firefox Version
```bash
npm run build:firefox
```

### Test in Firefox
```bash
npm run firefox:run
```

### Validate Firefox Extension
```bash
npm run firefox:lint
```

### Create Firefox Package
```bash
npm run firefox:package
```

The ZIP file will be in `artifacts/firefox/` for AMO submission.

### Firefox-Specific Testing Checklist
- [ ] Extension loads without errors
- [ ] All filter modes work on Gmail
- [ ] Options page functional
- [ ] Settings persist across restarts
- [ ] Keyboard navigation works
- [ ] RTL languages render correctly (if applicable)
- [ ] No manifest validation errors (`npm run firefox:lint`)
```

### 8.3 Update CLAUDE.md

**Add to "## Common Commands" section**:

```markdown
### Firefox Development
```bash
npm run build:firefox     # Build Firefox version with gecko ID
npm run firefox:run       # Launch Firefox Developer Edition with extension
npm run firefox:lint      # Validate Firefox manifest and code
npm run firefox:package   # Create AMO-ready ZIP file
```
```

**Add new section after "## Key Debugging Tips"**:

```markdown
## Firefox-Specific Debugging

### Extension Not Loading
- Check Firefox version ≥ 121: `firefox --version`
- Verify gecko ID in manifest: `grep gecko dist/manifest.json`
- Check browser console for errors: `about:devtools-toolbox?id=<extension-id>&type=extension`

### Toolbar Not Injecting
- Same as Chrome - Gmail selectors likely changed
- Update `src/modules/constants.js` selectors
- Test in both browsers

### Permission Not Granted
- Click shield/lock icon in address bar
- Select "Permissions" → Grant mail.google.com access
- Reload Gmail

### Storage Not Syncing
- Firefox sync must be enabled in browser
- Check `about:preferences#sync`
- Or use `chrome.storage.local` for testing

### web-ext Errors
- Update web-ext: `npm install --save-dev web-ext@latest`
- Specify Firefox path: `npx web-ext run --firefox=/path/to/firefox`
- Clear profile: `rm -rf ~/.mozilla/firefox/*.gmail-calendar-test/`
```

### 8.4 Create Firefox Testing Guide

Create `docs/firefox-testing-guide.md`:

```markdown
# Firefox Testing Guide

## Quick Start

```bash
npm run build:firefox && npm run firefox:run
```

## Full Test Suite

### 1. Installation
- [ ] Extension loads without errors
- [ ] Icon appears in toolbar
- [ ] Listed in about:addons

### 2. Gmail Integration
- [ ] Toolbar injects below Gmail's action bar
- [ ] All buttons visible with icons
- [ ] No console errors on Gmail load

### 3. Filter Modes
- [ ] All Mail - shows all emails
- [ ] Mail Only - hides calendar invites
- [ ] Calendar Only - shows only calendar invites
- [ ] Attachments Only - shows only emails with attachments
- [ ] Favourites Only - shows only starred emails (if enabled)

### 4. Filter Persistence
- [ ] Persists across Gmail pagination
- [ ] Persists when navigating folders
- [ ] Persists across browser restarts

### 5. Options Page
- [ ] Debug mode toggles filtered row visibility
- [ ] Theme selector changes toolbar appearance
- [ ] Toolbar alignment moves toolbar position
- [ ] Button text toggle shows/hides labels
- [ ] All settings persist

### 6. Keyboard Accessibility
- [ ] Tab navigates through all buttons
- [ ] Enter/Space activates filters
- [ ] Escape returns focus to message list

### 7. Internationalization
- [ ] Strings translate based on Firefox language
- [ ] RTL languages mirror correctly

### 8. Performance
- [ ] No memory leaks after extended use
- [ ] Filter applies quickly (< 100ms)
- [ ] No slowdown on large inboxes

## Validation

```bash
npm run firefox:lint
```

Expected: 0 errors, warnings acceptable.

## Common Issues

### Toolbar Doesn't Appear
1. Check Gmail is fully loaded
2. Verify host permissions granted
3. Check browser console for errors
4. Update Gmail selectors if changed

### Filter Doesn't Persist
1. Verify MutationObserver attached
2. Check `observeMessageList()` in console
3. Ensure storage permissions granted

### Options Not Saving
1. Verify storage permission in manifest
2. Check browser console for storage errors
3. Test with `chrome.storage.sync.get(['currentMode'])`

## Reporting Issues

When reporting Firefox-specific issues, include:
- Firefox version (`firefox --version`)
- Extension version (from manifest)
- Browser console errors (F12)
- Steps to reproduce
- Expected vs actual behavior
```

### 8.5 Update CHANGELOG.md

**Add under "## Unreleased"**:

```markdown
### Added
- Firefox support (Manifest V3) with gecko ID
- Build system for Firefox (`npm run build:firefox`)
- Firefox development scripts (`firefox:run`, `firefox:lint`, `firefox:package`)
- Firefox-specific documentation

### Changed
- Build system now supports multiple browser targets via environment variables
- Background script uses dual declaration (service_worker + scripts) for cross-browser compatibility

### Technical
- Added `web-ext` development dependency
- Added `cross-env` for cross-platform environment variables
- Vite config now reads `BROWSER` environment variable
- Created Firefox-specific manifest with gecko ID
```

---

## Step 9: Create Distribution Package

### 9.1 Build Production Firefox Version
```bash
npm run firefox:package
```

### 9.2 Verify Package Contents

```bash
# Extract and inspect
unzip -l artifacts/firefox/*.zip
```

**Verify includes**:
- [ ] manifest.json (with gecko ID)
- [ ] background.js
- [ ] contentScript.js
- [ ] styles.css, colours.css
- [ ] options.html, options.css
- [ ] modules/ directory
- [ ] icons/ directory
- [ ] _locales/ directory
- [ ] assets/fonts/ directory

### 9.3 Validate Package

```bash
# Run web-ext validation on the ZIP
npx web-ext lint --source-dir artifacts/firefox/[filename].zip
```

**Expected**: 0 errors

### 9.4 Document Package Location

Create `FIREFOX-RELEASE.md`:

```markdown
# Firefox Release Package

## Latest Build
Location: `artifacts/firefox/gmail_calendar_options-[version].zip`

## Submission Checklist

### Pre-Submission
- [ ] Built with `npm run firefox:package`
- [ ] Validation passes: `npm run firefox:lint`
- [ ] Manually tested in Firefox ≥ 121
- [ ] All features working (filters, options, keyboard nav)
- [ ] Screenshots updated in `docs/`

### Mozilla Add-ons (AMO) Submission
URL: https://addons.mozilla.org/developers/

1. **Add-on Details**:
   - Name: Gmail Calendar Options
   - Gecko ID: gmail-calendar-options@kevinjohngallagher.com
   - Category: Productivity
   - License: MIT

2. **Upload Package**:
   - Upload: `artifacts/firefox/gmail_calendar_options-[version].zip`
   - Source code (if requested): Link to GitHub repository

3. **Listing Details**:
   - Summary: [Use extension description from manifest]
   - Description: [Use README content]
   - Screenshots: Upload from `docs/firefox-*.png`

4. **Review**:
   - Explain background script usage
   - Note Gmail DOM selectors
   - Reference Chrome Web Store listing (if published)

### Post-Submission
- [ ] Wait for automated validation
- [ ] Respond to reviewer questions
- [ ] Update README with AMO link once published
```

---

## Step 10: Final Verification

### 10.1 Complete Test Checklist

Print and complete:

```
Firefox Extension Test Checklist - Final Verification

BUILD & VALIDATION:
[ ] npm run build:firefox completes without errors
[ ] npm run firefox:lint passes with 0 errors
[ ] dist/manifest.json contains gecko ID
[ ] dist/manifest.json has both service_worker and scripts

INSTALLATION:
[ ] Extension loads in Firefox 121+
[ ] No console errors on load
[ ] Icon appears in toolbar
[ ] Listed in about:addons

CORE FUNCTIONALITY:
[ ] Toolbar injects on Gmail
[ ] All 5 filter modes work
[ ] Filter persists across pagination
[ ] Filter persists across folders
[ ] Filter persists across browser restarts

OPTIONS PAGE:
[ ] All options accessible
[ ] Debug mode works
[ ] Theme selector works
[ ] Alignment selector works
[ ] Button text toggle works
[ ] Settings persist

ACCESSIBILITY:
[ ] Keyboard navigation works
[ ] Escape key returns focus
[ ] ARIA attributes correct
[ ] Screen reader friendly (if tested)

INTERNATIONALIZATION:
[ ] Strings translate (or fallback to English)
[ ] RTL languages mirror correctly

PERFORMANCE:
[ ] No memory leaks
[ ] Fast filter application (< 100ms)
[ ] Stable over extended use

CROSS-BROWSER:
[ ] Behavior matches Chrome version
[ ] Visual appearance consistent

DOCUMENTATION:
[ ] README.md updated
[ ] CONTRIBUTING.md updated
[ ] CLAUDE.md updated
[ ] CHANGELOG.md updated
[ ] Firefox testing guide created
[ ] Release checklist created

PACKAGE:
[ ] npm run firefox:package creates ZIP
[ ] ZIP validates with web-ext lint
[ ] ZIP contains all required files
[ ] Ready for AMO submission

SIGNED OFF BY: ________________  DATE: __________
```

### 10.2 Create Test Report

Save completed checklist as:
```
test-results-firefox-final-[date].txt
```

---

## Verification Checklist

Phase 4 complete when:

- [ ] All functional tests passed
- [ ] Options page fully tested
- [ ] Accessibility verified
- [ ] Internationalization checked
- [ ] Performance validated
- [ ] Cross-browser comparison done
- [ ] README.md updated
- [ ] CONTRIBUTING.md updated
- [ ] CLAUDE.md updated
- [ ] CHANGELOG.md updated
- [ ] Firefox testing guide created
- [ ] Firefox release document created
- [ ] Distribution package created and validated
- [ ] Final test checklist completed

---

## Files Created/Modified

**New Files**:
- `docs/firefox-installation.png` - Screenshot
- `docs/firefox-toolbar.png` - Screenshot
- `docs/firefox-debug-mode.png` - Screenshot
- `docs/firefox-rtl.png` - Screenshot (if RTL tested)
- `docs/firefox-testing-guide.md` - Comprehensive testing guide
- `FIREFOX-RELEASE.md` - Release checklist and AMO submission guide
- `test-results-firefox-filters.txt` - Filter test results
- `test-results-firefox-performance.txt` - Performance metrics
- `test-results-browser-comparison.txt` - Chrome vs Firefox comparison
- `test-results-firefox-final-[date].txt` - Final verification checklist

**Modified Files**:
- `README.md` - Added Firefox installation, requirements, and notes
- `CONTRIBUTING.md` - Added Firefox testing section
- `CLAUDE.md` - Added Firefox debugging section
- `CHANGELOG.md` - Added Firefox support entry

**Generated Artifacts**:
- `artifacts/firefox/gmail_calendar_options-[version].zip` - AMO submission package

---

## Next Steps

After completing Phase 4:
1. Proceed to **Phase 5: Distribution & CI/CD**
2. Submit to Mozilla Add-ons (AMO)
3. Set up automated Firefox builds in CI/CD

---

## Troubleshooting

### Issue: Tests fail in Firefox but pass in Chrome
**Solution**:
1. Check for Chromium-specific APIs
2. Verify Firefox version ≥ 121
3. Check browser console for specific errors
4. Test in Firefox Developer Edition

### Issue: web-ext can't find Firefox
**Solution**:
```bash
# Specify Firefox path
npx web-ext run --firefox=/usr/bin/firefox --source-dir dist

# Or set environment variable
export FIREFOX_BINARY=/usr/bin/firefox
npm run firefox:run
```

### Issue: Extension works in Chrome but toolbar doesn't inject in Firefox
**Debugging**:
1. Same Gmail selectors for both browsers
2. Check if content script loaded: `about:debugging` → Inspect
3. Verify host permissions granted
4. Check for CSP issues in console

### Issue: Performance worse in Firefox than Chrome
**Expected**: Firefox may be slightly slower with MutationObserver callbacks
**Solution**: Already using debounce - no further optimization needed unless severe

---

## References

- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [Firefox DevTools Documentation](https://firefox-source-docs.mozilla.org/devtools-user/)
- [web-ext Command Reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
- [AMO Submission Guide](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Firefox Extension Debugging](https://extensionworkshop.com/documentation/develop/debugging/)
