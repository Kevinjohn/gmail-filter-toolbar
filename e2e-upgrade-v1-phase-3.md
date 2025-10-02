# E2E Test Suite Upgrade - Phase 3: Infrastructure & Organization

**Status**: Not Started
**Estimated Effort**: 1 day
**Prerequisites**: Phase 1 and 2 completed

---

## Overview

Phase 3 improves test infrastructure with custom matchers, enhanced Playwright configuration, better file organization, test data templates, and comprehensive documentation.

**Changes include new helpers, config updates, and documentation - minimal changes to existing tests.**

---

## 3.1 Add Custom Playwright Matchers

**Goal**: Create `toHaveStorageValue()` and `toHaveARIAState()` custom matchers.

### Create `tests/e2e/helpers/custom-matchers.js`

```javascript
import { expect } from '@playwright/test';

/**
 * Custom matcher: Asserts a chrome.storage.sync key has a specific value.
 * Usage: await expect(page).toHaveStorageValue('debugOn', true);
 */
expect.extend({
  async toHaveStorageValue(page, key, expectedValue) {
    const actualValue = await page.evaluate((key) => {
      return new Promise((resolve) => {
        chrome.storage.sync.get([key], (result) => {
          resolve(result[key]);
        });
      });
    }, key);

    const pass = JSON.stringify(actualValue) === JSON.stringify(expectedValue);

    if (pass) {
      return {
        message: () => `Expected storage key "${key}" not to have value ${JSON.stringify(expectedValue)}, but it does`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected storage key "${key}" to have value ${JSON.stringify(expectedValue)}, but got ${JSON.stringify(actualValue)}`,
        pass: false,
      };
    }
  },

  /**
   * Custom matcher: Asserts an element has a specific ARIA attribute value.
   * Usage: await expect(button).toHaveARIAState('checked', 'true');
   */
  async toHaveARIAState(locator, attribute, expectedValue) {
    const actualValue = await locator.getAttribute(`aria-${attribute}`);
    const pass = actualValue === expectedValue;

    if (pass) {
      return {
        message: () => `Expected aria-${attribute} not to be "${expectedValue}", but it is`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected aria-${attribute} to be "${expectedValue}", but got "${actualValue}"`,
        pass: false,
      };
    }
  },
});
```

### Example Usage in Tests

Add this import at the top of any spec file:

```javascript
import './helpers/custom-matchers.js';
```

Then use in tests:

```javascript
import { test, expect } from './fixtures/extension.js';
import './helpers/custom-matchers.js';

test('storage value is persisted', async ({ page }) => {
  // ... set some option ...
  await expect(page).toHaveStorageValue('showButtonText', false);
});

test('button has correct ARIA state', async ({ page }) => {
  const button = page.locator('#filter-ATTACH');
  await button.click();
  await expect(button).toHaveARIAState('checked', 'true');
});
```

**Verification**: Add example usage to an existing test and run it.

---

## 3.2 Improve Playwright Config

**Goal**: Add projects, sharding, better reporters, and environment variable support.

### Edit `playwright.config.js`

Replace the entire file with:

```javascript
import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;
const workers = process.env.E2E_WORKERS ? parseInt(process.env.E2E_WORKERS, 10) : (isCI ? 2 : 1);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  fullyParallel: !isCI, // Enable parallel execution locally for speed
  retries: isCI ? 2 : 0, // Increased retries for CI flakiness
  workers,
  outputDir: 'artifacts/playwright',
  reporter: isCI
    ? [
        ['list'],
        ['junit', { outputFile: 'artifacts/playwright/junit.xml' }],
        ['html', { outputFolder: 'artifacts/playwright/html', open: 'never' }]
      ]
    : [
        ['list'],
        ['html', { outputFolder: 'artifacts/playwright/html', open: 'on-failure' }]
      ],
  use: {
    headless: process.env.PLAYWRIGHT_HEADFUL !== '1',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure', // Added video capture
    launchOptions: {
      args: ['--allow-file-access-from-files']
    }
  },
  projects: [
    {
      name: 'chromium-extension',
      testMatch: /.*\.spec\.js/,
      use: {
        browserName: 'chromium',
      },
    },
    // Future: Add Firefox addon project when MV3 support is available
    // {
    //   name: 'firefox-addon',
    //   testMatch: /.*\.spec\.js/,
    //   use: {
    //     browserName: 'firefox',
    //   },
    // },
  ],
});
```

### Environment Variables Now Supported

- `E2E_WORKERS=2` - Set number of parallel workers
- `PLAYWRIGHT_HEADFUL=1` - Run in headed mode (see the browser)
- `PLAYWRIGHT_DEBUG=1` - Pause on test start (set in `fixtures/config.js`)

**Verification**:
1. Run `npm run e2e` - should use new config
2. Check `artifacts/playwright/html/index.html` for HTML report
3. Verify videos are captured in `artifacts/playwright/` on failure

---

## 3.3 Reorganize Test Files

**Goal**: Rename and group spec files by functional area.

### Renames

```bash
cd tests/e2e
mv options-toolbar.spec.js toolbar-options-integration.spec.js
mv locale-smoke.spec.js i18n-options-page.spec.js
```

**Verification**: Run `npm run e2e` - should find and run renamed files.

---

## 3.4 Create Test Data Templates

**Goal**: Support multiple Gmail fixture scenarios.

### Create Template Directory

```bash
mkdir -p tests/e2e/fixtures/gmail-templates
cp tests/e2e/fixtures/gmail.html tests/e2e/fixtures/gmail-templates/minimal.html
```

### Create Paginated Template

Create `tests/e2e/fixtures/gmail-templates/paginated.html` by copying `minimal.html` and duplicating the `<tbody>` content 10 times, changing `data-testid` values:

```html
<!-- Inside <tbody> after existing rows -->
<tr class="zA" data-testid="row-mail-2">
  <td class="bog">Regular email 2</td>
</tr>
<tr class="zA" data-testid="row-mail-3">
  <td class="bog">Regular email 3</td>
</tr>
<!-- ... continue to row-mail-50 -->
```

**Tip**: Use a script or text editor macro to generate 50 rows.

### Create Mixed Attachments Template

Copy `minimal.html` to `mixed-attachments.html` and ensure it includes all attachment types added in Phase 2.

```bash
cp tests/e2e/fixtures/gmail-templates/minimal.html tests/e2e/fixtures/gmail-templates/mixed-attachments.html
```

### Update `gmail-stub.js`

Edit `tests/e2e/fixtures/gmail-stub.js` to support template selection:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const TEMPLATES_DIR = path.join(process.cwd(), 'tests', 'e2e', 'fixtures', 'gmail-templates');
const DEFAULT_TEMPLATE = path.join(process.cwd(), 'tests', 'e2e', 'fixtures', 'gmail.html');

/**
 * Loads a Gmail HTML fixture from disk.
 * @param {string} template - Template name (e.g., 'minimal', 'paginated') or null for default
 * @returns {string} HTML content
 */
export function loadGmailFixture(template = null) {
  if (!template) {
    return fs.readFileSync(DEFAULT_TEMPLATE, 'utf8');
  }
  const templatePath = path.join(TEMPLATES_DIR, `${template}.html`);
  return fs.readFileSync(templatePath, 'utf8');
}

/**
 * Stubs all requests to mail.google.com to return the offline Gmail fixture.
 * @param {Page} page - Playwright page object
 * @param {string} html - HTML content to return
 */
export async function stubGmailRoute(page, html) {
  await page.route('https://mail.google.com/*', async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.fulfill({
        status: 200,
        body: html,
        contentType: 'text/html',
      });
    } else {
      // Block all other resources (CSS, JS, images, etc.)
      await route.fulfill({ status: 204, body: '' });
    }
  });
}

/**
 * Removes the Gmail route stub to allow real requests.
 * @param {Page} page - Playwright page object
 */
export async function unstubGmailRoute(page) {
  await page.unroute('https://mail.google.com/*');
}
```

### Usage in Tests

```javascript
const gmailHtml = loadGmailFixture('paginated'); // Use paginated template
await stubGmailRoute(page, gmailHtml);
```

**Verification**:
1. Update a test to use `loadGmailFixture('minimal')`
2. Run test - should pass
3. Change to `loadGmailFixture('paginated')`
4. Run test - should see 50 rows in Gmail fixture

---

## 3.5 Add Test Documentation

**Goal**: Create README explaining test architecture.

### Create `tests/e2e/README.md`

```markdown
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
```

**Verification**: Read through the README to ensure it's clear and complete.

---

## Phase 3 Completion Checklist

- [ ] Custom matchers created (`custom-matchers.js`)
- [ ] Playwright config updated with projects, workers, video capture
- [ ] Test files renamed for clarity
- [ ] Gmail template directory created with minimal, paginated, mixed-attachments
- [ ] `gmail-stub.js` updated to support templates
- [ ] `tests/e2e/README.md` created

**Next Step**: Proceed to [Phase 4: Final Polish](e2e-upgrade-v1-phase-4.md)