import { test, expect } from './fixtures/extension.js';
import { stubGmailRoute, unstubGmailRoute } from './fixtures/gmail-stub.js';
import { GmailPage } from './page-objects/GmailPage.js';
import { OptionsPage } from './page-objects/OptionsPage.js';

test.describe('Debug mode', () => {
  test.use({ locale: 'en-US', colorScheme: 'light' });

  test('filtered rows show debug styling when debug mode enabled', async ({
    page,
    extensionId,
    gmailHtml,
  }) => {
    const optionsPage = new OptionsPage(page, extensionId);
    const gmailPage = new GmailPage(page);

    // Enable debug mode in options
    await optionsPage.navigate();
    await optionsPage.enableDebug();
    await optionsPage.waitForStorageValue('gmailCalDebug', true);

    // Navigate to Gmail and apply mail-only filter
    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    await gmailPage.emailButton.click();

    // Verify calendar row is hidden but has debug styling
    const calendarRowStyles = await page
      .locator('tr[data-testid="row-calendar"]')
      .evaluate((row) => {
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

  test('filtered rows are completely hidden when debug mode disabled', async ({
    page,
    extensionId,
    gmailHtml,
  }) => {
    const optionsPage = new OptionsPage(page, extensionId);
    const gmailPage = new GmailPage(page);

    // Ensure debug mode is OFF (default state)
    await optionsPage.navigate();
    await optionsPage.disableDebug();
    await optionsPage.waitForStorageValue('gmailCalDebug', false);

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
