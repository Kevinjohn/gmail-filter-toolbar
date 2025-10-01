# Phase 3: Add Experimental Section UI (Empty)

**Goal:** Create the experimental features section in the options page with description text but no options yet.

**Estimated Time:** 15 minutes

---

## Step 3.1: Update HTML Structure

**File:** `src/options.html`

Add this fieldset **before** the closing `</body>` tag (after the theme fieldset, before the script tag).

**Also add i18n localization step for options.js below:**

```html
    <!-- Existing fieldsets above... -->

    <fieldset id="experimental-section">
      <legend data-i18n="experimental_legend">Experimental</legend>
      <p id="experimentalDescription" style="margin-bottom: 1em; font-style: italic;">
        <span data-i18n="experimental_description">Experimental features are in active testing and may only be available in English.</span>
      </p>
      <!-- Options will be added in Phase 4 -->
    </fieldset>

    <script type="module" src="modules/options.js"></script>
  </body>
</html>
```

**Important Notes:**
- Use `data-i18n` attributes for localization
- Text will be set via JavaScript in options.js using `chrome.i18n.getMessage()`
- Add inline style for description to make it visually distinct

---

## Step 3.2: Add Localization

**File:** `src/_locales/en/messages.json`

Add these entries for the experimental section:

```json
{
  "experimental_legend": {
    "message": "Experimental",
    "description": "Legend for experimental features section in options page."
  },
  "experimental_description": {
    "message": "Experimental features are in active testing and may only be available in English.",
    "description": "Description text explaining experimental features may not be fully localized."
  }
}
```

---

## Step 3.3: Update Options Page JavaScript

**File:** `src/modules/options.js`

Add code to set localized text for experimental section (after existing i18n calls, around line 88):

```javascript
// Set experimental section text
const experimentalLegend = document.querySelector('[data-i18n="experimental_legend"]');
const experimentalDescription = document.querySelector('[data-i18n="experimental_description"]');

if (experimentalLegend) {
  experimentalLegend.textContent = getMessage('experimental_legend', 'Experimental');
}
if (experimentalDescription) {
  experimentalDescription.textContent = getMessage('experimental_description', 'Experimental features are in active testing and may only be available in English.');
}
```

---

## Step 3.4: Add CSS Styling (Optional)

**File:** `src/options.css`

Add styling for the experimental section (follows existing UI styling):

```css
#experimentalDescription {
  font-size: 0.9em;
  line-height: 1.4;
}
```

---

## Testing

1. **Build and Load Extension:**
   ```bash
   npm run build
   ```

2. **Load unpacked extension:**
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `dist/` folder

3. **Verify Experimental Section:**
   - Right-click extension icon → Options
   - Scroll to bottom
   - Confirm "Experimental" section exists
   - Confirm description text is present: "Experimental features are in active testing and may only be available in English."
   - Section should be empty (no checkboxes yet)

---

## Commit

```bash
git add src/options.html src/options.css src/modules/options.js src/_locales/en/messages.json
git commit -m "feat: add experimental features section to options page"
```

---

**Next:** Proceed to [Phase 4](plan_experimental_ai-phase-4.md)
