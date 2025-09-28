import { expect, test, describe, beforeEach, jest } from '@jest/globals';
import { applyFilter, isCalendarRow, hasAttachmentRow, isFavouriteRow, hasSpecificAttachmentType } from '../src/modules/filter.js';
import { MODES, setCurrentMode, setDebugOn } from '../src/modules/state.js';

// Mock the chrome API
global.chrome = {
  i18n: {
    getMessage: (key, substitutions) => {
      if (key === 'label_toolbar') return 'Calendar filter';
      if (key === 'label_options') return 'Calendar options:';
      if (key === 'filter_status_update') return `Filter set to ${substitutions[0]}`;
      if (key === 'btn_all') return 'Everything';
      if (key === 'btn_mail') return 'Email only';
      if (key === 'btn_cal') return 'Calendar only';
      if (key === 'btn_attach') return 'Attachments only';
      if (key === 'btn_fav') return 'Favourites only';
      if (key === 'alt_starred') return 'Starred';
      if (key === 'button_filter_images') return 'Images Only';
      if (key === 'button_filter_pdfs') return 'PDFs Only';
      if (key === 'button_filter_documents') return 'Documents Only';
      if (key === 'button_filter_spreadsheets') return 'Spreadsheets Only';
      if (key === 'button_filter_presentations') return 'Presentations Only';
      return key;
    },
  },
};

// Helper function for creating mock email rows
function createEmailRow(id, { isCalendar = false, hasAttachment = false, isFavourite = false, text = 'Test Email', attachmentChips = [] } = {}) {
    const row = document.createElement('tr');
    row.classList.add('zA'); // Gmail's class for email rows
    row.dataset.testId = id; // Custom data attribute for easy selection
    row.innerHTML = `<td>${text}</td>`;

    if (isCalendar) {
        row.innerHTML += `<td><img class="aXk" alt=".ics" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></td>`;
    }

    let attachmentHtml = '';
    if (hasAttachment || attachmentChips.length > 0) {
        row.classList.add('byw'); // Gmail's class for attachment rows
        attachmentHtml += `<td class="brd">`; // Use brd for the attachment row container
        attachmentChips.forEach(chip => {
            attachmentHtml += `<div class="brc" title="${chip.title || ''}" data-docurl="${chip.dataDocurl || ''}">${chip.imgSrc ? `<img src="${chip.imgSrc}">` : ''}<span>${chip.text || ''}</span></div>`;
        });
        attachmentHtml += `</td>`;
    }
    row.innerHTML += attachmentHtml;

    if (isFavourite) {
        row.innerHTML += `<td><span data-tooltip="Starred"></span></td>`;
    }
    return row;
}

describe('hasSpecificAttachmentType', () => {
    test('should return true for a row with a JPG image attachment', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [{ title: 'my_image.jpg' }]
        });
        expect(hasSpecificAttachmentType(row, MODES.IMAGE)).toBe(true);
    });

    test('should return true for a row with a PNG image attachment', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [{ title: 'another_image.png' }]
        });
        expect(hasSpecificAttachmentType(row, MODES.IMAGE)).toBe(true);
    });

    test('should return true for a row with a PDF attachment', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [{ title: 'document.pdf' }]
        });
        expect(hasSpecificAttachmentType(row, MODES.PDF)).toBe(true);
    });

    test('should return true for a row with a DOCX document attachment', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [{ title: 'report.docx' }]
        });
        expect(hasSpecificAttachmentType(row, MODES.DOCUMENT)).toBe(true);
    });

    test('should return true for a row with a CSV spreadsheet attachment', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [{ title: 'data.csv' }]
        });
        expect(hasSpecificAttachmentType(row, MODES.SPREADSHEET)).toBe(true);
    });

    test('should return true for a row with a PPTX presentation attachment', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [{ title: 'slides.pptx' }]
        });
        expect(hasSpecificAttachmentType(row, MODES.PRESENTATION)).toBe(true);
    });

    test('should return false for a row with a PDF when checking for IMAGE', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [{ title: 'document.pdf' }]
        });
        expect(hasSpecificAttachmentType(row, MODES.IMAGE)).toBe(false);
    });

    test('should return true for a row with a Google Drive document (icon check)', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [{
                dataDocurl: 'https://docs.google.com/document/d/abc',
                imgSrc: '//ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_document_x16.png'
            }]
        });
        expect(hasSpecificAttachmentType(row, MODES.DOCUMENT)).toBe(true);
    });

    test('should return true for a row with a Google Drive spreadsheet (icon check)', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [{
                dataDocurl: 'https://docs.google.com/spreadsheets/d/abc',
                imgSrc: '//ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_spreadsheet_x16.png'
            }]
        });
        expect(hasSpecificAttachmentType(row, MODES.SPREADSHEET)).toBe(true);
    });

    test('should return true for a row with a Google Drive presentation (icon check)', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [{
                dataDocurl: 'https://docs.google.com/presentation/d/abc',
                imgSrc: '//ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_presentation_x16.png'
            }]
        });
        expect(hasSpecificAttachmentType(row, MODES.PRESENTATION)).toBe(true);
    });

    test('should return false for a Google Drive document when checking for PDF', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [{
                dataDocurl: 'https://docs.google.com/document/d/abc',
                imgSrc: '//ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_document_x16.png'
            }]
        });
        expect(hasSpecificAttachmentType(row, MODES.PDF)).toBe(false);
    });

    test('should return true if one of multiple attachments matches', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [
                { title: 'image.jpg' },
                { title: 'report.pdf' },
                { title: 'document.docx' }
            ]
        });
        expect(hasSpecificAttachmentType(row, MODES.PDF)).toBe(true);
    });

    test('should return false if no attachments match', () => {
        const row = createEmailRow('row1', {
            attachmentChips: [
                { title: 'archive.zip' },
                { title: 'audio.mp3' }
            ]
        });
        expect(hasSpecificAttachmentType(row, MODES.IMAGE)).toBe(false);
    });

    test('should return false if no attachment chips are present', () => {
        const row = createEmailRow('row1', {});
        expect(hasSpecificAttachmentType(row, MODES.IMAGE)).toBe(false);
    });
});

