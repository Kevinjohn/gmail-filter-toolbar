# End-to-End Tests

This directory contains Playwright-based e2e tests for the Gmail Calendar Options extension.

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

- **`custom-matchers.js`**: Custom Playwright matchers (`toHaveStorageValue`, `toHaveARIAState`)
- **`storage-helpers.js`**: Utilities for waiting on chrome.storage.sync changes

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
npm run e2e
```

### Specific Spec File
```bash
npm run e2e -- tests/e2e/toolbar-a11y.spec.js
```

### Headed Mode (See Browser)
```bash
PLAYWRIGHT_HEADFUL=1 npm run e2e
```

### Debug Mode (Pause on Start)
```bash
PLAYWRIGHT_DEBUG=1 npm run e2e
```

### With Custom Workers
```bash
E2E_WORKERS=4 npm run e2e
```

## Writing New Tests

1. **Use Page Objects**: Import `OptionsPage` or `GmailPage` instead of hardcoding selectors
2. **Use Custom Matchers**: Import `./helpers/custom-matchers.js` for `toHaveStorageValue()`
3. **Stub Gmail**: Always use `stubGmailRoute()` from `gmail-stub.js` and `unstubGmailRoute()` in `finally` blocks
4. **Wait for Storage**: Use `waitForStorageValue()` instead of `waitForTimeout()` when checking storage changes
5. **Use Fixtures**: Load Gmail HTML templates with `loadGmailFixture('template-name')`

## Updating Selectors

If Gmail changes its DOM structure:

1. Update `src/modules/constants.js` with new selectors
2. Update `page-objects/GmailPage.js` if toolbar selectors change
3. Update `fixtures/gmail.html` to match new Gmail structure
4. Re-run tests to verify

## Coverage

Coverage reports are saved to `artifacts/coverage/playwright/` and attached to test results in HTML reporter.

## Troubleshooting

### Extension Not Loading
- Ensure `npm run build` completed successfully
- Check `dist/manifest.json` exists
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