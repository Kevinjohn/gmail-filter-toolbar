# Implementation Plan: Experimental AI & Transcription Filter

**Target Audience:** Junior developer with basic JavaScript knowledge
**Estimated Time:** 2-3 hours
**Prerequisites:** Familiarity with Chrome extension basics, HTML, CSS, JavaScript ES6 modules

---

## Overview

This plan implements a new "AI & Transcription" filter button for Gmail that shows only emails from AI services (Gemini, Otter.ai, Fathom). The feature will be marked as experimental and hidden by default, with an option to enable it on the options page.

---

## Phase 1: Add JSDoc Annotations to Existing Features

**Goal:** Document all existing features with `@experimental` or `@stable` JSDoc comments for clarity.

### Step 1.1: Annotate Constants

**File:** `src/modules/constants.js`

Add JSDoc comments above each major export:

```javascript
/**
 * Storage key for button text visibility preference.
 * @stable
 */
export const SHOW_BUTTON_TEXT_KEY = 'showButtonText';

/**
 * Storage key for favourites button visibility.
 * @stable
 */
export const SHOW_FAVOURITES_KEY = 'showFavourites';

/**
 * Storage key for toolbar alignment preference.
 * @stable
 */
export const ALIGNMENT_KEY = 'toolbarAlignment';

/**
 * Storage key for theme preference.
 * @stable
 */
export const THEME_KEY = 'gmailCalTheme';

/**
 * Theme options enum.
 * @stable
 */
export const THEMES = {
  // ... existing code
};

/**
 * Toolbar alignment options enum.
 * @stable
 */
export const ALIGNMENTS = {
  // ... existing code
};

/**
 * Configuration for different attachment types.
 * @stable
 */
export const ATTACHMENT_TYPE_CONFIG = {
  // ... existing code
};

/**
 * DOM selectors for Gmail elements.
 * @stable
 */
export const SELECTORS = {
  // ... existing code
};
```

### Step 1.2: Annotate State Variables

**File:** `src/modules/state.js`

Add JSDoc comments to state exports:

```javascript
/**
 * Storage key for current filter mode.
 * @stable
 */
export const KEY_MODE = 'gmailCalMode';

/**
 * Storage key for debug mode.
 * @stable
 */
export const KEY_DEBUG = 'gmailCalDebug';

/**
 * Available filter modes.
 * @stable
 */
export const MODES = {
  // ... existing code
};

// Above the state variables (around line 28):
/**
 * Current active filter mode.
 * @stable
 */
export let currentMode = MODES.ALL;

/**
 * Debug mode flag.
 * @stable
 */
export let debugOn = false;

/**
 * Show button text preference.
 * @stable
 */
export let showButtonText = true;

/**
 * Theme preference.
 * @stable
 */
export let themePreference = THEMES.SYSTEM;

/**
 * Favourites button visibility.
 * @stable
 */
export let showFavouritesButton = false;

/**
 * Toolbar alignment preference.
 * @stable
 */
export let toolbarAlignment = ALIGNMENTS.START;
```

### Step 1.3: Annotate Filter Functions

**File:** `src/modules/filter.js`

Add JSDoc to each filter detection function:

```javascript
/**
 * Checks if an email row is a calendar invitation.
 * @stable
 */
export function isCalendarRow(row, chromeApi = chrome) {
  // ... existing code
}

/**
 * Checks if an email row has Google Doc attachments.
 * @stable
 */
export function isGoogleDocAttachment(row) {
  // ... existing code
}

/**
 * Checks if an email row has any attachments.
 * @stable
 */
export function hasAttachmentRow(row) {
  // ... existing code
}

/**
 * Checks if an email row is starred/favourited.
 * @stable
 */
export function isFavouriteRow(row, chromeApi = chrome) {
  // ... existing code
}

/**
 * Checks if an email row contains a specific type of attachment.
 * @stable
 */
export function hasSpecificAttachmentType(row, attachmentType) {
  // ... existing code
}
```

---

## Phase 2: Document Future Feature Flag System

