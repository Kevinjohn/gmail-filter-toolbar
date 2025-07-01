// ---------------- constants & state -------------------------
const KEY_MODE = 'gmailCalMode';    // persisted filter choice
const KEY_DEBUG = 'gmailCalDebug';  // persisted dev flag

const SELECTORS = {
  gmailToolbar: '.G-atb .G6[role="toolbar"]',
  gmailToolbarLegacy: '.G-atb[role="toolbar"]',
  gmailToolbarAria: 'div[aria-label="Main toolbar"]',
  gmailToolbarHeader: '.aeH',
  emailRow: '.UI tr.zA',
  emailSubject: '.bog',
  emailList: '.UI',
  attachmentIcon: 'img.aSK',
  attachmentRowClass: 'byw', // This is a class, not a selector
  attachmentTooltip: '[data-tooltip="Has attachment"]',
  icsImage: 'img[alt*=".ics"]',
  filterBar: '.gcal-filter-bar',
  filterWrapper: '.gcal-filter-wrapper',
  filterButtons: '.gcal-filter-bar button[data-mode]',
};

const MODES = {
  ALL: 'ALL',       // yes – show everything
  HIDE: 'HIDE_CAL', // no  – hide calendar invites
  ONLY: 'ONLY_CAL', // only – show calendar invites
  ONLY_ATTACH: 'ONLY_ATTACH', // only – show attachments
};

const FILTER_CONFIG = {
  [MODES.ALL]: {
    labelKey: 'btn_all',
    filterFn: (row) => false, // Never hide
  },
  [MODES.HIDE]: {
    labelKey: 'btn_mail',
    filterFn: (row) => isCalendarRow(row),
  },
  [MODES.ONLY]: {
    labelKey: 'btn_cal',
    filterFn: (row) => !isCalendarRow(row),
  },
  [MODES.ONLY_ATTACH]: {
    labelKey: 'btn_attach',
    filterFn: (row) => !hasAttachmentRow(row) || isCalendarRow(row),
  },
};

let currentMode = MODES.ALL;
let debugOn = true;

console.log('[GCO] content script loaded – mode =', currentMode);

//
// ---------------- initial storage load ---------------------
chrome.storage.sync.get([KEY_MODE, KEY_DEBUG], (res) => {
  currentMode = res[KEY_MODE] || MODES.ALL;   // ← fallback to ALL
  debugOn = !!res[KEY_DEBUG];

  waitForGmailChrome().then(() => {
    injectToolbar();
    refreshUI();

    // Wait until Gmail has painted at least one row
    waitForMessageTable().then(() => {
      applyFilter();              // run once, now rows exist
      // No need for ensureToolbarAttachedToVisibleToolbar here, injectToolbar handles it
      observeMessageList();       // watch for pagination / search changes
    });

    // Now that we have the stable header, observe it for changes
    const header = document.querySelector(SELECTORS.gmailToolbarHeader);
    const obs = new MutationObserver(() => {
      injectToolbar(); // Simply call injectToolbar to ensure correct placement
      if (currentMode !== MODES.ALL) applyFilter();
    });
    obs.observe(header, { childList: true, subtree: true });
  });
});

// Listen for changes (e.g. debug mode toggled in options.html)
chrome.storage.onChanged.addListener((changes) => {
  if (KEY_DEBUG in changes) {
    debugOn = changes[KEY_DEBUG].newValue;
    applyFilter();
  }
});

//
// ---------------- anchor finder -----------------------------
function waitForGmailChrome() {
  return new Promise(resolve => {
    (function poll() {
      // Find any of the possible Gmail toolbars
      const toolbar = document.querySelector(SELECTORS.gmailToolbar) ||
                      document.querySelector(SELECTORS.gmailToolbarLegacy) ||
                      document.querySelector(SELECTORS.gmailToolbarAria);

      if (toolbar) {
        // Now find the stable header that contains the toolbars
        const header = toolbar.closest(SELECTORS.gmailToolbarHeader);
        if (header) {
          console.log('[GCO] injecting into header →', header);
          resolve(header); // Resolve with the stable parent
        } else {
          requestAnimationFrame(poll); // Header not found yet, poll again
        }
      } else {
        requestAnimationFrame(poll); // Toolbar not found yet, poll again
      }
    })();
  });
}


