#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const localesDir = path.join(process.cwd(), 'src', '_locales');
const baseLocale = 'en';

const baseMessages = JSON.parse(
  readFileSync(path.join(localesDir, baseLocale, 'messages.json'), 'utf8')
);

const placeholderTokenPattern = /\$[a-zA-Z0-9_]+/g;

const summariseEntry = (entry) => {
  const placeholders = entry.placeholders ? Object.keys(entry.placeholders) : [];
  const pluralPlaceholders = placeholders.filter((name) => {
    const meta = entry.placeholders?.[name];
    return meta && typeof meta === 'object' && meta.type === 'plural';
  });
  const tokens = new Set();
  if (entry.message) {
    const matches = entry.message.match(placeholderTokenPattern);
    if (matches) {
      matches.forEach((match) => tokens.add(match));
    }
  }
  return {
    placeholders: placeholders.sort(),
    pluralPlaceholders: pluralPlaceholders.sort(),
    tokens: Array.from(tokens).sort()
  };
};

const baseSummary = new Map(
  Object.entries(baseMessages).map(([key, entry]) => [key, summariseEntry(entry)])
);

const errors = [];

const locales = readdirSync(localesDir).filter((dir) => dir !== baseLocale);

for (const locale of locales) {
  const localePath = path.join(localesDir, locale, 'messages.json');
  const localeMessages = JSON.parse(readFileSync(localePath, 'utf8'));
  for (const [key, baseEntrySummary] of baseSummary.entries()) {
    const localeEntry = localeMessages[key];
    if (!localeEntry) {
      errors.push(`${locale}: missing message key \"${key}\"`);
      continue;
    }

    const localeSummary = summariseEntry(localeEntry);

    const mismatchDetails = [];

    if (baseEntrySummary.tokens.join(',') !== localeSummary.tokens.join(',')) {
      mismatchDetails.push(
        `placeholder tokens ${localeSummary.tokens.join(',') || '[none]'} do not match base ${
          baseEntrySummary.tokens.join(',') || '[none]'
        }`
      );
    }

    if (baseEntrySummary.placeholders.join(',') !== localeSummary.placeholders.join(',')) {
      mismatchDetails.push(
        `placeholders definition ${localeSummary.placeholders.join(',') || '[none]'} does not match base ${
          baseEntrySummary.placeholders.join(',') || '[none]'
        }`
      );
    }

    if (
      baseEntrySummary.pluralPlaceholders.join(',') !==
      localeSummary.pluralPlaceholders.join(',')
    ) {
      mismatchDetails.push(
        `plural placeholders ${localeSummary.pluralPlaceholders.join(',') || '[none]'} do not match base ${
          baseEntrySummary.pluralPlaceholders.join(',') || '[none]'
        }`
      );
    }

    if (mismatchDetails.length > 0) {
      errors.push(`${locale}:${key} -> ${mismatchDetails.join('; ')}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Locale linting failed:\n- ' + errors.join('\n- '));
  process.exit(1);
}

console.log('Locale linting passed.');
