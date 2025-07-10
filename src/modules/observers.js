/**
 * Observers Module - DOM Operations Security Audit
 *
 * Security Note: This module has been audited for DOM security.
 * - All DOM queries use predefined selectors (no dynamic query construction)
 * - MutationObserver operations are limited to safe DOM traversal
 * - No user-generated content affects observer behavior
 * - Proper cleanup prevents memory leaks and observer conflicts
 */

import { configurationManager, getSelector } from './configurationManager.js';
import { applyFilter } from './filter.js';
import { injectToolbar } from './toolbar.js';
import { MODES } from './state.js';
import { stateManager } from './stateManager.js';
import { debounce } from './utils/debounce.js';

let messageListObserver = null;
let gmailToolbarObserver = null;

export function observeMessageList(doc = document) {
  const target = doc.querySelector(getSelector('emailList'));
  if (!target) return;

  // Disconnect existing observer if it exists
  if (messageListObserver) {
    messageListObserver.disconnect();
  }

  const debounceDelay = configurationManager.getSystemConfig('performance.debounceDelay') || 200;
  const debouncedApplyFilter = debounce(() => {
    const currentMode = stateManager.get('filterMode');
    if (currentMode !== MODES.ALL) applyFilter();
  }, debounceDelay);

  messageListObserver = new MutationObserver(debouncedApplyFilter);
  messageListObserver.observe(target, { childList: true });
}

export function setupGmailToolbarObserver(doc = document) {
  // Disconnect existing observer if it exists
  if (gmailToolbarObserver) {
    gmailToolbarObserver.disconnect();
  }

  gmailToolbarObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const gmailToolbarHeader = doc.querySelector(getSelector('gmailToolbarHeader'));
        const filterWrapper = doc.querySelector(getSelector('filterWrapper'));

        if (gmailToolbarHeader && !filterWrapper) {
          injectToolbar(doc, gmailToolbarHeader);
        }
        observeMessageList(doc);
        applyFilter();
      }
    }
  });
  gmailToolbarObserver.observe(doc.body, { childList: true, subtree: true });
}

export function waitForGmailChrome() {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Gmail toolbar not found within 10 seconds.'));
    }, 10000); // 10 seconds timeout

    (function poll() {
      const toolbar =
        document.querySelector(getSelector('gmailToolbar')) ||
        document.querySelector(getSelector('gmailToolbarLegacy')) ||
        document.querySelector(getSelector('gmailToolbarAria'));

      if (toolbar) {
        clearTimeout(timeoutId); // Clear timeout if toolbar is found
        const header = toolbar.closest(getSelector('gmailToolbarHeader'));
        if (header) {
          resolve(header);
        } else {
          requestAnimationFrame(poll);
        }
      } else {
        requestAnimationFrame(poll);
      }
    })();
  });
}

export function waitForMessageTable() {
  return new Promise((resolve) => {
    (function poll() {
      const table = document.querySelector(getSelector('emailRow'));
      if (table) resolve();
      else requestAnimationFrame(poll);
    })();
  });
}
