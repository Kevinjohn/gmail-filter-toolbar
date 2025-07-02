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

| Button | Result |
|---|---|
| **All Mail** | Show ordinary e-mails **and** calendar invites |
| **Mail Only** | Hide calendar invites |
| **Calendar Only** | Show **only** calendar invites |
| **Attachments Only** | Show **only** e-mails with attachments |

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

* **Tab** order: label → All Mail → Mail Only → Calendar Only → Attachments Only → Gmail’s own toolbar.
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
├─ colours.css            # light/dark/high-contrast theme variables
├─ options.html           # debug-mode checkbox
├─ icons/                 # 16 / 32 / 48 / 128 px PNGs
└─ manifest.json          # extension manifest (MV3)

_locales/                 # message bundles for i18n
tests/                    # Jest unit tests
dist/                     # build output (ignored in Git)
docs/                     # screenshots & diagrams
```

---

## How It Works

This extension is built on a few core principles: listening for the right moment to act, efficiently filtering the DOM, and persisting user choices.

1.  **Entry & Injection (`contentScript.js`)**:
    *   The `manifest.json` file defines `contentScript.js` as the entry point, which runs after the Gmail page is idle (`"run_at": "document_idle"`).
    *   The script first polls the DOM using `requestAnimationFrame` inside the `waitForGmailChrome` function until it finds a stable Gmail toolbar element (e.g., `.G-atb .G6`). This ensures the extension doesn't try to inject its UI before Gmail is ready.
    *   Once the anchor element is found, the script injects the filter toolbar HTML. The CSS (`styles.css`) is designed to force Gmail's native toolbar to wrap, making space for the new UI elements.

2.  **State Management (`background.js`, `options.js`)**:
    *   User preferences (the selected filter mode and the debug flag) are stored using the `chrome.storage.sync` API. This makes them persist across browser sessions and sync between devices.
    *   `background.js` sets a default filter mode (`ALL`) when the extension is first installed.
    *   `options.js` handles the logic for the debug mode checkbox on the extension's options page.

3.  **Filtering Logic (`contentScript.js`)**:
    *   When a filter button is clicked, the `currentMode` variable is updated, and the choice is saved to `chrome.storage.sync`.
    *   The `applyFilter` function is then called. It iterates through all email rows (identified by the selector `.UI tr.zA`).
    *   For each row, a helper function (`isCalendarRow` or `hasAttachmentRow`) determines if it matches the filter criteria. These helpers look for specific clues, like the presence of an `.ics` attachment image (`img[alt*=".ics"]`) or specific CSS classes that Gmail uses for attachments.
    *   Rows that should be hidden have their `style.display` set to `none`. In debug mode, they are instead made semi-transparent for inspection.

4.  **Dynamic Updates (`contentScript.js`)**:
    *   Gmail is a single-page application (SPA), so the list of emails can change without a full page reload (e.g., when paginating, searching, or receiving a new email).
    *   To handle this, a `MutationObserver` is attached to the main email list container. It listens for changes to the list of child elements (`childList: true`).
    *   When a change is detected, it calls `applyFilter` again (after a short debounce) to ensure the filter is correctly applied to the new set of email rows.

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
* Jest covers unit tests for core filtering logic (runs in JSDOM).

### Manual Smoke
1. Load unpacked extension.
2. Verify all four filter modes work as expected.
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

- [x] **1.1 – Core Functionality**
  - Initial release with four filtering modes, dark/light theme support, localization-ready strings, and keyboard accessibility.
- [ ] **1.2 – Edge Store Parity**
  - Automated build for `edge-zip` & Partner Centre pipeline.
- [ ] **1.3 – Translations**
  - Add community-provided translations for French (fr), German (de), and Arabic (ar).
- [ ] **2.0 – Optional AI Summary**
  - GPT-based invite digest (subject to privacy review).

---

## Licence

MIT © Kevin John – see [LICENCE](LICENCE) for full text.
