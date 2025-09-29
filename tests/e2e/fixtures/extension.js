import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import { chromium, test as base } from '@playwright/test';

const EXTENSION_PATH = path.join(process.cwd(), 'dist');
const GMAIL_FIXTURE_PATH = path.join(
  process.cwd(),
  'tests',
  'e2e',
  'fixtures',
  'gmail.html'
);

function ensureExtensionBuild() {
  if (!fs.existsSync(EXTENSION_PATH)) {
    throw new Error(
      'Extension build not found. Run `npm run build` before executing Playwright specs.'
    );
  }
  const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      'manifest.json missing from dist/. Ensure `npm run build` completed successfully.'
    );
  }
}

const HEADFUL = process.env.PLAYWRIGHT_HEADFUL === '1';

export const test = base.extend({
  context: async ({ locale, colorScheme }, use) => {
    ensureExtensionBuild();

    const launchArgs = [
      '--allow-file-access-from-files',
      '--disable-extensions-except=' + EXTENSION_PATH,
      '--load-extension=' + EXTENSION_PATH,
      locale ? `--lang=${locale}` : '--lang=en-US',
    ];

    if (!HEADFUL) {
      launchArgs.push('--headless=new', '--disable-gpu');
    }

    launchArgs.push('--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage');

    const context = await chromium.launchPersistentContext('', {
      headless: !HEADFUL,
      locale,
      colorScheme,
      args: launchArgs,
    });

    try {
      await use(context);
    } finally {
      await context.close();
    }
  },

  page: async ({ context, colorScheme }, use) => {
    const page = await context.newPage();
    if (colorScheme) {
      await page.emulateMedia({ colorScheme });
    }
    try {
      await use(page);
    } finally {
      await page.close();
    }
  },

  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }
    const url = serviceWorker.url();
    const extensionId = url.split('/')[2];
    await use(extensionId);
  },

  gmailHtml: async (_, use) => {
    const html = fs.readFileSync(GMAIL_FIXTURE_PATH, 'utf8');
    await use(html);
  },
});

export const expect = test.expect;
