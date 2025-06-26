
# Gmail Calendar Filter Chrome Extension  
*Product Requirements Document (PRD)*  
Version 1.0 — 2025-06-26

> **Read me first**  
> This PRD is intentionally *verbose* and *pedantic*. It assumes the implementer has **zero previous experience** with Chrome extensions, web development, Git, or command‑line tools.  
> Follow every numbered instruction **in order**. Do **not** skip steps.  
> All spelling is British English (colour ≠ color, licence ≠ license, etc.).

---

## 1. Purpose

Gmail does not let users quickly switch between _all mail_ and _calendar‑related mail_ in the standard web interface.  
The **Gmail Calendar Filter** extension injects a toolbar with three buttons into every Gmail inbox/tab:

1. **Yes** – show ordinary e‑mails *and* calendar invites.  
2. **No** – hide calendar invites; show everything else.  
3. **Only** – show *only* calendar invites; hide everything else.

A hidden “debug mode” colours hidden rows blue at 50 % opacity for developers.

---

## 2. Goals & Success Criteria

| ID | Success Criterion | Measurement |
|----|------------------|-------------|
| G‑01 | User can toggle between the three visibility modes inside Gmail without refreshing the page. | Manual exploratory test passes in Section 21. |
| G‑02 | Toolbar loads in under **250 ms** on a warm Gmail tab. | Measured with Chrome DevTools Performance panel (extension code). |
| G‑03 | Extension passes Chrome Web Store privacy review on first submission. | Web Store listing accepted. |
| G‑04 | WCAG 2.1 AA compliance for toolbar (keyboard, colour contrast, screen readers). | Axe DevTools audit returns zero violations. |
| G‑05 | No JavaScript console errors in Chrome Stable, Beta, Canary, and Edge Stable. | Manual test. |

---

## 3. Scope

### 3.1 In‑Scope
* Google Chrome and Microsoft Edge on desktop (Windows, macOS, Linux).  
* Gmail web interface at `https://mail.google.com/*`.  
* Toolbar injection, row filtering, debug mode, extension options page.

### 3.2 Out‑of‑Scope
* Mobile Gmail app (Android/iOS).  
* Gmail API, OAuth, server‑side processing, and any AI/GPT features.  
* Support for third‑party web‑mail UIs (Outlook, Yahoo, etc.).

---

## 4. Stakeholders

| Role | Name / Contact | Responsibility |
|------|----------------|----------------|
| Product Owner | <YOU> | Vision, requirements, acceptance. |
| Developer | *Junior Dev* | Implements according to this PRD. |
| QA | *TBC* | Executes test plan. |

---

## 5. Target Users
* **Primary:** Knowledge‑workers who live in Gmail and receive many calendar invites.  
* **Secondary:** Product owner and QA team validating the extension.

---

## 6. User Stories

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US‑01 | As a Gmail user, I want to press **No** so that calendar invites vanish and I can focus on ordinary mail. | Invites disappear; non‑calendar mail remains; status text reads “Calendar is hidden”. |
| US‑02 | As a Gmail user, I want to press **Only** so that I see just invites. | Only calendar rows visible; status text reads “Only showing calendars”. |
| US‑03 | As a Gmail user, I want to press **Yes** so that Gmail returns to normal. | All rows visible; status text reads “Showing e‑mails and calendar invites”. |
| US‑04 | As a keyboard user, I want to tab through the toolbar in logical order. | Tabbing cycles Label → Yes → No → Only (then back to Gmail’s native toolbar). |
| US‑05 | As a screen‑reader user, I want spoken feedback when a mode changes. | NVDA reads “Calendar options: [Yes/No/Only] button pressed”. |
| US‑06 | As a developer, I want to enable **debug mode** so that hidden rows are tinted blue not removed. | Option saved in chrome://extensions → Details → Extension options. |

---

## 7. Functional Requirements

### FR‑01 Toolbar Injection
* Inject a `<div class="gcal-filter-bar" role="toolbar" aria-label="Calendar filter">` immediately **after** Gmail’s native `.G-atb` toolbar container.

