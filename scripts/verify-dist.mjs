#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const paths = ['dist/chrome', 'dist/firefox'];

export function getDistributionChanges(root = process.cwd()) {
  return execFileSync(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=all', '--', ...paths],
    { cwd: root, encoding: 'utf8' },
  ).trim();
}

function run() {
  const changes = getDistributionChanges();
  if (changes) {
    console.error(`Tracked distributions are not current:\n${changes}`);
    process.exitCode = 1;
  } else {
    console.log('Tracked Chrome and Firefox distributions are current.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
