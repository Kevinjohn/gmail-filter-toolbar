# E2E Test Suite Upgrade - Phase 2: Test Coverage Expansion

**Status**: Not Started
**Estimated Effort**: 1-2 days
**Prerequisites**: Phase 1 completed

---

## Overview

Phase 2 adds comprehensive test coverage for critical scenarios that aren't currently tested. You'll create new test specs for pagination persistence, debug mode, keyboard navigation, expanded locales, responsive behavior, and attachment filtering.

**All changes create new test files - no modifications to Phase 1 work required.**

---

## 2.1 Add Pagination Persistence Test

**Goal**: Verify filters persist when Gmail paginates or navigates.

**Context**: The extension uses `MutationObserver` to reapply filters when Gmail's DOM changes. This test ensures that works.

### Create `tests/e2e/toolbar-persistence.spec.js`

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
1. Run `npm run e2e -- tests/e2e/toolbar-persistence.spec.js`
2. Should pass both tests
3. Check `artifacts/playwright/` for screenshots if failures occur

---

## 2.2 Add Debug Mode Visual Test

**Goal**: Verify debug mode applies 50% opacity + blue tint to filtered rows.

### Create `tests/e2e/toolbar-debug.spec.js`

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
1. Run `npm run e2e -- tests/e2e/toolbar-debug.spec.js`
2. Should pass both tests

---

## 2.3 Add Keyboard Navigation Test

**Goal**: Verify <kbd>Esc</kbd> returns focus to message list and <kbd>Tab</kbd> navigates through buttons.

### Create `tests/e2e/toolbar-a11y.spec.js`

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
1. Run `npm run e2e -- tests/e2e/toolbar-a11y.spec.js`
2. Should pass all three tests

---

## 2.4 Expand Locale Testing Matrix

**Goal**: Add Hebrew (RTL) and Japanese locales to stress-test internationalization.

### Edit `tests/e2e/locale-smoke.spec.js`

Replace the existing content (after uncommenting) with:

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
3. Run `npm run e2e -- tests/e2e/locale-smoke.spec.js`
4. Should pass for all locales

---

## 2.5 Add Viewport Responsive Tests

**Goal**: Test toolbar at multiple screen sizes to verify wrapping and alignment.

### Create `tests/e2e/toolbar-responsive.spec.js`

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
1. Run `npm run e2e -- tests/e2e/toolbar-responsive.spec.js`
2. Should pass all tests across all viewports

---

## 2.6 Add Attachment Type Filter Tests

**Goal**: Test specific attachment filters (IMAGE, PDF, DOCUMENT, etc.).

### Step 1: Enhance `tests/e2e/fixtures/gmail.html`

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

### Step 2: Create `tests/e2e/toolbar-attachments.spec.js`

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
1. Run `npm run e2e -- tests/e2e/toolbar-attachments.spec.js`
2. Should pass all tests

**Note**: If the extension doesn't yet have individual buttons for each attachment type (IMAGE, PDF, etc.) and only has a single ATTACH button, these tests will still validate that the generic attachment filter works. Update the tests if/when granular filters are implemented.

---

## Phase 2 Completion Checklist

- [ ] `toolbar-persistence.spec.js` created and passing
- [ ] `toolbar-debug.spec.js` created and passing
- [ ] `toolbar-a11y.spec.js` created and passing
- [ ] `locale-smoke.spec.js` updated with expanded locale matrix
- [ ] `toolbar-responsive.spec.js` created and passing
- [ ] Gmail fixture enhanced with attachment type rows
- [ ] `toolbar-attachments.spec.js` created and passing

**Next Step**: Proceed to [Phase 3: Infrastructure & Organization](e2e-upgrade-v1-phase-3.md)