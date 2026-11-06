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
  // The icons at the left of the notes in the note list are hidden
  hideNoteIcons: false,
  folderColorsBackup: null,
  noteSort: 'date-desc',
  autoSave: true,
  // Line shortcuts while typing: "- " a bulleted list, "1. " a numbered one, "[] " a task...
  autoFormat: true,
  onNoteDelete: 'lastNote',
  // What opens when the app starts: lastNote, home, newNote, todos or notifications
  startupPage: 'lastNote',
  nativeNotifications: true,
  editorSidebarVisible: true,
  closeToTray: true,
  // Ctrl+Alt+N anywhere in the system opens a new note
  quickNoteShortcut: true,
  // "Edit with Capnote" in the right-click menu of .md, .txt and .html files (Windows)
  fileContextMenu: true,
  // Drawing with the graphics card; off uses a little less memory (applies after a restart)
  hardwareAcceleration: true,
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
// How many of the latest history entries keep the note's text from before that edit, so it can be
// seen and restored; older entries keep only their time
export const HISTORY_VERSIONS = 30;
