# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Manifest V3 Chrome extension that adds a custom toolbar to Gmail's interface, allowing users to filter emails by type (calendar invites, attachments, regular mail, etc.). The extension is built with vanilla JavaScript ES modules and uses Vite for bundling.

## Common Commands

### Development
```bash
npm ci                    # Install dependencies
npm run build             # Build extension to dist/
npm run lint              # Lint source files with ESLint (with --fix)
npm run format            # Format code with Prettier
npm run validate:env      # Check Playwright/Chrome binaries availability
```

### Testing
```bash
npm test                  # Run Jest in watch mode
npm run test:unit         # Run Jest unit tests (--runInBand for CI stability)
npm run lint:locales      # Validate i18n message files for key/placeholder parity
npm run audit:options     # Run Lighthouse against built options page

# Playwright e2e tests are currently COMMENTED OUT due to WSL Chrome limitations
# npm run e2e             # (disabled - see WSL Playwright section)
# npm run test:e2e:ci     # (disabled - see WSL Playwright section)
```

### Loading the Extension
1. Run `npm run build` to create `dist/` folder
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" → select `dist/` folder
5. Open https://mail.google.com to see the toolbar

### Running a Single Test
```bash
npm test -- --runTestsByPath tests/specific-file.test.js
npm run e2e -- tests/e2e/specific-spec.spec.js
```

## Architecture

### Entry Points
- **contentScript.js**: Main entry point injected into Gmail pages. Coordinates initialization, toolbar injection, filter application, and observer setup.
- **background.js** (via `src/modules/background.js`): MV3 service worker that sets default storage values on extension install.
- **options.html** + **options.js**: Extension options page for debug mode, button text visibility, toolbar alignment, theme preference, and favourites toggle.

### Module Structure (`src/modules/`)
- **constants.js**: All selectors, config objects (attachment types), storage keys, enums (THEMES, ALIGNMENTS, MODES).
- **state.js**: Global state management (`currentMode`, `debugOn`, `showButtonText`, `themePreference`, `toolbarAlignment`, `showFavouritesButton`) with getters/setters and `loadState()`/`saveState()` functions that interact with `chrome.storage.sync`.
- **toolbar.js**: `injectToolbar()` creates and inserts the custom filter toolbar. Uses `insertAdjacentElement('afterend')` to place toolbar as a **sibling** after Gmail's native toolbar (critical for stability during Gmail DOM updates).
- **filter.js**: `applyFilter()` iterates email rows (`.UI tr.zA`) and shows/hides them based on `currentMode`. Contains detection functions like `isCalendarRow()`, `hasAttachmentRow()`, `hasSpecificAttachment()`.
- **observers.js**:
  - `waitForGmailChrome()`: Polls for Gmail toolbar using `requestAnimationFrame`.
  - `waitForMessageTable()`: Waits for email list container.
  - `observeMessageList()`: Attaches `MutationObserver` to email list to reapply filters when content changes (pagination, new mail).
  - `setupGmailToolbarObserver()`: Monitors `document.body` to ensure toolbar stays injected if Gmail destroys/recreates elements.
- **theme.js**: `applyTheme()` sets CSS custom properties based on user preference (system/light/dark).
- **utils/debounce.js**: Debounce utility for rate-limiting observer callbacks.

### Critical Architecture Patterns

#### Toolbar Injection Strategy
**The toolbar MUST be inserted as a sibling to Gmail's toolbar, not as a child.** This is done via `header.insertAdjacentElement('afterend', wrapper)` in `toolbar.js:injectToolbar()`. This makes the toolbar resilient to Gmail's dynamic DOM updates (pagination, navigation). If injected as a child, it gets destroyed when Gmail replaces its toolbar. See `_remember_toolbar-placement.md` for detailed history.

#### SPA Content Persistence
Gmail is a Single-Page Application. Any DOM element can be destroyed and recreated during navigation. The extension handles this by:
1. Using **idempotent** attachment functions (check if observer already exists before attaching)
2. Observing stable parent elements (`document.body`) to detect when target elements are recreated
3. Re-running initialization logic when needed

See `_remember_filter_on_pagination.md` for the architectural principle.

#### State Flow
1. User clicks filter button → `setCurrentMode()` → `saveState()` → `applyFilter()` → `refreshUI()`
2. Options page changes → `chrome.storage.onChanged` listener in contentScript → state setter → update view
3. Page load → `loadState()` → `waitForGmailChrome()` → `injectToolbar()` → `waitForMessageTable()` → `applyFilter()` → `observeMessageList()`

