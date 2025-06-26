
# Gmail Calendar Filter – Build Task List  
*Autonomous execution checklist*  
Generated: 2025-06-26

---

## Legend
- `[ ]` unchecked – task not started  
- `[x]` checked – task completed  

Remote agent should tick each box **immediately after** successful execution.

---

## Phase 0 · Preconditions (manual)
- [ ] Confirm desktop OS with Chrome ≥ 114 and Node ≥ 18 is installed.
- [ ] Confirm `gmail_calendar_filter_prd.md` is present in working folder.

## Phase 1 · Repository & Toolchain Setup
- [ ] Open terminal in parent directory.
- [ ] `git init gmail-calendar-filter`
- [ ] `cd gmail-calendar-filter`
- [ ] `echo "# Gmail Calendar Filter" > README.md`
- [ ] `git add README.md && git commit -m "docs: initial read‑me"`
- [ ] `npm init -y`
- [ ] `npm install --save-dev eslint jest vite`
- [ ] `npx eslint --init` (choose “ESM”, “Browser”, “Recommended”)
- [ ] `git add . && git commit -m "chore: node toolchain + ESLint"`

## Phase 2 · Directory Skeleton
- [ ] `mkdir -p src/icons`
- [ ] `touch src/manifest.json`
- [ ] `touch src/background.js`
- [ ] `touch src/contentScript.js`
- [ ] `touch src/styles.css`
- [ ] `touch src/options.html`
- [ ] `git add src && git commit -m "feat: baseline file tree"`

## Phase 3 · Populate `manifest.json`
- [ ] Open `src/manifest.json` and paste manifest from PRD Section 7.
- [ ] Save file.
- [ ] `git add src/manifest.json && git commit -m "feat: MV3 manifest"`

## Phase 4 · `background.js`
- [ ] Open `src/background.js`.
- [ ] Insert `chrome.runtime.onInstalled` listener stub.
- [ ] Save.
- [ ] `git add src/background.js && git commit -m "feat: service worker boilerplate"`

## Phase 5 · `contentScript.js` – bootstrap
- [ ] Open `src/contentScript.js`.
- [ ] Paste constants, storage bootstrap, `waitForGmailChrome()` code.
- [ ] Save.
- [ ] `git add src/contentScript.js && git commit -m "feat: bootstrap code"`

## Phase 6 · `contentScript.js` – filtering logic
- [ ] Append `isCalendarRow(row)` function.
- [ ] Append `applyFilter()` function.
- [ ] Append MutationObserver registration.
- [ ] Save.
- [ ] `git add src/contentScript.js && git commit -m "feat: core filtering"`

## Phase 7 · `contentScript.js` – toolbar UI
- [ ] Append `injectToolbar(anchor)` function with HTML markup.
- [ ] Append `updateUI(bar)` helper toggling `aria-pressed`.
- [ ] Save.
- [ ] `git add src/contentScript.js && git commit -m "feat: toolbar injection"`

## Phase 8 · Debug‑mode wiring
- [ ] Insert `KEY_DEBUG` constant & `debugOn` variable.
- [ ] Insert storage retrieval of `gmailCalDebug`.
- [ ] Insert `chrome.storage.onChanged` listener updating `debugOn`.
- [ ] Amend `applyFilter()` to tint rows when `debugOn`.
- [ ] Save.
- [ ] `git add src/contentScript.js && git commit -m "feat: debug mode toggle"`

## Phase 9 · `styles.css`
- [ ] Open `src/styles.css`.
- [ ] Paste CSS from PRD Section 9.
- [ ] Save.
- [ ] `git add src/styles.css && git commit -m "style: toolbar CSS"`

## Phase 10 · `options.html`
- [ ] Open `src/options.html`.
- [ ] Paste full HTML from PRD Section 7.
- [ ] Save.
- [ ] `git add src/options.html && git commit -m "feat: options page"`

## Phase 11 · Icons
- [ ] Copy 16 / 32 / 48 / 128 px PNGs into `src/icons`.
- [ ] Update `"icons"` field in `manifest.json`.
- [ ] Save.
- [ ] `git add src/icons src/manifest.json && git commit -m "feat: add icons"`

## Phase 12 · ESLint pass
- [ ] `npx eslint src --fix`
- [ ] Ensure exit code 0.
- [ ] `git add -u && git commit -m "chore: lint fixes"`

## Phase 13 · Local Build with Vite
- [ ] Create `vite.config.mjs` copying assets from `src` to `dist`.
- [ ] Add `"build": "vite build"` to `package.json`.
- [ ] `npm run build`
- [ ] Confirm `dist/manifest.json` exists.
- [ ] `git add vite.config.mjs package.json && git commit -m "chore: build pipeline"`

## Phase 14 · Manual Smoke Test (local)
- [ ] Open `chrome://extensions` → enable Developer mode.
- [ ] Click **Load unpacked** → select `dist`.
- [ ] Open `https://mail.google.com`.
- [ ] Verify toolbar appears.
- [ ] Click **No** → calendar rows disappear.
- [ ] Click **Only** → only calendar rows remain.
- [ ] Toggle debug mode in options → hidden rows turn blue.
- [ ] `git commit --allow-empty -m "test: manual smoke pass"`

## Phase 15 · Jest Unit Tests
- [ ] Create `tests/isCalendarRow.test.js`.
- [ ] Configure Jest `jsdom` environment.
- [ ] `npx jest`
- [ ] Confirm tests pass.
- [ ] `git add tests && git commit -m "test: invite detection unit tests"`

## Phase 16 · Packaging
- [ ] `npm run build`
- [ ] `cd dist && zip -r ../gmail_calendar_filter.zip . && cd ..`
- [ ] `git add gmail_calendar_filter.zip && git commit -m "build: web-store package"`

## Phase 17 · Pre‑submission Compliance
- [ ] Open Web Store Developer Dashboard.
- [ ] Start *new item* upload.
- [ ] Upload `gmail_calendar_filter.zip`.
- [ ] Complete privacy questionnaire (“No data collected”).
- [ ] Upload 1280×800 screenshot.
- [ ] Upload 440×280 promo tile.
- [ ] Submit draft.
- [ ] `git commit --allow-empty -m "docs: submitted to Web Store (draft)"`

## Phase 18 · Post‑Review
- [ ] Publish when approved.
- [ ] `git tag v1.0.0 && git push --tags`
- [ ] Announce release notes (optional).

