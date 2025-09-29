import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { EXTENSION_PATH, HEADFUL, DEBUG } from './config.js';

/**
 * Throws an error if the extension build is missing or incomplete.
 */
export function ensureExtensionBuild() {
  if (!fs.existsSync(EXTENSION_PATH)) {
    throw new Error(
      `Extension build not found at: ${EXTENSION_PATH}\n` +
      'Run `npm run build` before executing Playwright specs.'
    );
  }
  const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `manifest.json missing from: ${EXTENSION_PATH}\n` +
      'Ensure `npm run build` completed successfully.'
    );
  }
}

/**
 * Launches a persistent browser context with the extension loaded.
 * @param {string} locale - Browser locale (e.g., 'en-US', 'ar')
 * @param {string} colorScheme - 'light' or 'dark'
 * @returns {Promise<BrowserContext>}
 */
export async function launchExtensionContext(locale, colorScheme) {
  ensureExtensionBuild();

  const launchArgs = [
    '--allow-file-access-from-files',
    '--disable-extensions-except=' + EXTENSION_PATH,
    '--load-extension=' + EXTENSION_PATH,
    locale ? `--lang=${locale}` : '--lang=en-US',
  ];

  if (!HEADFUL && !DEBUG) {
    launchArgs.push('--headless=new', '--disable-gpu');
  }

  // Stability flags for CI environments
  launchArgs.push('--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage');

  const context = await chromium.launchPersistentContext('', {
    headless: !HEADFUL && !DEBUG,
    locale,
    colorScheme,
    args: launchArgs,
  });

  return context;
}