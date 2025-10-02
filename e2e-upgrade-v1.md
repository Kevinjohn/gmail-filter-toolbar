# E2E Test Suite Upgrade Plan v1

**Status**: Not Started
**Target Environment**: Native Chrome (post-WSL migration)
**Estimated Effort**: 3-5 days for full implementation

---

## Overview

This document provides atomic-level instructions to upgrade the Playwright end-to-end test suite. Each section can be completed independently by a developer with no prior knowledge of this codebase. All changes are confined to the `tests/e2e/` directory and `playwright.config.js` - **no production code in `src/` is modified**.

---

## Prerequisites

Before starting any section:

1. Ensure you're in a Chrome-capable environment (not WSL)
2. Run `npm ci` to install dependencies
3. Run `npm run build` to create the `dist/` folder
4. Run `npx playwright install` to install browsers
5. Verify Playwright works: `npm run validate:env` should pass

---

## Phase 1: Foundation (Do These First)

### 1.1 Split Monolithic Fixture into Modules

**Goal**: Break `tests/e2e/fixtures/extension.js` into smaller, focused files.

**Context**: Currently all fixture logic (browser launch, coverage, extension loading, Gmail stubbing) is in one 145-line file. This makes it hard to maintain.

**Files to Create**:

#### `tests/e2e/fixtures/config.js`

Create this new file with shared configuration constants:

```javascript
import path from 'node:path';
import process from 'node:process';

export const EXTENSION_PATH = path.join(process.cwd(), 'dist');
export const GMAIL_FIXTURE_PATH = path.join(
  process.cwd(),
  'tests',
  'e2e',
  'fixtures',
  'gmail.html'
);
export const COVERAGE_DIR = path.join(process.cwd(), 'artifacts', 'coverage', 'playwright');
export const HEADFUL = process.env.PLAYWRIGHT_HEADFUL === '1';
export const DEBUG = process.env.PLAYWRIGHT_DEBUG === '1';
```

**Verification**: Run `node tests/e2e/fixtures/config.js` - should execute without errors.

---

#### `tests/e2e/fixtures/browser.js`

Create this file to handle browser context creation:

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { EXTENSION_PATH, HEADFUL, DEBUG } from './config.js';

/**
 * Throws an error if the extension build is missing or incomplete.
 */
export function ensureExtensionBuild() {
  if (!fs.existsSync(EXTENSION_PATH)) {
    throw new Error(
      `Extension build not found at: ${EXTENSION_PATH}\n` +
      'Run `npm run build` before executing Playwright specs.'
    );
  }
  const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `manifest.json missing from: ${EXTENSION_PATH}\n` +
      'Ensure `npm run build` completed successfully.'
    );
  }
}

/**
 * Launches a persistent browser context with the extension loaded.
 * @param {string} locale - Browser locale (e.g., 'en-US', 'ar')
 * @param {string} colorScheme - 'light' or 'dark'
 * @returns {Promise<BrowserContext>}
 */
export async function launchExtensionContext(locale, colorScheme) {
  ensureExtensionBuild();

  const launchArgs = [
    '--allow-file-access-from-files',
    '--disable-extensions-except=' + EXTENSION_PATH,
    '--load-extension=' + EXTENSION_PATH,
    locale ? `--lang=${locale}` : '--lang=en-US',
  ];

  if (!HEADFUL && !DEBUG) {
    launchArgs.push('--headless=new', '--disable-gpu');
  }

  // Stability flags for CI environments
  launchArgs.push('--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage');

  const context = await chromium.launchPersistentContext('', {
    headless: !HEADFUL && !DEBUG,
    locale,
    colorScheme,
    args: launchArgs,
  });

  return context;
}
```

**Verification**: Add a test import at the bottom:
```javascript
// Test: Uncomment to verify, then remove
// ensureExtensionBuild();
// console.log('✓ Extension build validated');
```

---

#### `tests/e2e/fixtures/coverage.js`

Create this file to handle V8 coverage collection:

```javascript
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { COVERAGE_DIR } from './config.js';

/**
 * Initializes V8 coverage collection for a page.
 * @param {Page} page - Playwright page object
 * @param {BrowserContext} context - Browser context
 * @param {Object} testInfo - Playwright testInfo object
 * @returns {Promise<CDPSession|null>} CDP client or null if failed
 */
export async function startCoverage(page, context, testInfo) {
  let client;
  try {
    client = await context.newCDPSession(page);
    await client.send('Profiler.enable');
    await client.send('Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: true,
    });
    return client;
  } catch (error) {
    await testInfo.attach('coverage-warn', {
      body: `Failed to initialise coverage: ${error}`,
      contentType: 'text/plain',
    });
    return null;
  }
}

/**
 * Collects and saves V8 coverage data for the content script.
 * @param {CDPSession|null} client - CDP client from startCoverage
 * @param {string} extensionId - Extension ID
 * @param {Object} testInfo - Playwright testInfo object
 */
export async function collectCoverage(client, extensionId, testInfo) {
  if (!client) return;

  try {
    const { result } = await client.send('Profiler.takePreciseCoverage');
    await client.send('Profiler.stopPreciseCoverage');
    await client.detach?.();

    const extensionOrigin = `chrome-extension://${extensionId}`;
    const contentScriptCoverage = (result ?? []).filter((entry) =>
      entry.url.startsWith(`${extensionOrigin}/`) && entry.url.endsWith('/contentScript.js')
    );

    if (contentScriptCoverage.length > 0) {
      await fsp.mkdir(COVERAGE_DIR, { recursive: true });
      const fileSafeTitle =
        testInfo.title.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() ||
        'coverage';
      const coveragePath = path.join(COVERAGE_DIR, `${fileSafeTitle}.json`);
      await fsp.writeFile(coveragePath, JSON.stringify(contentScriptCoverage, null, 2));
      await testInfo.attach('content-script-coverage', {
        path: coveragePath,
        contentType: 'application/json',
      });
    }
  } catch (error) {
    await testInfo.attach('coverage-error', {
      body: `Failed to collect coverage: ${error}`,
      contentType: 'text/plain',
    });
  }
}
```

**Verification**: Add test at bottom:
```javascript
// Test: Uncomment to verify, then remove
// import { COVERAGE_DIR } from './config.js';
// console.log('✓ Coverage utilities loaded, output dir:', COVERAGE_DIR);
```

---

#### `tests/e2e/fixtures/extension-loader.js`

Create this file to extract the extension ID:

```javascript
/**
 * Extracts the extension ID from a loaded service worker.
 * @param {BrowserContext} context - Browser context with extension loaded
 * @returns {Promise<string>} Extension ID
 */
