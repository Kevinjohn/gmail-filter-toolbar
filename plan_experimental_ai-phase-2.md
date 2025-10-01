# Phase 2: Document Future Feature Flag System

**Goal:** Add a TODO item to the README for future enhancement when the codebase scales.

**Estimated Time:** 10 minutes

---

## Step 2.1: Add TODO Section to README

**File:** `CLAUDE.md` (or `README.md` if preferred)

Add this section at the end of the document:

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

## Testing

1. Verify markdown renders correctly (preview in editor or GitHub)
2. Check section is at end of document
3. Ensure code blocks are properly formatted

---

## Commit

```bash
git add CLAUDE.md
git commit -m "docs: add future feature flag system enhancement proposal"
```

---

**Next:** Proceed to [Phase 3](plan_experimental_ai-phase-3.md)
