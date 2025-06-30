// ---------------- constants & state -------------------------
const KEY_MODE = 'gmailCalMode';    // persisted filter choice
const KEY_DEBUG = 'gmailCalDebug';  // persisted dev flag

const MODES = {
  ALL: 'ALL',       // yes – show everything
  HIDE: 'HIDE_CAL', // no  – hide calendar invites
  ONLY: 'ONLY_CAL', // only – show calendar invites
};

let currentMode = MODES.ALL;
let debugOn = true;

console.log('[GCO] content script loaded – mode =', currentMode);

//
// ---------------- initial storage load ---------------------
chrome.storage.sync.get([KEY_MODE, KEY_DEBUG], (res) => {
  currentMode = res[KEY_MODE] || MODES.ALL;   // ← fallback to ALL
  debugOn = !!res[KEY_DEBUG];

  waitForGmailChrome().then((header) => {
    injectToolbar(header);
    refreshUI();

    // Wait until Gmail has painted at least one row
    waitForMessageTable().then(() => {
      applyFilter();              // run once, now rows exist
      ensureToolbarAttachedToVisibleToolbar(); // make sure it's pinned to the live toolbar
      observeMessageList();       // watch for pagination / search changes
    });

    // Now that we have the stable header, observe it for changes
    const obs = new MutationObserver(() => {
      ensureToolbarAttachedToVisibleToolbar();
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
      const toolbar = document.querySelector('.G-atb .G6[role="toolbar"]') ||
                      document.querySelector('.G-atb[role="toolbar"]') ||
                      document.querySelector('div[aria-label="Main toolbar"]');

      if (toolbar) {
        // Now find the stable header that contains the toolbars
        const header = toolbar.closest('.aeH');
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
function injectToolbar(headerBox) {
  const bar = document.createElement('div');
  bar.className = 'gcal-filter-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', chrome.i18n.getMessage('label_toolbar') || 'Calendar filter');

  bar.innerHTML = `
    <div class="gcal-btn-group">
      <span class="gcal-label">${chrome.i18n.getMessage('label_options') || 'Calendar options:'}</span>
      <button data-mode="${MODES.ALL}">${chrome.i18n.getMessage('btn_yes')  || 'Yes'}</button>
      <button data-mode="${MODES.HIDE}">${chrome.i18n.getMessage('btn_no')   || 'No'}</button>
      <button data-mode="${MODES.ONLY}">${chrome.i18n.getMessage('btn_only') || 'Only'}</button>
    </div>
  `;

  // I removed this, but, y'know
  // <span class="gcal-status" aria-live="polite"></span>


  /* instead of afterend → append inside the fixed header */
  headerBox.appendChild(bar);
  refreshUI(bar);

  // Esc key returns focus to Gmail list (focus-trap)
  bar.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const list = ensureListElement();
      list?.focus();
    }
  });
}

function ensureListElement() {
  const list = document.querySelector('.UI');
  if (list && !list.hasAttribute('tabindex')) {
    list.setAttribute('tabindex', '-1');
  }
  return list;
}


//
// ---------------- helper: row classification ----------------
function isCalendarRow(row) {
  const subj = row.querySelector('.bog')?.innerText || '';
  const hasPrefix = /^(Invitation:|Cancelled:|Accepted:|Declined:|Updated invitation)/i.test(subj);
  const hasIcs = [...row.querySelectorAll('img[alt]')].some((img) => img.alt.includes('.ics'));
  return hasPrefix || hasIcs;
}

function hasAttachmentRow(row) {
  return !!row.querySelector('img.aSK'); // paperclip icon
}


//
// ---------------- apply filter ------------------------------
function applyFilter() {
  document.querySelectorAll('.UI tr.zA').forEach((row) => {
    const isCal = isCalendarRow(row);
    const hide = (currentMode === MODES.HIDE && isCal) || (currentMode === MODES.ONLY && !isCal);

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
  // refreshStatusText();
}

function waitForMessageTable() {
  return new Promise((resolve) => {
    (function poll() {
      const table = document.querySelector('.UI tr.zA');
      if (table) resolve();                     // at least one row exists
      else requestAnimationFrame(poll);
    })();
  });
}


//
// ---------------- UI refresh helpers ------------------------
function refreshUI() {
  const bar = document.querySelector('.gcal-filter-bar');
  if (!bar) return;

  bar.querySelectorAll('button[data-mode]').forEach((btn) => {
    btn.toggleAttribute('data-active', btn.dataset.mode === currentMode);
    btn.setAttribute('aria-pressed', btn.dataset.mode === currentMode);
  });

  
  // const status = bar.querySelector('.gcal-status');
  // if (!status) return;
  /*
  status.textContent =
    currentMode === MODES.HIDE
      ? chrome.i18n.getMessage('status_hidden') || 'Calendar is hidden'
      : currentMode === MODES.ONLY
      ? chrome.i18n.getMessage('status_only') || 'Only showing calendars'
      : chrome.i18n.getMessage('status_all') ||
        'Showing e-mails and calendar invites';
        */
}


function refreshStatusText() {
  
  const status = document.querySelector('.gcal-status');
  if (!status) return;
  /*
  status.textContent =
    currentMode === MODES.HIDE
      ? chrome.i18n.getMessage('status_hidden') || 'Calendar is hidden'
      : currentMode === MODES.ONLY
        ? chrome.i18n.getMessage('status_only') || 'Only showing calendars'
        : chrome.i18n.getMessage('status_all') || 'Showing e-mails and calendar invites';
        */
}

/**
 * Make sure our bar is attached to the *visible* Gmail toolbar.
 * Creates it if missing, or moves the existing node out of a hidden toolbar.
 */
function ensureToolbarAttachedToVisibleToolbar() {
  const header = document.querySelector('.aeH');
  if (!header) return;

  // Find the toolbar Gmail currently shows (.G-atb without display:none)
  const activeTb = [...header.querySelectorAll('.G-atb')]
    .find(el => el.offsetParent !== null && el.style.display !== 'none');

  if (!activeTb) return;        // Gmail not ready yet

  // Do we already have a bar?
  let bar = activeTb.querySelector('.gcal-filter-bar');

  if (!bar) {
    // Maybe it's stuck in the old (hidden) toolbar – grab and move it
    bar = document.querySelector('.gcal-filter-bar');
    if (bar) {
      activeTb.appendChild(bar);
    } else {
      // No bar anywhere → inject a fresh one
      injectToolbar(activeTb);
      bar = activeTb.querySelector('.gcal-filter-bar');
    }
  }
  // keep button highlight & status correct
  refreshUI();                  
}


//
// --------------- observe Message List -----------------------
function observeMessageList() {
  //const listBox = document.querySelector('.aeF');   // Gmail’s scroll container
  //if (!listBox) return;

  const target = document.querySelector('.UI')?.parentElement;
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
  const btn = e.target.closest('.gcal-filter-bar button[data-mode]');
  if (!btn) return;

  currentMode = btn.dataset.mode;
  chrome.storage.sync.set({ [KEY_MODE]: currentMode });
  applyFilter();
  refreshUI();
});

console.log('[GCO] content script hit the bottom – mode =', currentMode);