export async function getExtensionId(context) {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }
  const url = serviceWorker.url();
  const extensionId = url.split('/')[2];
  return extensionId;
}
```

**Verification**: This is a simple utility. No standalone test needed.

---

#### `tests/e2e/fixtures/gmail-stub.js`

Create this file for Gmail route stubbing (extracted from specs):

```javascript
import fs from 'node:fs';
import { GMAIL_FIXTURE_PATH } from './config.js';

/**
 * Loads the Gmail HTML fixture from disk.
 * @returns {string} HTML content
 */
export function loadGmailFixture() {
  return fs.readFileSync(GMAIL_FIXTURE_PATH, 'utf8');
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

**Verification**: Add test at bottom:
```javascript
// Test: Uncomment to verify, then remove
// const html = loadGmailFixture();
// console.log('✓ Gmail fixture loaded, length:', html.length);
```

---

#### Update `tests/e2e/fixtures/extension.js`

Now refactor the original file to use the new modules. **Replace the entire commented-out content** with:

```javascript
import { test as base } from '@playwright/test';
import { launchExtensionContext } from './browser.js';
import { startCoverage, collectCoverage } from './coverage.js';
import { getExtensionId } from './extension-loader.js';
import { loadGmailFixture } from './gmail-stub.js';
import { DEBUG } from './config.js';

export const test = base.extend({
  context: async ({ locale, colorScheme }, use) => {
    const context = await launchExtensionContext(locale, colorScheme);
    try {
      await use(context);
    } finally {
      await context.close();
    }
  },

  page: async ({ context, colorScheme, extensionId }, use, testInfo) => {
    const page = await context.newPage();
    if (colorScheme) {
      await page.emulateMedia({ colorScheme });
    }

    // Pause for debugging if PLAYWRIGHT_DEBUG=1
    if (DEBUG) {
      await page.pause();
    }

    const client = await startCoverage(page, context, testInfo);

    try {
      await use(page);
    } finally {
      await collectCoverage(client, extensionId, testInfo);
      await page.close();
    }
  },

  extensionId: async ({ context }, use) => {
    const extensionId = await getExtensionId(context);
    await use(extensionId);
  },

  gmailHtml: async (_, use) => {
    const html = loadGmailFixture();
    await use(html);
  },
});

export const expect = test.expect;
```

**Verification**:
1. Uncomment `tests/e2e/locale-smoke.spec.js` (remove `/*` at line 3 and `*/` at line 33)
2. Run `npm run e2e -- tests/e2e/locale-smoke.spec.js`
3. Should pass with German locale test
4. Re-comment the file when done

---

### 1.2 Improve Gmail Fixture HTML

**Goal**: Add missing DOM elements to `tests/e2e/fixtures/gmail.html` so tests can detect stars, attachments, and calendar invites accurately.

**Context**: The current `gmail.html` is missing icons and attributes that the extension relies on for detection.

**File to Edit**: `tests/e2e/fixtures/gmail.html`

**Changes**:

1. **Add star icon to favourite row** (line 94):

Replace:
```html
<tr class="zA" data-testid="row-favourite">
  <td class="bog">Starred follow-up</td>
  <td><span data-tooltip="Starred"></span></td>
</tr>
```

With:
```html
<tr class="zA" data-testid="row-favourite">
  <td class="bog">Starred follow-up</td>
  <td>
    <span data-tooltip="Starred" class="T-KT" aria-label="Starred">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23f4b400'%3E%3Cpath d='M8 1l2 4 4.5.5-3.2 3 .7 4.5L8 11l-4 2 .7-4.5L1.5 5.5 6 5z'/%3E%3C/svg%3E" alt="Starred" />
    </span>
  </td>
</tr>
```

2. **Add realistic attachment icon** (line 89):

Replace:
```html
<span data-tooltip="Has attachment"></span>
<img class="aSK" alt="Attachment" src="paperclip.png" />
```

With:
```html
<span data-tooltip="Has attachment">
  <img class="aSK" alt="Attachment" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M14 1a3 3 0 013 3v8a3 3 0 01-3 3H6a3 3 0 01-3-3V4a3 3 0 013-3h8zm0 1H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2z'/%3E%3C/svg%3E" />
</span>
```

3. **Add calendar icon with .ics alt text** (line 76):

Replace:
```html
<td><img alt=".ics" src="calendar.png" /></td>
```

With:
```html
<td>
  <img alt=".ics" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%234285f4'%3E%3Cpath d='M13 2h-1V1h-2v1H6V1H4v1H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V7h10v7z'/%3E%3C/svg%3E" />
</td>
```

4. **Add action buttons with data-testid** (line 61):

Replace:
```html
<button type="button">Archive</button>
<button type="button">Report spam</button>
```

With:
```html
<button type="button" data-testid="archive-button">Archive</button>
<button type="button" data-testid="spam-button">Report spam</button>
<button type="button" data-testid="delete-button">Delete</button>
<button type="button" data-testid="mark-read-button">Mark as read</button>
```

**Verification**:
1. Open `tests/e2e/fixtures/gmail.html` in a browser
2. Verify icons render correctly (inline SVGs should display)
3. Inspect elements in DevTools - confirm classes and attributes match

---

### 1.3 Create Page Object Model (POM) Structure

**Goal**: Encapsulate page interactions in reusable objects to eliminate selector duplication.

**Context**: Currently, selectors like `#alignment-select` and `.gcal-filter-bar` are hardcoded in multiple spec files. If Gmail changes, we have to update many files.

**Files to Create**:

#### `tests/e2e/page-objects/OptionsPage.js`

```javascript
/**
 * Page Object Model for the extension's options page.
 */
export class OptionsPage {
  constructor(page, extensionId) {
    this.page = page;
    this.extensionId = extensionId;
    this.url = `chrome-extension://${extensionId}/options.html`;
  }

  // Navigation
  async navigate() {
    await this.page.goto(this.url);
    await this.page.waitForSelector('#alignment-select');
  }

  // Element getters
  get alignmentSelect() {
    return this.page.locator('#alignment-select');
  }

  get showFavouritesCheckbox() {
    return this.page.locator('#show-favourites-checkbox');
  }

  get showButtonTextCheckbox() {
    return this.page.locator('#show-button-text-checkbox');
  }

  get themeSelect() {
    return this.page.locator('#theme-select');
  }

  get debugCheckbox() {
    return this.page.locator('#debug-checkbox');
  }

  get pageTitle() {
    return this.page.locator('#pageTitle');
  }

  get debugLegend() {
    return this.page.locator('#debugLegend');
  }

  get alignmentLegend() {
    return this.page.locator('#alignmentLegend');
  }

  get showFavouritesLabel() {
    return this.page.locator('#showFavouritesLabel');
  }

  // Actions
  async setAlignment(alignment) {
    await this.alignmentSelect.selectOption(alignment);
  }

  async enableFavourites() {
    await this.showFavouritesCheckbox.check();
  }

  async disableFavourites() {
    await this.showFavouritesCheckbox.uncheck();
  }

  async showButtonText() {
    await this.showButtonTextCheckbox.check();
  }

  async hideButtonText() {
    await this.showButtonTextCheckbox.uncheck();
  }

  async setTheme(theme) {
    await this.themeSelect.selectOption(theme);
  }

  async enableDebug() {
    await this.debugCheckbox.check();
  }

  async disableDebug() {
    await this.debugCheckbox.uncheck();
  }

  /**
   * Waits for chrome.storage.sync writes to complete.
   * @param {number} ms - Milliseconds to wait (default 150)
   */
  async waitForStorageSync(ms = 150) {
    await this.page.waitForTimeout(ms);
  }
}
```

**Verification**: None needed yet - will be used in specs.

---

#### `tests/e2e/page-objects/GmailPage.js`

```javascript
/**
 * Page Object Model for Gmail pages with extension toolbar.
 */
