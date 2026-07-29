# Privacy Policy

**Last updated:** 29 July 2026

This policy covers the Sift — A Filter Toolbar for Gmail browser extension for Chrome, Edge, Firefox, and
Safari.

## Summary

The extension collects nothing, transmits nothing, and contacts no server. It has no analytics, no
telemetry, no advertising, no tracking, and no accounts. Everything it does happens locally in your
browser.

## What the extension does not do

- It does not collect, store, or transmit your email content, subject lines, sender or recipient
  addresses, attachments, or calendar data.
- It does not collect personally identifiable information, authentication credentials, or OAuth
  tokens.
- It does not make any network requests. The extension ships with no remote code and no remote
  resources — its icon font is embedded directly in the extension package rather than loaded from a
  content delivery network.
- It does not use analytics, telemetry, crash reporting, cookies, or tracking pixels of any kind.
- It does not sell or share any data with third parties, because it holds no data to sell or share.

## What the extension accesses

The extension runs a content script on `https://mail.google.com/*` only. That script reads the
Gmail message list already rendered in your browser tab in order to decide which rows to show or
hide for the filter you selected. This reading happens entirely in the page, in memory, and the
results are never stored, copied, logged, or sent anywhere. The extension has no access to any
other website.

## What the extension stores

The extension stores only your own display preferences, using the browser's extension storage
(`storage.sync` where available, falling back to `storage.local`):

| Setting                    | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `siftMode`                 | The filter you last selected                        |
| `siftTheme`                | Your chosen colour theme                            |
| `siftDebug`                | Whether debug highlighting is enabled               |
| `siftShowButtonText`       | Whether toolbar buttons show labels or icons only   |
| `siftShowFavourites`       | Whether the Favourites button is shown              |
| `siftShowAiNotetakers`     | Whether the AI & Notes button is shown              |
| `siftShowDevNotifications` | Whether the developer notifications button is shown |
| `siftToolbarAlignment`     | Where the toolbar sits relative to Gmail's controls |
| `siftModeWriteId`          | Marks which browser tab made the last filter write  |
| `siftOptionsWriteId`       | Marks which page made the last options write        |

These values contain no personal information. If your browser profile has sync enabled, the browser
itself may sync these preferences between your own signed-in devices; that transfer is performed by
your browser, not by this extension, and is governed by your browser vendor's privacy policy.
Uninstalling the extension removes these values.

## Permissions and why they are needed

| Permission                  | Reason                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `storage`                   | Persists the display preferences listed above across sessions.                                               |
| `https://mail.google.com/*` | The toolbar is injected into the Gmail message list and filters it. The extension has no function elsewhere. |

No other permissions are requested.

## Children

The extension is not directed at children and collects no data from anyone, including children.

## Changes to this policy

Material changes will be recorded in [CHANGELOG.md](CHANGELOG.md) and reflected in the "Last
updated" date above.

## Contact

Questions or concerns: open an issue at
<https://github.com/Kevinjohn/sift/issues>. For security reports, see
[SECURITY.md](SECURITY.md).
