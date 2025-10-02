# E2E Test Suite Upgrade - Phase 1: Foundation

**Status**: Not Started
**Estimated Effort**: 1-2 days
**Prerequisites**: Chrome-capable environment (not WSL), `npm ci`, `npm run build`, `npx playwright install`

---

## Overview

Phase 1 establishes the architectural foundation for the upgraded test suite. You'll refactor the monolithic fixture file into focused modules, improve the Gmail fixture HTML, create Page Object Models, and replace brittle timeout-based waits with proper polling.

**All changes are confined to `tests/e2e/` - no production code is modified.**

---

## 1.1 Split Monolithic Fixture into Modules

**Goal**: Break `tests/e2e/fixtures/extension.js` into smaller, focused files.

**Context**: Currently all fixture logic (browser launch, coverage, extension loading, Gmail stubbing) is in one 145-line file. This makes it hard to maintain.

### Create `tests/e2e/fixtures/config.js`

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

### Create `tests/e2e/fixtures/browser.js`

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

---

### Create `tests/e2e/fixtures/coverage.js`

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

---

### Create `tests/e2e/fixtures/extension-loader.js`

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

---

### Create `tests/e2e/fixtures/gmail-stub.js`

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

---

### Update `tests/e2e/fixtures/extension.js`

Replace the entire commented-out content with:

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

## 1.2 Improve Gmail Fixture HTML

**Goal**: Add missing DOM elements to `tests/e2e/fixtures/gmail.html` so tests can detect stars, attachments, and calendar invites accurately.

**File to Edit**: `tests/e2e/fixtures/gmail.html`

### Change 1: Add star icon to favourite row (line 94)

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

### Change 2: Add realistic attachment icon (line 89)

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

### Change 3: Add calendar icon with .ics alt text (line 76)

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

### Change 4: Add action buttons with data-testid (line 61)

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

## 1.3 Create Page Object Model (POM) Structure

**Goal**: Encapsulate page interactions in reusable objects to eliminate selector duplication.

### Create `tests/e2e/page-objects/OptionsPage.js`

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

---

### Create `tests/e2e/page-objects/GmailPage.js`

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

---

### Create `tests/e2e/page-objects/ToolbarComponent.js`

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

---

## 1.4 Replace Hardcoded Waits with Polling

**Goal**: Remove `page.waitForTimeout(150)` and replace with proper wait conditions.

### Create `tests/e2e/helpers/storage-helpers.js`

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

**Note**: This will be used in Phase 2 when creating new test specs.

---

## 1.5 Improve Error Messages

**Goal**: Make `ensureExtensionBuild()` errors more helpful.

**Context**: Already completed in section 1.1 (`tests/e2e/fixtures/browser.js`). Error messages now include full paths and suggest running `npm run build`.

**Verification**:
1. Delete `dist/` folder: `rm -rf dist`
2. Uncomment a test spec
3. Run `npm run e2e`
4. Should see error with path to `dist/` and suggestion to run `npm run build`
5. Rebuild: `npm run build`

---

## Phase 1 Completion Checklist

- [ ] All fixture modules created (`config.js`, `browser.js`, `coverage.js`, `extension-loader.js`, `gmail-stub.js`)
- [ ] `extension.js` refactored to use new modules
- [ ] Gmail fixture HTML enhanced with icons and data-testid attributes
- [ ] Page Object Models created (`OptionsPage.js`, `GmailPage.js`, `ToolbarComponent.js`)
- [ ] Storage helpers created (`storage-helpers.js`)
- [ ] Verification test passed (locale-smoke.spec.js)

**Next Step**: Proceed to [Phase 2: Test Coverage Expansion](e2e-upgrade-v1-phase-2.md)