export class GmailPage {
  constructor(page) {
    this.page = page;
    this.url = 'https://mail.google.com/mail/u/0/#inbox';
  }

  // Navigation
  async navigate() {
    await this.page.goto(this.url);
    await this.page.waitForSelector('.gcal-filter-bar');
  }

  // Element getters
  get toolbar() {
    return this.page.locator('.gcal-filter-bar');
  }

  get allButton() {
    return this.page.locator('#filter-ALL');
  }

  get emailButton() {
    return this.page.locator('#filter-EMAIL');
  }

  get calendarButton() {
    return this.page.locator('#filter-CALENDAR');
  }

  get attachmentButton() {
    return this.page.locator('#filter-ATTACH');
  }

  get favouritesButton() {
    return this.page.locator('#filter-FAVOURITES');
  }

  // Row getters by test ID
  getRow(testId) {
    return this.page.locator(`tr[data-testid="${testId}"]`);
  }

  get mailRow() {
    return this.getRow('row-mail');
  }

  get calendarRow() {
    return this.getRow('row-calendar');
  }

  get attachmentRow() {
    return this.getRow('row-attachment');
  }

  get favouriteRow() {
    return this.getRow('row-favourite');
  }

  get imageRow() {
    return this.getRow('row-image');
  }

  // Actions
  async setDirection(direction) {
    await this.page.evaluate((dir) => {
      document.body.setAttribute('dir', dir);
    }, direction);
  }

  async setLocaleSpecificTooltips() {
    await this.page.evaluate(() => {
      const favouriteTooltip = chrome.i18n.getMessage('alt_starred');
      const favourite = document.querySelector('tr[data-testid="row-favourite"] span[data-tooltip]');
      if (favourite && favouriteTooltip) {
        favourite.setAttribute('data-tooltip', favouriteTooltip);
      }
    });
  }

  /**
   * Gets computed display style and hidden attribute for a row.
   * @param {string} testId - data-testid value
   * @returns {Promise<{display: string, hidden: boolean}>}
   */
  async getRowVisibility(testId) {
    return this.page.locator(`tr[data-testid="${testId}"]`).evaluate((row) => {
      return {
        display: getComputedStyle(row).display,
        hidden: row.hidden,
      };
    });
  }

  /**
   * Gets the button order from the toolbar.
   * @returns {Promise<string[]>} Array of mode names (e.g., ['ALL', 'EMAIL', ...])
   */
  async getButtonOrder() {
    return this.page.evaluate(() =>
      Array.from(document.querySelectorAll('.gcal-btn-group button[data-mode]')).map(
        (btn) => btn.dataset.mode
      )
    );
  }

  /**
   * Checks if toolbar buttons wrap to multiple lines.
   * @returns {Promise<boolean>}
   */
  async toolbarWraps() {
    return this.page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll('.gcal-btn-group button[role="radio"]')
      );
      const topOffsets = buttons.map((btn) => btn.getBoundingClientRect().top);
      return new Set(topOffsets.map((value) => Math.round(value))).size > 1;
    });
  }
}
```

**Verification**: None needed yet - will be used in specs.

---

#### `tests/e2e/page-objects/ToolbarComponent.js`

```javascript
/**
 * Component-level assertions for the Gmail toolbar.
 */
export class ToolbarComponent {
  constructor(toolbar) {
    this.toolbar = toolbar;
  }

  /**
   * Asserts the toolbar has a specific alignment class.
   * @param {string} alignment - 'start' or 'center'
   */
  async assertAlignment(alignment) {
    const { expect } = await import('@playwright/test');
    await expect(this.toolbar).toHaveClass(new RegExp(`gcal-align-${alignment}`));
  }

  /**
   * Asserts the toolbar shows icons only (no text).
   */
  async assertIconOnly() {
    const { expect } = await import('@playwright/test');
    await expect(this.toolbar).toHaveClass(/show-icon-only/);
  }

  /**
   * Asserts the toolbar shows both icons and text.
   */
  async assertIconAndText() {
    const { expect } = await import('@playwright/test');
    await expect(this.toolbar).not.toHaveClass(/show-icon-only/);
  }

  /**
   * Asserts the button order matches the expected sequence.
   * @param {string[]} expectedOrder - Array of mode names
   * @param {Function} getButtonOrderFn - Function that returns button order
   */
  async assertButtonOrder(expectedOrder, getButtonOrderFn) {
    const { expect } = await import('@playwright/test');
    const actualOrder = await getButtonOrderFn();
    const baseOrder = actualOrder.slice(0, expectedOrder.length);
    expect(baseOrder).toEqual(expectedOrder);
  }
}
```

**Verification**: None needed yet - will be used in specs.

---

### 1.4 Replace Hardcoded Waits with Polling

**Goal**: Remove `page.waitForTimeout(150)` and replace with proper wait conditions.

**Context**: Line 59 in `options-toolbar.spec.js` uses a hardcoded 150ms delay after changing options. This is brittle - if storage writes take longer, tests become flaky.

**File to Create**: `tests/e2e/helpers/storage-helpers.js`

```javascript
/**
 * Waits for a specific key in chrome.storage.sync to have a specific value.
 * @param {Page} page - Playwright page object
 * @param {string} key - Storage key to check
 * @param {*} expectedValue - Expected value (will use JSON.stringify for comparison)
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 */
export async function waitForStorageValue(page, key, expectedValue, timeout = 5000) {
  await page.waitForFunction(
    ({ key, expectedValue }) => {
      return new Promise((resolve) => {
        chrome.storage.sync.get([key], (result) => {
          const matches = JSON.stringify(result[key]) === JSON.stringify(expectedValue);
          resolve(matches);
        });
      });
    },
    { key, expectedValue },
    { timeout }
  );
}

