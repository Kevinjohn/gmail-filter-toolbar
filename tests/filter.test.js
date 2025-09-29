import { describe, beforeEach, test, expect } from '@jest/globals';
import {
  applyFilter,
  isCalendarRow,
  hasAttachmentRow,
  isFavouriteRow,
  hasSpecificAttachmentType,
  isGoogleDocAttachment,
} from '../src/modules/filter.js';
import {
  MODES,
  setCurrentMode,
  setDebugOn,
  setShowFavouritesButton,
  setToolbarAlignment,
  setThemePreference,
} from '../src/modules/state.js';
import { makeEmailRow, makeMailDocument } from './factories/index.js';

const { useChromeMock } = global;

beforeEach(() => {
  useChromeMock({
    i18n: {
      getMessage: (key, substitutions) => {
        if (key === 'label_toolbar') return 'Calendar filter';
        if (key === 'label_options') return 'Calendar options:';
        if (key === 'filter_status_update') return `Filter set to ${substitutions?.[0] ?? ''}`;
        if (key === 'btn_all') return 'Everything';
        if (key === 'btn_mail') return 'Emails';
        if (key === 'btn_cal') return 'Calendar';
        if (key === 'btn_attach') return 'Attachments';
        if (key === 'btn_fav') return 'Favourites';
        if (key === 'alt_starred') return 'Starred';
        if (key === 'button_filter_images') return 'Images Only';
        if (key === 'button_filter_pdfs') return 'PDFs Only';
        if (key === 'button_filter_documents') return 'Documents Only';
        if (key === 'button_filter_spreadsheets') return 'Spreadsheets Only';
        if (key === 'button_filter_presentations') return 'Presentations Only';
        if (key === 'alt_calendar_event') return 'Calendar event';
        return key;
      },
    },
  });
});

const prepareDocument = (config) => {
  const doc = makeMailDocument();
  const { row } = makeEmailRow(config, doc);
  global.document = doc;
  return { document: doc, row };
};

describe('isCalendarRow', () => {
  test('returns true when ICS icon present', () => {
    const { row } = prepareDocument({ isCalendar: true });
    expect(isCalendarRow(row)).toBe(true);
  });

  test('returns false when no invite markers present', () => {
    const { row } = prepareDocument();
    expect(isCalendarRow(row)).toBe(false);
  });
});

describe('isFavouriteRow', () => {
  test('returns true when tooltip matches Starred', () => {
    const { row } = prepareDocument({ isFavourite: true });
    expect(isFavouriteRow(row)).toBe(true);
  });

  test('returns false when tooltip missing', () => {
    const { row } = prepareDocument();
    expect(isFavouriteRow(row)).toBe(false);
  });
});

describe('hasAttachmentRow', () => {
  test('returns true when Gmail class present', () => {
    const { row } = prepareDocument({ hasAttachment: true });
    expect(hasAttachmentRow(row)).toBe(true);
  });

  test('returns false without indicators', () => {
    const { row } = prepareDocument();
    expect(hasAttachmentRow(row)).toBe(false);
  });

  test('detects Google Drive attachment chips', () => {
    const { row } = prepareDocument({
      attachmentChips: [
        {
          dataDocurl: 'https://drive.google.com/file/d/abc',
          imgSrc: '//ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_pdf_x16.png',
        },
      ],
    });
    expect(hasAttachmentRow(row)).toBe(true);
  });
});

describe('isGoogleDocAttachment', () => {
  test('returns true for drive-hosted attachment chips', () => {
    const { row } = prepareDocument({
      attachmentChips: [
        {
          dataDocurl: 'https://drive.google.com/drive/u/0/folders/abc',
        },
      ],
    });
    expect(isGoogleDocAttachment(row)).toBe(true);
  });

  test('returns false when chips are regular attachments', () => {
    const { row } = prepareDocument({
      attachmentChips: [
        {
          title: 'notes.txt',
        },
      ],
    });
    expect(isGoogleDocAttachment(row)).toBe(false);
  });
});

describe('hasSpecificAttachmentType', () => {
  test('identifies attachments by extension', () => {
    const { row } = prepareDocument({ attachmentChips: [{ title: 'invoice.pdf' }] });
    expect(hasSpecificAttachmentType(row, MODES.PDF)).toBe(true);
  });

  test('identifies Drive attachments by icon', () => {
    const { row } = prepareDocument({
      attachmentChips: [
        {
          dataDocurl: 'https://docs.google.com/document/d/abc',
          imgSrc: '//ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_document_x16.png',
        },
      ],
    });
    expect(hasSpecificAttachmentType(row, MODES.DOCUMENT)).toBe(true);
  });

  test('returns false when config missing', () => {
    const { row } = prepareDocument({ attachmentChips: [{ title: 'custom.bin' }] });
    expect(hasSpecificAttachmentType(row, 'UNKNOWN')).toBe(false);
  });

  test('ignores drive attachments when identifier mismatch', () => {
    const { row } = prepareDocument({
      attachmentChips: [
        {
          dataDocurl: 'https://drive.google.com/file/d/abc',
          imgSrc: '//ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_document_x16.png',
        },
      ],
    });
    expect(hasSpecificAttachmentType(row, MODES.PDF)).toBe(false);
  });

  test('ignores drive attachments without icon hint', () => {
    const { row } = prepareDocument({
      attachmentChips: [
        {
          dataDocurl: 'https://drive.google.com/file/d/abc',
        },
      ],
    });
    expect(hasSpecificAttachmentType(row, MODES.PDF)).toBe(false);
  });
});

