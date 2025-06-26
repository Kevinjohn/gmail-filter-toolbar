
# Gmail Calendar Filter – **Fast‑Follow Enhancements**  
*Product Requirements Document (PRD)*  
Version 1.1 — 2025-06-26

> **Scope of this PRD**  
> Adds four improvements to the already‑released v1.0 extension.  
> No new end‑user features; only quality‑of‑life, accessibility, and localisation upgrades.

---

## 1. Purpose

Early adopters surfaced needs for:
* Internationalised UI text.
* Better keyboard navigation (focus trapping).
* Future‑proof CSS for RTL locales.
* Clear release history tracking.

This fast‑follow release addresses those without altering core filtering logic.

---

## 2. Goals & Success Criteria

| ID | Success Criterion | Measurement |
|----|------------------|-------------|
| FF‑G‑01 | All UI strings pulled from Chrome `_locales` message bundles. | Manual inspection; English still displays correctly. |
| FF‑G‑02 | Toolbar layout renders correctly in both LTR and RTL (Arabic forced). | Visual QA screenshot diff passes. |
| FF‑G‑03 | Pressing **Esc** while focus is inside custom toolbar returns focus to the Gmail thread list `.UI` region. | Keyboard QA test passes. |
| FF‑G‑04 | `CHANGELOG.md` auto‑updates on each CI release tag. | CI job shows appended entry. |

---

## 3. Functional Requirements

### FR‑01 Internationalisation
* Move literal strings (“Calendar options”, “Yes”, “No”, “Only”, status texts) into `_locales/en/messages.json`.
* Provide `_locales/en_GB/` symlink or copy (Web Store rules).
* Implement fallback loader: if translation missing, default to English.

### FR‑02 Bi‑directional CSS
* Replace all physical properties (`margin-left`, `padding-right`, etc.) with logical equivalents (`margin-inline-start/end`, `padding-inline-start/end`).
* Remove any left/right icons that imply direction; use Unicode BiDi‑neutral icons if needed.

### FR‑03 Focus Trapping
* Add `keydown` listener on `.gcal-filter-bar`.  
  * If `event.key === "Escape"`, call `document.querySelector('.UI')?.focus()`.
  * Ensure `.UI` (the message table) has `tabindex="-1"` set once at injection time.  
* Maintain existing tab order; do **not** impede native Gmail shortcuts.

### FR‑04 CHANGELOG
* Create top‑level `CHANGELOG.md` using [Keep a Changelog](https://keepachangelog.com/) style.
* GitHub Action appends new entry on tag push (uses `github.ref_name`).

---

## 4. Non‑Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR‑A11Y | Escape focus behaviour must be announced by screen reader (“Inbox list region”). |
| NFR‑PERF | Added listeners cause < 1 ms scripting time during idle. |
| NFR‑i18n | Loading missing locale must not log console errors. |

---

## 5. Development Notes

* LTR/RTL test by forcing `dir="rtl"` on `<html>` in DevTools.  
* Chrome’s i18n API returns messages via `chrome.i18n.getMessage(id)`.  
* Add Playwright test that sets `window.chrome.i18n.getMessage = id => id` to stub.

---

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Translator forgets to update regex pattern in messages.json. | Fallback detection keeps English regex; unit test fails if pattern empty. |
| Gmail changes tabindex on `.UI`. | Focus‑return helper queries `[role="main"] .UI` with backup to `.aeF`. |

---

## 7. Milestones

| Date (relative) | Deliverable |
|-----------------|-------------|
| +0 d | PRD approved |
| +1 d | _locales scaffolding & EN strings |
| +2 d | Logical CSS migrated |
| +3 d | Focus trapping implemented & unit‑tested |
| +4 d | CHANGELOG + CI action |
| +5 d | QA smoke & RTL screenshots |
| +6 d | Web Store v1.1 publish |

---

## 8. Acceptance Criteria

* Success Criteria FF‑G‑01 … FF‑G‑04 met.  
* QA passes manual checklist (see task list document).  

---

*End of fast‑follow PRD.*