### FR‑02 Buttons
* Three `<button>` elements with `data-mode` values `ALL`, `HIDE_CAL`, `ONLY_CAL`.
* Each button must carry `aria-pressed="true|false"`.

### FR‑03 Status Text
* A right‑aligned `<span class="gcal-status" aria-live="polite">`.

### FR‑04 Persisting Mode
* Use `chrome.storage.sync` key `gmailCalMode`.
* Default value on first install = `ALL`.

### FR‑05 Filtering Algorithm
* Detect calendar invites by **either**:
  1. Subject line regex: `^(Invitation:|Cancelled:|Accepted:|Declined:|Updated invitation)` (case‑insensitive).  
  2. Presence of any `<img alt>` containing `.ics`.

### FR‑06 MutationObserver
* Observe `document.body` with `{{ childList: true, subtree: true }}`.
* On any mutation, re‑run filtering.

### FR‑07 Debug Mode
* Read `chrome.storage.sync` key `gmailCalDebug` (Boolean).
* If `true`, hidden rows receive:  
  `background: rgba(0, 123, 255, .15); opacity: 0.5; display: ''`.

### FR‑08 Options Page
* Path: `options.html`.
* Checkbox labelled “Enable debug mode (show filtered rows in blue)”.
* Writes boolean to `gmailCalDebug`.

### FR‑09 Internationalisation
* All user‑visible strings in English only (phase‑1); wrap in a constant map for future i18n.

---

## 8. Non‑Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR‑01 | Performance | Toolbar injection in < 250 ms on warmed tab. |
| NFR‑02 | Security | No `eval`, no remote code, MV3 content security policy default. |
| NFR‑03 | Privacy | Extension collects **no personal data**; stated in Web Store privacy form. |
| NFR‑04 | Accessibility | WCAG 2.1 AA for toolbar. |
| NFR‑05 | Browser Support | Chrome ≥ M114, Edge ≥ 114. |

---

## 9. UI Specification

### 9.1 Toolbar Layout

| Element | CSS selectors | Behaviour |
|---------|---------------|-----------|
| Toolbar container | `.gcal-filter-bar` | `display:flex; justify-content:space-between;` |
| Label + Buttons | `.gcal-btn-group` | Left‑aligned group. |
| Status text | `.gcal-status` | Right‑aligned; font‑style:italic; opacity:.8 |

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Gmail native toolbar (.G‑atb)                                             │
├────────────────────────────────────────────────────────────────────────────┤
│ Calendar options: [Yes] [No] [Only]                  Showing e‑mails and… │
└────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Options Page

* Minimal standalone HTML; no frameworks.
* Hidden until user opens chrome://extensions → Details → Extension options.

---

## 10. Architecture Overview

```
+------------------+          +--------------------------+
| manifest.json    |<-------->| Chrome runtime (MV3 SW)  |
+------------------+          +--------------------------+
         |                                 ▲
         | content_scripts (DOM/JS/CSS)    |
         v                                 |
+------------------+          +--------------------------+
| Gmail DOM        |<-------->| background.js (service) |
+------------------+          | options.html (storage)  |
                              +--------------------------+
```

---

## 11. Development Environment

1. **Prerequisites**  
   * Chrome Stable, Chrome Canary  
   * Node ≥ 18 (for bundler)  
   * Git

2. **Project Setup**  
   ```bash
   git clone <repo>
   cd gmail-calendar-filter
   npm ci                # installs dev‑only tools: eslint, vite
   ```

3. **Local Build**  
   ```bash
   npm run build         # creates /dist ready for loading
   ```

4. **Load Unpacked**  
   * Go to chrome://extensions  
   * Enable *Developer mode* (toggle top right).  
   * Click **Load unpacked** → select `/dist`.

---

## 12. Coding Standards

