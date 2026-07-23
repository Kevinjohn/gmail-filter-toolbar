import { test, expect } from './fixtures/extension.js';
import { stubGmailRoute, unstubGmailRoute } from './fixtures/gmail-stub.js';
import { GmailPage } from './page-objects/GmailPage.js';
import { OptionsPage } from './page-objects/OptionsPage.js';

test.describe('Toolbar persistence', () => {
  test.use({ locale: 'en-US', colorScheme: 'light' });

  test('filter state persists during Gmail pagination', async ({
    page,
    extensionId,
    gmailHtml,
  }) => {
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

    // Simulate Gmail pagination by injecting a non-attachment row dynamically.
    await page.evaluate(() => {
      const tbody = document.querySelector('.UI table tbody');
      const newRow = document.createElement('tr');
      newRow.className = 'zA';
      newRow.setAttribute('data-testid', 'row-new-mail');
      newRow.innerHTML = `
        <td class="bog">New email without an attachment</td>
      `;
      tbody.appendChild(newRow);
    });

    // The locator assertion waits for the debounced observer to apply the active filter.
    await expect(page.locator('tr[data-testid="row-new-mail"]')).toHaveCSS('display', 'none');

    // Verify existing non-attachment rows are still hidden
    const mailRowVisibility = await gmailPage.getRowVisibility('row-mail');
    expect(mailRowVisibility.display).toBe('none');

    await unstubGmailRoute(page);
  });

  test('toolbar reinjects after Gmail toolbar is removed and recreated', async ({
    page,
    extensionId,
    gmailHtml,
  }) => {
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

    // Verify the toolbar is reinjected beside the replacement Gmail header.
    const replacementToolbar = page.locator('.G-atb + .gcal-filter-wrapper .gcal-filter-bar');
    await expect(replacementToolbar).toBeVisible();
    await expect(replacementToolbar.locator('#filter-ALL')).toBeVisible();

    await unstubGmailRoute(page);
  });
});
