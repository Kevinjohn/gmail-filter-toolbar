import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  outputDir: 'artifacts/playwright',
  reporter: isCI
    ? [['list'], ['junit', { outputFile: 'artifacts/playwright/junit.xml' }]]
    : [['list'], ['html', { outputFolder: 'artifacts/playwright/html', open: 'never' }]],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--allow-file-access-from-files']
    }
  }
});
