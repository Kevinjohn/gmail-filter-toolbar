import { expect, test } from '@jest/globals';
import { JSDOM } from 'jsdom';
import fs from 'fs';

const script = fs.readFileSync('src/contentScript.js', 'utf8');
const { window } = new JSDOM('<table class="UI"><tr class="zA"><td class="bog">Invitation: Meeting</td></tr></table>');
window.document.body.innerHTML += '';

let isCalendarRow;
const exports = {};
eval(script + '\n;isCalendarRow = globalThis.isCalendarRow || isCalendarRow;');

test('detects invitation by subject', () => {
  const row = window.document.querySelector('tr');
  expect(isCalendarRow(row)).toBe(true);
});