describe('applyFilter comprehensive tests', () => {
    let messageList;

    beforeEach(() => {
        document.body.innerHTML = ''; // Clear the DOM completely
        document.body.innerHTML = '<div id="message-list" class="UI"></div>'; // Establish a clean, consistent parent element for email rows
        messageList = document.getElementById('message-list');
        setCurrentMode(MODES.ALL); // Reset the filter mode to default
        setDebugOn(false); // Ensure debug mode is off by default
    });

    test('should show all rows when MODES.ALL is selected', () => {
        const row1 = createEmailRow('row1', { isCalendar: true });
        const row2 = createEmailRow('row2', { hasAttachment: true });
        const row3 = createEmailRow('row3', { isFavourite: true });
        const row4 = createEmailRow('row4', { isCalendar: true, hasAttachment: true });
        const row5 = createEmailRow('row5', {});

        messageList.appendChild(row1);
        messageList.appendChild(row2);
        messageList.appendChild(row3);
        messageList.appendChild(row4);
        messageList.appendChild(row5);

        setCurrentMode(MODES.ALL);
        applyFilter();

        expect(row1.style.display).toBe('');
        expect(row1.style.background).toBe('');
        expect(row1.style.opacity).toBe('');

        expect(row2.style.display).toBe('');
        expect(row2.style.background).toBe('');
        expect(row2.style.opacity).toBe('');

        expect(row3.style.display).toBe('');
        expect(row3.style.background).toBe('');
        expect(row3.style.opacity).toBe('');

        expect(row4.style.display).toBe('');
        expect(row4.style.background).toBe('');
        expect(row4.style.opacity).toBe('');

        expect(row5.style.display).toBe('');
        expect(row5.style.background).toBe('');
        expect(row5.style.opacity).toBe('');
    });

    test('should hide calendar rows when MODES.EMAIL is selected', () => {
        const row1 = createEmailRow('row1', { isCalendar: true });
        const row2 = createEmailRow('row2', { hasAttachment: true });
        const row3 = createEmailRow('row3', { isFavourite: true });
        const row4 = createEmailRow('row4', { isCalendar: true, hasAttachment: true });
        const row5 = createEmailRow('row5', {});

        messageList.appendChild(row1);
        messageList.appendChild(row2);
        messageList.appendChild(row3);
        messageList.appendChild(row4);
        messageList.appendChild(row5);

        setCurrentMode(MODES.EMAIL);
        applyFilter();

        expect(row1.style.display).toBe('none');
        expect(row2.style.display).toBe('');
        expect(row3.style.display).toBe('');
        expect(row4.style.display).toBe('none');
        expect(row5.style.display).toBe('');

        [row1, row2, row3, row4, row5].forEach(row => {
            expect(row.style.background).toBe('');
            expect(row.style.opacity).toBe('');
        });
    });

    test('should show only calendar rows when MODES.CALENDAR is selected', () => {
        const row1 = createEmailRow('row1', { isCalendar: true });
        const row2 = createEmailRow('row2', { hasAttachment: true });
        const row3 = createEmailRow('row3', { isFavourite: true });
        const row4 = createEmailRow('row4', { isCalendar: true, hasAttachment: true });
        const row5 = createEmailRow('row5', {});

        messageList.appendChild(row1);
        messageList.appendChild(row2);
        messageList.appendChild(row3);
        messageList.appendChild(row4);
        messageList.appendChild(row5);

        setCurrentMode(MODES.CALENDAR);
        applyFilter();

        expect(row1.style.display).toBe('');
        expect(row2.style.display).toBe('none');
        expect(row3.style.display).toBe('none');
        expect(row4.style.display).toBe('');
        expect(row5.style.display).toBe('none');

        [row1, row2, row3, row4, row5].forEach(row => {
            expect(row.style.background).toBe('');
            expect(row.style.opacity).toBe('');
        });
    });

    test('should show only attachment rows when MODES.ATTACH is selected', () => {
        const row1 = createEmailRow('row1', { isCalendar: true });
        const row2 = createEmailRow('row2', { hasAttachment: true });
        const row3 = createEmailRow('row3', { isFavourite: true });
        const row4 = createEmailRow('row4', { isCalendar: true, hasAttachment: true });
        const row5 = createEmailRow('row5', {});

        messageList.appendChild(row1);
        messageList.appendChild(row2);
        messageList.appendChild(row3);
        messageList.appendChild(row4);
        messageList.appendChild(row5);

        setCurrentMode(MODES.ATTACH);
        applyFilter();

        expect(row1.style.display).toBe('none');
        expect(row2.style.display).toBe('');
        expect(row3.style.display).toBe('none');
        expect(row4.style.display).toBe('none'); // Calendar with attachment should be hidden
        expect(row5.style.display).toBe('none');

        [row1, row2, row3, row4, row5].forEach(row => {
            expect(row.style.background).toBe('');
            expect(row.style.opacity).toBe('');
        });
    });

    test('should show only favourite rows when MODES.FAVOURITES is selected', () => {
        const row1 = createEmailRow('row1', { isCalendar: true, isFavourite: true });
        const row2 = createEmailRow('row2', { hasAttachment: true });
        const row3 = createEmailRow('row3', { isFavourite: true });
        const row4 = createEmailRow('row4', { isCalendar: true, hasAttachment: true });
        const row5 = createEmailRow('row5', {});

        messageList.appendChild(row1);
        messageList.appendChild(row2);
        messageList.appendChild(row3);
        messageList.appendChild(row4);
        messageList.appendChild(row5);

        setCurrentMode(MODES.FAVOURITES);
        applyFilter();

        expect(row1.style.display).toBe('');
        expect(row2.style.display).toBe('none');
        expect(row3.style.display).toBe('');
        expect(row4.style.display).toBe('none');
        expect(row5.style.display).toBe('none');

        [row1, row2, row3, row4, row5].forEach(row => {
            expect(row.style.background).toBe('');
            expect(row.style.opacity).toBe('');
        });
    });

    test('should apply debug styles to hidden rows when debugOn is true', () => {
        const row1 = createEmailRow('row1', { isCalendar: true }); // Should be hidden by HIDE mode
        const row2 = createEmailRow('row2', { hasAttachment: true }); // Should be shown

        messageList.appendChild(row1);
        messageList.appendChild(row2);

        setDebugOn(true);
        setCurrentMode(MODES.EMAIL);
        applyFilter();

        expect(row1.style.display).toBe('');
        expect(row1.style.background).toBe('rgba(0, 123, 255, 0.15)');
        expect(row1.style.opacity).toBe('0.5');

        expect(row2.style.display).toBe('');
        expect(row2.style.background).toBe('');
        expect(row2.style.opacity).toBe('');
    });

    test('should revert debug styles and hide rows when debugOn is toggled off', () => {
        const row1 = createEmailRow('row1', { isCalendar: true });
        const row2 = createEmailRow('row2', { hasAttachment: true });

        messageList.appendChild(row1);
        messageList.appendChild(row2);

        // First, enable debug and apply filter to make row1 semi-transparent
        setDebugOn(true);
        setCurrentMode(MODES.EMAIL);
        applyFilter();

        // Then, toggle debug off and re-apply filter
        setDebugOn(false);
        applyFilter();

        expect(row1.style.display).toBe('none');
        expect(row1.style.background).toBe('');
        expect(row1.style.opacity).toBe('');

        expect(row2.style.display).toBe('');
        expect(row2.style.background).toBe('');
        expect(row2.style.opacity).toBe('');
    });
});
