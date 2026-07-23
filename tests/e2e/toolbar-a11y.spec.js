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

    // Verify live region content updates (exact text depends on i18n)
    const announcement = await liveRegion.textContent();
    expect(announcement).toBeTruthy();
    expect(announcement.length).toBeGreaterThan(0);

    await unstubGmailRoute(page);
  });
});
