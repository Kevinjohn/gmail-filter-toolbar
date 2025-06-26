import { expect, test } from '@jest/globals';
import fs from 'fs';

const messages = JSON.parse(
  fs.readFileSync('src/_locales/en/messages.json', 'utf8')
);

test('all locale messages are non-empty', () => {
  for (const val of Object.values(messages)) {
    expect(val.message).toBeTruthy();
  }
});
