// In English the labels a screen reader reads are English too: the reminder form's buttons and
// icon-only buttons (named by their title)

export async function run() {
  const a = window.app;
  a.languageSelect.value = 'en';
  a.languageSelect.dispatchEvent(new Event('change'));
  return {
    date: document.getElementById('reminderDateText').textContent,
    time: document.getElementById('reminderTimeText').textContent,
    imageButton: document.getElementById('browseImageBtn').getAttribute('aria-label'),
    iconButton: document.getElementById('editNoteBtn').getAttribute('aria-label'),
  };
}

export const expected = {
  date: 'Date',
  time: 'Time',
  imageButton: 'Image',
  iconButton: 'Edit',
};
