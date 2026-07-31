# Sift — Website Brief

**For:** design & development team building the sift one-page marketing site
**Product version at time of writing:** 2.10.2
**Repository:** https://github.com/Kevinjohn/sift
**Status:** not yet published to any browser store — see [Calls to action](#7-calls-to-action)

---

## Table of contents

1. [The one-line version](#1-the-one-line-version)
2. [What Sift is](#2-what-sift-is)
3. [The problem it solves](#3-the-problem-it-solves)
4. [Why it exists](#4-why-it-exists)
5. [Who it's for](#5-who-its-for)
6. [Feature inventory](#6-feature-inventory)
7. [Calls to action](#7-calls-to-action)
8. [Page structure](#8-page-structure)
9. [Copy deck](#9-copy-deck)
10. [Brand & visual direction](#10-brand--visual-direction)
11. [Assets available](#11-assets-available)
12. [Technical constraints & requirements](#12-technical-constraints--requirements)
13. [Accessibility requirements](#13-accessibility-requirements)
14. [Things to get right (and things to avoid)](#14-things-to-get-right-and-things-to-avoid)
15. [Open questions for the client](#15-open-questions-for-the-client)

---

## 1. The one-line version

**Sift adds a filter toolbar to Gmail so you can show only calendar invites, only attachments, only
PDFs, or only real email — instantly, without a search query, and without sending a single byte
anywhere.**

---

## 2. What Sift is

Sift is a browser extension for Chrome, Edge, Firefox and Safari. Once installed, it injects a row
of filter buttons directly beneath Gmail's own action bar. Clicking a button hides every message
row in the current list that doesn't match — the inbox narrows instantly.

Two things matter for how the site should be framed:

**It's a UI layer, not a service.** Sift doesn't have a backend. There is no account, no sign-in,
no server, no API. It reads the message list Gmail has _already rendered in your own browser tab_
and hides the rows you didn't ask for. That's the entire mechanism.

**It's part of Gmail, visually.** The toolbar is styled to sit inside Gmail's chrome rather than
float on top of it. Users describe it as "a Gmail feature I didn't know I had". The site should
reinforce that — this is not a separate app you switch to.

### Where it works

Everywhere in Gmail: inbox, sent, drafts, any label, any folder, and search results. The filter
persists as you paginate and navigate.

### What it is _not_

- Not an email client and not a Gmail replacement
- Not a rules engine — it doesn't move, label, archive or delete anything
- Not a search tool — it doesn't query Gmail's servers
- Not an AI product. (One optional filter _detects_ mail from AI tools. Sift itself runs no models.)
- It makes no permanent changes to your mailbox. Uninstall it and your Gmail is exactly as it was.

---

## 3. The problem it solves

### The core problem

**Gmail's inbox is one undifferentiated list, but the things in it are not one kind of thing.**

A single inbox screen typically mixes at least four categories that a person handles in completely
different modes:

| What's in the list                       | What the user actually wants to do with it               |
| ---------------------------------------- | -------------------------------------------------------- |
| Meeting invites & calendar notifications | Triage scheduling — accept, decline, check for conflicts |
| Messages with files attached             | Find a document — the contract, the deck, the invoice    |
| Starred / flagged messages               | Work the short list of things that actually matter       |
| Ordinary correspondence                  | Read and reply                                           |

Gmail's answer to this is search operators. If you want to see only your calendar invites, you type
`has:attachment filename:ics`. Only PDFs? `filename:pdf`. Only starred? `is:starred`. That works,
and it is also the reason most people never do it:

- **You have to know the syntax.** `filename:` vs `has:attachment` vs `is:` is developer knowledge,
  not user knowledge. Most Gmail users have never typed an operator in their life.
- **Search takes you somewhere else.** Running a query navigates you out of your inbox into a
  results view. You lose your place. Coming back means clearing the search and re-orienting.
- **It's a per-folder chore.** Want the same view inside a label, or in Sent? Type it again.
- **It's a round trip.** Every query is a network request to Google and a re-render.

So the real problem isn't "Gmail can't filter". It's that **filtering in Gmail costs enough effort
that people don't do it** — they scroll instead, scanning past twenty messages to find the two that
have the deck attached.

### The specific moments Sift is for

These are concrete, and they're good candidates for the site's hero and use-case copy:

- _"Someone sent me the deck last week — I know it's in here somewhere."_ → **Attachments**, or
  **Slides** to go straight to it.
- _"How many meetings did I get invited to while I was in that call?"_ → **Calendar**.
- _"I just want to actually read my email without twelve calendar notifications in the way."_ →
  **Emails**.
- _"Where's the signed PDF?"_ → **PDFs**.
- _"Show me the things I starred and nothing else."_ → **Favourites**.
- _"Which of these are just GitHub notifications I can ignore?"_ → **Dev** (optional).

### The secondary problem: trust

Gmail extensions are a category with a genuine trust problem. An extension that can read your inbox
can, in principle, read _everything_ — and several popular ones have been caught monetising exactly
that. A privacy-conscious user's default and entirely reasonable answer to "install this Gmail
extension" is **no**.

Sift's answer is unusually strong and needs to be a first-class part of the page, not a footer
link. See [§4](#4-why-it-exists) and [§9](#9-copy-deck).

---

## 4. Why it exists

### The origin

The extension began as a personal tool: an inbox where calendar invites drowned out actual
correspondence, and where the fix Gmail offered — memorising search operators and losing your place
in the inbox every time — wasn't a fix. The button that should exist didn't, so it got built.

That's a genuinely useful story for the site. It explains the product's restraint: Sift does one
thing because it was built to solve one irritation, not to capture a market.

### The design philosophy — three commitments

These are the spine of the product and should be the spine of the page.

**1. It should feel like Gmail, not like an add-on.**
The toolbar adopts Gmail's colours, spacing and typography, and sits inside Gmail's own layout
rather than hovering over it. It has a light theme, a dark theme, and a system-matching theme so it
tracks whatever the user has already chosen. No badge, no branding in the toolbar, no upsell.

**2. Nothing leaves the browser. Ever.**
This is an architectural guarantee, not a policy promise, and the distinction is the whole point:

- Sift makes **zero network requests**. Not "anonymised" ones. Zero.
- It ships with **no remote code and no remote resources**. Even its icon font is a subsetted copy
  bundled inside the extension package rather than pulled from a CDN — specifically so that no
  request goes anywhere, not even to Google Fonts.
- It requests exactly **two permissions**: `storage` (to remember your own preferences) and access
  to `https://mail.google.com/*` (the only site it functions on). It cannot touch any other page.
- It reads message rows **in memory, in the page**, to decide which to hide. Nothing is stored,
  copied, logged, or transmitted. There is no analytics, no telemetry, no crash reporting, no
  cookies, no tracking pixels, no accounts.
- The only thing it saves is your own settings — which filter you last used, your theme, your
  toolbar preferences. Ten preference values, none of them personal.

The strongest framing available: **Sift has no server to send your email to. There is nothing to
opt out of, because there is nothing collecting anything.** The claim is verifiable by anyone —
the source is public and the code has no network calls in it to find.

**3. Accessible and international from the start, not retrofitted.**
Full keyboard navigation, screen-reader live announcements, forced-colours/high-contrast support,
right-to-left language mirroring, and 25 localisations. Automated accessibility budgets run in CI
on every change.

### Why it's open source and free

MIT licensed, no paid tier, no premium version, nothing planned. Two reasons worth stating on the
page:

- **Trust is only credible if it's checkable.** "We don't read your email" from a closed-source
  Gmail extension is a promise. From an open-source one with no network code, it's a fact you can
  confirm.
- **Gmail's DOM changes without notice.** Sift works by recognising structures in Gmail's markup,
  and Google reorganises that markup periodically. Being open source means anyone affected by a
  break can see what broke and fix it — the project doesn't depend on one maintainer's availability.

---

## 5. Who it's for

Not formal personas — these are the three shapes of user the copy should speak to.

**The meeting-heavy professional.** Consultants, managers, anyone whose inbox is one-third calendar
traffic. Their pain is signal-to-noise: real correspondence buried under invites, updates and
declines. Primary filters: **Calendar** and **Emails**.

**The document hunter.** Legal, finance, ops, admin — people whose email is really a file cabinet
they can't index. They're forever hunting the contract, the invoice, the deck. Primary filters:
**Attachments**, **PDFs**, **Docs**, **Sheets**, **Slides**.

**The privacy-conscious user.** Developers, security-minded professionals, people in regulated
work. They _want_ a tool like this and have refused every one they've found, because installing a
Gmail extension means handing over the inbox. They will read the permissions before they read the
features. For this group the zero-network architecture isn't a nice-to-have — it's the only reason
they'll install anything at all. **Both of the site's goals converge on this person: they're the
hardest install to win and the most credible advocate once won.**

**Assumed technical level: low.** Sift is a consumer product. The site should not require the
reader to know what a content script, a DOM selector, or Manifest V3 is. The technical facts appear
as _reassurance_ ("no network requests", "two permissions"), not as specifications.

---

## 6. Feature inventory

### Filters — always available

| Filter          | Shows                                          |
| --------------- | ---------------------------------------------- |
| **All**         | Everything (default — the unfiltered inbox)    |
| **Emails**      | Ordinary mail only; calendar traffic hidden    |
| **Calendar**    | Meeting invites and calendar-related mail only |
| **Attachments** | Any message carrying a file                    |
| **Images**      | Messages with image attachments                |
| **PDFs**        | Messages with PDF attachments                  |
| **Docs**        | Messages with document attachments             |
| **Sheets**      | Messages with spreadsheet attachments          |
| **Slides**      | Messages with presentation attachments         |

### Filters — optional, enabled in settings

| Filter         | Shows                                                                                                    | Note           |
| -------------- | -------------------------------------------------------------------------------------------------------- | -------------- |
| **Favourites** | Starred / important messages                                                                             | Off by default |
| **AI & Notes** | Mail from AI services (Gemini, ChatGPT, Claude) and transcription tools (Otter.ai, Fathom, Fireflies.ai) | Experimental   |
| **Dev**        | GitHub and GitLab notification mail                                                                      | Experimental   |

> **Copy guidance:** label the last two honestly as experimental. Do not let "AI" become a headline
> feature — Sift is not an AI product, and overstating this will cost credibility with exactly the
> privacy-minded audience the page needs to win.

### Behaviour & customisation

- **Instant** — no page reload, no network request, no waiting
- **Persistent** — your filter survives pagination and navigation between folders
- **Works in every view** — inbox, sent, labels, search results
- **Themes** — light, dark, or match system
- **Button labels** — icons only, or icons with text
- **Alignment** — toolbar at the start of Gmail's controls, or centred
- **Optional buttons** — show or hide Favourites, AI & Notes, Dev
- **Debug mode** — dims non-matching rows to 50% instead of hiding them, so you can see what a
  filter _would_ do. A power-user/transparency feature; secondary on the page at most.

### Platforms

| Browser       | Minimum version |
| ------------- | --------------- |
| Chrome / Edge | 114+ (desktop)  |
| Firefox       | 121+ (desktop)  |
| Safari        | 15.4+ (macOS)   |

Desktop Gmail only. **Not available on mobile** — mobile browsers don't support extensions of this
kind. State this plainly rather than letting a phone user install-and-discover.

### Localisation — 25 languages

Arabic, Czech, Danish, German, Greek, English (US), English (UK), Spanish, Spanish (Latin America),
Finnish, French, Hindi, Hungarian, Italian, Dutch, Norwegian, Polish, Portuguese (Brazil),
Portuguese (Portugal), Romanian, Russian, Swedish, Turkish, Ukrainian, Chinese (Simplified).

Right-to-left languages mirror the layout correctly.

---

## 7. Calls to action

**Sift is not yet in any browser store.** This is the single most important constraint on the page
design, and it must be handled deliberately rather than apologetically.

### Primary CTA — **"Get Sift for your browser"**

One button, in the hero and repeated in the install section. It should **detect the visitor's
browser and adapt its label** — _Get Sift for Chrome_ / _for Edge_ / _for Firefox_ / _for Safari_ —
falling back to the generic _Get Sift for your browser_ when detection is unavailable or the
visitor is on an unsupported browser.

The deliberate advantage of this wording: **the label is correct in both states.** Today it routes
to the from-source install instructions for the detected browser. After store approval it routes to
that browser's store listing. Nothing about the hero needs redesigning when the listings go
live — only the link target changes.

**Below the button**, a small honest line about the current state:

> _Not in the browser stores yet — installs from GitHub in about two minutes._

Remove that line per-browser as each listing lands. Avoid the words "coming soon": the product is
finished, tested and in daily use, and coming-soon reads as vapourware.

Also provide a **"Other browsers"** or **"All install options"** text link beneath, for the visitor
whose browser was detected wrongly or who is browsing on one machine to install on another.

### After store approval

The design should anticipate two things:

- The CTA's **destination** becomes the detected browser's store listing. Store badges (Chrome Web
  Store, Edge Add-ons, Firefox AMO, Safari) can appear as a secondary row beneath the button — but
  the primary button stays a single adaptive CTA, not a wall of four badges.
- **Listings will not all approve at once.** Whatever the design does with badges must degrade
  gracefully at one, two, or three, and the per-browser "not in the stores yet" note must be able
  to disappear for some browsers while remaining for others.

### Secondary CTA — GitHub, in the open-source section

**Do not put the GitHub link in the hero.** Sending a general visitor to a source repository as
their first option is a worse conversion path and misrepresents Sift as a developer tool rather
than a consumer one.

Instead, the **GitHub CTA lives in the privacy / open-source section (§8 §5)**, where it is doing
different and much more valuable work: it is the _evidence_ for the trust claims made immediately
above it. Frame it as verification, not as distribution:

> **You don't have to take our word for it.** Sift is open source under the MIT licence — the whole
> extension is a few hundred lines, and there are no network calls in it to find.
>
> **[View the source on GitHub →]**

Give this real visual weight — button-sized, not a footnote link. For the privacy-conscious
audience in §5, this is the actual conversion moment: they will read the source claim, click
through, satisfy themselves, come back and _then_ install.

### Other secondary CTAs

- **Read the privacy policy** → `PRIVACY.md` — from the trust section, not only the footer
- **Report an issue** → GitHub issues (footer)
- **Contribute** → `CONTRIBUTING.md` (footer)

### Not required

No newsletter, no waitlist, no email capture. It would directly contradict the product's central
claim. **Do not add a form to this site.**

---

## 8. Page structure

Recommended section order. The two goals — drive installs, establish trust — are interleaved on
purpose: the trust section sits _before_ the final CTA, because for this audience trust is the
thing standing between interest and install.

**1 · Hero**
Headline, one-sentence subhead, the **"Get Sift for your browser"** CTA with its status line, and
the product shot. The screenshot should be visible without scrolling on a laptop — Sift is visual
and self-explanatory once seen. **No GitHub link in this section** (see §7).

**2 · The problem**
Short. Three or four lines, or a compact before/after. Resist writing an essay: the reader
recognises this problem in about two seconds because they live in it.

**3 · How it works — the demo**
The centre of the page. Show filters actually filtering. Strongest treatment: an interactive filter
switcher — buttons that swap the screenshot below them, mirroring the real toolbar. It teaches the
interaction by letting the visitor perform it. Static alternative: the four inbox screenshots in
sequence with captions. Either way the point to land is _the list narrows the instant you click_.

**4 · Filters**
The full set, as a clean grid with icons. Group as: always-available (9) / optional (3). Don't
bury the file-type filters — "PDFs only" is the moment a lot of people decide they want this.

**5 · Privacy, trust & open source** ← _load-bearing_
This section is doing as much work as the demo. Lead with the architectural fact, not a promise.
Suggested treatment: four hard claims as cards or a stat row —
**Zero network requests · Two permissions · No accounts, no analytics · Open source, MIT** —
each one sentence. Design this to read as _evidence_, not as a reassurance banner.

**This section carries the page's second CTA: "View the source on GitHub"**, given real
button-weight, sitting directly under the claims it substantiates, with the privacy policy linked
alongside it. This placement is deliberate — see §7.

**6 · Customisation**
The options screenshot, plus themes / alignment / labels / optional buttons. Reinforces "it fits
your Gmail, not the other way round".

**7 · Details that matter**
Compact strip: 25 languages · keyboard navigable · screen-reader support · RTL · Chrome, Edge,
Firefox, Safari · desktop only. Small type, high density — this is the section that makes a careful
reader think _these people are thorough_.

**8 · Install**
Repeat the **"Get Sift for your browser"** CTA, with the actual steps for the current from-source
flow below it. Keep it to four numbered steps and be honest that it takes a couple of minutes. Once
the listings are live, this section becomes a one-click install for the detected browser and the
numbered steps collapse behind an "install manually instead" disclosure.

**9 · Footer**
GitHub · Privacy · Licence (MIT) · Issues · Contributing · author credit
([Kevinjohn Gallagher](https://kevinjohngallagher.com)).

### Sections to leave out

No pricing (it's free — one word in the hero covers it). No testimonials (there are none; inventing
them would be fatal to the trust argument). No feature comparison table against competitors. No
roadmap.

---

## 9. Copy deck

Starting points, not final copy. Voice: **plain, specific, quietly confident.** No exclamation
marks, no "revolutionise", no "supercharge". The product is modest and precise; the copy should
match. Claims are concrete and verifiable, which is itself the tone.

### Hero — headline options

> **Your inbox, filtered.**
> Show only your calendar invites. Or only the PDFs. Or only real email. One click, no search
> syntax, nothing leaves your browser.

> **Gmail's missing filter buttons.**
> Calendar invites, attachments, PDFs, starred mail — one click each, right where Gmail's own
> toolbar ends.

> **Stop scrolling. Start filtering.**
> A toolbar that shows you one kind of email at a time, instantly, without sending your inbox
> anywhere.

### Problem section

> Your inbox is one long list of things that aren't alike. Meeting invites, contracts, newsletters,
> and actual correspondence all queued together in the order they arrived.
>
> Gmail can separate them — if you know that `filename:pdf` and `has:attachment` and `is:starred`
> are things you can type, and if you don't mind leaving your inbox to run a search every time.
>
> Sift makes each of those a button.

### Demo section

> **Click a filter. The list narrows.**
> No page reload. No search query. No network request. The messages that don't match are simply
> hidden, and everything else stays exactly where it was — including your place in the list.

### Privacy section — highest-stakes copy on the page

> **It can't leak your email, because it never sends it anywhere.**
>
> Sift makes zero network requests. Not anonymised ones — zero. It has no server, no account
> system, and no analytics. It reads the message list your browser has already drawn, decides
> which rows to hide, and that's the end of it. Nothing is stored, copied, or transmitted.
>
> It asks for two permissions: one to remember your own settings, and one to run on
> mail.google.com. It cannot see any other website.
>
> Even the toolbar's icon font is bundled inside the extension rather than loaded from Google's
> servers — specifically so that no request goes out, not even that one.
>
> **You don't have to take our word for it.**
> Sift is open source under the MIT licence. The whole extension is a few hundred lines, and there
> are no network calls in it to find.
>
> **[ View the source on GitHub → ]** · [Read the privacy policy]

### Hero CTA — button and status line

> **[ Get Sift for Chrome ]**
> _Not in the browser stores yet — installs from GitHub in about two minutes._
>
> Other browsers →

Label adapts per detected browser; generic fallback is **Get Sift for your browser**. See §7.

### Install section — current state

> **Get Sift for Chrome**
>
> Sift isn't in the browser stores yet. It's finished, tested, and in daily use — the review queues
> are just slow. Installing it yourself takes about two minutes:
>
> 1. Download the latest release
> 2. Open your browser's extensions page
> 3. Turn on developer mode
> 4. Load the folder
>
> [Full instructions →]

### Microcopy

- _Free, and open source. No accounts, no tracking, no paid tier._
- _Works in Chrome, Edge, Firefox and Safari. Desktop Gmail only._
- _Available in 25 languages._
- _Uninstall and your Gmail is exactly as it was._

### Terminology — use consistently

| Use             | Don't use                                               |
| --------------- | ------------------------------------------------------- |
| Sift            | "the extension", "the plugin", "the app" (in body copy) |
| filter toolbar  | toolbar widget, filter bar, plugin bar                  |
| filters         | modes, views, tabs                                      |
| Favourites      | Favorites (product uses UK spelling)                    |
| message / email | mail item, mail object                                  |

Copy should use **British spelling** (favourites, customisation, colour) to match the product's
own strings.

---

## 10. Brand & visual direction

### Existing brand assets

The only fixed brand element is the **extension icon** (`src/assets/icon-source.svg`), an editable
SVG. It's a rounded square with a blue gradient, a white envelope, and a gold funnel — envelope
plus funnel, literally "sift your mail".

| Element             | Value     |
| ------------------- | --------- |
| Icon gradient, from | `#4f7cff` |
| Icon gradient, to   | `#2744b8` |
| Funnel accent       | `#ffcc4d` |
| Envelope / strokes  | `#ffffff` |

**`#4f7cff` → `#2744b8` blue with `#ffcc4d` gold is the natural brand palette**, and the site
should build from it. There is no logotype, no typeface selection, and no existing brand
guidelines — **the design team has genuine freedom here** and is expected to establish the visual
identity. A wordmark to sit alongside the icon would be a welcome deliverable.

### The product's own UI colours — for reference, not for the site

The in-Gmail toolbar deliberately borrows Gmail's palette so it disappears into the interface. Do
**not** build the website out of these; they're Google's visual language, and a site built from
them will look like a Google property, which raises exactly the questions the trust section is
trying to answer.

| Token         | Light     | Dark      |
| ------------- | --------- | --------- |
| Background    | `#f1f3f4` | `#3c4043` |
| Border        | `#dadce0` | `#5f6368` |
| Text          | `#202124` | `#e8eaed` |
| Active filter | `#d93025` | `#f28b82` |

Useful to know when placing screenshots: the product sits in a grey/red-accent Gmail context, and
the site's own palette needs to frame that without clashing with it.

### Iconography

The toolbar uses **Material Symbols Outlined**. If the site shows filter icons, matching that
family keeps site and product consistent. Note the extension bundles only a _subset_ of the font —
the site is free to use the full family from its own hosting.

### Tone of the design

The product is precise, restrained, and quietly thorough. The site should feel the same: generous
whitespace, real screenshots rather than illustration, no stock photography, no gradient-mesh hero,
no floating 3D shapes. **Light and dark themes for the site itself would be well-matched to a
product that ships three.**

---

## 11. Assets available

### Screenshots — in `docs/screenshots/`, all 1280×800 PNG

**26 captures, every one from the same 26-message inbox**, so any two can be paired as a genuine
before/after.

**One per filter** — the same inbox, one click apart:

| File                     | Shows                                              | Rows |
| ------------------------ | -------------------------------------------------- | ---- |
| `filter-all.png`         | **All** — nothing hidden                           | 26   |
| `filter-emails.png`      | **Emails** — calendar traffic hidden               | 24   |
| `filter-calendar.png`    | **Calendar** — the meeting invitations             | 2    |
| `filter-attachments.png` | **Attachments** — anything carrying a file         | 8    |
| `filter-images.png`      | **Images**                                         | 2    |
| `filter-pdfs.png`        | **PDFs**                                           | 2    |
| `filter-docs.png`        | **Docs**                                           | 2    |
| `filter-sheets.png`      | **Sheets**                                         | 2    |
| `filter-slides.png`      | **Slides**                                         | 2    |
| `filter-favourites.png`  | **Favourites** — starred messages                  | 2    |
| `filter-ai-notes.png`    | **AI & Notes** _(experimental)_ — Otter.ai, Fathom | 2    |
| `filter-dev.png`         | **Dev** _(experimental)_ — GitHub, GitLab          | 2    |

**Appearance & layout:**

| File                                     | Shows                                                   |
| ---------------------------------------- | ------------------------------------------------------- |
| `toolbar-icons-only.png`                 | Button text off — icons only                            |
| `toolbar-centered.png`                   | Toolbar centred rather than start-aligned               |
| `toolbar-dark-theme.png`                 | Dark toolbar theme (independent of Gmail's own theme)   |
| `debug-mode.png`                         | Debug mode — non-matching rows tinted instead of hidden |
| `options-light.png` / `options-dark.png` | Options page, both themes                               |

**Localisation** — see the caveat below:

| File                                                    | Shows                 |
| ------------------------------------------------------- | --------------------- |
| `locale-en-toolbar.png` / `locale-en-options.png`       | English               |
| `locale-ar-toolbar.png` / `locale-ar-options.png`       | Arabic, right-to-left |
| `locale-zh-cn-toolbar.png` / `locale-zh-cn-options.png` | Chinese (Simplified)  |
| `locale-hi-toolbar.png` / `locale-hi-options.png`       | Hindi                 |

**Recommended hero pairing: `filter-all` → `filter-calendar` (26 → 2).** It's the largest collapse,
and both surviving rows are unmistakable `Invitation:` messages with a visible calendar icon, so the
reason they survived is legible at a glance. `filter-pdfs` (26 → 2) is the same collapse if you want
the file-type story instead.

**On the localisation shots.** The toolbar and options page are genuinely localised — those are the
real shipped translations, and Arabic genuinely mirrors. Two things to know: the surrounding Gmail
replica is not translated, so the message list stays in English behind a translated toolbar; and
**Dev** is deliberately untranslated in every language. If the page needs a fully localised
screenshot, `locale-<lang>-options.png` is the honest choice — it is entirely extension-owned UI,
with no Gmail chrome around it.

**Only four languages are captured, but 25 ship.** These four were chosen to span scripts — Latin,
Arabic (RTL), Han, Devanagari. Note there is only one East Asian locale in the product (Chinese
Simplified); Japanese and Korean are not currently shipped, so they could not be shown.

### Screenshot data policy

Every person, subject, preview, filename and label in these images is **invented**. Nothing shown
is a real person, message or file, and no real mailbox was ever captured.

The captures are generated by running the built extension against a replica inbox
(`scripts/screenshots/gmail-inbox.html`) and clicking each filter, so **the filtering is genuine** —
Sift classifies those rows using exactly the same code path it runs against live Gmail. The row
counts above are asserted during capture; if the extension and the fixture ever disagree, the run
fails rather than publishing a misleading image.

**Requirements for the design team:**

- **Do not edit these in a way that changes what the filters appear to do**, and never re-shoot
  them against a real mailbox.
- **Never remove or crop out the calendar icon** on the rows in `calendar-only.png`. It is the only
  on-screen cue explaining why those two rows survived the filter — without it the image stops
  demonstrating the product.
- Need a different filter, theme, language or window size? Ask the maintainer to regenerate rather
  than editing pixels — it's a single command (`pnpm run screenshots:capture`), so new captures are
  cheap. Any of the other 21 shipped languages can be added in about a minute.

### Other assets

- `src/assets/icon-source.svg` — editable icon source
- `src/icons/` — 16/32/48/128px PNG renders
- Full English UI strings — `src/_locales/en/messages.json` (use these for any UI text reproduced
  on the site, so labels match the product exactly)

### Assets that don't exist yet — likely needed

- Wordmark / logotype
- A demo video or animated GIF of filtering in action _(high value — see §8 §3)_
- Open Graph / social share image
- Favicon set (derivable from the icon)
- Screenshots on Firefox and Safari, if the design wants per-browser proof

---

## 12. Technical constraints & requirements

### Hard requirements

**No trackers. None.** The site must not carry Google Analytics, Facebook Pixel, Hotjar, or any
third-party analytics. A privacy-first product on a tracker-laden site is a self-inflicted wound,
and the audience most likely to install Sift is exactly the audience that checks. If the client
needs traffic numbers, use privacy-respecting server-side or cookieless analytics — and be
prepared to say so on the page.

**No third-party fonts loaded from a CDN.** Self-host. The product goes out of its way to bundle
its own font so it makes no outbound requests; the site should hold the same line.

**No cookie banner should be necessary.** If the build requires one, something has been added that
shouldn't have been.

### Practical

- Static site — no backend needed, and no backend wanted
- One page, anchor navigation
- Fully responsive: many visitors will read about it on a phone and install on a desktop later.
  **Make sure the mobile experience handles that gracefully** — a phone visitor cannot install, so
  give them a clear "send this to yourself / continue on desktop" path rather than a dead CTA
- Fast: this is a page about a lightweight tool; a slow site contradicts the pitch
- Content should be static HTML text, not text baked into images (SEO + accessibility)

**Browser detection for the primary CTA** (§7) is client-side and must fail safe:

- The button's **default rendered state is the generic "Get Sift for your browser"**, pointing at
  the all-options list. Detection then _upgrades_ the label and link. It must never render empty,
  broken, or mid-swap on first paint.
- With JavaScript disabled the generic button and the "Other browsers" link must both still work —
  the page's whole install path cannot depend on a script.
- Detect from the user-agent conservatively and check Edge before Chrome (Edge's UA contains
  `Chrome`) and Chrome before Safari (Chrome's UA contains `Safari`). Getting this backwards sends
  Edge users to the Chrome listing, which mostly works and is still wrong.
- On mobile, or any unsupported browser, the CTA must **not** promise an install it can't deliver —
  swap it for the desktop-handoff path described above.

### SEO

Target phrases: _Gmail filter extension_, _filter Gmail by attachment_, _hide calendar invites in
Gmail_, _show only PDFs in Gmail_, _Gmail calendar invite filter_, _private Gmail extension_.

Needs: descriptive `<title>` and meta description, Open Graph and Twitter card tags, a
`SoftwareApplication` schema.org block, and a canonical URL.

---

## 13. Accessibility requirements

The product treats accessibility as a first-class concern and runs automated budgets in CI. **The
site must meet the same standard** — a marketing page that fails the bar its product clears is an
embarrassment that the audience will notice.

Requirements:

- **WCAG 2.1 AA** minimum
- Full keyboard navigation with a visible focus indicator; any interactive demo must be operable
  by keyboard
- Real alt text on every screenshot — descriptive of what the filter did, not "screenshot of
  Gmail". The README's existing alt text is a good model and can be reused
- Colour contrast meeting AA across both light and dark themes
- Semantic heading structure, landmark regions
- Respect `prefers-reduced-motion` — if there's an animated demo, it must not autoplay for users
  who've asked it not to
- Respect `prefers-color-scheme`
- Text must reflow at 200% zoom
- Forced-colours / high-contrast mode should remain legible

If the site is localised later, note that the product supports RTL languages and mirrors correctly.
Building with logical CSS properties from the start makes that cheap.

---

## 14. Things to get right (and things to avoid)

### Get right

- **Lead with the visual.** A screenshot of a 21-message inbox next to the same inbox showing 2
  calendar invites explains this product in under a second. Copy is the supporting act.
- **Treat privacy as architecture, not policy.** "We don't collect your data" is what every
  extension says. "It makes zero network requests and you can check" is a different kind of claim.
  Make the difference visible in the design — evidence, not reassurance.
- **Be honest about the store situation.** Confidence about a temporary state reads as competence;
  vagueness reads as a project that isn't finished.
- **Show the file-type filters.** PDFs / Docs / Sheets / Slides is where a lot of people go from
  "neat" to "I need this".
- **Keep it one page and keep it short.** The product is small and focused. A sprawling site
  misrepresents it.

### Avoid

- **Don't overclaim on AI.** One optional experimental filter detects mail _from_ AI tools. Sift
  runs no models and does nothing with AI. Positioning it as an AI product would be dishonest and
  would forfeit the trust argument the whole page rests on.
- **Don't imply a Google affiliation.** Sift is independent and unaffiliated. Don't use Gmail's
  logo as if it were a partner mark, don't build the site in Google's visual language, and include
  a plain disclaimer in the footer: _"Sift is an independent project and is not affiliated with,
  endorsed by, or sponsored by Google."_
- **Don't fabricate social proof.** No invented testimonials, no fake install counts, no "trusted
  by 10,000 users". A single fabricated number destroys the credibility of every real claim beside
  it.
- **Don't hide the desktop-only limitation.** A mobile visitor who can't install should learn that
  from the page, not from a failed attempt.
- **Don't make debug mode a headline feature.** It's a nice detail for developers and a
  transparency signal. It is not a selling point for the meeting-heavy professional.
- **Don't add an email capture form.** See §7.

---

## 15. Open questions for the client

To resolve before or during design:

1. **Domain.** Is there a domain, and is it `sift`-branded? The product name is generic enough that
   the exact domain may shape the wordmark.
2. **Store timeline.** Rough expected dates for Chrome / Firefox / Safari listings, so the CTA
   swap can be planned rather than rushed.
3. **Demo video.** Is the maintainer able to record a screen capture of live filtering? This is the
   single highest-value missing asset.
4. **Extra captures.** The screenshots are now regenerable on demand (§11). Does the design want
   any beyond the five supplied — a dark-theme inbox, a centred toolbar, an icons-only toolbar, or
   a non-English locale to show off the 25 localisations?
5. **Analytics.** Any traffic measurement wanted at all, and if so, is a privacy-respecting
   cookieless option acceptable? (Recommended: yes to cookieless, or none at all.)
6. **Site localisation.** English only at launch, or should the build anticipate translation given
   the product ships 25 languages?
7. **Support channel.** Is GitHub Issues the only route, or is there a contact address for
   non-technical users who won't open a GitHub account?
8. **Hosting.** GitHub Pages, Netlify, Vercel, or client-managed — affects build tooling choices.

---

## Reference documents in the repository

| Document                        | Contents                                              |
| ------------------------------- | ----------------------------------------------------- |
| `README.md`                     | Full feature and technical documentation              |
| `PRIVACY.md`                    | The complete privacy policy — link this from the site |
| `LICENSE`                       | MIT licence                                           |
| `CONTRIBUTING.md`               | Contribution process                                  |
| `SECURITY.md`                   | Security reporting policy                             |
| `CHANGELOG.md`                  | Version history                                       |
| `docs/screenshots/`             | Product screenshots                                   |
| `src/_locales/en/messages.json` | Exact UI strings                                      |
| `src/assets/icon-source.svg`    | Editable icon                                         |