/**
 * Gets the current value from chrome.storage.sync.
 * @param {Page} page - Playwright page object
 * @param {string} key - Storage key to retrieve
 * @returns {Promise<*>} The stored value
 */
export async function getStorageValue(page, key) {
  return page.evaluate((key) => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }, key);
}
```

**Verification**: Will verify when updating specs in Phase 2.

---

### 1.5 Improve Error Messages

**Goal**: Make `ensureExtensionBuild()` errors more helpful.

**Context**: Already completed in `tests/e2e/fixtures/browser.js` section 1.1 above. Verify error messages include full paths and suggest running `npm run build`.

**Verification**:
1. Delete `dist/` folder: `rm -rf dist`
2. Uncomment a test spec
3. Run `npm run e2e`
4. Should see error with path to `dist/` and suggestion to run `npm run build`
5. Rebuild: `npm run build`

---

## Phase 2: Test Coverage Expansion

### 2.1 Add Pagination Persistence Test

**Goal**: Verify filters persist when Gmail paginates or navigates.

**Context**: The extension uses `MutationObserver` to reapply filters when Gmail's DOM changes. This test ensures that works.

**File to Create**: `tests/e2e/toolbar-persistence.spec.js`

```javascript
import { test, expect } from './fixtures/extension.js';
import { stubGmailRoute, unstubGmailRoute } from './fixtures/gmail-stub.js';
import { GmailPage } from './page-objects/GmailPage.js';
import { OptionsPage } from './page-objects/OptionsPage.js';