**Goal:** Add a TODO item to the README for future enhancement when the codebase scales.

### Step 2.1: Add TODO Section to README

**File:** `README.md` or `CLAUDE.md` (wherever TODOs are tracked)

Add this section to the end of the document:

```markdown
## Future Enhancements

### Feature Flag System (Configuration Object)

When the number of experimental features grows (3+ features), consider migrating from JSDoc comments to a centralized feature flag configuration object.

**Proposed Implementation:**

```javascript
// src/modules/constants.js

/**
 * Centralized feature flag registry.
 * Tracks all optional features with their metadata.
 */
export const FEATURE_FLAGS = {
  AI_NOTETAKERS: {
    experimental: true,
    storageKey: 'showAiNotetakers',
    mode: 'AI_NOTETAKERS',
    since: '2.1.0',  // Version when added
  },
  FAVOURITES: {
    experimental: false,
    storageKey: 'showFavourites',
    mode: 'FAVOURITES',
    since: '1.0.0',
  },
  // Add more features here...
};

/**
 * Helper to check if a feature is experimental.
 * @param {string} featureName - Key from FEATURE_FLAGS
 * @returns {boolean}
 */
export function isExperimentalFeature(featureName) {
  return FEATURE_FLAGS[featureName]?.experimental ?? false;
}

/**
 * Get all experimental features.
 * @returns {Array<[string, object]>} Array of [featureName, config] tuples
 */
export function getExperimentalFeatures() {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, config]) => config.experimental);
}
```

**Migration Steps:**
1. Create `FEATURE_FLAGS` object in `constants.js`
2. Move all JSDoc `@experimental` features into the object
3. Update options page to dynamically render experimental features
4. Replace direct storage key references with `FEATURE_FLAGS[feature].storageKey`
5. Remove JSDoc annotations in favor of centralized config

**Benefits:**
- Single source of truth for all features
- Runtime queries (filter, map experimental features)
- Easy to add metadata (version, deprecation date, telemetry)
- Supports feature graduation (experimental → stable)

**When to migrate:**
- 3+ experimental features exist
- Need to programmatically list/filter features
- Want to add feature versioning or telemetry
```

---

## Phase 3: Add Experimental Section UI (Empty)

**Goal:** Create the experimental features section in the options page with description text but no options yet.

### Step 3.1: Update HTML Structure

**File:** `src/options.html`

Add this fieldset **before** the closing `</body>` tag (after the theme fieldset, before the script tag):

```html
    <!-- Existing fieldsets above... -->

    <fieldset id="experimental-section">
      <legend id="experimentalLegend">Experimental</legend>
      <p id="experimentalDescription" style="margin-bottom: 1em; font-style: italic; color: var(--gcal-text-color);">
        The following features are in Beta for wider testing purposes.
      </p>
      <!-- Options will be added in Phase 4 -->
    </fieldset>

    <script type="module" src="modules/options.js"></script>
  </body>
</html>
```

**Important Notes:**
- Use `id="experimentalLegend"` and `id="experimentalDescription"` for JavaScript references
- Text is **hardcoded in English** (not localized via `chrome.i18n`)
- Add inline style for description to make it visually distinct

### Step 3.2: Add CSS Styling (Optional)

**File:** `src/options.css`

Add styling for the experimental section (optional, for visual distinction):

```css
#experimental-section {
  border-color: #ff9800; /* Orange border for experimental */
  background-color: rgba(255, 152, 0, 0.05); /* Subtle orange tint */
}

#experimentalLegend {
  color: #ff9800;
}

#experimentalDescription {
  font-size: 0.9em;
  line-height: 1.4;
}
```

**Testing:**
1. Run `npm run build`
2. Load extension in Chrome
3. Right-click extension icon → Options
4. Verify "Experimental" section appears at bottom with description text
5. Section should be empty (no checkboxes yet)

---

## Phase 4: Implement AI & Transcription Filter

**Goal:** Add the full AI & Transcription filter feature with option to enable/disable it.

### Step 4.1: Add Constants

