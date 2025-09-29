import { test, expect } from './fixtures/extension.js';

const localeMatrix = [
  { label: 'English', locale: 'en-US', direction: 'ltr' },
  { label: 'Arabic', locale: 'ar', direction: 'rtl' },
];
const themes = ['light', 'dark'];

async function stubGmailRoute(page, html) {
  await page.route('https://mail.google.com/*', async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.fulfill({
        status: 200,
        body: html,
        contentType: 'text/html',
      });
    } else {
      await route.fulfill({ status: 204, body: '' });
    }
  });
}

async function setLocaleSpecificTooltips(page) {
  await page.evaluate(() => {
    const favouriteTooltip = chrome.i18n.getMessage('alt_starred');
    const favourite = document.querySelector('tr[data-testid="row-favourite"] span[data-tooltip]');
    if (favourite && favouriteTooltip) {
      favourite.setAttribute('data-tooltip', favouriteTooltip);
    }
  });
}

function getBaseButtonOrder(buttons) {
  return buttons.slice(0, 5);
}

localeMatrix.forEach(({ label, locale, direction }) => {
  themes.forEach((theme) => {
    test.describe(`${label} locale · ${theme} theme`, () => {
      test.use({ locale, colorScheme: theme });

      test('applies options customisations to the Gmail toolbar', async ({
        page,
        extensionId,
        gmailHtml,
      }) => {
        await page.goto(`chrome-extension://${extensionId}/options.html`);

        await page.waitForSelector('#alignment-select');
        await page.locator('#alignment-select').selectOption('center');
        await page.locator('#show-favourites-checkbox').check();
        await page.locator('#show-button-text-checkbox').uncheck();
        await page.locator('#theme-select').selectOption(theme);

        // Allow storage writes to settle before navigating away.
        await page.waitForTimeout(150);

        await stubGmailRoute(page, gmailHtml);
        await page.goto('https://mail.google.com/mail/u/0/#inbox');

        await page.waitForSelector('.gcal-filter-bar');
        await page.evaluate((dir) => {
          document.body.setAttribute('dir', dir);
        }, direction);
        await setLocaleSpecificTooltips(page);

        const toolbar = page.locator('.gcal-filter-bar');
        await expect(toolbar).toBeVisible();
        await expect(toolbar).toHaveClass(/gcal-align-center/);
        await expect(toolbar).toHaveClass(/show-icon-only/);

        const favouritesButton = page.locator('#filter-FAVOURITES');
        await expect(favouritesButton).toBeVisible();

        await expect(page.locator('html')).toHaveAttribute('data-gcal-theme', theme);
        await expect(page.locator('body')).toHaveAttribute('dir', direction);

        const buttonOrder = await page.evaluate(() =>
          Array.from(document.querySelectorAll('.gcal-btn-group button[data-mode]')).map(
            (btn) => btn.dataset.mode
          )
        );
        expect(getBaseButtonOrder(buttonOrder)).toEqual([
          'ALL',
          'EMAIL',
          'CALENDAR',
          'FAVOURITES',
          'ATTACH',
        ]);

        const attachLabel = await page.locator('#filter-ATTACH').getAttribute('aria-label');
        const expectedAttachLabel = await page.evaluate(() => chrome.i18n.getMessage('btn_attach'));
        expect(attachLabel).toBe(expectedAttachLabel);

        await page.unroute('https://mail.google.com/*');
      });
    });
  });
});

test.describe('Toolbar interactions', () => {
  test.use({ locale: 'en-US', colorScheme: 'light' });

  test('filters rows for attachments and favourites and responds to layout changes', async ({
    page,
    extensionId,
    gmailHtml,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    await page.waitForSelector('#alignment-select');
    await page.locator('#show-favourites-checkbox').check();

    await stubGmailRoute(page, gmailHtml);
    await page.goto('https://mail.google.com/mail/u/0/#inbox');

    await page.waitForSelector('.gcal-filter-bar');
    await setLocaleSpecificTooltips(page);

    const getVisibility = (testId) =>
      page.locator(`tr[data-testid="${testId}"]`).evaluate((row) => {
        return {
          display: getComputedStyle(row).display,
          hidden: row.hidden,
        };
      });

    await expect(page.locator('.gcal-filter-bar')).toBeVisible();

    // Attachments filter should keep attachment rows visible and hide others.
    await page.locator('#filter-ATTACH').click();
    expect(await getVisibility('row-attachment')).toMatchObject({ display: 'table-row' });
    expect(await getVisibility('row-image')).toMatchObject({ display: 'table-row' });
    expect(await getVisibility('row-calendar')).toMatchObject({ display: 'none' });
    expect(await getVisibility('row-mail')).toMatchObject({ display: 'none' });

    await expect(page.locator('#filter-ATTACH')).toHaveAttribute('aria-checked', 'true');

    // Favourites filter should surface only starred rows.
    await page.locator('#filter-FAVOURITES').click();
    expect(await getVisibility('row-favourite')).toMatchObject({ display: 'table-row' });
    expect(await getVisibility('row-attachment')).toMatchObject({ display: 'none' });
    await expect(page.locator('#filter-FAVOURITES')).toHaveAttribute('aria-checked', 'true');

    // Return to All mode restores visibility and ensures wrapping still works at smaller widths.
    await page.locator('#filter-ALL').click();
    expect(await getVisibility('row-mail')).toMatchObject({ display: 'table-row' });

    await page.setViewportSize({ width: 480, height: 900 });
    const wraps = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll('.gcal-btn-group button[role="radio"]')
      );
      const topOffsets = buttons.map((btn) => btn.getBoundingClientRect().top);
      return new Set(topOffsets.map((value) => Math.round(value))).size > 1;
    });
    expect(wraps).toBe(true);

    await page.unroute('https://mail.google.com/*');
  });
});
