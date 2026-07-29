# Checking for Gmail selector drift

Gmail's markup changes without notice. In 2.10.0 it dropped both `role="toolbar"` and the `.G6`
class from the action bar, which broke every toolbar candidate in `SELECTORS`. The extension kept
working only because `setupGmailToolbarObserver` queries the `.aeH` header directly rather than
going through the toolbar selectors — see the "do not unify" comment in `src/modules/observers.js`.

The failure was invisible to CI: `tests/e2e/fixtures/gmail.html` still described the old markup, so
the e2e suite validated the extension against a Gmail that no longer existed. The fixture is the
tripwire, and a tripwire only works if someone keeps it current.

## The check

Run this in the DevTools console on a loaded Gmail inbox. It reports what each toolbar candidate in
`SELECTORS` currently matches.

```js
console.table(
  [
    '.aeH [gh="tm"]',
    '.G-atb .G6[role="toolbar"]',
    '.G-atb[role="toolbar"]',
    'div[aria-label="Main toolbar"]',
    '.aeH [role="toolbar"]',
  ].map((selector) => ({
    selector,
    matches: document.querySelectorAll(selector).length,
    inHeader: [...document.querySelectorAll(selector)].filter((el) => el.closest('.aeH')).length,
  })),
);
```

## Reading the result

- **At least one row with `inHeader` ≥ 1** — healthy. `findGmailToolbarHeader` resolves.
- **Every row `inHeader: 0`** — the toolbar lookup is broken. Expect `Failed to find Gmail toolbar`
  in the console after the 10-second poll times out, while the toolbar itself still appears via the
  observer path.
- **`matches` > 0 but `inHeader: 0`** on the row the code relies on — the selector now matches
  something outside the header. Gmail has roughly twenty `[role="toolbar"]` elements, nearly all of
  them elsewhere on the page.

## When it drifts

1. Find a stable hook on the current action bar. Prefer Gmail's own `gh` attributes over class
   names — they are not locale-dependent and have outlived several class rotations.
2. Add it to `SELECTORS` in `src/modules/constants.js` as the new first entry in
   `TOOLBAR_CANDIDATE_SELECTORS`, keeping the older ones below as fallbacks.
3. **Update `tests/e2e/fixtures/gmail.html` to the new markup.** Without this the suite stays green
   against markup nobody serves any more, which is exactly how the 2.10.0 bug shipped.
4. Confirm the fixture has teeth: revert only the source change, rebuild, and check the e2e suite
   fails. Then restore it.
