import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const NON_ENGLISH_LOCALE = 'de_DE';
const localesDir = path.join(process.cwd(), 'src', '_locales');
const localeMessages = JSON.parse(
  readFileSync(path.join(localesDir, NON_ENGLISH_LOCALE, 'messages.json'), 'utf8')
);
const optionsPageUrl = pathToFileURL(
  path.join(process.cwd(), 'src', 'options.html')
).toString();

test.describe('Internationalisation smoke', () => {
  test('renders options UI labels with non-English locale messages', async ({ page }) => {
    await page.addInitScript((messages) => {
      const storageState = {
        gmailCalDebug: false,
        showButtonText: true,
        showFavourites: true,
        toolbarAlignment: 'center',
        gmailCalTheme: 'system'
      };

      const invoke = (callback, payload) => {
        if (typeof callback === 'function') {
          callback(payload);
        }
      };

      window.chrome = {
        runtime: {
          lastError: null
        },
        i18n: {
          getMessage(key) {
            return messages[key]?.message ?? '';
          }
        },
        storage: {
          sync: {
            get(_keys, callback) {
              window.chrome.runtime.lastError = null;
              setTimeout(() => invoke(callback, { ...storageState }), 0);
            },
            set(values, callback) {
              window.chrome.runtime.lastError = null;
              Object.assign(storageState, values);
              setTimeout(() => invoke(callback), 0);
            }
          }
        }
      };
    }, localeMessages);

    await page.goto(optionsPageUrl);

    await expect(page.locator('#pageTitle')).toHaveText(
      localeMessages.page_title.message
    );
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
