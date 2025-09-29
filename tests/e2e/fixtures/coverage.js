import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { COVERAGE_DIR } from './config.js';

/**
 * Initializes V8 coverage collection for a page.
 * @param {Page} page - Playwright page object
 * @param {BrowserContext} context - Browser context
 * @param {Object} testInfo - Playwright testInfo object
 * @returns {Promise<CDPSession|null>} CDP client or null if failed
 */
export async function startCoverage(page, context, testInfo) {
  let client;
  try {
    client = await context.newCDPSession(page);
    await client.send('Profiler.enable');
    await client.send('Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: true,
    });
    return client;
  } catch (error) {
    await testInfo.attach('coverage-warn', {
      body: `Failed to initialise coverage: ${error}`,
      contentType: 'text/plain',
    });
    return null;
  }
}

/**
 * Collects and saves V8 coverage data for the content script.
 * @param {CDPSession|null} client - CDP client from startCoverage
 * @param {string} extensionId - Extension ID
 * @param {Object} testInfo - Playwright testInfo object
 */
export async function collectCoverage(client, extensionId, testInfo) {
  if (!client) return;

  try {
    const { result } = await client.send('Profiler.takePreciseCoverage');
    await client.send('Profiler.stopPreciseCoverage');
    await client.detach?.();

    const extensionOrigin = `chrome-extension://${extensionId}`;
    const contentScriptCoverage = (result ?? []).filter((entry) =>
      entry.url.startsWith(`${extensionOrigin}/`) && entry.url.endsWith('/contentScript.js')
    );

    if (contentScriptCoverage.length > 0) {
      await fsp.mkdir(COVERAGE_DIR, { recursive: true });
      const fileSafeTitle =
        testInfo.title.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() ||
        'coverage';
      const coveragePath = path.join(COVERAGE_DIR, `${fileSafeTitle}.json`);
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