**File:** `src/modules/constants.js`

Add these exports at the appropriate locations:

```javascript
// Add with other storage keys (around line 1-4):
/**
 * Storage key for AI & Transcription button visibility.
 * @experimental
 * @since 2.1.0
 */
export const SHOW_AI_NOTETAKERS_KEY = 'showAiNotetakers';

// Add with SELECTORS object (around line 57-142):
export const SELECTORS = {
  // ... existing selectors ...

  /**
   * Selector for the sender name element within an email row.
   * Targets the span containing the sender's display name.
   * @experimental - Used by AI & Transcription filter
   */
  senderName: '.yW span.zF[name]',

  // ... existing selectors ...
};

// Add after ATTACHMENT_TYPE_CONFIG (around line 56):
/**
 * Regex patterns to match AI services and transcription tools.
 * Patterns are case-insensitive and match against sender display name.
 * @experimental
 * @since 2.1.0
 */
export const AI_NOTETAKER_PATTERNS = [
  /gemini/i,      // Google Gemini AI
  /otter\.ai/i,   // Otter.ai transcription service
  /fathom/i,      // Fathom video transcription
];
```

### Step 4.2: Update State Management

**File:** `src/modules/state.js`

**Part A: Add to MODES enum (around line 13-24):**

```javascript
export const MODES = {
  ALL: 'ALL',
  EMAIL: 'EMAIL',
  CALENDAR: 'CALENDAR',
  ATTACH: 'ATTACH',
  FAVOURITES: 'FAVOURITES',
  AI_NOTETAKERS: 'AI_NOTETAKERS',  // ADD THIS LINE
  IMAGE: 'IMAGE',
  PDF: 'PDF',
  DOCUMENT: 'DOCUMENT',
  SPREADSHEET: 'SPREADSHEET',
  PRESENTATION: 'PRESENTATION',
};
```

**Part B: Add state variable (around line 32):**

```javascript
/**
 * AI & Transcription button visibility.
 * @experimental
 * @since 2.1.0
 */
export let showAiNotetakersButton = false;
```

**Part C: Add setter function (around line 49):**

```javascript
/**
 * Sets AI & Transcription button visibility.
 * @experimental
 * @param {boolean} value
 */
export function setShowAiNotetakersButton(value) {
  showAiNotetakersButton = !!value;
}
```

**Part D: Update imports at top of file:**

```javascript
import {
  ALIGNMENT_KEY,
  ALIGNMENTS,
  SHOW_BUTTON_TEXT_KEY,
  SHOW_FAVOURITES_KEY,
  SHOW_AI_NOTETAKERS_KEY,  // ADD THIS LINE
  THEME_KEY,
  THEMES,
} from './constants.js';
```

**Part E: Update `loadState()` function (around line 57-84):**

Find the line `chrome.storage.sync.get(` and update the array to include the new key:

```javascript
export function loadState() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(
      [KEY_MODE, KEY_DEBUG, SHOW_BUTTON_TEXT_KEY, SHOW_FAVOURITES_KEY, SHOW_AI_NOTETAKERS_KEY, ALIGNMENT_KEY, THEME_KEY],  // MODIFIED LINE
      (res) => {
        if (chrome.runtime.lastError) {
          console.error('Error retrieving storage data:', chrome.runtime.lastError);
          currentMode = MODES.ALL;
          debugOn = false;
          showButtonText = true;
          themePreference = THEMES.SYSTEM;
          showFavouritesButton = false;
          showAiNotetakersButton = false;  // ADD THIS LINE
          toolbarAlignment = ALIGNMENTS.START;
          reject(chrome.runtime.lastError);
        } else {
          currentMode = res[KEY_MODE] || MODES.ALL;
          debugOn = !!res[KEY_DEBUG];
          showButtonText =
            res[SHOW_BUTTON_TEXT_KEY] !== undefined ? res[SHOW_BUTTON_TEXT_KEY] : true;
          setThemePreference(res[THEME_KEY]);
          setShowFavouritesButton(res[SHOW_FAVOURITES_KEY]);
          setShowAiNotetakersButton(res[SHOW_AI_NOTETAKERS_KEY]);  // ADD THIS LINE
          setToolbarAlignment(res[ALIGNMENT_KEY]);
          resolve();
        }
      },
    );
  });
}
```

