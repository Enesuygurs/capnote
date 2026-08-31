// Constants shared by the renderer modules

export const DEFAULT_ACCENT = '#f59e0b';

// Version of the stored data layout; backups record it so newer files are not misread
export const SCHEMA_VERSION = 2;

// How many notes can be pinned at once
export const MAX_PINNED_NOTES = 10;

export const DEFAULT_SETTINGS = {
  language: 'tr',
  darkMode: false,
  accentColor: null,
  syncFolderAccent: false,
  folderColorsBackup: null,
  noteSort: 'date-desc',
  autoSave: true,
  onNoteDelete: 'lastNote',
  nativeNotifications: true,
  editorSidebarVisible: true,
  closeToTray: true,
  lastViewedNoteId: null,
};

// Settings that are not portable between installations and stay out of backups
export const LOCAL_ONLY_SETTINGS = ['folderColorsBackup', 'lastViewedNoteId'];

// Older versions kept every setting in its own localStorage key with mixed formats
export const LEGACY_SETTING_KEYS = [
  'app-language',
  'darkMode',
  'accentColor',
  'syncFolderAccent',
  'folderColorsBackup',
  'maxPinnedNotes',
  'settings.autoSave',
  'settings.confirmDelete',
  'settings.onNoteDelete',
  'settings.nativeNotifications',
  'editorSidebarVisible',
  'last-viewed-note',
  'capnote-settings',
];

// Data is stored by the main process; older versions kept it in localStorage
export const LEGACY_STORAGE_KEYS = {
  notes: 'capnote-notes',
  folders: 'capnote-folders',
  reminders: 'capnote-reminders',
  notifications: 'capnote-notifications',
  todos: 'capnote-todo-sections',
};

// Edits within a few minutes of each other (autosave) collapse into one entry
export const HISTORY_MERGE_MS = 10 * 60 * 1000;

export const HISTORY_LIMIT = 100;
