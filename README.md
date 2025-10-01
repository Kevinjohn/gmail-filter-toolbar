# Gmail Filter Toolbar

> Lightweight browser extension (Chrome & Firefox) that adds a powerful filtering toolbar to Gmail, letting you instantly view only the emails you want – calendar invites, attachments, starred messages, or regular mail – directly in your inbox or any folder.

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
14. [To-Do](#to-do)
15. [Licence](#licence)

---

## What It Does

Transform your Gmail inbox with instant, client-side filtering. A custom toolbar appears directly below Gmail's action bar, giving you one-click access to different views of your email:

| Filter Mode | What You See |
|-------------|--------------|
| **All Mail** | Everything – regular emails, calendar invites, attachments |
| **Mail Only** | Just regular emails (hides calendar invites) |
| **Calendar Only** | Only meeting invites and calendar-related emails |
| **Attachments Only** | Emails with files attached (documents, images, etc.) |
| **Favourites Only** | Your starred/important messages |

**Works everywhere in Gmail** – inbox, sent items, labels, search results, any folder you navigate to.

### Key Features

* **Instant filtering** – No page reload, no network calls, all client-side
* **Cross-browser** – Chrome, Edge, and Firefox support
* **Persistent filters** – Your selection survives pagination and navigation
* **Customizable UI** – Toggle button text visibility, choose toolbar alignment (left/center/right), select theme (light/dark/system)
* **Debug mode** – Visualize filtered emails with a blue tint instead of hiding them
* **Accessibility-first** – Full keyboard navigation and WCAG 2.1 AA compliant
* **Privacy-focused** – Zero external requests, all filtering happens locally
* **Multi-language ready** – Localizable strings with RTL language support

---

## Screenshots

| Toolbar (default) | Toolbar (debug mode) |
|-------------------|----------------------|
| ![](docs/screenshot_default.png) | ![](docs/screenshot_debug.png) |

---

## Requirements

* **Google Chrome / Microsoft Edge ≥ 114** (desktop)
* **Mozilla Firefox ≥ 121** (desktop)
* **Node ≥ 18** (for build & test tooling)
* macOS, Windows, or Linux

---

## Quick Start

### For Chrome/Edge

```bash
git clone https://github.com/Kevinjohn/chome-extension-gmail-calendar-options.git
cd chome-extension-gmail-calendar-options

# install dev dependencies
npm ci

# create dist/ with manifest and assets
npm run build

# load unpacked extension
# 1. Open chrome://extensions (or edge://extensions)
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" → select the dist/ folder
```

### For Firefox

```bash
git clone https://github.com/Kevinjohn/chome-extension-gmail-calendar-options.git
cd chome-extension-gmail-calendar-options

# install dev dependencies
npm ci

# create dist/ with Firefox manifest
npm run build:firefox

# load temporary extension
npx web-ext run --source-dir dist
```

Firefox will open automatically with the extension loaded.

**Or manually load**:
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to `dist/` folder
4. Select `manifest.json`

---

Open https://mail.google.com in a new tab – the **filter toolbar** appears just beneath Gmail's native action bar.

---

## Building for Production

### Building for Chrome/Edge

```bash
npm run build:chrome  # vite build → dist/
```

Upload to:
* **Chrome Web Store** (Partner Dash)
* **Edge Add-ons Store** (Partner Centre)

### Building for Firefox

```bash
npm run build:firefox        # Build Firefox version to dist/
npm run firefox:lint         # Validate Firefox extension
npm run firefox:package      # Create .zip for Mozilla Add-ons
```

The Firefox build includes:
- `browser_specific_settings.gecko.id` for AMO submission
- Dual background script declaration (service_worker + scripts)
- Same host permissions (requires user approval in Firefox)

Upload the generated ZIP from `artifacts/firefox/` to:
- **Mozilla Add-ons (AMO)**: https://addons.mozilla.org/developers/

The icons, manifest and artefacts in **dist/** meet all store publishing guidelines.

---

## Firefox-Specific Behavior

### Host Permissions
Unlike Chrome, Firefox requires users to manually grant permissions to mail.google.com:
1. Click the extension icon or shield icon in the address bar
2. Select "Always allow on mail.google.com"
3. Reload Gmail

### Temporary Installation
Extensions loaded via `about:debugging` are temporary and removed when Firefox closes. For permanent installation:
- Wait for Mozilla Add-ons (AMO) publication
- Or use Firefox Developer Edition with persistent profiles

### Background Scripts vs Service Workers
Firefox executes the background script as an event page (non-persistent background script) rather than a service worker. This is transparent to users but relevant for developers.

---

## Configuration Options

Access the extension options page via:
- **Chrome/Edge**: `chrome://extensions` → *Gmail Filter Toolbar* → **Extension options**
- **Firefox**: `about:addons` → *Gmail Filter Toolbar* → **Options**

### Available Settings

| Setting | Description |
|---------|-------------|
| **Debug Mode** | Show filtered emails with a blue tint (50% opacity) instead of hiding them – useful for verifying filter logic |
| **Show Button Text** | Toggle visibility of text labels on filter buttons (icons-only vs icons+text) |
| **Toolbar Alignment** | Position toolbar left, center, or right within Gmail's interface |
| **Theme** | Choose light, dark, or system theme preference |
| **Show Favourites Button** | Enable/disable the Favourites Only filter button |

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
├─ icons/                 # 16 / 32 / 48 / 128 px PNGs (for extension icon)
└─ manifest.json          # extension manifest (MV3)

_locales/                 # message bundles for i18n
tests/                    # Jest unit tests
dist/                     # build output (ignored in Git)
docs/                     # screenshots & diagrams
```

## Update Strategy

Gmail's user interface (UI) is dynamic and can change without notice. This extension relies on specific DOM selectors to inject its toolbar and filter email rows. If the extension stops working after a Gmail update, it's likely that one or more of these selectors have changed.

To update the selectors:

1.  **Inspect Gmail's DOM:** Open Gmail in your browser, right-click on the element that is no longer being targeted correctly (e.g., the main toolbar, an email row, or an attachment icon), and select "Inspect" or "Inspect Element".
2.  **Identify New Selectors:** In the browser's developer tools, examine the HTML structure around the element. Look for unique `id` attributes, `class` names, or `data-*` attributes that are stable and unlikely to change frequently.
3.  **Update `src/modules/constants.js`:** Open `src/modules/constants.js` and update the corresponding selector string in the `SELECTORS` object with the new, identified selector.
4.  **Test:** Rebuild the extension (`npm run build`) and load it unpacked in Chrome (`chrome://extensions`). Verify that the functionality is restored.
5.  **Consider Alternatives:** If a selector proves to be highly unstable, consider alternative approaches such as using `MutationObserver` to detect structural changes or relying on more general, less specific selectors combined with content analysis.

---

## How It Works


---

## How It Works

This extension is built on a few core principles: listening for the right moment to act, efficiently filtering the DOM, and persisting user choices.

**Important Note:** If you encounter issues with the filter not persisting after navigating between email pages, please consult `_remember_filter_on_pagination.md` for a detailed explanation of how dynamic content loading in Single-Page Applications (SPAs) like Gmail affects extension behaviour, and the architectural patterns used to address it.

**Important Note:**  If toolbar placement issues occur after Gmail pagination, usually with out toolbar appearing above/before the Gmail one, refer to `_remember_toolbar-placement.md` for detailed debugging steps and solutions.

1.  **Entry & Injection (`contentScript.js`)**:
    *   The `manifest.json` file defines `contentScript.js` as the entry point, which runs after the Gmail page is idle (`"run_at": "document_idle"`).
    *   The script first polls the DOM using `requestAnimationFrame` inside the `waitForGmailChrome` function until it finds a stable Gmail toolbar element (e.g., `.G-atb .G6`). This ensures the extension doesn't try to inject its UI before Gmail is ready.
    *   Once the anchor element is found, the script injects the filter toolbar HTML. The CSS (`styles.css`) is designed to force Gmail's native toolbar to wrap, making space for the new UI elements.
*   Additionally, `contentScript.js` dynamically injects the Material Symbols stylesheet from the Google Fonts CDN into the page's `<head>` to enable icon display.

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
| `npm run validate:env` | Sanity-check required Playwright/Chrome binaries |
| `npm run test:unit` | Jest unit+integration suites (serial for CI stability) |
| `npm test` | Jest runner (watch mode locally) |
| `npm run e2e` | Playwright specs (**temporarily disabled under WSL**; see WSL Playwright workaround) |
| `npm run test:e2e:ci` | Playwright in CI mode (`list,junit` reporters, currently disabled under WSL) |
| `npm run audit:options` | Lighthouse check against the built options page |
| `npm run lint` | ESLint with autofix for source modules |
| `npm run lint:locales` | Lints i18n message files for key/placeholder parity |
| `npm run format` | Prettier auto-format (JS/CSS/HTML/JSON under `src/`) |

---

## Testing

See `docs/testing-playbook.md` for the full test pyramid, fixtures, and debugging recipes. Quick reference commands:

* `npm run validate:env` ensures Playwright browsers and Chrome binaries are available before e2e runs.
* `npm run test:unit` executes the Jest unit and integration suites in-band; use `npm test` for watch mode while iterating locally.
* `npm run e2e` would drive Playwright UI flows, but all Chromium-launching suites are commented out under WSL until Chrome access stabilises (see below).
* `npm run lint:locales` validates that every locale matches the English key set and placeholder structure.
* `npm run lint` and `npm run format` keep source files consistent before committing.
* `npm run audit:options` performs a Lighthouse pass against `dist/options.html` and stores reports under `artifacts/lighthouse/`.
* Playwright e2e runs emit V8 coverage for `contentScript.js` in `artifacts/coverage/playwright/` (once WSL support is restored).

### WSL Playwright Workaround
- Chrome/Chromium cannot currently launch from inside WSL, so the Playwright fixtures and specs in `tests/e2e/` are commented out with inline notes.
- Leave those comments in place until you can supply a Windows-hosted Chrome binary to Playwright (for example by exporting `CHROME_PATH` or running the suite from Windows proper).
- After verifying `npm run validate:env` passes with a reachable Chrome executable, remove the block comments in `tests/e2e/fixtures/extension.js` and the accompanying spec files to reinstate the e2e suite.
- Re-run `npx playwright install` and `npm run e2e -- --reporter=line` from a Chrome-capable shell to confirm everything passes before submitting changes that re-enable the suite.

### Manual Smoke
1. Load the unpacked extension and confirm the toolbar injects beneath Gmail’s action bar.
2. Exercise all filter modes (All Mail, Mail Only, Calendar Only, Attachments Only, Favourites Only).
3. Toggle debug mode from the options page – filtered rows should tint blue at 50 % opacity.
4. Check keyboard navigation and ensure <kbd>Esc</kbd> returns focus to Gmail’s message list.
5. Force RTL (`dir="rtl"`) in DevTools and confirm icons/text mirror correctly.

### Accessibility
* Run Axe DevTools (or `npm run e2e -- tests/e2e/axe.spec.js` when it lands); expect **0 violations** on options and toolbar surfaces.

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
- [x] **1.2 – Translations (via AI)**
  - Add community-provided translations for French (fr), German (de), and Arabic (ar).
  - Complete translations for all untranslated message keys across all 24 locales (currently several keys like `options_show_text_legend`, `options_alignment_*`, `options_theme_*`, `button_filter_*` remain in English).
  - Add optional language switching UI to allow users to override browser default locale.

---

## To-Do

Thoughts for future development...
- Additional filter modes:
  - Out of Office / Auto responder emails
  - Note-taking apps (Google Keep, Evernote, etc.)
  - Unread only
  - Requires action/follow-up
- Store releases:
  - Chrome Web Store (pending)
  - Edge Add-ons (pending)
  - Mozilla Add-ons (pending)
- Community translations (non-AI)
- RTL language testing and refinement
- Enhanced accessibility testing with real screen readers

---

## Licence

MIT © [https://KevinjohnGallagher.com](KevinJohn Gallagher) – see [LICENCE](LICENCE) for full text.
