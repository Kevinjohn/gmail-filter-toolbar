import { expect, test } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const localesDir = path.join(process.cwd(), 'src', '_locales');
const baseLocale = 'en';
const baseMessages = JSON.parse(
  fs.readFileSync(path.join(localesDir, baseLocale, 'messages.json'), 'utf8')
);

const requiredKeys = new Set(Object.keys(baseMessages));

test('English locale messages are non-empty', () => {
  for (const val of Object.values(baseMessages)) {
    expect(val.message).toBeTruthy();
  }
});

test('all locales include required keys with non-empty values', () => {
  const locales = fs.readdirSync(localesDir).filter((dir) => dir !== baseLocale);

  for (const locale of locales) {
    const localeMessages = JSON.parse(
      fs.readFileSync(path.join(localesDir, locale, 'messages.json'), 'utf8')
    );

    for (const key of requiredKeys) {
      expect(localeMessages).toHaveProperty(key);
      expect(localeMessages[key].message).toBeTruthy();
    }
  }
});
