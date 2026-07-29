#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const artifactsDir = path.resolve('artifacts');
const reuseBuilds = process.argv.includes('--reuse-builds');
const approvedIconHashes = {
  'icons/icon16.png': '91e6b565dc58ab2474d94f87f691b2643ee2475ff65b733b39c7dff22a200b20',
  'icons/icon32.png': 'f0748bc8086a69cbecb47ea3ae8632111070956ee7b0db8f81925779b5597f7a',
  'icons/icon48.png': '22434f9628821e9c26a4facfd7dcbd158abb1899c0280cb59c357d818ecd7540',
  'icons/icon128.png': '3d996805136d9ec9a01c6c2084d5627d920adf012a551944d9eeadbf0d27882f',
};

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

export function verifyArchive(browser, archive) {
  const entries = new Set(
    execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).split('\n').filter(Boolean),
  );
  const manifest = JSON.parse(
    execFileSync('unzip', ['-p', archive, 'manifest.json'], { encoding: 'utf8' }),
  );
  const requiredEntries = collectRequiredArchiveEntries(manifest);

  assertManifestVersion(manifest, browser);

  const missingEntries = [...requiredEntries].filter((entry) => !entries.has(entry));
  if (missingEntries.length) {
    throw new Error(`${browser} archive is missing: ${missingEntries.join(', ')}`);
  }

  const packagedLicense = execFileSync('unzip', ['-p', archive, 'LICENSE']);
  const repositoryLicense = readFileSync('LICENSE');
  if (!packagedLicense.equals(repositoryLicense)) {
    throw new Error(`${browser} archive LICENSE does not match the repository LICENSE`);
  }

  for (const [icon, expectedHash] of Object.entries(approvedIconHashes)) {
    const bytes = execFileSync('unzip', ['-p', archive, icon]);
    const actualHash = createHash('sha256').update(bytes).digest('hex');
    if (actualHash !== expectedHash) {
      throw new Error(`${browser} archive contains an unapproved ${icon}`);
    }
  }
}

export function assertManifestVersion(manifest, browser, expectedVersion = version) {
  if (manifest.version !== expectedVersion) {
    throw new Error(
      `${browser} manifest version ${manifest.version ?? '(missing)'} does not match ${expectedVersion}`,
    );
  }
}

export function collectRequiredArchiveEntries(
  manifest,
  locales = readdirSync('src/_locales', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name),
) {
  const requiredEntries = new Set(['manifest.json', 'LICENSE']);
  for (const file of [
    'colours.css',
    'options.css',
    'modules/options.js',
    'modules/constants.js',
    'modules/storage.js',
    'modules/theme.js',
    'fonts/LICENSE-Material-Symbols.txt',
    'fonts/NOTICE-Material-Symbols.txt',
  ]) {
    requiredEntries.add(file);
  }

  if (manifest.background?.service_worker) {
    requiredEntries.add(manifest.background.service_worker);
  }
  for (const script of manifest.background?.scripts ?? []) requiredEntries.add(script);
  for (const contentScript of manifest.content_scripts ?? []) {
    for (const file of [...(contentScript.js ?? []), ...(contentScript.css ?? [])]) {
      requiredEntries.add(file);
    }
  }
  if (manifest.options_page) requiredEntries.add(manifest.options_page);
  if (manifest.options_ui?.page) requiredEntries.add(manifest.options_ui.page);
  for (const icon of Object.values(manifest.icons ?? {})) requiredEntries.add(icon);
  if (manifest.default_locale) {
    requiredEntries.add(`_locales/${manifest.default_locale}/messages.json`);
  }
  for (const locale of locales) {
    requiredEntries.add(`_locales/${locale}/messages.json`);
  }
  return requiredEntries;
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
  const archive = path.join(targetDir, `sift-${browser}-v${version}.zip`);
  mkdirSync(targetDir, { recursive: true });
  run('zip', ['-q', '-r', archive, '.'], { cwd: sourceDir });
  verifyArchive(browser, archive);
  return archive;
}

function packageFirefox() {
  const targetDir = path.join(artifactsDir, 'firefox');
  const filename = `sift-firefox-v${version}.zip`;
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

function main() {
  console.log(`Building release v${version}`);
  if (!reuseBuilds) rmSync('dist', { recursive: true, force: true });
  for (const browser of ['chrome', 'firefox', 'safari']) {
    rmSync(path.join(artifactsDir, browser), { recursive: true, force: true });
  }

  if (!reuseBuilds) run('pnpm', ['run', 'build:chrome']);
  const chromeArchive = zipDirectory('chrome');

  if (!reuseBuilds) {
    run('pnpm', ['run', 'build:firefox']);
    run('pnpm', ['exec', 'web-ext', 'lint', '--source-dir', 'dist/firefox']);
  }
  const firefoxArchive = packageFirefox();

  run('pnpm', ['run', 'build:safari']);
  verifySafariManifest();
  const safariArchive = zipDirectory('safari');

  console.log('Release packages:');
  console.log(chromeArchive);
  console.log(firefoxArchive);
  console.log(safariArchive);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
