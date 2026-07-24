import { THEMES } from './constants.js';

const VALID_THEMES = new Set(Object.values(THEMES));

export function normalizeTheme(theme) {
  return VALID_THEMES.has(theme) ? theme : THEMES.SYSTEM;
}

function parseCssColor(value) {
  if (!value) return null;
  const match = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function isDarkColor({ r, g, b }) {
  // Relative luminance approximation (ITU-R BT.709); below 0.5 reads as a dark surface.
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
}

/**
 * Detects the theme Gmail is actually rendering by sampling the effective background colour
 * around the toolbar area.
 *
 * WHY: Gmail's dark theme is a Gmail *setting*, independent of the OS — a user with a light OS and
 * dark Gmail is very common. Resolving "system" via prefers-color-scheme alone would inject a light
 * toolbar slab into a dark inbox. Sampling the page's rendered background follows whatever Gmail
 * actually shows.
 *
 * @param {Document} doc
 * @returns {'light'|'dark'|null} The detected theme, or null when indeterminate (not a Gmail page,
 * transparent backgrounds, background images, or no layout yet).
 */
export function detectGmailTheme(doc = document) {
  // Only sample on Gmail itself — on the options page the body background derives from our own
  // theme variables, so sampling there would be circular.
  const hostname = doc.location?.hostname ?? doc.defaultView?.location?.hostname;
  if (hostname !== 'mail.google.com') return null;

  const view = doc.defaultView;
  if (!view?.getComputedStyle) return null;

  const startElements = [doc.querySelector('.aeH'), doc.body].filter(Boolean);
  for (const startElement of startElements) {
    // Walk up until a non-transparent background colour is found.
    for (let element = startElement; element; element = element.parentElement) {
      const color = parseCssColor(view.getComputedStyle(element).backgroundColor);
      if (color && color.a > 0.1) {
        return isDarkColor(color) ? THEMES.DARK : THEMES.LIGHT;
      }
    }
  }
  return null;
}

export function applyTheme(targetDocument, theme) {
  const doc = targetDocument ?? document;
  const root = doc?.documentElement;

  if (!root) {
    return;
  }

  let normalized = normalizeTheme(theme);

  // Resolve "system" against Gmail's rendered theme when we can detect it; otherwise leave it as
  // "system" so the CSS prefers-color-scheme fallback applies (e.g. on the options page).
  if (normalized === THEMES.SYSTEM) {
    const detected = detectGmailTheme(doc);
    if (detected) {
      normalized = detected;
    }
  }

  root.setAttribute('data-gcal-theme', normalized);
}
