import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { GMAIL_FIXTURE_PATH } from './config.js';

const TEMPLATES_DIR = path.join(process.cwd(), 'tests', 'e2e', 'fixtures', 'gmail-templates');
const DEFAULT_TEMPLATE = GMAIL_FIXTURE_PATH;

/**
 * Loads a Gmail HTML fixture from disk.
 * @param {string} template - Template name (e.g., 'minimal', 'paginated') or null for default
 * @returns {string} HTML content
 */
export function loadGmailFixture(template = null) {
  if (!template) {
    return fs.readFileSync(DEFAULT_TEMPLATE, 'utf8');
  }
  const templatePath = path.join(TEMPLATES_DIR, `${template}.html`);
  return fs.readFileSync(templatePath, 'utf8');
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