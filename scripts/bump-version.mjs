#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { writeFileBatch } from './utils/write-file-batch.mjs';

const bumpType = process.argv[2];
if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('Usage: node scripts/bump-version.mjs [major|minor|patch]');
  process.exit(1);
}

const packageFile = 'package.json';
const manifestFiles = [
  'src/manifest.json',
  'src/manifest.firefox.json',
  'src/manifest.safari.json',
];
const sourceFiles = [packageFile, ...manifestFiles];
const parsedFiles = new Map(
  sourceFiles.map((file) => [file, JSON.parse(readFileSync(file, 'utf8'))]),
);
const packageJson = parsedFiles.get(packageFile);
const parts = packageJson.version.split('.').map(Number);
if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
  throw new Error(`Unsupported version: ${packageJson.version}`);
}

if (bumpType === 'major') {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
} else if (bumpType === 'minor') {
  parts[1] += 1;
  parts[2] = 0;
} else {
  parts[2] += 1;
}

const version = parts.join('.');
packageJson.version = version;
const renderedFiles = new Map([[packageFile, `${JSON.stringify(packageJson, null, 2)}\n`]]);
for (const file of manifestFiles) {
  const manifest = parsedFiles.get(file);
  manifest.version = version;
  renderedFiles.set(file, `${JSON.stringify(manifest, null, 2)}\n`);
}
writeFileBatch([...renderedFiles]);
console.log(`Version bumped to ${version} in package.json and all browser manifests.`);