describe('applyFilter edge cases', () => {
  const buildListWithRows = () => {
    const doc = makeMailDocument();
    doc.querySelector('.UI').innerHTML = '';
    const rows = [
      makeEmailRow({ id: 'calendar', isCalendar: true }, doc).row,
      makeEmailRow({ id: 'attachment', hasAttachment: true }, doc).row,
      makeEmailRow({ id: 'favourite', isFavourite: true }, doc).row,
    ];
    global.document = doc;
    return { document: doc, rows };
  };

  beforeEach(() => {
    setCurrentMode(MODES.ALL);
    setDebugOn(false);
  });

  test('short-circuits when mode not recognised', () => {
    const { document: doc, rows } = buildListWithRows();
    setCurrentMode('UNKNOWN');
    applyFilter(doc);
    rows.forEach((row) => {
      expect(row.style.display).toBe('');
    });
  });

  test('applies debug styling without hiding', () => {
    const { document: doc, rows } = buildListWithRows();
    setCurrentMode(MODES.CALENDAR);
    setDebugOn(true);
    applyFilter(doc);
    expect(rows[1].style.opacity).toBe('0.5');
    expect(rows[1].style.display).toBe('');
  });

  test('resets debug styling when debug disabled', () => {
    const { document: doc, rows } = buildListWithRows();
    setCurrentMode(MODES.CALENDAR);
    setDebugOn(true);
    applyFilter(doc);
    setDebugOn(false);
    applyFilter(doc);
    expect(rows[1].style.opacity).toBe('');
    expect(rows[1].style.display).toBe('none');
  });
});

describe('applyFilter mode behaviour', () => {
  const buildRows = (rowConfigs) => {
    const doc = makeMailDocument();
    doc.querySelector('.UI').innerHTML = '';
    const rows = rowConfigs.map((config) => makeEmailRow(config, doc).row);
    global.document = doc;
    return { doc, rows };
  };

  beforeEach(() => {
    setDebugOn(false);
  });

  test('EMAIL mode hides calendar invites', () => {
    const { doc, rows } = buildRows([
      { id: 'calendar', isCalendar: true },
      { id: 'normal' },
    ]);
    setCurrentMode(MODES.EMAIL);
    applyFilter(doc);
    expect(rows[0].style.display).toBe('none');
    expect(rows[1].style.display).toBe('');
  });

  test('ATTACH mode keeps attachment rows visible', () => {
    const { doc, rows } = buildRows([
      { id: 'calendar', isCalendar: true },
      { id: 'attachment', hasAttachment: true },
      { id: 'plain' },
    ]);
    setCurrentMode(MODES.ATTACH);
    applyFilter(doc);
    expect(rows[0].style.display).toBe('none');
    expect(rows[1].style.display).toBe('');
    expect(rows[2].style.display).toBe('none');
  });

  test('FAVOURITES mode only shows starred rows', () => {
    const { doc, rows } = buildRows([
      { id: 'plain' },
      { id: 'starred', isFavourite: true },
    ]);
    setCurrentMode(MODES.FAVOURITES);
    applyFilter(doc);
    expect(rows[0].style.display).toBe('none');
    expect(rows[1].style.display).toBe('');
  });

  test.each([
    [MODES.IMAGE, { title: 'photo.png' }],
    [MODES.PDF, { title: 'contract.pdf' }],
    [MODES.DOCUMENT, {
      dataDocurl: 'https://docs.google.com/document/d/abc',
      imgSrc: '//ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_document_x16.png',
    }],
    [MODES.SPREADSHEET, { title: 'report.xlsx' }],
    [MODES.PRESENTATION, { title: 'slides.pptx' }],
  ])('attachment mode %s filters rows by chip metadata', (mode, chipConfig) => {
    const doc = makeMailDocument();
    doc.querySelector('.UI').innerHTML = '';
    const matchRow = makeEmailRow({ id: 'match', attachmentChips: [chipConfig] }, doc).row;
    const otherRow = makeEmailRow({ id: 'other' }, doc).row;
    setCurrentMode(mode);
    setDebugOn(false);
    applyFilter(doc);
    expect(matchRow.style.display).toBe('');
    expect(otherRow.style.display).toBe('none');
  });
});

describe('state mutations in tandem', () => {
  test('allows toggling toolbar alignment and favourites flag', () => {
    setToolbarAlignment('center');
    setShowFavouritesButton(true);
    setThemePreference('dark');
    expect(() => applyFilter(document)).not.toThrow();
  });
});