### Step 4.3: Add Filter Detection Logic

**File:** `src/modules/filter.js`

**Part A: Add import at top:**

```javascript
import { MODES, currentMode, debugOn } from './state.js';
import { SELECTORS, ATTACHMENT_TYPE_CONFIG, AI_NOTETAKER_PATTERNS } from './constants.js';  // MODIFIED LINE
```

**Part B: Add detection function (after `isFavouriteRow`, around line 33):**

```javascript
/**
 * Checks if an email row is from an AI service or transcription tool.
 * Matches sender name against patterns in AI_NOTETAKER_PATTERNS.
 * @experimental
 * @since 2.1.0
 * @param {HTMLElement} row - The DOM element for the email row.
 * @returns {boolean} True if sender matches any AI/notetaker pattern.
 */
export function isAiNotetakerRow(row) {
  const senderElement = row.querySelector(SELECTORS.senderName);
  if (!senderElement) return false;

  const senderName = senderElement.getAttribute('name') || '';

  return AI_NOTETAKER_PATTERNS.some(pattern => pattern.test(senderName));
}
```

**Part C: Add to FILTER_CONFIG (around line 110, after PRESENTATION):**

```javascript
const FILTER_CONFIG = {
  // ... existing filters ...
  [MODES.PRESENTATION]: {
    labelKey: 'button_filter_presentations',
    filterFn: (row) => !hasSpecificAttachmentType(row, MODES.PRESENTATION),
  },
  [MODES.AI_NOTETAKERS]: {
    labelKey: 'btn_ai_notetakers',
    filterFn: (row) => !isAiNotetakerRow(row),
  },  // ADD THIS ENTRY
};
```

### Step 4.4: Add Toolbar Button

**File:** `src/modules/toolbar.js`

**Part A: Update imports (line 1-2):**

```javascript
import { ALIGNMENTS, ATTACHMENT_TYPE_CONFIG, SELECTORS } from './constants.js';
import { MODES, currentMode, showFavouritesButton, showAiNotetakersButton, toolbarAlignment } from './state.js';  // MODIFIED LINE
```

**Part B: Add to BASE_FILTER_CONFIG (after ATTACH, around line 25):**

```javascript
const BASE_FILTER_CONFIG = {
  [MODES.ALL]: {
    icon: 'inbox',
    labelKey: 'btn_all',
  },
  [MODES.EMAIL]: {
    icon: 'mail',
    labelKey: 'btn_mail',
  },
  [MODES.CALENDAR]: {
    icon: 'calendar_today',
    labelKey: 'btn_cal',
  },
  [MODES.FAVOURITES]: {
    icon: 'star',
    labelKey: 'btn_fav',
  },
  [MODES.ATTACH]: {
    icon: 'attachment',
    labelKey: 'btn_attach',
  },
  [MODES.AI_NOTETAKERS]: {
    icon: 'smart_toy',
    labelKey: 'btn_ai_notetakers',
  },  // ADD THIS ENTRY
};
```

**Part C: Update BASE_FILTER_ORDER (around line 28-34):**

```javascript
const BASE_FILTER_ORDER = [
  MODES.ALL,
  MODES.EMAIL,
  MODES.CALENDAR,
  MODES.FAVOURITES,
  MODES.ATTACH,
  MODES.AI_NOTETAKERS,  // ADD THIS LINE (at the end, before attachment types)
];
```

**Part D: Update `injectToolbar()` to hide button by default (around line 84-89):**

Find the section where FAVOURITES button visibility is handled and add similar logic for AI_NOTETAKERS:

