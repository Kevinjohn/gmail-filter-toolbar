import { expect, test } from '@jest/globals';
import fs from 'fs';

// Extract just the isCalendarRow() source without running the whole script
const script = fs.readFileSync('src/contentScript.js', 'utf8');
const match = script.match(/function\s+isCalendarRow\(row\)\s*{[\s\S]*?}/);
let isCalendarRow;
if (match) {
  // eslint-disable-next-line no-eval
  isCalendarRow = eval(`(${match[0]})`);  
}

test('detects invitation by subject', () => {
  document.body.innerHTML = '<table class="UI"><tr class="zA"><td class="bog">Invitation: Meeting</td></tr></table>';
  const row = document.querySelector('tr');
  // jsdom lacks `innerText` so copy from `textContent` for the test
  const cell = row.querySelector('.bog');
  if (cell && cell.textContent && !('innerText' in cell)) {
    Object.defineProperty(cell, 'innerText', { value: cell.textContent, configurable: true });
  }
  expect(isCalendarRow(row)).toBe(true);
});
