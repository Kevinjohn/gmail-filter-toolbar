// ---------------- constants & state -------------------------
const KEY_MODE = 'gmailCalMode'; // persisted filter choice
const KEY_DEBUG = 'gmailCalDebug'; // persisted dev flag

const MODES = {
  ALL: 'ALL', // yes – show everything
  HIDE: 'HIDE_CAL', // no  – hide calendar invites
  ONLY: 'ONLY_CAL', // only – show calendar invites
};

let currentMode = MODES.ALL;
let debugOn = true;

console.log('[GCO] content script loaded – mode =', currentMode);

// ---------------- initial storage load ---------------------
chrome.storage.sync.get([KEY_MODE, KEY_DEBUG], (res) => {
  if (res[KEY_MODE]) currentMode = res[KEY_MODE];
  debugOn = !!res[KEY_DEBUG];

  waitForGmailChrome().then((anchor) => {
    injectToolbar(anchor);
    applyFilter();
  });
});

// Listen for changes (e.g. debug mode toggled in options.html)
chrome.storage.onChanged.addListener((changes) => {
  if (KEY_DEBUG in changes) {
    debugOn = changes[KEY_DEBUG].newValue;
    applyFilter();
  }
});

// ---------------- anchor finder -----------------------------
/* -----------------------------------------------------------
 * Helper: wait until Gmail's native action toolbar exists,
 * then resolve with its parent element so we can insert ours.
 * --------------------------------------------------------- */
function waitForGmailChrome() {
  return new Promise(resolve => {
    (function poll() {
      /* NEW: first try the 2025 layout — .G6 inside .G-atb */
      const inner = document.querySelector('.G-atb .G6[role="toolbar"]');

      /* Fallbacks for older layouts we supported before */
      const oldDirect = document.querySelector('.G-atb[role="toolbar"]');
      const oldAria   = document.querySelector('div[aria-label="Main toolbar"]');

      const target = inner || oldDirect || oldAria;

      if (target) {
        // Always insert *after* the outer .G-atb so our bar sits immediately below
        const anchor = target.closest('.G-atb') || target;
        console.log('[GCO] native toolbar found →', anchor);
        resolve(anchor);
      } else {
        requestAnimationFrame(poll);
      }
    })();
  });
}


// ---------------- UI injection ------------------------------
function injectToolbar(anchor) {
  const bar = document.createElement('div');
  bar.className = 'gcal-filter-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', chrome.i18n.getMessage('label_toolbar') || 'Calendar filter');

  bar.innerHTML = `
    <div class="gcal-btn-group">
      <span class="gcal-label">${chrome.i18n.getMessage('label_options') || 'Calendar options:'}</span>
      <button aria-pressed="false" data-mode="${MODES.ALL}">${chrome.i18n.getMessage('btn_yes') || 'Yes'}</button>
      <button aria-pressed="false" data-mode="${MODES.HIDE}">${chrome.i18n.getMessage('btn_no') || 'No'}</button>
      <button aria-pressed="false" data-mode="${MODES.ONLY}">${chrome.i18n.getMessage('btn_only') || 'Only'}</button>
    </div>
    <span class="gcal-status" aria-live="polite"></span>
  `;
  anchor.insertAdjacentElement('afterend', bar);
  ensureListElement();

  bar.addEventListener('click', (e) => {
    if (e.target.dataset.mode) {
      currentMode = e.target.dataset.mode;
      chrome.storage.sync.set({ [KEY_MODE]: currentMode });
      applyFilter();
      refreshUI(bar);
    }
  });
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

// ---------------- helper: row classification ----------------
function isCalendarRow(row) {
  const subj = row.querySelector('.bog')?.innerText || '';
  const hasPrefix = /^(Invitation:|Cancelled:|Accepted:|Declined:|Updated invitation)/i.test(subj);
  const hasIcs = [...row.querySelectorAll('img[alt]')].some((img) => img.alt.includes('.ics'));
  return hasPrefix || hasIcs;
}

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
  refreshStatusText();
}

// ---------------- UI refresh helpers ------------------------
function refreshUI(bar) {
  // highlight active button
  bar.querySelectorAll('button').forEach((btn) => {
    const active = btn.dataset.mode === currentMode;
    btn.toggleAttribute('data-active', active);
    btn.setAttribute('aria-pressed', active);
  });
  refreshStatusText();
}

function refreshStatusText() {
  const status = document.querySelector('.gcal-status');
  if (!status) return;
  status.textContent =
    currentMode === MODES.HIDE
      ? chrome.i18n.getMessage('status_hidden') || 'Calendar is hidden'
      : currentMode === MODES.ONLY
        ? chrome.i18n.getMessage('status_only') || 'Only showing calendars'
        : chrome.i18n.getMessage('status_all') || 'Showing e-mails and calendar invites';
}

// ---------------- observe DOM mutations ---------------------
// const obs = new MutationObserver(applyFilter);
// obs.observe(document.body, { childList: true, subtree: true });

console.log('[GCO] content script hit the bottom – mode =', currentMode);