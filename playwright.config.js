import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  use: {
    headless: true,
    launchOptions: {
      args: ['--allow-file-access-from-files']
    }
  }
});
