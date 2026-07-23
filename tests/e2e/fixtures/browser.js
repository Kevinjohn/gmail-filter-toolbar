import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { EXTENSION_PATH, HEADFUL } from './config.js';

/**
 * Throws an error if the extension build is missing or incomplete.
 */
export function ensureExtensionBuild() {
  if (!fs.existsSync(EXTENSION_PATH)) {
    throw new Error(
      `Extension build not found at: ${EXTENSION_PATH}\n` +
        'Run `pnpm run build:chrome` before executing Playwright specs.',
    );
  }
  const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `manifest.json missing from: ${EXTENSION_PATH}\n` +
        'Ensure `pnpm run build:chrome` completed successfully.',
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
    // Stability flags for CI environments
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ];

  // Chrome extension coverage defaults to headed mode. CI supplies Xvfb; callers can explicitly
  // opt into the browser's extension-capable headless mode with PLAYWRIGHT_HEADFUL=0.
  const context = await chromium.launchPersistentContext('', {
    headless: !HEADFUL,
    locale,
    colorScheme,
    args: launchArgs,
  });

  return context;
}
