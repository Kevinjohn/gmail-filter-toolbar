# Gemini Project Memory: Gmail Calendar Options Extension

This file serves as a persistent memory for the Gemini agent regarding the `chome-extension-gmail-calendar-options` project.

## Core Project Overview

*   **Project Type:** Google Chrome Extension (Manifest V3)
*   **Primary Goal:** To enhance the Gmail web interface by allowing users to filter their inbox view. The filters can toggle the visibility of calendar-related emails and emails with attachments.
*   **User Interface:** The extension injects a toolbar directly below Gmail's main action bar.

## Key Technical Details

*   **`contentScript.js`:** This is the main workhorse. It handles:
    *   Injecting the filter toolbar into the Gmail DOM.
    *   Applying the visual filters by changing the `style.display` of email rows (`<tr>`).
    *   Using a `MutationObserver` to re-apply filters when the email list changes dynamically (e.g., pagination, search).
*   **`background.js`:** A simple service worker that sets the initial default filter state (`ALL`) in `chrome.storage.sync` upon installation.
*   **`options.js` / `options.html`:** Provides a simple options page to toggle a `debugOn` flag, which is also persisted in `chrome.storage.sync`.
*   **State Management:** The user's current filter mode and the debug setting are stored in `chrome.storage.sync`, making them persist across sessions.
*   **Styling:** `styles.css` and `colours.css` are used. The latter defines CSS variables for light, dark, and high-contrast themes. The CSS is designed to be robust against Gmail's UI changes by forcing the native toolbar to wrap.
*   **Dependencies:** The project uses `vite` for building and `jest` for unit testing. It has no runtime production dependencies beyond the Chrome Extension APIs.

## Agent Preferences

*   **Commit Messages:** All commit messages should include the model name as a footer. This should be updated dynamically by the LLM. (e.g., `- gemini`).
*   **Language Style:** All code comments and documentation should be written in British English (en-GB). For example, use "colour" instead of "color" and "behaviour" instead of "behavior".
*   **Naming Conventions:** Variable and function names should be descriptive and clear, favouring readability, similar to Python's conventions (e.g., `is_calendar_row` or `applyFilter` depending on the language's idiomatic style).
*   **Toolbar Placement Issues:** If toolbar placement issues occur after Gmail pagination, refer to `_remember_toolbar-placement.md` for detailed debugging steps and solutions.
*   **Filter Persistence on Pagination:** If the email filter fails to apply after navigating between pages in Gmail, consult `_remember_filter_on_pagination.md` for the core architectural principle to resolve this.