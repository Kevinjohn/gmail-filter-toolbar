import path from 'node:path';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { test, expect } from './fixtures/extension.js';

const localeMatrix = [
  { label: 'English', locale: 'en-US', localeDirectory: 'en', direction: 'ltr' },
  { label: 'Arabic', locale: 'ar', localeDirectory: 'ar', direction: 'rtl' },
];
const themes = ['light', 'dark'];

// WHY: Resolve extension i18n strings on the Node side from the shipped locale files.
// page.evaluate runs in the page's MAIN world where chrome.i18n does not exist (only content
// scripts get it), so asking the page for chrome.i18n.getMessage always throws.
function getLocaleMessage(localeDirectory, key) {
  const messagesPath = path.join(
    process.cwd(),
    'src',
    '_locales',
    localeDirectory,
    'messages.json',
  );
  return JSON.parse(readFileSync(messagesPath, 'utf8'))[key]?.message;
}

async function stubGmailRoute(page, html) {
  await page.route('https://mail.google.com/**', async (route) => {
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

async function setLocaleSpecificTooltips(page, favouriteTooltip) {
  await page.evaluate((tooltip) => {
    const favourite = document.querySelector('tr[data-testid="row-favourite"] span[data-tooltip]');
    if (favourite && tooltip) {
      favourite.setAttribute('data-tooltip', tooltip);
    }
  }, favouriteTooltip);
}

async function waitForStorageOptions(page, expectedOptions) {
  await page.waitForFunction(async (expected) => {
    const stored = await chrome.storage.sync.get(Object.keys(expected));
    return Object.entries(expected).every(([key, value]) => stored[key] === value);
  }, expectedOptions);
}

function getBaseButtonOrder(buttons) {
  return buttons.slice(0, 5);
}

localeMatrix.forEach(({ label, locale, localeDirectory, direction }) => {
  themes.forEach((theme) => {
    test.describe(`${label} locale · ${theme} theme`, () => {
      test.use({ locale, colorScheme: theme });

      // WHY: Chromium ignores --lang on macOS (it follows the system locale), so non-English
      // extension i18n assertions can only pass on Linux/Windows — CI covers them.
      test.skip(
        process.platform === 'darwin' && localeDirectory !== 'en',
        'Chromium ignores --lang on macOS; non-English locale assertions run in CI',
      );

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

        await waitForStorageOptions(page, {
          siftToolbarAlignment: 'center',
          siftShowFavourites: true,
          siftShowButtonText: false,
          siftTheme: theme,
        });

        await stubGmailRoute(page, gmailHtml);
        await page.goto('https://mail.google.com/mail/u/0/#inbox');

        await page.waitForSelector('.gcal-filter-bar');
        await page.evaluate((dir) => {
          document.body.setAttribute('dir', dir);
        }, direction);
        await setLocaleSpecificTooltips(page, getLocaleMessage(localeDirectory, 'alt_starred'));

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
            (btn) => btn.dataset.mode,
          ),
        );
        expect(getBaseButtonOrder(buttonOrder)).toEqual([
          'ALL',
          'EMAIL',
          'CALENDAR',
          'FAVOURITES',
          'ATTACH',
        ]);

        const attachLabel = await page.locator('#filter-ATTACH').getAttribute('aria-label');
        expect(attachLabel).toBe(getLocaleMessage(localeDirectory, 'btn_attach'));
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
    await waitForStorageOptions(page, { siftShowFavourites: true });

    await stubGmailRoute(page, gmailHtml);
    await page.goto('https://mail.google.com/mail/u/0/#inbox');

    await page.waitForSelector('.gcal-filter-bar');
    await setLocaleSpecificTooltips(page, getLocaleMessage('en', 'alt_starred'));

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
      const buttons = Array.from(document.querySelectorAll('.gcal-btn-group button[role="radio"]'));
      const topOffsets = buttons.map((btn) => btn.getBoundingClientRect().top);
      return new Set(topOffsets.map((value) => Math.round(value))).size > 1;
    });
    expect(wraps).toBe(true);
  });
});
