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
// WHY: '**', not '*' — in Playwright URL globs a single '*' does not match '/', so
// 'https://mail.google.com/*' silently fails to match multi-segment paths like /mail/u/0/,
// letting the navigation escape to the real Gmail (login page) and hanging every spec.
const GMAIL_ROUTE_PATTERN = 'https://mail.google.com/**';

export async function stubGmailRoute(page, html) {
  await page.route(GMAIL_ROUTE_PATTERN, async (route) => {
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
  await page.unroute(GMAIL_ROUTE_PATTERN);
}
