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
    test(`toolbar wraps correctly at ${name} viewport (${width}x${height})`, async ({
      page,
      extensionId,
      gmailHtml,
    }) => {
      const optionsPage = new OptionsPage(page, extensionId);
      const gmailPage = new GmailPage(page);

      // Enable favourites to maximize button count
      await optionsPage.navigate();
      await optionsPage.enableFavourites();
      await optionsPage.waitForStorageValue('siftShowFavourites', true);

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

  test('toolbar alignment changes are visible at different viewports', async ({
    page,
    extensionId,
    gmailHtml,
  }) => {
    const optionsPage = new OptionsPage(page, extensionId);
    const gmailPage = new GmailPage(page);

    // Test center alignment at desktop width
    await optionsPage.navigate();
    await optionsPage.setAlignment('center');
    await optionsPage.waitForStorageValue('siftToolbarAlignment', 'center');

    await stubGmailRoute(page, gmailHtml);
    await page.setViewportSize({ width: 1024, height: 768 });
    await gmailPage.navigate();

    const toolbarComponent = new ToolbarComponent(gmailPage.toolbar);
    await toolbarComponent.assertAlignment('center');

    // Switch to start alignment
    await optionsPage.navigate();
    await optionsPage.setAlignment('start');
    await optionsPage.waitForStorageValue('siftToolbarAlignment', 'start');

    await gmailPage.navigate();
    await toolbarComponent.assertAlignment('start');

    await unstubGmailRoute(page);
  });
});