//
// ---------------- UI injection ------------------------------
function injectToolbar() {
  const header = document.querySelector(SELECTORS.gmailToolbarHeader);
  if (!header) return; // Cannot inject if header is not found

  let wrapper = document.querySelector(SELECTORS.filterWrapper);
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'gcal-filter-wrapper';
    header.appendChild(wrapper);
  }

  // Ensure the wrapper is always the last child of the header
  if (header.lastChild !== wrapper) {
    header.appendChild(wrapper);
  }

  let bar = document.querySelector(SELECTORS.filterBar);

  if (!bar) {
    // Create the bar if it doesn't exist
    bar = document.createElement('div');
    bar.className = 'gcal-filter-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', chrome.i18n.getMessage('label_toolbar') || 'Calendar filter');

    bar.innerHTML = `
      <div class="gcal-btn-group">
        <span class="gcal-label">${chrome.i18n.getMessage('label_options') || 'Calendar options:'}</span>
        ${Object.values(MODES).map(mode => `
          <button data-mode="${mode}">${chrome.i18n.getMessage(FILTER_CONFIG[mode].labelKey) || mode}</button>
        `).join('')}
      </div>
    `;
    wrapper.appendChild(bar); // Append to the wrapper
  } else if (bar.parentNode !== wrapper) {
    // If it exists but is in the wrong parent, move it
    wrapper.appendChild(bar);
  }

  refreshUI(bar); // Refresh UI regardless of creation or move

  // Esc key returns focus to Gmail list (focus-trap) - only add listener once
  if (!bar.dataset.listenerAdded) { // Use a data attribute to prevent multiple listeners
    bar.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const list = ensureListElement();
        list?.focus();
      }
    });
    bar.dataset.listenerAdded = 'true';
  }
}

function ensureListElement() {
  const list = document.querySelector(SELECTORS.emailList);
  if (list && !list.hasAttribute('tabindex')) {
    list.setAttribute('tabindex', '-1');
  }
  return list;
}


//
// ---------------- helper: row classification ----------------
function isCalendarRow(row, chromeApi = chrome) {
  const hasIcs = !!row.querySelector(SELECTORS.icsImage);
  const calendarEventAltText = chromeApi.i18n.getMessage('alt_calendar_event');
  const hasCalendarEventIcon = !!row.querySelector(`img[alt="${calendarEventAltText}"]`);
  return hasIcs || hasCalendarEventIcon;
}

function hasAttachmentRow(row) {
  // Gmail's UI is complex. A single selector is too brittle.
  // We'll check for a few common patterns.
  const hasBywClass = row.classList.contains(SELECTORS.attachmentRowClass);
  const hasAttachmentTooltip = !!row.querySelector(SELECTORS.attachmentTooltip);
  const hasPaperclipIcon = !!row.querySelector(SELECTORS.attachmentIcon);

  return hasBywClass || hasAttachmentTooltip || hasPaperclipIcon;
}


//
// ---------------- apply filter ------------------------------
function applyFilter() {
  const currentFilter = FILTER_CONFIG[currentMode];
  if (!currentFilter) return; // Should not happen if MODES and FILTER_CONFIG are in sync

  document.querySelectorAll(SELECTORS.emailRow).forEach((row) => {
    const hide = currentFilter.filterFn(row);

    if (debugOn) {
      row.style.display = '';
      row.style.background = hide ? 'rgba(0,123,255,.15)' : '';
      row.style.opacity = hide ? '0.5' : '1';
    } else {
      row.style.background = '';
      row.style.opacity = '';
      row.style.display = hide ? 'none' : '';
    }
  });
}

function waitForMessageTable() {
  return new Promise((resolve) => {
    (function poll() {
      const table = document.querySelector(SELECTORS.emailRow);
      if (table) resolve();                     // at least one row exists
      else requestAnimationFrame(poll);
    })();
  });
}


//
// ---------------- UI refresh helpers ------------------------
function refreshUI() {
  const bar = document.querySelector(SELECTORS.filterBar);
  if (!bar) return;

  bar.querySelectorAll('button[data-mode]').forEach((btn) => {
    btn.toggleAttribute('data-active', btn.dataset.mode === currentMode);
    btn.setAttribute('aria-pressed', btn.dataset.mode === currentMode);
  });

}







//
// --------------- observe Message List -----------------------
function observeMessageList() {
  const target = document.querySelector(SELECTORS.emailList)?.parentElement;
  if (!target) return;

  const listObserver = new MutationObserver(() => {
    if (currentMode !== MODES.ALL) applyFilter();
  });

  // Watching only direct children is enough; no subtree needed
  listObserver.observe(target, { childList: true, subtree: true });
}






//
// ---------------- Listener: Button Clicks ---------------------
document.addEventListener('click', (e) => {
  const btn = e.target.closest(SELECTORS.filterButtons);
  if (!btn) return;

  currentMode = btn.dataset.mode;
  chrome.storage.sync.set({ [KEY_MODE]: currentMode });
  applyFilter();
  refreshUI();
});

console.log('[GCO] content script hit the bottom – mode =', currentMode);
