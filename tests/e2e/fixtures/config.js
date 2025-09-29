import path from 'node:path';
import process from 'node:process';

export const EXTENSION_PATH = path.join(process.cwd(), 'dist');
export const GMAIL_FIXTURE_PATH = path.join(
  process.cwd(),
  'tests',
  'e2e',
  'fixtures',
  'gmail.html'
);
export const COVERAGE_DIR = path.join(process.cwd(), 'artifacts', 'coverage', 'playwright');
export const HEADFUL = process.env.PLAYWRIGHT_HEADFUL === '1';
export const DEBUG = process.env.PLAYWRIGHT_DEBUG === '1';