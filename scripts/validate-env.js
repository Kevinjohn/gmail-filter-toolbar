#!/usr/bin/env node
import { accessSync, constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const errors = [];
let chromiumPath;
let chromiumError = null;

try {
  chromiumPath = chromium.executablePath();
  accessSync(chromiumPath, constants.X_OK);
} catch (error) {
  chromiumError = `Playwright chromium browser is unavailable. Run \`pnpm exec playwright install\` to download it. (${error.message})`;
}

const chromeCandidates = [
  process.env.CHROME_BIN,
  process.env.CHROMIUM_BIN,
  process.env.CHROME_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  chromiumPath,
].filter(Boolean);

let chromeFound = false;
const candidateErrors = [];
for (const candidate of chromeCandidates) {
  try {
    accessSync(path.resolve(candidate), constants.X_OK);
    chromeFound = true;
    break;
  } catch {
    candidateErrors.push(`Chrome binary at ${candidate} is not accessible.`);
  }
}

// WHY: Only report candidate failures when NO candidate worked — a stale CHROME_BIN must not fail
// validation when a later candidate (e.g. Playwright Chromium) was found and is usable.
if (!chromeFound) {
  if (chromiumError) errors.push(chromiumError);
  errors.push(
    ...candidateErrors,
    'No Chrome executable detected. Set CHROME_BIN to a valid binary or install Playwright Chromium.',
  );
}

if (errors.length > 0) {
  console.error('Environment validation failed:\n- ' + errors.join('\n- '));
  process.exit(1);
}

console.log('Environment validation passed. Playwright browsers and Chrome binary are available.');
