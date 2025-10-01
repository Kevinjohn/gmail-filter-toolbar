#!/usr/bin/env node
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const VERSION = JSON.parse(readFileSync('./package.json', 'utf8')).version;
console.log(`🚀 Building release v${VERSION}`);

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
execSync('rm -rf dist/ artifacts/', { stdio: 'inherit' });

// Build Chrome version
console.log('🏗️  Building Chrome version...');
execSync('npm run build:chrome', { stdio: 'inherit' });
execSync('mkdir -p artifacts/chrome', { stdio: 'inherit' });
execSync('cp -r dist artifacts/chrome/', { stdio: 'inherit' });
execSync(`cd artifacts/chrome/dist && tar -czf ../gmail-calendar-options-chrome-v${VERSION}.tar.gz . && cd ../../..`, { stdio: 'inherit' });
console.log(`✅ Chrome package: artifacts/chrome/gmail-calendar-options-chrome-v${VERSION}.tar.gz`);

// Build Firefox version
console.log('🦊 Building Firefox version...');
execSync('npm run build:firefox', { stdio: 'inherit' });
execSync('mkdir -p artifacts/firefox', { stdio: 'inherit' });
execSync('cp -r dist artifacts/firefox/', { stdio: 'inherit' });
execSync(`cd artifacts/firefox/dist && tar -czf ../gmail-calendar-options-firefox-v${VERSION}.tar.gz . && cd ../../..`, { stdio: 'inherit' });
console.log(`✅ Firefox package: artifacts/firefox/gmail-calendar-options-firefox-v${VERSION}.tar.gz`);

// Validate Firefox package
console.log('🔍 Validating Firefox package...');
execSync('npx web-ext lint --source-dir artifacts/firefox/dist', { stdio: 'inherit' });

console.log('✨ Release build complete!');
console.log(`Chrome:  artifacts/chrome/gmail-calendar-options-chrome-v${VERSION}.tar.gz`);
console.log(`Firefox: artifacts/firefox/gmail-calendar-options-firefox-v${VERSION}.tar.gz`);
