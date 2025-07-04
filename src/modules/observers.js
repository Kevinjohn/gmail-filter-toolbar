import { SELECTORS } from './constants.js';
import { applyFilter } from './filter.js';
import { injectToolbar } from './toolbar.js';
import { currentMode, MODES } from './state.js';

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

export function observeMessageList() {
  const target = document.querySelector(SELECTORS.emailList)?.parentElement;
  if (!target) return;

  const debouncedApplyFilter = debounce(() => {
    if (currentMode !== MODES.ALL) applyFilter();
  }, 200);

  const listObserver = new MutationObserver(debouncedApplyFilter);
  listObserver.observe(target, { childList: true });
}



export function setupGmailToolbarObserver() {
  const bodyObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const gmailToolbarHeader = document.querySelector(SELECTORS.gmailToolbarHeader);
        const filterWrapper = document.querySelector(SELECTORS.filterWrapper);

        // If Gmail toolbar header exists but our filter wrapper is missing, re-inject
        if (gmailToolbarHeader && !filterWrapper) {
          injectToolbar(document, gmailToolbarHeader);
          applyFilter();
        }
      }
    }
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

export function waitForGmailChrome() {
    return new Promise(resolve => {
      (function poll() {
        const toolbar = document.querySelector(SELECTORS.gmailToolbar) ||
                        document.querySelector(SELECTORS.gmailToolbarLegacy) ||
                        document.querySelector(SELECTORS.gmailToolbarAria);
  
        if (toolbar) {
          const header = toolbar.closest(SELECTORS.gmailToolbarHeader);
          if (header) {
            console.log('[GCO] injecting into header →', header);
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
