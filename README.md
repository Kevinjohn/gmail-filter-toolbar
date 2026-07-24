# Gmail Filter Toolbar

> Lightweight browser extension (Chrome & Firefox) that adds a powerful filtering toolbar to Gmail, letting you instantly view only the emails you want – calendar invites, attachments, starred messages, or regular mail – directly in your inbox or any folder.

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [Requirements](#requirements)
3. [Quick Start](#quick-start)
4. [Building for Production](#building-for-production)
5. [Debug Mode](#debug-mode)
6. [Keyboard & Accessibility Notes](#keyboard--accessibility-notes)
7. [Localisation](#localisation)
8. [Project Structure](#project-structure)
9. [Scripts](#scripts)
10. [Testing](#testing)
11. [Contributing](#contributing)
12. [Licence](#licence)

---

## What It Does

Transform your Gmail inbox with instant, client-side filtering. A custom toolbar appears directly below Gmail's action bar, giving you one-click access to different views of your email:

| Filter Mode                                | What You See                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **All Mail**                               | Everything – regular emails, calendar invites, attachments                                                                           |
| **Mail Only**                              | Just regular emails (hides calendar invites)                                                                                         |
| **Calendar Only**                          | Only meeting invites and calendar-related emails                                                                                     |
| **Attachments Only**                       | Emails with files attached (documents, images, etc.)                                                                                 |
| **Favourites Only**                        | Your starred/important messages                                                                                                      |
| **Images / PDFs / Docs / Sheets / Slides** | Emails containing the selected attachment type                                                                                       |
| **AI & Transcription** _(experimental)_    | Emails from AI services (Gemini, ChatGPT, Claude, etc.) and transcription tools (Otter.ai, Fathom, Fireflies.ai) – enable in options |
| **Dev** _(experimental)_                   | GitHub and GitLab notification emails – enable in options                                                                            |

**Works everywhere in Gmail** – inbox, sent items, labels, search results, any folder you navigate to.

### Key Features

- **Instant filtering** – No page reload, no network calls, all client-side
- **Cross-browser** – Chrome, Edge, and Firefox support
- **Persistent filters** – Your selection survives pagination and navigation
- **Customizable UI** – Toggle button text visibility, choose start/center alignment, select theme (light/dark/system)
- **Debug mode** – Visualize filtered emails with a blue tint instead of hiding them
- **Accessibility-first** – Full keyboard navigation and WCAG 2.1 AA compliant
- **Privacy-focused** – Zero external requests, all filtering happens locally
- **Multi-language ready** – Localizable strings with RTL language support

---

## Requirements

- **Google Chrome / Microsoft Edge ≥ 114** (desktop)
- **Mozilla Firefox ≥ 121** (desktop)
- **Safari ≥ 15.4** (macOS only, requires Xcode)
- **Node ≥ 20** (for build & test tooling)
- macOS, Windows, or Linux

---

## Quick Start

### For Chrome/Edge

```bash
git clone https://github.com/Kevinjohn/gmail-filter-toolbar.git
cd gmail-filter-toolbar

# install dev dependencies
pnpm install --frozen-lockfile

# create dist/chrome/ with manifest and assets
pnpm run build:chrome

# load unpacked extension
# 1. Open chrome://extensions (or edge://extensions)
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" → select the dist/chrome/ folder
```

### For Firefox

```bash
git clone https://github.com/Kevinjohn/gmail-filter-toolbar.git
cd gmail-filter-toolbar

# install dev dependencies
pnpm install --frozen-lockfile

# create dist/firefox/ with Firefox manifest
pnpm run build:firefox

# load temporary extension
pnpm exec web-ext run --source-dir dist/firefox
```

Firefox will open automatically with the extension loaded.

**Or manually load**:

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to `dist/firefox/` folder
4. Select `manifest.json`

### For Safari (macOS only)

```bash
git clone https://github.com/Kevinjohn/gmail-filter-toolbar.git
cd gmail-filter-toolbar

# install dev dependencies
pnpm install --frozen-lockfile

# create dist/safari/ and generate Xcode project
pnpm run safari:convert

# open in Xcode
pnpm run safari:open
```

In Xcode:

1. Build and Run (Cmd+R)
2. Safari will launch
3. Go to Safari > Preferences > Extensions
4. Enable "Gmail Filter Toolbar"
5. Grant permissions when prompted

**Note:** Safari extensions require an Xcode wrapper app. Settings use synced storage when
available and otherwise remain local to the device.

---

Open https://mail.google.com in a new tab – the **filter toolbar** appears just beneath Gmail's native action bar.

---

## Building for Production

### Building for Chrome/Edge

```bash
pnpm run build:chrome  # vite build → dist/chrome/
```

Upload to:

- **Chrome Web Store** (Partner Dash)
- **Edge Add-ons Store** (Partner Centre)

### Building for Firefox

```bash
pnpm run build:firefox        # Build Firefox version to dist/firefox/
pnpm run firefox:lint         # Validate Firefox extension
pnpm run firefox:package      # Create .zip for Mozilla Add-ons
```

The Firefox build includes:

- `browser_specific_settings.gecko.id` for AMO submission
- Firefox background script declaration using `background.scripts`
- Same host permissions (requires user approval in Firefox)

Upload the generated ZIP from `artifacts/firefox/` to:

- **Mozilla Add-ons (AMO)**: https://addons.mozilla.org/developers/

Validate the generated ZIPs and store metadata before each submission.

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

- **Chrome/Edge**: `chrome://extensions` → _Gmail Filter Toolbar_ → **Extension options**
- **Firefox**: `about:addons` → _Gmail Filter Toolbar_ → **Options**

### Available Settings

| Setting                                             | Description                                                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Debug Mode**                                      | Show filtered emails with a blue tint (50% opacity) instead of hiding them – useful for verifying filter logic |
| **Show Button Text**                                | Toggle visibility of text labels on filter buttons (icons-only vs icons+text)                                  |
| **Toolbar Alignment**                               | Position the toolbar at the logical start or centre of Gmail's interface                                       |
| **Theme**                                           | Choose light, dark, or system theme preference                                                                 |
| **Show Favourites Button**                          | Enable/disable the Favourites Only filter button                                                               |
| **Show AI & Transcription Button** _(experimental)_ | Enable/disable the AI & Transcription filter button                                                            |
| **Show Dev Notifications Button** _(experimental)_  | Enable/disable the Dev Notifications filter button                                                             |

---

## Keyboard & Accessibility Notes

- **Tab** enters the radio group at the selected filter; use **Left/Right Arrow** to move and select.
- **Escape** pressed anywhere inside the custom toolbar moves focus back to the message list (`.UI`) and announces the region to screen-reader users.
- `aria-checked` reflects radio state; status text has `aria-live="polite"` for dynamic updates.

---

## Localisation

All user-facing strings live in:

```
src/_locales/
  en/
    messages.json
  en_GB/
    messages.json
  de/
  fr/
  es_419/
  ar/
  # Chrome-supported locale identifiers only
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
├─ contentScript.js       # entry point: injects toolbar & coordinates filtering
├─ modules/
│  ├─ background.js       # MV3 service worker (sets install defaults)
│  ├─ constants.js        # Gmail selectors, config, storage keys, enums
│  ├─ state.js            # global state + load/save via chrome.storage
│  ├─ toolbar.js          # toolbar creation & injection
│  ├─ filter.js           # row detection & show/hide logic
│  ├─ observers.js        # MutationObservers & DOM polling
│  ├─ theme.js            # light/dark/system theme handling
│  ├─ storage.js          # cross-browser storage abstraction
│  ├─ options.js          # options page logic
│  └─ utils/debounce.js   # debounce helper
├─ _locales/              # message bundles for i18n
├─ assets/fonts/          # bundled Material Symbols icon font (subsetted)
├─ icons/                 # 16 / 32 / 48 / 128 px PNGs (for extension icon)
├─ styles.css             # toolbar styling
├─ colours.css            # light/dark/high-contrast theme variables
├─ options.html           # extension options page
├─ manifest.json          # Chrome/Edge manifest (MV3)
├─ manifest.firefox.json  # Firefox manifest (MV3)
└─ manifest.safari.json   # Safari manifest (MV3)

tests/                    # Jest unit tests + Playwright e2e suites
scripts/                  # build, release & validation scripts
dist/                     # build output (dist/chrome/, dist/firefox/, dist/safari/)
docs/                     # additional documentation
```

## Update Strategy

Gmail's user interface (UI) is dynamic and can change without notice. This extension relies on specific DOM selectors to inject its toolbar and filter email rows. If the extension stops working after a Gmail update, it's likely that one or more of these selectors have changed.

To update the selectors:

1.  **Inspect Gmail's DOM:** Open Gmail in your browser, right-click on the element that is no longer being targeted correctly (e.g., the main toolbar, an email row, or an attachment icon), and select "Inspect" or "Inspect Element".
2.  **Identify New Selectors:** In the browser's developer tools, examine the HTML structure around the element. Look for unique `id` attributes, `class` names, or `data-*` attributes that are stable and unlikely to change frequently.
3.  **Update `src/modules/constants.js`:** Open `src/modules/constants.js` and update the corresponding selector string in the `SELECTORS` object with the new, identified selector.
4.  **Test:** Rebuild the extension (`pnpm run build`) and load it unpacked in Chrome (`chrome://extensions`). Verify that the functionality is restored.
5.  **Consider Alternatives:** If a selector proves to be highly unstable, consider alternative approaches such as using `MutationObserver` to detect structural changes or relying on more general, less specific selectors combined with content analysis.

---

## How It Works

This extension is built on a few core principles: listening for the right moment to act, efficiently filtering the DOM, and persisting user choices.

**Important Note:** If you encounter issues with the filter not persisting after navigating between email pages, please consult `_remember_filter_on_pagination.md` for a detailed explanation of how dynamic content loading in Single-Page Applications (SPAs) like Gmail affects extension behaviour, and the architectural patterns used to address it.

**Important Note:** If toolbar placement issues occur after Gmail pagination, usually with out toolbar appearing above/before the Gmail one, refer to `_remember_toolbar-placement.md` for detailed debugging steps and solutions.

1.  **Entry & Injection (`contentScript.js`)**:
    - The `manifest.json` file defines `contentScript.js` as the entry point, which runs after the Gmail page is idle (`"run_at": "document_idle"`).
    - The script first polls the DOM using `requestAnimationFrame` inside the `waitForGmailToolbar` function until it finds a stable Gmail toolbar element (e.g., `.G-atb .G6`). This ensures the extension doesn't try to inject its UI before Gmail is ready.
    - Once the anchor element is found, the script injects the filter toolbar HTML. The CSS (`styles.css`) is designed to force Gmail's native toolbar to wrap, making space for the new UI elements.

- Toolbar icons use a locally bundled, subsetted Material Symbols Outlined font (`src/assets/fonts/`), injected via the manifest's `content_scripts` CSS — no external network requests are made.

2.  **State Management (`background.js`, `options.js`)**:
    - User preferences (the selected filter mode and the debug flag) are stored using the `chrome.storage.sync` API. This makes them persist across browser sessions and sync between devices.
    - `background.js` sets a default filter mode (`ALL`) when the extension is first installed.
    - `options.js` handles the logic for the debug mode checkbox on the extension's options page.

3.  **Filtering Logic (`contentScript.js`)**:
    - When a filter button is clicked, the `currentMode` variable is updated, and the choice is saved to `chrome.storage.sync`.
    - The `applyFilter` function is then called. It iterates through all email rows (identified by the selector `.UI tr.zA`).
    - For each row, a helper function (`isCalendarRow` or `hasAttachmentRow`) determines if it matches the filter criteria. These helpers look for specific clues, like the presence of an `.ics` attachment image (`img[alt*=".ics"]`) or specific CSS classes that Gmail uses for attachments.
    - Rows that should be hidden have their `style.display` set to `none`. In debug mode, they are instead made semi-transparent for inspection.

4.  **Dynamic Updates (`contentScript.js`)**:
    - Gmail is a single-page application (SPA), so the list of emails can change without a full page reload (e.g., when paginating, searching, or receiving a new email).
    - To handle this, a `MutationObserver` is attached to the main email list container. It listens for changes to the list of child elements (`childList: true`).

- When a subtree change is detected, it calls `applyFilter` again (after a short debounce) to ensure the filter is correctly applied to the new set of email rows.

---

## Scripts

| Command                  | Purpose                                                                      |
| ------------------------ | ---------------------------------------------------------------------------- |
| `pnpm run build`         | Vite build → `dist/chrome/` and `dist/firefox/`                              |
| `pnpm run build:chrome`  | Vite build → `dist/chrome/` only                                             |
| `pnpm run build:firefox` | Vite build → `dist/firefox/` only                                            |
| `pnpm run validate:env`  | Sanity-check required Playwright/Chrome binaries                             |
| `pnpm run test:unit`     | Jest unit+integration suites (serial for CI stability)                       |
| `pnpm test`              | Jest unit-test runner                                                        |
| `pnpm run e2e`           | Playwright specs (auto-skip under WSL2; run on native Linux/macOS/Windows)   |
| `pnpm run test:e2e:ci`   | Playwright in CI mode (`list,junit` reporters)                               |
| `pnpm run audit:options` | Lighthouse check against the built options page (`dist/chrome/options.html`) |
| `pnpm run lint`          | ESLint validation for source and tests                                       |
| `pnpm run lint:fix`      | ESLint with autofix for source and tests                                     |
| `pnpm run lint:locales`  | Lints i18n message files for key/placeholder parity                          |
| `pnpm run format`        | Prettier auto-format (JS/CSS/HTML/JSON under `src/`)                         |

---

## Testing

See `docs/testing-playbook.md` for the full test pyramid, fixtures, and debugging recipes. Quick reference commands:

- `pnpm run validate:env` ensures Playwright browsers and Chrome binaries are available before e2e runs.
- `pnpm run test:unit` executes the Jest unit and integration suites in-band; use `pnpm test -- --watch` for watch mode while iterating locally.
- `pnpm run e2e` drives the Playwright UI flows against an offline Gmail fixture (auto-skips under WSL2 — see note below).
- `pnpm run lint:locales` validates that every locale matches the English key set and placeholder structure.
- `pnpm run lint` and `pnpm run format` keep source files consistent before committing.
- `pnpm run audit:options` performs a Lighthouse pass against `dist/chrome/options.html` and stores reports under `artifacts/lighthouse/`.
- Playwright e2e runs attach V8 coverage for `contentScript.js` to each test’s output directory.

### WSL2 Note

Chrome MV3 extensions with service workers cannot run in Playwright under WSL2, so the e2e suite automatically skips when it detects a WSL kernel (see `playwright.config.js`). Run e2e tests on native Linux, macOS, or Windows; in WSL2, rely on the unit suite and manual browser testing.

### Manual Smoke

1. Load the unpacked extension and confirm the toolbar injects beneath Gmail’s action bar.
2. Exercise all filter modes (All Mail, Mail Only, Calendar Only, Attachments Only, Favourites Only, AI & Transcription, Dev).
3. Toggle debug mode from the options page – filtered rows should tint blue at 50 % opacity.
4. Check keyboard navigation and ensure <kbd>Esc</kbd> returns focus to Gmail’s message list.
5. Force RTL (`dir="rtl"`) in DevTools and confirm icons/text mirror correctly.

### Accessibility

- Run `pnpm run audit:options`; the command enforces the documented Lighthouse performance,
  accessibility, and best-practices budgets.

---

## Contributing

Pull requests are welcome! Before raising a PR:

1. Create an issue describing the proposal.
2. `git checkout -b feature/your-branch`
3. Ensure `pnpm test && pnpm run lint` pass.
4. Update `CHANGELOG.md` under **Unreleased**.
5. Complete the [release checklist](docs/release-checklist.md) for Chrome, Firefox, and Safari.
6. Open the PR against `main`.

---

## Licence

MIT © [Kevinjohn Gallagher](https://kevinjohngallagher.com) – see [LICENSE](LICENSE) for full text.
Third-party components and their licences are recorded in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
