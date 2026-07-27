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
