import { stateManager } from './stateManager.js';
import { configurationManager, getSelector, getClassName } from './configurationManager.js';
import {
  sanitizeTextContent,
  validateDatasetAttribute,
  safeGetI18nMessage
} from './utils/validation.js';

/**
 * Toolbar Module - DOM Operations Security Audit
 *
 * Security Note: This module has been audited for DOM security.
 * - All DOM operations use safe methods (createElement, textContent, setAttribute)
 * - No innerHTML usage for user-generated content
 * - All text content and attributes are validated before DOM insertion
 * - Input validation layer ensures data safety
 * - Now uses ConfigurationManager for centralized configuration access
 */

function ensureListElement(doc = document) {
  const list = doc.querySelector(getSelector('emailList'));
  if (list && !list.hasAttribute('tabindex')) {
    list.setAttribute('tabindex', '-1');
  }
  return list;
}

export function injectToolbar(doc = document, headerElement) {
  const header = headerElement || doc.querySelector(getSelector('gmailToolbarHeader'));
  if (!header) return;

  const wrapperClass = getClassName('filterWrapperClass');
  let wrapper = header.nextElementSibling;
  if (wrapper && wrapper.classList.contains(wrapperClass)) {
    // If wrapper exists and is our filter wrapper, clear its children
    while (wrapper.firstChild) {
      wrapper.removeChild(wrapper.firstChild);
    }
  } else {
    // If wrapper doesn't exist or is not our filter wrapper, create a new one
    wrapper = doc.createElement('div');
    wrapper.className = wrapperClass;
    header.insertAdjacentElement('afterend', wrapper);
  }

  // Create the bar element and append it to the wrapper
  const bar = doc.createElement('div'); // Always create a new bar
  bar.className = getClassName('filterBarClass');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', safeGetI18nMessage('label_toolbar',
    configurationManager.getAriaConfig('toolbarLabel')));
  wrapper.appendChild(bar);

  const btnGroup = doc.createElement('div');
  btnGroup.className = getClassName('buttonGroupClass');
  btnGroup.setAttribute('role', configurationManager.getAriaConfig('radioGroupRole'));

  const labelId = 'gcal-filter-label';
  const labelSpan = doc.createElement('span');
  labelSpan.className = getClassName('labelClass');
  labelSpan.id = labelId;
  labelSpan.textContent = sanitizeTextContent(
    safeGetI18nMessage('label_options', configurationManager.getAriaConfig('filterOptionsLabel'))
  );
  btnGroup.appendChild(labelSpan);
  btnGroup.setAttribute('aria-labelledby', labelId);

  // Add all filter mode buttons dynamically from configuration
  const allFilterModes = configurationManager.getAllFilterModes();
  Object.keys(allFilterModes).forEach((mode) => {
    const config = allFilterModes[mode];
    const button = createFilterButton(doc, mode, config.icon, config.labelKey);
    btnGroup.appendChild(button);
  });

  bar.appendChild(btnGroup);

  const liveRegion = doc.createElement('div');
  const liveRegionClasses = `${getClassName('liveRegionClass')} ${getClassName('visuallyHiddenClass')}`;
  liveRegion.className = liveRegionClasses;
  liveRegion.setAttribute('role', configurationManager.getAriaConfig('statusRole'));
  liveRegion.setAttribute('aria-live', configurationManager.getAriaConfig('livePolite'));
  wrapper.appendChild(liveRegion);

  refreshUI(doc);

  if (!bar.dataset.listenerAdded) {
    bar.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const list = ensureListElement(doc);
        list?.focus();
      }
    });
    btnGroup.addEventListener('keydown', handleArrowNavigation);
    bar.dataset.listenerAdded = 'true';
  }
}

/**
 * Helper function to create a filter button.
 * @param {string} mode - The filter mode (e.g., MODES.ALL, MODES.IMAGE).
 * @param {string} iconName - The Material Icon name.
 * @param {string} labelKey - The i18n key for the button's label.
 * @returns {HTMLButtonElement} The created button element.
 */
