// Due dates of tasks, as in task managers. A task keeps its date as data-due="YYYY-MM-DD" on its
// .checklist-item. A date written in plain words at the start or the end of a task ("yarın",
// "cuma", "haftaya", "3 gün sonra", "15 mart", "15.03"; in English too) becomes its date when the
// line is left or Enter is pressed, and the words leave the text. The task menu sets or removes
// it too. A small label beside the task says when it is due (Today, Tomorrow, Friday, 15 Dec),
// in red once it is late; the tasks page groups the dated tasks into Overdue, Today and Upcoming.

import { i18n } from '../i18n.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TR_DAYS = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];
const EN_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const TR_MONTHS = [
  'ocak',
  'şubat',
  'mart',
  'nisan',
  'mayıs',
  'haziran',
  'temmuz',
  'ağustos',
  'eylül',
  'ekim',
  'kasım',
  'aralık',
];
const EN_MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
// A Turkish word may take a case ending ("yarına", "cumaya", "pazartesiye")
const ENDING = '(?:y?[ae]|n?[ae]|da|de|ta|te)?';

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const monthIndex = (word) => {
  const i = TR_MONTHS.indexOf(word);
  return i >= 0 ? i : EN_MONTHS.findIndex((m) => m === word || m.slice(0, 3) === word);
};