### Gmail Selector Updates
If Gmail changes its DOM structure and the extension breaks, update `SELECTORS` object in `src/modules/constants.js`. Use browser DevTools to inspect Gmail's new structure and identify stable selectors. Priority: unique IDs > stable classes > ARIA attributes > structural selectors.

### Localisation
All user-facing strings use `chrome.i18n.getMessage('key')` from `src/_locales/{locale}/messages.json`. CSS uses logical properties (`padding-inline-start`, `border-inline-end`) for RTL language support.

## Build System

### Vite Configuration (`vite.config.mjs`)
- **Entry points**: `background.js` and `contentScript.js` are bundled as ES modules
- **Static copy**: `vite-plugin-static-copy` copies `manifest.json`, CSS, HTML, options.js, constants.js, theme.js, icons, locales, and fonts to `dist/`
- **Output**: Files maintain their original names (`[name].js`)

### Testing Setup

#### Jest (`jest.config.cjs`)
- Environment: `jsdom`
- Coverage threshold: 90% (statements, branches, functions, lines)
- Setup: `tests/setup.js` provides chrome API mocks
- Pattern: `**/*.test.js`

#### Playwright (`playwright.config.js`)
- **CURRENTLY DISABLED**: All Playwright tests are commented out because development is happening in WSL where Chrome/Chromium cannot launch
- When tests were active: Fixtures in `tests/e2e/fixtures/extension.js` loaded unpacked extension, used offline Gmail fixture (`tests/e2e/fixtures/gmail.html`), captured V8 coverage
- **Do not attempt to run `npm run e2e` or uncomment tests** until Chrome is accessible from the environment

#### Re-enabling Playwright (Future)
When moving to a Chrome-capable environment (native Windows/Linux/macOS):
1. Uncomment test code in `tests/e2e/fixtures/extension.js` and spec files
2. Run `npx playwright install`
3. Verify `npm run validate:env` passes
4. Run `npm run e2e -- --reporter=line` to confirm
5. Update this documentation to reflect restored e2e testing

## Development Workflow

### Commit Convention
Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `test:`, etc.

### Before Submitting PR
1. Create an issue describing the proposal
2. Create feature branch: `git checkout -b feature/your-branch`
3. Ensure tests pass: `npm run test:unit && npm run lint`
4. Format code: `npm run format`
5. Validate locales: `npm run lint:locales`
6. Update `CHANGELOG.md` under **Unreleased** section
7. Rebuild extension: `npm run build`
8. Manual smoke test in Chrome
9. Open PR against `main`

### Manual Testing Checklist
1. Load unpacked extension and verify toolbar appears below Gmail's action bar
2. Test all filter modes: All Mail, Mail Only, Calendar Only, Attachments Only, Favourites Only (if enabled)
3. Test pagination - filter should persist
4. Enable debug mode from options page - filtered rows should show blue tint at 50% opacity
5. Test keyboard navigation (<kbd>Esc</kbd> returns focus to message list)
6. Test RTL rendering (set `dir="rtl"` in DevTools)
7. Verify ARIA announcements with screen reader

## Key Debugging Tips

### Filter Not Working After Pagination
- Check that `observeMessageList()` is attached and not detached
- Verify `applyFilter()` is called in the mutation callback
- Check browser console for errors in `modules/observers.js`

### Toolbar Appears Above Gmail's Toolbar
- Verify `injectToolbar()` uses `insertAdjacentElement('afterend')` not `appendChild`
- Check that `wrapper` is a sibling to Gmail's toolbar header, not a child
- Inspect `setupGmailToolbarObserver()` to ensure it's re-injecting correctly

### Attachment Detection Issues
- Update `SELECTORS.icsImage`, `attachmentIcon`, or `attachmentRowClass` in `constants.js`
- Add new attachment logic in `filter.js:hasAttachmentRow()` or `hasSpecificAttachment()`

### State Not Persisting
- Check `chrome.storage.sync` in DevTools → Application → Storage → Extension Storage
- Verify `saveState()` is called after state changes
- Check `loadState()` resolves before `applyFilter()` is called

## Code Quality Standards

- **Coverage**: Maintain 90% coverage threshold (Jest enforces this)
- **Linting**: All code must pass ESLint (use `npm run lint` to autofix)
- **Formatting**: Use Prettier (`npm run format`)
- **Accessibility**: Toolbar must be keyboard navigable and WCAG 2.1 AA compliant
- **Localization**: All user strings must use `chrome.i18n.getMessage()`
- **Performance**: Background tasks should complete under 500ms (monitored in tests)