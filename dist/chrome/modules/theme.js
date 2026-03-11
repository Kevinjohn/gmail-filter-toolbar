import { THEMES } from './constants.js';

const VALID_THEMES = new Set(Object.values(THEMES));

export function normalizeTheme(theme) {
  return VALID_THEMES.has(theme) ? theme : THEMES.SYSTEM;
}

export function applyTheme(targetDocument, theme) {
  const doc = targetDocument ?? document;
  const root = doc?.documentElement;

  if (!root) {
    return;
  }

  const normalized = normalizeTheme(theme);

  root.setAttribute('data-gcal-theme', normalized);
}
