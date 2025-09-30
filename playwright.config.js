import { defineConfig } from '@playwright/test';
import { execSync } from 'node:child_process';

const isCI = !!process.env.CI;
const workers = process.env.E2E_WORKERS ? parseInt(process.env.E2E_WORKERS, 10) : (isCI ? 2 : 1);

// Detect WSL2 environment
const isWSL = (() => {
  try {
    const uname = execSync('uname -r', { encoding: 'utf8' }).toLowerCase();
    return uname.includes('microsoft') || uname.includes('wsl');
  } catch {
    return false;
  }
})();

// Skip all tests in WSL2 (Chrome MV3 extensions don't work in WSL2 Playwright)
// Override with E2E_FORCE=1 to attempt running anyway
const forceRun = process.env.E2E_FORCE === '1';
if (isWSL && !isCI && !forceRun) {
  console.warn('\n⚠️  WSL2 detected: Skipping E2E tests (Chrome MV3 extensions unsupported in WSL2)');
  console.warn('   Run tests in CI/CD or native Linux/macOS/Windows environment');
  console.warn('   Override: E2E_FORCE=1 npm run e2e (tests will likely fail)\n');
  process.exit(0);
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  fullyParallel: !isCI, // Enable parallel execution locally for speed
  retries: isCI ? 2 : 0, // Increased retries for CI flakiness
  workers,
  outputDir: 'artifacts/playwright-results',
  reporter: isCI
    ? [
        ['list'],
        ['junit', { outputFile: 'artifacts/playwright/junit.xml' }],
        ['html', { outputFolder: 'artifacts/playwright/html', open: 'never' }]
      ]
    : [
        ['list'],
        ['html', { outputFolder: 'artifacts/playwright/html', open: 'on-failure' }]
      ],
  use: {
    headless: process.env.PLAYWRIGHT_HEADFUL !== '1',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure', // Added video capture
    launchOptions: {
      args: ['--allow-file-access-from-files']
    }
  },
  projects: [
    {
      name: 'chromium-extension',
      testMatch: /.*\.spec\.js/,
      use: {
        browserName: 'chromium',
      },
    },
    // Future: Add Firefox addon project when MV3 support is available
    // {
    //   name: 'firefox-addon',
    //   testMatch: /.*\.spec\.js/,
    //   use: {
    //     browserName: 'firefox',
    //   },
    // },
  ],
});
