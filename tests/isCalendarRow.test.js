import { expect, test } from '@jest/globals';
import fs from 'fs';

// Extract just the isCalendarRow() source without running the whole script
const script = fs.readFileSync('src/contentScript.js', 'utf8');
const match = script.match(/function\s+isCalendarRow\(row\)\s*{[\s\S]*?}/);
let isCalendarRow;
if (match) {
  // eslint-disable-next-line no-eval
  eval(`${match[0]}`);
}

test('detects invitation by subject', () => {
  document.body.innerHTML = '<table class="UI"><tr class="zA"><td class="bog">Invitation: Meeting</td></tr></table>';
  const row = document.querySelector('tr');
  expect(isCalendarRow(row)).toBe(true);
});