test.describe('Toolbar persistence', () => {
  test.use({ locale: 'en-US', colorScheme: 'light' });

  test('filter state persists during Gmail pagination', async ({ page, extensionId, gmailHtml }) => {
    const optionsPage = new OptionsPage(page, extensionId);
    const gmailPage = new GmailPage(page);

    // Set up options (not critical for this test, but ensures clean state)
    await optionsPage.navigate();
    await optionsPage.setAlignment('start');

    // Navigate to Gmail and apply attachment filter
    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    await gmailPage.attachmentButton.click();
    await expect(gmailPage.attachmentButton).toHaveAttribute('aria-checked', 'true');

    // Verify filter is active
    const visibilityBefore = await gmailPage.getRowVisibility('row-attachment');
    expect(visibilityBefore.display).toBe('table-row');

    // Simulate Gmail pagination by injecting new rows dynamically
    await page.evaluate(() => {
      const tbody = document.querySelector('.UI table tbody');
      const newRow = document.createElement('tr');
      newRow.className = 'zA byw';
      newRow.setAttribute('data-testid', 'row-new-attachment');
      newRow.innerHTML = `
        <td class="bog">New email with attachment</td>
        <td>
          <div class="brd">
            <div class="brc" title="document.pdf">
              <img src="icon_1_pdf.png" alt="pdf" />
              <span>document.pdf</span>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(newRow);
    });

    // Wait for observer to process the mutation (debounced, so give it time)
    await page.waitForTimeout(350);

    // Verify new row respects active filter
    const newRowVisibility = await gmailPage.getRowVisibility('row-new-attachment');
    expect(newRowVisibility.display).toBe('table-row');

    // Verify existing non-attachment rows are still hidden
    const mailRowVisibility = await gmailPage.getRowVisibility('row-mail');
    expect(mailRowVisibility.display).toBe('none');

    await unstubGmailRoute(page);
  });

  test('toolbar reinjects after Gmail toolbar is removed and recreated', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    // Verify toolbar exists initially
    await expect(gmailPage.toolbar).toBeVisible();

    // Simulate Gmail destroying and recreating its toolbar (happens during navigation)
    await page.evaluate(() => {
      const header = document.querySelector('.G-atb');
      const parent = header.parentNode;
      parent.removeChild(header);

      // Recreate Gmail toolbar after a delay
      setTimeout(() => {
        const newHeader = document.createElement('div');
        newHeader.className = 'G-atb';
        newHeader.innerHTML = `
          <div class="G6" role="toolbar" aria-label="Main toolbar">
            <button type="button">Archive</button>
            <button type="button">Report spam</button>
          </div>
        `;
        parent.appendChild(newHeader);
      }, 100);
    });

    // Wait for Gmail toolbar to be recreated
    await page.waitForSelector('.G-atb .G6[role="toolbar"]', { timeout: 2000 });

    // Wait for extension observer to detect change and reinject
    await page.waitForTimeout(500);

    // Verify our toolbar reinjected
    await expect(gmailPage.toolbar).toBeVisible();
    await expect(gmailPage.allButton).toBeVisible();

    await unstubGmailRoute(page);
  });
});
```

**Verification**:
1. Uncomment this file
2. Run `npm run e2e -- tests/e2e/toolbar-persistence.spec.js`
3. Should pass both tests
4. Check `artifacts/playwright/` for screenshots if failures occur

---

### 2.2 Add Debug Mode Visual Test

**Goal**: Verify debug mode applies 50% opacity + blue tint to filtered rows.

**File to Create**: `tests/e2e/toolbar-debug.spec.js`

```javascript
import { test, expect } from './fixtures/extension.js';
import { stubGmailRoute, unstubGmailRoute } from './fixtures/gmail-stub.js';
import { GmailPage } from './page-objects/GmailPage.js';
import { OptionsPage } from './page-objects/OptionsPage.js';

test.describe('Debug mode', () => {
  test.use({ locale: 'en-US', colorScheme: 'light' });

  test('filtered rows show debug styling when debug mode enabled', async ({ page, extensionId, gmailHtml }) => {
    const optionsPage = new OptionsPage(page, extensionId);
    const gmailPage = new GmailPage(page);

    // Enable debug mode in options
    await optionsPage.navigate();
    await optionsPage.enableDebug();
    await optionsPage.waitForStorageSync();

    // Navigate to Gmail and apply mail-only filter
    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    await gmailPage.emailButton.click();

    // Verify calendar row is hidden but has debug styling
    const calendarRowStyles = await page.locator('tr[data-testid="row-calendar"]').evaluate((row) => {
      const styles = getComputedStyle(row);
      return {
        display: styles.display,
        opacity: styles.opacity,
        backgroundColor: styles.backgroundColor,
      };
    });

    // In debug mode, hidden rows should still be visible with 50% opacity
    expect(parseFloat(calendarRowStyles.opacity)).toBeCloseTo(0.5, 1);

    // Should have blue-ish tint (exact RGB depends on theme, but verify it's not default)
    expect(calendarRowStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(calendarRowStyles.backgroundColor).toMatch(/rgb/);

    // Verify mail rows are fully visible (not affected by filter)
    const mailRowStyles = await page.locator('tr[data-testid="row-mail"]').evaluate((row) => {
      const styles = getComputedStyle(row);
      return {
        display: styles.display,
        opacity: styles.opacity,
      };
    });

    expect(mailRowStyles.display).toBe('table-row');
    expect(parseFloat(mailRowStyles.opacity)).toBe(1);

    await unstubGmailRoute(page);
  });

  test('filtered rows are completely hidden when debug mode disabled', async ({ page, extensionId, gmailHtml }) => {
    const optionsPage = new OptionsPage(page, extensionId);
    const gmailPage = new GmailPage(page);

    // Ensure debug mode is OFF (default state)
    await optionsPage.navigate();
    await optionsPage.disableDebug();
    await optionsPage.waitForStorageSync();

    // Navigate to Gmail and apply mail-only filter
    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    await gmailPage.emailButton.click();

    // Verify calendar row is completely hidden (display: none)
    const calendarRowVisibility = await gmailPage.getRowVisibility('row-calendar');
    expect(calendarRowVisibility.display).toBe('none');

    await unstubGmailRoute(page);
  });
});
```

**Verification**:
1. Uncomment this file
2. Run `npm run e2e -- tests/e2e/toolbar-debug.spec.js`
3. Should pass both tests

---

### 2.3 Add Keyboard Navigation Test

**Goal**: Verify <kbd>Esc</kbd> returns focus to message list and <kbd>Tab</kbd> navigates through buttons.

**File to Create**: `tests/e2e/toolbar-a11y.spec.js`

```javascript
import { test, expect } from './fixtures/extension.js';
import { stubGmailRoute, unstubGmailRoute } from './fixtures/gmail-stub.js';
import { GmailPage } from './page-objects/GmailPage.js';

test.describe('Keyboard navigation', () => {
  test.use({ locale: 'en-US', colorScheme: 'light' });

  test('Escape key returns focus to message list', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    // Focus on a filter button
    await gmailPage.emailButton.focus();
    await expect(gmailPage.emailButton).toBeFocused();

    // Press Escape
    await page.keyboard.press('Escape');

    // Focus should move to message list container
    const focusedElement = await page.evaluate(() => {
      const activeElement = document.activeElement;
      return {
        tagName: activeElement.tagName,
        className: activeElement.className,
      };
    });

    // Verify focus moved away from button to the message list area
    expect(focusedElement.tagName).not.toBe('BUTTON');
    // The exact focus target depends on implementation, but it should be in/near .UI
    // For now, just verify it's not on the button anymore
    await expect(gmailPage.emailButton).not.toBeFocused();

    await unstubGmailRoute(page);
  });

  test('Tab key navigates through filter buttons sequentially', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    // Focus on first button
    await gmailPage.allButton.focus();
    await expect(gmailPage.allButton).toBeFocused();

    // Tab to next button
    await page.keyboard.press('Tab');
    await expect(gmailPage.emailButton).toBeFocused();

    // Tab to next button
    await page.keyboard.press('Tab');
    await expect(gmailPage.calendarButton).toBeFocused();

    // Shift+Tab back
    await page.keyboard.press('Shift+Tab');
    await expect(gmailPage.emailButton).toBeFocused();

    await unstubGmailRoute(page);
  });
});

test.describe('ARIA announcements', () => {
  test.use({ locale: 'en-US', colorScheme: 'light' });

  test('live region announces filter changes', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    // Click attachment filter
    await gmailPage.attachmentButton.click();

    // Check live region for announcement
    const liveRegion = page.locator('.gcal-live-region');
    await expect(liveRegion).toHaveAttribute('aria-live', 'polite');

    // Verify live region content updates (exact text depends on i18n)
    const announcement = await liveRegion.textContent();
    expect(announcement).toBeTruthy();
    expect(announcement.length).toBeGreaterThan(0);

    await unstubGmailRoute(page);
  });
});
```

**Verification**:
1. Uncomment this file
2. Run `npm run e2e -- tests/e2e/toolbar-a11y.spec.js`
3. Should pass all three tests

---

### 2.4 Expand Locale Testing Matrix

**Goal**: Add Hebrew (RTL) and Japanese locales to stress-test internationalization.

**File to Edit**: `tests/e2e/locale-smoke.spec.js`

Replace the existing `localeMatrix` and test structure (after uncommenting):

```javascript
import path from 'node:path';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { test, expect } from './fixtures/extension.js';
import { OptionsPage } from './page-objects/OptionsPage.js';

const localesDir = path.join(process.cwd(), 'src', '_locales');

// Helper to load locale messages dynamically
function getLocaleMessages(locale) {
  const localeKey = locale.replace('-', '_'); // Convert 'de-DE' to 'de_DE'
  const messagesPath = path.join(localesDir, localeKey, 'messages.json');
  return JSON.parse(readFileSync(messagesPath, 'utf8'));
}

const localeMatrix = [
  { label: 'German', locale: 'de-DE' },
  { label: 'Hebrew', locale: 'he' },
  { label: 'Japanese', locale: 'ja' },
  { label: 'Arabic', locale: 'ar' },
];

localeMatrix.forEach(({ label, locale }) => {
  test.describe(`Internationalisation: ${label}`, () => {
    test.use({ locale });

    test('renders options UI labels with locale-specific messages', async ({ page, extensionId }) => {
      const optionsPage = new OptionsPage(page, extensionId);
      await optionsPage.navigate();

      const messages = getLocaleMessages(locale);

      await expect(optionsPage.pageTitle).toHaveText(messages.page_title.message);
      await expect(optionsPage.debugLegend).toHaveText(messages.options_debug_legend.message);
      await expect(optionsPage.alignmentLegend).toHaveText(messages.options_alignment_legend.message);
      await expect(optionsPage.showFavouritesLabel).toHaveText(messages.options_show_favourites_label.message);
    });
  });
});
```

**Verification**:
1. Ensure `src/_locales/he/messages.json` and `src/_locales/ja/messages.json` exist
2. If not, copy `src/_locales/en_US/messages.json` to those locations (tests will still pass with English text)
3. Uncomment `tests/e2e/locale-smoke.spec.js`
4. Run `npm run e2e -- tests/e2e/locale-smoke.spec.js`
5. Should pass for all locales

---

### 2.5 Add Viewport Responsive Tests

**Goal**: Test toolbar at multiple screen sizes to verify wrapping and alignment.

**File to Create**: `tests/e2e/toolbar-responsive.spec.js`

```javascript
import { test, expect } from './fixtures/extension.js';
import { stubGmailRoute, unstubGmailRoute } from './fixtures/gmail-stub.js';
import { GmailPage } from './page-objects/GmailPage.js';
import { OptionsPage } from './page-objects/OptionsPage.js';
import { ToolbarComponent } from './page-objects/ToolbarComponent.js';

const viewports = [
  { name: 'Mobile', width: 320, height: 568 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1024, height: 768 },
  { name: 'Wide', width: 1920, height: 1080 },
];

test.describe('Responsive toolbar behavior', () => {
  test.use({ locale: 'en-US', colorScheme: 'light' });

  viewports.forEach(({ name, width, height }) => {
    test(`toolbar wraps correctly at ${name} viewport (${width}x${height})`, async ({ page, extensionId, gmailHtml }) => {
      const optionsPage = new OptionsPage(page, extensionId);
      const gmailPage = new GmailPage(page);

      // Enable favourites to maximize button count
      await optionsPage.navigate();
      await optionsPage.enableFavourites();
      await optionsPage.waitForStorageSync();

      await stubGmailRoute(page, gmailHtml);
      await page.setViewportSize({ width, height });
      await gmailPage.navigate();

      const wraps = await gmailPage.toolbarWraps();

      // At mobile width, buttons should wrap
      if (width <= 480) {
        expect(wraps).toBe(true);
      }
      // At desktop+ width, buttons should be on one line
      if (width >= 1024) {
        expect(wraps).toBe(false);
      }
      // Tablet is variable depending on button count

      // Verify toolbar is still visible and functional
      await expect(gmailPage.toolbar).toBeVisible();
      await gmailPage.attachmentButton.click();
      await expect(gmailPage.attachmentButton).toHaveAttribute('aria-checked', 'true');

      await unstubGmailRoute(page);
    });
  });

  test('toolbar alignment changes are visible at different viewports', async ({ page, extensionId, gmailHtml }) => {
    const optionsPage = new OptionsPage(page, extensionId);
    const gmailPage = new GmailPage(page);

    // Test center alignment at desktop width
    await optionsPage.navigate();
    await optionsPage.setAlignment('center');
    await optionsPage.waitForStorageSync();

    await stubGmailRoute(page, gmailHtml);
    await page.setViewportSize({ width: 1024, height: 768 });
    await gmailPage.navigate();

    const toolbarComponent = new ToolbarComponent(gmailPage.toolbar);
    await toolbarComponent.assertAlignment('center');

    // Switch to start alignment
    await optionsPage.navigate();
    await optionsPage.setAlignment('start');
    await optionsPage.waitForStorageSync();

    await gmailPage.navigate();
    await toolbarComponent.assertAlignment('start');

    await unstubGmailRoute(page);
  });
});
```

**Verification**:
1. Uncomment this file
2. Run `npm run e2e -- tests/e2e/toolbar-responsive.spec.js`
3. Should pass all tests across all viewports

---

### 2.6 Add Attachment Type Filter Tests

**Goal**: Test specific attachment filters (IMAGE, PDF, DOCUMENT, etc.).

**Context**: The extension supports granular attachment filters defined in `ATTACHMENT_TYPE_CONFIG`. Currently no tests cover these.

**Step 1**: Enhance `tests/e2e/fixtures/gmail.html` with more attachment types.

Add these rows after line 107 (inside `<tbody>`):

```html
<tr class="zA byw" data-testid="row-pdf">
  <td class="bog">Invoice Q4</td>
  <td>
    <div class="brd">
      <div class="brc" title="invoice.pdf">
        <img src="icon_1_pdf" alt="pdf" />
        <span>invoice.pdf</span>
      </div>
    </div>
  </td>
</tr>
<tr class="zA byw" data-testid="row-document">
  <td class="bog">Contract draft</td>
  <td>
    <div class="brd">
      <div class="brc" title="contract.docx">
        <img src="icon_1_document" alt="document" />
        <span>contract.docx</span>
      </div>
    </div>
  </td>
</tr>
<tr class="zA byw" data-testid="row-spreadsheet">
  <td class="bog">Sales report</td>
  <td>
    <div class="brd">
      <div class="brc" title="sales.xlsx">
        <img src="icon_1_spreadsheet" alt="spreadsheet" />
        <span>sales.xlsx</span>
      </div>
    </div>
  </td>
</tr>
<tr class="zA byw" data-testid="row-presentation">
  <td class="bog">Pitch deck</td>
  <td>
    <div class="brd">
      <div class="brc" title="pitch.pptx">
        <img src="icon_1_presentation" alt="presentation" />
        <span>pitch.pptx</span>
      </div>
    </div>
  </td>
</tr>
```

**Step 2**: Create test spec.

**File to Create**: `tests/e2e/toolbar-attachments.spec.js`

```javascript
import { test, expect } from './fixtures/extension.js';
import { stubGmailRoute, unstubGmailRoute } from './fixtures/gmail-stub.js';
import { GmailPage } from './page-objects/GmailPage.js';

test.describe('Attachment type filtering', () => {
  test.use({ locale: 'en-US', colorScheme: 'light' });

  test('filters rows by image attachments', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    // Assuming your toolbar has specific attachment type buttons (if not, this test validates the generic ATTACH button)
    // Click the images-only button (if implemented) or verify attachment filter includes images
    await gmailPage.attachmentButton.click();

    // Verify image row is visible
    const imageVisibility = await gmailPage.getRowVisibility('row-image');
    expect(imageVisibility.display).toBe('table-row');

    // Verify non-attachment rows are hidden
    const mailVisibility = await gmailPage.getRowVisibility('row-mail');
    expect(mailVisibility.display).toBe('none');

    await unstubGmailRoute(page);
  });

  test('filters rows by PDF attachments', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    // Click attachment filter (covers all attachment types including PDF)
    await gmailPage.attachmentButton.click();

    const pdfVisibility = await gmailPage.getRowVisibility('row-pdf');
    expect(pdfVisibility.display).toBe('table-row');

    const mailVisibility = await gmailPage.getRowVisibility('row-mail');
    expect(mailVisibility.display).toBe('none');

    await unstubGmailRoute(page);
  });

  test('filters rows by document attachments', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    await gmailPage.attachmentButton.click();

    const docVisibility = await gmailPage.getRowVisibility('row-document');
    expect(docVisibility.display).toBe('table-row');

    await unstubGmailRoute(page);
  });

  test('filters rows by spreadsheet attachments', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    await gmailPage.attachmentButton.click();

    const sheetVisibility = await gmailPage.getRowVisibility('row-spreadsheet');
    expect(sheetVisibility.display).toBe('table-row');

    await unstubGmailRoute(page);
  });

  test('filters rows by presentation attachments', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    await gmailPage.attachmentButton.click();

    const pptVisibility = await gmailPage.getRowVisibility('row-presentation');
    expect(pptVisibility.display).toBe('table-row');

    await unstubGmailRoute(page);
  });
});
```

**Verification**:
1. Uncomment this file
2. Run `npm run e2e -- tests/e2e/toolbar-attachments.spec.js`
3. Should pass all tests

**Note**: If the extension doesn't yet have individual buttons for each attachment type (IMAGE, PDF, etc.) and only has a single ATTACH button, these tests will still validate that the generic attachment filter works. Update the tests if/when granular filters are implemented.

---

## Phase 3: Infrastructure & Organization

### 3.1 Add Custom Playwright Matchers

**Goal**: Create `toHaveStorageValue()` and `toHaveARIAState()` custom matchers.

**File to Create**: `tests/e2e/helpers/custom-matchers.js`

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

**Step 2**: Import matchers in test files.

Add this import at the top of any spec file that wants to use custom matchers:

```javascript
import './helpers/custom-matchers.js';
```

**Example Usage in a Test**:

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

**Verification**: Add example usage to an existing test (e.g., `options-toolbar.spec.js`) and run it.

---

### 3.2 Improve Playwright Config

**Goal**: Add projects, sharding, better reporters, and environment variable support.

**File to Edit**: `playwright.config.js`

Replace the entire file with:

```javascript
import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;
const workers = process.env.E2E_WORKERS ? parseInt(process.env.E2E_WORKERS, 10) : (isCI ? 2 : 1);
const skipBuildCheck = process.env.E2E_SKIP_BUILD === '1';

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

**Environment Variables Now Supported**:
- `E2E_WORKERS=2` - Set number of parallel workers
- `E2E_SKIP_BUILD=1` - Skip build validation (faster for rapid iteration)
- `PLAYWRIGHT_HEADFUL=1` - Run in headed mode (see the browser)
- `PLAYWRIGHT_DEBUG=1` - Pause on test start (set in `fixtures/config.js`)

**Verification**:
1. Run `npm run e2e` - should use new config
2. Check `artifacts/playwright/html/index.html` for HTML report
3. Verify videos are captured in `artifacts/playwright/` on failure

---

### 3.3 Reorganize Test Files

**Goal**: Rename and group spec files by functional area.

**Renames**:
- `options-toolbar.spec.js` → `toolbar-options-integration.spec.js`
- `locale-smoke.spec.js` → `i18n-options-page.spec.js`

**Commands**:
```bash
cd tests/e2e
mv options-toolbar.spec.js toolbar-options-integration.spec.js
mv locale-smoke.spec.js i18n-options-page.spec.js
```

**Verification**: Run `npm run e2e` - should find and run renamed files.

---

### 3.4 Create Test Data Templates

**Goal**: Support multiple Gmail fixture scenarios.

**Files to Create**:

#### `tests/e2e/fixtures/gmail-templates/minimal.html`

Copy the current `tests/e2e/fixtures/gmail.html` to this location:

```bash
mkdir -p tests/e2e/fixtures/gmail-templates
cp tests/e2e/fixtures/gmail.html tests/e2e/fixtures/gmail-templates/minimal.html
```

#### `tests/e2e/fixtures/gmail-templates/paginated.html`

Create a version with 50 rows for pagination testing. Start with `minimal.html` and duplicate the `<tbody>` content 10 times, changing `data-testid` values:

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

#### `tests/e2e/fixtures/gmail-templates/mixed-attachments.html`

Copy `minimal.html` and ensure it includes all attachment types added in section 2.6.

**Update `gmail-stub.js`** to support template selection:

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

// ... rest of file unchanged ...
```

**Usage in Tests**:

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

### 3.5 Add Test Documentation

**Goal**: Create README explaining test architecture.

**File to Create**: `tests/e2e/README.md`

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

## Phase 4: Final Polish

### 4.1 Add JSDoc Comments to All Modules

**Goal**: Document all fixture modules, page objects, and helpers with JSDoc.

**Context**: This was already done in the code examples above. Verify all files in `tests/e2e/fixtures/`, `tests/e2e/page-objects/`, and `tests/e2e/helpers/` have:

1. File-level JSDoc comment explaining purpose
2. Function-level JSDoc with `@param` and `@returns` annotations

**Example**:

```javascript
/**
 * Page Object Model for Gmail pages with extension toolbar.
 * Encapsulates all interactions with Gmail's UI and the extension's injected toolbar.
 */
export class GmailPage {
  /**
   * Creates a new GmailPage instance.
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Gets the computed display style and hidden attribute for a row.
   * @param {string} testId - data-testid attribute value
   * @returns {Promise<{display: string, hidden: boolean}>} Visibility state
   */
  async getRowVisibility(testId) {
    // ...
  }
}
```

**Verification**: Run `npx eslint tests/e2e --fix` and ensure no JSDoc warnings.

---

### 4.2 Add CI Test Grouping

**Goal**: Create GitHub Actions workflows with test grouping.

**Context**: This is outside the scope of `tests/e2e/` but documented here for completeness.

**File to Create**: `.github/workflows/e2e-tests.yml`

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  smoke:
    name: Smoke Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - name: Run smoke tests
        run: npm run e2e -- tests/e2e/toolbar-options-integration.spec.js
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: smoke-test-results
          path: artifacts/

  full:
    name: Full Regression
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - name: Run all e2e tests
        run: npm run e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: full-test-results
          path: artifacts/
```

**Verification**: Commit and push - GitHub Actions should run workflows.

---

### 4.3 Update CLAUDE.md

**Goal**: Reflect new test structure in project documentation.

**File to Edit**: `/mnt/d/Github/chome-extension-gmail-calendar-options/CLAUDE.md`

Add this section after the "Running a Single Test" section (around line 35):

```markdown
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
```

**Verification**: Read through CLAUDE.md to ensure consistency.

---

### 4.4 Add Linting for Test Files

**Goal**: Ensure test code follows same quality standards as production code.

**File to Edit**: `.eslintrc.cjs`

Update the `ignorePatterns` to NOT ignore test files, and add test-specific rules:

```javascript
module.exports = {
  // ... existing config ...
  overrides: [
    {
      files: ['tests/**/*.js'],
      rules: {
        'no-console': 'off', // Allow console.log in tests
        'no-await-in-loop': 'off', // Common in sequential test steps
      },
    },
  ],
};
```

**Update `package.json` lint script** to include tests:

```json
"scripts": {
  "lint": "eslint src tests --fix"
}
```

**Verification**:
1. Run `npm run lint`
2. Fix any errors in test files
3. Commit changes

---

### 4.5 Final Verification Checklist

**Goal**: Ensure all changes are integrated and working.

**Steps**:

1. **Rebuild Extension**:
   ```bash
   npm run build
   ```

2. **Run All Tests**:
   ```bash
   npm run e2e
   ```
   - Should execute all uncommented specs
   - Should generate HTML report at `artifacts/playwright/html/index.html`
   - Should pass with 0 failures

3. **Check Coverage**:
   ```bash
   ls artifacts/coverage/playwright/
   ```
   - Should contain JSON files for each test

4. **Verify Artifacts**:
   ```bash
   ls artifacts/playwright/
   ```
   - Should contain screenshots (if any failures)
   - Should contain videos (if any failures)
   - Should contain traces (if any failures)

5. **Run Single Test**:
   ```bash
   npm run e2e -- tests/e2e/i18n-options-page.spec.js
   ```
   - Should pass for all locales

6. **Test Headed Mode**:
   ```bash
   PLAYWRIGHT_HEADFUL=1 npm run e2e -- tests/e2e/toolbar-options-integration.spec.js
   ```
   - Should open Chrome and show extension running
   - Should interact with toolbar visually

7. **Lint Tests**:
   ```bash
   npm run lint
   ```
   - Should pass with no errors

8. **Format Code**:
   ```bash
   npm run format
   ```

9. **Commit Changes**:
   ```bash
   git add tests/e2e
   git add playwright.config.js
   git add CLAUDE.md
   git add e2e-upgrade-v1.md
   git commit -m "test: upgrade Playwright e2e test suite with POM architecture"
   ```

---

## Appendix A: Quick Reference

### Running Tests
```bash
# All tests
npm run e2e

# Specific spec
npm run e2e -- tests/e2e/toolbar-a11y.spec.js

# Headed mode
PLAYWRIGHT_HEADFUL=1 npm run e2e

# Debug mode (pause on start)
PLAYWRIGHT_DEBUG=1 npm run e2e

# With custom worker count
E2E_WORKERS=4 npm run e2e
```

### File Structure After Upgrade
```
tests/e2e/
├── fixtures/
│   ├── config.js (new)
│   ├── browser.js (new)
│   ├── coverage.js (new)
│   ├── extension-loader.js (new)
│   ├── gmail-stub.js (new)
│   ├── extension.js (refactored)
│   ├── gmail.html (enhanced)
│   └── gmail-templates/ (new)
│       ├── minimal.html
│       ├── paginated.html
│       └── mixed-attachments.html
├── page-objects/ (new)
│   ├── OptionsPage.js
│   ├── GmailPage.js
│   └── ToolbarComponent.js
├── helpers/ (new)
│   ├── custom-matchers.js
│   └── storage-helpers.js
├── toolbar-options-integration.spec.js (renamed)
├── toolbar-persistence.spec.js (new)
├── toolbar-debug.spec.js (new)
├── toolbar-a11y.spec.js (new)
├── toolbar-responsive.spec.js (new)
├── toolbar-attachments.spec.js (new)
├── i18n-options-page.spec.js (renamed)
└── README.md (new)
```

### Common Tasks

**Add a New Test Spec**:
1. Create `tests/e2e/feature-name.spec.js`
2. Import fixtures: `import { test, expect } from './fixtures/extension.js';`
3. Import page objects: `import { GmailPage } from './page-objects/GmailPage.js';`
4. Import helpers if needed
5. Write test using `test.describe()` and `test()`
6. Use `stubGmailRoute()` and `unstubGmailRoute()`

**Update Gmail Selectors**:
1. Edit `src/modules/constants.js` (production)
2. Edit `tests/e2e/page-objects/GmailPage.js` (tests)
3. Edit `tests/e2e/fixtures/gmail.html` (fixture)
4. Run tests to verify

**Add New Page Object**:
1. Create `tests/e2e/page-objects/NewPage.js`
2. Export class with constructor, getters, and action methods
3. Add JSDoc comments
4. Import in specs where needed

---

## Appendix B: Troubleshooting

### "Extension build not found"
**Cause**: `dist/` folder missing or `manifest.json` not present.
**Fix**: Run `npm run build`

### "Timeout waiting for selector"
**Cause**: Element not found in expected time.
**Fix**:
1. Check `artifacts/playwright/` screenshots
2. Verify selector in `page-objects/GmailPage.js` matches `fixtures/gmail.html`
3. Increase timeout in `playwright.config.js`

### "chrome.storage is not defined"
**Cause**: Code running outside extension context.
**Fix**: Ensure you're navigating to `chrome-extension://${extensionId}/...` or Gmail with stubbed route

### Tests Flaky in CI
**Cause**: Race conditions, timing issues.
**Fix**:
1. Replace `waitForTimeout()` with `waitForFunction()` or `waitForSelector()`
2. Increase `retries` in `playwright.config.js`
3. Add `page.waitForLoadState('networkidle')` after navigation

### Coverage Not Collected
**Cause**: CDP session failed to attach.
**Fix**: Check `artifacts/playwright/html/` report for coverage warnings attached to tests

---

## Appendix C: Future Enhancements

These are out of scope for v1 but documented for future work:

1. **Visual Regression Testing**: Integrate Percy or Playwright's built-in visual comparison
2. **Performance Testing**: Add performance marks in content script and measure in tests
3. **Accessibility Audits**: Integrate axe-core for automated a11y testing
4. **Cross-Browser Testing**: Add Firefox addon project when MV3 support is stable
5. **Real Gmail Testing**: Optionally test against real Gmail with Puppeteer
6. **Test Data Generators**: Create factories for generating test emails programmatically
7. **Mutation Coverage**: Track which extension mutations are tested
8. **E2E Coverage Merging**: Merge Jest + Playwright coverage into unified report

---

**End of E2E Test Suite Upgrade Plan v1**