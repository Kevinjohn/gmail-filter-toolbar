# End-to-End Tests

This directory contains Playwright-based e2e tests for the Gmail Filter Toolbar extension.

## Architecture

### Fixtures (`fixtures/`)

- **`extension.js`**: Main test fixture that extends Playwright with extension-specific setup (context, page, extensionId, gmailHtml)
- **`browser.js`**: Browser context creation with extension loaded
- **`coverage.js`**: V8 coverage collection for content scripts
- **`extension-loader.js`**: Extension ID extraction from service worker
- **`gmail-stub.js`**: Gmail route stubbing and HTML fixture loading
- **`config.js`**: Shared configuration constants

### Page Objects (`page-objects/`)

- **`OptionsPage.js`**: Encapsulates extension options page interactions
- **`GmailPage.js`**: Encapsulates Gmail page interactions (toolbar, filters, rows)
- **`ToolbarComponent.js`**: Component-level assertions for toolbar

### Helpers (`helpers/`)

### Test Specs

- **`toolbar-options-integration.spec.js`**: Tests integration between options page and toolbar (alignment, theme, favourites, button text)
- **`toolbar-persistence.spec.js`**: Tests filter persistence during pagination and DOM mutations
- **`toolbar-debug.spec.js`**: Tests debug mode visual styling
- **`toolbar-a11y.spec.js`**: Tests keyboard navigation and ARIA announcements
- **`toolbar-responsive.spec.js`**: Tests toolbar at multiple viewport sizes
- **`toolbar-attachments.spec.js`**: Tests attachment type filtering
- **`i18n-options-page.spec.js`**: Tests localization of options page

## Running Tests

### All Tests

```bash
pnpm run e2e
```

**Note**: Tests automatically skip in WSL2 environments (see WSL2 Limitations section below).

### Specific Spec File

```bash
pnpm run e2e -- tests/e2e/toolbar-a11y.spec.js
```

### Headed Mode (See Browser)

```bash
PLAYWRIGHT_HEADFUL=1 pnpm run e2e
```

### Debug Mode (Pause on Start)

```bash
PLAYWRIGHT_DEBUG=1 pnpm run e2e
```

### With Custom Workers

```bash
E2E_WORKERS=4 pnpm run e2e
```

## WSL2 Limitations

**Chrome MV3 extensions cannot run in Playwright under WSL2** due to the following technical limitations:

1. **Service workers don't start in headless mode** - Known Chromium limitation with MV3 extensions
2. **Browser crashes during page navigation in headed mode** - Even with xvfb virtual display
3. **X11/Xvfb instability** - Display server issues cause context termination

### Workaround Strategy

Tests automatically detect WSL2 environments by checking `uname -r` for "microsoft" or "WSL" strings. When detected, all tests skip with a clear message.

**For WSL2 developers:**

- ✅ Run unit tests locally: `pnpm run test:unit` (runs in pre-commit hook)
- ✅ Use manual browser testing for UI validation
- ✅ Run E2E tests on native system when making significant changes
- ⚠️ Force run (not recommended): `E2E_FORCE=1 pnpm run e2e` (will fail)

**For native environments:**

- ✅ Tests work on native Linux (non-WSL)
- ✅ Tests work on macOS
- ✅ Tests work on native Windows

The skip logic is in `playwright.config.js` and respects `CI=true` environment variable (always runs in CI).

## Writing New Tests

1. **Use Page Objects**: Import `OptionsPage` or `GmailPage` instead of hardcoding selectors
2. **Wait on state, not time**: use page-object storage polling and locator assertions.
3. **Stub Gmail**: Always use `stubGmailRoute()` from `gmail-stub.js` and `unstubGmailRoute()` in `finally` blocks
4. **Wait for Storage**: Use `waitForStorageValue()` instead of `waitForTimeout()` when checking storage changes
5. **Use Fixtures**: Load the shared Gmail HTML fixture with `loadGmailFixture()`

## Updating Selectors

If Gmail changes its DOM structure:

1. Update `src/modules/constants.js` with new selectors
2. Update `page-objects/GmailPage.js` if toolbar selectors change
3. Update `fixtures/gmail.html` to match new Gmail structure
4. Re-run tests to verify

## Coverage

Coverage reports are saved in each test’s unique Playwright output directory and attached to the
HTML report.

## Troubleshooting

### Extension Not Loading

- Ensure `pnpm run build` completed successfully
- Check `dist/chrome/manifest.json` exists
- Verify `ensureExtensionBuild()` error messages

### Toolbar Not Found

- Inspect `artifacts/playwright/` screenshots on failure
- Verify Gmail fixture HTML has `.G-atb .G6[role="toolbar"]` element
- Check console logs for extension errors

### Flaky Tests

- Increase timeout in `playwright.config.js`
- Replace `waitForTimeout()` with `waitForFunction()` or `waitForSelector()`
- Check if race conditions exist in extension code (observers attaching late)

## CI/CD

In CI environments:

- Tests run with `retries: 2`
- Output: JUnit XML + HTML report
- Videos and traces captured on failure
- Artifacts saved to `artifacts/playwright/`
