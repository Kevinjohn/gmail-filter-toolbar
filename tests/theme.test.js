import { describe, test, expect } from '@jest/globals';
import { normalizeTheme, applyTheme } from '../src/modules/theme.js';
import { THEMES } from '../src/modules/constants.js';

describe('normalizeTheme', () => {
  test('returns provided theme when valid', () => {
    expect(normalizeTheme(THEMES.DARK)).toBe(THEMES.DARK);
  });

  test('falls back to system when invalid', () => {
    expect(normalizeTheme('invalid')).toBe(THEMES.SYSTEM);
  });
});

describe('applyTheme', () => {
  test('sets data attribute on document element', () => {
    const doc = document.implementation.createHTMLDocument('theme');
    applyTheme(doc, THEMES.LIGHT);
    expect(doc.documentElement.getAttribute('data-gcal-theme')).toBe(THEMES.LIGHT);
  });

  test('ignores when document element missing', () => {
    const stubDoc = { documentElement: null };
    expect(() => applyTheme(stubDoc, 'ignored')).not.toThrow();
  });
});
