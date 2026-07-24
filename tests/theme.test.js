import { describe, test, expect } from '@jest/globals';
import { normalizeTheme, applyTheme, detectGmailTheme } from '../src/modules/theme.js';
import { THEMES } from '../src/modules/constants.js';
import { JSDOM } from 'jsdom';

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

describe('detectGmailTheme', () => {
  const makeGmailDocument = (backgroundColor) => {
    const dom = new JSDOM('<div class="aeH"></div>', { url: 'https://mail.google.com/mail/u/0/' });
    const doc = dom.window.document;
    if (backgroundColor) {
      doc.body.style.backgroundColor = backgroundColor;
    }
    return doc;
  };

  test('detects dark theme from a dark rendered background', () => {
    const doc = makeGmailDocument('rgb(32, 33, 36)');
    expect(detectGmailTheme(doc)).toBe(THEMES.DARK);
  });

  test('detects light theme from a light rendered background', () => {
    const doc = makeGmailDocument('rgb(255, 255, 255)');
    expect(detectGmailTheme(doc)).toBe(THEMES.LIGHT);
  });

  test('returns null off Gmail (options page must not sample its own theme)', () => {
    const dom = new JSDOM('<div class="aeH"></div>', { url: 'https://example.com/' });
    const doc = dom.window.document;
    doc.body.style.backgroundColor = 'rgb(0, 0, 0)';
    expect(detectGmailTheme(doc)).toBeNull();
  });

  test('returns null when backgrounds are transparent/indeterminate', () => {
    const doc = makeGmailDocument();
    expect(detectGmailTheme(doc)).toBeNull();
  });
});

describe('applyTheme system resolution', () => {
  test('resolves system to the detected Gmail theme', () => {
    const dom = new JSDOM('<div class="aeH"></div>', { url: 'https://mail.google.com/' });
    const doc = dom.window.document;
    doc.body.style.backgroundColor = 'rgb(32, 33, 36)';
    applyTheme(doc, THEMES.SYSTEM);
    expect(doc.documentElement.getAttribute('data-gcal-theme')).toBe(THEMES.DARK);
  });

  test('keeps system when Gmail theme cannot be detected', () => {
    const doc = document.implementation.createHTMLDocument('theme');
    applyTheme(doc, THEMES.SYSTEM);
    expect(doc.documentElement.getAttribute('data-gcal-theme')).toBe(THEMES.SYSTEM);
  });

  test('explicit themes are never overridden by detection', () => {
    const dom = new JSDOM('<div class="aeH"></div>', { url: 'https://mail.google.com/' });
    const doc = dom.window.document;
    doc.body.style.backgroundColor = 'rgb(32, 33, 36)';
    applyTheme(doc, THEMES.LIGHT);
    expect(doc.documentElement.getAttribute('data-gcal-theme')).toBe(THEMES.LIGHT);
  });
});
