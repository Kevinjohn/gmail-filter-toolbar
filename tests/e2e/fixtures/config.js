import path from 'node:path';
import process from 'node:process';

/**
 * Path to the built extension directory (dist/chrome/).
 * @constant {string}
 */
export const EXTENSION_PATH = path.join(process.cwd(), 'dist', 'chrome');

/**
 * Path to the Gmail HTML fixture.
 * @constant {string}
 */
export const GMAIL_FIXTURE_PATH = path.join(
  process.cwd(),
  'tests',
  'e2e',
  'fixtures',
  'gmail.html'
);

/**
 * Directory for Playwright V8 coverage reports.
 * @constant {string}
 */
export const COVERAGE_DIR = path.join(process.cwd(), 'artifacts', 'coverage', 'playwright');

/**
 * Whether to run Playwright in headed mode (visible browser).
 * @constant {boolean}
 */
export const HEADFUL = process.env.PLAYWRIGHT_HEADFUL === '1';

/**
 * Whether to pause Playwright execution on test start for debugging.
 * @constant {boolean}
 */
export const DEBUG = process.env.PLAYWRIGHT_DEBUG === '1';