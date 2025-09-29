// NOTE: Disabled Playwright suite – Chrome/Chromium cannot launch reliably inside WSL.
// Keep this file commented out until host-level Chrome access is confirmed (see README › WSL Playwright Workaround).
/*
import path from 'node:path';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { test, expect } from './fixtures/extension.js';

const NON_ENGLISH_LOCALE = 'de_DE';
const localesDir = path.join(process.cwd(), 'src', '_locales');
const localeMessages = JSON.parse(
  readFileSync(path.join(localesDir, NON_ENGLISH_LOCALE, 'messages.json'), 'utf8')
);

test.describe('Internationalisation smoke', () => {
  test.use({ locale: 'de-DE' });

  test('renders options UI labels with non-English locale messages', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    await expect(page.locator('#pageTitle')).toHaveText(localeMessages.page_title.message);
    await expect(page.locator('#debugLegend')).toHaveText(
      localeMessages.options_debug_legend.message
    );
    await expect(page.locator('#alignmentLegend')).toHaveText(
      localeMessages.options_alignment_legend.message
    );
    await expect(page.locator('#showFavouritesLabel')).toHaveText(
      localeMessages.options_show_favourites_label.message
    );
  });
});
*/
