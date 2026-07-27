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

    await expect(page.locator('.UI').first()).toBeFocused();

    await unstubGmailRoute(page);
  });

  test('Arrow keys navigate the roving radio group', async ({ page, extensionId, gmailHtml }) => {
    const gmailPage = new GmailPage(page);

    await stubGmailRoute(page, gmailHtml);
    await gmailPage.navigate();

    // Focus on first button
    await gmailPage.allButton.focus();
    await expect(gmailPage.allButton).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(gmailPage.emailButton).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(gmailPage.calendarButton).toBeFocused();

    await page.keyboard.press('ArrowLeft');
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

    await expect(liveRegion).toHaveText('Filter set to Attachments');

    await unstubGmailRoute(page);
  });
});
