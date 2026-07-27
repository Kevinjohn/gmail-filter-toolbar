import { expect, test } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const localesDir = path.join(process.cwd(), 'src', '_locales');
const baseLocale = 'en';
const baseMessages = JSON.parse(
  fs.readFileSync(path.join(localesDir, baseLocale, 'messages.json'), 'utf8'),
);

const requiredKeys = new Set(Object.keys(baseMessages));
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

test('English locale messages are non-empty', () => {
  for (const val of Object.values(baseMessages)) {
    expect(val.message).toBeTruthy();
  }
});

test('all locales include required keys with non-empty values', () => {
  const locales = fs.readdirSync(localesDir);
  expect(new Set(locales)).toEqual(supportedLocales);

  for (const locale of locales) {
    const localeMessages = JSON.parse(
      fs.readFileSync(path.join(localesDir, locale, 'messages.json'), 'utf8'),
    );
    expect(supportedLocales).toContain(locale);
    expect(new Set(Object.keys(localeMessages))).toEqual(requiredKeys);
    expect(localeMessages.extension_name.message).toBe('Gmail Filter Toolbar');

    for (const key of requiredKeys) {
      expect(localeMessages).toHaveProperty(key);
      expect(localeMessages[key].message).toBeTruthy();
    }
  }
});

test('localisation issue template requests the complete current base locale', () => {
  const template = fs.readFileSync(
    path.join(process.cwd(), '.github', 'ISSUE_TEMPLATE', 'localisation_request.md'),
    'utf8',
  );

  expect(template).toContain('src/_locales/en/messages.json');
  expect(template).toContain('translate every `message`');
  expect(template).not.toContain('YOUR TRANSLATION HERE');
});
