
# Fast‑Follow Task List – v1.1  

Generated: 2025-06-26  
Refer to *gmail_calendar_filter_fast_follow_prd.md* for context.

---

## Phase 1 · Localisation
- [ ] Create `_locales/en/messages.json` and move all UI strings into it.
- [ ] Duplicate as `_locales/en_GB/messages.json` (temporary identical copy).
- [ ] Replace hard‑coded strings in `contentScript.js` with `chrome.i18n.getMessage`.
- [ ] Run unit test ensuring `getMessage` returns non‑empty strings.
- [ ] `git commit -m "i18n: externalise strings"`

## Phase 2 · Logical CSS
- [ ] Open `src/styles.css`.
- [ ] Replace `margin-left` & `margin-right` with `margin-inline-start/end`.
- [ ] Replace `padding-left/right` with `padding-inline-start/end`.
- [ ] Verify layout in Chrome LTR.
- [ ] Force `dir="rtl"` and verify mirrored layout.
- [ ] `git commit -m "style: logical CSS properties"`

## Phase 3 · Focus Trapping
- [ ] Add `tabindex="-1"` to Gmail list element `.UI` at injection.
- [ ] Add `keydown` listener on `.gcal-filter-bar` to capture Escape.
- [ ] On Esc press, call `.focus()` on list element.
- [ ] Add Playwright keyboard test (Esc returns focus).
- [ ] `git commit -m "feat: focus trapping with Esc"`

## Phase 4 · CHANGELOG
- [ ] Create top‑level `CHANGELOG.md` with Unreleased section.
- [ ] Document changes for 1.1.0.
- [ ] Add GitHub Action workflow `.github/workflows/changelog.yml` that appends entry on tag.
- [ ] `git commit -m "docs: add structured changelog + CI hook"`

## Phase 5 · QA & Release
- [ ] Run Axe DevTools; confirm zero new accessibility issues.
- [ ] Run RTL visual regression (take screenshot; compare diff < 100 px changed).
- [ ] Bump version in `manifest.json` to `"1.1.0"`.
- [ ] Build & zip (`npm run build`).
- [ ] Upload to Chrome Web Store as **unlisted build**; manual test in production.
- [ ] Publish to 5 % staged rollout.
- [ ] `git tag v1.1.0 && git push --tags`
