// In English the labels a screen reader reads are English too: the reminder form's buttons, the
// emoji tabs, and icon-only buttons (named by their title)

export async function run() {
  const a = window.app;
  a.languageSelect.value = 'en';
  a.languageSelect.dispatchEvent(new Event('change'));
  return {
    date: document.getElementById('reminderDateText').textContent,
    time: document.getElementById('reminderTimeText').textContent,
    emojiTabs: document.querySelector('.emoji-tabs').getAttribute('aria-label'),
    iconButton: document.getElementById('historyBtn').getAttribute('aria-label'),
  };
}

export const expected = {
  date: 'Date',
  time: 'Time',
  emojiTabs: 'Emoji categories',
  iconButton: 'Show note history',
};
