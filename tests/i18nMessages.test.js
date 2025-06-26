import { expect, test } from '@jest/globals';
import messages from '../_locales/en/messages.json' assert { type: 'json' };

test('all locale messages are non-empty', () => {
  for (const val of Object.values(messages)) {
    expect(val.message).toBeTruthy();
  }
});
