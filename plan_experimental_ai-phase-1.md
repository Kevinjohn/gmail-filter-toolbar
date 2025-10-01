# Phase 1: Add JSDoc Annotations to Existing Features

**Goal:** Document all existing features with `@experimental` or `@stable` JSDoc comments for clarity.

**Estimated Time:** 30 minutes

---

## Step 1.1: Annotate Constants

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

---

## Step 1.2: Annotate State Variables

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

---

## Step 1.3: Annotate Filter Functions

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

## Testing

After adding annotations:

1. Run linter to ensure no syntax errors:
   ```bash
   npm run lint
   ```

2. Verify annotations are searchable:
   ```bash
   grep -r "@stable" src/modules/
   ```

3. Build to ensure no breaking changes:
   ```bash
   npm run build
   ```

---

## Commit

```bash
git add src/modules/constants.js src/modules/state.js src/modules/filter.js
git commit -m "docs: add JSDoc stability annotations to existing features"
```

---

**Next:** Proceed to [Phase 2](plan_experimental_ai-phase-2.md)