/**
 * Helper function to create a filter button with validated content
 * Security Note: All text content and attributes are validated before DOM insertion
 * @param {Document} doc - The document object
 * @param {string} mode - The filter mode (e.g., MODES.ALL, MODES.IMAGE).
 * @param {string} iconName - The Material Icon name.
 * @param {string} labelKey - The i18n key for the button's label.
 * @returns {HTMLButtonElement} The created button element.
 */
function createFilterButton(doc, mode, iconName, labelKey) {
  const button = doc.createElement('button');
  
  // Validate and sanitize all inputs
  const sanitizedMode = validateDatasetAttribute('mode', mode);
  const sanitizedIconName = sanitizeTextContent(iconName, 'help');
  const buttonText = sanitizeTextContent(
    safeGetI18nMessage(labelKey, 'Filter Button'),
    'Filter Button'
  );
  
  button.id = `filter-${sanitizedMode}`;
  button.dataset.mode = sanitizedMode;
  button.setAttribute('role', 'radio');
  button.setAttribute('aria-label', buttonText);
  button.dataset.tooltip = buttonText;

  const icon = doc.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.textContent = sanitizedIconName;
  button.appendChild(icon);

  const textSpan = doc.createElement('span');
  textSpan.className = 'gcal-text-label';
  textSpan.textContent = buttonText;
  button.appendChild(textSpan);

  return button;
}

function handleArrowNavigation(e) {
  const { key } = e;
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;

  const buttons = Array.from(e.currentTarget.querySelectorAll('button[role="radio"]'));
  const focusedIndex = buttons.findIndex((btn) => btn === document.activeElement);

  if (focusedIndex === -1) return;

  e.preventDefault();

  let nextIndex;
  if (key === 'ArrowLeft') {
    nextIndex = (focusedIndex - 1 + buttons.length) % buttons.length;
  } else {
    nextIndex = (focusedIndex + 1) % buttons.length;
  }

  buttons[nextIndex].focus();
  buttons[nextIndex].click();
}

export function updateButtonTextView(showText, doc = document) {
  const bar = doc.querySelector(getSelector('filterBar'));
  if (bar) {
    bar.classList.toggle(getClassName('showIconOnlyClass'), !showText);
  }
}

export function refreshUI(doc = document) {
  const bar = doc.querySelector(getSelector('filterBar'));
  if (!bar) return;

  const currentMode = stateManager.get('filterMode');
  
  bar.querySelectorAll('button[data-mode]').forEach((btn) => {
    const isChecked = btn.dataset.mode === currentMode;
    btn.setAttribute('aria-checked', isChecked);
    btn.setAttribute('tabindex', isChecked ? '0' : '-1');
  });

  const liveRegion = doc.querySelector(getSelector('liveRegion'));
  if (liveRegion) {
    // Get the label key from the filter mode configuration
    const filterConfig = configurationManager.getFilterModeConfig(currentMode);
    const labelKey = filterConfig ? filterConfig.labelKey : 'btn_all';
    
    // Validate and sanitize all text content
    const currentModeLabel = sanitizeTextContent(
      safeGetI18nMessage(labelKey, 'All Email'),
      'All Email'
    );
    
    // Use Chrome i18n API with substitutions, then validate the result
    let statusMessage;
    try {
      const rawMessage = chrome.i18n.getMessage('filter_status_update', [currentModeLabel]);
      statusMessage = sanitizeTextContent(rawMessage, `Filter set to ${currentModeLabel}`);
    } catch (error) {
      console.error('Error getting status message:', error);
      statusMessage = `Filter set to ${currentModeLabel}`;
    }
    
    liveRegion.textContent = statusMessage;
  }
}

// Subscribe to state changes to automatically update UI
stateManager.subscribe('stateChanged:filterMode', () => {
  refreshUI();
});

stateManager.subscribe('stateChanged:showButtonText', ({ value }) => {
  updateButtonTextView(value);
});
