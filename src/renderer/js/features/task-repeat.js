// Repeating tasks. A task keeps its rule as data-repeat on its .checklist-item: daily, weekdays,
// weekly, monthly:D (on day D), yearly, days:N or weeks:N. It is written in words at the start or
// end of the task like a date ("her gün", "her pazartesi", "hafta içi", "her ayın 15'i",
// "2 haftada bir", "every monday"), or chosen in the task menu; the task gets its first date too.
// Ticking a repeating task does not finish it: its date moves on to the next time after today
// and its box empties again.

import { i18n } from '../i18n.js';
import { isoDay, dayFromIso } from './task-dates.js';

const TR_DAYS = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];
const EN_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// Day D of the month `ahead` months from d (the month's last day when it is shorter)
const monthDay = (d, ahead, day) => {
  const last = new Date(d.getFullYear(), d.getMonth() + ahead + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() + ahead, Math.min(day, last));
};
const isWeekday = (d) => d.getDay() >= 1 && d.getDay() <= 5;

// The day after `from` that the rule falls on
export function nextOccurrence(rule, from) {
  const d = startOfDay(from);
  const [kind, value] = String(rule || '').split(':');
  const n = Math.max(1, Number(value) || 1);
  switch (kind) {
    case 'daily':
      return addDays(d, 1);
    case 'weekdays': {
      let next = addDays(d, 1);
      while (!isWeekday(next)) next = addDays(next, 1);
      return next;
    }
    case 'weekly':
      return addDays(d, 7);
    case 'days':
      return addDays(d, n);
    case 'weeks':
      return addDays(d, 7 * n);
    case 'monthly':
      return monthDay(d, 1, Number(value) || d.getDate());
    case 'yearly':
      return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
    default:
      return null;
  }
}

// The next time after today, counting on from the task's date
export function nextDueAfterToday(rule, dueIso, now = new Date()) {
  const today = startOfDay(now);
  let next = dayFromIso(dueIso) || today;
  for (let guard = 0; guard < 1000; guard++) {
    next = nextOccurrence(rule, next);
    if (!next) return null;
    if (next > today) return next;
  }
  return null;
}

// A repeat written at the start or end of a task: { rule, iso (its first date), start, end }
export function findRepeatPhrase(text, now = new Date()) {
  const lower = String(text || '').toLocaleLowerCase('tr-TR');
  if (lower.length !== String(text || '').length) return null;
  const today = startOfDay(now);
  const days = [...TR_DAYS, ...EN_DAYS].sort((a, b) => b.length - a.length).join('|');
  const weekday = (w) => (TR_DAYS.includes(w) ? TR_DAYS.indexOf(w) : EN_DAYS.indexOf(w));
  const onOrAfter = (day) => addDays(today, (day - today.getDay() + 7) % 7);
  const phrases = [
    [
      `hafta içi(?: her gün)?|her hafta içi|every weekday|weekdays`,
      () => {
        let first = today;
        while (!isWeekday(first)) first = addDays(first, 1);
        return ['weekdays', first];
      },
    ],
    [`her gün|hergün|every day|daily`, () => ['daily', today]],
    [
      `her (${days})(?: günü)?|every (${days})`,
      (m) => ['weekly', onOrAfter(weekday(m[1] || m[2]))],
    ],
    [`her hafta|haftada bir|every week|weekly`, () => ['weekly', today]],
    [
      `her ayın (\\d{1,2})(?:['’]?[a-zçğıöşü]*)?|every month on the (\\d{1,2})(?:st|nd|rd|th)?`,
      (m) => {
        const day = Number(m[1] || m[2]);
        if (day < 1 || day > 31) return null;
        const first =
          monthDay(today, 0, day) >= today ? monthDay(today, 0, day) : monthDay(today, 1, day);
        return [`monthly:${day}`, first];
      },
    ],
    [`her ay|ayda bir|every month|monthly`, () => [`monthly:${today.getDate()}`, today]],
    [`her yıl|her sene|yılda bir|every year|yearly`, () => ['yearly', today]],
    [`(?:her )?(\\d{1,2}) günde bir|every (\\d{1,2}) days`, (m) => [`days:${m[1] || m[2]}`, today]],
    [
      `(?:her )?(\\d{1,2}) haftada bir|every (\\d{1,2}) weeks`,
      (m) => [`weeks:${m[1] || m[2]}`, today],
    ],
  ];
  for (const [source, make] of phrases) {
    const atEnd = new RegExp(`(^|\\s)(?:${source})[.!,;]?\\s*$`, 'u').exec(lower);
    const atStart = new RegExp(`^\\s*(?:${source})(?=[\\s.,;:!]|$)`, 'u').exec(lower);
    for (const match of [atEnd, atStart]) {
      if (!match) continue;
      const lead = match === atEnd ? match[1].length : 0;
      const phrase = match[0]
        .slice(lead)
        .trim()
        .replace(/[.!,;]$/, '');
      const made = make(new RegExp(`^(?:${source})$`, 'u').exec(phrase) || []);
      if (!made) continue;
      return {
        rule: made[0],
        iso: isoDay(made[1]),
        start: match.index + lead,
        end: match.index + match[0].length,
      };
    }
  }
  return null;
}

export class TaskRepeatFeature {
  repeatLabel(rule) {
    const [kind, value] = String(rule || '').split(':');
    if (kind === 'days' || kind === 'weeks')
      return i18n.t(`tasks.repeat_${kind}`, { count: value });
    return i18n.t(`tasks.repeat_${kind}`);
  }

  // A ticked repeating task: its date moves on, its box empties. True when it was one.
  async advanceRepeatingTask(target) {
    const item = target.live || target.element;
    const rule = item?.dataset.repeat;
    if (!rule) return false;
    const next = nextDueAfterToday(rule, item.dataset.due);
    if (!next) return false;
    const iso = isoDay(next);
    await this.changeTask(target, (task) => {
      task.dataset.due = iso;
      const box = task.querySelector('input[type="checkbox"]');
      box?.removeAttribute('checked');
      if (box) box.checked = false;
    });
    if (target.live) this.refreshDueLabels(this.richEditor);
    this.showNotification(
      i18n.t('tasks.repeatNext', { when: this.dueInfo(iso)?.label || iso }),
      'success'
    );
    return true;
  }

  async setTaskRepeat(target, rule) {
    const today = new Date();
    await this.changeTask(target, (item) => {
      if (!rule) {
        delete item.dataset.repeat;
        return;
      }
      item.dataset.repeat = rule === 'monthly' ? `monthly:${today.getDate()}` : rule;
      if (!item.dataset.due) item.dataset.due = isoDay(today);
    });
    if (target.live) this.refreshDueLabels(this.richEditor);
  }

  setupTaskRepeat() {
    // A repeating task ticked in the editor or in a note being read moves on instead of finishing
    // (before the handlers that would save it as done)
    const onTick = (e) => {
      const box = e.target;
      if (box?.type !== 'checkbox' || !box.checked) return;
      const item = box.closest('.checklist-item[data-repeat]');
      if (!item) return;
      const target = this.taskTargetOf(item);
      if (!target) return;
      e.stopImmediatePropagation();
      // The tick is seen a moment, then the task moves on
      setTimeout(() => this.advanceRepeatingTask(target), 350);
    };
    [this.richEditor, this.viewerText].forEach((area) =>
      area?.parentElement?.addEventListener('change', onTick, true)
    );
  }
}
