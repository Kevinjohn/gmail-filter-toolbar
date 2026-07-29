import { JSDOM } from 'jsdom';
import {
  ALIGNMENTS,
  SHOW_BUTTON_TEXT_KEY,
  SHOW_FAVOURITES_KEY,
  ALIGNMENT_KEY,
  THEME_KEY,
  THEMES,
} from '../../src/modules/constants.js';
import { MODES } from '../../src/modules/state.js';

export function makeToolbarState(overrides = {}) {
  return {
    currentMode: MODES.ALL,
    showButtonText: true,
    showFavouritesButton: false,
    toolbarAlignment: ALIGNMENTS.START,
    themePreference: THEMES.SYSTEM,
    ...overrides,
  };
}

export function makeOptionsPayload(overrides = {}) {
  return {
    siftDebug: false,
    [SHOW_BUTTON_TEXT_KEY]: true,
    [SHOW_FAVOURITES_KEY]: false,
    [ALIGNMENT_KEY]: ALIGNMENTS.START,
    [THEME_KEY]: THEMES.SYSTEM,
    ...overrides,
  };
}

export function makeMailDocument() {
  const dom = new JSDOM('<div class="UI"></div>');
  return dom.window.document;
}

export function makeAttachmentPreset({ title, dataDocurl, imgSrc, text } = {}) {
  return {
    title: title ?? '',
    dataDocurl: dataDocurl ?? '',
    imgSrc: imgSrc ?? '',
    text: text ?? '',
  };
}

export function makeEmailRow(config = {}, doc = makeMailDocument()) {
  const defaults = {
    id: 'row',
    isCalendar: false,
    hasAttachment: false,
    isFavourite: false,
    text: 'Test Email',
    attachmentChips: [],
  };
  const { id, isCalendar, hasAttachment, isFavourite, text, attachmentChips } = {
    ...defaults,
    ...config,
  };

  const row = doc.createElement('tr');
  row.classList.add('zA');
  row.dataset.testId = id;
  row.innerHTML = `<td>${text}</td>`;

  if (isCalendar) {
    row.innerHTML += `<td><img alt=".ics"></td>`;
  }

  if (hasAttachment || attachmentChips.length > 0) {
    row.classList.add('byw');
    const attachmentCell = doc.createElement('td');
    attachmentCell.className = 'brd';
    attachmentChips.forEach((chipConfig) => {
      const chip = doc.createElement('div');
      chip.className = 'brc';
      const preset = makeAttachmentPreset(chipConfig);
      if (preset.title) {
        chip.setAttribute('title', preset.title);
      }
      if (preset.dataDocurl) {
        chip.setAttribute('data-docurl', preset.dataDocurl);
      }
      if (preset.imgSrc) {
        const img = doc.createElement('img');
        img.src = preset.imgSrc;
        chip.appendChild(img);
      }
      if (preset.text) {
        const span = doc.createElement('span');
        span.textContent = preset.text;
        chip.appendChild(span);
      }
      attachmentCell.appendChild(chip);
    });
    row.appendChild(attachmentCell);
  }

  if (isFavourite) {
    const favCell = doc.createElement('td');
    const fav = doc.createElement('span');
    fav.className = 'T-KT T-KT-Jp';
    fav.setAttribute('data-tooltip', 'Starred');
    favCell.appendChild(fav);
    row.appendChild(favCell);
  }

  const container = doc.querySelector('.UI') || doc.body;
  container.appendChild(row);

  return { document: doc, row };
}