```javascript
  // Add base filter buttons
  BASE_FILTER_ORDER.forEach((mode) => {
    const config = BASE_FILTER_CONFIG[mode];
    const button = createFilterButton(doc, mode, config.icon, config.labelKey);
    if (mode === MODES.FAVOURITES && !showFavouritesButton) {
      button.hidden = true;
      button.setAttribute('aria-hidden', 'true');
      button.setAttribute('tabindex', '-1');
    }
    // ADD THESE LINES:
    if (mode === MODES.AI_NOTETAKERS && !showAiNotetakersButton) {
      button.hidden = true;
      button.setAttribute('aria-hidden', 'true');
      button.setAttribute('tabindex', '-1');
    }
    btnGroup.appendChild(button);
  });
```

**Part E: Update `injectToolbar()` call to visibility update (around line 108):**

```javascript
  updateAlignmentView(toolbarAlignment, doc);
  updateFavouritesVisibility(showFavouritesButton, doc);
  updateAiNotetakersVisibility(showAiNotetakersButton, doc);  // ADD THIS LINE
  refreshUI(doc);
```

**Part F: Add visibility toggle function (after `updateFavouritesVisibility`, around line 212):**

```javascript
/**
 * Shows or hides the AI & Transcription filter button.
 * @experimental
 * @param {boolean} show - Whether to show the button.
 * @param {Document} doc - The document object.
 */
export function updateAiNotetakersVisibility(show, doc = document) {
  const button = doc.querySelector('#filter-AI_NOTETAKERS');
  if (!button) {
    return;
  }

  button.hidden = !show;
  if (show) {
    button.removeAttribute('aria-hidden');
  } else {
    button.setAttribute('aria-hidden', 'true');
    button.setAttribute('aria-checked', 'false');
    button.setAttribute('tabindex', '-1');
  }
}
```

### Step 4.5: Update Options Page HTML

**File:** `src/options.html`

Update the experimental fieldset created in Phase 3 to include the checkbox:

```html
    <fieldset id="experimental-section">
      <legend id="experimentalLegend">Experimental</legend>
      <p id="experimentalDescription" style="margin-bottom: 1em; font-style: italic; color: var(--gcal-text-color);">
        The following features are in Beta for wider testing purposes.
      </p>
      <!-- ADD THIS OPTION ROW: -->
      <div class="option-row">
        <label for="show-ai-notetakers-checkbox" id="showAiNotetakersLabel">Show AI & Transcription button</label>
        <input type="checkbox" id="show-ai-notetakers-checkbox">
      </div>
    </fieldset>
```

### Step 4.6: Update Options Page JavaScript

**File:** `src/modules/options.js`

**Part A: Update imports (line 1-8):**

```javascript
import {
  ALIGNMENT_KEY,
  ALIGNMENTS,
  SHOW_BUTTON_TEXT_KEY,
  SHOW_FAVOURITES_KEY,
  SHOW_AI_NOTETAKERS_KEY,  // ADD THIS LINE
  THEME_KEY,
  THEMES,
} from './constants.js';
```

**Part B: Add element references (after line 26):**

```javascript
const themeOptionSystem = document.getElementById('themeOptionSystem');
const themeOptionLight = document.getElementById('themeOptionLight');
const themeOptionDark = document.getElementById('themeOptionDark');
// ADD THESE LINES:
const showAiNotetakersCheckbox = document.getElementById('show-ai-notetakers-checkbox');
const showAiNotetakersLabel = document.getElementById('showAiNotetakersLabel');
```

**Part C: Set hardcoded English text (after localized text, around line 88):**

```javascript
if (themeOptionDark) {
  themeOptionDark.textContent = getMessage('options_theme_dark', 'Dark');
}
// ADD THESE LINES (hardcoded English, not localized):
if (showAiNotetakersLabel) {
  showAiNotetakersLabel.textContent = 'Show AI & Transcription button';
}
```

**Part D: Update `save_options()` function (around line 91-110):**

Find where `favouritesValue` is defined and add the AI notetakers value:

