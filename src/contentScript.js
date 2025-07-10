/**
 * Content Script - DOM Operations Security Audit
 *
 * Security Note: This content script has been audited for DOM security.
 * - All DOM operations use safe methods (no innerHTML for user content)
 * - All user interactions are validated through the validation layer
 * - Event handlers use proper delegation and validation
 * - State management includes input validation and sanitization
 */

import { SHOW_BUTTON_TEXT_KEY } from './modules/constants.js';
import { KEY_DEBUG } from './modules/state.js';
import { stateManager } from './modules/stateManager.js';
import { configurationManager, getSelector } from './modules/configurationManager.js';
import { applyFilter } from './modules/filter.js';
import { injectToolbar, refreshUI, updateButtonTextView } from './modules/toolbar.js';
import {
  waitForGmailChrome,
  waitForMessageTable,
  observeMessageList,
  setupGmailToolbarObserver,
} from './modules/observers.js';
import { validateMode } from './modules/utils/validation.js';

async function main() {
  try {
    // Initialize both StateManager and ConfigurationManager
    await Promise.all([
      stateManager.initialize(),
      configurationManager.initialize()
    ]);
    
    const gmailToolbarHeader = await waitForGmailChrome();
    injectToolbar(document, gmailToolbarHeader);
    
    // Apply initial state from StateManager
    const showButtonText = stateManager.get('showButtonText');
    updateButtonTextView(showButtonText);
    refreshUI(document);

    await waitForMessageTable();
    applyFilter();
    observeMessageList();
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
  
  setupGmailToolbarObserver();
}

// Listen for button clicks with input validation
document.addEventListener('click', async (e) => {
  const btn = e.target.closest(getSelector('filterButtons'));
  if (!btn) return;

  try {
    // Validate mode from dataset before using
    const mode = validateMode(btn.dataset.mode, 'ALL');
    await stateManager.set('filterMode', mode);
    
    applyFilter();
    refreshUI(document);
  } catch (error) {
    console.error('Error updating filter mode:', error);
  }
});

// Listen for storage changes (e.g., debug mode or showButtonText toggled in options.html)
chrome.storage.onChanged.addListener(async (changes) => {
  try {
    if (KEY_DEBUG in changes) {
      await stateManager.set('debugMode', changes[KEY_DEBUG].newValue);
      applyFilter();
    }
    if (SHOW_BUTTON_TEXT_KEY in changes) {
      await stateManager.set('showButtonText', changes[SHOW_BUTTON_TEXT_KEY].newValue);
      updateButtonTextView(changes[SHOW_BUTTON_TEXT_KEY].newValue);
    }
  } catch (error) {
    console.error('Error handling storage changes:', error);
  }
});

main();
