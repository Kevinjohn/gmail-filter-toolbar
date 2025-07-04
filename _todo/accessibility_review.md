The repository already considers accessibility in several places. The README emphasises keyboard behaviour and live‑region updates:

```
107  ## Keyboard & Accessibility Notes
108  * **Tab** order: label → All Mail → Mail Only → Calendar Only → Attachments Only → Gmail’s own toolbar.
109  * **Escape** pressed anywhere inside the custom toolbar moves focus back to the message list (`.UI`) and announces the region to screen-reader users.
110  * `aria-pressed` reflects button state; status text has `aria-live="polite"` for dynamic updates.
```

The toolbar is injected dynamically with ARIA roles and a hidden live region:

```
46    const bar = doc.createElement('div');
48    bar.className = 'gcal-filter-bar';
49    bar.setAttribute('role', 'toolbar');
50    bar.setAttribute('aria-label', chrome.i18n.getMessage('label_toolbar'));
...
98    const liveRegion = doc.createElement('div');
99    liveRegion.className = 'gcal-live-region';
100   liveRegion.setAttribute('role', 'status');
101   liveRegion.setAttribute('aria-live', 'polite');
102   liveRegion.style.cssText = 'position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;';
```

The options page is very minimal:

```
13  <body>
14    <label>
15      <input type="checkbox" id="debug" /> <span id="debugLabel"></span>
16    </label>
17    <script src="modules/options.js"></script>
18  </body>
```

### Areas for improvement

1. **Button semantics**
   - The toolbar buttons are toggle buttons with `aria-pressed`, but they form a mutually exclusive set. WCAG guidance suggests either a `radiogroup` with `role="radio"` elements or a `tablist`. Using `aria-pressed` means screen readers may treat each button as a separate toggle rather than a single selection group.

2. **Material icon announcements**
   - The `<i>` elements containing icon text (`"inbox"`, `"mail"`, etc.) are not hidden from assistive tech. Without `aria-hidden="true"`, screen readers will read `"inbox All Email"`, `"mail Email only"`, etc., which can be confusing. Mark the icons as decorative.

3. **Limited keyboard navigation**
   - Focus order via Tab works, but arrow-key navigation or roving `tabindex` is not implemented. Users accustomed to radio groups expect left/right arrows to move between options. Adding keyboard handlers for arrow keys would improve usability.

4. **Live region placement**
   - The status text is visually hidden with `left: -9999px`. This is an older technique that can fail with some high‑zoom or screen reader settings. Consider using a modern “visually-hidden” class (e.g. `position:absolute; clip:rect(0,0,0,0)` or `clip-path`) as recommended by HTML Accessibility Task Force.

5. **Options page structure**
   - The page lacks a heading and explanatory text. A single checkbox inside a label (lines above) provides no context. Add an `<h1>` and some explanatory copy so screen reader users understand the page purpose. Associate the checkbox with a `<fieldset>`/`<legend>` or `aria-labelledby`.

6. **High-contrast affordance**
   - Colours in `colours.css` have good contrast, but the debug overlay relies solely on colour (light blue at 50% opacity). Users with colour-vision deficiencies may not notice the difference. Consider an additional pattern or outline when debug mode is on.

7. **Further localisation**
   - Only `en` and `en_GB` locale bundles are present. Screen reader users in other languages will hear untranslated English strings. Expanding the localisation set would improve accessibility for non-English speakers.

8. **Automated testing**
   - The README instructs running Axe DevTools expecting zero violations, yet there are no automated accessibility tests in the repository. Integrating axe-core or similar in the Jest suite would prevent regressions.

Overall the extension is on the right track but could benefit from more robust ARIA semantics, richer keyboard handling, improved localisation, and clearer options-page content to better meet WCAG 2.1 AA requirements.
