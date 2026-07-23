import fs from 'node:fs';
import { GMAIL_FIXTURE_PATH } from './config.js';

const DEFAULT_TEMPLATE = GMAIL_FIXTURE_PATH;

/**
 * Loads a Gmail HTML fixture from disk.
 * @returns {string} HTML content
 */
export function loadGmailFixture() {
  return fs.readFileSync(DEFAULT_TEMPLATE, 'utf8');
}

/**
 * Stubs all requests to mail.google.com to return the offline Gmail fixture.
 * @param {Page} page - Playwright page object
 * @param {string} html - HTML content to return
 */
export async function stubGmailRoute(page, html) {
  await page.route('https://mail.google.com/*', async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.fulfill({
        status: 200,
        body: html,
        contentType: 'text/html',
      });
    } else {
      // Block all other resources (CSS, JS, images, etc.)
      await route.fulfill({ status: 204, body: '' });
    }
  });
}

/**
 * Removes the Gmail route stub to allow real requests.
 * @param {Page} page - Playwright page object
 */
export async function unstubGmailRoute(page) {
  await page.unroute('https://mail.google.com/*');
}
