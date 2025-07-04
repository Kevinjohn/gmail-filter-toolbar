import { expect, test, describe, beforeEach, jest } from '@jest/globals';
import { applyFilter, isCalendarRow, hasAttachmentRow, isFavouriteRow } from '../src/modules/filter.js';
import { MODES, setCurrentMode, setDebugOn } from '../src/modules/state.js';

// Mock the chrome API
global.chrome = {
  i18n: {
    getMessage: (key, substitutions) => {
      if (key === 'label_toolbar') return 'Calendar filter';
      if (key === 'label_options') return 'Calendar options:';
      if (key === 'filter_status_update') return `Filter set to ${substitutions[0]}`;
      if (key === 'btn_all') return 'All Email';
      if (key === 'btn_mail') return 'Email only';
      if (key === 'btn_cal') return 'Calendar only';
      if (key === 'btn_attach') return 'Attachments only';
      if (key === 'btn_fav') return 'Favourites only';
      return key;
    },
  },
};

// Helper function for creating mock email rows
function createEmailRow(id, { isCalendar = false, hasAttachment = false, isFavourite = false, text = 'Test Email' } = {}) {
    const row = document.createElement('tr');
    row.classList.add('zA'); // Gmail's class for email rows
    row.dataset.testId = id; // Custom data attribute for easy selection
    row.innerHTML = `<td>${text}</td>`;
    if (isCalendar) {
        row.innerHTML += `<td><img class="aXk" alt=".ics" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></td>`;
    }
    if (hasAttachment) {
        row.classList.add('byw'); // Gmail's class for attachment rows
        row.innerHTML += `<td><img class="aXk" alt="Attachment" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></td>`;
    }
    if (isFavourite) {
        row.innerHTML += `<td><img alt="Starred" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></td>`;
    }
    return row;
}

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

    test('should hide calendar rows when MODES.HIDE is selected', () => {
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

        setCurrentMode(MODES.HIDE);
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

    test('should show only calendar rows when MODES.ONLY is selected', () => {
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

        setCurrentMode(MODES.ONLY);
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

    test('should show only attachment rows when MODES.ONLY_ATTACH is selected', () => {
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

        setCurrentMode(MODES.ONLY_ATTACH);
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
        setCurrentMode(MODES.HIDE);
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
        setCurrentMode(MODES.HIDE);
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
