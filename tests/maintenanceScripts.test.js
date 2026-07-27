import { afterEach, expect, test } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertManifestVersion, collectRequiredArchiveEntries } from '../scripts/build-release.mjs';
import { validateDocumentation } from '../scripts/lint-docs.mjs';
import { writeFileBatch } from '../scripts/utils/write-file-batch.mjs';
import { getDistributionChanges } from '../scripts/verify-dist.mjs';

let temporaryDirectory;

afterEach(() => {
  if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = undefined;
});

test('batch writes leave existing files unchanged when validation fails', () => {
  temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'gmail-filter-batch-'));
  const first = path.join(temporaryDirectory, 'first.json');
  const missing = path.join(temporaryDirectory, 'missing.json');
  writeFileSync(first, 'original');

  expect(() =>
    writeFileBatch([
      [first, 'changed'],
      [missing, 'new'],
    ]),
  ).toThrow();

  expect(readFileSync(first, 'utf8')).toBe('original');
});

test('batch writes preserve file modes and remove temporary artifacts', () => {
  temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'gmail-filter-batch-'));
  const first = path.join(temporaryDirectory, 'first.json');
  const second = path.join(temporaryDirectory, 'second.json');
  writeFileSync(first, 'first');
  writeFileSync(second, 'second');
  chmodSync(first, 0o744);

  writeFileBatch([
    [first, 'changed first'],
    [second, 'changed second'],
  ]);

  expect(readFileSync(first, 'utf8')).toBe('changed first');
  expect(readFileSync(second, 'utf8')).toBe('changed second');
  expect(statSync(first).mode & 0o777).toBe(0o744);
  expect(readdirSync(temporaryDirectory).sort()).toEqual(['first.json', 'second.json']);
});

test('batch writes roll back every destination when a later replacement fails', () => {
  temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'gmail-filter-batch-'));
  const first = path.join(temporaryDirectory, 'first.json');
  const second = path.join(temporaryDirectory, 'second.json');
  writeFileSync(first, 'first');
  writeFileSync(second, 'second');
  let injectedFailure = false;

  expect(() =>
    writeFileBatch(
      [
        [first, 'changed first'],
        [second, 'changed second'],
      ],
      {
        rename: (source, destination) => {
          if (!injectedFailure && source.includes('.tmp-') && destination === second) {
            injectedFailure = true;
            throw new Error('injected replacement failure');
          }
          renameSync(source, destination);
        },
      },
    ),
  ).toThrow('injected replacement failure');

  expect(readFileSync(first, 'utf8')).toBe('first');
  expect(readFileSync(second, 'utf8')).toBe('second');
  expect(readdirSync(temporaryDirectory).sort()).toEqual(['first.json', 'second.json']);
});

test('batch writes reject duplicate destinations before changing files', () => {
  temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'gmail-filter-batch-'));
  const file = path.join(temporaryDirectory, 'settings.json');
  writeFileSync(file, 'original');

  expect(() =>
    writeFileBatch([
      [file, 'first'],
      [file, 'second'],
    ]),
  ).toThrow('unique destination');
  expect(readFileSync(file, 'utf8')).toBe('original');
});

test('documentation validation handles nested destinations, titles, references, and fragments', () => {
  temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'gmail-filter-docs-'));
  const docs = path.join(temporaryDirectory, 'docs');
  mkdirSync(docs);
  writeFileSync(
    path.join(temporaryDirectory, 'README.md'),
    [
      '# Project',
      '[Inline](docs/guide_(old).md "Guide")',
      '[Reference][guide]',
      '[Section](docs/guide_(old).md#details--examples)',
      '[guide]: docs/guide_(old).md',
    ].join('\n'),
  );
  writeFileSync(path.join(docs, 'guide_(old).md'), '# Guide\n\n## Details & Examples\n');

  expect(validateDocumentation(temporaryDirectory).failures).toEqual([]);
});

test('documentation validation reports missing files and fragments', () => {
  temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'gmail-filter-docs-'));
  writeFileSync(
    path.join(temporaryDirectory, 'README.md'),
    '# Project\n[Missing](missing.md)\n[Heading](#not-present)\n[Reference][undefined]\n[Encoding](bad%ZZ.md)\n',
  );

  const { failures } = validateDocumentation(temporaryDirectory);
  expect(failures).toHaveLength(4);
  expect(failures.join('\n')).toContain('references missing missing.md');
  expect(failures.join('\n')).toContain('references missing #not-present');
  expect(failures.join('\n')).toContain('references undefined [undefined]');
  expect(failures.join('\n')).toContain('malformed URL encoding');
});

test('distribution verification includes untracked generated files', () => {
  temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'gmail-filter-dist-'));
  execFileSync('git', ['init', '--quiet'], { cwd: temporaryDirectory });
  mkdirSync(path.join(temporaryDirectory, 'dist', 'chrome'), { recursive: true });
  writeFileSync(path.join(temporaryDirectory, 'dist', 'chrome', 'LICENSE'), 'license');

  expect(getDistributionChanges(temporaryDirectory)).toContain('?? dist/chrome/LICENSE');
});

test('release inventory includes options dependencies, notices, and every locale', () => {
  const entries = collectRequiredArchiveEntries(
    {
      background: { service_worker: 'background.js' },
      content_scripts: [{ js: ['contentScript.js'], css: ['styles.css'] }],
      options_page: 'options.html',
      icons: { 16: 'icons/icon16.png' },
      default_locale: 'en',
    },
    ['en', 'fr'],
  );

  expect(entries).toEqual(
    new Set([
      'manifest.json',
      'LICENSE',
      'colours.css',
      'options.css',
      'modules/options.js',
      'modules/constants.js',
      'modules/storage.js',
      'modules/theme.js',
      'fonts/LICENSE-Material-Symbols.txt',
      'fonts/NOTICE-Material-Symbols.txt',
      'background.js',
      'contentScript.js',
      'styles.css',
      'options.html',
      'icons/icon16.png',
      '_locales/en/messages.json',
      '_locales/fr/messages.json',
    ]),
  );
});

test('release verification rejects a manifest version mismatch', () => {
  expect(() => assertManifestVersion({ version: '1.0.0' }, 'chrome', '2.0.0')).toThrow(
    'chrome manifest version 1.0.0 does not match 2.0.0',
  );
});
