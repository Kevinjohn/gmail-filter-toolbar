import { SELECTORS } from './constants.js';
import { applyFilter } from './filter.js';
import { injectToolbar, isExtensionContextInvalidated } from './toolbar.js';
import { currentMode, MODES, themePreference } from './state.js';
import { applyTheme } from './theme.js';
import { debounce } from './utils/debounce.js';

let messageListObservers = [];
let messageListTargets = [];
let pendingMessageListFilter = null;
let gmailToolbarObserver = null;
let pendingToolbarMutation = null;

const MESSAGE_METADATA_ATTRIBUTES = [
  'alt',
  'aria-checked',
  'class',
  'data-docurl',
  'data-tooltip',
  'email',
  'name',
  'src',
  'title',
];

function disconnectMessageListObservers() {
  messageListObservers.forEach((observer) => observer.disconnect());
  messageListObservers = [];
  messageListTargets = [];
  // WHY: A pending debounced filter from the old observers' closure would still fire once against
  // the detached subtree; cancel it so nothing outlives the disconnect.
  pendingMessageListFilter?.cancel();
  pendingMessageListFilter = null;
}

export function observeMessageList(doc = document) {
  // WHY: Observe every message list, not just the first — Gmail's Multiple Inboxes and split panes
  // render several .UI sections, and mail arriving in the later sections must re-trigger filtering too.
  const targets = Array.from(doc.querySelectorAll(SELECTORS.emailList));
  if (!targets.length) {
    disconnectMessageListObservers();
    return false;
  }
  if (
    messageListObservers.length &&
    targets.length === messageListTargets.length &&
    targets.every((target, index) => target === messageListTargets[index])
  ) {
    return false;
  }

  // WHY: Disconnect existing observers before creating new ones to ensure idempotency.
  // Gmail's SPA navigation can destroy/recreate elements, so this function may be called multiple times.
  // Disconnecting prevents duplicate observers from accumulating. See docs/notes/filter-on-pagination.md
  disconnectMessageListObservers();
  messageListTargets = targets;

  // WHY: Debounce filter application to avoid performance issues during rapid DOM mutations (scrolling, pagination).
  // Skip filtering when mode is ALL since nothing needs to be hidden anyway - optimization for common case.
  const debouncedApplyFilter = debounce(() => {
    if (currentMode !== MODES.ALL) applyFilter(doc);
  }, 200);
  pendingMessageListFilter = debouncedApplyFilter;

  messageListObservers = targets.map((target) => {
    const observer = new MutationObserver(debouncedApplyFilter);
    observer.observe(target, {
      attributes: true,
      attributeFilter: MESSAGE_METADATA_ATTRIBUTES,
      childList: true,
      subtree: true,
    });
    return observer;
  });
  return true;
}

export function setupGmailToolbarObserver(doc = document) {
  // Disconnect existing observer if it exists
  if (gmailToolbarObserver) {
    gmailToolbarObserver.disconnect();
  }
  pendingToolbarMutation?.cancel();

  // WHY: Debounce the re-injection check because this observer watches the whole body subtree and Gmail mutates
  // its DOM constantly. Without debouncing, every keystroke/hover/refresh would re-run selector queries,
  // re-attach the message-list observer, and re-apply the filter — a real CPU/jank cost on large inboxes.
  const handleChildListMutation = debounce(() => {
    // WHY: After an extension update/reload this content script is orphaned but its observers keep
    // firing. Stop observing entirely instead of mutating the DOM the new script now owns.
    if (isExtensionContextInvalidated()) {
      gmailToolbarObserver?.disconnect();
      gmailToolbarObserver = null;
      disconnectMessageListObservers();
      return;
    }

    const gmailToolbarHeader = doc.querySelector(SELECTORS.gmailToolbarHeader);
    const filterWrappers = doc.querySelectorAll(SELECTORS.filterWrapper);
    const filterWrapper = filterWrappers[0];
    let toolbarReinjected = false;

    // Reuse and reposition the existing wrapper, or clean up duplicates left by a Gmail reflow.
    // WHY: Also rebuild when the wrapper exists but no longer contains the bar (e.g. it was gutted
    // by an orphaned script that died mid-injection) — position alone can't detect that.
    if (
      gmailToolbarHeader &&
      (gmailToolbarHeader.nextElementSibling !== filterWrapper ||
        filterWrappers.length > 1 ||
        (filterWrapper && !filterWrapper.querySelector(SELECTORS.filterBar)))
    ) {
      injectToolbar(doc, gmailToolbarHeader);
      toolbarReinjected = true;
    }
    const observerAttached = observeMessageList(doc);
    if ((toolbarReinjected || observerAttached) && currentMode !== MODES.ALL) {
      applyFilter(doc);
    }

    // WHY: Gmail can switch its own theme without a page reload; re-resolving on (debounced) DOM
    // churn keeps a "system" preference tracking Gmail's rendered theme instead of pinning the
    // one-shot sample taken at init. Cheap: one computed-style walk per settled mutation burst.
    applyTheme(doc, themePreference);
  }, 200);
  pendingToolbarMutation = handleChildListMutation;

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

// WHY: Poll with setTimeout, not requestAnimationFrame — browsers suspend rAF in hidden tabs, so a
// Gmail tab opened in the background would never poll and would always hit the timeout even though
// the DOM is ready. setTimeout still runs (clamped to ~1s when hidden), which is ample within the
// timeout budget.
const POLL_INTERVAL_MS = 100;

export function waitForGmailToolbar(doc = document) {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      reject(new Error('Gmail toolbar not found within 10 seconds.'));
    }, 10000); // 10 seconds timeout

    (function poll() {
      if (timedOut) return;
      const toolbar =
        doc.querySelector(SELECTORS.gmailToolbar) ||
        doc.querySelector(SELECTORS.gmailToolbarLegacy) ||
        doc.querySelector(SELECTORS.gmailToolbarAria) ||
        doc.querySelector(SELECTORS.gmailToolbarStructural);

      if (toolbar) {
        const header = toolbar.closest(SELECTORS.gmailToolbarHeader);
        if (header) {
          clearTimeout(timeoutId);
          resolve(header);
        } else {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      } else {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    })();
  });
}

export function waitForMessageTable(timeoutMs = 15000, doc = document) {
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
      const table = doc.querySelector(SELECTORS.emailRow);
      if (table) {
        clearTimeout(timeoutId);
        resolve();
      } else {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    })();
  });
}
