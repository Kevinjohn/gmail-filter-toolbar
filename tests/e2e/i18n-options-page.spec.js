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
