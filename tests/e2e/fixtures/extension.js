import { test as base } from '@playwright/test';
import { launchExtensionContext } from './browser.js';
import { startCoverage, collectCoverage } from './coverage.js';
import { getExtensionId } from './extension-loader.js';
import { loadGmailFixture } from './gmail-stub.js';
import { DEBUG } from './config.js';

export const test = base.extend({
  context: async ({ locale, colorScheme }, use) => {
    const context = await launchExtensionContext(locale, colorScheme);
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

    // Pause for debugging if PLAYWRIGHT_DEBUG=1
    if (DEBUG) {
      await page.pause();
    }

    const client = await startCoverage(page, context, testInfo);

    try {
      await use(page);
    } finally {
      await collectCoverage(client, extensionId, testInfo);
      await page.close();
    }
  },

  extensionId: async ({ context }, use) => {
    const extensionId = await getExtensionId(context);
    await use(extensionId);
  },

  gmailHtml: async ({}, use) => {
    const html = loadGmailFixture();
    await use(html);
  },
});

export const expect = test.expect;
