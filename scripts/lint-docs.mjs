#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const IGNORED_DIRECTORIES = new Set([
  '.git',
  'artifacts',
  'coverage',
  'dist',
  'node_modules',
  'safari-xcode',
]);

function collectMarkdown(target) {
  if (!existsSync(target)) return [];
  return readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) return [];
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) return collectMarkdown(child);
    return entry.name.toLowerCase().endsWith('.md') ? [child] : [];
  });
}

function collectRepositoryMarkdown(root) {
  try {
    return execFileSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '*.md'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
      .split('\0')
      .filter(Boolean)
      .map((file) => path.join(root, file));
  } catch {
    return collectMarkdown(root);
  }
}

function stripFencedCode(contents) {
  return contents.replace(/^\s*(```|~~~)[\s\S]*?^\s*\1\s*$/gm, (block) =>
    block.replace(/[^\n]/g, ' '),
  );
}

function readParenthesizedDestination(contents, openingIndex) {
  let depth = 1;
  let escaped = false;
  let angleWrapped = false;
  let destination = '';
  let index = openingIndex + 1;

  while (index < contents.length && /\s/.test(contents[index])) index += 1;
  if (contents[index] === '<') {
    angleWrapped = true;
    index += 1;
  }

  for (; index < contents.length; index += 1) {
    const character = contents[index];
    if (escaped) {
      destination += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (angleWrapped) {
      if (character === '>') return destination;
      destination += character;
      continue;
    }
    if (character === '(') {
      depth += 1;
      destination += character;
      continue;
    }
    if (character === ')') {
      depth -= 1;
      if (depth === 0) return destination.trim();
      destination += character;
      continue;
    }
    if (/\s/.test(character) && depth === 1) return destination.trim();
    destination += character;
  }
  return null;
}

function findDestinations(contents) {
  const visibleContents = stripFencedCode(contents);
  const destinations = [];
  const inlineStart = /\]\(/g;
  for (const match of visibleContents.matchAll(inlineStart)) {
    const destination = readParenthesizedDestination(visibleContents, match.index + 1);
    if (destination) destinations.push({ destination, index: match.index });
  }

  const referenceDefinition = /^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm;
  for (const match of visibleContents.matchAll(referenceDefinition)) {
    destinations.push({ destination: match[1] ?? match[2], index: match.index });
  }
  return destinations;
}

function findMissingReferences(contents) {
  const visibleContents = stripFencedCode(contents);
  const definitions = new Set(
    [...visibleContents.matchAll(/^\s{0,3}\[([^\]]+)\]:/gm)].map((match) =>
      match[1].trim().toLowerCase().replace(/\s+/g, ' '),
    ),
  );
  const missing = [];
  for (const match of visibleContents.matchAll(/(?<!!)\[([^\]]+)\]\[([^\]]*)\]/g)) {
    const identifier = (match[2] || match[1]).trim().toLowerCase().replace(/\s+/g, ' ');
    if (!definitions.has(identifier)) missing.push({ identifier, index: match.index });
  }
  return missing;
}

function githubSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

function collectAnchors(contents) {
  const anchors = new Set();
  const occurrences = new Map();
  for (const match of stripFencedCode(contents).matchAll(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = githubSlug(match[1]);
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    anchors.add(occurrence ? `${base}-${occurrence}` : base);
  }
  for (const match of contents.matchAll(/\b(?:id|name)=["']([^"']+)["']/gi)) {
    anchors.add(match[1]);
  }
  return anchors;
}

function decodeTarget(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function validateDocumentation(root = process.cwd()) {
  const files = collectRepositoryMarkdown(root);
  const failures = [];
  const anchorCache = new Map();

  for (const absoluteFile of files) {
    const contents = readFileSync(absoluteFile, 'utf8');
    const relativeFile = path.relative(root, absoluteFile);
    for (const { identifier, index } of findMissingReferences(contents)) {
      const line = contents.slice(0, index).split('\n').length;
      failures.push(`${relativeFile}:${line} references undefined [${identifier}]`);
    }
    for (const { destination, index } of findDestinations(contents)) {
      if (/^(?:https?:|mailto:)/i.test(destination)) continue;
      const [rawTarget, rawFragment] = destination.split('#', 2);
      const decodedTarget = decodeTarget(rawTarget);
      const decodedFragment = rawFragment === undefined ? undefined : decodeTarget(rawFragment);
      const line = contents.slice(0, index).split('\n').length;

      if (decodedTarget === null || decodedFragment === null) {
        failures.push(`${relativeFile}:${line} contains malformed URL encoding in ${destination}`);
        continue;
      }

      const resolved = decodedTarget
        ? path.resolve(path.dirname(absoluteFile), decodedTarget)
        : absoluteFile;
      if (!existsSync(resolved)) {
        failures.push(`${relativeFile}:${line} references missing ${rawTarget}`);
        continue;
      }

      if (decodedFragment !== undefined && decodedFragment !== '') {
        let anchors = anchorCache.get(resolved);
        if (!anchors) {
          anchors = collectAnchors(readFileSync(resolved, 'utf8'));
          anchorCache.set(resolved, anchors);
        }
        if (!anchors.has(decodedFragment)) {
          failures.push(`${relativeFile}:${line} references missing #${rawFragment}`);
        }
      }
    }
  }

  return { failures, files };
}

function run() {
  const { failures, files } = validateDocumentation();
  if (failures.length) {
    console.error(`Documentation validation failed:\n${failures.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log(`Documentation validation passed for ${files.length} Markdown files.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
