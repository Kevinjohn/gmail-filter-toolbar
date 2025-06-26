> Lightweight MV3 extension that lets Gmail users toggle the visibility of calendar-related e-mails directly inside the web interface.

---

## Table of Contents

1. [Features](#features)  
2. [Screenshots](#screenshots)  
3. [Requirements](#requirements)  
4. [Quick Start](#quick-start)  
5. [Building for Production](#building-for-production)  
6. [Debug Mode](#debug-mode)  
7. [Keyboard & Accessibility Notes](#keyboard--accessibility-notes)  
8. [Localisation](#localisation)  
9. [Project Structure](#project-structure)  
10. [Scripts](#scripts)  
11. [Testing](#testing)  
12. [Contributing](#contributing)  
13. [Road-map](#road-map)  
14. [Licence](#licence)

---

## Features

| Button | Result | Status text (right-hand side) |
|--------|--------|--------------------------------|
| **Yes** | Show ordinary e-mails **and** calendar invites | “Showing e-mails and calendar invites” |
| **No** | Hide calendar invites only | “Calendar is hidden” |
| **Only** | Show **only** calendar invites | “Only showing calendars” |

* MV3-compliant (`service_worker` background, no persistent pages).  
* Zero network calls – all filtering happens client-side.  
* **Debug mode** tints hidden rows blue at 50 % opacity.  
* Fully keyboard accessible and WCAG 2.1 AA compliant.  
* Strings externalised for easy translation (`_locales`).  
* CSS uses logical properties so RTL languages render correctly.

---

## Screenshots

| Toolbar (default) | Toolbar (debug mode) |
|-------------------|----------------------|
| ![](docs/screenshot_default.png) | ![](docs/screenshot_debug.png) |

*(PNG placeholders – update after first build)*

---

## Requirements

* **Google Chrome / Microsoft Edge ≥ 114** (desktop)  
* **Node ≥ 18** (for build & test tooling)  
* macOS, Windows, or Linux

---

## Quick Start

```bash
git clone https://github.com/Kevinjohn/chome-extension-gmail-calendar-options.git
cd chome-extension-gmail-calendar-options

# install dev dependencies
npm ci

# create dist/ with manifest and assets
npm run build

# load unpacked extension
# 1. Open chrome://extensions (or edge://extensions)
# 2. Enable “Developer mode”
# 3. Click “Load unpacked” → select the dist/ folder
```

Open https://mail.google.com in a new tab – the **Calendar options** toolbar appears just beneath Gmail’s native action bar.

---

## Building for Production

```bash
npm run build         # vite build → dist/
npm run zip           # packages dist/ into gmail_calendar_options.zip
```

Upload the zip file to:

* **Chrome Web Store** (Partner Dash)  
* **Edge Add-ons Store** (Partner Centre)

The icons, manifest and artefacts in **dist/** meet both stores’ publishing guidelines.

---

## Debug Mode

1. Go to **chrome://extensions** → *Calendar Options* → **Details**.  
2. Click **Extension options**.  
3. Tick **Enable debug mode (show filtered rows in blue)**.  

Toggled rows are no longer hidden; they render with a light-blue overlay at 50 % opacity, so you can visually verify the filter logic during development.

---

## Keyboard & Accessibility Notes

* **Tab** order: label → Yes → No → Only → Gmail’s own toolbar.  
* **Escape** pressed anywhere inside the custom toolbar moves focus back to the message list (`.UI`) and announces the region to screen-reader users.  
* `aria-pressed` reflects button state; status text has `aria-live="polite"` for dynamic updates.

---

## Localisation

All user-facing strings live in:

```
_locales/
  en/
    messages.json
  en_GB/
    messages.json
  # add fr, de, ar, etc. as needed
```

Use Chrome’s i18n API in the code:

```js
chrome.i18n.getMessage('button_yes');
```

CSS relies on logical properties (`padding-inline-start`) so RTL languages mirror automatically.

---

## Project Structure

```
src/
├─ background.js          # MV3 service worker
├─ contentScript.js       # injects toolbar & filters rows
├─ styles.css             # toolbar styling
├─ options.html           # debug-mode checkbox
├─ icons/                 # 16 / 32 / 48 / 128 px PNGs
└─ manifest.json          # extension manifest (MV3)

_locales/                 # message bundles for i18n
tests/                    # Jest unit tests
dist/                     # build output (ignored in Git)
docs/                     # screenshots & diagrams
```

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Vite build → `dist/` |
| `npm run zip` | Zip `dist/` for store upload |
| `npm test` | Run Jest unit tests |
| `npm run lint` | ESLint source files |
| `npm run format` | Prettier auto-format (optional) |

---

## Testing

### Unit
* Jest covers unit tests such as `tests/isCalendarRow.test.js` (runs in JSDOM).
* Playwright verifies keyboard and focus behaviour.

### Manual Smoke
1. Load unpacked extension.  
2. Verify three filter modes & status text.  
3. Toggle debug mode – hidden rows tint blue.  
4. Test keyboard navigation & Esc focus return.  
5. Force RTL (`dir="rtl"`) in DevTools – toolbar mirrors.

### Accessibility
* Run Axe DevTools; expect **0 violations**.

---

## Contributing

Pull requests are welcome! Before raising a PR:

1. Create an issue describing the proposal.  
2. `git checkout -b feature/your-branch`  
3. Ensure `npm test && npm run lint` pass.  
4. Update `CHANGELOG.md` under **Unreleased**.  
5. Open the PR against `main`.

---

## Road-map

- [ ] **1.1 – Fast-follow**  
  - Locale bundles, logical CSS, Esc focus trapping, CHANGELOG & CI hook.  
- [ ] **1.2 – Edge Store parity**  
  - Automated build edge-zip & Partner Centre pipeline.  
- [ ] **1.3 – Translations**  
  - French (fr), German (de), Arabic (ar).  
- [ ] **2.0 – Optional AI summary**  
  - GPT-based invite digest (subject to privacy review).

---

## Licence

MIT © Kevin John – see [LICENCE](LICENCE) for full text.
