// Choosing a sort order works by clicking the label, and the icons survive a language switch

export async function run() {
  const a = window.app;
  a.toggleSort();
  const opt = document.querySelector('.sort-option[data-value="title-asc"]');
  opt.querySelector('span').click();
  const r = {
    active: document.querySelector('.sort-option.active')?.dataset.value,
    hidden: a.sortDropdown.classList.contains('hidden'),
  };
  a.languageSelect.value = 'en';
  a.languageSelect.dispatchEvent(new Event('change'));
  await new Promise((r) => setTimeout(r, 300));
  a.toggleSort();
  r.enText = opt.textContent.trim();
  r.iconsKept = document.querySelectorAll('.sort-option i.fas').length;
  r.rowHeight = Math.round(opt.getBoundingClientRect().height);
  return r;
}

export const expected = {
  active: 'title-asc',
  hidden: true,
  enText: 'Title (A → Z)',
  iconsKept: 5,
  rowHeight: 36,
};
