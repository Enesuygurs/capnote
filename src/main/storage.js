/**
 * App data storage: one JSON file per collection inside userData/data.
 * Writes are atomic (temp file + rename), the previous version is kept as .bak,
 * and a copy of all files is taken once per day (the last 7 days are kept).
 */

const fs = require('fs');
const path = require('path');

const COLLECTIONS = ['notes', 'folders', 'reminders', 'notifications', 'todos', 'settings'];
const DAILY_BACKUPS_TO_KEEP = 7;

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
}

module.exports = { JsonStore, COLLECTIONS };
