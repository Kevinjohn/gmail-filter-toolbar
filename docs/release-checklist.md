# Release checklist

Complete this checklist for every tagged release. Keep the command output and screenshots with the
release record so browser-specific behavior has repeatable evidence.

## Automated gates

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm run lint`
- [ ] `pnpm run format:check`
- [ ] `pnpm run lint:locales`
- [ ] `pnpm run lint:docs`
- [ ] `pnpm run test:unit`
- [ ] `pnpm run build`
- [ ] `pnpm run verify:dist`
- [ ] `pnpm run release:build`
- [ ] Confirm release verification accepts all manifest-referenced assets in all three archives.
- [ ] Confirm Firefox `web-ext lint` reports zero errors, notices, and warnings.
- [ ] Confirm the enabled CI and browser-regression workflows pass.

## Chrome and Edge

- [ ] Load `dist/chrome/` unpacked in a clean browser profile.
- [ ] Run the selector check in `docs/notes/gmail-selector-drift.md` against real Gmail and confirm
      the console is free of `Failed to find Gmail toolbar`. Gmail's markup changes without notice
      and the e2e fixture only catches drift once someone updates it.
- [ ] Open Gmail in English, German, French, Spanish, and one right-to-left locale.
- [ ] Confirm the toolbar and options page use the selected locale rather than falling back to
      English.
- [ ] Confirm All, Mail, Calendar, Attachments, Favourites, and every attachment subtype filter.
- [ ] Confirm icon-only mode survives Gmail navigation and toolbar reinjection.
- [ ] Upgrade from the previous release and confirm the selected filter and experimental settings
      remain unchanged.
- [ ] Navigate the toolbar by keyboard, test 200% zoom and forced colours, and confirm live-region
      announcements with a screen reader. Record the browser and assistive-technology versions.

## Firefox

- [ ] Run `pnpm run firefox:run` in a temporary Firefox profile.
- [ ] Grant the Gmail host permission and repeat the core filter and options checks.
- [ ] Restart Firefox and confirm synced settings and the selected mode persist.
- [ ] Install the archive from `artifacts/firefox/` and confirm the background event page starts
      without errors.

## Safari

- [ ] Run `pnpm run safari:convert` on macOS and build the generated wrapper in Xcode.
- [ ] Enable the extension in a clean Safari profile and repeat the core filter and options checks.
- [ ] Restart Safari and confirm settings persist using the storage backend Safari provides.
- [ ] Confirm the options page opens in a tab and no `storage.sync` errors appear.

## Publication

- [ ] Confirm `package.json` and all three manifests use the same version.
- [ ] Confirm `CHANGELOG.md` contains the tagged version and release date.
- [ ] Confirm the Material Symbols licence and notice are present in every archive.
- [ ] Confirm the root `LICENSE` in every archive exactly matches the repository MIT licence.
- [ ] Enable GitHub private vulnerability reporting and confirm the **Report a vulnerability**
      button is visible after the repository becomes public.
- [ ] Record the tested browser versions, operating systems, command output, and screenshots.

## Chrome Web Store listing

Complete this section for the first submission, then re-check the starred items on every update.

### Before uploading

- [ ] Confirm the developer account has paid the one-time registration fee and completed email and
      publisher verification.
- [ ] Confirm the extension name does not lead with a Google trademark. Google branding rules
      disallow "Gmail" as the leading or prominent word in a third-party product name; use the
      `<Name> for Gmail` form instead.
- [ ] \* Confirm `PRIVACY.md` is published at a public URL and its "Last updated" date matches the
      release.
- [ ] \* Confirm the built archive contains no remote code, no source maps, and no `.DS_Store`
      entries: `unzip -l artifacts/chrome/*.zip`.
- [ ] \* Confirm the store description is 132 characters or fewer and matches
      `extension_description` in `src/_locales/en/messages.json`.

### Listing assets

- [ ] At least one screenshot at 1280x800 or 640x400 (PNG or JPEG, no alpha). Five is the maximum.
- [ ] Screenshots cover the toolbar in the inbox, each filter mode, the options page, and icon-only
      mode.
- [ ] 128x128 store icon (reuse `src/icons/icon128.png`).
- [ ] Optional: 440x280 small promo tile.

### Dashboard fields

- [ ] Single purpose: "Adds a toolbar to Gmail that filters the visible message list client-side by
      category."
- [ ] `storage` justification: "Persists the user's selected filter mode and display preferences
      across sessions."
- [ ] `https://mail.google.com/*` justification: "The toolbar is injected into and filters the Gmail
      message list; the extension has no function on any other site."
- [ ] \* Data usage certification: declare no data collected and tick all three compliance
      statements (no sale, no unrelated use, no creditworthiness use).
- [ ] \* Privacy policy URL entered.

### After submission

- [ ] Record the submission date and item ID. Expect manual review because the extension requests a
      host permission on Gmail; a first submission can take up to two weeks.
- [ ] On approval, add the Web Store link to `README.md`.
