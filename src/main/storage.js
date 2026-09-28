/**
 * App data storage: one JSON file per collection inside userData/data.
 * Writes are atomic (temp file + rename), the previous version is kept as .bak,
 * and a copy of all files is taken once per day (the last 7 days are kept).
 * A daily copy can be restored; the data from before the restore is kept in
 * backups/before-restore, so a restore can be undone the same way.
 */

import fs from 'fs';
import path from 'path';

const COLLECTIONS = ['notes', 'folders', 'reminders', 'notifications', 'todos', 'settings'];
const DAILY_BACKUPS_TO_KEEP = 7;
// What a restore brings back: the user's data, not their settings
const RESTORED = COLLECTIONS.filter((key) => key !== 'settings');
const BEFORE_RESTORE = 'before-restore';
const isBackupId = (id) => /^\d{4}-\d{2}-\d{2}$/.test(id) || id === BEFORE_RESTORE;

class JsonStore {
  constructor(baseDir) {
    this.dataDir = path.join(baseDir, 'data');
    this.backupDir = path.join(baseDir, 'backups');
    fs.mkdirSync(this.dataDir, { recursive: true });
  }

  fileFor(key) {
    if (!COLLECTIONS.includes(key)) throw new Error(`Unknown collection: ${key}`);
    return path.join(this.dataDir, `${key}.json`);
  }

  // Whether any collection has ever been written (false on first launch)
  isInitialized() {
    return COLLECTIONS.some((key) => fs.existsSync(this.fileFor(key)));
  }

  readFile(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  read(key) {
    const file = this.fileFor(key);
    if (!fs.existsSync(file)) return undefined;
    try {
      return this.readFile(file);
    } catch (err) {
      // A damaged file falls back to the previous version
      console.error(`Could not read ${key}.json, trying the backup:`, err);
      try {
        return this.readFile(`${file}.bak`);
      } catch {
        return undefined;
      }
    }
  }

  readAll() {
    const data = {};
    COLLECTIONS.forEach((key) => {
      data[key] = this.read(key);
    });
    return data;
  }

  write(key, value) {
    const file = this.fileFor(key);
    // Snapshot the state before the first change of the day
    this.backupDaily();
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value), 'utf8');
    if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
    fs.renameSync(tmp, file);
  }

  // Copy all collections into backups/YYYY-MM-DD once a day and prune old days
  backupDaily() {
    const today = new Date().toISOString().slice(0, 10);
    const target = path.join(this.backupDir, today);
    if (fs.existsSync(target)) return;
    try {
      fs.mkdirSync(target, { recursive: true });
      COLLECTIONS.forEach((key) => {
        const file = this.fileFor(key);
        if (fs.existsSync(file)) fs.copyFileSync(file, path.join(target, `${key}.json`));
      });
      const days = fs
        .readdirSync(this.backupDir)
        .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
        .sort();
      days.slice(0, Math.max(0, days.length - DAILY_BACKUPS_TO_KEEP)).forEach((name) => {
        fs.rmSync(path.join(this.backupDir, name), { recursive: true, force: true });
      });
    } catch (err) {
      console.warn('Daily backup failed:', err);
    }
  }

  backupIds() {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs
      .readdirSync(this.backupDir)
      .filter((id) => isBackupId(id) && fs.statSync(path.join(this.backupDir, id)).isDirectory());
  }

  readBackup(id, key) {
    const file = path.join(this.backupDir, id, `${key}.json`);
    if (!fs.existsSync(file)) return undefined;
    try {
      return this.readFile(file);
    } catch {
      return undefined;
    }
  }

  // The backups, the copy from before the last restore first, then the days from the newest
  listBackups() {
    const count = (value) => (Array.isArray(value) ? value.length : 0);
    return this.backupIds()
      .map((id) => {
        const takenAt = path.join(this.backupDir, id, 'taken-at.txt');
        return {
          id,
          takenAt: fs.existsSync(takenAt) ? fs.readFileSync(takenAt, 'utf8').trim() : null,
          notes: count(this.readBackup(id, 'notes')),
          folders: count(this.readBackup(id, 'folders')),
        };
      })
      .sort((a, b) =>
        a.id === BEFORE_RESTORE ? -1 : b.id === BEFORE_RESTORE ? 1 : b.id.localeCompare(a.id)
      );
  }

  // Put a backup's data back (the settings stay as they are). The current data is copied to
  // before-restore first; restoring before-restore itself swaps the two.
  restoreBackup(id) {
    if (!isBackupId(id) || !this.backupIds().includes(id)) throw new Error('Unknown backup');
    const restored = {};
    RESTORED.forEach((key) => {
      restored[key] = this.readBackup(id, key);
    });

    const keep = path.join(this.backupDir, BEFORE_RESTORE);
    fs.rmSync(keep, { recursive: true, force: true });
    fs.mkdirSync(keep, { recursive: true });
    COLLECTIONS.forEach((key) => {
      const file = this.fileFor(key);
      if (fs.existsSync(file)) fs.copyFileSync(file, path.join(keep, `${key}.json`));
    });
    fs.writeFileSync(path.join(keep, 'taken-at.txt'), new Date().toISOString(), 'utf8');

    RESTORED.forEach((key) => {
      if (restored[key] !== undefined) {
        this.write(key, restored[key]);
      } else {
        // Not written yet on that day: it starts empty, as it was
        const file = this.fileFor(key);
        fs.rmSync(file, { force: true });
        fs.rmSync(`${file}.bak`, { force: true });
      }
    });
  }

  // Files attached to notes in any backup, so cleaning up unused uploads keeps what a restore
  // would need. null when a locked note in a backup has no list of its files (nothing is known).
  backupAttachments() {
    const names = new Set();
    for (const id of this.backupIds()) {
      const notes = this.readBackup(id, 'notes');
      if (!Array.isArray(notes)) continue;
      for (const note of notes) {
        if (note && note.isLocked && !Array.isArray(note.attachments)) return null;
        (note?.attachments || []).forEach((name) => names.add(name));
      }
    }
    return [...names];
  }
}

export { JsonStore, COLLECTIONS };
