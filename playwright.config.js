import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;
const workers = process.env.E2E_WORKERS ? parseInt(process.env.E2E_WORKERS, 10) : (isCI ? 2 : 1);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  fullyParallel: !isCI, // Enable parallel execution locally for speed
  retries: isCI ? 2 : 0, // Increased retries for CI flakiness
  workers,
  outputDir: 'artifacts/playwright',
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
