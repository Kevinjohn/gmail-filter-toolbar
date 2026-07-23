import path from 'node:path';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { test, expect } from './fixtures/extension.js';
import { OptionsPage } from './page-objects/OptionsPage.js';

const localesDir = path.join(process.cwd(), 'src', '_locales');

// Helper to load locale messages dynamically
function getLocaleMessages(localeDirectory) {
  const messagesPath = path.join(localesDir, localeDirectory, 'messages.json');
  return JSON.parse(readFileSync(messagesPath, 'utf8'));
}

const localeMatrix = [
  { label: 'German', locale: 'de-DE', localeDirectory: 'de' },
  { label: 'Latin American Spanish', locale: 'es-MX', localeDirectory: 'es_419' },
  { label: 'Arabic', locale: 'ar', localeDirectory: 'ar' },
];

localeMatrix.forEach(({ label, locale, localeDirectory }) => {
  test.describe(`Internationalisation: ${label}`, () => {
    test.use({ locale });

    test('renders options UI labels with locale-specific messages', async ({
      page,
      extensionId,
    }) => {
      const optionsPage = new OptionsPage(page, extensionId);
      await optionsPage.navigate();

      const messages = getLocaleMessages(localeDirectory);

      await expect(optionsPage.pageTitle).toHaveText(messages.page_title.message);
      await expect(optionsPage.debugLegend).toHaveText(messages.options_debug_legend.message);
      await expect(optionsPage.alignmentLegend).toHaveText(
        messages.options_alignment_legend.message,
      );
      await expect(optionsPage.showFavouritesLabel).toHaveText(
        messages.options_show_favourites_label.message,
      );
    });
  });
});
