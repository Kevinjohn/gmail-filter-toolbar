#!/usr/bin/env node
import { accessSync, constants } from 'node:fs';
import { chromium } from '@playwright/test';

const errors = [];
let chromiumPath;

try {
  chromiumPath = chromium.executablePath();
  accessSync(chromiumPath, constants.X_OK);
} catch (error) {
  errors.push(
    `Playwright Chromium is unavailable. Run \`pnpm exec playwright install chromium\` to download the browser used by E2E. (${error.message})`,
  );
}

if (errors.length > 0) {
  console.error('Environment validation failed:\n- ' + errors.join('\n- '));
  process.exit(1);
}

console.log(`Environment validation passed. Playwright Chromium is executable at ${chromiumPath}.`);