export function isoDay(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dayFromIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

// A day and month without a year: this year's, or next year's once it has passed
function comingDate(day, month, year, today) {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  let date = new Date(year ?? today.getFullYear(), month, day);
  if (date.getMonth() !== month) return null;
  if (year == null && date < today) date = new Date(today.getFullYear() + 1, month, day);
  return date;
}

// The phrases a date is written with: [pattern, the date it means]
function datePhrases() {
  const days = [...TR_DAYS, ...EN_DAYS].sort((a, b) => b.length - a.length).join('|');
  const months = [...TR_MONTHS, ...EN_MONTHS, ...EN_MONTHS.map((m) => m.slice(0, 3))]
    .sort((a, b) => b.length - a.length)
    .join('|');
  const weekday = (word) => {
    const i = TR_DAYS.indexOf(word);
    return i >= 0 ? i : EN_DAYS.indexOf(word);
  };
  const nextWeekday = (today, day, strictlyAfter) => {
    let ahead = (day - today.getDay() + 7) % 7;
    if (ahead === 0 && strictlyAfter) ahead = 7;
    return addDays(today, ahead);
  };
  return [
    [`bugün${ENDING}|today`, (m, t) => t],
    [`yarından sonra|öbür gün|day after tomorrow`, (m, t) => addDays(t, 2)],
    [`yarın${ENDING}|tomorrow`, (m, t) => addDays(t, 1)],
    [
      `haftaya|gelecek hafta${ENDING}|önümüzdeki hafta${ENDING}|next week`,
      (m, t) => nextWeekday(t, 1, true),
    ],
    [
      `ay sonu${ENDING}|end of (?:the )?month`,
      (m, t) => new Date(t.getFullYear(), t.getMonth() + 1, 0),
    ],
    [`(\\d{1,3}) gün sonra|in (\\d{1,3}) days?`, (m, t) => addDays(t, Number(m[1] || m[2]))],
    [`(\\d{1,2}) hafta sonra|in (\\d{1,2}) weeks?`, (m, t) => addDays(t, 7 * Number(m[1] || m[2]))],
    [
      `(?:gelecek|önümüzdeki|next) (${days})${ENDING}`,
      (m, t) => nextWeekday(t, weekday(m[1]), true),
    ],
    [`(${days})${ENDING}(?: günü${ENDING})?`, (m, t) => nextWeekday(t, weekday(m[1]), false)],
    [
      `(\\d{1,2}) (${months})${ENDING}(?: (\\d{4}))?`,
      (m, t) => comingDate(Number(m[1]), monthIndex(m[2]), m[3] ? Number(m[3]) : null, t),
    ],
    [
      `(${months}) (\\d{1,2})(?:,? (\\d{4}))?`,
      (m, t) => comingDate(Number(m[2]), monthIndex(m[1]), m[3] ? Number(m[3]) : null, t),
    ],
    [
      `(\\d{1,2})[./](\\d{2})(?:[./](\\d{2,4}))?`,
      (m, t) => {
        let year = m[3] ? Number(m[3]) : null;
        if (year != null && year < 100) year += 2000;
        return comingDate(Number(m[1]), Number(m[2]) - 1, year, t);
      },
    ],
  ];
}

// A date written at the start or the end of a task's text: { iso, start, end } (the phrase's
// place in the text), or null
export function findDuePhrase(text, now = new Date()) {
  const lower = String(text || '').toLocaleLowerCase('tr-TR');
  if (lower.length !== String(text || '').length) return null;
  const today = startOfDay(now);
  for (const [source, toDate] of datePhrases()) {
    const atEnd = new RegExp(`(^|\\s)(?:${source})[.!,;]?\\s*$`, 'u').exec(lower);
    const atStart = new RegExp(`^\\s*(?:${source})(?=[\\s.,;:!]|$)`, 'u').exec(lower);
    for (const match of [atEnd, atStart]) {
      if (!match) continue;
      const lead = match === atEnd ? match[1].length : 0;
      const phrase = match[0].slice(lead);
      const groups = new RegExp(source, 'u').exec(phrase.trim().replace(/[.!,;]$/, ''));
      const date = groups && toDate(groups, today);
      if (!date || Number.isNaN(date.getTime())) continue;
      return { iso: isoDay(date), start: match.index + lead, end: match.index + match[0].length };
    }
  }
  return null;
}

export class TaskDatesFeature {
  // When a task is due, said briefly: { state, label } (state: overdue, today, soon, later)
  dueInfo(iso, now = new Date()) {
    const day = dayFromIso(iso);
    if (!day) return null;
    const today = startOfDay(now);
    const diff = Math.round((day - today) / DAY_MS);
    const locale = this.getLocale();
    const short = () =>
      day.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        ...(day.getFullYear() !== today.getFullYear() && { year: 'numeric' }),
      });
    if (diff < 0)
      return { state: 'overdue', label: diff === -1 ? i18n.t('tasks.dueYesterday') : short() };
    if (diff === 0) return { state: 'today', label: i18n.t('tasks.dueToday') };
    if (diff === 1) return { state: 'soon', label: i18n.t('tasks.dueTomorrow') };
    if (diff < 7)
      return { state: 'soon', label: day.toLocaleDateString(locale, { weekday: 'long' }) };
    return { state: 'later', label: short() };
  }

  // Every dated task under root shows when it is due (labels are made fresh each time: "today"
  // moves on). The label lives in attributes the saved text leaves out.
  refreshDueLabels(root) {
    root?.querySelectorAll('.checklist-item').forEach((item) => {
      const info = item.dataset.due ? this.dueInfo(item.dataset.due) : null;
      if (!info) {
        delete item.dataset.dueLabel;
        delete item.dataset.dueState;
        return;
      }
      item.dataset.dueLabel = info.label;
      item.dataset.dueState = info.state;
    });
  }

  // The saved text keeps the date, not its label
  withoutDueLabels(html) {
    return String(html || '').replace(/ data-due-(?:label|state)="[^"]*"/g, '');
  }

  // The date written in a task's text becomes its date, and leaves the text (a task that is only
  // a date keeps its text)
  applyDuePhrase(item) {
    const label = item?.querySelector(':scope > label');
    if (!label || !this.richEditor.contains(item)) return false;
    const text = label.textContent;
    const found = findDuePhrase(text);
    if (!found) return false;
    const rest = (text.slice(0, found.start) + text.slice(found.end)).trim();
    if (!rest) return false;
    // The phrase's characters, found in the label's text pieces, are removed
    const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let at = 0;
    let started = false;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const next = at + node.length;
      if (!started && found.start < next) {
        range.setStart(node, found.start - at);
        started = true;
      }
      if (started && found.end <= next) {
        range.setEnd(node, found.end - at);
        break;
      }
      at = next;
    }
    if (!started) return false;
    // The caret was in this task (Enter on it): it goes back to the end of the text, so the line
    // breaks after it
    const caretHere = this.taskAtCaret() === item;
    range.deleteContents();
    // The space left at either end goes too
    const first = label.firstChild;
    const last = label.lastChild;
    if (first?.nodeType === Node.TEXT_NODE) first.data = first.data.replace(/^\s+/, '');
    if (last?.nodeType === Node.TEXT_NODE) last.data = last.data.replace(/\s+$/, '');
    // A date at the start took the capital letter with it: the text keeps one
    const head = label.firstChild;
    const capital = (ch) => ch !== ch.toLocaleLowerCase('tr-TR');
    if (found.start === 0 && capital(text.trim()[0] || '') && head?.nodeType === Node.TEXT_NODE) {
      head.data = head.data.charAt(0).toLocaleUpperCase('tr-TR') + head.data.slice(1);
    }
    if (caretHere) {
      const end = label.lastChild;
      if (end?.nodeType === Node.TEXT_NODE) this.placeCaret(end, end.length);
      else this.placeCaret(label, label.childNodes.length);
    }
    item.dataset.due = found.iso;
    this.refreshDueLabels(item.parentElement);
    this.trackContentChanges();
    return true;
  }

  // The task the caret is in, in the editor
  taskAtCaret() {
    const range = this.caretRange();
    const el = range?.startContainer;
    const node = el?.nodeType === Node.ELEMENT_NODE ? el : el?.parentElement;
    const item = node?.closest('.checklist-item');
    return item && this.richEditor.contains(item) ? item : null;
  }

  // ============ Setting it from the task menu ============
  currentDueOf(target) {
    return (target.live || target.element)?.dataset.due || '';
  }

  async setTaskDue(target, iso) {
    await this.changeTask(target, (item) => {
      if (iso) item.dataset.due = iso;
      else delete item.dataset.due;
    });
    if (target.live) this.refreshDueLabels(this.richEditor);
  }

  // A day picked on a calendar for the task
  pickTaskDue(target) {
    let input = this.taskDueInput;
    if (!input) {
      input = document.createElement('input');
      input.type = 'date';
      input.className = 'task-due-input';
      input.tabIndex = -1;
      document.body.appendChild(input);
      input.addEventListener('change', () => {
        if (input.value && this.taskDueTarget) this.setTaskDue(this.taskDueTarget, input.value);
        this.taskDueTarget = null;
      });
      this.taskDueInput = input;
    }
    this.taskDueTarget = target;
    input.value = this.currentDueOf(target) || isoDay(new Date());
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }

  dueChoice(action) {
    const today = startOfDay(new Date());
    if (action === 'today') return isoDay(today);
    if (action === 'tomorrow') return isoDay(addDays(today, 1));
    if (action === 'nextweek') return isoDay(addDays(today, (8 - today.getDay()) % 7 || 7));
    return '';
  }

  setupTaskDates() {
    if (!this.richEditor) return;
    // Enter on a task (before the line breaks) and leaving a task's line take its date
    this.richEditor.parentElement.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Enter' || e.shiftKey || e.isComposing || !this.richEditor.contains(e.target))
          return;
        if (this.slashChoices || this.noteLinkChoices) return;
        const item = this.taskAtCaret();
        if (item) this.applyDuePhrase(item);
      },
      true
    );
    document.addEventListener('selectionchange', () => {
      if (!this.isEditorOpen?.()) return;
      const item = this.taskAtCaret();
      const left = this.lastTaskAtCaret;
      if (left && left !== item && left.isConnected) this.applyDuePhrase(left);
      this.lastTaskAtCaret = item;
    });
    this.richEditor.addEventListener('blur', () => {
      const left = this.lastTaskAtCaret;
      if (left?.isConnected) this.applyDuePhrase(left);
      this.lastTaskAtCaret = null;
    });
    // "Today" moves on at midnight: the labels on screen follow when the window comes back
    window.addEventListener('focus', () => {
      this.refreshDueLabels(this.viewerText);
      this.refreshDueLabels(this.richEditor);
      if (this.currentScreen === 'todos') this.renderTodosSections();
    });
  }
}