* **ES2022** syntax, no TypeScript.  
* Lint with ESLint `eslint:recommended`, `plugin:compat/recommended`.  
* Single quotes, 2‑space indent, trailing commas where valid.  
* Commit style: Conventional Commits (`feat:`, `fix:`, `docs:` …).

---

## 13. Testing & QA Plan

| Stage | Tool | Responsibility |
|-------|------|----------------|
| Unit tests | Jest | Developer |
| Lint | ESLint | Pre‑commit git hook |
| Accessibility | Axe DevTools browser extension | QA |
| Cross‑browser | Chrome Stable, Beta, Canary, Edge | QA |
| Performance | Chrome DevTools Lighthouse | QA |

### Manual Test Cases
See Section 19.

---

## 14. Metrics & Telemetry

* No runtime telemetry (privacy first).  
* Rely on Chrome Web Store dashboard for install counts.

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gmail DOM class names change | Medium | High | Selectors anchored on role/structure not class names; quick patch release process. |
| MV3 API change | Low | Medium | Follow Chrome Extension quarterly release notes. |
| User confusion about toolbar | Low | Low | Status text clearly states current mode. |

---

## 16. Milestones

| Date (relative) | Deliverable |
|-----------------|-------------|
| +0 days | PRD sign‑off |
| +3 days | Toolbar prototype loads in Gmail |
| +5 days | Filtering logic complete |
| +6 days | Debug mode + options page |
| +7 days | QA pass & Web Store draft |
| +9 days | Public launch |

---

## 17. Glossary

| Term | Meaning |
|------|---------|
| MV3 | Manifest Version 3 – Chrome’s current extension platform. |
| ICS | iCalendar file format (`.ics`). |
| WCAG | Web Content Accessibility Guidelines. |

---

## 18. Task Checklist (developer **must** complete in order)

1. **Set up repo**  
   * Initialise Git, commit PRD (`prd.md`).  
   * `npm init -y`, install dev dependencies.

2. **Create `manifest.json`** exactly as in Section 7.

3. **Write `contentScript.js`**  
   * Copy boilerplate from Section 7.  
   * Implement `waitForGmailChrome()`.

4. **Write `background.js`**  
   * Implement `onInstalled` listener.

5. **Write `styles.css`** as per Section 9.

6. **Write `options.html`**.  
   * Test ticking/unticking debug mode.

7. **Add icons** – 16,32,48,128 px PNG.

8. **Run ESLint** – fix all warnings.

9. **Manual tests** – execute Section 19 checklist.

10. **Package**  
    ```bash
    npm run build
    zip -r gmail-calendar-filter.zip dist/*
    ```

11. **Submit** to Chrome Web Store (draft channel).

---

## 19. Manual Test Checklist

| TC | Steps | Expected |
|----|-------|----------|
| TC‑01 | Open Gmail inbox. | Toolbar appears beneath native toolbar within 250 ms. |
| TC‑02 | Click **No**. | Calendar rows disappear; status reads “Calendar is hidden”; button has pressed state. |
| TC‑03 | Click **Only**. | Only calendar rows visible; status reads “Only showing calendars”. |
| TC‑04 | Click **Yes**. | All rows visible; status reads “Showing e‑mails and calendar invites”. |
| TC‑05 | Press **Tab** repeatedly. | Focus cycles through label → buttons → Gmail’s own first button. |
| TC‑06 | Enable debug mode in options. | Hidden rows now coloured blue, 50 % opacity. |
| TC‑07 | Disable debug mode. | Hidden rows removed again. |
| TC‑08 | Open incognito window (allow extension). | All above tests pass identically. |
| TC‑09 | Open two tabs. Toggle mode in tab 1. | Tab 2 refreshes filter within 2 s. |

---

## 20. Acceptance Criteria

* All Success Criteria G‑01…G‑05 met.  
* All Manual Test Cases TC‑01…TC‑09 pass on QA machine.  
* Web Store privacy form completed; listing approved for public.

---

## 21. Post‑Launch

* Monitor Web Store errors & crash reports weekly for first month.  
* Answer user reviews within 48 hours.

---

*End of document.*

