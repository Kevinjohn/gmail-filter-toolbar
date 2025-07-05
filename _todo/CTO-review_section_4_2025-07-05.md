# PRD: Toolbar Module Refinement

## What we're trying to achieve

This section aims to refactor the `toolbar.js` module to use a more maintainable and readable approach for mapping filter modes to their corresponding Material icons. By defining a constant map, we can eliminate a `switch` statement, making the code cleaner and easier to extend in the future.

## Detailed Task List

### Task 4.1: Use icon mapping

#### Sub-task 4.1.1: In `src/modules/toolbar.js`, define a constant `MODE_ICONS` that maps each filter mode to its Material icon name.

1.  **Action:** Open the `src/modules/toolbar.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/toolbar.js`
    *   **Code Change:** Add the `MODE_ICONS` constant at the top of the file, after the existing imports and `FILTER_CONFIG`.

        ```javascript
        import { SELECTORS } from './constants.js';
        import { MODES, currentMode } from './state.js';

        const FILTER_CONFIG = {
            [MODES.ALL]: {
              labelKey: 'btn_all',
            },
            [MODES.EMAIL]: {
              labelKey: 'btn_mail',
            },
            [MODES.CALENDAR]: {
              labelKey: 'btn_cal',
            },
            [MODES.ATTACH]: {
              labelKey: 'btn_attach',
            },
            [MODES.FAVOURITES]: {
              labelKey: 'btn_fav',
            },
          };

        // Add this new constant
        const MODE_ICONS = {
          [MODES.ALL]: 'inbox',
          [MODES.EMAIL]: 'mail',
          [MODES.CALENDAR]: 'calendar_today',
          [MODES.ATTACH]: 'attachment',
          [MODES.FAVOURITES]: 'star',
        };
        ```

    *   **Verification:** Confirm that `MODE_ICONS` is defined correctly in `src/modules/toolbar.js`.
[x]

#### Sub-task 4.1.2: Replace the `switch` statement in `injectToolbar` with lookups from `MODE_ICONS`.

1.  **Action:** Open the `src/modules/toolbar.js` file.
    *   **File:** `/Users/kevinjohngallagher/Documents/GitHub/chome-extension-gmail-calendar-options/src/modules/toolbar.js`
    *   **Code Change:** Locate the `switch` statement within the `Object.values(MODES).forEach` loop in the `injectToolbar` function and replace it with a lookup from `MODE_ICONS`.

        ```javascript
        // BEFORE:
        // Object.values(MODES).forEach(mode => {
        //   let iconName = '';
        //   switch (mode) {
        //     case MODES.ALL:
        //       iconName = 'inbox';
        //       break;
        //     case MODES.EMAIL:
        //       iconName = 'mail';
        //       break;
        //     case MODES.CALENDAR:
        //       iconName = 'calendar_today';
        //       break;
        //     case MODES.ATTACH:
        //       iconName = 'attachment';
        //       break;
        //     case MODES.FAVOURITES:
        //       iconName = 'star';
        //       break;
        //   }

        // AFTER:
        Object.values(MODES).forEach(mode => {
          const iconName = MODE_ICONS[mode]; // Use the new constant
        ```

    *   **Verification:** Confirm that the `switch` statement has been removed and `iconName` is now assigned using `MODE_ICONS[mode]`.
[x]
