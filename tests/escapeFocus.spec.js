import { test, expect } from '@playwright/test';
import fs from 'fs';

const script = fs.readFileSync('src/contentScript.js', 'utf8');
const html = `
  <div class="G-atb" role="toolbar"></div>
  <div class="UI" tabindex="-1"></div>
  <script>${script}</script>
`;

test('Escape returns focus to list', async ({ page }) => {
  await page.addInitScript(() => {
    window.chrome = {
      storage: { sync: { get: (_, cb) => cb({}), set: () => {} } },
      i18n: { getMessage: (id) => id }
    };
  });

  await page.setContent(html);
  await page.waitForSelector('.gcal-filter-bar');
  await page.focus('.gcal-filter-bar button');
  await page.keyboard.press('Escape');
  const className = await page.evaluate(() => document.activeElement.className);
  expect(className).toBe('UI');
});