```javascript
function save_options() {
  const themeValue = themeSelect ? themeSelect.value : THEMES.SYSTEM;
  const alignmentValue = alignmentSelect ? alignmentSelect.value : ALIGNMENTS.START;
  const favouritesValue = showFavouritesCheckbox ? showFavouritesCheckbox.checked : false;
  const aiNotetakersValue = showAiNotetakersCheckbox ? showAiNotetakersCheckbox.checked : false;  // ADD THIS LINE
  chrome.storage.sync.set(
    {
      gmailCalDebug: debugCheckbox.checked,
      [SHOW_BUTTON_TEXT_KEY]: showButtonTextCheckbox.checked,
      [SHOW_FAVOURITES_KEY]: favouritesValue,
      [SHOW_AI_NOTETAKERS_KEY]: aiNotetakersValue,  // ADD THIS LINE
      [ALIGNMENT_KEY]: alignmentValue,
      [THEME_KEY]: themeValue,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving options:', chrome.runtime.lastError);
      }
    },
  );
  applyTheme(document, themeValue);
}
```

**Part E: Update `restore_options()` function (around line 113-138):**

```javascript
function restore_options() {
  chrome.storage.sync.get(
    ['gmailCalDebug', SHOW_BUTTON_TEXT_KEY, SHOW_FAVOURITES_KEY, SHOW_AI_NOTETAKERS_KEY, ALIGNMENT_KEY, THEME_KEY],  // MODIFIED LINE
    (res) => {
      if (chrome.runtime.lastError) {
        console.error('Error retrieving options:', chrome.runtime.lastError);
      } else {
        debugCheckbox.checked = !!res.gmailCalDebug;
        showButtonTextCheckbox.checked = !!res[SHOW_BUTTON_TEXT_KEY];
        const restoredTheme = normalizeTheme(res[THEME_KEY] ?? THEMES.SYSTEM);
        const restoredAlignment = normalizeAlignment(res[ALIGNMENT_KEY]);
        const showFavourites = !!res[SHOW_FAVOURITES_KEY];
        const showAiNotetakers = !!res[SHOW_AI_NOTETAKERS_KEY];  // ADD THIS LINE
        if (themeSelect) {
          themeSelect.value = restoredTheme;
        }
        if (alignmentSelect) {
          alignmentSelect.value = restoredAlignment;
        }
        if (showFavouritesCheckbox) {
          showFavouritesCheckbox.checked = showFavourites;
        }
        // ADD THESE LINES:
        if (showAiNotetakersCheckbox) {
          showAiNotetakersCheckbox.checked = showAiNotetakers;
        }
        applyTheme(document, restoredTheme);
      }
    },
  );
}
```

**Part F: Add event listener (after line 151):**

```javascript
if (alignmentSelect) {
  alignmentSelect.addEventListener('change', save_options);
}
// ADD THESE LINES:
if (showAiNotetakersCheckbox) {
  showAiNotetakersCheckbox.addEventListener('change', save_options);
}
```

### Step 4.7: Update Content Script for Real-time Updates

**File:** `src/contentScript.js`

Find the `chrome.storage.onChanged` listener and add handling for the new key:

```javascript
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;

  // ... existing handlers for other keys ...

  // ADD THIS SECTION:
  if (changes[SHOW_AI_NOTETAKERS_KEY]) {
    setShowAiNotetakersButton(changes[SHOW_AI_NOTETAKERS_KEY].newValue);
    updateAiNotetakersVisibility(showAiNotetakersButton);
    refreshUI();
  }
});
```

Make sure the imports at the top of `contentScript.js` include:

```javascript
import { SHOW_AI_NOTETAKERS_KEY } from './modules/constants.js';
import { setShowAiNotetakersButton, showAiNotetakersButton } from './modules/state.js';
import { updateAiNotetakersVisibility } from './modules/toolbar.js';
```

### Step 4.8: Add Localization (English Only for Now)

**File:** `src/_locales/en/messages.json`

