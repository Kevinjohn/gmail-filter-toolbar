#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const localesDir = path.join(process.cwd(), 'src', '_locales');
const baseLocale = 'en';
const supportedLocales = new Set([
  'ar',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'en_GB',
  'es',
  'es_419',
  'fi',
  'fr',
  'hi',
  'hu',
  'it',
  'nl',
  'no',
  'pl',
  'pt_BR',
  'pt_PT',
  'ro',
  'ru',
  'sv',
  'tr',
  'uk',
  'zh_CN',
]);

const baseMessages = JSON.parse(
  readFileSync(path.join(localesDir, baseLocale, 'messages.json'), 'utf8'),
);

const placeholderTokenPattern = /\$(?:\d+|[a-zA-Z][a-zA-Z0-9_]*\$)/g;

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
  const namedTokens = Array.from(tokens)
    .filter((token) => token.endsWith('$'))
    .map((token) => token.slice(1, -1).toLowerCase())
    .sort();
  const placeholderNames = placeholders.map((name) => name.toLowerCase()).sort();
  const unmatchedText = (entry.message ?? '').replace(placeholderTokenPattern, '');
  return {
    placeholders: placeholders.sort(),
    pluralPlaceholders: pluralPlaceholders.sort(),
    tokens: Array.from(tokens).sort(),
    valid: !unmatchedText.includes('$') && namedTokens.join(',') === placeholderNames.join(','),
  };
};

const baseSummary = new Map(
  Object.entries(baseMessages).map(([key, entry]) => [key, summariseEntry(entry)]),
);

const errors = [];

// WHY: Only treat directories as locales — a stray file in src/_locales (e.g. macOS .DS_Store)
// would otherwise crash the linter with an unhandled readFileSync exception instead of a lint error.
const locales = readdirSync(localesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const locale of supportedLocales) {
  if (!locales.includes(locale)) {
    errors.push(`${locale}: required locale directory is missing`);
  }
}

for (const locale of locales) {
  if (!supportedLocales.has(locale)) {
    errors.push(`${locale}: unsupported Chrome locale directory`);
  }
  const localePath = path.join(localesDir, locale, 'messages.json');
  const localeMessages = JSON.parse(readFileSync(localePath, 'utf8'));
  for (const [key, baseEntrySummary] of baseSummary.entries()) {
    const localeEntry = localeMessages[key];
    if (!localeEntry) {
      errors.push(`${locale}: missing message key "${key}"`);
      continue;
    }

    const localeSummary = summariseEntry(localeEntry);

    const mismatchDetails = [];

    if (!localeSummary.valid) {
      mismatchDetails.push('placeholder tokens and definitions are not internally consistent');
    }

    if (baseEntrySummary.tokens.join(',') !== localeSummary.tokens.join(',')) {
      mismatchDetails.push(
        `placeholder tokens ${localeSummary.tokens.join(',') || '[none]'} do not match base ${
          baseEntrySummary.tokens.join(',') || '[none]'
        }`,
      );
    }

    if (baseEntrySummary.placeholders.join(',') !== localeSummary.placeholders.join(',')) {
      mismatchDetails.push(
        `placeholders definition ${localeSummary.placeholders.join(',') || '[none]'} does not match base ${
          baseEntrySummary.placeholders.join(',') || '[none]'
        }`,
      );
    }

    if (
      baseEntrySummary.pluralPlaceholders.join(',') !== localeSummary.pluralPlaceholders.join(',')
    ) {
      mismatchDetails.push(
        `plural placeholders ${localeSummary.pluralPlaceholders.join(',') || '[none]'} do not match base ${
          baseEntrySummary.pluralPlaceholders.join(',') || '[none]'
        }`,
      );
    }

    if (mismatchDetails.length > 0) {
      errors.push(`${locale}:${key} -> ${mismatchDetails.join('; ')}`);
    }
  }
  for (const key of Object.keys(localeMessages)) {
    if (!baseSummary.has(key)) {
      errors.push(`${locale}: unexpected message key "${key}"`);
    }
  }
  if (localeMessages.extension_name?.message !== 'Gmail Filter Toolbar') {
    errors.push(`${locale}: extension_name must use the invariant product brand`);
  }
}

if (errors.length > 0) {
  console.error('Locale linting failed:\n- ' + errors.join('\n- '));
  process.exit(1);
}

console.log('Locale linting passed.');
