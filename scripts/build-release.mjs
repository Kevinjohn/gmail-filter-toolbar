#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const artifactsDir = path.resolve('artifacts');

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

function verifyArchive(browser, archive) {
  const entries = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).split('\n');
  if (!entries.includes('manifest.json')) {
    throw new Error(`${browser} archive does not contain manifest.json at its root`);
  }
}

function verifySafariManifest() {
  const manifest = JSON.parse(readFileSync('dist/safari/manifest.json', 'utf8'));
  if (
    manifest.background?.type !== undefined ||
    !manifest.background?.scripts?.includes('background.js')
  ) {
    throw new Error('Safari manifest must declare background.js as a classic script');
  }
  if (manifest.options_page !== 'options.html') {
    throw new Error('Safari manifest must declare options.html with options_page');
  }
}

function zipDirectory(browser) {
  const sourceDir = path.resolve('dist', browser);
  const targetDir = path.join(artifactsDir, browser);
  const archive = path.join(targetDir, `gmail-filter-toolbar-${browser}-v${version}.zip`);
  mkdirSync(targetDir, { recursive: true });
  run('zip', ['-q', '-r', archive, '.'], { cwd: sourceDir });
  verifyArchive(browser, archive);
  return archive;
}

function packageFirefox() {
  const targetDir = path.join(artifactsDir, 'firefox');
  const filename = `gmail-filter-toolbar-firefox-v${version}.zip`;
  const archive = path.join(targetDir, filename);
  mkdirSync(targetDir, { recursive: true });
  run('pnpm', [
    'exec',
    'web-ext',
    'build',
    '--source-dir',
    'dist/firefox',
    '--artifacts-dir',
    targetDir,
    '--filename',
    filename,
    '--overwrite-dest',
  ]);
  verifyArchive('firefox', archive);
  return archive;
}

console.log(`Building release v${version}`);
rmSync('dist', { recursive: true, force: true });
rmSync(artifactsDir, { recursive: true, force: true });

run('pnpm', ['run', 'build:chrome']);
const chromeArchive = zipDirectory('chrome');

run('pnpm', ['run', 'build:firefox']);
run('pnpm', ['exec', 'web-ext', 'lint', '--source-dir', 'dist/firefox']);
const firefoxArchive = packageFirefox();

run('pnpm', ['run', 'build:safari']);
verifySafariManifest();
const safariArchive = zipDirectory('safari');

console.log('Release packages:');
console.log(chromeArchive);
console.log(firefoxArchive);
console.log(safariArchive);
