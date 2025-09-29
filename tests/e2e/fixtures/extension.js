// NOTE: Disabled Playwright fixtures – Chrome/Chromium cannot launch reliably inside WSL.
// Keep this file commented out until host-level Chrome access is confirmed (see README › WSL Playwright Workaround).
/*
import path from 'node:path';
import fs, { promises as fsp } from 'node:fs';
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

  page: async ({ context, colorScheme, extensionId }, use, testInfo) => {
    const page = await context.newPage();
    if (colorScheme) {
      await page.emulateMedia({ colorScheme });
    }
    let client;
    try {
      client = await context.newCDPSession(page);
      await client.send('Profiler.enable');
      await client.send('Profiler.startPreciseCoverage', {
        callCount: true,
        detailed: true,
      });
    } catch (error) {
      await testInfo.attach('coverage-warn', {
        body: `Failed to initialise coverage: ${error}`,
        contentType: 'text/plain',
      });
    }

    try {
      await use(page);
    } finally {
      if (client) {
        try {
          const { result } = await client.send('Profiler.takePreciseCoverage');
          await client.send('Profiler.stopPreciseCoverage');
          await client.detach?.();

          const extensionOrigin = `chrome-extension://${extensionId}`;
          const contentScriptCoverage = (result ?? []).filter((entry) =>
            entry.url.startsWith(`${extensionOrigin}/`) && entry.url.endsWith('/contentScript.js')
          );

          if (contentScriptCoverage.length > 0) {
            const artifactsDir = path.join(
              process.cwd(),
              'artifacts',
              'coverage',
              'playwright'
            );
            await fsp.mkdir(artifactsDir, { recursive: true });
            const fileSafeTitle =
              testInfo.title.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() ||
              'coverage';
            const coveragePath = path.join(artifactsDir, `${fileSafeTitle}.json`);
            await fsp.writeFile(coveragePath, JSON.stringify(contentScriptCoverage, null, 2));
            await testInfo.attach('content-script-coverage', {
              path: coveragePath,
              contentType: 'application/json',
            });
          }
        } catch (error) {
          await testInfo.attach('coverage-error', {
            body: `Failed to collect coverage: ${error}`,
            contentType: 'text/plain',
          });
        }
      }
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
*/