Add this entry (placement doesn't matter, but keep alphabetical order):

```json
{
  "btn_ai_notetakers": {
    "message": "AI & Transcription",
    "description": "Button to show emails from AI services and transcription tools."
  }
}
```

**For other locales:** You can either:
1. Add the same English text to all locale files
2. Leave it out (Chrome will fall back to English)

---

## Testing Checklist

### Manual Testing

1. **Build and Load Extension:**
   ```bash
   npm run build
   ```
   - Load unpacked extension from `dist/` folder in Chrome

2. **Verify Experimental Section:**
   - Open extension options (right-click icon → Options)
   - Scroll to bottom
   - Confirm "Experimental" section exists with orange styling
   - Confirm description text is present
   - Confirm "Show AI & Transcription button" checkbox exists
   - Checkbox should be **unchecked by default**

3. **Enable Feature:**
   - Check the "Show AI & Transcription button" checkbox
   - Open Gmail in a new tab
   - Confirm toolbar appears with new "AI & Transcription" button (smart_toy icon)
   - Button should be at the end of the base filter buttons

4. **Test Filtering:**
   - Find an email from Gemini (or Otter.ai, Fathom)
   - Click "AI & Transcription" button
   - Only emails from those senders should be visible
   - Other emails should be hidden

5. **Test Toggle:**
   - Go back to options page
   - Uncheck "Show AI & Transcription button"
   - Return to Gmail (or refresh)
   - Button should disappear from toolbar

6. **Debug Mode:**
   - Enable debug mode in options
   - Click "AI & Transcription" filter
   - Filtered-out emails should have blue tint at 50% opacity (not hidden)

### Unit Testing

Create test file: `tests/filter.test.js`

Add test cases for `isAiNotetakerRow()`:

```javascript
import { isAiNotetakerRow } from '../src/modules/filter.js';

describe('isAiNotetakerRow', () => {
  it('should return true for Gemini sender', () => {
    const row = document.createElement('tr');
    const senderSpan = document.createElement('span');
    senderSpan.className = 'zF';
    senderSpan.setAttribute('name', 'Gemini');
    senderSpan.setAttribute('email', 'gemini-notes@google.com');

    const container = document.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);

    expect(isAiNotetakerRow(row)).toBe(true);
  });

  it('should return true for Otter.ai sender', () => {
    const row = document.createElement('tr');
    const senderSpan = document.createElement('span');
    senderSpan.className = 'zF';
    senderSpan.setAttribute('name', 'Otter.ai');
    senderSpan.setAttribute('email', 'no-reply@otter.ai');

    const container = document.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);

    expect(isAiNotetakerRow(row)).toBe(true);
  });

  it('should return false for regular sender', () => {
    const row = document.createElement('tr');
    const senderSpan = document.createElement('span');
    senderSpan.className = 'zF';
    senderSpan.setAttribute('name', 'John Doe');
    senderSpan.setAttribute('email', 'john@example.com');

    const container = document.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);

    expect(isAiNotetakerRow(row)).toBe(false);
  });

  it('should be case-insensitive', () => {
    const row = document.createElement('tr');
    const senderSpan = document.createElement('span');
    senderSpan.className = 'zF';
    senderSpan.setAttribute('name', 'GEMINI');  // Uppercase
    senderSpan.setAttribute('email', 'gemini@google.com');

    const container = document.createElement('div');
    container.className = 'yW';
    container.appendChild(senderSpan);
    row.appendChild(container);

    expect(isAiNotetakerRow(row)).toBe(true);
  });
});
```

Run tests:
```bash
npm test
```

---

## Troubleshooting

### Button Not Appearing
- Check browser console for errors
- Verify checkbox is enabled in options
- Verify `showAiNotetakersButton` state is `true` in `chrome.storage.sync` (DevTools → Application → Storage)
- Check that `updateAiNotetakersVisibility()` is called in `injectToolbar()`

### Filter Not Working
- Inspect Gmail email row with DevTools
- Verify sender element matches selector `.yW span.zF[name]`
- Check sender name attribute value
- Add `console.log(senderName)` in `isAiNotetakerRow()` to debug
- If Gmail changed DOM, update `SELECTORS.senderName`

### Option Not Saving
- Check `chrome.runtime.lastError` in console
- Verify storage key is correct: `showAiNotetakers`
- Check `save_options()` includes `SHOW_AI_NOTETAKERS_KEY`

### Gmail Selector Changed
If Gmail updates its DOM and `.yW span.zF[name]` no longer works:
1. Open Gmail and inspect an email row
2. Find the element containing sender name
3. Identify stable attributes (class, data attributes)
4. Update `SELECTORS.senderName` in `constants.js`
5. Update test mocks in `tests/filter.test.js`

---

## Commit Checklist

Before committing, verify:

- [ ] All JSDoc comments added (Phase 1)
- [ ] README/CLAUDE.md updated with future enhancement TODO (Phase 2)
- [ ] Experimental section visible in options page (Phase 3)
- [ ] AI & Transcription filter working (Phase 4)
- [ ] Checkbox defaults to OFF
- [ ] Button hidden by default
- [ ] Button appears when checkbox enabled
- [ ] Filtering works (shows only Gemini/Otter.ai/Fathom emails)
- [ ] Unit tests pass: `npm test`
- [ ] Lint passes: `npm run lint`
- [ ] Manual testing completed
- [ ] Code formatted: `npm run format`

---

## Extending This Feature

### Adding More AI Services

To add more AI/transcription services (e.g., Fireflies.ai, Claude, etc.):

1. Open `src/modules/constants.js`
2. Find `AI_NOTETAKER_PATTERNS`
3. Add new regex pattern:
   ```javascript
   export const AI_NOTETAKER_PATTERNS = [
     /gemini/i,
     /otter\.ai/i,
     /fathom/i,
     /fireflies\.ai/i,  // NEW
     /claude/i,         // NEW
   ];
   ```
4. Rebuild: `npm run build`
5. Test with emails from new senders

### Making It Stable (Graduating from Experimental)

When ready to make this a stable feature:

1. Remove `@experimental` JSDoc tags
2. Add `@stable` JSDoc tags
3. Move checkbox from "Experimental" section to main options
4. Localize all text (add to all locale files)
5. Update `SHOW_AI_NOTETAKERS_KEY` default to `true` in `background.js`
6. Remove orange styling from CSS
7. Update CHANGELOG.md

---

## File Summary

**Files Modified (Phase 1):**
- `src/modules/constants.js` - Added JSDoc annotations
- `src/modules/state.js` - Added JSDoc annotations
- `src/modules/filter.js` - Added JSDoc annotations

**Files Modified (Phase 2):**
- `README.md` or `CLAUDE.md` - Added future enhancement TODO

**Files Modified (Phase 3):**
- `src/options.html` - Added experimental section HTML
- `src/options.css` - Added experimental section styling

**Files Modified (Phase 4):**
- `src/modules/constants.js` - Added storage key, selector, patterns
- `src/modules/state.js` - Added mode, state variable, setter, load logic
- `src/modules/filter.js` - Added detection function and filter config
- `src/modules/toolbar.js` - Added button config, visibility logic
- `src/options.html` - Added checkbox to experimental section
- `src/modules/options.js` - Added checkbox handling, save/restore logic
- `src/contentScript.js` - Added storage change listener
- `src/_locales/en/messages.json` - Added button label

**Files Created:**
- `tests/filter.test.js` - Unit tests for AI notetaker detection

---

## Time Estimates

- **Phase 1:** 30 minutes (JSDoc annotations)
- **Phase 2:** 10 minutes (README update)
- **Phase 3:** 15 minutes (Experimental section UI)
- **Phase 4:** 90 minutes (Full feature implementation)
- **Testing:** 30 minutes

**Total:** ~2.5-3 hours

---

## Questions?

If you encounter issues not covered in this plan:
1. Check browser console for errors
2. Review existing similar features (FAVOURITES button is nearly identical)
3. Verify Gmail DOM hasn't changed (inspect with DevTools)
4. Check `chrome.storage.sync` values in DevTools → Application → Storage

Good luck! 🚀
