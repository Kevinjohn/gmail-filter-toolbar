import { SELECTORS } from './constants.js';
import { applyFilter } from './filter.js';
import { injectToolbar } from './toolbar.js';
import { currentMode, MODES } from './state.js';
import { debounce } from './utils/debounce.js';

let messageListObserver = null;
let gmailToolbarObserver = null;

export function observeMessageList(doc = document) {
  const target = doc.querySelector(SELECTORS.emailList);
  if (!target) return;

  // Disconnect existing observer if it exists
  if (messageListObserver) {
    messageListObserver.disconnect();
  }

  const debouncedApplyFilter = debounce(() => {
    if (currentMode !== MODES.ALL) applyFilter();
  }, 200);

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
        const gmailToolbarHeader = doc.querySelector(SELECTORS.gmailToolbarHeader);
        const filterWrapper = doc.querySelector(SELECTORS.filterWrapper);

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
        document.querySelector(SELECTORS.gmailToolbar) ||
        document.querySelector(SELECTORS.gmailToolbarLegacy) ||
        document.querySelector(SELECTORS.gmailToolbarAria);

      if (toolbar) {
        clearTimeout(timeoutId); // Clear timeout if toolbar is found
        const header = toolbar.closest(SELECTORS.gmailToolbarHeader);
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
      const table = document.querySelector(SELECTORS.emailRow);
      if (table) resolve();
      else requestAnimationFrame(poll);
    })();
  });
}
