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
npm run e2e               # Run Playwright end-to-end tests (CI/native Linux/macOS/Windows only)
npm run test:e2e:ci       # Run e2e tests with CI reporters (JUnit + HTML)

# Note: E2E tests automatically skip in WSL2 environments due to Chrome extension limitations
# Run E2E tests manually on native systems when making significant changes
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

### E2E Test Architecture
The Playwright test suite follows a **Page Object Model** pattern:
- **Fixtures** (`tests/e2e/fixtures/`): Browser setup, extension loading, coverage collection
- **Page Objects** (`tests/e2e/page-objects/`): `OptionsPage`, `GmailPage`, `ToolbarComponent` encapsulate selectors and actions
- **Helpers** (`tests/e2e/helpers/`): Custom matchers, storage utilities, Gmail stubbing
- **Specs** (`tests/e2e/*.spec.js`): Test scenarios organized by feature area

See `tests/e2e/README.md` for detailed documentation.

When selectors break due to Gmail DOM changes:
1. Update `src/modules/constants.js` (production code)
2. Update `tests/e2e/page-objects/GmailPage.js` (test selectors)
3. Update `tests/e2e/fixtures/gmail.html` (test fixture)

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
- Fixtures in `tests/e2e/fixtures/extension.js` load unpacked extension, use offline Gmail fixture (`tests/e2e/fixtures/gmail.html`), capture V8 coverage
- Environment validation: `npm run validate:env` checks browser availability
- Configuration: Workers, retries, reporters (list/JUnit/HTML), video capture on failure

**WSL2 Limitation**: Chrome MV3 extensions with service workers cannot run in Playwright under WSL2 due to browser crashes during page navigation. Tests automatically skip when `uname -r` contains "microsoft" or "WSL". E2E tests work correctly in:
- Native Linux (non-WSL)
- macOS
- Native Windows

For local development in WSL2, rely on unit tests (`npm run test:unit`) and manual browser testing. Run E2E tests manually on native systems when making significant changes.

## Development Workflow

### Commit Convention
Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `test:`, etc.

### Before Committing
The pre-commit hook automatically runs:
- ESLint (`npm run lint`)
- Unit tests (`npm run test:unit`)

E2E tests (`npm run e2e`) are available but skip in WSL. Run manually when needed on native systems.

### Before Submitting PR
1. Create an issue describing the proposal (if significant change)
2. Ensure pre-commit tests passed
3. Format code: `npm run format`
4. Validate locales: `npm run lint:locales` (if changed)
5. Update `CHANGELOG.md` under **Unreleased** section
6. Rebuild extension: `npm run build`
7. Manual smoke test in Chrome
8. Open PR against `main` (or push directly for small changes)

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