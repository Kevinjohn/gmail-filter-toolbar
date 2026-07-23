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

  // WHY: Disconnect existing observer before creating a new one to ensure idempotency.
  // Gmail's SPA navigation can destroy/recreate elements, so this function may be called multiple times.
  // Disconnecting prevents duplicate observers from accumulating. See _remember_filter_on_pagination.md
  if (messageListObserver) {
    messageListObserver.disconnect();
  }

  // WHY: Debounce filter application to avoid performance issues during rapid DOM mutations (scrolling, pagination).
  // Skip filtering when mode is ALL since nothing needs to be hidden anyway - optimization for common case.
  const debouncedApplyFilter = debounce(() => {
    if (currentMode !== MODES.ALL) applyFilter(doc);
  }, 200);

  messageListObserver = new MutationObserver(debouncedApplyFilter);
  messageListObserver.observe(target, { childList: true });
}

export function setupGmailToolbarObserver(doc = document) {
  // Disconnect existing observer if it exists
  if (gmailToolbarObserver) {
    gmailToolbarObserver.disconnect();
  }

  // WHY: Debounce the re-injection check because this observer watches the whole body subtree and Gmail mutates
  // its DOM constantly. Without debouncing, every keystroke/hover/refresh would re-run selector queries,
  // re-attach the message-list observer, and re-apply the filter — a real CPU/jank cost on large inboxes.
  const handleChildListMutation = debounce(() => {
    const gmailToolbarHeader = doc.querySelector(SELECTORS.gmailToolbarHeader);
    const filterWrapper = doc.querySelector(SELECTORS.filterWrapper);

    // WHY: Re-inject toolbar if Gmail's toolbar exists but ours is missing. This handles Gmail destroying/recreating
    // its toolbar during pagination or navigation - our toolbar as a sibling should persist, but this is a safety net.
    if (gmailToolbarHeader && !filterWrapper) {
      injectToolbar(doc, gmailToolbarHeader);
    }
    observeMessageList(doc);
    applyFilter(doc);
  }, 200);

  // WHY: Observe document.body (not Gmail's toolbar) because it's a stable parent that survives Gmail's SPA navigation.
  // Gmail can replace specific elements during pagination/navigation, but document.body persists, allowing us to detect
  // when our toolbar needs to be re-injected. Observing the toolbar directly would fail when Gmail replaces it.
  gmailToolbarObserver = new MutationObserver((mutationsList) => {
    if (mutationsList.some((mutation) => mutation.type === 'childList')) {
      handleChildListMutation();
    }
  });
  gmailToolbarObserver.observe(doc.body, { childList: true, subtree: true });
}

export function waitForGmailToolbar() {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      reject(new Error('Gmail toolbar not found within 10 seconds.'));
    }, 10000); // 10 seconds timeout

    (function poll() {
      if (timedOut) return;
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

export function waitForMessageTable(timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    // WHY: Time out rather than poll forever. An inbox with no rows (empty inbox, or a Gmail markup change
    // breaking SELECTORS.emailRow) would otherwise leave a permanent requestAnimationFrame loop running.
    // Rows appearing later are still handled by setupGmailToolbarObserver, which re-applies the filter.
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      reject(new Error(`Gmail message table not found within ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);

    (function poll() {
      if (timedOut) return;
      const table = document.querySelector(SELECTORS.emailRow);
      if (table) {
        clearTimeout(timeoutId);
        resolve();
      } else {
        requestAnimationFrame(poll);
      }
    })();
  });
}
